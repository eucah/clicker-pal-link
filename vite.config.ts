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
      "next/image": path.resolve(__dirname, "./src/lib/next-image-compat"),
    },
  },
  optimizeDeps: {
    include: ["@capacitor/core"],
  },
});
