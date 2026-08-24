import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    // As Edge Functions entram aqui para a lógica pura delas ser testável.
    // O arquivo testado não importa nada do Deno, só o index.ts é que importa.
    include: ["src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
  },
});
