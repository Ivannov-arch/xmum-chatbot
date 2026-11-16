from fastapi import APIRouter, HTTPException, Request
from api.schemas.chat_schema import ChatRequest, ChatResponse, SuggestionsResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    chatbot = request.app.state.chatbot
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    from chatbot_main import ResponseFormatter
    session_id = req.session_id or "default"
    response = chatbot.process_message(req.message.strip(), session_id=session_id, debug=req.debug)
    
    try:
        supabase_client = getattr(chatbot.retriever, "supabase", None)
        if supabase_client:
            # Log User turn
            supabase_client.table("conversation_logs").insert({
                "session_id": session_id,
                "role": "user",
                "message": req.message.strip()
            }).execute()
            
            # Log Bot turn
            formatted = ResponseFormatter.to_dict(response)
            supabase_client.table("conversation_logs").insert({
                "session_id": session_id,
                "role": "bot",
                "message": formatted.get("answer", ""),
                "module": formatted.get("module"),
                "sub_intent": formatted.get("sub_intent"),
                "confidence": formatted.get("confidence"),
                "matched_question": formatted.get("matched_question")
            }).execute()
    except Exception as log_err:
        print(f"[API Logs Error] Failed to write conversation logs to Supabase: {log_err}")

    return ResponseFormatter.to_dict(response)


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
