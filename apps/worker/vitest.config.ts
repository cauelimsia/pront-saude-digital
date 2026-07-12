import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testes de integração compartilham o mesmo PostgreSQL e mutam estado
    // global (eventos canônicos). Execução sequencial evita corrida entre
    // arquivos (ex.: TRUNCATE de um durante a ingestão de outro).
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
