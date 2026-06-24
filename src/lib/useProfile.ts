"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase";
import type { Perfil } from "./types";

export interface ProfileInfo {
  nome: string;
  email: string;
  perfil: Perfil;
  clinica: string;
  tenantId: string;
}

function extractTenantNome(tenants: unknown): string {
  if (Array.isArray(tenants)) {
    return (tenants[0] as { nome?: string })?.nome ?? "Minha Clínica";
  }
  return (tenants as { nome?: string })?.nome ?? "Minha Clínica";
}

/** Carrega o perfil + clínica do usuário autenticado (Supabase). */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (ativo) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("nome, email, perfil, tenant_id, tenants(nome)")
        .eq("id", user.id)
        .single();
      if (ativo) {
        if (data) {
          setProfile({
            nome: data.nome,
            email: data.email,
            perfil: (data.perfil ?? "clinica") as Perfil,
            clinica: extractTenantNome(data.tenants),
            tenantId: data.tenant_id,
          });
        }
        setLoading(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  return { profile, loading };
}
