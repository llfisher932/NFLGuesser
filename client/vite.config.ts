import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Only for `npm run dev:client`. On Vercel, and under `vercel dev`, the
    // top-level rewrites send /api/* to the server service on the same origin,
    // so the client always calls relative /api/* paths.
    proxy: {
      "/api": "http://localhost:3010",
    },
  },
});
