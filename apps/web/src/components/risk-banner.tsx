import { TriangleAlert } from "lucide-react";

/** Aviso de risco global obrigatório (compliance). */
export function RiskBanner() {
  return (
    <div className="border-b border-status-warning/15 bg-status-warning/[0.06]">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-status-warning/90 sm:px-6">
        <TriangleAlert size={14} className="shrink-0" />
        <p>
          Odds mudam rapidamente e mercados podem ser suspensos. Uma oportunidade matemática
          detectada não é garantia de lucro — apostas envolvem risco financeiro. Verifique a
          legislação local e os termos das plataformas.
        </p>
      </div>
    </div>
  );
}
