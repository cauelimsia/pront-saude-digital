"use client";

import { Building2, Database, ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { PageHeader, Input } from "@/components/app/ui";

export default function ConfiguracoesPage() {
  const { profile: session } = useProfile();

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
            Os dados são armazenados com segurança no <strong>Supabase</strong>{" "}
            (PostgreSQL) e ficam <strong>isolados por clínica</strong> via Row Level
            Security — cada conta só enxerga os próprios pacientes, agenda e
            prontuários (multi-tenant).
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
