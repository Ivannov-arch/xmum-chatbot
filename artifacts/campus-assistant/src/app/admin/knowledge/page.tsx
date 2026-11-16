"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search, Trash2, Pencil, CircleHelp } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { createKnowledgeItem, deleteKnowlegeItem, getKnowledgeItems, updateKnowledgeItem } from "@/services/knowledgeService";
import { ErrorState, Field, Modal, ModuleBadge, MODULE_OPTIONS, PageHeader, SkeletonRows, StateBlock, Toast, errorMessage, type ToastState } from "@/components/cms/cms-ui";
import "../cms.css";

interface KnowledgeItem {
  id: string;
  module: string;
  question: string;
  answer: string;
  keywords: string[] | null;
}

type FormMode = "add" | "edit";
const PAGE_SIZE = 20;

export default function KnowledgeBaseCMS() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [page, setPage] = useState(1);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [current, setCurrent] = useState<KnowledgeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formModule, setFormModule] = useState("campus_life");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    if (!isSupabaseConfigured) {
      setItems([]);
      setLoadError("Supabase is not configured. Connect the existing database to load knowledge records.");
      setLoading(false);
      return;
    }
    try {
      const data = await getKnowledgeItems();
      if (!Array.isArray(data)) throw new Error("The knowledge service returned an unexpected response.");
      setItems(data as KnowledgeItem[]);
    } catch (err) {
      setItems([]);
      setLoadError(errorMessage(err, "Unable to load knowledge records."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const textMatch = !q || [item.question, item.answer, ...(item.keywords || [])].some((value) => value.toLowerCase().includes(q));
      return textMatch && (module === "all" || item.module === module);
    });
  }, [items, search, module]);
  useEffect(() => { setPage(1); }, [search, module]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openForm = (mode: FormMode, item?: KnowledgeItem) => {
    setCurrent(item || null);
    setFormMode(mode);
    setFormModule(item?.module || "campus_life");
    setQuestion(item?.question || "");
    setAnswer(item?.answer || "");
    setKeywords((item?.keywords || []).join(", "));
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    const keywordsArray = keywords.split(",").map((word) => word.trim()).filter(Boolean);
    try {
      if (formMode === "edit" && current) {
        await updateKnowledgeItem({ id: current.id, module: formModule, question: question.trim(), answer: answer.trim(), keywordsArray });
        notify("Knowledge entry updated.");
      } else {
        await createKnowledgeItem({ module: formModule, question: question.trim(), answer: answer.trim(), keywordsArray });
        notify("Knowledge entry added.");
      }
      setFormMode(null);
      await load();
    } catch (err) {
      notify(errorMessage(err, `Unable to ${formMode === "edit" ? "update" : "add"} this entry.`), "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteKnowlegeItem(deleteTarget.id);
      setDeleteTarget(null);
      notify("Knowledge entry deleted.");
      await load();
    } catch (err) {
      notify(errorMessage(err, "Unable to delete this entry."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="cms-page">
      <PageHeader eyebrow="Trusted answers" title="Knowledge base" description="Maintain the answers and keywords that Captain Kah Kee uses to guide students." actions={<button type="button" className="cms-btn cms-btn--primary" onClick={() => openForm("add")} data-testid="button-add-knowledge"><Plus size={17} /> Add Q&amp;A</button>} />
      <div className="cms-toolbar">
        <div className="cms-search"><Search size={17} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions, answers, or keywords" aria-label="Search knowledge base" data-testid="input-search-knowledge" />{search && <button type="button" className="cms-icon-btn cms-search-clear" aria-label="Clear search" onClick={() => setSearch("")}>×</button>}</div>
        <select className="cms-select" aria-label="Filter by category" value={module} onChange={(e) => setModule(e.target.value)} data-testid="select-knowledge-category">
          <option value="all">All categories</option>{MODULE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {module !== "all" && <button type="button" className="cms-linkbtn" onClick={() => setModule("all")}>Clear filter</button>}
      </div>
      <div className="cms-resultbar"><span>{loading ? "Loading knowledge entries…" : loadError ? "Records unavailable" : <><b>{filtered.length}</b> {filtered.length === 1 ? "entry" : "entries"}{search || module !== "all" ? " match your filters" : " in the knowledge base"}</>}</span>{(search || module !== "all") && <button className="cms-linkbtn" type="button" onClick={() => { setSearch(""); setModule("all"); }}>Reset filters</button>}</div>
      <section className="cms-panel" aria-live="polite">
        {loading ? <SkeletonRows /> : loadError ? <ErrorState title="Knowledge records could not be loaded" message={loadError} onRetry={() => void load()} /> : filtered.length === 0 ? (
          <StateBlock icon={<CircleHelp size={21} />} title={items.length ? "No entries match these filters" : "Knowledge base is empty"} message={items.length ? "Try another keyword or category, or reset your filters." : "Add the first approved question and answer to start building the campus guide."} action={items.length ? <button type="button" className="cms-btn cms-btn--ghost" onClick={() => { setSearch(""); setModule("all"); }}>Reset filters</button> : <button type="button" className="cms-btn cms-btn--primary" onClick={() => openForm("add")}><Plus size={16} /> Add Q&amp;A</button>} />
        ) : (
          <div className="cms-table-wrap"><table className="cms-table">
            <thead><tr><th style={{ width: 55 }}>No.</th><th style={{ width: 170 }}>Category</th><th style={{ width: 260 }}>Question</th><th>Answer</th><th style={{ width: 210 }}>Keywords</th><th style={{ width: 96, textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>{pageItems.map((item, index) => <tr key={item.id} data-testid={`row-knowledge-${item.id}`}>
              <td className="cms-num">{(page - 1) * PAGE_SIZE + index + 1}</td>
              <td><ModuleBadge module={item.module} /></td>
              <td className="cms-q">{item.question}</td>
              <td className="cms-a">{item.answer}</td>
              <td><div className="cms-tags">{item.keywords?.length ? item.keywords.map((keyword, i) => <span className="cms-tag" key={`${keyword}-${i}`}>{keyword}</span>) : <span className="cms-none">No keywords</span>}</div></td>
              <td><div className="cms-row-actions"><button type="button" className="cms-icon-btn" aria-label={`Edit ${item.question}`} title="Edit entry" onClick={() => openForm("edit", item)} data-testid={`button-edit-knowledge-${item.id}`}><Pencil size={16} /></button><button type="button" className="cms-icon-btn cms-icon-btn--danger" aria-label={`Delete ${item.question}`} title="Delete entry" onClick={() => setDeleteTarget(item)} data-testid={`button-delete-knowledge-${item.id}`}><Trash2 size={16} /></button></div></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
      {!loading && !loadError && filtered.length > 0 && <div className="cms-pager"><span>Showing <b>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b></span><div className="cms-pager-btns"><button type="button" className="cms-btn cms-btn--ghost cms-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={15} /> Previous</button><span>Page <b>{page}</b> of <b>{pages}</b></span><button type="button" className="cms-btn cms-btn--ghost cms-btn--sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next <ChevronRight size={15} /></button></div></div>}

      {formMode && <Modal title={formMode === "add" ? "Add knowledge entry" : "Edit knowledge entry"} icon={formMode === "add" ? <Plus size={17} /> : <Pencil size={16} />} onClose={() => setFormMode(null)} wide>
        <form onSubmit={submitForm}>
          <div className="cms-modal-body">
            <Field label="Category"><select className="cms-select" value={formModule} onChange={(e) => setFormModule(e.target.value)}>{MODULE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Question"><input className="cms-input" required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Write the question as a student would ask it" /></Field>
            <Field label="Approved answer" hint="Use specific, current details. Avoid assumptions where policy may change."><textarea className="cms-textarea" rows={5} required value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write a clear, useful answer…" /></Field>
            <Field label="Search keywords" hint="Separate keywords with commas. These help match different ways students phrase a question."><input className="cms-input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="library, opening hours, study space" /></Field>
          </div>
          <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setFormMode(null)}>Cancel</button><button type="submit" className="cms-btn cms-btn--primary" disabled={saving || !isSupabaseConfigured}>{saving ? "Saving…" : formMode === "add" ? "Add to knowledge base" : "Save changes"}</button></div>
        </form>
      </Modal>}
      {deleteTarget && <Modal title="Delete knowledge entry?" icon={<Trash2 size={17} />} tone="danger" onClose={() => setDeleteTarget(null)}>
        <div className="cms-modal-body"><p>This removes the answer from the live campus guide. This action cannot be undone.</p><div className="cms-quote">{deleteTarget.question}</div></div>
        <div className="cms-modal-foot"><button type="button" className="cms-btn cms-btn--ghost" onClick={() => setDeleteTarget(null)}>Keep entry</button><button type="button" className="cms-btn cms-btn--accent" disabled={saving} onClick={() => void confirmDelete()}>{saving ? "Deleting…" : "Delete permanently"}</button></div>
      </Modal>}
      <Toast toast={toast} />
    </main>
  );
}
