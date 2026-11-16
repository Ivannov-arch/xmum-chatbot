"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileClock, Search, Trash2, UserRound, Bot } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { ErrorState, Modal, PageHeader, SkeletonRows, StateBlock, Toast, errorMessage, formatDateTime, type ToastState } from "@/components/cms/cms-ui";
import "../cms.css";

interface LogEntry {
  id: string;
  session_id: string;
  role: string;
  message: string;
  created_at: string;
}

export default function ConversationLogsCMS() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [session, setSession] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<LogEntry | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const notify = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    if (!isSupabaseConfigured) {
      setLogs([]);
      setLoadError("Supabase is not configured. Conversation records cannot be loaded.");
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.from("conversation_logs").select("id, session_id, role, message, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setLogs((data || []) as LogEntry[]);
    } catch (err) {
      setLogs([]);
      setLoadError(errorMessage(err, "Unable to load conversation records."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const sessions = useMemo(() => Array.from(new Set(logs.map((log) => log.session_id).filter(Boolean))), [logs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((entry) => (!q || entry.message.toLowerCase().includes(q) || entry.session_id.toLowerCase().includes(q)) && (role === "all" || entry.role === role) && (session === "all" || entry.session_id === session));
  }, [logs, search, role, session]);
  const shortSession = (id: string) => `#${id.replace(/-/g, "").slice(-8)}`;
  const reset = () => { setSearch(""); setRole("all"); setSession("all"); };

  const removeLog = async () => {
    if (!deleteTarget) return;
    setActioning(true);
    try {
      const { error } = await supabase.from("conversation_logs").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setLogs((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify("Conversation record deleted.");
    } catch (err) {
      notify(errorMessage(err, "Unable to delete the conversation record."), "error");
    } finally { setActioning(false); }
  };
  const clearAll = async () => {
    setActioning(true);
    try {
      const { error } = await supabase.from("conversation_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      setLogs([]);
      setClearOpen(false);
      notify("All conversation records cleared.");
    } catch (err) {
      notify(errorMessage(err, "Unable to clear conversation records."), "error");
    } finally { setActioning(false); }
  };

  return (
    <main className="cms-page">
      <PageHeader eyebrow="Student conversations" title="Conversation logs" description="Inspect recent exchanges to understand what students are asking and where guidance may need attention." actions={<button type="button" className="cms-btn cms-btn--danger-ghost" disabled={loading || !!loadError || logs.length === 0} onClick={() => setClearOpen(true)}><Trash2 size={16} /> Clear all logs</button>} />
      <div className="cms-toolbar">
        <div className="cms-search"><Search size={17} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages or session IDs" aria-label="Search conversation logs" data-testid="input-search-logs" />{search && <button type="button" className="cms-icon-btn cms-search-clear" aria-label="Clear search" onClick={() => setSearch("")}>×</button>}</div>
        <select className="cms-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by speaker" data-testid="select-log-role"><option value="all">All speakers</option><option value="user">Student</option><option value="bot">Assistant</option></select>
        <select className="cms-select" value={session} onChange={(e) => setSession(e.target.value)} aria-label="Filter by session" data-testid="select-log-session"><option value="all">All sessions</option>{sessions.map((value) => <option key={value} value={value}>{shortSession(value)}</option>)}</select>
      </div>
      <div className="cms-resultbar"><span>{loading ? "Loading conversation records…" : loadError ? "Records unavailable" : <><b>{filtered.length}</b> of <b>{logs.length}</b> messages</>}</span>{(search || role !== "all" || session !== "all") && <button type="button" className="cms-linkbtn" onClick={reset}>Reset filters</button>}</div>
      <section className="cms-panel" aria-live="polite">
        {loading ? <SkeletonRows /> : loadError ? <ErrorState title="Conversation logs could not be loaded" message={loadError} onRetry={() => void load()} /> : filtered.length === 0 ? (
          <StateBlock icon={logs.length ? <Search size={20} /> : <FileClock size={20} />} title={logs.length ? "No messages match these filters" : "No conversation records"} message={logs.length ? "Try a different search or clear the selected filters." : "New student conversations will appear here when records are available."} action={logs.length ? <button className="cms-btn cms-btn--ghost" type="button" onClick={reset}>Reset filters</button> : undefined} />
        ) : <div className="cms-table-wrap"><table className="cms-table" style={{ minWidth: 760 }}>
          <thead><tr><th style={{ width: 150 }}>Time</th><th style={{ width: 130 }}>Session</th><th style={{ width: 125 }}>Speaker</th><th>Message</th><th style={{ width: 60, textAlign: "right" }}> </th></tr></thead>
          <tbody>{filtered.map((entry) => <tr key={entry.id} data-testid={`row-log-${entry.id}`}>
            <td className="cms-time">{formatDateTime(entry.created_at)}</td>
            <td><span className="cms-session">{shortSession(entry.session_id)}</span></td>
            <td><span className={`cms-role cms-role--${entry.role === "user" ? "user" : "bot"}`}>{entry.role === "user" ? <UserRound size={14} /> : <Bot size={14} />}{entry.role === "user" ? "Student" : "Assistant"}</span></td>
            <td className="cms-a" style={{ maxWidth: 580, overflowWrap: "anywhere" }}>{entry.message}</td>
            <td><div className="cms-row-actions"><button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label="Delete conversation record" title="Delete record" onClick={() => setDeleteTarget(entry)} data-testid={`button-delete-log-${entry.id}`}><Trash2 size={16} /></button></div></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      {deleteTarget && <Modal title="Delete this message?" icon={<Trash2 size={17} />} tone="danger" onClose={() => setDeleteTarget(null)}>
        <div className="cms-modal-body"><p>This permanently removes one record from the conversation history.</p><div className="cms-quote"><small><span className={`cms-role cms-role--${deleteTarget.role === "user" ? "user" : "bot"}`}>{deleteTarget.role === "user" ? "Student" : "Assistant"}</span><span>{shortSession(deleteTarget.session_id)}</span></small>{deleteTarget.message}</div></div>
        <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="cms-btn cms-btn--accent" disabled={actioning} onClick={() => void removeLog()}>{actioning ? "Deleting…" : "Delete record"}</button></div>
      </Modal>}
      {clearOpen && <Modal title="Clear all conversation logs?" icon={<AlertTriangle size={18} />} tone="danger" onClose={() => setClearOpen(false)}>
        <div className="cms-modal-body"><p>This permanently deletes all <b>{logs.length}</b> currently loaded conversation records from Supabase. This cannot be undone.</p><div className="cms-quote">Review your retention requirements before clearing these records.</div></div>
        <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setClearOpen(false)}>Keep logs</button><button type="button" className="cms-btn cms-btn--accent" disabled={actioning} onClick={() => void clearAll()}>{actioning ? "Clearing…" : "Clear all logs"}</button></div>
      </Modal>}
      <Toast toast={toast} />
    </main>
  );
}
