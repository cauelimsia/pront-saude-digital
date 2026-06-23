# Pront. — Plataforma de Saúde Digital

Recriação da plataforma **pront.app**: SaaS multi-tenant de saúde digital
(telemedicina, teleodontologia, prontuário eletrônico e gestão de clínicas).
Cada clínica é um *tenant* isolado — modelo pensado para revenda da plataforma
para várias clínicas e profissionais.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (design system próprio em `tailwind.config.ts`)
- **Supabase** (Postgres + Auth + RLS) para produção — schema em `supabase/migrations`
- Deploy recomendado: **Vercel**

## O que já está pronto

| Área | Estado |
|------|--------|
| Landing page institucional (hero, ecossistema, segmentos, "por que Pront", CTA, footer) | ✅ |
| Login e cadastro (com escolha de perfil) | ✅ (modo demo) |
| Painel com sidebar e topbar | ✅ |
| Visão geral (indicadores, agenda do dia, pacientes recentes) | ✅ |
| Pacientes (lista, busca, cadastro, ficha completa) | ✅ |
| Prontuário eletrônico (evoluções por paciente) | ✅ |
| Agenda (agendamentos, confirmação, cancelamento, teleconsulta) | ✅ |
| Teleconsulta (tela de atendimento) | ✅ |
| Configurações | ✅ |
| Schema SQL multi-tenant com Row Level Security | ✅ |

## Rodando localmente

```bash
npm install
npm run dev
# http://localhost:3000
```

Faça login com qualquer e-mail/senha (modo demonstração).

## Modo demonstração vs. produção

A **v1 roda em modo demonstração**: autenticação e dados ficam no
`localStorage` do navegador, para você navegar e validar todo o produto sem
depender de servidor. **Nenhum dado de cliente real do pront.app original é
acessível** — esses dados estão no banco de dados do sistema antigo.

### Indo para produção (dados reais multi-tenant)

1. Crie um projeto no [Supabase](https://supabase.com).
2. Rode a migration `supabase/migrations/0001_init.sql` (cria tenants,
   profiles, pacientes, agendamentos, prontuários + RLS por tenant).
3. Copie `.env.example` para `.env.local` e preencha
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Troque a camada de dados em `src/lib/store.tsx` e a sessão em
   `src/app/login` / `src/app/cadastro` por **Supabase Auth** e consultas às
   tabelas (a estrutura de funções/CRUD já está isolada para facilitar essa troca).

## Roadmap (próximas etapas)

- [ ] Autenticação real (Supabase Auth) + onboarding de clínica (tenant)
- [ ] Persistência real dos módulos no Postgres
- [ ] Integração WhatsApp (confirmação de consulta, atendimento)
- [ ] ProntAI: triagem e resumo clínico com IA
- [ ] Receita digital com assinatura válida
- [ ] Vídeo na teleconsulta (WebRTC)
- [ ] Cobrança/planos por tenant (revenda)

---

> Projeto recriado do zero. Visual e funcionalidades inspirados no pront.app;
> não inclui código ou dados proprietários do sistema original.
