"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, FileClock, Lightbulb, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { ErrorState, PageHeader, SkeletonRows } from "@/components/cms/cms-ui";
import "./cms.css";

type Stats = { knowledge: number; academic: number; campusLife: number; logs: number; pending: number };
type Health = "checking" | "online" | "offline";

export default function AdminDashboard() {
  const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || window.location.origin;
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health>("checking");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setStatsError("");
    if (!isSupabaseConfigured) {
      setStats(null);
      setStatsError("Supabase is not configured. Dashboard records cannot be loaded.");
      setLoading(false);
      return;
    }
    try {
      const [knowledgeRes, logsRes, pendingRes] = await Promise.all([
        supabase.from("knowledge_items").select("module"),
        supabase.from("conversation_logs").select("id", { count: "exact", head: true }),
        supabase.from("suggested_questions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (knowledgeRes.error) throw knowledgeRes.error;
      if (logsRes.error) throw logsRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (knowledgeRes.data === null || logsRes.count === null || pendingRes.count === null) throw new Error("The database returned incomplete dashboard statistics.");
      const rows = knowledgeRes.data;
      setStats({
        knowledge: rows.length,
        academic: rows.filter((row) => row.module === "academic_navigation").length,
        campusLife: rows.filter((row) => row.module === "campus_life").length,
        logs: logsRes.count,
        pending: pendingRes.count,
      });
    } catch (reason) {
      setStats(null);
      setStatsError(reason instanceof Error ? reason.message : "Unable to load dashboard records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      let response: Response | null = null;
      for (const path of ["/api/health", "/health"]) {
        try {
          response = await fetch(`${backendUrl}${path}`);
          if (response.ok || response.status !== 404) break;
        } catch { response = null; }
      }
      if (alive) setHealth(response?.ok ? "online" : "offline");
    };
    void check();
    void loadStats();
    return () => { alive = false; };
  }, [backendUrl, loadStats]);

  const metricCards = [
    { label: "Knowledge entries", value: stats?.knowledge, Icon: BookOpen, note: "Published answers" },
    { label: "Academic", value: stats?.academic, Icon: CheckCircle2, note: "Academic navigation" },
    { label: "Campus life", value: stats?.campusLife, Icon: BookOpen, note: "Campus services" },
    { label: "Chat records", value: stats?.logs, Icon: FileClock, note: "Conversation messages" },
    { label: "Pending review", value: stats?.pending, Icon: Lightbulb, note: "Awaiting staff action", attention: true },
  ];
  const categories = stats ? [
    { label: "Campus life", count: stats.campusLife, tone: "" },
    { label: "Academic navigation", count: stats.academic, tone: "cms-bar--red" },
    { label: "Other categories", count: Math.max(0, stats.knowledge - stats.campusLife - stats.academic), tone: "cms-bar--gold" },
  ] : [];
  const maxCount = Math.max(1, ...categories.map((item) => item.count));

  return (
    <main className="cms-page">
      <div className="cms-hello">
        <img src="/tan-kah-kee-portrait.webp" alt="Illustrated portrait of Tan Kah Kee" />
        <div><span>XMUM · knowledge desk</span><h1>Good morning, staff.</h1><p>Keep campus answers useful, current, and clear for every student.</p></div>
        <div className="cms-hello-side">
          <span className={`cms-status cms-status--${health}`}><i />{health === "checking" ? "Checking assistant" : health === "online" ? "Assistant online" : "Assistant offline"}</span>
          <button type="button" onClick={() => void loadStats()}><RefreshCw size={13} /> Refresh overview</button>
        </div>
      </div>

      <PageHeader eyebrow="Workspace overview" title="Your campus knowledge, at a glance" description="A live view of the content students rely on and the questions that need a staff review." />

      {loading ? (
        <div className="cms-panel cms-panel--round"><SkeletonRows rows={5} /></div>
      ) : statsError ? (
        <div className="cms-panel cms-panel--round"><ErrorState title="Overview unavailable" message={statsError} onRetry={() => void loadStats()} /></div>
      ) : (
        <>
          <section className="cms-stats" aria-label="Campus assistant statistics">
            {metricCards.map(({ label, value, Icon, note, attention }) => (
              <article className={`cms-stat ${attention && value ? "cms-stat--attention" : ""}`} key={label}>
                <div className="cms-stat-top"><span>{label}</span><Icon size={18} /></div>
                <strong>{value?.toLocaleString()}</strong><small>{note}</small>
              </article>
            ))}
          </section>
          <section className="cms-grid-2">
            <article className="cms-card">
              <h2>Category balance</h2><p>Published knowledge by area.</p>
              <div className="cms-bars">
                {categories.map((category) => <div key={category.label}>
                  <div className="cms-bar-label"><span>{category.label}</span><span>{category.count}</span></div>
                  <div className={`cms-bar ${category.tone}`}><i style={{ width: `${category.count / maxCount * 100}%` }} /></div>
                </div>)}
              </div>
            </article>
            <article className="cms-card">
              <h2>Staff shortcuts</h2><p>Continue maintaining the campus guide.</p>
              <div className="cms-actions-list">
                <Link href="/admin/knowledge" className="cms-action"><span className="cms-action-icon"><BookOpen size={19} /></span><span><b>Knowledge base</b><small>Search, edit, or add an answer</small></span><ArrowRight size={17} /></Link>
                <Link href="/admin/suggestions" className="cms-action"><span className="cms-action-icon"><Lightbulb size={19} /></span><span><b>Review suggestions</b><small>{stats?.pending ?? 0} waiting for a decision</small></span><ArrowRight size={17} /></Link>
                <Link href="/admin/logs" className="cms-action"><span className="cms-action-icon"><FileClock size={19} /></span><span><b>Conversation logs</b><small>Inspect questions and replies</small></span><ArrowRight size={17} /></Link>
              </div>
            </article>
          </section>
          {health === "offline" && <div className="cms-alert cms-alert--warn" style={{ marginTop: 14 }}><AlertTriangle size={18} /><span><b>Chat service is unavailable.</b>The CMS is connected, but students may not receive assistant replies until the backend is online.</span></div>}
        </>
      )}
    </main>
  );
}
