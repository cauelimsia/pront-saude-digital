import { ecosystem } from "@/lib/content";

export function Ecosystem() {
  return (
    <section id="ecossistema" className="bg-ink-50/60 py-20">
      <div className="mx-auto max-w-7xl container-px">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Ecossistema Pront
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Tudo conectado, do paciente ao hospital
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ecosystem.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
