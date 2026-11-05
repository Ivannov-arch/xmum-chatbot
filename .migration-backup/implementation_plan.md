# RAG Architecture: Supabase pgvector + Gemini Flash (Free Tier)

## Latar Belakang

Project saat ini menggunakan **keyword-based matching** di dua tempat:

1. `intent_classifier.py` → hardcoded keyword list per kategori
2. `retriever.py` → `_score_item()` menghitung skor dari keyword overlap

Masalahnya:
- **Kaku**: `"I can't get online"` tidak match keyword `"wifi"`
- **Tidak bisa paraphrase**: `"Where do I submit my sick letter?"` tidak match `"leave_attendance"`
- **Tidak ada common sense**: bot hanya return jawaban exact match, tidak bisa mensintesis info dari beberapa sumber

---

## Solusi: RAG (Retrieval-Augmented Generation)

> **Gratis, online, tidak bodoh, tapi tidak halusinasi.**

Ini adalah satu-satunya arsitektur yang memenuhi semua kriteria sekaligus:

| Kriteria | Solusi | Tool |
|---|---|---|
| Online ✅ | Cloud-based | Supabase + Gemini API |
| Gratis ✅ | Free tier | Supabase Free + Gemini Free |
| Tidak kaku ✅ | Semantic search | Supabase pgvector |
| Tidak halusinasi ✅ | System prompt strict | Gemini Flash (reader only) |
| Common sense ✅ | Sintesis dari retrieved context | Gemini Flash (synthesizer) |

---

## Bagaimana RAG Bekerja di Sini

```
User: "I can't access my email after changing password"
         ↓
[1] Embedding via Gemini text-embedding-004 (free)
    → [0.12, -0.54, 0.89, ...]
         ↓
[2] Vector Search di Supabase pgvector
    → TOP-3 chunks yang paling mirip secara semantik:
      - "How to reset Campus ID password" (score: 0.91)
      - "Student email = username@xmu.edu.my" (score: 0.87)
      - "IT Helpdesk contact for account issues" (score: 0.81)
         ↓
[3] Gemini Flash sebagai READER (bukan knowledge provider)
    Prompt: "Jawab HANYA dari konteks berikut. 
             Jika tidak ada di konteks, katakan tidak tahu."
    Context: [3 chunks di atas]
         ↓
Bot: "To fix your email access after a password change, 
      you need to reset your Campus ID via the CAS portal.
      Contact IT Helpdesk at [number] if it doesn't work."
```

Gemini di sini bukan sebagai "otak" yang tahu segalanya — dia hanya sebagai **penulis ulang** yang menyatukan 2-3 jawaban dari database menjadi kalimat yang natural.

---

## Perbandingan vs Sistem Saat Ini

| | Sekarang (Keyword) | Setelah (RAG) |
|---|---|---|
| `"wifi issue"` | ✅ Match | ✅ Match |
| `"can't get online"` | ❌ Fail | ✅ Match |
| `"where can I pray on campus"` | ❌ Fail (no keyword "pray") | ✅ Match (semantik "surau") |
| `"saya mau tanya pasal hostel"` | ✅ via translator | ✅ via translator |
| Common sense answer | ❌ Copy-paste jawaban exact | ✅ Sintesis natural |
| Hallucination risk | ✅ Tidak ada | ✅ Tidak ada (strict prompt) |

---

## Open Questions

> [!IMPORTANT]
> **Apakah Gemini API Key sudah aktif?**
> Project ini sudah pakai Gemini (di `gemini_matcher.py` dan `translator.py`). RAG ini akan menggunakan API key yang sama — tidak perlu key baru.

> [!IMPORTANT]
> **Embedding model yang akan digunakan: `text-embedding-004`**
> Ini adalah model embedding Gemini yang gratis via API. Satu kali embed saat data di-seed, setelah itu hanya query embedding saat runtime (sangat murah).

> [!WARNING]
> **Supabase perlu satu kali migrasi SQL** untuk:
> 1. Enable extension `pgvector`
> 2. Tambah kolom `embedding vector(768)` ke tabel `knowledge_items`
> 3. Buat function `match_documents()` untuk vector search
>
> Ini TIDAK menghapus data yang ada, hanya ALTER TABLE (tambah kolom).

---

## Proposed Changes

