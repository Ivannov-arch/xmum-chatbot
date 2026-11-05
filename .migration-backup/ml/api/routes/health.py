from fastapi import APIRouter, Request

router = APIRouter()


@router.api_route("/health", methods=["GET", "HEAD"])
@router.api_route("/ping", methods=["GET", "HEAD"])
async def health(request: Request):
    chatbot = getattr(request.app.state, "chatbot", None)
    return {
        "status": "ok",
        "version": "1.0.0",
        "knowledge_source": chatbot.retriever.source if (chatbot and hasattr(chatbot, "retriever")) else "ready",
        "knowledge_base_size": len(chatbot.retriever.knowledge_base) if (chatbot and hasattr(chatbot, "retriever")) else 0,
    }

