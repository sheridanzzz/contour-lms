import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Unit tests: fast, no servers needed. API integration tests live in vitest.api.config.mts.
export default defineConfig({
  resolve: {
    alias: { "@": path("."), "server-only": path("./tests/stubs/server-only.ts") },
  },
  test: { include: ["lib/**/*.test.ts"] },
});
