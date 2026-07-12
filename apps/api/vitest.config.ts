import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testes de integração compartilham PostgreSQL/Redis e mutam estado global.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
