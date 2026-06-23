import Link from "next/link";
import { Logo } from "@/components/Logo";

const columns = [
  {
    title: "Plataforma",
    links: [
      { label: "Ecossistema", href: "#ecossistema" },
      { label: "ProntAI", href: "#porque" },
      { label: "Segurança", href: "#seguranca" },
      { label: "Telemedicina", href: "#segmentos" },
    ],
  },
  {
    title: "Para você",
    links: [
      { label: "Paciente", href: "/cadastro?perfil=paciente" },
      { label: "Médico", href: "/cadastro?perfil=medico" },
      { label: "Dentista", href: "/cadastro?perfil=dentista" },
      { label: "Clínica", href: "/cadastro?perfil=clinica" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre nós", href: "#" },
      { label: "Central de ajuda", href: "#" },
      { label: "Contato", href: "#" },
      { label: "Afiliados", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50/50">
      <div className="mx-auto max-w-7xl py-14 container-px">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-600">
              Sua saúde digital completa: telemedicina, teleodontologia e gestão
              de clínicas em uma só plataforma.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-ink-900">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-600 transition-colors hover:text-brand-600"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row">
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} Pront. Todos os direitos reservados.
          </p>
          <p className="text-sm text-ink-500">
            Feito com cuidado para a saúde brasileira • LGPD
          </p>
        </div>
      </div>
    </footer>
  );
}
