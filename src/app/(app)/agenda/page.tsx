"use client";

import { useState } from "react";
import { CalendarDays, Plus, Check, X, Video } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  PageHeader,
  Modal,
  Input,
  Select,
  StatusBadge,
  EmptyState,
} from "@/components/app/ui";

export default function AgendaPage() {
  const { agendamentos, pacientes, addAgendamento, updateAgendamento } = useStore();
  const [open, setOpen] = useState(false);

  const nomePaciente = (id: string) =>
    pacientes.find((p) => p.id === id)?.nome ?? "Paciente";

  // Agrupa por data
  const porData = agendamentos.reduce<Record<string, typeof agendamentos>>(
    (acc, a) => {
      (acc[a.data] ??= []).push(a);
      return acc;
    },
    {}
  );
  const datas = Object.keys(porData).sort();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addAgendamento({
      pacienteId: String(fd.get("pacienteId")),
      data: String(fd.get("data")),
      hora: String(fd.get("hora")),
      tipo: String(fd.get("tipo")) as "consulta" | "retorno" | "teleconsulta" | "exame",
      status: "agendado",
      observacoes: String(fd.get("observacoes") || ""),
    });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Agendamentos e confirmações"
        action={
          <button
            onClick={() => setOpen(true)}
            className="btn-primary"
            disabled={pacientes.length === 0}
          >
            <Plus className="h-4 w-4" /> Novo agendamento
          </button>
        }
      />

      {datas.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Agenda vazia"
          description="Crie o primeiro agendamento."
        />
      ) : (
        <div className="space-y-6">
          {datas.map((data) => (
            <div key={data}>
              <h2 className="mb-2 text-sm font-semibold text-ink-500">
                {formatarData(data)}
              </h2>
              <div className="card divide-y divide-ink-100">
                {porData[data]
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <span className="w-14 text-sm font-bold text-ink-900">{a.hora}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-medium text-ink-900">
                          {a.tipo === "teleconsulta" && (
                            <Video className="h-4 w-4 text-brand-600" />
                          )}
                          {nomePaciente(a.pacienteId)}
                        </p>
                        <p className="text-xs capitalize text-ink-500">{a.tipo}</p>
                      </div>
                      <StatusBadge status={a.status} />
                      <div className="flex items-center gap-1">
                        <AcaoStatus
                          ativo={a.status === "confirmado"}
                          onClick={() => updateAgendamento(a.id, { status: "confirmado" })}
                          cor="brand"
                          icon={<Check className="h-4 w-4" />}
                          titulo="Confirmar"
                        />
                        <AcaoStatus
                          ativo={a.status === "cancelado"}
                          onClick={() => updateAgendamento(a.id, { status: "cancelado" })}
                          cor="red"
                          icon={<X className="h-4 w-4" />}
                          titulo="Cancelar"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo agendamento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Paciente" name="pacienteId" required>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" name="data" type="date" required />
            <Input label="Hora" name="hora" type="time" required />
          </div>
          <Select label="Tipo" name="tipo" defaultValue="consulta">
            <option value="consulta">Consulta</option>
            <option value="retorno">Retorno</option>
            <option value="teleconsulta">Teleconsulta</option>
            <option value="exame">Exame</option>
          </Select>
          <Input label="Observações" name="observacoes" placeholder="Opcional" />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Agendar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AcaoStatus({
  ativo,
  onClick,
  cor,
  icon,
  titulo,
}: {
  ativo: boolean;
  onClick: () => void;
  cor: "brand" | "red";
  icon: React.ReactNode;
  titulo: string;
}) {
  const base =
    cor === "brand"
      ? "hover:bg-brand-50 hover:text-brand-600"
      : "hover:bg-red-50 hover:text-red-600";
  return (
    <button
      onClick={onClick}
      title={titulo}
      className={`rounded-lg p-1.5 ${ativo ? "text-ink-300" : "text-ink-500"} ${base}`}
    >
      {icon}
    </button>
  );
}

function formatarData(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}
