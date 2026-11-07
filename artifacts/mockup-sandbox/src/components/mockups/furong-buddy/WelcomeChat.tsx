import { useEffect, useState } from "react";
import ChatbotHome from "./Current";
import "./_group.css";
import "./welcome-chat.css";

const topics = [
  { eyebrow: "01 / STUDY", title: "Library hours", detail: "Find a quiet place to focus", prompt: "What are the library opening hours?" },
  { eyebrow: "02 / GET CONNECTED", title: "Campus Wi-Fi", detail: "Get online in a few steps", prompt: "How do I connect to campus WiFi?" },
  { eyebrow: "03 / CAMPUS LIFE", title: "Getting around", detail: "Shuttles, routes and timing", prompt: "Can you tell me about the campus bus schedule?" },
];

export default function WelcomeChat() {
  const [inChat, setInChat] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");

  const enterChat = (topic = "") => {
    setSelectedTopic(topic);
    setInChat(true);
  };

  useEffect(() => {
    if (!inChat || !selectedTopic) return;
    const timer = window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("#inp");
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, selectedTopic);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [inChat, selectedTopic]);

  return (
    <main className="wc-page">
      {!inChat ? (
        <div className="wc-home">
          <header className="wc-nav">
            <div className="wc-brand">
              <span className="wc-brand-mark"><img src="/__mockup/images/xmum-mascot.jpg" alt="" /></span>
              <span>XMUM <b>Campus Assistant</b></span>
            </div>
            <span className="wc-campus-tag"><i /> XIAMEN · XIANG’AN CAMPUS</span>
            <button type="button" className="wc-nav-link" onClick={() => enterChat()}>Ask a question <span>↗</span></button>
          </header>

          <section className="wc-hero">
            <div className="wc-hero-copy">
              <div className="wc-kicker"><span /> HERE FOR YOUR XMUM DAYS</div>
              <h1>Campus life,<br />made a little <em>easier.</em></h1>
              <p className="wc-intro">A friendly place to get answers about studying, getting around and settling into life at XMUM.</p>
              <div className="wc-hero-actions">
                <button type="button" className="wc-start" onClick={() => enterChat()}>
                  Start a chat <span aria-hidden="true">↗</span>
                </button>
                <span className="wc-action-note">Ask anything. Start anywhere.</span>
              </div>
              <div className="wc-proof"><span className="wc-proof-dot" /> CAMPUS KNOW-HOW, JUST A QUESTION AWAY</div>
            </div>
            <aside className="wc-mascot-panel">
              <div className="wc-sun-disc" />
              <span className="wc-stamp">YOUR<br />CAMPUS<br />COMPANION</span>
              <img src="/__mockup/images/xmum-mascot.jpg" alt="XMUM Campus Assistant mascot holding a campus map" />
              <div className="wc-mascot-caption"><span>MEET YOUR GUIDE</span><b>Here to help you find your way.</b></div>
              <span className="wc-panel-index">XMUM · 01</span>
            </aside>
          </section>

          <section className="wc-topics">
            <div className="wc-topics-heading">
              <div><span className="wc-section-label">A GOOD PLACE TO BEGIN</span><h2>What’s on your mind?</h2></div>
              <p>Pick a topic to open a chat,<br />or ask in your own words.</p>
            </div>
            <div className="wc-topic-list">
              {topics.map((topic, index) => (
                <button className={`wc-topic wc-topic-${index + 1}`} type="button" key={topic.title} onClick={() => enterChat(topic.prompt)}>
                  <span className="wc-topic-meta">{topic.eyebrow}<i>↗</i></span>
                  <strong>{topic.title}</strong>
                  <span className="wc-topic-detail">{topic.detail}</span>
                </button>
              ))}
            </div>
          </section>
          <footer className="wc-footer"><span>XMUM CAMPUS ASSISTANT</span><span>MADE FOR THE LITTLE QUESTIONS AND THE BIG FIRSTS.</span><span>XIAMEN, CHINA · <b>✳</b></span></footer>
        </div>
      ) : (
        <section className="wc-chat-screen">
          <div className="wc-chat-topline">
            <button type="button" onClick={() => setInChat(false)} aria-label="Return to home"><span>←</span> Home</button>
            {selectedTopic && <span className="wc-context"><b>Starting with</b> {selectedTopic}</span>}
            <span className="wc-chat-title">XMUM Campus Assistant</span>
          </div>
          <div className="wc-chat-content"><ChatbotHome /></div>
        </section>
      )}
    </main>
  );
}
