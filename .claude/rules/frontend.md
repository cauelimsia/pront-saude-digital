# Regras de frontend (`apps/web`)

- Todo dado atravessa `src/lib/api.ts` (camada tipada). Componentes NUNCA fabricam dados nem refazem cálculos de domínio — o simulador chama `POST /surebets/:id/simulate`.
- Estados obrigatórios em toda tela de dados: loading, empty, error (com retry) e indicador de conexão de tempo real (SSE reconecta sozinho; mostrar estado).
- Linguagem: "oportunidade matemática", "confiança operacional", "retorno estimado", "sujeito a revalidação". PROIBIDO: "lucro garantido", "aposta segura", "risco zero".
- Aviso de risco visível no layout global.
- Acessibilidade: inputs com aria-label, contraste adequado, navegação por teclado nos fluxos principais.
- Tailwind; tema escuro padrão; tabelas com overflow-x em telas pequenas.
