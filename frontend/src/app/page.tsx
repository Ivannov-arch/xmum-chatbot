"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getKnowledgeItems } from "@/services/knowledgeService";
import { submitSuggestion } from "@/services/suggestionService";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ApiStatus = "connecting" | "connected" | "error";

interface DebugData {
  matched_question?: string;
  confidence?: number;
  module?: string;
  sub_intent?: string;
  entities?: string[];
}

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  error?: boolean;
  debugData?: DebugData;
  lowConfidence?: boolean;  // triggers suggestion button
  originalQuery?: string;   // the user's raw question
}

interface FAQItem {
  id: string;
  module: string | null;
  question: string;
}

interface ChatResponse {
  answer?: string;
  matched_question?: string;
  confidence?: number;
  module?: string;
  sub_intent?: string;
  entities?: string[];
}

interface SuggestionsResponse {
  suggestions?: string[];
}

type GroupedFaqs = Record<string, FAQItem[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Suggested topics shown as chips
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_SUGGESTIONS: string[] = [
  "Library opening hours",
  "How to connect to WiFi",
  "Hostel application",
  "Scholarship requirements",
  "Cafeteria menu",
  "Bus schedule",
];

export default function ChatbotHome() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<ApiStatus>("connecting");
  const [apiStatusMsg, setApiStatusMsg] = useState<string>(
    "Connecting to backend...",
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // FAQ sidebar
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(false);

  // Admin / debug
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Suggestion form state
  const [suggestionTarget, setSuggestionTarget] = useState<{query: string; msgId: string} | null>(null);
  const [suggestionQuestion, setSuggestionQuestion] = useState("");
  const [suggestionAnswer, setSuggestionAnswer] = useState("");
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [suggestionToast, setSuggestionToast] = useState<string | null>(null);

  // Stable session ID for tracking
  const sessionIdRef = useRef<string>(
    typeof window !== "undefined"
      ? (sessionStorage.getItem("chatSessionId") ||
          (() => {
            const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem("chatSessionId", id);
            return id;
          })())
      : `s-${Date.now()}`
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch FAQs for sidebar
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadFAQs() {
      try {
        const data = await getKnowledgeItems();

        // Defensive normalization in case service shape is uncertain
        if (Array.isArray(data)) {
          const normalized: FAQItem[] = data
            .filter(
              (item) =>
                !!item &&
                typeof item === "object" &&
                typeof (item as Record<string, unknown>).id === "string" &&
                typeof (item as Record<string, unknown>).question === "string",
            )
            .map((item) => {
              const row = item as Record<string, unknown>;
              return {
                id: row.id as string,
                question: row.question as string,
                module:
                  typeof row.module === "string" || row.module === null
                    ? (row.module as string | null)
                    : null,
              };
            });

          setFaqs(normalized);
        } else {
          setFaqs([]);
        }
      } catch (error) {
        console.error("Error fetching FAQs for sidebar:", error);
        setFaqs([]);
      }
    }

    loadFAQs();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Check Supabase admin session
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data } = await supabase.auth.getSession();
        const email = data?.session?.user?.email;

        // For now: any signed-in user with email becomes admin.
        // If you want real admin logic, this should be tightened.
        if (email) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin session:", error);
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Resolve API base URL
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Health check + greeting + suggestions
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!apiBaseUrl) return;

    let alive = true;

    async function init() {
      let ok = false;

      // Health check
      for (const path of ["/api/health", "/health"]) {
        try {
          const r = await fetch(`${apiBaseUrl}${path}`);
          if (r.ok) {
            ok = true;
            break;
          }
        } catch {
          // try next
        }
      }

      if (!alive) return;

      if (ok) {
        setApiStatus("connected");
        setApiStatusMsg("✓ Connected");

        setTimeout(() => {
          if (alive) setApiStatusMsg("");
        }, 3000);

        // Fetch suggestions
        for (const path of [
          "/api/suggestions?limit=8",
          "/suggestions?limit=8",
        ]) {
          try {
            const r = await fetch(`${apiBaseUrl}${path}`);

            if (r.ok) {
              const d: SuggestionsResponse = await r.json();
              if (alive) {
                setSuggestions(
                  Array.isArray(d.suggestions) ? d.suggestions : [],
                );
              }
              break;
            }
          } catch {
            // try next
          }
        }
      } else {
        setApiStatus("error");
        setApiStatusMsg("Backend offline — using fallback suggestions");
        setSuggestions(FALLBACK_SUGGESTIONS);
      }
    }

    const greetingTimeout = setTimeout(() => {
      if (!alive) return;

      setMessages([
        {
          id: "greeting",
          role: "bot",
          text: "Hi there! 👋 I'm <strong>XMUM Campus Assistant</strong>.<br/>Ask me anything — library, hostel, WiFi, scholarships, food, transport, and more!",
        },
      ]);
    }, 250);

    init();

    return () => {
      alive = false;
      clearTimeout(greetingTimeout);
    };
  }, [apiBaseUrl]);

  // ───────────────────────────────────────────────────────────────────────────
  // Auto-scroll
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ───────────────────────────────────────────────────────────────────────────
  // Send message
  // ───────────────────────────────────────────────────────────────────────────

  const handleSend = async (override?: string) => {
    const text = (override ?? inputVal).trim();
    if (!text || isLoading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        text,
      },
    ]);

    setInputVal("");
    setIsLoading(true);
    inputRef.current?.focus();

    let answer = "Sorry, there was an error communicating with the backend.";
    let hasError = false;
    let debug: DebugData | undefined;

    try {
      const payload = {
        message: text,
        debug: showDebug,
        session_id: sessionIdRef.current,
      };

      let response: Response | undefined;

      for (const path of ["/api/chat", "/chat"]) {
        try {
          const r = await fetch(`${apiBaseUrl}${path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          response = r;

          // stop if success OR if endpoint exists but returns non-404
          if (r.ok || r.status !== 404) {
            break;
          }
        } catch {
          // try next
        }
      }

      if (response?.ok) {
        const d: ChatResponse = await response.json();

        answer = d.answer ?? "No response received.";
        debug = {
          matched_question: d.matched_question,
          confidence: d.confidence,
          module: d.module,
          sub_intent: d.sub_intent,
          entities: d.entities,
        };
      } else {
        hasError = true;
        answer =
          apiStatus !== "connected"
            ? "Backend is not connected. Please start the Python server."
            : `Backend error (HTTP ${response?.status ?? "?"}).`;
      }
    } catch {
      hasError = true;
      answer = "Failed to reach the backend. Is the server running?";
    }

    // Low-confidence detection: confidence < 0.45 OR answer starts with "Sorry"
    const LOW_CONFIDENCE_THRESHOLD = 0.45;
    const isLowConfidence =
      !hasError &&
      (debug?.confidence !== undefined
        ? debug.confidence < LOW_CONFIDENCE_THRESHOLD
        : answer.toLowerCase().startsWith("sorry") ||
          answer.toLowerCase().includes("don't have") ||
          answer.toLowerCase().includes("not find"));

    setMessages((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        role: "bot",
        text: answer,
        error: hasError,
        debugData: debug,
        lowConfidence: isLowConfidence,
        originalQuery: text,
      },
    ]);

    setIsLoading(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Input key handler
  // ───────────────────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleSend();
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Filter + group FAQs by module
  // ───────────────────────────────────────────────────────────────────────────

  const filteredFaqs = faqs.filter((item) => {
    const query = searchQuery.toLowerCase();

    return (
      item.question.toLowerCase().includes(query) ||
      (item.module?.toLowerCase().includes(query) ?? false)
    );
  });

  const groupedFaqs = filteredFaqs.reduce<GroupedFaqs>((acc, item) => {
    const moduleName = item.module || "General";

    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }

    acc[moduleName].push(item);
    return acc;
  }, {});

  const statusDotMap: Record<ApiStatus, string> = {
    connecting: "bg-amber-400 animate-pulse",
    connected: "bg-emerald-400",
    error: "bg-red-500",
  };

  const statusDot = statusDotMap[apiStatus];

  // ─────────────────────────────────────────────────────────────────────────────
  // Suggestion form handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const openSuggestionForm = (query: string, msgId: string) => {
    setSuggestionTarget({ query, msgId });
    setSuggestionQuestion(query);
    setSuggestionAnswer("");
  };

  const closeSuggestionForm = () => {
    setSuggestionTarget(null);
    setSuggestionQuestion("");
    setSuggestionAnswer("");
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestionQuestion.trim()) return;
    setSuggestionSubmitting(true);
    try {
      await submitSuggestion({
        question: suggestionQuestion,
        suggested_answer: suggestionAnswer || undefined,
        user_message: suggestionTarget?.query,
        session_id: sessionIdRef.current,
      });
      setSuggestionToast("Thank you! Your suggestion has been submitted. ✅");
      closeSuggestionForm();
      setTimeout(() => setSuggestionToast(null), 4000);
    } catch {
      setSuggestionToast("Failed to submit suggestion. Please try again.");
      setTimeout(() => setSuggestionToast(null), 3000);
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-900">
      {/* Backdrop overlay — mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-blue-900/50 bg-blue-950 text-white transition-all duration-300 ease-in-out md:static
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
    ${isDesktopCollapsed ? "md:w-16" : "md:w-80"}`}
      >
        {/* Header Sidebar (Tetap di atas) */}
        <div className="flex-none border-b border-blue-900/40 p-4">
          <div className="flex items-center justify-between mb-4">
            {!isDesktopCollapsed ? (
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-blue-200">
                  <span>📚</span> Campus FAQ
                </h2>
              </div>
            ) : (
              <button
                onClick={() => setIsDesktopCollapsed(false)}
                className="mx-auto hidden text-xl md:flex hover:bg-blue-900/50 p-2 rounded-lg transition-colors cursor-pointer"
                title="Expand FAQ Sidebar"
                type="button"
              >
                📚
              </button>
            )}

            <div className="flex items-center gap-1">
              {/* Close/Collapse Button for Desktop */}
              {!isDesktopCollapsed && (
                <button
                  onClick={() => setIsDesktopCollapsed(true)}
                  className="hidden md:flex rounded-lg p-1.5 text-blue-300 hover:text-white hover:bg-blue-900/50 transition-colors text-sm items-center justify-center"
                  type="button"
                  title="Collapse FAQ Sidebar"
                >
                  ✕
                </button>
              )}

              {/* Mobile close — Hanya muncul di mobile */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg p-2 text-xl text-blue-300 hover:text-white md:hidden"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search input */}
          <div
            className={`relative ${isDesktopCollapsed ? "md:hidden" : "block"}`}
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-blue-800 bg-blue-900/40 py-1.5 pl-8 pr-3 text-sm text-white"
            />
            {/* ... icon search ... */}
          </div>
        </div>

        {/* FAQ list — Area yang bisa di-scroll */}
        <div
          className={`flex-1 overflow-y-auto p-4 ${isDesktopCollapsed ? "md:hidden" : "block"}`}
        >
          {Object.keys(groupedFaqs).length === 0 ? (
            <p className="text-center text-sm text-blue-300/60">No results</p>
          ) : (
            Object.entries(groupedFaqs)
              .sort(([a], [b]) => {
                if (a.toLowerCase() === "general") return -1;
                if (b.toLowerCase() === "general") return 1;
                return a.localeCompare(b);
              })
              .map(([moduleName, items]) => (
              <div key={moduleName} className="mb-6">
                <h3 className="mb-2 text-xs font-bold uppercase text-blue-300">
                  {moduleName}
                </h3>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      void handleSend(item.question);
                      setIsSidebarOpen(false); // Otomatis tutup saat klik
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-900/50"
                  >
                    &bull; {item.question}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Permanent suggest button at sidebar bottom */}
        {!isDesktopCollapsed && (
          <div className="flex-none border-t border-blue-900/40 p-4">
            <button
              id="sidebar-suggest-btn"
              onClick={() => openSuggestionForm("", "manual")}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-300 border border-blue-700/50 hover:bg-blue-900/40 hover:text-white transition-all"
              type="button"
            >
              <span>💡</span>
              Suggest a Question
            </button>
          </div>
        )}
      </aside>

      {/* Main chat container */}
      <main className="flex h-full flex-1 items-center justify-center overflow-hidden p-4 lg:p-6">
        <div className="chat-shell flex h-full w-full max-w-4xl flex-col overflow-hidden">
          {/* Header */}
          <header className="chat-header">
            <div className="chat-header-brand flex items-center gap-2">
              {/* Hamburger */}
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(true);
                  } else {
                    setIsDesktopCollapsed(false);
                  }
                }}
                className={`${isDesktopCollapsed ? "md:flex" : "md:hidden"} mr-1 flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100`}
                aria-label="Open FAQ Menu"
                type="button"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <div className="brand-avatar overflow-hidden">
                <img src="/mascot.jpg" alt="XMUM Mascot" className="w-full h-full object-cover" />
              </div>

              <div>
                <p className="brand-name">XMUM Campus Assistant</p>
                <p className="brand-sub">NLP-Powered · Python Backend</p>
              </div>
            </div>

            <div className="chat-header-actions">
              <span className="status-chip">
                <span className={`status-dot ${statusDot}`} />
                <span className="hidden sm:inline">
                  {apiStatusMsg ||
                    (apiStatus === "connected" ? "Online" : "Connecting…")}
                </span>
              </span>

              {isAdmin && (
                <button
                  onClick={() => setShowDebug((prev) => !prev)}
                  className={`pill-btn ${showDebug ? "pill-btn--active" : ""}`}
                  title="Admin-only debug toggle"
                  type="button"
                >
                  🛠{" "}
                  <span className="hidden sm:inline">
                    Debug {showDebug ? "On" : "Off"}
                  </span>
                </button>
              )}

              <Link href="/admin/login" className="pill-btn pill-btn--primary">
                Admin <span className="hidden sm:inline">CMS</span> →
              </Link>
            </div>
          </header>

          {/* Suggestion chips */}
          {suggestions.length > 0 && (
            <div className="chip-bar">
              <span className="chip-label">Try asking:</span>

              <div className="chip-list">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    className="chip"
                    disabled={isLoading}
                    onClick={() => void handleSend(s)}
                    type="button"
                  >
                    {s.length > 42 ? `${s.slice(0, 42)}…` : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="messages-pane" id="msgs">
            {messages.map((msg) => (
              <div key={msg.id} className={`msg-row msg-row--${msg.role}`}>
                <div
                  className={`msg-avatar ${msg.role === "user" ? "msg-avatar--user" : ""
                    }`}
                >
                  {msg.role === "user" ? (
                    "U"
                  ) : (
                    <img src="/mascot.jpg" alt="Mascot" className="w-full h-full object-cover rounded-full" />
                  )}
                </div>

                <div
                  className={`bubble ${msg.role === "user" ? "bubble--user" : "bubble--bot"
                    } ${msg.error ? "bubble--error" : ""}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />

                  {/* Debug panel */}
                  {isAdmin &&
                    showDebug &&
                    msg.debugData &&
                    msg.role === "bot" &&
                    !msg.error && (
                      <div className="debug-panel">
                        <p className="debug-title">🛠 Debug Info</p>

                        {msg.debugData.matched_question && (
                          <div className="debug-row">
                            <span className="debug-key">Best match</span>
                            <span className="debug-val">
                              &ldquo;{msg.debugData.matched_question}&rdquo;
                            </span>
                          </div>
                        )}

                        {msg.debugData.confidence !== undefined && (
                          <div className="debug-row">
                            <span className="debug-key">Confidence</span>
                            <span className="debug-val">
                              {(msg.debugData.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {msg.debugData.module && (
                          <div className="debug-row">
                            <span className="debug-key">Module</span>
                            <span className="debug-val">
                              {msg.debugData.module}
                            </span>
                          </div>
                        )}

                        {msg.debugData.sub_intent && (
                          <div className="debug-row">
                            <span className="debug-key">Intent</span>
                            <span className="debug-val">
                              {msg.debugData.sub_intent}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Contextual suggest button — appears on low-confidence bot answers */}
                  {msg.role === "bot" && msg.lowConfidence && !msg.error && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <button
                        id={`suggest-btn-${msg.id}`}
                        onClick={() =>
                          openSuggestionForm(msg.originalQuery ?? "", msg.id)
                        }
                        className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-100 transition-colors"
                        type="button"
                      >
                        <span>💡</span>
                        <span>Couldn&apos;t find an answer? Suggest this question</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="msg-row msg-row--bot">
                <div className="msg-avatar overflow-hidden">
                  <img src="/mascot.jpg" alt="Mascot" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="bubble bubble--bot bubble--typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="input-bar">
            <input
              ref={inputRef}
              id="inp"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask me anything about XMUM campus…"
              autoComplete="off"
            />

            <button
              id="sendBtn"
              onClick={() => void handleSend()}
              disabled={!inputVal.trim() || isLoading}
              aria-label="Send message"
              type="button"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* ──────────────── Suggestion Modal ──────────────── */}
      {suggestionTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">💡 Suggest a Question</h3>
              <button
                onClick={closeSuggestionForm}
                className="text-slate-400 hover:text-white text-xl leading-none"
                type="button"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-sm">
              Help us improve the chatbot by submitting a question we should know the answer to.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Your Question *
                </label>
                <input
                  id="suggestion-question-input"
                  type="text"
                  value={suggestionQuestion}
                  onChange={(e) => setSuggestionQuestion(e.target.value)}
                  placeholder="e.g. What time does the library close on weekends?"
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Your Answer{" "}
                  <span className="text-slate-600 normal-case font-normal">(optional — share if you know it!)</span>
                </label>
                <textarea
                  id="suggestion-answer-input"
                  value={suggestionAnswer}
                  onChange={(e) => setSuggestionAnswer(e.target.value)}
                  placeholder="e.g. The library closes at 10pm on Saturday and Sunday."
                  rows={3}
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeSuggestionForm}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                type="button"
              >
                Cancel
              </button>
              <button
                id="submit-suggestion-btn"
                onClick={() => void handleSubmitSuggestion()}
                disabled={!suggestionQuestion.trim() || suggestionSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
                type="button"
              >
                {suggestionSubmitting ? "Submitting..." : "Submit Suggestion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {suggestionToast && (
        <div className="fixed bottom-6 right-6 z-[1000] px-5 py-3 rounded-xl text-sm font-semibold bg-indigo-700 text-white shadow-xl">
          {suggestionToast}
        </div>
      )}
    </div>
  );
}
