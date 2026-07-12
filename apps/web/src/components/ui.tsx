import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { confidenceBand, confidenceLabel } from "@/lib/format";

/** Cartão base com superfície elevada e borda hairline. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-surface-border bg-surface shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

/** Tile de KPI: rótulo, valor de destaque (proporcional), ícone e delta. */
export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "neutral" | "good" | "brand";
  hint?: string;
}) {
  const valueTone =
    accent === "good"
      ? "text-status-good"
      : accent === "brand"
        ? "text-cat-blue"
        : "text-ink-primary";
  const iconTone =
    accent === "good"
      ? "bg-status-good/10 text-status-good"
      : accent === "brand"
        ? "bg-cat-blue/10 text-cat-blue"
        : "bg-surface-overlay text-ink-muted";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {label}
          </p>
          <p className={`mt-1.5 text-2xl font-bold ${valueTone}`}>{value}</p>
          {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
    </Card>
  );
}

/** Badge genérico com tom configurável. */
export function Badge({
  children,
  tone = "neutral",
  icon: Icon,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warning" | "serious" | "critical" | "brand" | "aqua" | "violet";
  icon?: LucideIcon;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-overlay text-ink-secondary border-surface-border",
    good: "bg-status-good/12 text-status-good border-status-good/25",
    warning: "bg-status-warning/12 text-status-warning border-status-warning/25",
    serious: "bg-status-serious/12 text-status-serious border-status-serious/25",
    critical: "bg-status-critical/12 text-status-critical border-status-critical/25",
    brand: "bg-cat-blue/12 text-cat-blue border-cat-blue/25",
    aqua: "bg-cat-aqua/12 text-cat-aqua border-cat-aqua/25",
    violet: "bg-cat-violet/12 text-cat-violet border-cat-violet/25",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/**
 * Medidor de confiança operacional (0–100). Barra sequencial com a cor de
 * status da banda + rótulo. Status color nunca sozinho: sempre com número/label.
 */
export function ConfidenceMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const band = confidenceBand(score);
  const barTone: Record<string, string> = {
    high: "bg-status-good",
    moderate: "bg-cat-blue",
    elevated: "bg-status-warning",
    hidden: "bg-status-critical",
  };
  const textTone: Record<string, string> = {
    high: "text-status-good",
    moderate: "text-cat-blue",
    elevated: "text-status-warning",
    hidden: "text-status-critical",
  };
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-overlay">
          <div className={`h-full rounded-full ${barTone[band]}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`tnum text-xs font-semibold ${textTone[band]}`}>{score}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={`text-sm font-semibold ${textTone[band]}`}>
          {confidenceLabel(score)}
        </span>
        <span className={`tnum text-lg font-bold ${textTone[band]}`}>{score}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full ${barTone[band]} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/** Estado de conexão de tempo real (SSE). */
export function LiveIndicator({
  state,
  lastEventAt,
}: {
  state: "connecting" | "live" | "reconnecting";
  lastEventAt?: string | null;
}) {
  const dot =
    state === "live"
      ? "bg-status-good"
      : state === "reconnecting"
        ? "bg-status-warning animate-pulse"
        : "bg-ink-muted";
  const label =
    state === "live"
      ? `Tempo real${lastEventAt ? ` · ${lastEventAt}` : ""}`
      : state === "reconnecting"
        ? "Reconectando…"
        : "Conectando…";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-xs text-ink-secondary">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/** Skeletons de carregamento. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-lg" />
      ))}
    </div>
  );
}

/** Estado de erro com retry. */
export function ErrorState({
  message,
  onRetry,
  icon: Icon,
}: {
  message: string;
  onRetry: () => void;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-status-critical/30 bg-status-critical/[0.04] p-6 text-sm">
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-status-critical" />
        <div>
          <p className="font-semibold text-ink-primary">Falha ao carregar dados</p>
          <p className="mt-1 break-all text-ink-muted">{message}</p>
          <button
            onClick={onRetry}
            className="mt-3 rounded-lg bg-surface-overlay px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </Card>
  );
}

/** Estado vazio. */
export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-overlay text-ink-muted">
        <Icon size={22} />
      </span>
      <p className="mt-4 font-medium text-ink-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
    </Card>
  );
}
