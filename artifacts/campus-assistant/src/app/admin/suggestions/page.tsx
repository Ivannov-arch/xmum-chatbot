"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  Suggestion,
} from "@/services/suggestionService";
import { createKnowledgeItem } from "@/services/knowledgeService";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [adminEmail, setAdminEmail] = useState("");

  // Approve Modal States
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approvingItem, setApprovingItem] = useState<Suggestion | null>(null);
  const [formModule, setFormModule] = useState("campus_life");
  const [formSubIntent, setFormSubIntent] = useState("general");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formKeywords, setFormKeywords] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdminEmail(data?.session?.user?.email ?? "admin");
    });
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSuggestions(
        filter === "all" ? undefined : filter
      );
      setSuggestions(data);
    } catch {
      showToast("Failed to load suggestions.", "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openApproveModal = (item: Suggestion) => {
    setApprovingItem(item);
    setFormQuestion(item.question);
    setFormAnswer(item.suggested_answer || "");
    setFormModule("campus_life");
    setFormSubIntent("general");
    setFormKeywords("");
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingItem) return;
    if (!formQuestion.trim() || !formAnswer.trim()) {
      showToast("Question and Answer are required.", "err");
      return;
    }

    setActioningId(approvingItem.id);
    try {
      const keywordsArray = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      // 1. Insert into knowledge_items
      await createKnowledgeItem({
        module: formModule,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        keywordsArray,
      });

      // 2. Update status to 'approved'
      await updateSuggestionStatus(approvingItem.id, "approved", adminEmail);

      showToast("Suggestion approved and added to Knowledge Base.", "ok");
      
      setSuggestions((prev) =>
        filter === "all"
          ? prev.map((s) =>
              s.id === approvingItem.id ? { ...s, status: "approved", reviewed_by: adminEmail } : s
            )
          : prev.filter((s) => s.id !== approvingItem.id)
      );

      setIsApproveOpen(false);
      setApprovingItem(null);
    } catch (err) {
      console.error(err);
      showToast("Approval failed. Please try again.", "err");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      await updateSuggestionStatus(id, "rejected", adminEmail);
      showToast("Suggestion rejected.", "ok");
      setSuggestions((prev) =>
        filter === "all"
          ? prev.map((s) =>
              s.id === id ? { ...s, status: "rejected", reviewed_by: adminEmail } : s
            )
          : prev.filter((s) => s.id !== id)
      );
    } catch {
      showToast("Rejection failed. Please try again.", "err");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this suggestion permanently?")) return;
    setActioningId(id);
    try {
      await deleteSuggestion(id);
      showToast("Suggestion permanently deleted.", "ok");
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      showToast("Deletion failed. Please try again.", "err");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="w-full h-full p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-white">Suggested Questions</h2>
          <p className="text-slate-400">
            Review questions submitted by users. Approve to add to the knowledge
            base, or reject if irrelevant.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["pending", "all", "approved", "rejected"] as FilterStatus[]).map(
            (s) => (
              <button
                key={s}
                id={`filter-tab-${s}`}
                onClick={() => setFilter(s)}
                className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                  filter === s
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-900/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-16 text-center">
            <p className="text-slate-500 text-sm">No {filter} suggestions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 space-y-4"
              >
                {/* Question */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Suggested Question
                    </p>
                    <p className="text-white font-semibold text-base leading-snug">
                      {s.question}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide flex-shrink-0 ${STATUS_BADGE[s.status]}`}
                  >
                    {s.status}
                  </span>
                </div>

                {/* User's suggested answer (highlighted) */}
                {s.suggested_answer && (
                  <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
                      User&apos;s Suggested Answer
                    </p>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {s.suggested_answer}
                    </p>
                  </div>
                )}

                {/* Original context */}
                {s.user_message && (
                  <div className="rounded-xl bg-slate-800/50 border border-white/5 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Original Chat Message
                    </p>
                    <p className="text-slate-400 text-sm italic">
                      &ldquo;{s.user_message}&rdquo;
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  <p className="text-xs text-slate-500">
                    {new Date(s.created_at).toLocaleString()}
                    {s.reviewed_by && ` · Reviewed by ${s.reviewed_by}`}
                  </p>

                  <div className="flex gap-3">
                    {s.status === "pending" ? (
                      <>
                        <button
                          id={`reject-btn-${s.id}`}
                          disabled={actioningId === s.id}
                          onClick={() => handleReject(s.id)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                        >
                          Reject
                        </button>
                        <button
                          id={`approve-btn-${s.id}`}
                          disabled={actioningId === s.id}
                          onClick={() => openApproveModal(s)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <button
                        id={`delete-btn-${s.id}`}
                        disabled={actioningId === s.id}
                        onClick={() => handleDelete(s.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      >
                        Delete Record
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {isApproveOpen && approvingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-indigo-950/40 text-indigo-300 border-b border-white/5 px-6 py-4 flex items-center gap-2">
              <span>💡</span>
              <h3 className="font-bold text-sm">Approve & Add to Knowledge Base</h3>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4 text-slate-100">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Module
                </label>
                <select
                  value={formModule}
                  onChange={(e) => setFormModule(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="campus_life">Campus Life</option>
                  <option value="academic_navigation">Academic Navigation</option>
                  <option value="admin_directory">Admin Directory</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sub Intent
                </label>
                <input
                  type="text"
                  value={formSubIntent}
                  onChange={(e) => setFormSubIntent(e.target.value)}
                  placeholder="e.g. library, wifi, hostel"
                  className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question
                </label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Answer
                </label>
                <textarea
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="e.g. gym, workout, fitness"
                  className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Actions Panel */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsApproveOpen(false);
                    setApprovingItem(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl border border-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actioningId === approvingItem.id}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white text-sm font-semibold rounded-xl shadow transition"
                >
                  {actioningId === approvingItem.id ? "Saving..." : "Save & Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl z-50 ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
