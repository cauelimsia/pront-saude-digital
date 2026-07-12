import { Volleyball, Trophy, Dribbble, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  football: Trophy,
  tennis: Volleyball,
  basketball: Dribbble,
};

export function SportIcon({ sportKey, size = 15 }: { sportKey: string; size?: number }) {
  const Icon = MAP[sportKey] ?? Trophy;
  return <Icon size={size} strokeWidth={2} className="text-ink-muted" />;
}
