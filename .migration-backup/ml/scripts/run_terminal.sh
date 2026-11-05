#!/usr/bin/env bash
# placeholder_run_terminal.sh
# scripts/run_terminal.sh
#
# Run the XMUM Campus Chatbot in terminal mode (Linux / macOS).
#
# Usage:
#   chmod +x scripts/run_terminal.sh
#   ./scripts/run_terminal.sh
#
# Prerequisites:
#   - .venv virtual environment created (python3 -m venv .venv)
#   - Dependencies installed (pip install -r requirements.txt)
#   - .env file configured with Supabase credentials

set -e  # exit immediately on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== XMUM Campus Chatbot ==="
echo "Activating virtual environment..."
source "$PROJECT_ROOT/.venv/bin/activate"

echo "Loading environment variables..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in your credentials."
  exit 1
fi

echo "Starting chatbot in terminal mode..."
cd "$PROJECT_ROOT"
python -m chatbot.main
