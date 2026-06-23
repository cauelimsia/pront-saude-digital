"use client";

import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/app/ui";

export default function ProntuarioPage() {
  const { prontuarios, pacientes } = useStore();
  const nomePaciente = (id: string) =>
    pacientes.find((p) => p.id === id)?.nome ?? "Paciente";

  const registros = [...prontuarios].sort((a, b) =>
    b.data.localeCompare(a.data)
  );

  return (
    <div>
      <PageHeader
        title="Prontuários"
        subtitle="Histórico clínico de todos os pacientes"
      />

      {registros.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nenhum registro clínico"
          description="As evoluções aparecem aqui conforme você atende os pacientes."
        />
      ) : (
        <div className="space-y-4">
          {registros.map((r) => (
            <Link
              key={r.id}
              href={`/pacientes/${r.pacienteId}`}
              className="card block p-5 transition-all hover:shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {nomePaciente(r.pacienteId)
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">
                        {nomePaciente(r.pacienteId)}
                      </p>
                      <p className="text-xs text-ink-500">
                        {new Date(r.data).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  {r.diagnostico && (
                    <p className="mt-3 line-clamp-2 text-sm text-ink-600">
                      <span className="font-medium text-ink-900">Diagnóstico: </span>
                      {r.diagnostico}
                    </p>
                  )}
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
