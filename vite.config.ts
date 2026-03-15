import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // This line is the fix for the Rollup/Vite error
      "@capacitor/core": path.resolve(__dirname, "node_modules/@capacitor/core"),
    },
  },
  optimizeDeps: {
    // This ensures the plugin is pre-bundled correctly
    include: ["@yesprasoon/capacitor-bluetooth-communication", "@capacitor/core"],
  },
});
