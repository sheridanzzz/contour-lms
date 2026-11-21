import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// API integration tests: real HTTP against the running app and local Supabase.
// Needs `npm run db:start` and `npm run dev` (or `npm start`) first.
Object.assign(process.env, loadEnv("", process.cwd(), ""));

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["tests/api/**/*.test.ts"],
    globalSetup: ["tests/api/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
