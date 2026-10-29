import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const chunkGroups: Record<string, RegExp> = {
  "vendor-react": /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
  "vendor-query": /[\\/]node_modules[\\/]@tanstack[\\/]/,
  "vendor-i18n": /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
  "vendor-ui": /[\\/]node_modules[\\/]@radix-ui[\\/](react-tooltip|react-dialog|react-popover)[\\/]/,
};

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // In production a Pages Function (functions/media/yt) answers these; locally Vite stands in for it
    proxy: {
      "^/media/yt/[A-Za-z0-9_-]{11}\\.jpg$": {
        target: "https://i.ytimg.com",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/media\/yt\/(.+)\.jpg$/, "/vi/$1/hqdefault.jpg"),
      },
      "^/media/yt/[A-Za-z0-9_-]{11}\\.json$": {
        target: "https://www.youtube.com",
        changeOrigin: true,
        rewrite: (p: string) =>
          p.replace(/^\/media\/yt\/(.+)\.json$/, (_m, id: string) => `/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          for (const [name, re] of Object.entries(chunkGroups)) {
            if (re.test(id)) return name;
          }
        },
      },
    },
  },
}));