"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./supabase";
import type { Paciente, Agendamento, Prontuario } from "./types";

/**
 * Camada de dados — Supabase (Postgres + RLS por tenant).
 * Cada clínica só enxerga os próprios dados (isolamento garantido no banco).
 */

// ----- mappers (snake_case do banco -> camelCase da app) -----
type Row = Record<string, unknown>;

const mapPaciente = (r: Row): Paciente => ({
  id: r.id as string,
  nome: r.nome as string,
  cpf: (r.cpf as string) ?? undefined,
  dataNascimento: (r.data_nascimento as string) ?? undefined,
  telefone: (r.telefone as string) ?? undefined,
  email: (r.email as string) ?? undefined,
  sexo: (r.sexo as "M" | "F" | "Outro") ?? undefined,
  observacoes: (r.observacoes as string) ?? undefined,
  criadoEm: (r.criado_em as string)?.slice(0, 10) ?? "",
});

const mapAgendamento = (r: Row): Agendamento => ({
  id: r.id as string,
  pacienteId: r.paciente_id as string,
  data: r.data as string,
  hora: r.hora as string,
  tipo: r.tipo as Agendamento["tipo"],
  status: r.status as Agendamento["status"],
  observacoes: (r.observacoes as string) ?? undefined,
});

const mapProntuario = (r: Row): Prontuario => ({
  id: r.id as string,
  pacienteId: r.paciente_id as string,
  data: r.data as string,
  queixa: (r.queixa as string) ?? undefined,
  anamnese: (r.anamnese as string) ?? undefined,
  diagnostico: (r.diagnostico as string) ?? undefined,
  conduta: (r.conduta as string) ?? undefined,
  prescricao: (r.prescricao as string) ?? undefined,
});

interface Store {
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  prontuarios: Prontuario[];
  ready: boolean;
  addPaciente: (p: Omit<Paciente, "id" | "criadoEm">) => void;
  updatePaciente: (id: string, patch: Partial<Paciente>) => void;
  removePaciente: (id: string) => void;
  addAgendamento: (a: Omit<Agendamento, "id">) => void;
  updateAgendamento: (id: string, patch: Partial<Agendamento>) => void;
  removeAgendamento: (id: string) => void;
  addProntuario: (r: Omit<Prontuario, "id">) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (ativo) setReady(true);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (ativo) setTenantId(prof?.tenant_id ?? null);

      const [pac, age, pro] = await Promise.all([
        supabase.from("pacientes").select("*").order("criado_em", { ascending: false }),
        supabase.from("agendamentos").select("*"),
        supabase.from("prontuarios").select("*").order("data", { ascending: false }),
      ]);

      if (!ativo) return;
      setPacientes((pac.data ?? []).map(mapPaciente));
      setAgendamentos((age.data ?? []).map(mapAgendamento));
      setProntuarios((pro.data ?? []).map(mapProntuario));
      setReady(true);
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const supabase = createClient();

  const addPaciente: Store["addPaciente"] = async (p) => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("pacientes")
      .insert({
        tenant_id: tenantId,
        nome: p.nome,
        cpf: p.cpf || null,
        data_nascimento: p.dataNascimento || null,
        telefone: p.telefone || null,
        email: p.email || null,
        sexo: p.sexo || null,
        observacoes: p.observacoes || null,
      })
      .select()
      .single();
    if (data) setPacientes((prev) => [mapPaciente(data), ...prev]);
  };

  const updatePaciente: Store["updatePaciente"] = async (id, patch) => {
    await supabase
      .from("pacientes")
      .update({
        nome: patch.nome,
        cpf: patch.cpf,
        data_nascimento: patch.dataNascimento,
        telefone: patch.telefone,
        email: patch.email,
        sexo: patch.sexo,
        observacoes: patch.observacoes,
      })
      .eq("id", id);
    setPacientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePaciente: Store["removePaciente"] = async (id) => {
    await supabase.from("pacientes").delete().eq("id", id);
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    setAgendamentos((prev) => prev.filter((a) => a.pacienteId !== id));
    setProntuarios((prev) => prev.filter((r) => r.pacienteId !== id));
  };

  const addAgendamento: Store["addAgendamento"] = async (a) => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("agendamentos")
      .insert({
        tenant_id: tenantId,
        paciente_id: a.pacienteId,
        data: a.data,
        hora: a.hora,
        tipo: a.tipo,
        status: a.status,
        observacoes: a.observacoes || null,
      })
      .select()
      .single();
    if (data) setAgendamentos((prev) => [...prev, mapAgendamento(data)]);
  };

  const updateAgendamento: Store["updateAgendamento"] = async (id, patch) => {
    await supabase
      .from("agendamentos")
      .update({ status: patch.status, observacoes: patch.observacoes })
      .eq("id", id);
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAgendamento: Store["removeAgendamento"] = async (id) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
  };

  const addProntuario: Store["addProntuario"] = async (r) => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("prontuarios")
      .insert({
        tenant_id: tenantId,
        paciente_id: r.pacienteId,
        data: r.data,
        queixa: r.queixa || null,
        anamnese: r.anamnese || null,
        diagnostico: r.diagnostico || null,
        conduta: r.conduta || null,
        prescricao: r.prescricao || null,
      })
      .select()
      .single();
    if (data) setProntuarios((prev) => [mapProntuario(data), ...prev]);
  };

  return (
    <StoreContext.Provider
      value={{
        pacientes,
        agendamentos,
        prontuarios,
        ready,
        addPaciente,
        updatePaciente,
        removePaciente,
        addAgendamento,
        updateAgendamento,
        removeAgendamento,
        addProntuario,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>");
  return ctx;
}
