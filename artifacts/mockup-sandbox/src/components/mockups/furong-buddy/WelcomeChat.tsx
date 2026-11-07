import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BusFront,
  Compass,
  GraduationCap,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import "./welcome-chat.css";

type Message = {
  id: number;
  role: "student" | "guide";
  text: string;
};

const topics = [
  {
    label: "Study & library",
    prompt: "What are the library opening hours?",
    detail: "Find a study spot or get academic help.",
    icon: BookOpen,
  },
  {
    label: "Getting around",
    prompt: "How do I get around campus?",
    detail: "Shuttles, buildings and nearby places.",
    icon: BusFront,
  },
  {
    label: "Wi-Fi & accounts",
    prompt: "How do I connect to campus Wi-Fi?",
    detail: "Get connected to the essentials.",
    icon: Wifi,
  },
  {
    label: "Starting at XMUM",
    prompt: "What should I know for my first week?",
    detail: "A few useful first steps for campus life.",
    icon: GraduationCap,
  },
];

const welcomePrompts = [
  "Where can I find the library?",
  "When does the campus shuttle run?",
  "How do I connect to Wi-Fi?",
];

function answerFor(question: string) {
  const normalized = question.toLowerCase();
  if (normalized.includes("wifi") || normalized.includes("wi-fi") || normalized.includes("internet")) {
    return "Start with the student network listed in your XMUM account guide. If it still will not connect, the IT help desk can check your login and device settings.";
  }
  if (normalized.includes("library") || normalized.includes("study")) {
    return "The library is a good first stop for quiet study and academic resources. Check the current campus notice for today’s opening hours before you head over.";
  }
  if (normalized.includes("shuttle") || normalized.includes("bus") || normalized.includes("around")) {
    return "The campus shuttle is the easiest way to get between the main student areas. Look for the latest route and timing notice, since schedules can change on weekends and holidays.";
  }
  if (normalized.includes("first week") || normalized.includes("starting") || normalized.includes("new student")) {
    return "For your first week, make sure you know where to find your student ID services, the library, and the shuttle stop. I can help you with any one of those next.";
  }
  return "I can help you find your way around XMUM. Tell me a little more about what you need, or try one of the campus topics on the left.";
}

