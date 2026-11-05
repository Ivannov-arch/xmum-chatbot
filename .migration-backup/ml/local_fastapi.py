import os
import argparse
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict

from chatbot_main import XMUMChatbot, ResponseFormatter

app = FastAPI(title="XMUMC Campus Assistant Local API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot = None

class ChatRequest(BaseModel):
    message: str
    debug: bool = False
    session_id: Optional[str] = None

@app.on_event("startup")
def startup_event():
    global chatbot
    try:
        chatbot = XMUMChatbot()
        print(f" Chatbot initialized with Supabase")
        print(f"  Loaded {len(chatbot.retriever.knowledge_base)} knowledge items")
    except Exception as e:
        print(f" Error initializing chatbot: {e}")
        raise

@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    session_id = req.session_id or "default"
    try:
        response = chatbot.process_message(
            req.message.strip(),
            session_id=session_id,
            debug=req.debug
        )
        payload = ResponseFormatter.to_dict(response)
        payload["session_id"] = session_id

        # Logging to Supabase
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
                supabase_client.table("conversation_logs").insert({
                    "session_id": session_id,
                    "role": "bot",
                    "message": payload.get("answer", ""),
                    "module": payload.get("module"),
                    "sub_intent": payload.get("sub_intent"),
                    "confidence": payload.get("confidence"),
                    "matched_question": payload.get("matched_question")
                }).execute()
        except Exception as log_err:
            print(f"[Local API Logs Error] Failed to write conversation logs to Supabase: {log_err}")

        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/suggestions")
async def get_suggestions(module: Optional[str] = None, limit: int = 10):
    try:
        suggestions = []
        if module:
            suggestions = chatbot.get_module_suggestions(module, limit)
        else:
            all_suggestions = []
            for mod in ['admin_directory', 'campus_life', 'academic_navigation']:
                all_suggestions.extend(
                    chatbot.get_module_suggestions(mod, limit // 3)
                )
            suggestions = all_suggestions[:limit]
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/api/health", methods=["GET", "HEAD"])
@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/ping", methods=["GET", "HEAD"])
async def health_check():
    kb_size = len(chatbot.retriever.knowledge_base) if (chatbot and hasattr(chatbot, "retriever")) else 0
    return {
        "status": "ok",
        "chatbot": "ready" if chatbot else "starting",
        "knowledge_base_size": kb_size
    }


@app.get("/", response_class=HTMLResponse)
async def index():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>XMUMC Chatbot API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f4f8; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            h1 { color: #1a3a5c; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            pre { background: #f5f5f5; padding: 12px; border-left: 3px solid #1a3a5c; overflow-x: auto; }
            .endpoint { margin: 20px 0; padding: 15px; border-left: 3px solid #2e6da4; background: #f9fbfc; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 XMUMC Campus Assistant API (FastAPI)</h1>
            <p>Backend API for the XMUMC chatbot. Connect your HTML frontend via HTTP requests.</p>
            
            <h2>Endpoints</h2>
            
            <div class="endpoint">
                <h3>POST /api/chat</h3>
                <p>Send a user message and get a chatbot response.</p>
                <pre>{
  "message": "What is the library hours?",
  "debug": true,
  "session_id": "optional-session-id"
}</pre>
                <p><strong>Response:</strong></p>
                <pre>{
  "answer": "The library is open...",
  "confidence": 0.85,
  "matched_question": "When does the library open?",
  "module": "campus_life",
  "sub_intent": "library",
  "entities": {"facility": ["library"]},
  "debug": "..."
}</pre>
            </div>
            
            <div class="endpoint">
                <h3>GET /api/suggestions</h3>
                <p>Get quick suggestions for the UI.</p>
                <p>Query params: <code>module</code>, <code>limit</code></p>
                <pre>GET /api/suggestions?module=campus_life&limit=5</pre>
            </div>
            
            <div class="endpoint">
                <h3>GET /api/health</h3>
                <p>Health check endpoint.</p>
            </div>
        </div>
    </body>
    </html>
    """

def main():
    parser = argparse.ArgumentParser(description="XMUMC Chatbot FastAPI API (Supabase)")
    parser.add_argument(
        '--port',
        type=int,
        default=5000,
        help='Port to run on (default: 5000)'
    )
    parser.add_argument(
        '--host',
        default='0.0.0.0',
        help='Host to bind to (default: 0.0.0.0 for external access)'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Run in debug mode (currently ignored for uvicorn config)'
    )
    args = parser.parse_args()
    
    print(f"\n Starting local FastAPI server on http://{args.host}:{args.port}")
    print(f" API Docs: http://{args.host}:{args.port}/")
    print("\nPress CTRL+C to stop.\n")
    
    uvicorn.run("local_fastapi:app", host=args.host, port=args.port, reload=args.debug)

if __name__ == '__main__':
    main()
