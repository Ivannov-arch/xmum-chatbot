import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

print(f"Connecting to Supabase at {url}...")
client = create_client(url, key)

print("\n--- knowledge_items count ---")
try:
    res = client.table("knowledge_items").select("module").execute()
    items = res.data
    print(f"Total knowledge items: {len(items)}")
    modules = {}
    for item in items:
        mod = item.get("module")
        modules[mod] = modules.get(mod, 0) + 1
    for mod, count in modules.items():
        print(f"  - {mod}: {count}")
except Exception as e:
    print(f"Error checking knowledge_items: {e}")

print("\n--- conversation_logs count ---")
try:
    res = client.table("conversation_logs").select("*", count="exact").execute()
    print(f"Total conversation logs: {res.count if hasattr(res, 'count') else len(res.data)}")
except Exception as e:
    print(f"Error checking conversation_logs: {e}")
