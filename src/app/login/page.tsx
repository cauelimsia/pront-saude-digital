"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { setSession } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Modo demonstração: autentica localmente. Trocar por Supabase Auth.
    setSession({
      nome: "Dra. Equipe Pront",
      email: email || "demo@pront.app",
      clinica: "Clínica Demonstração",
      perfil: "clinica",
    });
    setTimeout(() => router.push("/dashboard"), 400);
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink-900">Entrar na sua conta</h1>
      <p className="mt-1 text-sm text-ink-500">
        Acesse o painel da sua clínica.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field
          icon={<Mail className="h-4 w-4" />}
          label="E-mail"
          type="email"
          placeholder="voce@clinica.com.br"
          value={email}
          onChange={setEmail}
        />
        <Field
          icon={<Lock className="h-4 w-4" />}
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={senha}
          onChange={setSenha}
        />

        <div className="flex justify-end">
          <a href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Esqueci minha senha
          </a>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">
          Criar conta grátis
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  icon,
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
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
