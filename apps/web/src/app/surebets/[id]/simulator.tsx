"use client";

import { useState } from "react";
import { Calculator, CircleCheck, TriangleAlert } from "lucide-react";
import { simulate, type SimulationResult } from "@/lib/api";
import { formatMoney, outcomeLabel } from "@/lib/format";
import { Card } from "@/components/ui";

/**
 * Simulador de banca: envia o valor à API, que recalcula a distribuição com o
 * motor de arbitragem no backend — a interface não refaz a matemática.
 */
export function Simulator({ opportunityId }: { opportunityId: string }) {
  const [stake, setStake] = useState("1000");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await simulate(opportunityId, { totalStake: stake }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na simulação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-primary">
        <Calculator size={15} className="text-ink-muted" /> Simulador de banca
      </h3>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            R$
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            aria-label="Banca total"
            className="tnum w-full rounded-lg border border-surface-border bg-surface-overlay py-2 pl-9 pr-3 text-sm text-ink-primary outline-none transition-colors focus:border-cat-blue"
          />
        </div>
        <button
          onClick={() => void run()}
          disabled={busy || !stake || Number(stake) <= 0}
          className="rounded-lg bg-cat-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-50"
        >
          {busy ? "Calculando…" : "Simular"}
        </button>
      </div>

      {error && <p className="mt-3 break-all text-xs text-status-critical">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <div
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              result.viable
                ? "bg-status-good/10 text-status-good"
                : "bg-status-warning/10 text-status-warning"
            }`}
          >
            {result.viable ? (
              <CircleCheck size={15} className="mt-0.5 shrink-0" />
            ) : (
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            )}
            <span>
              {result.viable
                ? `Viável — pior lucro ${formatMoney(result.worstProfit)} (${Number(result.profitPercentAfterRounding).toFixed(2)}% da banca alocada)`
                : `Inviável após arredondamento/limites (${result.viability})`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase text-ink-muted">
                  <th className="py-1.5 font-medium">Seleção</th>
                  <th className="py-1.5 font-medium">Casa</th>
                  <th className="py-1.5 text-right font-medium">Stake</th>
                  <th className="py-1.5 text-right font-medium">Retorno</th>
                  <th className="py-1.5 text-right font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {result.legs.map((leg) => (
                  <tr key={leg.selectionKey}>
                    <td className="py-2 text-ink-primary">{outcomeLabel(leg.selectionKey)}</td>
                    <td className="py-2 text-ink-muted">{leg.bookmakerKey}</td>
                    <td className="tnum py-2 text-right text-ink-secondary">
                      {formatMoney(leg.roundedStake)}
                    </td>
                    <td className="tnum py-2 text-right text-ink-secondary">
                      {formatMoney(leg.grossReturn)}
                    </td>
                    <td className="tnum py-2 text-right text-status-good">
                      {formatMoney(leg.profitIfWins)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-muted">{result.disclaimer}</p>
        </div>
      )}
    </Card>
  );
}
