"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, GitCompareArrows, Inbox, ServerCog } from "lucide-react";
import {
  decideReview,
  listReviews,
  type MatchReview,
  type ReviewList,
} from "@/lib/api";
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from "@/components/ui";
import { useAuth } from "@/components/auth-context";
import { ReviewCard } from "./review-card";

const TABS = [
  { key: "PENDING", label: "Pendentes" },
  { key: "APPROVED", label: "Aprovadas" },
  { key: "REJECTED", label: "Rejeitadas" },
];

export default function MatchingReviewPage() {
  const { user, isReviewer } = useAuth();
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-cat-violet">
            <GitCompareArrows size={13} /> Correspondência de eventos
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
            Revisão de matching
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Associações ambíguas entre provedores que exigem verificação humana. O score é
            calculado pela API — a interface apenas exibe a explicação.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-surface-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === t.key
                  ? "bg-surface-overlay text-ink-primary"
                  : "text-ink-muted hover:text-ink-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <Card className="border-status-good/25 bg-status-good/[0.06] p-3">
          <p className="flex items-center gap-2 text-sm text-status-good">
            <CheckCircle2 size={16} /> {feedback}
          </p>
        </Card>
      )}

      {loading && (
        <Card className="p-4">
          <SkeletonRows rows={2} />
        </Card>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void refresh()} icon={ServerCog} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={`Nenhuma revisão ${status === "PENDING" ? "pendente" : status === "APPROVED" ? "aprovada" : "rejeitada"}`}
          description="Correspondências de alta confiança são aprovadas automaticamente; as incompatíveis são rejeitadas pelo algoritmo."
        />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={busyId === review.id}
              canDecide={isReviewer}
              onDecide={decide}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {isReviewer ? (
          <>
            <Badge tone="aqua">RBAC ativo</Badge>
            Você está autenticado como {user?.role} — pode aprovar ou rejeitar associações.
          </>
        ) : (
          <>
            <Badge tone="neutral">somente leitura</Badge>
            Apenas Analistas e Admins podem decidir revisões. Seu papel atual é {user?.role}.
          </>
        )}
      </div>
    </div>
  );
}
