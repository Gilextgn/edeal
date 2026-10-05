import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Deux projets : "unit" (logique pure, sans réseau) et "db" (politiques
// d'accès, exécutées contre la base Supabase locale).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          env: loadEnv("", process.cwd(), ""),
          testTimeout: 20_000,
        },
      },
    ],
  },
});
