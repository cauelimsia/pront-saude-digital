import type { Paciente, Agendamento, Prontuario } from "./types";

const hoje = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const pacientesSeed: Paciente[] = [
  {
    id: "p1",
    nome: "Ana Beatriz Souza",
    cpf: "123.456.789-00",
    dataNascimento: "1990-04-12",
    telefone: "(11) 98888-1111",
    email: "ana.souza@email.com",
    sexo: "F",
    observacoes: "Hipertensa. Alergia a dipirona.",
    criadoEm: "2025-11-02",
  },
  {
    id: "p2",
    nome: "Carlos Eduardo Lima",
    cpf: "987.654.321-00",
    dataNascimento: "1985-09-30",
    telefone: "(11) 97777-2222",
    email: "carlos.lima@email.com",
    sexo: "M",
    criadoEm: "2025-12-15",
  },
  {
    id: "p3",
    nome: "Mariana Costa Ferreira",
    cpf: "456.123.789-00",
    dataNascimento: "1998-01-21",
    telefone: "(21) 96666-3333",
    email: "mari.costa@email.com",
    sexo: "F",
    observacoes: "Acompanhamento odontológico.",
    criadoEm: "2026-01-08",
  },
  {
    id: "p4",
    nome: "João Pedro Almeida",
    cpf: "321.654.987-00",
    dataNascimento: "1972-07-05",
    telefone: "(31) 95555-4444",
    email: "jp.almeida@email.com",
    sexo: "M",
    observacoes: "Diabético tipo 2.",
    criadoEm: "2026-03-19",
  },
];

export const agendamentosSeed: Agendamento[] = [
  { id: "a1", pacienteId: "p1", data: addDays(0), hora: "09:00", tipo: "consulta", status: "confirmado" },
  { id: "a2", pacienteId: "p2", data: addDays(0), hora: "10:30", tipo: "teleconsulta", status: "agendado" },
  { id: "a3", pacienteId: "p3", data: addDays(1), hora: "14:00", tipo: "retorno", status: "agendado" },
  { id: "a4", pacienteId: "p4", data: addDays(2), hora: "08:30", tipo: "exame", status: "agendado" },
  { id: "a5", pacienteId: "p1", data: addDays(-3), hora: "11:00", tipo: "consulta", status: "atendido" },
];

export const prontuariosSeed: Prontuario[] = [
  {
    id: "r1",
    pacienteId: "p1",
    data: "2026-06-20T11:00:00",
    queixa: "Dor de cabeça frequente há 1 semana.",
    anamnese: "Paciente relata cefaleia tensional, pico ao fim do dia. PA 140/90.",
    diagnostico: "Cefaleia tensional. Hipertensão não controlada.",
    conduta: "Ajuste de anti-hipertensivo, orientação de hidratação e sono.",
    prescricao: "Losartana 50mg 1x/dia. Dipirona NÃO (alergia).",
  },
  {
    id: "r2",
    pacienteId: "p4",
    data: "2026-05-30T08:30:00",
    queixa: "Retorno de rotina — diabetes.",
    anamnese: "Glicemia de jejum 130 mg/dL. Boa adesão à dieta.",
    diagnostico: "DM2 compensado.",
    conduta: "Manter metformina. Reavaliar em 3 meses.",
    prescricao: "Metformina 850mg 2x/dia.",
  },
];
