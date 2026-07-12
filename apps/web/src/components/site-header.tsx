"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, LayoutDashboard, GitCompareArrows } from "lucide-react";

const NAV = [
  { href: "/", label: "Oportunidades", icon: LayoutDashboard },
  { href: "/matching", label: "Revisão de matching", icon: GitCompareArrows },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-plane/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-cat-blue/15 text-cat-blue shadow-glow">
            <Radar size={18} strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink-primary">
            Rataria<span className="text-cat-blue">.surebets</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface-overlay text-ink-primary"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink-secondary"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
