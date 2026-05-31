import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Integration tests hit a live Supabase and run separately (not in the
    // default unit run). See README / SECURITY.md.
    exclude: ["node_modules/**", "tests/integration/**", "elegance-auto-web-main/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/lib/validators/**",
        "src/middleware.ts",
        "src/app/api/registration/**",
      ],
    },
    deps: {
      optimizer: {
        web: {
          include: ["papaparse"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
