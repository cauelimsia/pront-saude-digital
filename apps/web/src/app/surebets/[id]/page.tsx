"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSurebet, type Surebet } from "@/lib/api";
import {
  confidenceTone,
  formatDateTime,
  formatMoney,
  formatPercent,
  marketLabel,
  outcomeLabel,
} from "@/lib/format";
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
      <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-6 text-sm text-rose-300">
        <p>Não foi possível carregar a oportunidade.</p>
        <p className="mt-1 break-all text-rose-400/70">{error}</p>
        <Link href="/" className="mt-3 inline-block text-emerald-300 hover:underline">
          ← Voltar para a lista
        </Link>
      </div>
    );
  }

  if (!surebet) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-raised p-10 text-center text-slate-400">
        Carregando detalhes...
      </div>
    );
  }

  const explanation = surebet.explanation as {
    confidence?: {
      positiveFactors?: Array<{ label: string }>;
      negativeFactors?: Array<{ label: string }>;
    };
    detection?: { formula?: string; inverseSum?: string };
  } | null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Oportunidades
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            {surebet.event.home} × {surebet.event.away}
          </h1>
          <span className="rounded bg-surface-raised px-2 py-1 text-xs text-slate-300">
            {surebet.status}
          </span>
          <span
            className={`rounded border px-2 py-1 text-xs ${confidenceTone(surebet.confidenceScore)}`}
          >
            confiança operacional {surebet.confidenceScore}/100
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {surebet.sport.name} · {surebet.competition.name} ·{" "}
          {formatDateTime(surebet.event.startsAt)} · {marketLabel(surebet.market)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Margem teórica" value={formatPercent(surebet.profitPercent)} accent />
        <Stat
          label={`Pior lucro (banca ${formatMoney(surebet.referenceStake)})`}
          value={formatMoney(surebet.worstProfit)}
        />
        <Stat
          label="Validada em"
          value={surebet.lastValidatedAt ? formatDateTime(surebet.lastValidatedAt) : "—"}
        />
      </div>

      <section className="rounded-lg border border-surface-border">
        <h2 className="border-b border-surface-border bg-surface-raised px-4 py-3 text-sm font-semibold text-white">
          Pernas da oportunidade
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Seleção</th>
              <th className="px-4 py-2">Casa</th>
              <th className="px-4 py-2 text-right">Odd</th>
              <th className="px-4 py-2 text-right">Stake sugerida</th>
              <th className="px-4 py-2 text-right">Retorno bruto</th>
              <th className="px-4 py-2 text-right">Coletada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {surebet.legs.map((leg) => (
              <tr key={leg.selection}>
                <td className="px-4 py-3 text-white">
                  {outcomeLabel(leg.selection)}{" "}
                  <span className="text-xs text-slate-500">({leg.selectionName})</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{leg.bookmaker.name}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-300">{leg.odd}</td>
                <td className="px-4 py-3 text-right">{formatMoney(leg.suggestedStake)}</td>
                <td className="px-4 py-3 text-right">{formatMoney(leg.grossReturn)}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-500">
                  {formatDateTime(leg.oddsCollectedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Simulator opportunityId={surebet.id} />

        <section className="space-y-4">
          <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
            <h3 className="text-sm font-semibold text-white">Explicação auditável</h3>
            <p className="mt-2 font-mono text-xs text-slate-400">
              {explanation?.detection?.formula ?? "inverseSum = Σ(1/odd_i) < 1"} · inverseSum ={" "}
              {Number(surebet.inverseSum).toFixed(6)}
            </p>
            {explanation?.confidence?.positiveFactors?.map((f) => (
              <p key={f.label} className="mt-1 text-xs text-emerald-400/80">
                + {f.label}
              </p>
            ))}
            {explanation?.confidence?.negativeFactors?.map((f) => (
              <p key={f.label} className="mt-1 text-xs text-amber-400/80">
                − {f.label}
              </p>
            ))}
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
            <h3 className="text-sm font-semibold text-white">Revalidações recentes</h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {surebet.validations.map((v) => (
                <li key={v.at}>
                  <span
                    className={v.result === "CONFIRMED" ? "text-emerald-400" : "text-amber-400"}
                  >
                    {v.result}
                  </span>{" "}
                  · {formatDateTime(v.at)}
                </li>
              ))}
              {surebet.validations.length === 0 && <li>Nenhuma revalidação registrada.</li>}
            </ul>
            <p className="mt-3 text-xs text-slate-600">
              Expira em {formatDateTime(surebet.expiresAt)} sem reconfirmação.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
