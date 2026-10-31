import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(import.meta.dirname, "../../.env") });

const apiTarget = process.env.VITE_API_URL ?? "http://localhost:4000";
const apiToken = process.env.API_TOKEN?.trim();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (apiToken) {
              proxyReq.setHeader("Authorization", `Bearer ${apiToken}`);
            }
          });
        },
      },
    },
  },
});
