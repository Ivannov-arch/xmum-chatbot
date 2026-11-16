import { Link } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BusFront,
  Compass,
  GraduationCap,
  MapPin,
  MessageCircle,
  Wifi,
} from "lucide-react";

const topics = [
  {
    label: "Study & library",
    prompt: "Library opening hours",
    detail: "Find a study spot or get academic help.",
    icon: BookOpen,
  },
  {
    label: "Getting around",
    prompt: "Bus schedule",
    detail: "Shuttles, buildings and nearby places.",
    icon: BusFront,
  },
  {
    label: "Wi-Fi & accounts",
    prompt: "How to connect to WiFi",
    detail: "Get connected to the essentials.",
    icon: Wifi,
  },
  {
    label: "Starting at XMUM",
    prompt: "Hostel application",
    detail: "A few useful first steps for campus life.",
    icon: GraduationCap,
  },
];

interface CampusWelcomePageProps {
  onStartChat: (question?: string) => void;
}

export default function CampusWelcomePage({ onStartChat }: CampusWelcomePageProps) {
  return (
    <main className="xw-app xw-welcome">
      <header className="xw-site-header">
        <Link className="xw-site-brand" href="/" data-testid="link-home-brand">
          <span className="xw-brand-mark"><Compass size={18} strokeWidth={2.2} /></span>
          <span><b>XMUM</b><small>Campus companion</small></span>
        </Link>
        <div className="xw-site-place"><span /> XIAMEN · XIANG’AN CAMPUS</div>
        <div className="xw-site-actions">
          <button
            className="xw-header-ask"
            onClick={() => onStartChat()}
            type="button"
            data-testid="button-start-chat-header"
          >
            Ask Captain Kah Kee <ArrowUpRight size={15} />
          </button>
          <Link className="xw-cms-link" href="/admin/login" data-testid="link-admin-cms-home">
            CMS <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      <section className="xw-welcome-hero">
        <div className="xw-hero-copy">
          <div className="xw-eyebrow"><span className="xw-eyebrow-line" /> YOUR DAY AT XMUM, MADE EASIER</div>
          <h1>Campus life,<br />without the <em>guesswork.</em></h1>
          <p className="xw-hero-description">
            Find the little answers that help your day fall into place—from your first class to your trip back across campus.
          </p>
          <div className="xw-hero-actions">
            <button
              className="xw-primary-cta"
              onClick={() => onStartChat()}
              type="button"
              data-testid="button-ask-captain"
            >
              Ask Captain Kah Kee <ArrowUpRight size={17} />
            </button>
            <button
              className="xw-secondary-cta"
              onClick={() => document.getElementById("xw-topic-start")?.scrollIntoView({ behavior: "smooth" })}
              type="button"
              data-testid="button-browse-topics"
            >
              Browse topics <ArrowRight size={15} />
            </button>
          </div>
          <div className="xw-hero-footnote"><span /> A campus guide for students, by your side.</div>
        </div>

        <div className="xw-campus-scene">
          <img
            src="/xmum-welcome-chat-campus.jpg"
            alt="Illustrated campus plaza at a coastal university in Xiamen"
            data-testid="img-campus-welcome"
          />
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
          <p>Pick a starting point.<br />Captain Kah Kee can take it from there.</p>
        </div>
        <div className="xw-topic-grid">
          {topics.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <button
                className={`xw-topic-card xw-topic-card-${index + 1}`}
                key={topic.label}
                onClick={() => onStartChat(topic.prompt)}
                type="button"
                data-testid={`card-welcome-topic-${index + 1}`}
              >
                <span className="xw-card-top">
                  <span>0{index + 1} / {index === 0 ? "STUDY" : index === 1 ? "CAMPUS LIFE" : index === 2 ? "GET CONNECTED" : "NEW HERE"}</span>
                  <ArrowUpRight size={15} />
                </span>
                <span className="xw-card-main">
                  <span className="xw-card-icon"><Icon size={19} strokeWidth={1.8} /></span>
                  <span><b>{topic.label}</b><small>{topic.detail}</small></span>
                </span>
                <span className="xw-card-link">Ask about this <ArrowRight size={13} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="xw-last-word">
        <div className="xw-last-word-mark"><MessageCircle size={20} /></div>
        <p><span>NO BIG FORM. NO WRONG DOOR.</span><b>Just ask what’s on your mind.</b></p>
        <button onClick={() => onStartChat()} type="button" data-testid="button-start-conversation">
          Start a conversation <ArrowRight size={15} />
        </button>
      </section>

      <footer className="xw-footer">
        <span>XMUM CAMPUS COMPANION</span>
        <span>XIAMEN, CHINA <i /> MADE FOR THE LITTLE QUESTIONS</span>
      </footer>
    </main>
  );
}
