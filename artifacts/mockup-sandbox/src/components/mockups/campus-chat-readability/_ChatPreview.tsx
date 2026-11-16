import { ArrowRight, Menu, Plus, Send } from "lucide-react";

type ChatPreviewProps = { readable?: boolean };

const sampleMessages = [
  {
    role: "user",
    text: "Where can I get help with student services?",
  },
  {
    role: "bot",
    text: "The student services team can guide you with enrolment, campus access, and student records. Ask at the main service desk for the latest office location and opening hours.",
  },
  {
    role: "user",
    text: "What should I bring?",
  },
  {
    role: "bot",
    text: "Bring your student ID and any documents related to your question. If you are unsure, contact the service desk before visiting.",
  },
];

export function ChatPreview({ readable = false }: ChatPreviewProps) {
  return (
    <main className={`chat-preview ${readable ? "chat-preview--readable" : ""}`}>
      <section className="chat-shell" aria-label="XMUM Campus Assistant chat preview">
        <header className="chat-header">
          <div className="chat-header-brand">
            <button type="button" className="pill-btn" aria-label="Open campus answers"><Menu size={18} /></button>
            <span className="brand-avatar">
              <img src="/__mockup/images/tan-kah-kee-portrait.webp" alt="" />
            </span>
            <span>
              <p className="brand-name">Captain Kah Kee</p>
              <p className="brand-sub">XMUM Campus Assistant</p>
            </span>
          </div>
          <div className="chat-header-actions">
            <span className="status-chip"><span className="status-dot" /> Online</span>
            <button type="button" className="pill-btn">Home</button>
            <button type="button" className="pill-btn"><Plus size={15} /> New</button>
            <button type="button" className="pill-btn pill-btn--primary">CMS <ArrowRight size={14} /></button>
          </div>
        </header>

        <div className="chip-bar">
          <span className="chip-label">Suggested topics</span>
          <div className="chip-list">
            <button type="button" className="chip">Student services</button>
            <button type="button" className="chip">Campus facilities</button>
            <button type="button" className="chip">Getting around XMUM</button>
          </div>
        </div>

        <div className="messages-pane" aria-label="Sample conversation">
          <div className="msg-row msg-row--user">
            <span className="msg-avatar msg-avatar--user" aria-hidden="true">U</span>
            <p className="bubble bubble--user">{sampleMessages[0].text}</p>
          </div>
          <div className="msg-row msg-row--bot">
            <span className="msg-avatar"><img src="/__mockup/images/tan-kah-kee-portrait.webp" alt="" /></span>
            <p className="bubble">{sampleMessages[1].text}</p>
          </div>
          <div className="msg-row msg-row--user">
            <span className="msg-avatar msg-avatar--user" aria-hidden="true">U</span>
            <p className="bubble bubble--user">{sampleMessages[2].text}</p>
          </div>
          <div className="msg-row msg-row--bot">
            <span className="msg-avatar"><img src="/__mockup/images/tan-kah-kee-portrait.webp" alt="" /></span>
            <p className="bubble">{sampleMessages[3].text}</p>
          </div>
        </div>

        <form className="input-bar" onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Ask Captain Kah Kee a question" placeholder="Ask Captain Kah Kee a campus question…" />
          <button type="submit" aria-label="Send message"><Send size={18} /></button>
        </form>
        <p className="composer-note">Sample conversation for comparing message readability.</p>
      </section>
    </main>
  );
}
