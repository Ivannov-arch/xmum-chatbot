"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getPendingCount } from "@/services/suggestionService";

type BackendStatus = "checking" | "online" | "offline";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    knowledgeCount: 0,
    academicCount: 0,
    campusLifeCount: 0,
    conversationCount: 0,
    pendingSuggestions: 0,
  });

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [loading, setLoading] = useState(true);

  // Define statusConfig inside the component so it's accessible
  const statusConfig = {
    checking: {
      label: "Checking system...",
      dot: "bg-amber-400 animate-pulse",
      text: "text-amber-400",
      softBg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    online: {
      label: "System Online",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      softBg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    offline: {
      label: "System Offline",
      dot: "bg-rose-400",
      text: "text-rose-400",
      softBg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
  }[backendStatus];

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/health`);
        setBackendStatus(response.ok ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    };

    const fetchStats = async () => {
      try {
        const { data: knowledgeItems } = await supabase
          .from("knowledge_items")
          .select("module");

        const total = knowledgeItems ? knowledgeItems.length : 0;
        const academic = knowledgeItems
          ? knowledgeItems.filter(
              (item) => item.module === "academic_navigation",
            ).length
          : 0;
        const campusLife = knowledgeItems
          ? knowledgeItems.filter((item) => item.module === "campus_life")
              .length
          : 0;

        const { count } = await supabase
          .from("conversation_logs")
          .select("*", { count: "exact", head: true });

        const pendingSuggestions = await getPendingCount();

        setStats({
          knowledgeCount: total,
          academicCount: academic,
          campusLifeCount: campusLife,
          conversationCount: count || 0,
          pendingSuggestions,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
    fetchStats();
  }, [backendUrl]);

  if (loading)
    return <div className="p-12 text-slate-400">Loading dashboard...</div>;

  return (
    <div className="w-full h-full p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-16">
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-900/30 border border-white/5 p-10 rounded-[2rem]">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">
              Welcome back, Admin!
            </h2>
            <p className="text-slate-400 text-lg">
              Here is a summary of your system status.
            </p>
          </div>
          <div
            className={`flex items-center gap-3 px-6 py-3 rounded-full border ${statusConfig.border} ${statusConfig.softBg}`}
          >
            <span className={`w-3 h-3 rounded-full ${statusConfig.dot}`} />
            <span
              className={`text-sm font-bold uppercase tracking-wider ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard
            label="Total Knowledge"
            value={stats.knowledgeCount}
            accent="text-indigo-400"
          />
          <StatCard label="Academic Items" value={stats.academicCount} />
          <StatCard label="Campus Life Items" value={stats.campusLifeCount} />
          <StatCard
            label="Total Logs"
            value={stats.conversationCount}
            accent="text-emerald-400"
          />
          <StatCard
            label="Pending Suggestions"
            value={stats.pendingSuggestions}
            accent={stats.pendingSuggestions > 0 ? "text-amber-400" : "text-slate-400"}
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ActionCard
            href="/admin/knowledge"
            eyebrow="CMS Management"
            title="Knowledge Base"
            description="Manage context items for your LLM."
            cta="Manage Content"
          />
          <ActionCard
            href="/admin/logs"
            eyebrow="Audits"
            title="Conversation Logs"
            description="Review chat history and debug interactions."
            cta="View Logs"
          />
          <ActionCard
            href="/admin/suggestions"
            eyebrow="Community Feedback"
            title="Suggested Questions"
            description="Review questions submitted by users and add them to the knowledge base."
            cta="Review Suggestions"
            badge={stats.pendingSuggestions > 0 ? stats.pendingSuggestions : undefined}
          />
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-10 shadow-lg">
      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </p>
      <div className={`text-5xl font-black mt-6 ${accent}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ActionCard({ href, eyebrow, title, description, cta, badge }: any) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-[2rem] border border-white/5 bg-slate-900/40 p-10 hover:bg-slate-900/60 transition-all shadow-lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            {eyebrow}
          </p>
          {badge !== undefined && (
            <span className="text-xs font-bold bg-amber-500 text-white rounded-full px-2.5 py-0.5">
              {badge} pending
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="text-base text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      <span className="text-sm font-bold text-indigo-300 mt-12 group-hover:translate-x-2 transition-transform">
        {cta} &rarr;
      </span>
    </Link>
  );
}
