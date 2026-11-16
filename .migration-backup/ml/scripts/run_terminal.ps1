# placeholder_run_terminal.ps1
# scripts/run_terminal.ps1
#
# Run the XMUM Campus Chatbot in terminal mode (Windows PowerShell).
#
# Usage (from project root):
#   .\scripts\run_terminal.ps1
#
# Prerequisites:
#   - .venv virtual environment created:  python -m venv .venv
#   - Dependencies installed:             pip install -r requirements.txt
#   - .env file configured with Supabase credentials

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== XMUM Campus Chatbot ===" -ForegroundColor Cyan

# Activate virtual environment
$VenvActivate = Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1"
if (-Not (Test-Path $VenvActivate)) {
    Write-Error "Virtual environment not found. Run: python -m venv .venv"
    exit 1
}
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& $VenvActivate

# Check .env exists
$EnvFile = Join-Path $ProjectRoot ".env"
if (-Not (Test-Path $EnvFile)) {
    Write-Error ".env file not found. Copy .env.example to .env and fill in your credentials."
    exit 1
}

Write-Host "Starting chatbot in terminal mode..." -ForegroundColor Green
Set-Location $ProjectRoot
python -m chatbot.main
