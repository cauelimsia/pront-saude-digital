"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Bell } from "lucide-react";
import { Sidebar } from "@/components/app/Sidebar";
import { StoreProvider, getSession } from "@/lib/store";
import type { Session } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSessionState(s);
    setChecked(true);
  }, [router]);

  if (!checked || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        Carregando…
      </div>
    );
  }

  const iniciais = session.nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <StoreProvider>
      <div className="min-h-screen bg-ink-50/40">
        {/* Sidebar desktop */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-100 lg:block">
          <Sidebar />
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-ink-900/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 border-r border-ink-100 shadow-xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-500 hover:bg-ink-50"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="lg:pl-64">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-100 bg-white/80 px-4 backdrop-blur-md sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden text-sm text-ink-500 sm:block">
              {session.clinica}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {iniciais}
                </span>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold leading-tight text-ink-900">
                    {session.nome}
                  </p>
                  <p className="text-xs capitalize text-ink-500">{session.perfil}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
