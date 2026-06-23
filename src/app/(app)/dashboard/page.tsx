"use client";

import Link from "next/link";
import {
  Users,
  CalendarDays,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader, StatusBadge } from "@/components/app/ui";

export default function DashboardPage() {
  const { pacientes, agendamentos, prontuarios } = useStore();
  const hoje = new Date().toISOString().slice(0, 10);
  const agendamentosHoje = agendamentos
    .filter((a) => a.data === hoje && a.status !== "cancelado")
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const cards = [
    { label: "Pacientes", value: pacientes.length, icon: Users, href: "/pacientes" },
    { label: "Consultas hoje", value: agendamentosHoje.length, icon: CalendarDays, href: "/agenda" },
    { label: "Prontuários", value: prontuarios.length, icon: FileText, href: "/prontuario" },
    { label: "Taxa de confirmação", value: "92%", icon: TrendingUp, href: "/agenda" },
  ];

  const nomePaciente = (id: string) =>
    pacientes.find((p) => p.id === id)?.nome ?? "Paciente";

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle="Resumo da sua operação de hoje."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="card p-5 transition-all hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-ink-300" />
              </div>
              <p className="mt-4 text-3xl font-extrabold text-ink-900">{c.value}</p>
              <p className="text-sm text-ink-500">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Agenda de hoje */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="font-bold text-ink-900">Agenda de hoje</h2>
            <Link href="/agenda" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver agenda
            </Link>
          </div>
          {agendamentosHoje.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">
              Nenhuma consulta agendada para hoje.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {agendamentosHoje.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                    <Clock className="h-4 w-4 text-ink-400" />
                    {a.hora}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {nomePaciente(a.pacienteId)}
                    </p>
                    <p className="text-xs capitalize text-ink-500">{a.tipo}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pacientes recentes */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="font-bold text-ink-900">Pacientes recentes</h2>
            <Link href="/pacientes" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {pacientes.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                  {p.nome.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{p.nome}</p>
                  <p className="truncate text-xs text-ink-500">{p.telefone ?? p.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
