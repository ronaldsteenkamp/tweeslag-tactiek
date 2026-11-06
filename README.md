# Tweeslag Tactiek

Webapp (PWA) die beachvolleybalposities, systemen en regels uitlegt, voor beginners en trainers van Tweeslag.

Live: <https://ronaldsteenkamp.github.io/tweeslag-tactiek/>

## Lokaal draaien

```bash
npm install
npm run dev
```

## Scripts

| Script             | Doel                                         |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Ontwikkelserver                              |
| `npm run build`    | Typecheck en productiebuild                  |
| `npm run lint`     | ESLint                                       |
| `npm run format`   | Prettier                                     |
| `npm test`         | Unittests (Vitest)                           |
| `npm run test:e2e` | E2e-tests (Playwright, desktop en mobiel)    |
| `npm run icons`    | App-iconen maken uit `public/logo.svg`       |
| `npm run deploy`   | Bouwt en zet `dist/` op de `gh-pages`-branch |

Huisstijl staat in `src/config/branding.ts` en `src/styles/tokens.css`.

Lessen staan als JSON in `src/content/nl/lessen/` en de spelregels in `src/content/nl/regels.json`. De eigen bloksignalen van de vereniging stel je in via `src/config/vereniging.json`. Openstaande inhoudelijke vragen staan in `content/TWIJFELGEVALLEN.md`.

Deellinks staan in de URL-hash (`#/s/...`) in een compact formaat; zie `src/domain/share.ts`.

De volledige documentatie volgt in fase 5.
