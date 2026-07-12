import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { RiskBanner } from "@/components/risk-banner";

export const metadata: Metadata = {
  title: "Rataria — Detecção de Surebets",
  description:
    "Agregação de odds multi-provedor e detecção de oportunidades matemáticas de arbitragem esportiva, com matching explicável e revalidação em tempo real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="font-sans">
      <body className="min-h-screen">
        <div className="min-h-screen bg-grid-fade">
          <SiteHeader />
          <RiskBanner />
          <main className="mx-auto max-w-7xl animate-fade-in px-4 py-8 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-surface-border">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Rataria · agregação de odds e detecção de arbitragem. Nunca realiza apostas
                automaticamente.
              </p>
              <p>Oportunidades matemáticas sujeitas a revalidação — não são garantia de lucro.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
