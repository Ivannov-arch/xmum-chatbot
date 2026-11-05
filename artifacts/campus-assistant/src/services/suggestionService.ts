import { supabase } from "@/lib/supabaseClient";

export interface Suggestion {
  id: string;
  question: string;
  suggested_answer: string | null;
  user_message: string | null;
  session_id: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
}

/** Submit a new suggestion from any user (public, no auth required). */
export async function submitSuggestion({
  question,
  suggested_answer,
  user_message,
  session_id,
}: {
  question: string;
  suggested_answer?: string;
  user_message?: string;
  session_id?: string;
}): Promise<void> {
  const { error } = await supabase.from("suggested_questions").insert([
    {
      question: question.trim(),
      suggested_answer: suggested_answer?.trim() || null,
      user_message: user_message?.trim() || null,
      session_id: session_id || null,
      status: "pending",
    },
  ]);
  if (error) throw error;
}

/** Fetch all suggestions, optionally filtered by status (admin use). */
export async function getSuggestions(
  status?: "pending" | "approved" | "rejected"
): Promise<Suggestion[]> {
  let query = supabase
    .from("suggested_questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Suggestion[]) || [];
}

/** Update the status of a suggestion (admin only). */
export async function updateSuggestionStatus(
  id: string,
  status: "approved" | "rejected",
  reviewed_by: string
): Promise<void> {
  const { error } = await supabase
    .from("suggested_questions")
    .update({ status, reviewed_by })
    .eq("id", id);
  if (error) throw error;
}

/** Delete a suggestion permanently (admin only). */
export async function deleteSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from("suggested_questions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Get count of pending suggestions (for admin dashboard badge). */
export async function getPendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from("suggested_questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}
