# 🎓 XMUM Campus Knowledge Chatbot

An intelligent, text-based campus assistant chatbot designed to help **Xiamen University Malaysia (XMUM)** students navigate university life. It acts as a centralized information hub, helping users query campus contacts, discover facilities, and look up academic rules.

## 🔗 Deployed Links
- **Web Frontend (React/Next.js):** [Click here to visit](https://your-frontend-domain.com)
- **FastAPI Backend (API Docs):** [Click here to view API Docs](https://your-backend-domain.com/docs)

---

### 🌟 Key Features
- **Smart Intent Classification:** Automatically detects what you are asking about and routes the query to the correct information domain.
- **Rich Knowledge Base:** Powered by **Supabase (PostgreSQL)** with structured data for campus directories, daily life, and academic regulations.
- **Context-Aware Conversations:** Remembers recent turns to support natural, multi-turn follow-up questions.
- **Multi-Interface Support:** Can be tested directly in the terminal, or run as a **FastAPI** REST backend integrated with modern web frameworks like React or Next.js.
- **Comprehensive Domain Knowledge:**
  1. 📁 **Administrative & Campus Directory:** Contact information, office locations, and departments.
  2. 📁 **Daily Campus Life & Facilities:** Operating hours of campus facilities (library, gym), food stalls, hostel rules, and student activities.
  3. 📁 **Academic Navigation:** Course registrations, exam guidelines, grading systems, and key academic procedures.

---

## 📁 Project Structure

```
final-ait103/
├── chatbot/                    # Core chatbot logic (Python)
│   ├── __init__.py
│   ├── main.py                 # Terminal entry point
│   ├── bot.py                  # Main chatbot orchestrator
│   ├── intent_classifier.py    # Classify user intent / category
│   ├── retriever.py            # Query Supabase knowledge base
│   ├── responder.py            # Format & generate responses
│   └── context_manager.py     # Manage multi-turn conversation context
│
├── modules/                    # Domain-specific knowledge modules
│   ├── __init__.py
│   ├── admin_directory.py      # Module 1: Administrative & Campus Directory
│   ├── campus_life.py          # Module 2: Daily Campus Life & Facilities
│   └── academic_navigation.py  # Module 3: Academic Navigation
│
├── database/                   # Supabase / database layer
│   ├── __init__.py
│   ├── client.py               # Supabase client singleton
│   ├── seed.py                 # Seed script: populate knowledge base
│   ├── schema.sql              # SQL schema for knowledge tables
│   └── seeds/                  # Seed data JSON files per module
│       ├── admin_directory.json
│       ├── campus_life.json
│       └── academic_navigation.json
│
├── api/                        # FastAPI layer (REST API for web frontend)
│   ├── __init__.py
│   ├── app.py                  # FastAPI application factory
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat.py             # POST /chat endpoint
│   │   └── health.py           # GET /health endpoint
│   └── schemas/
│       ├── __init__.py
│       └── chat_schema.py      # Pydantic request/response models
│
├── tests/                      # Unit & integration tests
│   ├── __init__.py
│   ├── test_intent_classifier.py
│   ├── test_retriever.py
│   ├── test_responder.py
│   └── test_api.py
│
├── scripts/                    # Utility scripts
│   ├── run_terminal.sh         # Run chatbot in terminal (Linux/Mac)
│   ├── run_terminal.ps1        # Run chatbot in terminal (Windows PowerShell)
│   └── run_api.sh              # Start FastAPI server
│
├── docs/                       # Documentation
│   ├── architecture.md         # System architecture overview
│   ├── modules.md              # Module breakdown & knowledge scope
│   └── api_reference.md        # API endpoint reference
│
├── .env.example                # Environment variable template
├── .gitignore
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

---

## ⚙️ Required Versions

| Tool / Library      | Recommended Version | Notes                              |
|---------------------|---------------------|------------------------------------|
| Python              | 3.11+               | f-strings, match-case support      |
| pip                 | 23+                 | `pip install --upgrade pip`        |
| supabase-py         | 2.x                 | Official Supabase Python client    |
| fastapi             | 0.111+              | Async REST API framework           |
| uvicorn             | 0.29+               | ASGI server for FastAPI            |
| pydantic            | 2.x                 | Data validation & serialization    |
| python-dotenv       | 1.x                 | Load `.env` file                   |
| httpx               | 0.27+               | Async HTTP client (used by tests)  |
| pytest              | 8.x                 | Test runner                        |
| pytest-asyncio      | 0.23+               | Async test support                 |

---

## 🚀 Setup & Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/final-ait103.git
cd final-ait103
```

### 2. Create & Activate Virtual Environment

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Then edit .env with your actual Supabase credentials
```

### 5. Apply Database Schema

Go to your **Supabase project → SQL Editor** and run the contents of:

```
database/schema.sql
```

### 6. Seed the Knowledge Base

```bash
python -m database.seed
```

### 7. Run in Terminal (Chat Mode)

```bash
python -m chatbot.main
```

### 8. Start the API Server (Optional)

```bash
uvicorn api.app:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

## 🔐 Environment Variables (`.env` Keys)

Copy `.env.example` to `.env` and fill in the values:

```env
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # Only needed for seeding

# API Server (optional, for FastAPI)
API_HOST=0.0.0.0
API_PORT=8000
API_SECRET_KEY=change-me-before-production

# App Config
CHATBOT_MAX_CONTEXT_TURNS=5
CHATBOT_LANGUAGE=en
```

> ⚠️ **Never commit your `.env` file to Git.** It is already listed in `.gitignore`.

### Where to Get Supabase Keys

1. Go to [https://supabase.com](https://supabase.com) → Your Project
2. **Settings → API**
3. Copy `Project URL` → `SUPABASE_URL`
4. Copy `anon public` key → `SUPABASE_ANON_KEY`
5. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret!)*

---

## 🌿 GitHub PR Etiquette

### Branch Naming

```
feature/<short-description>      # e.g. feature/add-hostel-module
fix/<short-description>          # e.g. fix/intent-classifier-crash
chore/<short-description>        # e.g. chore/update-requirements
docs/<short-description>         # e.g. docs/update-api-reference
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

feat(chatbot): add multi-turn context management
fix(retriever): handle empty supabase response
docs(readme): add deployment tutorial
chore(deps): bump supabase-py to 2.4.0
```

### Pull Request Checklist

- [ ] Branch is up-to-date with `main`
- [ ] All tests pass (`pytest`)
- [ ] `.env.example` updated if new env vars added
- [ ] No hardcoded secrets / credentials
- [ ] PR description explains *what* changed and *why*
- [ ] Request at least 1 reviewer before merging

### Merge Strategy

- Use **Squash and Merge** for feature branches
- Use **Merge Commit** for release branches

---

## 🖥️ Day-to-Day Terminal Commands

```bash
# Activate virtual environment
# Windows
.venv\Scripts\Activate.ps1
# Linux/Mac
source .venv/bin/activate

# Install / update dependencies
pip install -r requirements.txt

# Run chatbot in terminal
python -m chatbot.main

# Seed the database
python -m database.seed

# Start API server (dev mode with hot reload)
uvicorn api.app:app --reload --port 8000

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run a specific test file
pytest tests/test_retriever.py -v

# Run tests with coverage report
pytest --cov=chatbot --cov=api --cov-report=term-missing

# Format code (if black is installed)
black .

# Lint code (if ruff is installed)
ruff check .

# Deactivate virtual environment
deactivate
```

---

## 📂 Project Folders & Their Functions

| Folder / File            | Purpose                                                                 |
|--------------------------|-------------------------------------------------------------------------|
| `chatbot/`               | Core chatbot engine: intent detection, retrieval, response generation   |
| `chatbot/main.py`        | Entry point for terminal chat loop                                      |
| `chatbot/bot.py`         | Orchestrates the full conversation pipeline                             |
| `chatbot/intent_classifier.py` | Maps user input to one of the 3 knowledge modules               |
| `chatbot/retriever.py`   | Searches Supabase knowledge base for matching answers                   |
| `chatbot/responder.py`   | Formats and returns a clean, readable response                          |
| `chatbot/context_manager.py` | Tracks conversation history for follow-up questions               |
| `modules/`               | Domain modules wrapping Supabase queries per knowledge area             |
| `database/`              | Database schema, seed scripts, and Supabase client                     |
| `database/seeds/`        | JSON files with knowledge base content (Q&A pairs, facts)              |
| `api/`                   | FastAPI REST API for serving chatbot to web frontends                  |
| `api/routes/chat.py`     | `POST /chat` — main endpoint consumed by React/Next.js                 |
| `api/schemas/`           | Pydantic models for request/response validation                        |
| `tests/`                 | Pytest unit & integration tests                                         |
| `scripts/`               | Shell/PowerShell helper scripts for common tasks                       |
| `docs/`                  | Architecture, module, and API documentation                             |

---

## 🌐 API Integration with React / Next.js

Once the FastAPI server is running, your frontend can call:

### POST `/chat`

```json
// Request
{
  "session_id": "user-abc-123",
  "message": "Where is the library and what time does it open?"
}

// Response
{
  "reply": "The XMUM library is located at [location]. It is open Monday–Friday from 8:30 AM to 9:00 PM, and Saturday from 9:00 AM to 5:00 PM.",
  "module": "campus_life",
  "session_id": "user-abc-123"
}
```

### GET `/health`

```json
{ "status": "ok", "version": "1.0.0" }
```

### Example Next.js fetch

```typescript
const res = await fetch("http://localhost:8000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session_id: "user-123", message: userInput }),
});
const data = await res.json();
console.log(data.reply);
```

---

## 🚢 Deployment Tutorial & Tips

### Option A — Local / Development

```bash
uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
```

### Option B — Railway (Recommended for Quick Deployment)

1. Push your code to GitHub
2. Go to [https://railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables in Railway dashboard (same as `.env`)
4. Railway auto-detects Python → set **Start Command**:
   ```
   uvicorn api.app:app --host 0.0.0.0 --port $PORT
   ```

### Option C — Render

1. Create a new **Web Service** at [https://render.com](https://render.com)
2. Connect your GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn api.app:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard

### Option D — Docker

```dockerfile
# Dockerfile (to be created)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t xmum-chatbot .
docker run -p 8000:8000 --env-file .env xmum-chatbot
```

### ⚠️ Deployment Tips

- Always use **environment variables** — never hardcode secrets
- Use **Supabase Row Level Security (RLS)** in production — restrict access with policies
- Set `SUPABASE_SERVICE_ROLE_KEY` only on the seeding step — use `SUPABASE_ANON_KEY` for the running app
- Enable **CORS** in `api/app.py` for your specific frontend domain (not `*` in production)
- For the Next.js frontend, set `NEXT_PUBLIC_API_URL` to point to your deployed API URL

---


## 📚 References

- Pareek et al. (2024). Enhancing campus navigation: A conversational AI agent for location assistance. ACM. https://dl.acm.org/doi/fullHtml/10.1145/3675888.3676146
- Pallavi et al. (2025). Campus Buddy – AI Powered Bot for College Information. IJSRED, 8(6). https://www.ijsred.com/volume8/issue6/IJSRED-V8I6P190.pdf
- Raghuvaran et al. (2024). Campus Bot: College Information Assistant. IJARBEST, 10(5). https://ijarbest.com/journal/v10i5/2429
- Jain et al. (2025). EduBot: An AI-powered chatbot for smart campus assistance. IJEDR, 13(4). https://rjwave.org/ijedr/papers/IJEDR2504296.pdf
- Reddy et al. (2025). Smart campus assistants: Designing an intelligent chatbot for university student support. IJSDR, 10(5). https://ijsdr.org/papers/IJSDR2505046.pdf
