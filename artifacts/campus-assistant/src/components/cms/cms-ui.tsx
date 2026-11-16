import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";

export const MODULE_OPTIONS = [
  { value: "campus_life", label: "Campus Life" },
  { value: "academic_navigation", label: "Academic Navigation" },
  { value: "admin_directory", label: "Admin Directory" },
  { value: "general", label: "General" },
];

export function moduleLabel(module: string | null | undefined): string {
  if (!module) return "General";
  const known = MODULE_OPTIONS.find((m) => m.value === module);
  if (known) return known.label;
  return module
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function moduleTone(module: string | null | undefined): string {
  switch (module) {
    case "campus_life":
      return "blue";
    case "academic_navigation":
      return "red";
    case "admin_directory":
      return "gold";
    default:
      return "slate";
  }
}

export function ModuleBadge({ module }: { module: string | null | undefined }) {
  return (
    <span className={`cms-badge cms-badge--${moduleTone(module)}`}>
      <i aria-hidden="true" />
      {moduleLabel(module)}
    </span>
  );
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="cms-page-head">
      <div>
        <span className="cms-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="cms-page-actions">{actions}</div>}
    </header>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="cms-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="cms-skeleton-row" style={{ animationDelay: `${i * 70}ms` }}>
          <span style={{ width: "14%" }} />
          <span style={{ width: `${38 + ((i * 17) % 30)}%` }} />
          <span style={{ width: "22%" }} />
        </div>
      ))}
    </div>
  );
}

export function StateBlock({
  icon,
  title,
  message,
  tone = "neutral",
  action,
}: {
  icon: ReactNode;
  title: string;
  message?: ReactNode;
  tone?: "neutral" | "error";
  action?: ReactNode;
}) {
  return (
    <div className={`cms-state cms-state--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <span className="cms-state-icon">{icon}</span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="cms-state-action">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <StateBlock
      tone="error"
      icon={<AlertTriangle size={20} />}
      title={title}
      message={message}
      action={
        <button type="button" className="cms-btn cms-btn--ghost" onClick={onRetry} data-testid="button-retry">
          <RefreshCw size={15} /> Try again
        </button>
      }
    />
  );
}

export function Modal({
  title,
  icon,
  tone = "default",
  onClose,
  children,
  wide,
}: {
  title: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cms-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cms-modal ${wide ? "cms-modal--wide" : ""} cms-modal--${tone}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cms-modal-head">
          {icon && <span className="cms-modal-icon">{icon}</span>}
          <h2>{title}</h2>
          <button type="button" className="cms-icon-btn" onClick={onClose} aria-label="Close dialog" data-testid="button-close-modal">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="cms-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export type ToastState = { message: string; type: "success" | "error" } | null;

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className={`cms-toast cms-toast--${toast.type}`} role="status" data-testid="status-toast">
      {toast.type === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
      <span>{toast.message}</span>
    </div>
  );
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