### Component 1: Supabase Schema Migration

#### [MODIFY] [schema.sql](file:///c:/Coding/Univ%20Codes/final-ait103/ml/database/schema.sql)
Tambah:
- `CREATE EXTENSION IF NOT EXISTS vector;`
- Kolom `embedding vector(768)` ke `knowledge_items`
- Function `match_documents()` untuk cosine similarity search via RPC

#### [NEW] migration_add_vectors.sql
SQL khusus untuk ALTER TABLE yang sudah ada (tidak dari scratch).

---

### Component 2: Embedding Engine (Baru)

#### [NEW] `chatbot/embedder.py`
- Class `GeminiEmbedder` menggunakan `text-embedding-004` via REST API
- Method `embed_text(text)` → `List[float]` (768 dimensi)
- Digunakan saat seed dan saat query

---

### Component 3: Vector Retriever (Ganti `retriever.py`)

#### [MODIFY] [retriever.py](file:///c:/Coding/Univ%20Codes/final-ait103/ml/chatbot/retriever.py)
- Tambah `_retrieve_by_vector()` method: embed query → panggil Supabase RPC `match_documents()`
- `retrieve()` dan `retrieve_across_modules()` pakai vector search dulu, keyword fallback jika Supabase tidak tersedia
- **`intent_classifier` tidak lagi diperlukan** untuk routing utama — vector search langsung cari di seluruh DB

---

### Component 4: RAG Response Generator (Ganti `gemini_matcher.py`)

#### [MODIFY] [gemini_matcher.py](file:///c:/Coding/Univ%20Codes/final-ait103/ml/chatbot/gemini_matcher.py)
- Tambah method `generate_rag_answer(user_query, retrieved_chunks)` 
- Prompt dirancang agar Gemini **hanya** mensintesis dari `retrieved_chunks`
- Jika `retrieved_chunks` kosong → kembalikan "I don't have information about that"

---

### Component 5: Seed Script Update

#### [MODIFY] [seed.py](file:///c:/Coding/Univ%20Codes/final-ait103/ml/database/seed.py)
- Setelah insert tiap row, generate embedding via `GeminiEmbedder` dan simpan ke kolom `embedding`
- Atau jalankan `embed_all.py` sekali untuk embed semua data yang sudah ada

#### [NEW] `scripts/embed_all.py`
Script one-shot untuk embed semua existing rows di Supabase yang belum punya embedding.

---

### Component 6: Pipeline Orchestrator Update

#### [MODIFY] [chatbot_main.py](file:///c:/Coding/Univ%20Codes/final-ait103/ml/chatbot_main.py)
- `process_message()`: setelah translate, langsung vector search (skip intent classification)
- Hasil vector search → kirim ke `generate_rag_answer()` → return response
- `IntentClassifier` tetap ada sebagai **fallback offline** jika vector search gagal

---

## Verification Plan

### Automated Tests
```bash
# Test embedding generation
python -c "from chatbot.embedder import GeminiEmbedder; e = GeminiEmbedder(); print(len(e.embed_text('test')))"

# Test vector retrieval
python -c "from chatbot.retriever import KnowledgeRetriever; r = KnowledgeRetriever(); print(r.retrieve_by_vector('wifi problem'))"

# Test full RAG pipeline
python chatbot_main.py
```

### Manual Verification
- Query: `"I can't access the internet"` → harus return WiFi info
- Query: `"where can I pray on campus"` → harus return surau/prayer room info  
- Query: `"what is the capital of France?"` → harus return "I don't have that information"
- Query: `"berapa yuran hostel?"` (Malay) → harus return hostel fee info

---

## Alur Arsitektur Final

```
User Query
    ↓
[Translator] → English + spelling correction (Gemini, sudah ada)
    ↓
[Embedder] → vector via text-embedding-004 (Gemini, BARU)
    ↓
[Supabase pgvector] → TOP-5 semantically similar chunks (BARU)
    ↓
[RAG Generator] → Gemini Flash sebagai reader/synthesizer (MODIFIKASI)
    ↓
Response yang natural, grounded pada DB
    ↓
[Translator] → balik ke bahasa user jika bukan English (sudah ada)
```

**Fallback jika Gemini tidak tersedia**: keyword-based (sistem saat ini tetap ada sebagai backup)
