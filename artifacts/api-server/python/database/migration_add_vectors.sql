-- ============================================================
-- migration_add_vectors.sql
--
-- RAG Migration: Enable pgvector + add embedding column
-- Run ONCE in Supabase Dashboard → SQL Editor
--
-- Steps:
--   1. Enable pgvector extension
--   2. Add embedding column to knowledge_items
--   3. Create vector index for fast cosine search
--   4. Create match_documents() RPC function
-- ============================================================

-- Step 1: Enable pgvector extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column (768 dims = gemini-embedding-001 with outputDimensionality: 768)
-- Safe: ALTER TABLE ADD COLUMN does NOT delete existing data.
ALTER TABLE knowledge_items
    ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Step 3: Create HNSW index for fast approximate cosine similarity search
CREATE INDEX IF NOT EXISTS knowledge_items_embedding_idx
    ON knowledge_items
    USING hnsw (embedding vector_cosine_ops);

-- Step 4: RPC function for semantic vector search
-- Called via supabase.rpc('match_documents', {...})
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding    vector(768),
    match_threshold    float     DEFAULT 0.5,
    match_count        int       DEFAULT 5,
    filter_module      text      DEFAULT NULL
)
RETURNS TABLE (
    id              uuid,
    module          text,
    sub_intent      text,
    question        text,
    answer          text,
    keywords        text[],
    similarity      float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ki.id,
        ki.module,
        ki.sub_intent,
        ki.question,
        ki.answer,
        ki.keywords,
        1 - (ki.embedding <=> query_embedding) AS similarity
    FROM knowledge_items ki
    WHERE
        ki.embedding IS NOT NULL
        AND (filter_module IS NULL OR ki.module = filter_module)
        AND 1 - (ki.embedding <=> query_embedding) >= match_threshold
    ORDER BY ki.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Verify migration
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'knowledge_items'
ORDER BY ordinal_position;
