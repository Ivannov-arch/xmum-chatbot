"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { BookOpen, ChevronDown, ChevronRight, CircleHelp, Menu, MessageSquarePlus, Search, Wrench, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getKnowledgeItems } from "@/services/knowledgeService";
import { submitSuggestion } from "@/services/suggestionService";
import CampusWelcomePage from "@/components/campus-welcome-page";
import "./campus-assistant.css";

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
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(
    () =>
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      window.location.origin
  );
  const [apiStatus, setApiStatus] = useState<ApiStatus>("connecting");
  const [apiStatusMsg, setApiStatusMsg] = useState<string>(
    "Connecting to backend...",
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentView, setCurrentView] = useState<"welcome" | "chat">("welcome");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // FAQ sidebar
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
      setFaqLoading(true);
      setFaqError("");
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
          setFaqError("The campus guide returned an unexpected response.");
        }
      } catch (error) {
        console.error("Error fetching FAQs for sidebar:", error);
        setFaqs([]);
        setFaqError(error instanceof Error ? error.message : "Campus answers could not be loaded.");
      } finally {
        setFaqLoading(false);
      }
    }

    loadFAQs();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Check Supabase admin session
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAdmin() {
      if (!isSupabaseConfigured) return;
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
    const envUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      window.location.origin;
    setApiBaseUrl(envUrl);
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

      setMessages((current) => current.length > 0 ? current : [
        {
          id: "greeting",
          role: "bot",
          text: "Welcome. I’m <strong>Captain Kah Kee</strong>.<br/>Ask about the library, accommodation, WiFi, scholarships, food, transport, and more.",
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

  const startChat = (question?: string) => {
    setCurrentView("chat");
    setIsSidebarOpen(false);
    if (question) {
      void handleSend(question);
    }
  };

  useEffect(() => {
    if (currentView !== "chat") return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [currentView]);

  const startNewConversation = () => {
    setMessages([]);
    setInputVal("");
    setIsSidebarOpen(false);
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
    return (selectedCategory === "all" || (item.module || "general") === selectedCategory) && (
      item.question.toLowerCase().includes(query) ||
      (item.module?.toLowerCase().includes(query) ?? false)
    );
  });
  const faqCategories = Array.from(new Set(faqs.map((item) => item.module || "general"))).sort((a, b) => {
    if (a === "general") return -1;
    if (b === "general") return 1;
    return a.localeCompare(b);
  });

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

  const retryFaqLoad = async () => {
    setFaqLoading(true);
    setFaqError("");
    try {
      const data = await getKnowledgeItems();
      if (!Array.isArray(data)) throw new Error("The campus guide returned an unexpected response.");
      setFaqs(data
        .filter((item) => item && typeof item.id === "string" && typeof item.question === "string")
        .map((item) => ({ id: item.id, question: item.question, module: item.module || null })));
    } catch (error) {
      setFaqError(error instanceof Error ? error.message : "Campus answers could not be loaded.");
    } finally {
      setFaqLoading(false);
    }
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
      setSuggestionToast("Thank you. Your suggestion has been submitted.");
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

  if (currentView === "welcome") {
    return <CampusWelcomePage onStartChat={startChat} />;
  }

  return (
    <div className="ca-chat-app relative flex h-screen w-full overflow-hidden bg-slate-900">
      {/* Backdrop overlay — mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`ca-chat-sidebar ${isSidebarOpen ? "is-open" : ""} ${isDesktopCollapsed ? "ca-sidebar-collapsed" : ""}`}>
        <div className="ca-sidebar-header">
          <div className="ca-sidebar-topline">
            <div className="ca-sidebar-title">
              <span className="ca-sidebar-title-icon"><BookOpen size={19} /></span>
              <span><small>STUDENT QUICK FIND</small><b>Campus answers</b></span>
              <span className="ca-faq-total">{faqLoading ? "…" : faqError ? "—" : faqs.length}</span>
            </div>
            <div className="ca-sidebar-controls">
              <button type="button" className="ca-sidebar-control ca-desktop-collapse" onClick={() => setIsDesktopCollapsed(true)} aria-label="Collapse FAQ sidebar" title="Collapse sidebar"><ChevronDown size={17} /></button>
              <button type="button" className="ca-sidebar-control ca-mobile-close" onClick={() => setIsSidebarOpen(false)} aria-label="Close FAQ menu"><X size={18} /></button>
            </div>
          </div>
          <div className="ca-sidebar-search-wrap">
            <Search size={18} aria-hidden="true" />
            <input type="search" aria-label="Search campus FAQs" placeholder="Search trusted answers" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} data-testid="input-search-campus-faqs" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear FAQ search" data-testid="button-clear-faq-search"><X size={15} /></button>}
            <kbd>/</kbd>
          </div>
          <div className="ca-sidebar-result-line">
            <span>{faqLoading ? "Finding answers…" : faqError ? "Source unavailable" : <><b>{filteredFaqs.length}</b> {filteredFaqs.length === 1 ? "answer" : "answers"}{searchQuery || selectedCategory !== "all" ? " found" : " to explore"}</>}</span>
            {(searchQuery || selectedCategory !== "all") && <button type="button" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>Reset</button>}
          </div>
        </div>

        <div className="ca-sidebar-content">
          {!isDesktopCollapsed && <>
            {!searchQuery && <nav className="ca-faq-categories" aria-label="FAQ categories">
              <button type="button" className={selectedCategory === "all" ? "is-active" : ""} onClick={() => setSelectedCategory("all")}><span>All topics</span><b>{faqs.length}</b></button>
              {faqCategories.map((category) => {
                const label = category.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
                const count = faqs.filter((item) => (item.module || "general") === category).length;
                return <button type="button" key={category} className={selectedCategory === category ? "is-active" : ""} onClick={() => setSelectedCategory(category)}><span>{label}</span><b>{count}</b></button>;
              })}
            </nav>}
            <div className="ca-sidebar-list" aria-live="polite">
              {faqLoading ? <div className="ca-faq-state"><span className="ca-faq-skeleton" /><span className="ca-faq-skeleton" /><span className="ca-faq-skeleton" /><p>Loading approved campus answers…</p></div> :
                faqError ? <div className="ca-faq-state ca-faq-state--error"><CircleHelp size={23} /><b>Answers aren’t available</b><p>{faqError}</p><button type="button" onClick={() => void retryFaqLoad()}>Try again</button></div> :
                filteredFaqs.length === 0 ? <div className="ca-faq-state"><CircleHelp size={23} /><b>{faqs.length ? "No answers found" : "No answers published yet"}</b><p>{faqs.length ? "Try a different phrase or topic." : "Approved campus guidance will show here."}</p>{faqs.length > 0 && <button type="button" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>Clear filters</button>}</div> :
                <div className="ca-faq-results">{filteredFaqs.map((item) => <button key={item.id} type="button" onClick={() => { void handleSend(item.question); setIsSidebarOpen(false); }} disabled={isLoading} data-testid={`button-faq-${item.id}`}><span className="ca-faq-item-category">{(item.module || "general").replace(/[_-]+/g, " ")}</span><span className="ca-faq-question">{item.question}</span><ChevronRight size={16} /></button>)}</div>}
            </div>
          </>}
        </div>
        {!isDesktopCollapsed && <div className="ca-sidebar-bottom">
          <div className="ca-sidebar-note"><span><img src="/tan-kah-kee-portrait.webp" alt="" /></span><p><b>Checked by campus staff</b><small>Answers are maintained by XMUM.</small></p></div>
          <button id="sidebar-suggest-btn" onClick={() => openSuggestionForm("", "manual")} type="button"><MessageSquarePlus size={17} /> Suggest a question</button>
        </div>}
      </aside>
      {isDesktopCollapsed && <button type="button" className="ca-sidebar-expand" onClick={() => setIsDesktopCollapsed(false)} aria-label="Expand FAQ sidebar" title="Open campus answers"><Menu size={20} /></button>}

      {/* Main chat container */}
      <main className="ca-chat-main flex h-full flex-1 items-center justify-center overflow-hidden p-4 lg:p-6">
        <div className="chat-shell flex h-full w-full max-w-4xl flex-col overflow-hidden">
          {/* Header */}
          <header className="chat-header">
            <div className="chat-header-brand flex items-center gap-2">
              {/* Hamburger */}
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(true);
                    setIsDesktopCollapsed(false);
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
                <img src="/tan-kah-kee-portrait.webp" alt="Illustrated portrait of Tan Kah Kee" className="w-full h-full object-cover" />
              </div>

              <div>
                <p className="brand-name">Captain Kah Kee</p>
                <p className="brand-sub">XMUM Campus Assistant</p>
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

              <button
                onClick={() => setCurrentView("welcome")}
                className="pill-btn ca-home-link"
                type="button"
                data-testid="button-return-home"
              >
                <span aria-hidden="true">←</span> Home
              </button>
              <button
                onClick={startNewConversation}
                className="pill-btn ca-new-question"
                type="button"
                aria-label="Start a new question"
                data-testid="button-new-question"
              >
                <span aria-hidden="true">＋</span> <span className="ca-new-question-label">New</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowDebug((prev) => !prev)}
                  className={`pill-btn ${showDebug ? "pill-btn--active" : ""}`}
                  title="Admin-only debug toggle"
                  type="button"
                >
                  <Wrench size={14} aria-hidden="true" />
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
            {messages.length === 0 && !isLoading && (
              <div className="ca-empty-chat">
                <span className="ca-guide-seal" aria-hidden="true">✳</span>
                <span className="ca-empty-eyebrow">A NOTE FROM YOUR GUIDE</span>
                <h2>Hi, I’m Captain Kah Kee.</h2>
                <p>Ask me about studying, getting around, or settling in. We can start with one small thing.</p>
                <div className="ca-empty-prompts">
                  {(suggestions.length > 0 ? suggestions.slice(0, 3) : FALLBACK_SUGGESTIONS.slice(0, 3)).map((prompt, index) => (
                    <button
                      key={`${prompt}-${index}`}
                      onClick={() => void handleSend(prompt)}
                      type="button"
                      data-testid={`button-empty-prompt-${index + 1}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`msg-row msg-row--${msg.role}`}>
                <div
                  className={`msg-avatar ${msg.role === "user" ? "msg-avatar--user" : ""
                    }`}
                >
                  {msg.role === "user" ? (
                    "U"
                  ) : (
                    <img src="/tan-kah-kee-portrait.webp" alt="" className="w-full h-full object-cover rounded-full" />
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
                        <p className="debug-title"><Wrench size={13} aria-hidden="true" /> Debug Info</p>

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
                        <MessageSquarePlus size={14} aria-hidden="true" />
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
                  <img src="/tan-kah-kee-portrait.webp" alt="" className="w-full h-full object-cover rounded-full" />
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
                aria-label="Ask Captain Kah Kee a question"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
                placeholder="Ask Captain Kah Kee a campus question…"
              autoComplete="off"
                data-testid="input-chat-message"
            />

            <button
              id="sendBtn"
              onClick={() => void handleSend()}
              disabled={!inputVal.trim() || isLoading}
              aria-label="Send message"
              type="button"
              data-testid="button-send-message"
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
        <div className="ca-modal-overlay fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
          <section
            className="ca-modal ca-suggest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggestion-modal-title"
          >
            <header className="ca-suggest-modal__header">
              <div className="ca-suggest-modal__identity">
                <span className="ca-suggest-modal__icon">
                  <MessageSquarePlus size={21} aria-hidden="true" />
                </span>
                <div>
                  <p className="ca-suggest-modal__eyebrow">XMUM CAMPUS ASSISTANT</p>
                  <h3 id="suggestion-modal-title" className="ca-suggest-modal__title">Suggest a question</h3>
                </div>
              </div>
              <button
                onClick={closeSuggestionForm}
                className="ca-suggest-modal__close"
                aria-label="Close suggestion form"
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <p className="ca-suggest-modal__description">
              Help us improve the chatbot by submitting a question we should know the answer to.
            </p>

            <div className="ca-suggest-modal__fields">
              <div>
                <div className="ca-suggest-modal__label-row">
                  <label className="ca-suggest-modal__label" htmlFor="suggestion-question-input">
                    Your question <span className="ca-suggest-modal__required">*</span>
                  </label>
                  <span className="ca-suggest-modal__optional">Required</span>
                </div>
                <input
                  id="suggestion-question-input"
                  type="text"
                  value={suggestionQuestion}
                  onChange={(e) => setSuggestionQuestion(e.target.value)}
                  placeholder="e.g. What time does the library close on weekends?"
                  className="ca-suggest-modal__input"
                  aria-describedby="suggestion-question-help"
                  required
                />
                <p id="suggestion-question-help" className="ca-suggest-modal__hint">
                  Questions already in this chat are filled in for you.
                </p>
              </div>

              <div>
                <div className="ca-suggest-modal__label-row">
                  <label className="ca-suggest-modal__label" htmlFor="suggestion-answer-input">
                    Suggested answer
                  </label>
                  <span className="ca-suggest-modal__optional">Optional</span>
                </div>
                <textarea
                  id="suggestion-answer-input"
                  value={suggestionAnswer}
                  onChange={(e) => setSuggestionAnswer(e.target.value)}
                  placeholder="Share an answer if you know it."
                  rows={4}
                  className="ca-suggest-modal__textarea"
                  aria-describedby="suggestion-answer-help"
                />
                <p id="suggestion-answer-help" className="ca-suggest-modal__hint">
                  Only share an answer if you know it.
                </p>
              </div>
            </div>

            <footer className="ca-suggest-modal__footer">
              <button
                onClick={closeSuggestionForm}
                className="ca-suggest-modal__action ca-suggest-modal__cancel"
                type="button"
              >
                Cancel
              </button>
              <button
                id="submit-suggestion-btn"
                onClick={() => void handleSubmitSuggestion()}
                disabled={!suggestionQuestion.trim() || suggestionSubmitting}
                className="ca-suggest-modal__action ca-suggest-modal__submit"
                aria-busy={suggestionSubmitting}
                type="button"
              >
                {suggestionSubmitting ? "Submitting…" : "Submit suggestion"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Toast notification */}
      {suggestionToast && (
        <div className="ca-toast fixed bottom-6 right-6 z-[1000] px-5 py-3 rounded-xl text-sm font-semibold bg-indigo-700 text-white shadow-xl">
          {suggestionToast}
        </div>
      )}
    </div>
  );
}
