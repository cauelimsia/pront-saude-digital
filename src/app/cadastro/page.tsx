"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Building2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase";
import type { Perfil } from "@/lib/types";

const perfis: { value: Perfil; label: string }[] = [
  { value: "clinica", label: "Clínica" },
  { value: "medico", label: "Médico(a)" },
  { value: "dentista", label: "Dentista" },
  { value: "hospital", label: "Hospital" },
  { value: "farmacia", label: "Farmácia" },
  { value: "paciente", label: "Paciente" },
];

function CadastroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const perfilInicial = (params.get("perfil") as Perfil) || "clinica";

  const [nome, setNome] = useState("");
  const [clinica, setClinica] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>(perfilInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, clinica, perfil } },
    });
    if (error) {
      setErro(
        error.message.includes("already")
          ? "Este e-mail já está cadastrado. Faça login."
          : "Não foi possível criar a conta. Verifique os dados (senha mín. 6 caracteres)."
      );
      setLoading(false);
      return;
    }
    // Auto-confirmado no banco: já há sessão. Se não houver, faz login.
    if (!data.session) {
      await supabase.auth.signInWithPassword({ email, password: senha });
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink-900">Criar conta grátis</h1>
      <p className="mt-1 text-sm text-ink-500">7 dias grátis. Sem cartão de crédito.</p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-700">Perfil</span>
          <div className="grid grid-cols-3 gap-2">
            {perfis.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPerfil(p.value)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  perfil === p.value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-600 hover:border-ink-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field icon={<User className="h-4 w-4" />} label="Seu nome" placeholder="Nome completo" value={nome} onChange={setNome} />
        <Field icon={<Building2 className="h-4 w-4" />} label="Nome da clínica / organização" placeholder="Ex.: Clínica Vida" value={clinica} onChange={setClinica} />
        <Field icon={<Mail className="h-4 w-4" />} label="E-mail" type="email" placeholder="voce@clinica.com.br" value={email} onChange={setEmail} />
        <Field icon={<Lock className="h-4 w-4" />} label="Senha" type="password" placeholder="••••••••" value={senha} onChange={setSenha} />

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar minha conta
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}

function Field({
  icon,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="text-ink-400">{icon}</span>
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
      </div>
    </label>
  );
}
