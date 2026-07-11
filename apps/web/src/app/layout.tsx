import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rataria — Detecção de Surebets",
  description:
    "Agregação de odds e detecção de oportunidades matemáticas de arbitragem esportiva.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <header className="border-b border-surface-border bg-surface-raised">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-white">
              Rataria<span className="text-emerald-400">.surebets</span>
            </Link>
            <nav className="text-sm text-slate-400">
              <Link href="/" className="hover:text-white">
                Oportunidades
              </Link>
            </nav>
          </div>
        </header>
        <div className="border-b border-amber-900/40 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-300">
          Odds mudam rapidamente e mercados podem ser suspensos. Uma oportunidade matemática
          detectada não é garantia de lucro. Apostas envolvem risco financeiro — verifique a
          legislação local e os termos das plataformas.
        </div>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
