# Pront. — Plataforma de Saúde Digital

Recriação da plataforma **pront.app**: SaaS multi-tenant de saúde digital
(telemedicina, teleodontologia, prontuário eletrônico e gestão de clínicas).
Cada clínica é um *tenant* isolado — modelo pensado para revenda da plataforma
para várias clínicas e profissionais.

🌐 **No ar:** https://pront-saude-digital.netlify.app
🔐 **Conta demo:** `teste-clinica@pront.app` / `Senha12345`

> Backend real ativo: autenticação e dados persistidos no **Supabase** (PostgreSQL),
> isolados por clínica via Row Level Security.

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

## Backend (produção)

O sistema está **conectado a um backend real** no Supabase:

- **Auth** real (login, cadastro, logout) via Supabase Auth
- No cadastro, um gatilho cria automaticamente a **clínica (tenant)** + o **perfil**
- **Persistência** de pacientes, agenda e prontuários no PostgreSQL
- **Isolamento por clínica** via Row Level Security (cada conta só vê os próprios dados)

Variáveis necessárias (já configuradas na Netlify; para rodar local copie
`.env.example` para `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> **Observação de segurança:** para agilizar a revenda, novos cadastros são
> auto-confirmados (login imediato). Endurecimento recomendado para produção
> madura: exigir verificação real de e-mail e aprovação da clínica.
>
> **Dados dos clientes antigos:** nenhum dado do pront.app original é acessível —
> ele vive no banco do sistema antigo. Esta plataforma começa limpa.

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
