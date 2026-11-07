import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bus,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  MapPin,
  Search,
  Sparkles,
  Star,
  Sun,
  Utensils,
  X,
} from "lucide-react";
import "./routeboard.css";

type Guide = {
  title: string;
  category: string;
  time: string;
  description: string;
  detail: string;
  icon: typeof Bus;
  accent: string;
};

const guides: Guide[] = [
  {
    title: "Siming to Xiang’an",
    category: "Getting around",
    time: "60–90 min",
    description: "Plan your inter-campus trip",
    detail:
      "Leave a two-hour buffer before class. Check the student portal for today's shuttle notice, then keep your student ID ready when you board.",
    icon: Bus,
    accent: "coral",
  },
  {
    title: "Find Furong Tunnel",
    category: "Places",
    time: "12 min walk",
    description: "A quieter route to the murals",
    detail:
      "Follow the lake path toward the west entrance. Late afternoon brings softer light; keep to the side and watch for cyclists.",
    icon: MapPin,
    accent: "blue",
  },
  {
    title: "Lunch around campus",
    category: "Food & drink",
    time: "From RM 8",
    description: "Student-friendly places to eat",
    detail:
      "The campus canteen is the quickest wallet-friendly choice. Bring your campus card, or take a longer trip to explore Zhongshan Road.",
    icon: Utensils,
    accent: "gold",
  },
  {
    title: "First-week essentials",
    category: "Getting settled",
    time: "5 small steps",
    description: "The practical things, in order",
    detail:
      "Activate your student account, save the campus map, set up Wi-Fi, learn your shuttle route, and keep your student ID with you.",
    icon: BookOpen,
    accent: "green",
  },
];

const categories = ["All guides", "Getting around", "Places", "Food & drink", "Getting settled"];

