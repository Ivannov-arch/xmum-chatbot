"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Check, Lightbulb, RefreshCw, Trash2, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getSuggestions, updateSuggestionStatus, deleteSuggestion } from "@/services/suggestionService";
import type { Suggestion } from "@/services/suggestionService";
import { createKnowledgeItem } from "@/services/knowledgeService";
import { ErrorState, Field, Modal, MODULE_OPTIONS, PageHeader, SkeletonRows, StateBlock, Toast, errorMessage, formatDateTime, type ToastState } from "@/components/cms/cms-ui";
import "../cms.css";

type FilterStatus = "pending" | "all" | "approved" | "rejected";
const filters: FilterStatus[] = ["pending", "all", "approved", "rejected"];
const labelForStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [approveItem, setApproveItem] = useState<Suggestion | null>(null);
  const [deleteItem, setDeleteItem] = useState<Suggestion | null>(null);
  const [formModule, setFormModule] = useState("campus_life");
  const [formSubIntent, setFormSubIntent] = useState("general");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");

  const notify = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setAdminEmail(data.session?.user?.email ?? "")).catch(() => setAdminEmail(""));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    if (!isSupabaseConfigured) {
      setSuggestions([]);
      setLoadError("Supabase is not configured. Student suggestions cannot be loaded.");
      setLoading(false);
      return;
    }
    try {
      const result = await getSuggestions(filter === "all" ? undefined : filter);
      setSuggestions(result);
    } catch (err) {
      setSuggestions([]);
      setLoadError(errorMessage(err, "Unable to load suggestions."));
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const openApproval = (item: Suggestion) => {
    setApproveItem(item);
    setQuestion(item.question);
    setAnswer(item.suggested_answer || "");
    setFormModule("campus_life");
    setFormSubIntent("general");
    setKeywords("");
  };

  const approve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!approveItem || !question.trim() || !answer.trim()) return;
    const target = approveItem;
    setActioningId(target.id);
    try {
      const keywordsArray = keywords.split(",").map((word) => word.trim()).filter(Boolean);
      await createKnowledgeItem({ module: formModule, question: question.trim(), answer: answer.trim(), keywordsArray });
      await updateSuggestionStatus(target.id, "approved", adminEmail);
      setSuggestions((current) => filter === "all" ? current.map((row) => row.id === target.id ? { ...row, status: "approved", reviewed_by: adminEmail } : row) : current.filter((row) => row.id !== target.id));
      setApproveItem(null);
      notify("Suggestion added to the knowledge base and approved.");
    } catch (err) {
      notify(errorMessage(err, "Approval failed. Please retry."), "error");
    } finally { setActioningId(null); }
  };

  const reject = async (item: Suggestion) => {
    setActioningId(item.id);
    try {
      await updateSuggestionStatus(item.id, "rejected", adminEmail);
      setSuggestions((current) => filter === "all" ? current.map((row) => row.id === item.id ? { ...row, status: "rejected", reviewed_by: adminEmail } : row) : current.filter((row) => row.id !== item.id));
      notify("Suggestion rejected.");
    } catch (err) { notify(errorMessage(err, "Unable to reject the suggestion."), "error"); }
    finally { setActioningId(null); }
  };

  const remove = async () => {
    if (!deleteItem) return;
    setActioningId(deleteItem.id);
    try {
      await deleteSuggestion(deleteItem.id);
      setSuggestions((current) => current.filter((row) => row.id !== deleteItem.id));
      setDeleteItem(null);
      notify("Suggestion deleted permanently.");
    } catch (err) { notify(errorMessage(err, "Unable to delete the suggestion."), "error"); }
    finally { setActioningId(null); }
  };

  const openApprove = Boolean(approveItem);
  return (
    <main className="cms-page">
      <PageHeader eyebrow="Student feedback" title="Suggested questions" description="Review what students are asking. Approve useful questions by writing a verified answer, or reject those that do not belong in the guide." actions={<button type="button" className="cms-btn cms-btn--ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>} />
      <div className="cms-resultbar" style={{ border: "1px solid var(--c-line)", borderRadius: "8px 8px 0 0" }}>
        <div className="cms-segment" role="tablist" aria-label="Filter suggestions">
          {filters.map((status) => <button type="button" role="tab" aria-selected={filter === status} key={status} className={filter === status ? "is-active" : ""} onClick={() => setFilter(status)} data-testid={`filter-tab-${status}`}>{labelForStatus(status)}</button>)}
        </div>
        <span>{loading ? "Loading submissions…" : loadError ? "Submissions unavailable" : <><b>{suggestions.length}</b> {filter === "all" ? "submissions" : `${filter} submissions`}</>}</span>
      </div>
      <section className="cms-panel cms-panel--round" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }} aria-live="polite">
        {loading ? <SkeletonRows rows={4} /> : loadError ? <ErrorState title="Suggestions could not be loaded" message={loadError} onRetry={() => void load()} /> : suggestions.length === 0 ? (
          <StateBlock icon={<Lightbulb size={21} />} title={filter === "pending" ? "No questions awaiting review" : `No ${filter === "all" ? "" : `${filter} `}suggestions`} message={filter === "pending" ? "New student-submitted questions will appear here for staff review." : "There are no records in this view."} />
        ) : <div className="cms-sugg-list" style={{ padding: 14 }}>
          {suggestions.map((item, index) => <article className="cms-sugg" key={item.id} style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }} data-testid={`card-suggestion-${item.id}`}>
            <div className="cms-sugg-head"><div><span className="cms-eyebrow" style={{ fontSize: 11 }}>Suggested question</span><h3 style={{ marginTop: 6 }}>{item.question}</h3></div><span className={`cms-badge cms-badge--${item.status === "approved" ? "green" : item.status === "rejected" ? "red" : "gold"}`}><i />{labelForStatus(item.status)}</span></div>
            {(item.suggested_answer || item.user_message) && <div className="cms-sugg-body">
              {item.suggested_answer && <div className="cms-sugg-block cms-sugg-block--answer"><small>Student-suggested answer · verify before publishing</small>{item.suggested_answer}</div>}
              {item.user_message && <div className="cms-sugg-block cms-sugg-block--context"><small>Original chat message</small>“{item.user_message}”</div>}
            </div>}
            <footer className="cms-sugg-foot"><span>{formatDateTime(item.created_at)}{item.reviewed_by ? ` · Reviewed by ${item.reviewed_by}` : ""}</span><div>
              {item.status === "pending" ? <>
                <button type="button" className="cms-btn cms-btn--danger-ghost cms-btn--sm" disabled={actioningId === item.id} onClick={() => void reject(item)} data-testid={`reject-btn-${item.id}`}><X size={15} /> Reject</button>
                <button type="button" className="cms-btn cms-btn--success cms-btn--sm" disabled={actioningId === item.id} onClick={() => openApproval(item)} data-testid={`approve-btn-${item.id}`}><Check size={15} /> Approve</button>
              </> : <button type="button" className="cms-btn cms-btn--danger-ghost cms-btn--sm" disabled={actioningId === item.id} onClick={() => setDeleteItem(item)} data-testid={`delete-btn-${item.id}`}><Trash2 size={15} /> Delete record</button>}
            </div></footer>
          </article>)}
        </div>}
      </section>

      {openApprove && approveItem && <Modal title="Verify and approve question" icon={<Check size={17} />} onClose={() => setApproveItem(null)} wide>
        <form onSubmit={approve}>
          <div className="cms-modal-body">
            <div className="cms-quote"><small>Submitted question</small>{approveItem.question}</div>
            <div className="cms-alert cms-alert--warn"><AlertTriangle size={17} /><span>Review the details carefully. Only the answer you confirm below will be added to the live knowledge base.</span></div>
            <Field label="Category"><select className="cms-select" value={formModule} onChange={(e) => setFormModule(e.target.value)}>{MODULE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Sub intent"><input className="cms-input" required value={formSubIntent} onChange={(e) => setFormSubIntent(e.target.value)} placeholder="e.g. library, wifi, hostel" /></Field>
            <Field label="Question"><input className="cms-input" required value={question} onChange={(e) => setQuestion(e.target.value)} /></Field>
            <Field label="Verified answer"><textarea className="cms-textarea" required rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write a checked, helpful answer…" /></Field>
            <Field label="Keywords" hint="Comma-separated terms that help match student phrasing."><input className="cms-input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="library, opening times, study" /></Field>
          </div>
          <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setApproveItem(null)}>Cancel</button><button type="submit" className="cms-btn cms-btn--success" disabled={actioningId === approveItem.id || !isSupabaseConfigured}>{actioningId === approveItem.id ? "Saving…" : "Add answer and approve"}</button></div>
        </form>
      </Modal>}
      {deleteItem && <Modal title="Delete suggestion permanently?" icon={<Trash2 size={17} />} tone="danger" onClose={() => setDeleteItem(null)}>
        <div className="cms-modal-body"><p>This removes the suggestion record from the review history.</p><div className="cms-quote">{deleteItem.question}</div></div>
        <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setDeleteItem(null)}>Cancel</button><button type="button" className="cms-btn cms-btn--accent" disabled={actioningId === deleteItem.id} onClick={() => void remove()}>{actioningId === deleteItem.id ? "Deleting…" : "Delete permanently"}</button></div>
      </Modal>}
      <Toast toast={toast} />
    </main>
  );
}
