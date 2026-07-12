# Regras de frontend (`apps/web`)

- Todo dado atravessa `src/lib/api.ts` (camada tipada). Componentes NUNCA fabricam dados nem refazem cálculos de domínio — o simulador chama `POST /surebets/:id/simulate`.
- Estados obrigatórios em toda tela de dados: loading, empty, error (com retry) e indicador de conexão de tempo real (SSE reconecta sozinho; mostrar estado).
- Linguagem: "oportunidade matemática", "confiança operacional", "retorno estimado", "sujeito a revalidação". PROIBIDO: "lucro garantido", "aposta segura", "risco zero".
- Aviso de risco visível no layout global.
- Acessibilidade: inputs com aria-label, contraste adequado, navegação por teclado nos fluxos principais.
- Tailwind; tema escuro padrão; tabelas com overflow-x em telas pequenas.
- Design system: tokens de cor em `tailwind.config.ts` derivados de paleta validada (contraste/CVD) — superfícies/ink dark, cores de status FIXAS (good/warning/serious/critical) nunca reaproveitadas como categóricas, slots categóricos (blue/aqua/violet) para provedores. Ícones via `lucide-react`. Números em colunas usam `.tnum` (tabular-nums).
- Primitivas reutilizáveis em `src/components/ui.tsx` (Card, StatTile, Badge, ConfidenceMeter, LiveIndicator, Skeleton, Error/Empty states). Cor de status nunca sozinha — sempre com número/rótulo/ícone.
