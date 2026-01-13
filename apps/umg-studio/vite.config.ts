import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@compiler-v0": path.resolve(__dirname, "../../compiler-v0/src/index.ts")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    allowedHosts: true
  }
});
