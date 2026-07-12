"use client";

import { useCallback, useEffect, useState } from "react";
import {
  decideReview,
  listReviews,
  type MatchReview,
  type ReviewList,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ReviewCard } from "./review-card";

export default function MatchingReviewPage() {
  const [data, setData] = useState<ReviewList | null>(null);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listReviews(status));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao consultar a API");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(review: MatchReview, action: "approve" | "reject") {
    setBusyId(review.id);
    setFeedback(null);
    try {
      const result = await decideReview(review.id, action);
      setFeedback(
        `Revisão ${action === "approve" ? "aprovada" : "rejeitada"}${
          result.idempotent ? " (já estava nesse estado)" : ""
        }.`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao decidir");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Revisão de correspondências</h1>
          <p className="text-sm text-slate-400">
            Associações ambíguas entre provedores que exigem verificação humana. A decisão de
            score vem da API — a interface apenas exibe a explicação.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {["PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1.5 ${
                status === s
                  ? "bg-emerald-600/30 text-emerald-200"
                  : "bg-surface-raised text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="rounded border border-emerald-800/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
          {feedback}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-10 text-center text-slate-400">
          Carregando revisões...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-6 text-sm text-rose-300">
          <p className="break-all">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-3 rounded bg-rose-900/50 px-3 py-1.5 text-rose-200 hover:bg-rose-900"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-10 text-center">
          <p className="text-slate-300">Nenhuma revisão {status.toLowerCase()}.</p>
          <p className="mt-1 text-sm text-slate-500">
            Correspondências de alta confiança são aprovadas automaticamente; incompatíveis são
            rejeitadas.
          </p>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={busyId === review.id}
              onDecide={decide}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600">
        Última atualização: {formatDateTime(new Date().toISOString())}. As ações de aprovar/rejeitar
        usam proteção temporária (Fase 4) e serão substituídas por autenticação com RBAC.
      </p>
    </div>
  );
}
