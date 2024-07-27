import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "./runtimeConfig",
        replacement: "./runtimeConfig.browser", // ensures browser compatible version of AWS JS SDK is used
      },
    ],
  },
  optimizeDeps: {
    include: ['@webxr-input-profiles/registry'], // Include this package in optimized dependencies
  },
  server: {
    host: '0.0.0.0',
    port: 4000,
    proxy: {
      // "/demoModel": {
      //   target: "http://127.0.0.1:8000",
      // },
      "/downloadModel": {
        target: "http://127.0.0.1:8000",
      },
      // "/demoTexture": {
      //   target: "http://127.0.0.1:8000",
      // },
      "/loadAsset":{
        target:"http://127.0.0.1:8000"
      }
    },
  },
});
