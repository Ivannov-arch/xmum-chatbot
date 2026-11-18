import asyncio
import os
from fastapi import APIRouter, HTTPException, Request, Header
from api.schemas.chat_schema import ChatRequest, ChatResponse, SuggestionsResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

# Rate limit: 30 chat requests per minute per IP address
_limiter = Limiter(key_func=get_remote_address)


@router.get("/knowledge")
async def public_knowledge(request: Request):
    chatbot = request.app.state.chatbot
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    return [
        {
            "id": item.id or str(index),
            "module": item.module,
            "question": item.question,
            "answer": item.answer,
            "keywords": item.keywords,
        }
        for index, item in enumerate(chatbot.retriever.knowledge_base)
    ]


@router.post("/chat", response_model=ChatResponse)
@_limiter.limit("30/minute")
async def chat(
    req: ChatRequest,
    request: Request,
    x_api_key: str = Header(None),
):
    # Optional API key validation — only enforced when API_SECRET_KEY is set
    api_key_env = os.getenv("API_SECRET_KEY")
    if api_key_env and api_key_env not in ("", "default-key-change-me"):
        if x_api_key != api_key_env:
            raise HTTPException(status_code=403, detail="Invalid API key")

    chatbot = request.app.state.chatbot
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    from chatbot_main import ResponseFormatter

    session_id = req.session_id or "default"
    response = chatbot.process_message(
        req.message.strip(), session_id=session_id, debug=req.debug
    )
    formatted = ResponseFormatter.to_dict(response)

    # Fire-and-forget: log to Supabase without blocking the response to the user
    supabase_client = getattr(chatbot.retriever, "supabase", None)
    if supabase_client:
        asyncio.create_task(
            _log_conversation(supabase_client, session_id, req.message.strip(), formatted)
        )

    return formatted


async def _log_conversation(
    supabase_client, session_id: str, user_message: str, bot_formatted: dict
) -> None:
    """Write both conversation turns to Supabase in the background (non-blocking)."""
    try:
        supabase_client.table("conversation_logs").insert(
            {"session_id": session_id, "role": "user", "message": user_message}
        ).execute()
        supabase_client.table("conversation_logs").insert(
            {
                "session_id": session_id,
                "role": "bot",
                "message": bot_formatted.get("answer", ""),
                "module": bot_formatted.get("module"),
                "sub_intent": bot_formatted.get("sub_intent"),
                "confidence": bot_formatted.get("confidence"),
                "matched_question": bot_formatted.get("matched_question"),
            }
        ).execute()
    except Exception as log_err:
        print(f"[API Logs Error] Failed to write conversation logs: {log_err}")


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(request: Request, module: str = None, limit: int = 10):
    chatbot = request.app.state.chatbot
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")

    if module:
        suggestions = chatbot.get_module_suggestions(module, limit)
    else:
        suggestions = []
        per_module = max(1, limit // 3)
        for mod in ["admin_directory", "campus_life", "academic_navigation"]:
            suggestions.extend(chatbot.get_module_suggestions(mod, per_module))
        suggestions = suggestions[:limit]

    return {"suggestions": suggestions}
