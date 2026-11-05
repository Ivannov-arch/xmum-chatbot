"use client";

import React, { useState, useEffect } from "react";
import {
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowlegeItem,
} from "@/services/knowledgeService";
import { supabase } from "@/lib/supabaseClient";

/* ──────────────────────────────────────────
   Types
────────────────────────────────────────── */
interface KnowledgeItem {
  id: string;
  module: "admin_directory" | "campus_life" | "academic_navigation" | string;
  question: string;
  answer: string;
  keywords: string[];
}

/* ──────────────────────────────────────────
   Mock data (fallback while loading)
────────────────────────────────────────── */
const INITIAL_MOCK_ITEMS: KnowledgeItem[] = [
  {
    id: "kb-001",
    module: "campus_life",
    question: "Where is the library and what are its opening hours?",
    answer:
      "The library is located in the Main Library Building, Block B1, Levels 2 to 5. It is open from 8:30 AM to 10:00 PM on weekdays, and 9:00 AM to 5:00 PM on weekends.",
    keywords: ["library", "hours", "location", "books", "study"],
  },
  {
    id: "kb-002",
    module: "campus_life",
    question: "How do I connect to the campus Wi-Fi network?",
    answer:
      "Select the SSID 'XMUM-WiFi' on your device. Log in using your Student ID (e.g. ACC101xxxx) and your student portal password.",
    keywords: ["wifi", "internet", "wireless", "connection", "login"],
  },
  {
    id: "kb-003",
    module: "academic_navigation",
    question: "What is the passing mark for undergraduate courses?",
    answer:
      "The passing grade for undergraduate courses at XMUM is grade D (50%). Anything below 50% is considered a fail (grade F) and requires a retake or resit.",
    keywords: ["passing mark", "grades", "exams", "gpa", "pass"],
  },
  {
    id: "kb-004",
    module: "admin_directory",
    question: "How do I contact the Student Affairs Office (SAO)?",
    answer:
      "You can visit SAO at Block B1, Ground Floor, or email them at sao@xmu.edu.my for questions about hostels, activities, or clubs.",
    keywords: ["sao", "student affairs", "hostel", "clubs", "contact"],
  },
  {
    id: "kb-005",
    module: "academic_navigation",
    question: "How do I apply for a course withdrawal or deferment?",
    answer:
      "Fill out the Deferment/Withdrawal Form from the Academic Affairs Office (AAO) at Block A3, get it signed by your head of department, and submit it before week 4 of the semester.",
    keywords: ["deferment", "withdrawal", "drop course", "academic affairs"],
  },
];

/* ──────────────────────────────────────────
   Category badge config (Dark Mode Adjusted)
────────────────────────────────────────── */
type BadgeCfg = { label: string; bg: string; text: string };

const MODULE_BADGES: Record<string, BadgeCfg> = {
  admin_directory: {
    label: "Admin Directory",
    bg: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-400",
  },
  campus_life: {
    label: "Campus Life",
    bg: "bg-blue-500/10 border border-blue-500/20",
    text: "text-blue-400",
  },
  academic_navigation: {
    label: "Academic Navigation",
    bg: "bg-violet-500/10 border border-violet-500/20",
    text: "text-violet-400",
  },
};

