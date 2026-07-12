"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Radar } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { SiteHeader } from "@/components/site-header";
import { RiskBanner } from "@/components/risk-banner";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

/**
 * Casca da aplicação: rotas protegidas exigem sessão. Rotas públicas
 * (login/cadastro) não mostram header nem exigem auth.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
  }, [loading, user, isPublic, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-2 text-ink-muted">
          <Radar size={18} className="animate-pulse text-cat-blue" />
          Carregando…
        </div>
      </div>
    );
  }

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!user) {
    // redirect em andamento
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-grid-fade">
      <SiteHeader />
      <RiskBanner />
      <main className="mx-auto max-w-7xl animate-fade-in px-4 py-8 sm:px-6">{children}</main>
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
  );
}
