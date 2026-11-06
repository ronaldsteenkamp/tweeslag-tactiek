import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { branding } from "./src/config/branding.ts";

// GitHub Pages serveert de site onder /<repo-naam>/.
const base = process.env.BASE_PATH ?? "/tweeslag-tactiek/";

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: "branding-in-html",
      transformIndexHtml: (html) =>
        html
          .replaceAll("%BRAND_COLOR%", branding.primaryColor)
          .replaceAll("%APP_NAME%", branding.appName)
          .replaceAll("%BASE%", base),
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "logo.svg",
        "favicon.ico",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        name: branding.appName,
        short_name: branding.shortName,
        description: "Beachvolleybalposities, systemen en regels uitgelegd.",
        id: base,
        lang: "nl",
        dir: "ltr",
        display: "standalone",
        orientation: "any",
        categories: ["sports", "education"],
        shortcuts: [
          { name: "Lessen", url: `${base}#/` },
          { name: "Tactiekbord", url: `${base}#/bord` },
          { name: "Spelregels", url: `${base}#/regels` },
        ],
        screenshots: [
          {
            src: "screenshots/les-telefoon.jpg",
            sizes: "824x1830",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Les met uitleg op het veld",
          },
          {
            src: "screenshots/bord-telefoon.jpg",
            sizes: "824x1830",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Tactiekbord",
          },
          {
            src: "screenshots/les-breed.jpg",
            sizes: "1280x720",
            type: "image/jpeg",
            form_factor: "wide",
            label: "Les op een groot scherm",
          },
        ],
        start_url: base,
        scope: base,
        background_color: branding.primaryColor,
        theme_color: branding.primaryColor,
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
