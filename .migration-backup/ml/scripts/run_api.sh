#!/usr/bin/env bash
# placeholder_run_api.sh
# scripts/run_api.sh
#
# Start the FastAPI server (Linux / macOS).
#
# Usage:
#   chmod +x scripts/run_api.sh
#   ./scripts/run_api.sh
#
# By default starts on http://0.0.0.0:8000
# Swagger UI: http://localhost:8000/docs
#
# Environment variables are read from .env via python-dotenv.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== XMUM Campus Chatbot API ==="

# Activate venv
source "$PROJECT_ROOT/.venv/bin/activate"

# Check .env
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "ERROR: .env file not found."
  exit 1
fi

echo "Starting FastAPI server with hot-reload..."
cd "$PROJECT_ROOT"
uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
