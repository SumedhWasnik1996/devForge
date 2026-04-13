import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      "/": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
}));
