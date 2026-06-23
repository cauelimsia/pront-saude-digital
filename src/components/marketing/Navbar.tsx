"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const navLinks = [
  { label: "Ecossistema", href: "#ecossistema" },
  { label: "Para quem", href: "#segmentos" },
  { label: "Por que Pront", href: "#porque" },
  { label: "Segurança", href: "#seguranca" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 py-4 container-px">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-semibold text-ink-700 hover:text-ink-900">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary">
            Começar grátis
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 py-4 container-px">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/login" className="btn-ghost w-full">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary w-full">
                Começar grátis
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
