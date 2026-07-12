"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Clock,
  Coins,
  FileText,
  History,
  Percent,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSurebet, type Surebet } from "@/lib/api";
import {
  formatDateTime,
  formatMoney,
  formatPercent,
  marketLabel,
  outcomeLabel,
} from "@/lib/format";
import { Badge, Card, ConfidenceMeter } from "@/components/ui";
import { SportIcon } from "@/components/sport-icon";
import { Simulator } from "./simulator";

export default function SurebetDetailPage() {
  const params = useParams<{ id: string }>();
  const [surebet, setSurebet] = useState<Surebet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSurebet(params.id)
      .then(setSurebet)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [params.id]);

  if (error) {
    return (
      <Card className="border-status-critical/30 bg-status-critical/[0.04] p-6 text-sm">
        <div className="flex items-start gap-3">
          <CircleAlert size={20} className="mt-0.5 text-status-critical" />
          <div>
            <p className="font-semibold text-ink-primary">Não foi possível carregar a oportunidade</p>
            <p className="mt-1 break-all text-ink-muted">{error}</p>
            <Link href="/" className="mt-3 inline-block text-cat-blue hover:underline">
              ← Voltar para a lista
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  if (!surebet) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  const explanation = surebet.explanation as {
    confidence?: {
      positiveFactors?: Array<{ label: string }>;
      negativeFactors?: Array<{ label: string }>;
    };
    detection?: { formula?: string; inverseSum?: string };
    matching?: { providerKeys?: string[]; minMatchScore?: number; manualMatch?: boolean };
  } | null;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-secondary"
      >
        <ArrowLeft size={15} /> Oportunidades
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-overlay">
            <SportIcon sportKey={surebet.sport.key} size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-primary sm:text-2xl">
              {surebet.event.home} <span className="text-ink-muted">×</span> {surebet.event.away}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {surebet.sport.name} · {surebet.competition.name} ·{" "}
              {formatDateTime(surebet.event.startsAt)} · {marketLabel(surebet.market)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="good" icon={BadgeCheck}>
                {surebet.status}
              </Badge>
              {surebet.providerCount > 1 && (
                <Badge tone="violet" icon={Users}>
                  {surebet.providerCount} provedores · match {surebet.minMatchScore ?? 100}
                </Badge>
              )}
              {surebet.manualMatch && (
                <Badge tone="aqua" icon={ShieldCheck}>
                  associação verificada
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
            <Percent size={12} /> Margem teórica
          </p>
          <p className="tnum mt-1.5 text-2xl font-bold text-status-good">
            {formatPercent(surebet.profitPercent)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
            <Coins size={12} /> Pior lucro · banca {formatMoney(surebet.referenceStake)}
          </p>
          <p className="tnum mt-1.5 text-2xl font-bold text-ink-primary">
            {formatMoney(surebet.worstProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
            <Clock size={12} /> Confiança operacional
          </p>
          <div className="mt-1.5">
            <ConfidenceMeter score={surebet.confidenceScore} />
          </div>
        </Card>
      </div>

      {/* Pernas */}
      <Card className="overflow-hidden">
        <h2 className="border-b border-surface-border px-4 py-3 text-sm font-semibold text-ink-primary">
          Pernas da oportunidade
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-[11px] uppercase text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Seleção</th>
                <th className="px-4 py-2.5 font-medium">Casa</th>
                <th className="px-4 py-2.5 text-right font-medium">Odd</th>
                <th className="px-4 py-2.5 text-right font-medium">Stake sugerida</th>
                <th className="px-4 py-2.5 text-right font-medium">Retorno bruto</th>
                <th className="px-4 py-2.5 text-right font-medium">Coletada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {surebet.legs.map((leg) => (
                <tr key={leg.selection}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink-primary">
                      {outcomeLabel(leg.selection)}
                    </span>{" "}
                    <span className="text-xs text-ink-muted">({leg.selectionName})</span>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{leg.bookmaker.name}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold text-cat-blue">
                    {leg.odd}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ink-secondary">
                    {formatMoney(leg.suggestedStake)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ink-secondary">
                    {formatMoney(leg.grossReturn)}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-xs text-ink-muted">
                    {formatDateTime(leg.oddsCollectedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Simulator opportunityId={surebet.id} />

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <FileText size={15} className="text-ink-muted" /> Explicação auditável
            </h3>
            <p className="tnum mt-2 rounded-lg bg-surface-overlay px-3 py-2 font-mono text-xs text-ink-secondary">
              {explanation?.detection?.formula ?? "inverseSum = Σ(1/odd_i) < 1"}
              <br />
              inverseSum = {Number(surebet.inverseSum).toFixed(6)}
            </p>
            <div className="mt-3 space-y-1">
              {explanation?.confidence?.positiveFactors?.map((f) => (
                <p key={f.label} className="text-xs text-status-good/90">
                  + {f.label}
                </p>
              ))}
              {explanation?.confidence?.negativeFactors?.map((f) => (
                <p key={f.label} className="text-xs text-status-warning/90">
                  − {f.label}
                </p>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
              <History size={15} className="text-ink-muted" /> Revalidações recentes
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs">
              {surebet.validations.map((v) => (
                <li key={v.at} className="flex items-center justify-between">
                  <Badge tone={v.result === "CONFIRMED" ? "good" : "warning"}>{v.result}</Badge>
                  <span className="tnum text-ink-muted">{formatDateTime(v.at)}</span>
                </li>
              ))}
              {surebet.validations.length === 0 && (
                <li className="text-ink-muted">Nenhuma revalidação registrada.</li>
              )}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              Expira em {formatDateTime(surebet.expiresAt)} sem reconfirmação.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
