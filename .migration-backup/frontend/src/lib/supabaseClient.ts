import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sync auth session to cookie for the Next.js server-side proxy
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      // Set the auth cookie
      const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
      document.cookie = `sb-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } else {
      // Clear the auth cookie on sign-out
      document.cookie = `sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    }
  });
}

