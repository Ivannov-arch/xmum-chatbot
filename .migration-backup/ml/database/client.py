# database/client.py
#
# Supabase client factory.
# Provides two clients:
#   - get_client()       -> uses ANON KEY  (for read-only queries from the chatbot)
#   - get_admin_client() -> uses SERVICE ROLE KEY (for seeding / write operations)

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_client() -> Client:
    """Return an anon-key Supabase client (read-only, safe for chatbot queries)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise EnvironmentError(
            "Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file."
        )

    return create_client(url, key)


def get_admin_client() -> Client:
    """Return a service-role Supabase client (full access, for seeding only)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # If the service role key is missing or is the default placeholder, fall back to anon key
    if not url or not key or key == "your-service-role-key-here":
        anon_key = os.getenv("SUPABASE_ANON_KEY")
        if anon_key:
            print("  [WARN] SUPABASE_SERVICE_ROLE_KEY is missing or placeholder. Falling back to SUPABASE_ANON_KEY.")
            return create_client(url, anon_key)
        raise EnvironmentError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file."
        )

    return create_client(url, key)

