import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o navegador.
 *
 * A v1 roda em "modo demonstração" (dados em localStorage). Para ir a produção
 * com dados reais e multi-tenant, defina as variáveis abaixo no .env.local e
 * rode as migrations em supabase/migrations. Depois, troque as chamadas do
 * store (src/lib/store.tsx) por consultas a este cliente.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createBrowserClient(url, key);
}

export const supabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
