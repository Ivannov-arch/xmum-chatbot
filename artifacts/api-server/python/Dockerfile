FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data needed by entity_recognizer
RUN python -c "import nltk; nltk.download('punkt_tab', quiet=True); nltk.download('averaged_perceptron_tagger_eng', quiet=True)"

# Copy application code
COPY . .

# Render injects $PORT at runtime — default to 8000 for local testing
ENV PORT=8000

EXPOSE $PORT

CMD uvicorn api.app:app --host 0.0.0.0 --port $PORT
