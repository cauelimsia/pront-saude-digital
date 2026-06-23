"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, Search, Phone, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  PageHeader,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/app/ui";

export default function PacientesPage() {
  const { pacientes, addPaciente } = useStore();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);

  const filtrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf ?? "").includes(busca)
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addPaciente({
      nome: String(fd.get("nome")),
      cpf: String(fd.get("cpf") || ""),
      dataNascimento: String(fd.get("dataNascimento") || ""),
      telefone: String(fd.get("telefone") || ""),
      email: String(fd.get("email") || ""),
      sexo: (String(fd.get("sexo")) || "Outro") as "M" | "F" | "Outro",
      observacoes: String(fd.get("observacoes") || ""),
    });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${pacientes.length} pacientes cadastrados`}
        action={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Novo paciente
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 sm:max-w-sm">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou CPF…"
          className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-400"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Nenhum paciente encontrado"
          description="Cadastre o primeiro paciente para começar."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Paciente</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Contato</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">CPF</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {p.nome.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </span>
                      <div>
                        <p className="font-medium text-ink-900">{p.nome}</p>
                        <p className="text-xs text-ink-500">
                          {p.dataNascimento || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink-600 sm:table-cell">
                    <div className="space-y-0.5">
                      {p.telefone && (
                        <p className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3 w-3" /> {p.telefone}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3" /> {p.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink-600 md:table-cell">
                    {p.cpf || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo paciente">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome completo" name="nome" required placeholder="Nome do paciente" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CPF" name="cpf" placeholder="000.000.000-00" />
            <Input label="Data de nascimento" name="dataNascimento" type="date" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" name="telefone" placeholder="(00) 00000-0000" />
            <Select label="Sexo" name="sexo" defaultValue="Outro">
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="Outro">Outro</option>
            </Select>
          </div>
          <Input label="E-mail" name="email" type="email" placeholder="email@exemplo.com" />
          <Textarea label="Observações" name="observacoes" rows={3} placeholder="Alergias, condições, etc." />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Cadastrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