export default function WelcomeChat() {
  const [view, setView] = useState<"welcome" | "chat">("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);
  const nextMessageId = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const userMessage: Message = {
      id: nextMessageId.current++,
      role: "student",
      text,
    };
    const guideMessage: Message = {
      id: nextMessageId.current++,
      role: "guide",
      text: answerFor(text),
    };
    setMessages((current) => [...current, userMessage, guideMessage]);
    setDraft("");
    setView("chat");
    setMobileTopicsOpen(false);
    window.setTimeout(() => composerRef.current?.focus(), 80);
  };

  const startChat = (prompt?: string) => {
    setView("chat");
    setMobileTopicsOpen(false);
    if (prompt) {
      ask(prompt);
    } else {
      window.setTimeout(() => composerRef.current?.focus(), 100);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setDraft("");
    setMobileTopicsOpen(false);
    window.setTimeout(() => composerRef.current?.focus(), 80);
  };

  const returnToWelcome = () => {
    setView("welcome");
    setMobileTopicsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(draft);
  };

  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      ask(draft);
    }
  };

  if (view === "chat") {
    return (
      <main className="xw-app xw-chat">
        {mobileTopicsOpen && (
          <button
            className="xw-drawer-scrim"
            aria-label="Close campus topics"
            onClick={() => setMobileTopicsOpen(false)}
            type="button"
          />
        )}
        <header className="xw-chat-header">
          <button className="xw-chat-brand" onClick={returnToWelcome} type="button" aria-label="Back to XMUM home">
            <span className="xw-brand-mark"><Compass size={18} strokeWidth={2.2} /></span>
            <span><b>XMUM</b><small>Campus guide</small></span>
          </button>
          <div className="xw-chat-status"><i /> YOUR CAMPUS COMPANION</div>
          <div className="xw-chat-header-actions">
            <button className="xw-home-button" onClick={returnToWelcome} type="button">
              <ArrowLeft size={15} /> <span>Home</span>
            </button>
            <button className="xw-new-button" onClick={startNewConversation} type="button">
              <Plus size={16} /><span>New question</span>
            </button>
          </div>
        </header>

        <div className="xw-chat-layout">
          <aside className={`xw-topic-rail ${mobileTopicsOpen ? "is-open" : ""}`}>
            <div className="xw-rail-title">
              <div>
                <span className="xw-overline">CAMPUS DESK</span>
                <h2>What do you need?</h2>
              </div>
              <button className="xw-rail-close" onClick={() => setMobileTopicsOpen(false)} type="button" aria-label="Close topics">
                <X size={17} />
              </button>
            </div>
            <label className="xw-search">
              <Search size={15} />
              <input
                aria-label="Search campus topics"
                placeholder="Search campus topics"
                onChange={(event) => {
                  const value = event.currentTarget.value.toLowerCase();
                  document.querySelectorAll<HTMLElement>("[data-topic-search]").forEach((item) => {
                    item.hidden = !item.dataset.topicSearch?.includes(value);
                  });
                }}
              />
            </label>
            <div className="xw-rail-section">
              <span className="xw-overline">POPULAR TOPICS</span>
              <div className="xw-topic-nav">
                {topics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.label}
                      className="xw-topic-nav-item"
                      data-topic-search={topic.label.toLowerCase()}
                      onClick={() => ask(topic.prompt)}
                      type="button"
                    >
                      <span className="xw-topic-icon"><Icon size={17} strokeWidth={1.8} /></span>
                      <span>{topic.label}</span>
                      <ArrowUpRight size={14} className="xw-topic-arrow" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="xw-rail-note">
              <span className="xw-note-symbol"><MapPin size={16} /></span>
              <p><b>On campus, in context.</b><br />Answers for the little things that make a day easier.</p>
            </div>
            <button className="xw-back-link" onClick={returnToWelcome} type="button">
              <ArrowLeft size={14} /> Return to welcome
            </button>
          </aside>

          <section className="xw-conversation" aria-label="Chat with XMUM Campus Guide">
            <div className="xw-conversation-top">
              <button className="xw-mobile-menu" onClick={() => setMobileTopicsOpen(true)} type="button" aria-label="Open campus topics">
                <BookOpen size={17} />
              </button>
              <div>
                <span className="xw-overline">ASK XIAO JIA</span>
                <h1>Your campus, a little closer.</h1>
              </div>
              <span className="xw-live-tag"><i /> HERE TO HELP</span>
            </div>

            <div className="xw-message-stream">
              {messages.length === 0 ? (
                <div className="xw-empty-chat">
                  <div className="xw-guide-seal"><Compass size={23} /></div>
                  <span className="xw-overline">A NOTE FROM YOUR GUIDE</span>
                  <h2>Hi, I’m Xiao Jia.</h2>
                  <p>Ask me about studying, getting around, or settling in. We can start with one small thing.</p>
                  <div className="xw-prompt-list">
                    {welcomePrompts.map((prompt) => (
                      <button key={prompt} onClick={() => ask(prompt)} type="button">
                        <span>{prompt}</span><ArrowUpRight size={15} />
                      </button>
                    ))}
                  </div>
                  <span className="xw-prototype-note">A friendly guide to everyday XMUM questions</span>
                </div>
              ) : (
                <div className="xw-messages">
                  {messages.map((message) => (
                    <article className={`xw-message xw-message-${message.role}`} key={message.id}>
                      {message.role === "guide" && <span className="xw-message-avatar"><Compass size={15} /></span>}
                      <div className="xw-message-body">
                        <span className="xw-message-author">{message.role === "student" ? "YOU" : "XIAO JIA"} <i>·</i> {message.role === "student" ? "JUST NOW" : "CAMPUS GUIDE"}</span>
                        <p>{message.text}</p>
                      </div>
                    </article>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="xw-composer-wrap">
              {messages.length > 0 && (
                <div className="xw-followup-row">
                  <span>KEEP GOING</span>
                  {welcomePrompts.slice(0, 2).map((prompt) => (
                    <button key={prompt} onClick={() => ask(prompt)} type="button">{prompt}</button>
                  ))}
                </div>
              )}
              <form className="xw-composer" onSubmit={submit}>
                <input
                  ref={composerRef}
                  aria-label="Ask the campus guide a question"
                  placeholder="Ask a campus question…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={submitOnEnter}
                />
                <button type="submit" disabled={!draft.trim()} aria-label="Send question">
                  <Send size={17} />
                </button>
              </form>
              <p className="xw-composer-foot"><Sparkles size={12} /> Small questions welcome. Big days, too.</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="xw-app xw-welcome">
      <header className="xw-site-header">
        <button className="xw-site-brand" onClick={returnToWelcome} type="button">
          <span className="xw-brand-mark"><Compass size={18} strokeWidth={2.2} /></span>
          <span><b>XMUM</b><small>Campus companion</small></span>
        </button>
        <div className="xw-site-place"><span /> XIAMEN · XIANG’AN CAMPUS</div>
        <button className="xw-header-ask" onClick={() => startChat()} type="button">
          Ask Xiao Jia <ArrowUpRight size={15} />
        </button>
      </header>

      <section className="xw-welcome-hero">
        <div className="xw-hero-copy">
          <div className="xw-eyebrow"><span className="xw-eyebrow-line" /> YOUR DAY AT XMUM, MADE EASIER</div>
          <h1>Campus life,<br />without the <em>guesswork.</em></h1>
          <p className="xw-hero-description">Find the little answers that help your day fall into place—from your first class to your trip back across campus.</p>
          <div className="xw-hero-actions">
            <button className="xw-primary-cta" onClick={() => startChat()} type="button">
              Ask Xiao Jia <ArrowUpRight size={17} />
            </button>
            <button className="xw-secondary-cta" onClick={() => document.getElementById("xw-topic-start")?.scrollIntoView({ behavior: "smooth" })} type="button">
              Browse topics <ArrowRight size={15} />
            </button>
          </div>
          <div className="xw-hero-footnote"><span /> A campus guide for students, by your side.</div>
        </div>

        <div className="xw-campus-scene">
          <img src="/__mockup/images/xmum-welcome-chat-campus.jpg" alt="Illustrated campus plaza at a coastal university in Xiamen" />
          <div className="xw-scene-coordinate"><MapPin size={13} /> XIANG’AN, XIAMEN</div>
          <div className="xw-scene-index">XMUM <span>01</span></div>
          <div className="xw-scene-caption">
            <span className="xw-scene-caption-icon"><Compass size={17} /></span>
            <span><small>YOUR CAMPUS COMPANION</small><b>One good next step at a time.</b></span>
            <ArrowUpRight size={16} />
          </div>
          <span className="xw-scene-edge-note">N 24° 36' · E 118° 04'</span>
        </div>
      </section>

      <section className="xw-topic-start" id="xw-topic-start">
        <div className="xw-section-intro">
          <div>
            <span className="xw-eyebrow"><span className="xw-eyebrow-line" /> START WITH WHAT YOU NEED</span>
            <h2>Where should we begin?</h2>
          </div>
          <p>Pick a starting point.<br />Xiao Jia can take it from there.</p>
        </div>
        <div className="xw-topic-grid">
          {topics.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <button className={`xw-topic-card xw-topic-card-${index + 1}`} key={topic.label} onClick={() => startChat(topic.prompt)} type="button">
                <span className="xw-card-top"><span>0{index + 1} / {index === 0 ? "STUDY" : index === 1 ? "CAMPUS LIFE" : index === 2 ? "GET CONNECTED" : "NEW HERE"}</span><ArrowUpRight size={15} /></span>
                <span className="xw-card-main"><span className="xw-card-icon"><Icon size={19} strokeWidth={1.8} /></span><span><b>{topic.label}</b><small>{topic.detail}</small></span></span>
                <span className="xw-card-link">Ask about this <ArrowRight size={13} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="xw-last-word" id="first-week">
        <div className="xw-last-word-mark"><MessageCircle size={20} /></div>
        <p><span>NO BIG FORM. NO WRONG DOOR.</span><b>Just ask what’s on your mind.</b></p>
        <button onClick={() => startChat()} type="button">Start a conversation <ArrowRight size={15} /></button>
      </section>

      <footer className="xw-footer">
        <span>XMUM CAMPUS COMPANION</span>
        <span>XIAMEN, CHINA <i /> MADE FOR THE LITTLE QUESTIONS</span>
      </footer>
    </main>
  );
}
