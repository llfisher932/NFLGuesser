import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In production the API is served from the same origin by a Vercel
    // Serverless Function, so the client always calls relative /api/* paths.
    proxy: {
      "/api": "http://localhost:3010",
    },
  },
});
