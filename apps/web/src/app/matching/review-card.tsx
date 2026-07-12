"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Clock3,
  Minus,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import type { MatchReview } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { SportIcon } from "@/components/sport-icon";

/** Linha de comparação; realça em âmbar quando os dois lados divergem. */
function DiffRow({ label, left, right }: { label: string; left: string; right: string }) {
  const diff = left.trim().toLowerCase() !== right.trim().toLowerCase();
  return (
    <div className="grid grid-cols-[96px_1fr_1fr] items-center gap-2 py-1 text-sm">
      <span className="text-[11px] uppercase text-ink-muted">{label}</span>
      <span className="text-ink-secondary">{left}</span>
      <span className={diff ? "font-medium text-status-warning" : "text-ink-secondary"}>
        {right}
      </span>
    </div>
  );
}

export function ReviewCard({
  review,
  busy,
  canDecide,
  onDecide,
}: {
  review: MatchReview;
  busy: boolean;
  canDecide: boolean;
  onDecide: (review: MatchReview, action: "approve" | "reject") => void;
}) {
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const m = review.match;
  const pe = m.providerEvent;
  const ce = m.candidateEvent;
  const decided = review.status !== "PENDING";
  const timeDiffMin = Math.round(m.features.startTimeDifferenceSeconds / 60);

  return (
    <Card className="overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-surface-raised/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-overlay">
            <SportIcon sportKey={ce.sport === "Tênis" ? "tennis" : "football"} />
          </span>
          <span className="tnum rounded-md bg-surface-overlay px-2 py-0.5 text-xs font-semibold text-ink-primary">
            score {m.score}/100
          </span>
          <Badge tone={m.decision === "REVIEW_REQUIRED" ? "warning" : "neutral"}>
            {m.decision}
          </Badge>
          {m.reversedParticipants && (
            <Badge tone="brand" icon={ArrowLeftRight}>
              ordem invertida
            </Badge>
          )}
          <span className="text-xs text-ink-muted">algoritmo v{m.algorithmVersion}</span>
        </div>
        <span className="tnum text-xs text-ink-muted">{formatDateTime(review.createdAt)}</span>
      </div>

      <div className="p-4">
        {/* Comparação */}
        <div className="rounded-lg border border-surface-border bg-surface-overlay/40 px-3 py-2">
          <div className="grid grid-cols-[96px_1fr_1fr] gap-2 border-b border-surface-border pb-1.5 text-[11px] uppercase text-ink-muted">
            <span />
            <span className="text-cat-blue">Provedor · {pe.providerKey}</span>
            <span className="text-cat-aqua">Evento canônico</span>
          </div>
          <div className="divide-y divide-surface-border/60">
            <DiffRow label="Mandante" left={pe.home ?? "—"} right={ce.home} />
            <DiffRow label="Visitante" left={pe.away ?? "—"} right={ce.away} />
            <DiffRow label="Competição" left={pe.competition ?? "—"} right={ce.competition} />
            <DiffRow
              label="Horário"
              left={pe.startsAt ? formatDateTime(pe.startsAt) : "—"}
              right={formatDateTime(ce.startsAt)}
            />
          </div>
          <div className="mt-2 flex items-center gap-2 pt-1 text-xs">
            <Clock3 size={13} className="text-ink-muted" />
            <span className={timeDiffMin > 0 ? "text-status-warning" : "text-ink-secondary"}>
              Δ {timeDiffMin} min
            </span>
            <span className="text-ink-muted">· esporte {ce.sport}</span>
          </div>
        </div>

        {/* Fatores */}
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-status-good/80">
              Fatores positivos
            </p>
            <ul className="mt-1 space-y-0.5">
              {m.explanation.positiveReasons.map((r) => (
                <li key={r.code} className="flex items-start gap-1 text-xs text-status-good/90">
                  <Plus size={12} className="mt-0.5 shrink-0" /> {r.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-status-warning/80">
              Fatores negativos
            </p>
            <ul className="mt-1 space-y-0.5">
              {m.explanation.negativeReasons.map((r) => (
                <li key={r.code} className="flex items-start gap-1 text-xs text-status-warning/90">
                  <Minus size={12} className="mt-0.5 shrink-0" /> {r.label}
                </li>
              ))}
              {m.explanation.hardConflictReasons.map((r) => (
                <li key={r.code} className="flex items-start gap-1 text-xs text-status-critical">
                  <XCircle size={12} className="mt-0.5 shrink-0" /> {r.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ações */}
        {decided ? (
          <div className="mt-4 flex items-center gap-2 border-t border-surface-border pt-3 text-xs text-ink-muted">
            <Badge tone={review.status === "APPROVED" ? "good" : "critical"}>
              {review.status}
            </Badge>
            por {review.decidedBy ?? "—"}
            {review.decidedAt ? ` · ${formatDateTime(review.decidedAt)}` : ""}
            {review.note ? ` · "${review.note}"` : ""}
          </div>
        ) : !canDecide ? (
          <div className="mt-4 border-t border-surface-border pt-3 text-xs text-ink-muted">
            Aguardando decisão de um Analista ou Admin.
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 border-t border-surface-border pt-3">
            {confirming ? (
              <>
                <span className="text-xs text-ink-secondary">
                  Confirmar {confirming === "approve" ? "aprovação" : "rejeição"}?
                </span>
                <button
                  disabled={busy}
                  onClick={() => onDecide(review, confirming)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                    confirming === "approve"
                      ? "bg-status-good hover:brightness-110"
                      : "bg-status-critical hover:brightness-110"
                  }`}
                >
                  <Check size={13} /> {busy ? "Processando…" : "Confirmar"}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="rounded-lg bg-surface-overlay px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink-secondary"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirming("approve")}
                  className="inline-flex items-center gap-1 rounded-lg bg-status-good/15 px-4 py-1.5 text-xs font-medium text-status-good transition-colors hover:bg-status-good/25"
                >
                  <Check size={14} /> Aprovar associação
                </button>
                <button
                  onClick={() => setConfirming("reject")}
                  className="inline-flex items-center gap-1 rounded-lg bg-status-critical/15 px-4 py-1.5 text-xs font-medium text-status-critical transition-colors hover:bg-status-critical/25"
                >
                  <X size={14} /> Rejeitar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
