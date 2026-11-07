import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bus,
  Check,
  Clock3,
  Compass,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Sun,
  Sparkles,
  TrainFront,
} from "lucide-react";

const plans = [
  { time: "08:30", title: "Leave Siming campus", detail: "South gate · shuttle bay", icon: Bus },
  { time: "09:05", title: "Transfer at Xiamen North", detail: "Keep your student ID handy", icon: TrainFront },
  { time: "10:00", title: "Arrive at Xiang’an", detail: "12 min walk to your lecture", icon: MapPin },
];

const starterPrompts = [
  "What should I bring?",
  "Find lunch nearby",
  "Show me the campus map",
];

export default function Dayboard() {
  const [destination, setDestination] = useState<"Xiang’an" | "Siming">("Xiang’an");
  const [checked, setChecked] = useState([true, false, false]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [query, setQuery] = useState("");

  const ask = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setQuestion(clean);
    const lower = clean.toLowerCase();
    if (lower.includes("lunch") || lower.includes("food")) {
      setAnswer("The canteen is your easiest stop: local Fujian dishes, quick service, and student-card payments. Zhongshan Road has more choice if you have time for the trip.");
    } else if (lower.includes("map") || lower.includes("find")) {
      setAnswer("Start at the main gate and follow the covered walk toward the library. I’d save the campus map from your student portal before heading out.");
    } else if (lower.includes("bring") || lower.includes("pack")) {
      setAnswer("Student ID, water, and a light layer are a good start. For the cross-campus shuttle, check today’s student-portal notice before you leave.");
    } else {
      setAnswer("For anything time-sensitive, check the latest XMUM notice first. I can help with routes, campus essentials, food, and finding your bearings.");
    }
    setQuery("");
  };

  const toggleCheck = (index: number) => {
    setChecked((current) => current.map((item, i) => (i === index ? !item : item)));
  };

  return (
    <main className="db-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        .db-page{--paper:#f7f5ef;--card:#fffefa;--ink:#202d35;--muted:#79858a;--line:#e7e4dc;--blue:#174e70;--blue2:#e9f1f3;--coral:#d75c45;--gold:#efbb59;min-height:100dvh;background:var(--paper);color:var(--ink);font-family:'DM Sans',sans-serif;padding:0 clamp(20px,5vw,76px);position:relative;overflow:hidden}
        .db-page:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.14;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E")}
        .db-top{height:70px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
        .db-brand{display:flex;align-items:center;gap:11px;color:var(--blue);font:500 10px 'DM Mono',monospace;letter-spacing:.11em}.db-brand-mark{width:32px;height:32px;border-radius:11px;background:var(--blue);color:#fff;display:grid;place-items:center}.db-location{display:flex;align-items:center;gap:8px;font:9px 'DM Mono',monospace;color:#828681;letter-spacing:.09em}.db-location i{width:7px;height:7px;background:#7bb18d;border-radius:50%}.db-top-right{display:flex;align-items:center;gap:8px;color:var(--blue);font-size:11px}
        .db-shell{max-width:1180px;margin:0 auto;position:relative;z-index:1}.db-intro{display:flex;justify-content:space-between;align-items:flex-end;padding:37px 0 24px}.db-kicker{display:flex;align-items:center;gap:8px;color:var(--coral);font:10px 'DM Mono',monospace;letter-spacing:.1em}.db-intro h1{font-size:clamp(31px,4vw,46px);letter-spacing:-.055em;line-height:1.04;margin:12px 0 7px;font-weight:600}.db-intro h1 em{font:500 1em 'Fraunces',serif;color:var(--blue)}.db-intro p{margin:0;color:var(--muted);font-size:13px}.db-date{border:1px solid var(--line);border-radius:12px;padding:12px 15px;background:#fbfaf6;text-align:right}.db-date span{display:block;color:#9a988e;font:9px 'DM Mono',monospace;letter-spacing:.08em}.db-date strong{display:block;margin-top:5px;font-size:13px}
        .db-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.76fr);gap:22px;align-items:start}.db-main{display:flex;flex-direction:column;gap:17px}
        .db-route{background:var(--blue);color:#f8f7f0;border-radius:18px;padding:23px 26px 21px;position:relative;overflow:hidden;min-height:232px;box-shadow:0 12px 30px #23425518}.db-route:after{content:"";position:absolute;width:330px;height:330px;border:1px solid #ffffff19;border-radius:50%;right:-84px;top:-182px;box-shadow:0 0 0 28px #ffffff08,0 0 0 56px #ffffff06}
        .db-route-head{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center}.db-route-label{font:9px 'DM Mono',monospace;letter-spacing:.12em;color:#b8d2dc}.db-switch{display:flex;align-items:center;gap:5px;background:#ffffff18;border:1px solid #ffffff20;padding:4px;border-radius:8px}.db-switch button{font:9px 'DM Mono',monospace;border:0;background:transparent;color:#c2d4d8;padding:6px 9px;border-radius:5px;cursor:pointer}.db-switch button.active{background:#fff;color:var(--blue)}
        .db-route-title{position:relative;z-index:1;display:flex;align-items:center;gap:11px;margin:20px 0 4px}.db-route-title h2{font-size:25px;letter-spacing:-.04em;margin:0;font-weight:600}.db-route-title .db-arrow{color:#e8bd68}.db-route-sub{position:relative;z-index:1;color:#bdcfd4;margin:0;font-size:11px}.db-route-bottom{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;margin-top:24px}.db-duration{display:flex;align-items:center;gap:9px}.db-duration-icon{width:34px;height:34px;border-radius:10px;background:#ffffff17;display:grid;place-items:center;color:#f0c36a}.db-duration small{display:block;color:#afc7ce;font:8px 'DM Mono',monospace;letter-spacing:.07em}.db-duration strong{display:block;font-size:13px;margin-top:3px}.db-route-cta{display:flex;align-items:center;gap:7px;border:0;border-radius:8px;background:#f1c56c;color:#253c48;padding:10px 13px;font-size:10px;font-weight:700;cursor:pointer;transition:transform .18s}.db-route-cta:hover{transform:translateY(-2px)}
        .db-lower{display:grid;grid-template-columns:1.15fr .85fr;gap:17px}.db-panel{border:1px solid var(--line);background:var(--card);border-radius:15px;padding:18px 19px}.db-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.db-panel-head h3{font-size:14px;margin:0;letter-spacing:-.02em}.db-panel-head span{font:8px 'DM Mono',monospace;color:#9a9b91;letter-spacing:.06em}
        .db-timeline{position:relative;padding-left:21px}.db-timeline:before{content:"";position:absolute;left:5px;top:6px;bottom:12px;border-left:1px dashed #cad6d7}.db-stop{position:relative;display:grid;grid-template-columns:45px 1fr;gap:9px;padding:0 0 15px}.db-stop:last-child{padding-bottom:0}.db-stop-dot{position:absolute;left:-20px;top:3px;width:10px;height:10px;border-radius:50%;border:2px solid #95b6bf;background:#fff}.db-stop:first-child .db-stop-dot{background:#e8b95d;border-color:#e8b95d}.db-stop time{font:9px 'DM Mono',monospace;color:#758488;padding-top:2px}.db-stop strong{font-size:10px;display:block}.db-stop small{font-size:9px;color:#929994;display:block;margin-top:3px}
        .db-checklist{display:flex;flex-direction:column;gap:12px}.db-check{display:flex;align-items:center;gap:9px;padding:0;border:0;background:none;text-align:left;cursor:pointer;color:#445058;font:10px 'DM Sans',sans-serif}.db-check-box{width:17px;height:17px;border:1px solid #d5d8d2;border-radius:5px;color:#fff;display:grid;place-items:center;flex:none;transition:background .18s,border-color .18s}.db-check.done .db-check-box{background:#719c82;border-color:#719c82}.db-check.done span:last-child{text-decoration:line-through;color:#a4a79f}.db-check-count{margin-top:15px;border-top:1px solid #efeee8;padding-top:10px;color:#89908b;font:8px 'DM Mono',monospace;letter-spacing:.06em}
        .db-aside{display:flex;flex-direction:column;gap:15px}.db-buddy{background:#f1e8d5;border-radius:16px;overflow:hidden;position:relative;min-height:201px;padding:20px 19px}.db-buddy-top{display:flex;align-items:center;gap:11px}.db-avatar{width:45px;height:45px;border-radius:15px;overflow:hidden;background:#d8e4e2;border:2px solid #fff}.db-avatar img{width:100%;height:100%;object-fit:cover;object-position:50% 27%}.db-buddy-name strong{display:block;font-size:12px}.db-buddy-name span{display:flex;align-items:center;gap:5px;font:8px 'DM Mono',monospace;color:#7c8d80;margin-top:5px}.db-buddy-name i{width:5px;height:5px;border-radius:50%;background:#68a27d}.db-buddy-copy{position:relative;z-index:1;margin:17px 0 14px;max-width:255px;font:17px/1.3 'Fraunces',serif;color:#34464a}.db-buddy-copy em{color:#bd5d44}.db-buddy-sun{position:absolute;right:-13px;top:79px;color:#dda947;opacity:.6}
        .db-prompts{display:flex;flex-wrap:wrap;gap:6px;position:relative;z-index:1}.db-prompts button{border:1px solid #e2d8c5;background:#fffaf0;border-radius:7px;color:#666d65;padding:7px 8px;font:9px 'DM Sans',sans-serif;cursor:pointer;transition:background .18s,color .18s}.db-prompts button:hover{background:var(--blue);color:white}
        .db-ask{border:1px solid var(--line);background:var(--card);border-radius:15px;padding:17px}.db-ask-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.db-ask-head strong{font-size:12px}.db-ask-head span{color:#a09d92;font:8px 'DM Mono',monospace}.db-answer{border-left:2px solid var(--gold);padding:1px 0 1px 10px;margin-bottom:13px;color:#697279;font-size:10px;line-height:1.55}.db-answer b{display:block;color:#45545b;font-size:9px;margin-bottom:4px}.db-input{height:42px;border:1px solid #e9e5dc;background:#faf9f5;border-radius:9px;display:flex;align-items:center;padding:0 5px 0 11px;gap:7px;color:#9a9f99}.db-input input{min-width:0;flex:1;border:0;outline:0;background:transparent;font:10px 'DM Sans',sans-serif;color:var(--ink)}.db-input button{height:31px;width:32px;border:0;border-radius:7px;background:var(--blue);color:white;display:grid;place-items:center;cursor:pointer}.db-quote{padding:17px 17px 16px 19px;border-left:2px solid #dcbd77;color:#7d807a;font:13px/1.5 'Fraunces',serif}.db-quote small{display:block;margin-top:8px;color:#aaa69b;font:8px 'DM Mono',monospace;letter-spacing:.06em}
        .db-footer{max-width:1180px;margin:22px auto 0;padding:12px 0 18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;color:#a09e96;font:8px 'DM Mono',monospace;letter-spacing:.08em;position:relative;z-index:1}
        @media(max-width:850px){.db-page{padding:0 25px}.db-grid{grid-template-columns:1fr}.db-aside{display:grid;grid-template-columns:1fr 1fr;align-items:start}.db-quote{display:none}.db-intro{padding-top:28px}.db-footer{margin-top:18px}}
        @media(max-width:560px){.db-page{padding:0 14px}.db-top{height:58px}.db-location{font-size:7px;gap:5px}.db-top-right{font-size:0}.db-intro{padding:24px 0 17px;align-items:flex-start}.db-intro h1{font-size:34px}.db-intro p{font-size:11px;max-width:245px;line-height:1.5}.db-date{padding:9px 10px}.db-date span{font-size:7px}.db-date strong{font-size:10px;white-space:nowrap}.db-grid{gap:13px}.db-main{gap:12px}.db-route{padding:19px 17px;min-height:218px;border-radius:15px}.db-route-title{margin-top:19px}.db-route-title h2{font-size:22px}.db-route-sub{font-size:10px}.db-route-bottom{margin-top:25px}.db-route-cta{font-size:9px;padding:9px}.db-lower{grid-template-columns:1fr;gap:11px}.db-panel{padding:16px}.db-panel-head{margin-bottom:13px}.db-aside{display:flex;gap:11px}.db-buddy{min-height:190px;padding:17px}.db-buddy-copy{font-size:16px;margin:14px 0}.db-ask{padding:15px}.db-footer{font-size:7px;gap:10px}.db-footer span:last-child{text-align:right}}
        @media(prefers-reduced-motion:reduce){.db-page *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>

      <header className="db-top">
        <div className="db-brand"><span className="db-brand-mark"><Compass size={17} /></span><span>XMUM · CAMPUS LIFE</span></div>
        <div className="db-location"><i /> SIMING CAMPUS <span>·</span> XIAMEN, CHINA</div>
        <div className="db-top-right"><Sun size={15} /> 26° &nbsp; Mostly sunny</div>
      </header>

      <div className="db-shell">
        <section className="db-intro">
          <div>
            <div className="db-kicker"><Sparkles size={13} /> YOUR DAY, WITH A HEAD START</div>
            <h1>Morning, <em>student.</em></h1>
            <p>One cross-campus lecture. A few things to remember. Let’s make it easy.</p>
          </div>
          <div className="db-date"><span>YOUR TUESDAY</span><strong>12 March · 8:12 AM</strong></div>
        </section>

        <div className="db-grid">
          <section className="db-main">
            <article className="db-route">
              <div className="db-route-head">
                <span className="db-route-label">YOUR FIRST PLAN · TODAY</span>
                <div className="db-switch" aria-label="Choose destination">
                  {(["Xiang’an", "Siming"] as const).map((campus) => (
                    <button key={campus} type="button" className={destination === campus ? "active" : ""} onClick={() => setDestination(campus)}>{campus}</button>
                  ))}
                </div>
              </div>
              <div className="db-route-title"><h2>{destination === "Xiang’an" ? "Siming" : "Xiang’an"}</h2><ArrowRight className="db-arrow" size={21} /><h2>{destination}</h2></div>
              <p className="db-route-sub">{destination === "Xiang’an" ? "Your lecture is at 10:00 AM · leave a little room for the road." : "A familiar campus day · leave time to get across campus."}</p>
              <div className="db-route-bottom">
                <div className="db-duration"><span className="db-duration-icon"><Clock3 size={17} /></span><span><small>TRAVEL WINDOW</small><strong>{destination === "Xiang’an" ? "60–90 min" : "About 15 min"}</strong></span></div>
                <button type="button" className="db-route-cta" onClick={() => document.getElementById("route-steps")?.scrollIntoView({ behavior: "smooth", block: "center" })}>See your route <ArrowUpRight size={14} /></button>
              </div>
            </article>

            <div className="db-lower">
              <section className="db-panel" id="route-steps">
                <div className="db-panel-head"><h3>Getting there</h3><span>3 SIMPLE STEPS</span></div>
                <div className="db-timeline">
                  {plans.map(({ time, title, detail, icon: Icon }, index) => (
                    <div className="db-stop" key={title}>
                      <span className="db-stop-dot" />
                      <time>{destination === "Xiang’an" ? time : ["08:30", "08:40", "08:50"][index]}</time>
                      <div><strong>{destination === "Siming" && index === 0 ? "Leave the residence" : title}</strong><small>{destination === "Siming" && index === 0 ? "Follow signs toward the main quad" : detail}</small></div>
                      <Icon size={13} style={{ position: "absolute", right: 1, top: 1, color: "#93a4a1" }} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="db-panel">
                <div className="db-panel-head"><h3>Before you go</h3><span>{checked.filter(Boolean).length} OF 3 READY</span></div>
                <div className="db-checklist">
                  {["Check shuttle notice", "Pack your student ID", "Bring a water bottle"].map((item, index) => (
                    <button key={item} type="button" className={`db-check ${checked[index] ? "done" : ""}`} onClick={() => toggleCheck(index)}>
                      <span className="db-check-box">{checked[index] && <Check size={12} />}</span><span>{item}</span>
                    </button>
                  ))}
                </div>
                <div className="db-check-count">{checked.filter(Boolean).length === 3 ? "ALL SET — YOU’VE GOT THIS" : "A SMALL CHECKLIST, A CALMER MORNING"}</div>
              </section>
            </div>
          </section>

          <aside className="db-aside">
            <section className="db-buddy">
              <div className="db-buddy-top">
                <div className="db-avatar"><img src="/__mockup/images/xmum-mascot.jpg" alt="Xiao Jia" /></div>
                <div className="db-buddy-name"><strong>Xiao Jia</strong><span><i /> YOUR CAMPUS BUDDY</span></div>
              </div>
              <p className="db-buddy-copy">Big day? I’ve got the <em>little things.</em></p>
              <Sparkles className="db-buddy-sun" size={53} strokeWidth={1.1} />
              <div className="db-prompts">{starterPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
            </section>
            <section className="db-ask">
              <div className="db-ask-head"><strong>Ask Xiao Jia</strong><span>HERE WHEN YOU NEED ME</span></div>
              {answer && <div className="db-answer" aria-live="polite"><b>{question}</b>{answer}</div>}
              <form className="db-input" onSubmit={(event) => { event.preventDefault(); ask(query); }}>
                <Search size={14} /><input aria-label="Ask Xiao Jia" placeholder="A question about campus..." value={query} onChange={(event) => setQuery(event.target.value)} />
                <button type="submit" aria-label="Send question" disabled={!query.trim()}><Send size={14} /></button>
              </form>
            </section>
            <div className="db-quote">“Ask early, explore often. The campus starts feeling like yours quicker than you think.”<small>— A SENIOR WHO’S BEEN THERE</small></div>
          </aside>
        </div>
      </div>
      <footer className="db-footer"><span>XIAMEN UNIVERSITY MALAYSIA · STUDENT LIFE, A LITTLE EASIER</span><span><MessageCircle size={11} style={{ verticalAlign: "-2px", marginRight: 5 }} />A FRIENDLY GUIDE, NOT AN OFFICIAL NOTICE</span></footer>
    </main>
  );
}
