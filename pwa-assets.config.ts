import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";
import { branding } from "./src/config/branding.ts";

// Het logo loopt door tot de rand en houdt zelf de veilige zone vrij: geen witte marge nodig.
const fullBleed = {
  padding: 0,
  resizeOptions: { background: branding.primaryColor },
};

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ["public/logo.svg"],
});
