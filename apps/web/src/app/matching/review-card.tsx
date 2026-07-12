"use client";

import { useState } from "react";
import type { MatchReview } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/** Realça em âmbar quando os dois lados divergem. */
function Diff({ label, left, right }: { label: string; left: string; right: string }) {
  const diff = left.trim().toLowerCase() !== right.trim().toLowerCase();
  return (
    <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-2 text-sm">
      <span className="text-xs uppercase text-slate-500">{label}</span>
      <span className="text-slate-200">{left}</span>
      <span className={diff ? "text-amber-300" : "text-slate-200"}>{right}</span>
    </div>
  );
}

export function ReviewCard({
  review,
  busy,
  onDecide,
}: {
  review: MatchReview;
  busy: boolean;
  onDecide: (review: MatchReview, action: "approve" | "reject") => void;
}) {
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const m = review.match;
  const pe = m.providerEvent;
  const ce = m.candidateEvent;
  const decided = review.status !== "PENDING";
  const timeDiffMin = Math.round(m.features.startTimeDifferenceSeconds / 60);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-surface px-2 py-1 text-xs text-slate-300">
            score {m.score}/100
          </span>
          <span className="rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
            {m.decision}
          </span>
          {m.reversedParticipants && (
            <span className="rounded bg-sky-500/15 px-2 py-1 text-xs text-sky-300">
              ordem invertida
            </span>
          )}
          <span className="text-xs text-slate-500">algoritmo v{m.algorithmVersion}</span>
        </div>
        <span className="text-xs text-slate-500">{formatDateTime(review.createdAt)}</span>
      </div>

      <div className="space-y-1.5 rounded border border-surface-border bg-surface p-3">
        <div className="grid grid-cols-[110px_1fr_1fr] gap-2 text-xs uppercase text-slate-500">
          <span />
          <span>Provedor: {pe.providerKey}</span>
          <span>Evento canônico candidato</span>
        </div>
        <Diff label="Mandante" left={pe.home ?? "—"} right={ce.home} />
        <Diff label="Visitante" left={pe.away ?? "—"} right={ce.away} />
        <Diff label="Competição" left={pe.competition ?? "—"} right={ce.competition} />
        <Diff
          label="Horário"
          left={pe.startsAt ? formatDateTime(pe.startsAt) : "—"}
          right={formatDateTime(ce.startsAt)}
        />
        <div className="grid grid-cols-[110px_1fr] gap-2 pt-1 text-sm">
          <span className="text-xs uppercase text-slate-500">Δ horário</span>
          <span className={timeDiffMin > 0 ? "text-amber-300" : "text-slate-200"}>
            {timeDiffMin} min · esporte {ce.sport}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-400/80">Fatores positivos</p>
          {m.explanation.positiveReasons.map((r) => (
            <p key={r.code} className="text-xs text-emerald-300/80">
              + {r.label}
            </p>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-amber-400/80">Fatores negativos</p>
          {m.explanation.negativeReasons.map((r) => (
            <p key={r.code} className="text-xs text-amber-300/80">
              − {r.label}
            </p>
          ))}
          {m.explanation.hardConflictReasons.map((r) => (
            <p key={r.code} className="text-xs text-rose-300">
              ✕ {r.label}
            </p>
          ))}
        </div>
      </div>

      {decided ? (
        <p className="mt-3 text-xs text-slate-500">
          {review.status} por {review.decidedBy ?? "—"}
          {review.decidedAt ? ` em ${formatDateTime(review.decidedAt)}` : ""}
          {review.note ? ` · "${review.note}"` : ""}
        </p>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-slate-400">
                Confirmar {confirming === "approve" ? "aprovação" : "rejeição"}?
              </span>
              <button
                disabled={busy}
                onClick={() => onDecide(review, confirming)}
                className={`rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                  confirming === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {busy ? "Processando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="rounded bg-surface px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirming("approve")}
                className="rounded bg-emerald-600/20 px-4 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30"
              >
                Aprovar associação
              </button>
              <button
                onClick={() => setConfirming("reject")}
                className="rounded bg-rose-600/20 px-4 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-600/30"
              >
                Rejeitar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
