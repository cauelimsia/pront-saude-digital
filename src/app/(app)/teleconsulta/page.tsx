"use client";

import { Video, MessageCircle, Brain, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/app/ui";

export default function TeleconsultaPage() {
  const { agendamentos, pacientes } = useStore();
  const nomePaciente = (id: string) =>
    pacientes.find((p) => p.id === id)?.nome ?? "Paciente";

  const teleconsultas = agendamentos
    .filter((a) => a.tipo === "teleconsulta" && a.status !== "cancelado")
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  return (
    <div>
      <PageHeader
        title="Teleconsulta"
        subtitle="Atendimentos por vídeo e WhatsApp"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Recurso icon={<Video className="h-5 w-5" />} titulo="Vídeo HD" desc="Sala de atendimento segura, sem instalação." />
        <Recurso icon={<MessageCircle className="h-5 w-5" />} titulo="WhatsApp" desc="Inicie a consulta direto pelo WhatsApp do paciente." />
        <Recurso icon={<Brain className="h-5 w-5" />} titulo="ProntAI" desc="Triagem e resumo clínico assistidos por IA." />
      </div>

      <h2 className="mb-3 text-lg font-bold text-ink-900">Próximas teleconsultas</h2>
      {teleconsultas.length === 0 ? (
        <EmptyState
          icon={<Video className="h-6 w-6" />}
          title="Nenhuma teleconsulta agendada"
          description="Agende uma teleconsulta pela tela de Agenda."
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {teleconsultas.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Video className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-medium text-ink-900">{nomePaciente(a.pacienteId)}</p>
                <p className="flex items-center gap-1.5 text-xs text-ink-500">
                  <Clock className="h-3 w-3" /> {a.data} • {a.hora}
                </p>
              </div>
              <button className="btn-primary">
                <Video className="h-4 w-4" /> Iniciar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Recurso({
  icon,
  titulo,
  desc,
}: {
  icon: React.ReactNode;
  titulo: string;
  desc: string;
}) {
  return (
    <div className="card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
        {icon}
      </span>
      <h3 className="mt-3 font-bold text-ink-900">{titulo}</h3>
      <p className="mt-1 text-sm text-ink-500">{desc}</p>
    </div>
  );
}
