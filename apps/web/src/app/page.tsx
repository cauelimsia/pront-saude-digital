"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, listSurebets, type SurebetList } from "@/lib/api";
import {
  confidenceTone,
  formatDateTime,
  formatMoney,
  formatPercent,
  marketLabel,
} from "@/lib/format";

type ConnectionState = "connecting" | "live" | "reconnecting";

export default function DashboardPage() {
  const [data, setData] = useState<SurebetList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await listSurebets({ status: "ACTIVE" });
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao consultar a API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Tempo real: SSE alimentado pelo worker via Redis pub/sub.
    // Em qualquer evento de oportunidade, recarrega a lista (payload pequeno).
    const source = new EventSource(`${API_URL}/surebets/stream`);
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection("reconnecting"); // EventSource reconecta sozinho
    source.onmessage = (message) => {
      setLastEventAt(new Date().toLocaleTimeString("pt-BR"));
      try {
        JSON.parse(message.data);
      } catch {
        return;
      }
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refresh(), 300);
    };

    // Rede de segurança para dados desatualizados sem eventos.
    const poll = setInterval(() => void refresh(), 30000);
    return () => {
      source.close();
      clearInterval(poll);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Oportunidades ativas</h1>
          <p className="text-sm text-slate-400">
            Oportunidades matemáticas detectadas e revalidadas — sujeitas a mudanças de odds.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connection === "live"
                ? "bg-emerald-400"
                : connection === "reconnecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-slate-500"
            }`}
          />
          <span className="text-slate-400">
            {connection === "live"
              ? `Tempo real conectado${lastEventAt ? ` · último evento ${lastEventAt}` : ""}`
              : connection === "reconnecting"
                ? "Reconectando ao tempo real..."
                : "Conectando..."}
          </span>
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-10 text-center text-slate-400">
          Carregando oportunidades...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-6 text-sm text-rose-300">
          <p className="font-semibold">Falha ao carregar dados da API.</p>
          <p className="mt-1 break-all text-rose-400/80">{error}</p>
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
          <p className="text-slate-300">Nenhuma oportunidade ativa neste momento.</p>
          <p className="mt-1 text-sm text-slate-500">
            O worker segue coletando odds — novas oportunidades aparecem aqui automaticamente.
          </p>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Mercado</th>
                <th className="px-4 py-3 text-right">Margem</th>
                <th className="px-4 py-3 text-right">Pior lucro*</th>
                <th className="px-4 py-3 text-center">Confiança</th>
                <th className="px-4 py-3 text-right">Idade odd</th>
                <th className="px-4 py-3">Casas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-raised/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {item.event.home} × {item.event.away}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.sport.name} · {item.competition.name} ·{" "}
                      {formatDateTime(item.event.startsAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{marketLabel(item.market)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                    {formatPercent(item.profitPercent)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-300">
                    {formatMoney(item.worstProfit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs ${confidenceTone(item.confidenceScore)}`}
                    >
                      {item.confidenceScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {item.oddsAgeSeconds}s
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {[...new Set(item.legs.map((l) => l.bookmaker.name))].join(" + ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/surebets/${item.id}`}
                      className="rounded bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30"
                    >
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-600">
        * Pior lucro para a banca de referência após arredondamento das stakes, recalculado a
        cada revalidação. Retornos estimados, sujeitos a revalidação.
      </p>
    </div>
  );
}
