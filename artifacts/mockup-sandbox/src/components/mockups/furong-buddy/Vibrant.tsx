import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Bus,
  ChevronDown,
  Compass,
  MapPin,
  Menu,
  Plus,
  Send,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import "./_group.css";

type ChatMessage = { id: number; role: "buddy" | "student"; text: string; time: string };

const starterQuestions = [
  { icon: Bus, label: "Campus bus times" },
  { icon: MapPin, label: "Find Furong Tunnel" },
  { icon: Sun, label: "Best lunch nearby" },
  { icon: Compass, label: "Freshman checklist" },
];

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "buddy",
    time: "10:41 AM",
    text: "Hey, welcome to XMUM! I’m Xiao Jia, your campus buddy. I can help you find your way, settle in, or track down a really good lunch. What’s on your mind?",
  },
  {
    id: 2,
    role: "student",
    time: "10:42 AM",
    text: "I have a lecture at Xiang'an tomorrow morning. How do I get there from Siming?",
  },
  {
    id: 3,
    role: "buddy",
    time: "10:42 AM",
    text: "Good question—let’s get you there without the morning scramble. The campuses are in different parts of Xiamen, so plan a little extra travel time.",
  },
];

function answerFor(question: string) {
  const q = question.toLowerCase();
  if (q.includes("bus") || q.includes("xiang") || q.includes("transport")) {
    return "For Siming → Xiang’an, check the latest inter-campus shuttle notice in the XMUM student portal before you leave—departure times can change by day. The ride is usually around 60–90 minutes depending on traffic. Aim to catch a bus at least 2 hours before class, and keep your student ID handy. Want me to help with a morning checklist too?";
  }
  if (q.includes("tunnel") || q.includes("photo") || q.includes("furong")) {
    return "Furong Tunnel is the mural-lined passage beside Furong Lake, and it’s a campus classic. Go in the late afternoon for softer light, then loop back past the lake for a quieter photo spot. Keep moving through the tunnel and be mindful of cyclists.";
  }
  if (q.includes("lunch") || q.includes("food") || q.includes("eat")) {
    return "For an easy lunch, start with the campus canteen: it’s wallet-friendly and has a good mix of local Fujian dishes and familiar staples. If you’re exploring, Zhongshan Road has more options, but allow time for the trip. Bring your campus card for canteen payments.";
  }
  if (q.includes("freshman") || q.includes("checklist") || q.includes("new")) {
    return "Freshman starter pack: activate your student account, save the campus map, set up Wi‑Fi, learn your shuttle route, and keep your student ID with you. For anything time-sensitive, double-check the latest notice from your school or the student portal.";
  }
  return "I’m on it! I can help with campus directions, shuttle planning, food, study spots, and getting settled. For official deadlines or schedule changes, always check the latest XMUM notice too. What would you like to figure out first?";
}