function CategoryBadge({ module }: { module: string }) {
  const cfg: BadgeCfg = MODULE_BADGES[module] || {
    label: module,
    bg: "bg-slate-500/10 border border-slate-500/20",
    text: "text-slate-400",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

/* ──────────────────────────────────────────
   Spinner
────────────────────────────────────────── */
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-indigo-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ──────────────────────────────────────────
   Form Field wrapper
────────────────────────────────────────── */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-slate-500 leading-normal">{hint}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm text-slate-200 bg-slate-900/60 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

/* ──────────────────────────────────────────
   Main Page
────────────────────────────────────────── */
export default function KnowledgeBaseCMS() {
  const [items, setItems] = useState<KnowledgeItem[]>(INITIAL_MOCK_ITEMS);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<KnowledgeItem | null>(null);

  // Form
  const [formModule, setFormModule] = useState("campus_life");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formKeywords, setFormKeywords] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const triggerToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const parseKeywords = (kwString: string): string[] =>
    kwString
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

  /* ── Filtered list ── */
  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q));
    const matchesModule =
      selectedModule === "all" || item.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedModule]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Fetch from Supabase ── */
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("knowledge_items")
        .select("id, module, question, answer, keywords");
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items, using initial mock structure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  /* ── Modal helpers ── */
  const openAddModal = () => {
    setFormModule("campus_life");
    setFormQuestion("");
    setFormAnswer("");
    setFormKeywords("");
    setIsAddOpen(true);
  };

  const openEditModal = (item: KnowledgeItem) => {
    setCurrentItem(item);
    setFormModule(item.module);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormKeywords(item.keywords.join(", "));
    setIsEditOpen(true);
  };

  const openDeleteModal = (item: KnowledgeItem) => {
    setCurrentItem(item);
    setIsDeleteOpen(true);
  };

  /* ── CRUD ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      triggerToast("Question and Answer are required", "error");
      return;
    }
    try {
      await createKnowledgeItem({
        module: formModule,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        keywordsArray: parseKeywords(formKeywords),
      });
      await fetchItems();
      triggerToast("Q&A item added successfully!");
      setIsAddOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add item";
      triggerToast(msg, "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;
    if (!formQuestion.trim() || !formAnswer.trim()) {
      triggerToast("Question and Answer are required", "error");
      return;
    }
    try {
      await updateKnowledgeItem({
        id: currentItem.id,
        module: formModule,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        keywordsArray: parseKeywords(formKeywords),
      });
      await fetchItems();
      triggerToast("Q&A item updated successfully!");
      setIsEditOpen(false);
      setCurrentItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to edit item";
      triggerToast(msg, "error");
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    try {
      await deleteKnowlegeItem(currentItem.id);
      await fetchItems();
      triggerToast("Q&A item deleted successfully!");
      setIsDeleteOpen(false);
      setCurrentItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item";
      triggerToast(msg, "error");
    }
  };

  /* ── Shared form fields JSX ── */
  const renderFormFields = () => (
    <>
      <Field label="Module Category">
        <select
          value={formModule}
          onChange={(e) => setFormModule(e.target.value)}
          className={inputCls}
          style={{ colorScheme: "dark" }}
        >
          <option value="campus_life">Campus Life</option>
          <option value="academic_navigation">Academic Navigation</option>
          <option value="admin_directory">Admin Directory</option>
          <option value="general">General</option>
        </select>
      </Field>

      <Field label="Question Text">
        <input
          type="text"
          required
          value={formQuestion}
          onChange={(e) => setFormQuestion(e.target.value)}
          placeholder="e.g. Where is the library?"
          className={inputCls}
        />
      </Field>

      <Field label="Answer Details">
        <textarea
          required
          rows={4}
          value={formAnswer}
          onChange={(e) => setFormAnswer(e.target.value)}
          placeholder="Provide a clear, detailed response…"
          className={`${inputCls} resize-none`}
        />
      </Field>

      <Field
        label="Keywords (comma-separated)"
        hint="Separated by commas — used by the keyword-matching algorithm."
      >
        <input
          type="text"
          value={formKeywords}
          onChange={(e) => setFormKeywords(e.target.value)}
          placeholder="e.g. library, location, books, study room"
          className={inputCls}
        />
      </Field>
    </>
  );

  return (
    <div className="w-full text-slate-100 overflow-auto">
      <div className="mx-auto max-w-7xl space-y-6 relative pb-4">
        {/* ── Toast Alert ── */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-600 border-emerald-500"
                : "bg-red-600 border-red-500"
            }`}
          >
            <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
            <span className="whitespace-nowrap">{toast.message}</span>
          </div>
        )}

        {/* ── Control Bar / Filter Area ── */}
        <div className="bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search questions, answers, keywords…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-white/5 rounded-full text-sm text-slate-200 bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Controls Right Grid */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="flex-1 md:w-48 px-3 py-2.5 border border-white/5 rounded-xl text-sm text-slate-300 bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              style={{ colorScheme: "dark" }}
            >
              <option value="all">All Categories</option>
              <option value="campus_life">Campus Life</option>
              <option value="academic_navigation">Academic Navigation</option>
              <option value="admin_directory">Admin Directory</option>
              <option value="general">General</option>
            </select>

            <button
              onClick={openAddModal}
              className="whitespace-nowrap flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Q&amp;A
            </button>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="bg-slate-900/30 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500">
              <Spinner />
              <span className="text-sm font-medium tracking-wide">
                Loading database items…
              </span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-20 text-center max-w-sm mx-auto">
              <span className="text-4xl block mb-4">🔍</span>
              <p className="font-bold text-slate-300 text-sm">No items found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try resetting or adjusting your target search query query
                filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              {/* Overflow scroll wrapper for table on mobile */}
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-44">Category</th>
                    <th className="py-3.5 px-4 w-72">Question</th>
                    <th className="py-3.5 px-4">Answer</th>
                    <th className="py-3.5 px-4 w-52">Keywords</th>
                    <th className="py-3.5 px-4 text-right w-24 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs sm:text-sm text-slate-300">
                  {paginatedItems.map((item, idx) => {
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                    const truncated =
                      item.answer.length > 120
                        ? item.answer.slice(0, 120) + "…"
                        : item.answer;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-indigo-500/[0.03] ${
                          idx % 2 === 0 ? "" : "bg-white/[0.01]"
                        }`}
                      >
                        {/* Row # */}
                        <td className="py-4 px-4 text-center">
                          <span className="text-xs font-bold text-slate-600">
                            {globalIdx + 1}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 vertical-align-top">
                          <CategoryBadge module={item.module} />
                        </td>

                        {/* Question */}
                        <td className="py-4 px-4 font-semibold text-slate-200 max-w-[260px] break-words leading-snug">
                          {item.question}
                        </td>

                        {/* Answer */}
                        <td className="py-4 px-4 text-slate-400 max-w-[320px] leading-relaxed break-words">
                          <span title={item.answer}>{truncated}</span>
                        </td>

                        {/* Keywords */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.keywords && item.keywords.length > 0 ? (
                              item.keywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/5 font-mono text-[9px] font-medium whitespace-nowrap"
                                >
                                  {kw}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] italic text-slate-600">
                                None
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions column */}
                        <td className="py-4 px-4 text-right space-x-1 whitespace-nowrap w-24">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit item"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Delete item"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination Controls ── */}
        {filteredItems.length > itemsPerPage && (
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">
              Showing <strong className="text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
              <strong className="text-slate-200">
                {Math.min(currentPage * itemsPerPage, filteredItems.length)}
              </strong>{" "}
              of <strong className="text-slate-200">{filteredItems.length}</strong> items
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-4 py-2 bg-slate-950/60 border border-white/5 text-slate-300 rounded-xl hover:text-white hover:bg-slate-900 transition-all disabled:opacity-40"
              >
                Previous
              </button>
              <div className="flex items-center px-2 text-slate-400 font-semibold">
                Page {currentPage} of {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-4 py-2 bg-slate-950/60 border border-white/5 text-slate-300 rounded-xl hover:text-white hover:bg-slate-900 transition-all disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── ADD MODAL ── */}
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
            <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <h3 className="font-bold text-sm text-white">
                    Add New Q&amp;A Item
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4">
                {renderFormFields()}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="whitespace-nowrap px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow transition"
                  >
                    Insert Q&amp;A
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT MODAL ── */}
        {isEditOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
            <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <h3 className="font-bold text-sm text-white">
                    Edit Q&amp;A Item
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                {renderFormFields()}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="whitespace-nowrap px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE MODAL ── */}
        {isDeleteOpen && currentItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
            <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-red-950/40 text-red-400 border-b border-white/5 px-6 py-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="font-bold text-sm">Confirm Delete</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Are you sure you want to permanently delete this Q&amp;A pair?
                  This action cannot be undone.
                </p>
                <div className="bg-slate-900 border border-white/5 p-4 rounded-xl text-xs space-y-1.5">
                  <p className="font-bold text-slate-200">
                    {currentItem.question}
                  </p>
                  <p className="text-slate-400 leading-relaxed line-clamp-3">
                    {currentItem.answer}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsDeleteOpen(false)}
                    className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="whitespace-nowrap px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow transition"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
