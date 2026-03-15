import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // FORCE Vite to find the correct Capacitor Core
      "@capacitor/core": path.resolve(__dirname, "node_modules/@capacitor/core"),
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these to resolve version conflicts
    include: ["@yesprasoon/capacitor-bluetooth-communication", "@capacitor/core"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});
