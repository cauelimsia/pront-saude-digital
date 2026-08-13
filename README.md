<div align="center">

# 🩺 Pront.

**SaaS multi-tenant de saúde digital — prontuário eletrônico, agenda e gestão de clínicas**

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](#)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://pront-saude-digital.netlify.app)

**[▶ Abrir o sistema](https://pront-saude-digital.netlify.app)** · [Multi-tenancy](#-multi-tenancy-com-row-level-security) · [Módulos](#-módulos) · [Rodar local](#-rodar-local)

`Backend real em produção` · `Isolamento por clínica via RLS` · `Auth, dados e schema versionados`

</div>

> [!TIP]
> **Conta demo:** `teste-clinica@pront.app` · senha `Senha12345`

---

## 🎯 O que é

Plataforma de saúde digital para clínicas médicas e odontológicas: telemedicina,
teleodontologia, prontuário eletrônico e gestão do dia a dia.

Cada clínica é um **tenant isolado** — o modelo foi desenhado para revenda da mesma
plataforma para várias clínicas e profissionais, sem instância separada por cliente.

## 🔐 Multi-tenancy com Row Level Security

O isolamento entre clínicas não está na aplicação — está **no banco**.

Cada tabela carrega o `clinica_id` e uma policy de Row Level Security amarra toda leitura e
escrita ao tenant da sessão autenticada. Uma consulta que "esqueça" o filtro não vaza dado de
outra clínica: o Postgres recusa antes de a aplicação ver a linha.

No cadastro, um **gatilho** cria automaticamente a clínica (tenant) e o perfil do usuário,
então o onboarding não depende de passo manual.

Todo o schema — tabelas, policies e gatilhos — está versionado em `supabase/migrations`.

## 🧩 Módulos

| Área | Estado |
|---|---|
| Landing institucional (hero, ecossistema, segmentos, CTA) | ✅ |
| Autenticação real (Supabase Auth) + criação de tenant | ✅ |
| Painel com sidebar e topbar | ✅ |
| Visão geral — indicadores, agenda do dia, pacientes recentes | ✅ |
| Pacientes — lista, busca, cadastro, ficha completa | ✅ |
| Prontuário eletrônico — evoluções por paciente | ✅ |
| Agenda — agendamento, confirmação, cancelamento, teleconsulta | ✅ |
| Teleconsulta — tela de atendimento | ✅ |
| Configurações | ✅ |
| Schema multi-tenant com RLS | ✅ |

## 🚀 Rodar local

```bash
npm install
cp .env.example .env.local     # preencher URL e anon key do Supabase
npm run dev
# http://localhost:3000
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 🗺️ Roadmap

- [ ] Integração WhatsApp — confirmação de consulta e atendimento
- [ ] ProntAI — triagem e resumo clínico com IA
- [ ] Receita digital com assinatura válida
- [ ] Vídeo na teleconsulta (WebRTC)
- [ ] Cobrança e planos por tenant (revenda)

## ⚠️ Notas de segurança

Para agilizar a revenda, novos cadastros são **auto-confirmados** (login imediato).
Endurecimento recomendado antes de operação madura: verificação real de e-mail e
aprovação da clínica.

Nenhum dado de clientes do pront.app original é acessível aqui — aquele banco é do sistema
antigo. Esta plataforma começa limpa.

## 🧱 Stack

| Camada | Escolha |
|---|---|
| Front / SSR | Next.js 14 (App Router), TypeScript |
| Estilo | Tailwind CSS, design system próprio em `tailwind.config.ts` |
| Banco / Auth | Supabase — Postgres, Auth e Row Level Security |
| Deploy | Netlify (Vercel também suportado) |

---

<div align="center">

Projeto recriado do zero. Visual e funcionalidades inspirados no pront.app;
não inclui código nem dados proprietários do sistema original.

</div>
