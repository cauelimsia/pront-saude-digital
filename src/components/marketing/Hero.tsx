import Link from "next/link";
import { MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { stats } from "@/lib/content";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-40 top-40 h-[24rem] w-[24rem] rounded-full bg-accent-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl py-20 text-center container-px sm:py-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-700 shadow-soft">
          <Sparkles className="h-4 w-4" />
          Plataforma de saúde digital com IA
        </div>

        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
          Sua Saúde Digital{" "}
          <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Completa
          </span>
        </h1>

        <p className="mx-auto mt-4 text-base font-semibold text-ink-500 sm:text-lg">
          Telemedicina • Teleodontologia • Gestão de Clínicas
        </p>

        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-ink-600">
          Consulte médicos e dentistas online via WhatsApp, com IA 24h e receitas
          digitais válidas em todo Brasil.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/cadastro" className="btn-primary px-7 py-3.5 text-base">
            <MessageCircle className="h-5 w-5" />
            Começar agora
          </Link>
          <a href="#segmentos" className="btn-ghost px-7 py-3.5 text-base">
            Conhecer o ecossistema
          </a>
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-500">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          Criptografia ponta a ponta • Conformidade LGPD
        </p>

        <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card px-4 py-5">
              <dt className="text-2xl font-extrabold text-brand-600">{s.value}</dt>
              <dd className="mt-1 text-xs font-medium text-ink-500">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
