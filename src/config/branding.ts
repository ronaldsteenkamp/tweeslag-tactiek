/**
 * Alles wat de vereniging aan huisstijl kan instellen, op één plek.
 * Wordt ook gebruikt voor het PWA-manifest en de theme-color in index.html.
 * Na het vervangen van public/logo.svg: `npm run icons`.
 */
export const branding = {
  clubName: "Tweeslag",
  appName: "Tweeslag Tactiek",
  shortName: "Tactiek",
  /** Pad binnen public/. */
  logo: "logo.svg",
  /** Hoofdkleur, gelijk aan de Tweeslag Wispo-app. */
  primaryColor: "#0d0058",
  /** Tekst op de hoofdkleur. */
  onPrimaryColor: "#ffffff",
} as const;
