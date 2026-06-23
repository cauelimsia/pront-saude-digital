export type Perfil =
  | "paciente"
  | "medico"
  | "dentista"
  | "farmacia"
  | "clinica"
  | "hospital";

export interface Session {
  nome: string;
  email: string;
  clinica: string;
  perfil: Perfil;
}

export interface Paciente {
  id: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  sexo?: "M" | "F" | "Outro";
  observacoes?: string;
  criadoEm: string;
}

export type StatusAgendamento =
  | "agendado"
  | "confirmado"
  | "atendido"
  | "cancelado"
  | "faltou";

export interface Agendamento {
  id: string;
  pacienteId: string;
  data: string; // ISO date (yyyy-mm-dd)
  hora: string; // HH:mm
  tipo: "consulta" | "retorno" | "teleconsulta" | "exame";
  status: StatusAgendamento;
  observacoes?: string;
}

export interface Prontuario {
  id: string;
  pacienteId: string;
  data: string; // ISO datetime
  queixa?: string;
  anamnese?: string;
  diagnostico?: string;
  conduta?: string;
  prescricao?: string;
}
