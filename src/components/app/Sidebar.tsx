"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { clearSession } from "@/lib/store";

const nav = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Prontuários", href: "/prontuario", icon: FileText },
  { label: "Teleconsulta", href: "/teleconsulta", icon: Stethoscope },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col gap-2 bg-white p-4">
      <div className="px-2 py-3">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={sair}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-5 w-5" />
        Sair
      </button>
    </div>
  );
}
