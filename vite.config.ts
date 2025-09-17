import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    // Force every import of react/react-dom to one copy
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // IMPORTANT: leave react/react-dom untouched
    },
  },
  optimizeDeps: {
    // Ensure Vite prebundles a single copy
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
}));
