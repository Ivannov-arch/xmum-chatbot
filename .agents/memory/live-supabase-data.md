---
name: Live Supabase project
  description: The Supabase project this app uses is the live one holding real student data, so CMS destructive actions hit production.
---

The app's Supabase project is the live production project, not a scratch copy. It holds real student conversation logs and suggestions.

**Why:** The user confirmed the Replit dev environment is pointed at the same Supabase project the deployed app uses. The staff CMS exposes irreversible actions: deleting a conversation record, and "Clear all logs", which deletes every row in `conversation_logs`.

**How to apply:** When verifying CMS work against this project, stay read-only first. Never exercise a delete or clear action without asking the user to confirm that specific action. Treat a request to make the CMS "work" as authorization to read and sign in, not to destroy records.
