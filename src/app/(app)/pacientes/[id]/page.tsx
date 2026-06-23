"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Plus,
  FileText,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  Modal,
  Textarea,
  StatusBadge,
  EmptyState,
} from "@/components/app/ui";

export default function PacienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    pacientes,
    agendamentos,
    prontuarios,
    addProntuario,
    removePaciente,
  } = useStore();
  const [open, setOpen] = useState(false);

  const paciente = pacientes.find((p) => p.id === id);

  if (!paciente) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Paciente não encontrado"
        action={
          <Link href="/pacientes" className="btn-ghost">
            Voltar para pacientes
          </Link>
        }
      />
    );
  }

  const consultas = agendamentos
    .filter((a) => a.pacienteId === id)
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  const registros = prontuarios
    .filter((r) => r.pacienteId === id)
    .sort((a, b) => b.data.localeCompare(a.data));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addProntuario({
      pacienteId: id,
      data: new Date().toISOString(),
      queixa: String(fd.get("queixa") || ""),
      anamnese: String(fd.get("anamnese") || ""),
      diagnostico: String(fd.get("diagnostico") || ""),
      conduta: String(fd.get("conduta") || ""),
      prescricao: String(fd.get("prescricao") || ""),
    });
    setOpen(false);
  }

  function excluir() {
    if (confirm("Excluir este paciente e todo o histórico?")) {
      removePaciente(id);
      router.push("/pacientes");
    }
  }

  return (
    <div>
      <Link
        href="/pacientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ficha */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
                {paciente.nome.split(" ").slice(0, 2).map((n) => n[0]).join("")}
              </span>
              <div>
                <h1 className="text-xl font-bold text-ink-900">{paciente.nome}</h1>
                <p className="text-sm text-ink-500">{paciente.cpf || "Sem CPF"}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              {paciente.telefone && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Phone className="h-4 w-4 text-ink-400" /> {paciente.telefone}
                </div>
              )}
              {paciente.email && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Mail className="h-4 w-4 text-ink-400" /> {paciente.email}
                </div>
              )}
              {paciente.dataNascimento && (
                <div className="flex items-center gap-2 text-ink-600">
                  <Calendar className="h-4 w-4 text-ink-400" />{" "}
                  {paciente.dataNascimento}
                </div>
              )}
            </dl>

            {paciente.observacoes && (
              <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {paciente.observacoes}
              </div>
            )}

            <button
              onClick={excluir}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Excluir paciente
            </button>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold text-ink-900">Consultas</h2>
            {consultas.length === 0 ? (
              <p className="text-sm text-ink-500">Nenhuma consulta registrada.</p>
            ) : (
              <ul className="space-y-2.5">
                {consultas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">
                      {c.data} • {c.hora}
                    </span>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Prontuário */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Prontuário</h2>
            <button onClick={() => setOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Nova evolução
            </button>
          </div>

          {registros.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Sem registros clínicos"
              description="Adicione a primeira evolução deste paciente."
            />
          ) : (
            <div className="space-y-4">
              {registros.map((r) => (
                <article key={r.id} className="card p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {new Date(r.data).toLocaleString("pt-BR")}
                  </p>
                  <div className="space-y-2.5 text-sm">
                    <Campo titulo="Queixa" valor={r.queixa} />
                    <Campo titulo="Anamnese" valor={r.anamnese} />
                    <Campo titulo="Diagnóstico" valor={r.diagnostico} />
                    <Campo titulo="Conduta" valor={r.conduta} />
                    <Campo titulo="Prescrição" valor={r.prescricao} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova evolução clínica">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea label="Queixa principal" name="queixa" rows={2} />
          <Textarea label="Anamnese" name="anamnese" rows={3} />
          <Textarea label="Diagnóstico" name="diagnostico" rows={2} />
          <Textarea label="Conduta" name="conduta" rows={2} />
          <Textarea label="Prescrição" name="prescricao" rows={2} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar evolução
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Campo({ titulo, valor }: { titulo: string; valor?: string }) {
  if (!valor) return null;
  return (
    <p>
      <span className="font-semibold text-ink-900">{titulo}: </span>
      <span className="text-ink-600">{valor}</span>
    </p>
  );
}
