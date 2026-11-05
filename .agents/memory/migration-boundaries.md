---
name: Migration boundaries
description: Scope and preservation decisions for the imported campus assistant
---

Preserve the existing Supabase database/auth and Python NLP implementation during the Replit port. Do not replace them with a new database, generated chatbot, or redesigned interface.

**Why:** This task ports an existing product with visual and functional parity; substituting services would change behavior and could disconnect the user's existing data.

**How to apply:** Treat the bundled local knowledge as the original read-only offline mode, not a replacement for live Supabase administration. Missing external credentials are configuration blockers, not permission to invent accounts or fake successful writes.
