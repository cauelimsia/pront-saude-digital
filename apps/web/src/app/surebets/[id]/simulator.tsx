"use client";

import { useState } from "react";
import { simulate, type SimulationResult } from "@/lib/api";
import { formatMoney, outcomeLabel } from "@/lib/format";

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
    <section className="rounded-lg border border-surface-border bg-surface-raised p-4">
      <h3 className="text-sm font-semibold text-white">Simulador de banca</h3>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min="1"
          step="any"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          aria-label="Banca total"
          className="w-40 rounded border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-emerald-600"
        />
        <button
          onClick={() => void run()}
          disabled={busy || !stake || Number(stake) <= 0}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Calculando..." : "Simular distribuição"}
        </button>
      </div>

      {error && <p className="mt-3 break-all text-xs text-rose-400">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <div
            className={`rounded px-3 py-2 text-xs ${
              result.viable
                ? "bg-emerald-950/50 text-emerald-300"
                : "bg-amber-950/50 text-amber-300"
            }`}
          >
            {result.viable
              ? `Viável — pior lucro ${formatMoney(result.worstProfit)} (${Number(result.profitPercentAfterRounding).toFixed(2)}% da banca alocada)`
              : `Inviável após arredondamento/limites (${result.viability})`}
          </div>
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-slate-500">
              <tr>
                <th className="py-1">Seleção</th>
                <th className="py-1">Casa</th>
                <th className="py-1 text-right">Stake</th>
                <th className="py-1 text-right">Retorno</th>
                <th className="py-1 text-right">Lucro se vencer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {result.legs.map((leg) => (
                <tr key={leg.selectionKey}>
                  <td className="py-2 text-white">{outcomeLabel(leg.selectionKey)}</td>
                  <td className="py-2 text-slate-400">{leg.bookmakerKey}</td>
                  <td className="py-2 text-right">{formatMoney(leg.roundedStake)}</td>
                  <td className="py-2 text-right">{formatMoney(leg.grossReturn)}</td>
                  <td className="py-2 text-right text-emerald-300">
                    {formatMoney(leg.profitIfWins)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-600">{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
