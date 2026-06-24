import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { segments } from "@/lib/content";

export function Segments() {
  return (
    <section id="segmentos" className="mx-auto max-w-7xl py-20 container-px">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Um ecossistema para cada perfil
        </h2>
        <p className="mt-4 text-lg text-ink-600">
          Pacientes, profissionais, clínicas e hospitais conectados em uma só
          plataforma.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.id}
              href={s.href}
              className="card group flex flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:shadow-soft hover:ring-brand-200"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${s.chip}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}
                >
                  {s.highlight}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-900">{s.label}</h3>
                <p className="mt-1 text-sm text-ink-600">{s.tagline}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                Acessar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
