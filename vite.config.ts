import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Helps with older plugins
    },
  },
  optimizeDeps: {
    include: ["@yesprasoon/capacitor-bluetooth-communication", "@capacitor/core"],
  },
});
