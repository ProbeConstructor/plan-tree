import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ["browser", "default"],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    allowOnly: false,
  },
});
