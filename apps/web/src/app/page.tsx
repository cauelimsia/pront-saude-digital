"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Gauge,
  Layers,
  Percent,
  ServerCog,
  Sparkles,
  Users,
} from "lucide-react";
import { API_URL, listSurebets, type SurebetList } from "@/lib/api";
import {
  formatAge,
  formatDateTime,
  formatMoney,
  formatPercent,
  marketLabel,
} from "@/lib/format";
import {
  Badge,
  Card,
  ConfidenceMeter,
  EmptyState,
  ErrorState,
  LiveIndicator,
  SkeletonRows,
  StatTile,
} from "@/components/ui";
import { SportIcon } from "@/components/sport-icon";

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
    const source = new EventSource(`${API_URL}/surebets/stream`);
    source.onopen = () => setConnection("live");
    source.onerror = () => setConnection("reconnecting");
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
    const poll = setInterval(() => void refresh(), 30000);
    return () => {
      source.close();
      clearInterval(poll);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  const items = data?.items ?? [];
  const bestMargin = items.reduce((m, i) => Math.max(m, Number(i.profitPercent)), 0);
  const avgConfidence =
    items.length > 0
      ? Math.round(items.reduce((s, i) => s + i.confidenceScore, 0) / items.length)
      : 0;
  const providerSet = new Set(items.flatMap((i) => i.providerKeys));
  const multiCount = items.filter((i) => i.providerCount > 1).length;

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-cat-blue">
            <Sparkles size={13} /> Painel de arbitragem
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
            Oportunidades ativas
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Detectadas e revalidadas pelo motor matemático — sujeitas a mudanças de odds.
          </p>
        </div>
        <LiveIndicator state={connection} lastEventAt={lastEventAt} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Oportunidades ativas"
          value={loading ? "—" : String(items.length)}
          icon={Activity}
          accent="brand"
          hint={multiCount > 0 ? `${multiCount} multi-provedor` : undefined}
        />
        <StatTile
          label="Melhor margem"
          value={loading ? "—" : formatPercent(bestMargin)}
          icon={Percent}
          accent="good"
        />
        <StatTile
          label="Confiança média"
          value={loading ? "—" : `${avgConfidence}`}
          icon={Gauge}
          hint="operacional (0–100)"
        />
        <StatTile
          label="Provedores"
          value={loading ? "—" : String(providerSet.size || 0)}
          icon={ServerCog}
          hint="fontes confirmando odds"
        />
      </div>

      {/* Conteúdo */}
      {loading && (
        <Card className="p-4">
          <SkeletonRows rows={4} />
        </Card>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void refresh()} icon={ServerCog} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Nenhuma oportunidade ativa agora"
          description="O worker segue coletando odds dos provedores — novas oportunidades aparecem aqui automaticamente, em tempo real."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Mercado</th>
                  <th className="px-4 py-3 text-right font-medium">Margem</th>
                  <th className="px-4 py-3 text-right font-medium">Pior lucro*</th>
                  <th className="px-4 py-3 font-medium">Confiança</th>
                  <th className="px-4 py-3 font-medium">Casas · provedores</th>
                  <th className="px-4 py-3 text-right font-medium">Idade</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {items.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-surface-hover/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-overlay">
                          <SportIcon sportKey={item.sport.key} />
                        </span>
                        <div>
                          <div className="font-medium text-ink-primary">
                            {item.event.home} <span className="text-ink-muted">×</span>{" "}
                            {item.event.away}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {item.competition.name} · {formatDateTime(item.event.startsAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{marketLabel(item.market)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="tnum inline-flex items-center gap-0.5 font-semibold text-status-good">
                        <ArrowUpRight size={14} />
                        {formatPercent(item.profitPercent)}
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-secondary">
                      {formatMoney(item.worstProfit)}
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceMeter score={item.confidenceScore} compact />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
                          <Building2 size={12} className="text-ink-muted" />
                          {[...new Set(item.legs.map((l) => l.bookmaker.name))].join(" + ")}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.providerCount > 1 && (
                            <Badge tone="violet" icon={Users} title="Odds combinadas entre provedores">
                              {item.providerCount} provedores · match {item.minMatchScore ?? 100}
                            </Badge>
                          )}
                          {item.manualMatch && (
                            <Badge tone="aqua" title="Associação verificada por revisão humana">
                              match manual
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-muted">
                      {formatAge(item.oddsAgeSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/surebets/${item.id}`}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-surface-overlay px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors group-hover:bg-cat-blue/15 group-hover:text-cat-blue"
                      >
                        Detalhes <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-ink-muted">
        * Pior lucro para a banca de referência após arredondamento das stakes, recalculado a cada
        revalidação. Retornos estimados, sujeitos a revalidação.
      </p>
    </div>
  );
}
