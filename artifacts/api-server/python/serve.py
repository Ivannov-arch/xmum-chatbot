"""Run the imported FastAPI chatbot using the artifact-managed PORT."""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ["PORT"])
    uvicorn.run("api.app:app", host="0.0.0.0", port=port)
