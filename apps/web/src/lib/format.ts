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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Idade legível: 8s, 2min, 1h12. */
export function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export type ConfidenceBand = "high" | "moderate" | "elevated" | "hidden";

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return "high";
  if (score >= 60) return "moderate";
  if (score >= 40) return "elevated";
  return "hidden";
}

export function confidenceLabel(score: number): string {
  const map: Record<ConfidenceBand, string> = {
    high: "Alta",
    moderate: "Moderada",
    elevated: "Risco elevado",
    hidden: "Baixa",
  };
  return map[confidenceBand(score)];
}

/** Ícone lucide por chave de esporte. */
export function sportIcon(sportKey: string): string {
  const map: Record<string, string> = {
    football: "Goal",
    tennis: "Volleyball",
    basketball: "Dribbble",
  };
  return map[sportKey] ?? "Trophy";
}