export default function Vibrant() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const sendMessage = (value: string) => {
    const text = value.trim();
    if (!text || typing) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((current) => [...current, { id: Date.now(), role: "student", text, time: now }]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "buddy", text: answerFor(text), time: now },
      ]);
      setTyping(false);
    }, 850);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const resetChat = () => {
    setMessages(initialMessages);
    setMenuOpen(false);
  };

  return (
    <main className="fb-page">
      <div className="fb-topline">
        <div className="fb-brand">
          <div className="fb-brand-mark"><Compass size={18} strokeWidth={2.3} /></div>
          <span>XMUM <b>·</b> CAMPUS LIFE</span>
        </div>
        <div className="fb-campus-tag"><span /> SIMING CAMPUS <span className="fb-tag-sep">/</span> XIAMEN, CHINA</div>
        <button className="fb-help-link" type="button" onClick={() => sendMessage("What can you help me with?")}>How can I help? <ArrowUpRight size={14} /></button>
      </div>

      <div className="fb-layout">
        <aside className="fb-rail">
          <div className="fb-rail-copy">
            <span className="fb-eyebrow"><span className="fb-eyebrow-star">✳</span> YOUR CAMPUS, UNLOCKED</span>
            <h1>A little<br />help goes<br /><em>a long way.</em></h1>
            <p>New here, or just figuring out today? Your friendly campus senior is always around.</p>
            <div className="fb-rail-rule" />
            <div className="fb-rail-quote">
              <span className="fb-quote-mark">“</span>
              <p>Best advice I got as a freshman: ask early, explore often.</p>
              <small>— A senior who’s been there</small>
            </div>
          </div>
          <div className="fb-rail-foot">
            <span className="fb-sun-stamp"><Sparkles size={16} /></span>
            <span>Made for the<br /><b>XMUM community</b></span>
            <span className="fb-foot-index">01—04</span>
          </div>
        </aside>

        <section className="fb-chat-card" aria-label="Chat with Furong Buddy">
          <header className="fb-chat-head">
            <button className="fb-mobile-menu" type="button" aria-label="Open menu" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div className="fb-mascot-wrap">
              <img src="/__mockup/images/xmum-mascot.jpg" alt="Xiao Jia, your XMUM campus guide" />
              <span className="fb-online-dot" />
            </div>
            <div className="fb-head-name">
              <div className="fb-name-line"><strong>Furong Buddy</strong><span className="fb-captain-tag">YOUR DIGITAL SENIOR</span></div>
              <span className="fb-presence"><i /> Xiao Jia is here · Usually replies instantly</span>
            </div>
            <button className="fb-head-more" type="button" onClick={resetChat} aria-label="Start a fresh chat" title="Start a fresh chat">
              <Plus size={19} />
            </button>
          </header>

          {menuOpen && (
            <div className="fb-mobile-popover">
              <strong>Quick campus help</strong>
              <p>Ask Xiao Jia about your day at XMUM.</p>
              <button type="button" onClick={resetChat}>Start a fresh chat <ArrowUpRight size={15} /></button>
            </div>
          )}

          <div className="fb-chat-intro">
            <span className="fb-today"><span /> TODAY, 10:41 AM <span className="fb-intro-line" /></span>
            <p>Good morning, student.<br /><b>Where are we headed?</b></p>
            <span className="fb-intro-scribble">let’s find out <ArrowDown size={13} /></span>
          </div>

          <div className="fb-messages">
            {messages.map((message) => (
              <article key={message.id} className={`fb-message fb-message-${message.role}`}>
                {message.role === "buddy" && (
                  <div className="fb-tiny-avatar"><img src="/__mockup/images/xmum-mascot.jpg" alt="" /></div>
                )}
                <div className="fb-message-content">
                  {message.role === "buddy" && <span className="fb-sender">XIAO JIA <span>·</span> CAMPUS BUDDY</span>}
                  <div className="fb-bubble">{message.text}</div>
                  <span className="fb-message-time">{message.time}</span>
                </div>
                {message.role === "student" && <div className="fb-student-avatar">S</div>}
              </article>
            ))}
            {typing && (
              <article className="fb-message fb-message-buddy">
                <div className="fb-tiny-avatar"><img src="/__mockup/images/xmum-mascot.jpg" alt="" /></div>
                <div className="fb-message-content"><span className="fb-sender">XIAO JIA <span>·</span> CAMPUS BUDDY</span><div className="fb-bubble fb-typing"><i /><i /><i /></div></div>
              </article>
            )}
            {!typing && messages.length === initialMessages.length && (
              <div className="fb-answer-card">
                <div className="fb-answer-icon"><Bus size={17} /></div>
                <div className="fb-answer-copy">
                  <div className="fb-answer-top"><b>SIMING → XIANG’AN</b><span className="fb-answer-live"><i /> CAMPUS TIP</span></div>
                  <strong>Give yourself a little runway.</strong>
                  <p>Plan for 60–90 minutes on the road. Check the student portal for the latest shuttle notice before you set off.</p>
                  <button type="button" onClick={() => sendMessage("Can you help me plan for my morning shuttle?")}>Help me plan my trip <ArrowUpRight size={14} /></button>
                </div>
                <span className="fb-card-spark">✳</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="fb-suggestions">
            <div className="fb-suggest-label"><span>✳</span> NEED A STARTING POINT?</div>
            <div className="fb-chip-row">
              {starterQuestions.map(({ icon: Icon, label }) => (
                <button type="button" className="fb-chip" key={label} onClick={() => sendMessage(label)} disabled={typing}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <form className="fb-composer" onSubmit={submit}>
            <button className="fb-add-button" type="button" aria-label="Start a fresh chat" onClick={resetChat}><Plus size={19} /></button>
            <input aria-label="Message Xiao Jia" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Xiao Jia anything about campus..." />
            <button className="fb-send-button" type="submit" aria-label="Send message" disabled={!input.trim() || typing}><Send size={17} /></button>
          </form>
          <div className="fb-composer-foot"><span>PRESS <b>ENTER</b> TO SEND</span><span>HERE FOR THE BIG THINGS &amp; THE LITTLE THINGS <span className="fb-heart">✳</span></span></div>
        </section>
      </div>

      <footer className="fb-page-footer">
        <span>XIAMEN UNIVERSITY MALAYSIA <b>·</b> STUDENT LIFE, A LITTLE EASIER</span>
        <button type="button" onClick={() => { navigator.clipboard?.writeText("Furong Buddy · XMUM Campus Life"); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>
          {copied ? "COPIED" : "A FRIENDLY GUIDE, NOT AN OFFICIAL NOTICE"} <ChevronDown size={13} />
        </button>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        .fb-page{--red:#D7432F;--blue:#104E8B;--ivory:#FDFBF7;--white:#FFFFFF;--gold:#F5A623;--ink:#1F2937;--muted:#7B7F80;min-height:100dvh;background:var(--ivory);color:var(--ink);font-family:'DM Sans',sans-serif;padding:0 clamp(18px,5.6vw,88px);position:relative;overflow:hidden}
        .fb-page:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.17;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.13'/%3E%3C/svg%3E")}
        .fb-topline{height:67px;border-bottom:1px solid #e8e3dc;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
        .fb-brand{display:flex;align-items:center;gap:10px;color:var(--blue);font:500 10px 'DM Mono',monospace;letter-spacing:.1em}.fb-brand b{color:var(--red);margin:0 2px}
        .fb-brand-mark{width:30px;height:30px;background:var(--blue);color:white;border-radius:50%;display:grid;place-items:center}
        .fb-campus-tag,.fb-help-link{font:10px 'DM Mono',monospace;letter-spacing:.08em;color:#777}.fb-campus-tag{display:flex;align-items:center;gap:8px}.fb-campus-tag>span:first-child{width:6px;height:6px;border-radius:50%;background:#51a377}.fb-tag-sep{color:#c7bfb3}
        .fb-help-link{border:0;background:none;display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--blue)}
        .fb-layout{max-width:1200px;margin:41px auto 32px;display:grid;grid-template-columns:minmax(260px,.72fr) minmax(460px,1.28fr);gap:clamp(36px,7.2vw,112px);align-items:center;position:relative;z-index:1}
        .fb-rail{min-height:610px;display:flex;flex-direction:column;justify-content:space-between;padding:25px 0 14px}
        .fb-eyebrow{font:10px 'DM Mono',monospace;letter-spacing:.13em;color:var(--blue);display:flex;align-items:center;gap:8px}
        .fb-eyebrow-star{font:18px sans-serif;color:var(--red)}
        .fb-rail h1{font-size:clamp(46px,5vw,68px);line-height:.99;letter-spacing:-.06em;margin:29px 0 20px;font-weight:600}
        .fb-rail h1 em{font-family:'Fraunces',serif;font-weight:500;color:var(--red);letter-spacing:-.05em}
        .fb-rail-copy>p{max-width:310px;color:#717575;font-size:14px;line-height:1.8}
        .fb-rail-rule{height:1px;background:#e8e3dc;max-width:320px;margin:40px 0 24px}
        .fb-rail-quote{max-width:295px;position:relative;padding-left:22px}.fb-quote-mark{position:absolute;left:0;top:-8px;color:var(--gold);font:35px 'Fraunces',serif}.fb-rail-quote p{font:17px/1.45 'Fraunces',serif;color:#53595c;margin:0 0 10px}.fb-rail-quote small{font:9px 'DM Mono',monospace;color:#8e8b84;letter-spacing:.04em}
        .fb-rail-foot{display:flex;align-items:center;gap:11px;color:#83817a;font-size:10px;line-height:1.45}.fb-rail-foot b{color:var(--ink);font-weight:600}.fb-sun-stamp{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:#f9edcf;color:#d59a28}.fb-foot-index{margin-left:auto;font:10px 'DM Mono',monospace;color:#aaa49b}
        .fb-chat-card{width:100%;height:min(690px,calc(100dvh - 132px));min-height:570px;background:var(--white);border:1px solid #e9e4dc;border-radius:18px;box-shadow:0 20px 55px #38495a12,0 2px 9px #38495a08;display:flex;flex-direction:column;position:relative;overflow:hidden}
        .fb-chat-head{height:72px;flex-shrink:0;border-bottom:1px solid #f0ede8;padding:0 22px;display:flex;align-items:center;gap:12px}
        .fb-mascot-wrap{width:42px;height:42px;border-radius:14px;background:#edf4f8;overflow:hidden;position:relative;flex-shrink:0}.fb-mascot-wrap img{width:100%;height:100%;object-fit:cover;object-position:50% 27%}.fb-online-dot{position:absolute;width:11px;height:11px;border-radius:50%;background:#61b27d;border:2px solid white;right:1px;bottom:1px}
        .fb-head-name{min-width:0;flex:1}.fb-name-line{display:flex;align-items:center;gap:10px}.fb-name-line strong{font-size:14px;letter-spacing:-.02em}.fb-captain-tag{font:8px 'DM Mono',monospace;letter-spacing:.07em;color:#9a8660;background:#f8f1e2;padding:4px 6px;border-radius:4px}.fb-presence{display:flex;align-items:center;gap:6px;color:#93918d;font-size:10px;margin-top:5px}.fb-presence i,.fb-answer-live i{width:5px;height:5px;border-radius:50%;background:#65af7d}
        .fb-head-more,.fb-mobile-menu{width:34px;height:34px;background:transparent;color:#68737a;border:1px solid #eae7e1;border-radius:10px;display:grid;place-items:center;cursor:pointer}.fb-head-more:hover,.fb-mobile-menu:hover{color:var(--blue);background:#f5f8fa}.fb-mobile-menu{display:none}
        .fb-mobile-popover{position:absolute;z-index:3;top:66px;left:12px;right:12px;border:1px solid #e7e2d9;background:white;border-radius:12px;padding:16px;box-shadow:0 10px 30px #2533421c}.fb-mobile-popover strong{font-size:13px}.fb-mobile-popover p{font-size:12px;color:#777;margin:6px 0 13px}.fb-mobile-popover button{display:flex;gap:7px;align-items:center;color:var(--blue);font-size:12px;background:none;border:0;cursor:pointer}
        .fb-chat-intro{padding:23px 25px 16px;border-bottom:1px solid #f3f0eb;position:relative}.fb-today{font:9px 'DM Mono',monospace;color:#aaa59c;letter-spacing:.09em;display:flex;align-items:center;gap:8px}.fb-today>span:first-child{width:6px;height:6px;border-radius:50%;background:var(--gold)}.fb-intro-line{height:1px;background:#f0ede7;flex:1;margin-left:6px}
        .fb-chat-intro p{font-size:19px;line-height:1.35;letter-spacing:-.04em;margin:13px 0 0}.fb-chat-intro p b{font-weight:600;color:var(--blue)}.fb-intro-scribble{position:absolute;right:27px;bottom:20px;font:italic 11px 'Fraunces',serif;color:#bf8b2f;display:flex;align-items:center;gap:4px}
        .fb-messages{padding:17px 22px 10px;flex:1;overflow-y:auto;min-height:0;display:flex;flex-direction:column;gap:15px;scrollbar-width:thin;scrollbar-color:#e5e0d8 transparent}
        .fb-message{display:flex;align-items:flex-end;gap:9px;animation:fbAppear .28s ease both}.fb-message-student{justify-content:flex-end}@keyframes fbAppear{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        .fb-tiny-avatar{width:27px;height:27px;border-radius:9px;overflow:hidden;background:#edf4f8;flex:0 0 27px;border:1px solid #e6edf1}.fb-tiny-avatar img{width:100%;height:100%;object-fit:cover;object-position:50% 27%}
        .fb-message-content{max-width:min(84%,460px);display:flex;flex-direction:column;align-items:flex-start}.fb-message-student .fb-message-content{align-items:flex-end}.fb-sender{font:8px 'DM Mono',monospace;color:#8c9291;letter-spacing:.09em;margin:0 0 5px 3px}.fb-sender span{color:var(--gold);padding:0 3px}
        .fb-bubble{background:#f5f4f0;border-radius:3px 13px 13px 13px;padding:10px 13px;font-size:12px;line-height:1.65;color:#4c5558}.fb-message-student .fb-bubble{background:var(--blue);color:white;border-radius:13px 3px 13px 13px}.fb-message-time{font:8px 'DM Mono',monospace;color:#aaa49c;margin:5px 4px 0}
        .fb-student-avatar{width:26px;height:26px;border-radius:50%;background:#f9e9e4;color:var(--red);display:grid;place-items:center;font-size:10px;font-weight:700;flex:0 0 26px}
        .fb-answer-card{margin:0 0 0 36px;max-width:calc(100% - 37px);border:1px solid #eee6d7;background:#fffcf5;border-radius:10px;padding:13px 14px;display:flex;align-items:flex-start;gap:11px;position:relative;overflow:hidden;animation:fbAppear .35s .08s ease both}
        .fb-answer-icon{width:32px;height:32px;border-radius:10px;background:#f8edce;color:#c38a1f;display:grid;place-items:center;flex-shrink:0}
        .fb-answer-copy{flex:1;min-width:0}.fb-answer-top{display:flex;align-items:center;gap:10px;margin:1px 0 7px}.fb-answer-top>b{font:8px 'DM Mono',monospace;color:#85806f;letter-spacing:.08em}.fb-answer-live{font:7px 'DM Mono',monospace;color:#7a997e;display:flex;align-items:center;gap:4px}
        .fb-answer-copy>strong{font-size:12px;color:#343c3c}.fb-answer-copy p{font-size:10px;line-height:1.55;color:#77766f;margin:5px 16px 8px 0}.fb-answer-copy button{border:0;background:none;padding:0;color:var(--blue);display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;cursor:pointer}.fb-answer-copy button:hover{text-decoration:underline}.fb-card-spark{position:absolute;right:12px;top:9px;color:#e4b854;font-size:14px}
        .fb-typing{display:flex;gap:4px;padding:12px 14px}.fb-typing i{height:5px;width:5px;background:#9eafb8;border-radius:50%;animation:fbDot 1s infinite alternate}.fb-typing i:nth-child(2){animation-delay:.2s}.fb-typing i:nth-child(3){animation-delay:.4s}@keyframes fbDot{to{opacity:.35;transform:translateY(-3px)}}
        .fb-suggestions{padding:12px 22px 11px;border-top:1px solid #f2efe9;flex-shrink:0}.fb-suggest-label{font:8px 'DM Mono',monospace;color:#aaa49c;letter-spacing:.09em;margin-bottom:8px}.fb-suggest-label span{color:var(--red);font-size:11px;margin-right:4px}.fb-chip-row{display:flex;gap:7px;flex-wrap:wrap}
        .fb-chip{border:1px solid #eae6df;border-radius:7px;background:white;color:#586269;padding:7px 9px;font:10px 'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;cursor:pointer;transition:transform .18s,background .18s,color .18s,border-color .18s}.fb-chip svg{color:var(--blue)}.fb-chip:hover:not(:disabled){transform:translateY(-2px);border-color:#b9ccdc;background:#f4f8fb;color:var(--blue)}.fb-chip:disabled{opacity:.5;cursor:wait}
        .fb-composer{height:54px;margin:0 16px;border:1px solid #e8e4dd;border-radius:11px;background:#fbfaf8;display:flex;align-items:center;padding:5px 6px 5px 9px;gap:9px;flex-shrink:0}.fb-add-button{border:0;background:transparent;color:#9c9a95;width:28px;height:30px;display:grid;place-items:center;cursor:pointer}.fb-add-button:hover{color:var(--blue)}.fb-composer input{font:12px 'DM Sans',sans-serif;min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink)}.fb-composer input::placeholder{color:#aaa8a2}.fb-send-button{width:36px;height:36px;border:0;border-radius:8px;background:var(--red);color:white;display:grid;place-items:center;cursor:pointer;transition:transform .18s,background .18s}.fb-send-button:hover:not(:disabled){background:#bd3828;transform:translateY(-1px)}.fb-send-button:disabled{opacity:.38;cursor:not-allowed}
        .fb-composer-foot{display:flex;justify-content:space-between;padding:8px 21px 12px;color:#b3aea5;font:7px 'DM Mono',monospace;letter-spacing:.08em}.fb-composer-foot b{color:#8a877f;font-weight:500}.fb-heart{color:var(--red);font-size:10px;margin-left:4px}
        .fb-page-footer{max-width:1200px;margin:0 auto;border-top:1px solid #e8e3dc;height:47px;display:flex;justify-content:space-between;align-items:center;color:#aaa49b;font:8px 'DM Mono',monospace;letter-spacing:.08em;position:relative;z-index:1}.fb-page-footer>span b{color:var(--red);padding:0 4px}.fb-page-footer button{border:0;background:none;color:#88867f;font:inherit;letter-spacing:inherit;display:flex;align-items:center;gap:6px;cursor:pointer}.fb-page-footer button:hover{color:var(--blue)}
        @media(min-width:1500px){.fb-layout{margin-top:56px}.fb-chat-card{height:min(730px,calc(100dvh - 150px))}.fb-rail{min-height:650px}}
        @media(max-width:900px){.fb-page{padding:0 28px}.fb-layout{grid-template-columns:minmax(220px,.65fr) minmax(440px,1.35fr);gap:35px}.fb-rail h1{font-size:52px}.fb-chat-card{height:calc(100dvh - 130px)}.fb-rail{min-height:580px}}
        @media(max-width:680px){.fb-page{padding:0 14px}.fb-topline{height:54px}.fb-campus-tag{font-size:8px}.fb-help-link{font-size:0;gap:0}.fb-help-link svg{width:17px;height:17px}.fb-layout{display:block;margin:14px auto 15px;max-width:510px}.fb-rail{display:none}.fb-chat-card{height:calc(100dvh - 128px);min-height:470px;border-radius:14px}.fb-chat-head{height:62px;padding:0 12px;gap:9px}.fb-mobile-menu{display:grid;width:31px;height:31px}.fb-mascot-wrap{height:37px;width:37px;border-radius:12px}.fb-name-line{gap:6px}.fb-name-line strong{font-size:13px}.fb-captain-tag{font-size:7px;padding:3px 5px}.fb-presence{font-size:9px}.fb-head-more{width:31px;height:31px}.fb-chat-intro{padding:17px 16px 13px}.fb-chat-intro p{font-size:17px;margin-top:10px}.fb-intro-scribble{right:16px;bottom:15px;font-size:10px}.fb-messages{padding:14px 13px 8px;gap:13px}.fb-message-content{max-width:84%}.fb-bubble{font-size:11px;padding:9px 11px}.fb-answer-card{margin-left:35px;padding:11px;gap:9px}.fb-answer-copy p{font-size:9px}.fb-suggestions{padding:10px 13px 9px}.fb-chip-row{gap:6px}.fb-chip{font-size:9px;padding:7px 8px}.fb-chip svg{width:12px;height:12px}.fb-composer{margin:0 10px;height:49px}.fb-composer input{font-size:11px}.fb-send-button{width:34px;height:34px}.fb-composer-foot{padding:7px 13px 10px;font-size:6px}.fb-page-footer{height:45px;font-size:7px}.fb-page-footer button{font-size:0}.fb-page-footer button svg{width:15px;height:15px}.fb-brand{font-size:9px}}
        @media(max-width:380px){.fb-campus-tag{display:none}.fb-message-content{max-width:82%}.fb-chip{font-size:8px;padding:6px}.fb-chip-row{gap:5px}.fb-suggestions{padding-inline:10px}.fb-composer-foot>span:last-child{letter-spacing:.02em}.fb-answer-top{gap:6px}.fb-answer-top>b{font-size:7px}}
        @media(max-height:680px) and (min-width:681px){.fb-layout{margin-top:18px;margin-bottom:16px}.fb-chat-card{height:calc(100dvh - 105px);min-height:500px}.fb-rail{min-height:500px}.fb-rail h1{font-size:50px;margin:20px 0 14px}.fb-rail-rule{margin:24px 0 17px}}
      `}</style>
    </main>
  );
}
