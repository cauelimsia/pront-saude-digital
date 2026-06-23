import { reasons } from "@/lib/content";

export function WhyPront() {
  return (
    <section id="porque" className="mx-auto max-w-7xl py-20 container-px">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Por que escolher a Pront
        </h2>
        <p className="mt-4 text-lg text-ink-600">
          Tecnologia, segurança e cuidado em uma plataforma pensada para a saúde
          brasileira.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">
                  {f.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
