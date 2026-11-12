import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "2hub",
        short_name: "2hub",
        description: "Launcher et tableau de bord perso",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0b12",
        theme_color: "#0b0b12",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Shell is served from the precache (zero network on open); /api is never cached by the SW,
        // the app keeps its own last-known dashboard in localStorage.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
