-- Supabase table for user-submitted question suggestions.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS suggested_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    suggested_answer TEXT,               -- Optional: user's own known answer
    user_message TEXT,                   -- Original raw chat message (context for admin)
    session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT,                    -- Admin email who actioned it
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS suggested_questions_status_idx
    ON suggested_questions (status, created_at DESC);