export default function Routeboard() {
  const [category, setCategory] = useState("All guides");
  const [expanded, setExpanded] = useState<string | null>(guides[0].title);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [showNotice, setShowNotice] = useState(false);

  const visibleGuides = guides.filter((guide) => {
    const matchesCategory = category === "All guides" || guide.category === category;
    const search = query.trim().toLowerCase();
    return matchesCategory && (!search || `${guide.title} ${guide.description}`.toLowerCase().includes(search));
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    const matching = guides.find((guide) => `${guide.title} ${guide.description}`.toLowerCase().includes(query.toLowerCase()));
    setAnswer(
      matching
        ? `${matching.title}: ${matching.detail}`
        : "I can help with getting around, places to explore, food nearby, and settling in. Try one of the guide topics below.",
    );
    setExpanded(matching?.title ?? null);
  };

  const toggleSaved = (title: string) => {
    setSaved((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  };

  const chooseGuide = (guide: Guide) => {
    setExpanded((current) => current === guide.title ? null : guide.title);
    setAnswer("");
  };

  return (
    <main className="rb-shell">
      <header className="rb-topbar">
        <a className="rb-brand" href="#top" aria-label="Furong Buddy home">
          <span className="rb-brand-mark"><Compass size={18} /></span>
          <span>FURONG <b>BUDDY</b></span>
        </a>
        <div className="rb-campus"><i /> SIMING CAMPUS <span>·</span> XIAMEN, CHINA</div>
        <button className={`rb-notice ${showNotice ? "is-open" : ""}`} onClick={() => setShowNotice((open) => !open)} type="button" aria-label="Campus notices">
          <Bell size={16} /><span>1</span>
        </button>
        {showNotice && <div className="rb-notice-pop"><b>A quick note</b><p>Shuttle times can change. Check the student portal before setting off.</p><button type="button" onClick={() => setShowNotice(false)} aria-label="Dismiss notice"><X size={14} /></button></div>}
      </header>

      <section className="rb-welcome" id="top">
        <div className="rb-welcome-copy">
          <div className="rb-overline"><span>✳</span> YOUR XMUM FIELD GUIDE <i /></div>
          <h1>Campus life,<br /><em>one good move</em><br />at a time.</h1>
          <p>Skip the blank chat box. Pick what you need, get a clear next step, and get on with your day.</p>
          <div className="rb-welcome-foot"><span className="rb-avatar">XJ</span><span><b>Xiao Jia</b> · your digital senior</span><span className="rb-live"><i /> READY TO HELP</span></div>
        </div>
        <aside className="rb-daycard">
          <div className="rb-daycard-top"><span><Sun size={15} /> YOUR DAY, SORTED</span><span>01 / 04</span></div>
          <div className="rb-date">TUESDAY <b>·</b> SIMING</div>
          <h2>Where to<br />from here?</h2>
          <p>Choose a guide and Xiao Jia will map out the next move.</p>
          <div className="rb-dayline"><span>01</span><i /><span>ASK</span><i /><span>GO</span><ArrowRight size={14} /></div>
        </aside>
      </section>

      <section className="rb-find" aria-label="Search campus help">
        <div className="rb-find-label"><span>01</span><b>WHAT ARE YOU FIGURING OUT?</b><span className="rb-label-rule" /></div>
        <form className="rb-search" onSubmit={submitSearch}>
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “bus to Xiang’an” or “where to eat”" aria-label="Search campus help" />
          {query && <button className="rb-clear" type="button" onClick={() => { setQuery(""); setAnswer(""); }} aria-label="Clear search"><X size={15} /></button>}
          <button className="rb-search-submit" type="submit">Find my way <ArrowUpRight size={16} /></button>
        </form>
        {answer && <div className="rb-answer"><span><Sparkles size={16} /></span><p>{answer}</p><button type="button" onClick={() => setAnswer("")} aria-label="Dismiss answer"><X size={15} /></button></div>}
      </section>

      <section className="rb-guides">
        <div className="rb-guides-heading">
          <div><div className="rb-overline rb-overline-dark"><span>02</span> PICK A FIELD GUIDE</div><h2>A good place to start.</h2></div>
          <div className="rb-small-note">Four useful things.<br />No rabbit holes.</div>
        </div>
        <nav className="rb-filters" aria-label="Guide categories">
          {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </nav>
        <div className="rb-guide-list">
          {visibleGuides.length ? visibleGuides.map((guide, index) => {
            const Icon = guide.icon;
            const isExpanded = expanded === guide.title;
            const isSaved = saved.includes(guide.title);
            return (
              <article className={`rb-guide rb-${guide.accent} ${isExpanded ? "expanded" : ""}`} key={guide.title}>
                <button className="rb-guide-main" type="button" onClick={() => chooseGuide(guide)} aria-expanded={isExpanded}>
                  <span className="rb-guide-index">0{index + 1}</span>
                  <span className="rb-guide-icon"><Icon size={20} /></span>
                  <span className="rb-guide-copy"><small>{guide.category}</small><strong>{guide.title}</strong><span>{guide.description}</span></span>
                  <span className="rb-guide-time"><Clock3 size={13} /> {guide.time}</span>
                  <span className="rb-guide-arrow">{isExpanded ? <ChevronDown size={18} /> : <ArrowUpRight size={18} />}</span>
                </button>
                {isExpanded && <div className="rb-guide-detail">
                  <p>{guide.detail}</p>
                  <div><button type="button" className="rb-detail-action" onClick={() => { setAnswer(`${guide.title}: ${guide.detail}`); document.querySelector(".rb-find")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Show me the next step <ArrowRight size={14} /></button>
                  <button className={`rb-save ${isSaved ? "saved" : ""}`} type="button" onClick={() => toggleSaved(guide.title)}>{isSaved ? <Check size={14} /> : <Star size={14} />} {isSaved ? "Saved for later" : "Save guide"}</button></div>
                </div>}
              </article>
            );
          }) : <div className="rb-empty"><Search size={18} /><b>No guide found for “{query}”</b><span>Try a broader phrase or browse all guides.</span><button type="button" onClick={() => { setQuery(""); setCategory("All guides"); }}>Show all guides <ArrowRight size={14} /></button></div>}
        </div>
      </section>

      <footer className="rb-footer"><span><ArrowDownLeft size={14} /> A FRIENDLY GUIDE, NOT AN OFFICIAL NOTICE</span><span>XMUM STUDENT LIFE <b>✳</b> XIAMEN, CHINA</span></footer>
    </main>
  );
}
