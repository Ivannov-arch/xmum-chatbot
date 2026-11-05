from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.chat import router as chat_router
from api.routes.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from chatbot_main import XMUMChatbot
    app.state.chatbot = XMUMChatbot()
    print(f"[API] Chatbot ready — {len(app.state.chatbot.retriever.knowledge_base)} items loaded")
    yield
    app.state.chatbot = None


app = FastAPI(title="XMUMC Campus Assistant API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(health_router)


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok", "message": "XMUMC Campus Assistant API"}


@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    return {"status": "ok", "message": "pong"}

