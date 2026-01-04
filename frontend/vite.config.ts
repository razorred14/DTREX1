import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      port: 5173,
    },
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/contracts": "http://127.0.0.1:8080",
      "/contacts": "http://127.0.0.1:8080",
      "/files": "http://127.0.0.1:8080",
      "/health": "http://127.0.0.1:8080",
      "/ssl": "http://127.0.0.1:8080",
      "/chia": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      }
    }
  },

});
