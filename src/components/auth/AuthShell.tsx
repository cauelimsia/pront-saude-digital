import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ShieldCheck, MessageCircle, Brain } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel lateral de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-10 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative space-y-6">
          <h2 className="max-w-sm text-3xl font-bold leading-tight">
            Sua saúde digital, do agendamento ao prontuário.
          </h2>
          <ul className="space-y-4 text-ink-200">
            <li className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-brand-300" />
              Atendimento e agenda integrados ao WhatsApp
            </li>
            <li className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-brand-300" />
              Triagem e suporte com IA 24h
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-300" />
              Criptografia ponta a ponta • LGPD
            </li>
          </ul>
        </div>
        <p className="relative text-sm text-ink-400">
          © {new Date().getFullYear()} Pront. Saúde digital completa.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-ink-400">
            <Link href="/" className="hover:text-ink-600">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
