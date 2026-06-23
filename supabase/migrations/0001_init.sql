-- ============================================================
-- Pront. — Esquema multi-tenant (SaaS de saúde digital)
-- Postgres / Supabase. Cada CLÍNICA é um tenant isolado.
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------
-- Tenants (clínicas / organizações revendidas)
-- ----------------------------------------------------------------
create table if not exists public.tenants (
  id           uuid primary key default uuid_generate_v4(),
  nome         text not null,
  slug         text not null unique,
  plano        text not null default 'trial', -- trial | basico | pro | hospitalar
  documento    text,                          -- CNPJ
  telefone     text,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Perfis de usuário (ligados ao auth.users do Supabase)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  tenant_id    uuid references public.tenants(id) on delete cascade,
  nome         text not null,
  email        text not null,
  papel        text not null default 'profissional', -- owner | profissional | recepcao | paciente
  perfil       text,  -- medico | dentista | clinica | farmacia | hospital | paciente
  conselho     text,  -- CRM / CRO
  criado_em    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Pacientes
-- ----------------------------------------------------------------
create table if not exists public.pacientes (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  nome          text not null,
  cpf           text,
  data_nascimento date,
  telefone      text,
  email         text,
  sexo          text,
  observacoes   text,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_pacientes_tenant on public.pacientes(tenant_id);

-- ----------------------------------------------------------------
-- Agendamentos
-- ----------------------------------------------------------------
create table if not exists public.agendamentos (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  paciente_id   uuid references public.pacientes(id) on delete set null,
  profissional_id uuid references public.profiles(id) on delete set null,
  inicio        timestamptz not null,
  fim           timestamptz,
  tipo          text not null default 'consulta', -- consulta | retorno | teleconsulta | exame
  status        text not null default 'agendado', -- agendado | confirmado | atendido | cancelado | faltou
  observacoes   text,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_agendamentos_tenant on public.agendamentos(tenant_id);
create index if not exists idx_agendamentos_inicio on public.agendamentos(inicio);

-- ----------------------------------------------------------------
-- Prontuários (registros clínicos / evoluções)
-- ----------------------------------------------------------------
create table if not exists public.prontuarios (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  paciente_id     uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.profiles(id) on delete set null,
  queixa          text,
  anamnese        text,
  diagnostico     text,
  conduta         text,
  prescricao      text,
  criado_em       timestamptz not null default now()
);
create index if not exists idx_prontuarios_paciente on public.prontuarios(paciente_id);

-- ============================================================
-- Row Level Security — isolamento por tenant
-- ============================================================
alter table public.tenants      enable row level security;
alter table public.profiles     enable row level security;
alter table public.pacientes    enable row level security;
alter table public.agendamentos enable row level security;
alter table public.prontuarios  enable row level security;

-- helper: tenant do usuário autenticado
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- profiles: usuário vê o próprio perfil e os colegas do mesmo tenant
create policy "perfil_proprio_ou_mesmo_tenant" on public.profiles
  for select using (id = auth.uid() or tenant_id = public.current_tenant_id());
create policy "perfil_update_proprio" on public.profiles
  for update using (id = auth.uid());

-- tenants: membros enxergam o próprio tenant
create policy "tenant_dos_membros" on public.tenants
  for select using (id = public.current_tenant_id());

-- dados clínicos: isolados pelo tenant do usuário
create policy "pacientes_do_tenant" on public.pacientes
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "agendamentos_do_tenant" on public.agendamentos
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "prontuarios_do_tenant" on public.prontuarios
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
