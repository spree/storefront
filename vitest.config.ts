import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// React's production build does not export `act`. A parent NODE_ENV=production
// otherwise makes Testing Library fail before any assertion runs.
Object.assign(process.env, { NODE_ENV: "test" });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      NODE_ENV: "test",
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.tsx"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
