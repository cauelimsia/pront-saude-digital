export function marketLabel(market: { type: string; line: string | null }): string {
  switch (market.type) {
    case "MATCH_WINNER_2WAY":
      return "Vencedor (2 vias)";
    case "ONE_X_TWO":
      return "Resultado 1X2";
    case "TOTALS":
      return `Totais ${market.line ?? ""}`.trim();
    case "BTTS":
      return "Ambas marcam";
    default:
      return market.type;
  }
}

export function outcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    HOME: "Casa",
    AWAY: "Fora",
    DRAW: "Empate",
    OVER: "Mais de",
    UNDER: "Menos de",
    YES: "Sim",
    NO: "Não",
  };
  return labels[outcome] ?? outcome;
}

export function formatPercent(value: string | number, digits = 2): string {
  return `${Number(value).toFixed(digits)}%`;
}

export function formatMoney(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function confidenceTone(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 border-emerald-700/40";
  if (score >= 60) return "bg-sky-500/15 text-sky-300 border-sky-700/40";
  if (score >= 40) return "bg-amber-500/15 text-amber-300 border-amber-700/40";
  return "bg-rose-500/15 text-rose-300 border-rose-700/40";
}
