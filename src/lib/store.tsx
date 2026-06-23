"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Paciente,
  Agendamento,
  Prontuario,
  Session,
} from "./types";
import { pacientesSeed, agendamentosSeed, prontuariosSeed } from "./demo-data";

/**
 * Camada de dados da v1 — persistida em localStorage (modo demonstração).
 * A API pública (CRUD) foi desenhada para ser trocada por chamadas ao
 * Supabase sem alterar os componentes que a consomem.
 */

const KEY = "pront:data:v1";
const SESSION_KEY = "pront:session:v1";

type Data = {
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  prontuarios: Prontuario[];
};

const seed: Data = {
  pacientes: pacientesSeed,
  agendamentos: agendamentosSeed,
  prontuarios: prontuariosSeed,
};

const uid = () => Math.random().toString(36).slice(2, 10);

interface Store extends Data {
  ready: boolean;
  addPaciente: (p: Omit<Paciente, "id" | "criadoEm">) => Paciente;
  updatePaciente: (id: string, patch: Partial<Paciente>) => void;
  removePaciente: (id: string) => void;
  addAgendamento: (a: Omit<Agendamento, "id">) => Agendamento;
  updateAgendamento: (id: string, patch: Partial<Agendamento>) => void;
  removeAgendamento: (id: string) => void;
  addProntuario: (r: Omit<Prontuario, "id">) => Prontuario;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Data) => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addPaciente: Store["addPaciente"] = (p) => {
    const novo: Paciente = {
      ...p,
      id: uid(),
      criadoEm: new Date().toISOString().slice(0, 10),
    };
    persist({ ...data, pacientes: [novo, ...data.pacientes] });
    return novo;
  };

  const updatePaciente: Store["updatePaciente"] = (id, patch) =>
    persist({
      ...data,
      pacientes: data.pacientes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });

  const removePaciente: Store["removePaciente"] = (id) =>
    persist({
      ...data,
      pacientes: data.pacientes.filter((p) => p.id !== id),
      agendamentos: data.agendamentos.filter((a) => a.pacienteId !== id),
      prontuarios: data.prontuarios.filter((r) => r.pacienteId !== id),
    });

  const addAgendamento: Store["addAgendamento"] = (a) => {
    const novo: Agendamento = { ...a, id: uid() };
    persist({ ...data, agendamentos: [...data.agendamentos, novo] });
    return novo;
  };

  const updateAgendamento: Store["updateAgendamento"] = (id, patch) =>
    persist({
      ...data,
      agendamentos: data.agendamentos.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    });

  const removeAgendamento: Store["removeAgendamento"] = (id) =>
    persist({
      ...data,
      agendamentos: data.agendamentos.filter((a) => a.id !== id),
    });

  const addProntuario: Store["addProntuario"] = (r) => {
    const novo: Prontuario = { ...r, id: uid() };
    persist({ ...data, prontuarios: [novo, ...data.prontuarios] });
    return novo;
  };

  return (
    <StoreContext.Provider
      value={{
        ...data,
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

// ----------------- Sessão (modo demonstração) -----------------
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
