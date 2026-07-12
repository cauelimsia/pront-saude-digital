"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, Loader2, Radar, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { register as apiRegister } from "@/lib/api";

/** Formulário compartilhado de login/cadastro (dark, centralizado). */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await apiRegister(email, password);
        await login(email, password);
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-grid-fade px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cat-blue/15 text-cat-blue shadow-glow">
            <Radar size={22} strokeWidth={2.5} />
          </span>
          <h1 className="mt-3 text-lg font-bold text-ink-primary">
            Rataria<span className="text-cat-blue">.surebets</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isLogin ? "Entre para acessar o painel de arbitragem" : "Crie sua conta de acesso"}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-xl border border-surface-border bg-surface p-5 shadow-card"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">E-mail</span>
            <div className="relative">
              <AtSign
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="E-mail"
                className="w-full rounded-lg border border-surface-border bg-surface-overlay py-2 pl-9 pr-3 text-sm text-ink-primary outline-none transition-colors focus:border-cat-blue"
                placeholder="voce@exemplo.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">Senha</span>
            <div className="relative">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Senha"
                className="w-full rounded-lg border border-surface-border bg-surface-overlay py-2 pl-9 pr-3 text-sm text-ink-primary outline-none transition-colors focus:border-cat-blue"
                placeholder="mínimo 8 caracteres"
              />
            </div>
          </label>

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
              <TriangleAlert size={13} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cat-blue py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-soft disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {isLogin ? (
            <>
              Não tem conta?{" "}
              <Link href="/register" className="text-cat-blue hover:underline">
                Cadastre-se
              </Link>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <Link href="/login" className="text-cat-blue hover:underline">
                Entrar
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
