-- Supabase schema for the XMUM chatbot knowledge base.
-- Run in Supabase SQL Editor before seeding a fresh project.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL CHECK (
        module IN ('general', 'admin_directory', 'campus_life', 'academic_navigation')
    ),
    sub_intent TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_items_module_question_idx
    ON knowledge_items (module, lower(question));

CREATE INDEX IF NOT EXISTS knowledge_items_module_sub_intent_idx
    ON knowledge_items (module, sub_intent);

CREATE INDEX IF NOT EXISTS knowledge_items_keywords_idx
    ON knowledge_items USING GIN (keywords);

CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
    message TEXT NOT NULL,
    module TEXT,
    sub_intent TEXT,
    confidence NUMERIC,
    matched_question TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_logs_session_idx
    ON conversation_logs (session_id, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_items_set_updated_at ON knowledge_items;
CREATE TRIGGER knowledge_items_set_updated_at
BEFORE UPDATE ON knowledge_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
