// vite.config.vercel.ts
// Production config for Vercel deployment.
// Strips Replit-specific plugins and the PORT/BASE_PATH requirements.
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: __dirname,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
