import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);
const client = isSupabaseConfigured ? createClient(url, key) : null;

// Do not initialize with fake credentials or crash the public chat on import.
// Admin/data operations fail explicitly until the original connection is set.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!client) {
      throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
    }
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
