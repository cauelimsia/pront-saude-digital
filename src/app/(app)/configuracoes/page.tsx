"use client";

import { useEffect, useState } from "react";
import { Building2, Database, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/store";
import { PageHeader, Input } from "@/components/app/ui";
import type { Session } from "@/lib/types";

export default function ConfiguracoesPage() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => setSession(getSession()), []);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" subtitle="Dados da clínica e da conta" />

      <div className="space-y-6">
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" />
            <h2 className="font-bold text-ink-900">Clínica</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome da clínica" defaultValue={session?.clinica ?? ""} />
            <Input label="Responsável" defaultValue={session?.nome ?? ""} />
            <Input label="E-mail" defaultValue={session?.email ?? ""} />
            <Input label="Perfil" defaultValue={session?.perfil ?? ""} readOnly />
          </div>
          <div className="mt-5">
            <button className="btn-primary">Salvar alterações</button>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-5 w-5 text-brand-600" />
            <h2 className="font-bold text-ink-900">Banco de dados</h2>
          </div>
          <p className="text-sm text-ink-600">
            Esta versão está em <strong>modo demonstração</strong>: os dados ficam
            salvos apenas neste navegador. Para colocar em produção com dados reais e
            isolados por clínica (multi-tenant), conecte o Supabase preenchendo as
            variáveis de ambiente — o schema já está pronto em{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">
              supabase/migrations
            </code>
            .
          </p>
        </section>

        <section className="card p-6">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <h2 className="font-bold text-ink-900">Segurança</h2>
          </div>
          <p className="text-sm text-ink-600">
            Criptografia ponta a ponta e conformidade com a LGPD são aplicadas na
            camada de produção (Supabase Auth + Row Level Security por tenant).
          </p>
        </section>
      </div>
    </div>
  );
}
