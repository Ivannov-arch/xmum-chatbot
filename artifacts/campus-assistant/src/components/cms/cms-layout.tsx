"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, ChartNoAxesColumn, ExternalLink, FileClock, Lightbulb, LogOut, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { usePathname, useRouter } from "@/lib/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import "./../../app/admin/cms.css";

const links = [
  { href: "/admin", label: "Overview", Icon: ChartNoAxesColumn },
  { href: "/admin/knowledge", label: "Knowledge base", Icon: BookOpen },
  { href: "/admin/logs", label: "Conversation logs", Icon: FileClock },
  { href: "/admin/suggestions", label: "Suggestions", Icon: Lightbulb },
];

export default function CmsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(pathname !== "/admin/login");
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setSession(null);
      setLoading(false);
      router.replace("/admin/login");
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      setSession(error ? null : data.session);
      setLoading(false);
      if (error || !data.session) router.replace("/admin/login");
    }).catch(() => {
      if (alive) {
        setLoading(false);
        router.replace("/admin/login");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession && pathname !== "/admin/login") router.replace("/admin/login");
    });
    const loadPending = async () => {
      try {
        const { count, error } = await supabase.from("suggested_questions").select("*", { count: "exact", head: true }).eq("status", "pending");
        if (alive) setPending(error ? null : count ?? 0);
      } catch {
        if (alive) setPending(null);
      }
    };
    void loadPending();
    return () => { alive = false; subscription.unsubscribe(); };
  }, [pathname, router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;
  if (loading) return <div className="cms-gate"><div className="cms-gate-inner"><img src="/tan-kah-kee-portrait.webp" alt="" /><span>Verifying your staff session</span></div></div>;
  if (!session) return null;

  return (
    <div className="cms">
      {mobileOpen && <button type="button" className="cms-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`cms-nav ${mobileOpen ? "is-open" : ""}`}>
        <div className="cms-nav-brand">
          <img src="/tan-kah-kee-portrait.webp" alt="Illustrated portrait of Tan Kah Kee" />
          <div><b>XMUM Campus</b><small>Assistant CMS</small></div>
          <button type="button" className="cms-icon-btn cms-nav-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="cms-nav-label">Workspace</div>
        <nav className="cms-nav-list" aria-label="CMS navigation">
          {links.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`cms-nav-link ${active ? "is-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {href === "/admin/suggestions" && pending !== null && pending > 0 && <b className="cms-count-pill">{pending}</b>}
            </Link>;
          })}
          <Link href="/" target="_blank" onClick={() => setMobileOpen(false)} className="cms-nav-link"><ExternalLink size={18} /><span>Open campus guide</span></Link>
        </nav>
        <div className="cms-nav-foot">
          <div className="cms-user">
            <span className="cms-user-initial">{(session.user?.email?.[0] || "S").toUpperCase()}</span>
            <span className="cms-user-meta"><b>{session.user?.email || "Staff account"}</b><small>Authenticated staff</small></span>
            <button type="button" className="cms-icon-btn cms-icon-btn--danger" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      <section className="cms-main">
        <header className="cms-topbar">
          <button type="button" className="cms-icon-btn cms-menu-btn" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="cms-topbar-crumb"><span>XMUM Campus Assistant</span><span>/</span><b>{links.find((item) => item.href === pathname || (item.href !== "/admin" && pathname.startsWith(item.href)))?.label || "Overview"}</b></div>
          <div className="cms-topbar-right"><span className="cms-status"><i /> Staff session verified</span></div>
        </header>
        <div className="cms-scroll">{children}</div>
      </section>
    </div>
  );
}
