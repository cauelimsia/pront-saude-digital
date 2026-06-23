import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function CTA() {
  return (
    <section id="seguranca" className="mx-auto max-w-7xl py-20 container-px">
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-16 text-center sm:px-16">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-200">
            <ShieldCheck className="h-4 w-4" />
            Segurança de nível hospitalar
          </span>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-bold text-white sm:text-4xl">
            Pronto para digitalizar a sua operação de saúde?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-200">
            Comece grátis em minutos. Sem instalação, sem complicação — com a
            segurança e a conformidade que a saúde exige.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className="btn-primary px-7 py-3.5 text-base">
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="btn px-7 py-3.5 text-base text-white ring-1 ring-white/30 hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
