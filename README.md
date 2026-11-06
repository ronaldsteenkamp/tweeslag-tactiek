# Tweeslag Tactiek

Webapp die beachvolleybalposities, systemen en regels uitlegt, voor de leden van beachvolleybalvereniging Tweeslag.

- **Leerstand:** zeven lessen met animaties en een quiz, plus een regelpagina.
- **Tactiekbord:** voor gevorderden en trainers. Sleep spelers, teken lijnen en zones, maak stappen en varianten, en deel een scenario via een link of QR-code.

De app is installeerbaar (PWA) en werkt offline, handig naast het veld. Er is geen backend: voortgang en scenario's staan op je eigen toestel, en gedeelde scenario's zitten in de link zelf.

Live: <https://ronaldsteenkamp.github.io/tweeslag-tactiek/>

## Lokaal draaien

Je hebt Node.js 24 of nieuwer nodig.

```bash
npm install
npm run dev
```

Open daarna het adres dat in de terminal staat.

## Scripts

| Script               | Doel                                               |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Ontwikkelserver                                    |
| `npm run build`      | Typecheck en productiebuild in `dist/`             |
| `npm run preview`    | Productiebuild lokaal bekijken                     |
| `npm run lint`       | ESLint                                             |
| `npm run format`     | Prettier                                           |
| `npm test`           | Unittests (Vitest)                                 |
| `npm run test:e2e`   | E2e-, toegankelijkheids- en PWA-tests (Playwright) |
| `npm run lighthouse` | Lighthouse-audit; faalt onder de 90                |
| `npm run icons`      | App-iconen maken uit `public/logo.svg`             |

Voor de e2e-tests en Lighthouse is eenmalig `npx playwright install chromium` nodig.

## Projectstructuur

```text
content/TWIJFELGEVALLEN.md   Inhoud die de vereniging nog moet bevestigen
docs/lessen-schrijven.md     Handleiding voor wie inhoud aanpast
e2e/                         Playwright-tests
scripts/                     Lighthouse-audit
src/
  app/                       Paginaopbouw en routing
  config/                    Huisstijl en afspraken van de vereniging
  content/nl/                Lessen en spelregels als JSON
  domain/                    Logica zonder React: veld, animatie, schema's, deellinks
  features/
    board/                   Tactiekbord
    court/                   Het veld in SVG en slepen
    lessons/                 Lessenoverzicht, lesspeler en quiz
    progress/                Voortgang
    rules/                   Regelpagina
    share/                   Delen en gedeelde links
    theme/                   Strandmodus
    ui/                      Gedeelde onderdelen
  i18n/                      Alle interfaceteksten
  styles/                    Designtokens en basisstijlen
```

## Technische keuzes

- **Coördinaten** zijn altijd meters. De oorsprong is een hoek van het speelveld, `x` loopt langs de lange zijde en het net ligt op `x = 8`. Pas bij het tekenen rekent `src/domain/geometry.ts` om naar SVG.
- **Zustand** houdt de state bij: klein, geen provider nodig, en met selectors tekent alleen opnieuw wat verandert.
- **Animatie** is eigen `requestAnimationFrame` met een pure functie (`frameAt`), goed te testen en zonder extra bibliotheek.
- **Routing** is een klein eigen hash-schema (`#/les/opbouw`, `#/bord`, `#/s/<data>`), omdat GitHub Pages geen paden terugstuurt en deellinks ook in de hash staan.
- **Validatie:** lessen, opgeslagen scenario's, geïmporteerde bestanden en deellinks gaan allemaal door dezelfde Zod-schema's in `src/domain/schema.ts`.
- **Deellinks** gebruiken een compact, geversioneerd formaat: lijsten zonder veldnamen, coördinaten in decimeters, gecomprimeerd met `lz-string`. Een scenario van drie stappen kost ongeveer 400 tekens. Boven 1200 tekens toont de app geen QR-code meer, omdat die dan van een telefoonscherm slecht scanbaar wordt; boven 8000 tekens weigert hij de link. Verander je het formaat, verhoog dan `FORMAT_VERSION` en blijf oude links lezen.
- **Lighthouse** heeft sinds versie 12 geen PWA-categorie meer. De PWA-eisen staan daarom als test in `e2e/pwa.spec.ts`.

## Een nieuwe les toevoegen

Zet een JSON-bestand in `src/content/nl/lessen/`. De app vindt het vanzelf. Dit is de opbouw van een les:

```json
{
  "id": "voorbeeld",
  "order": 8,
  "status": "concept",
  "scenario": {
    "id": "voorbeeld",
    "title": "Mijn les",
    "description": "Korte omschrijving voor het overzicht.",
    "tags": ["voorbeeld"],
    "level": "beginner",
    "players": [
      { "id": "A1", "team": "A", "label": "A1" },
      { "id": "A2", "team": "A", "label": "A2" },
      { "id": "B1", "team": "B", "label": "B1" },
      { "id": "B2", "team": "B", "label": "B2" }
    ],
    "keyframes": [
      {
        "id": "begin",
        "durationMs": 0,
        "players": {
          "A1": { "x": 3, "y": 2 },
          "A2": { "x": 3, "y": 6 },
          "B1": { "x": 13, "y": 2 },
          "B2": { "x": 13, "y": 6 }
        },
        "ball": { "x": 4, "y": 2 },
        "caption": "De **eerste** stap."
      }
    ]
  },
  "quiz": [
    {
      "id": "vraag-1",
      "kind": "choice",
      "prompt": "Hoeveel spelers heeft een team?",
      "options": ["Twee", "Vier"],
      "correct": 0,
      "explanation": "Beachvolleybal is 2 tegen 2."
    }
  ]
}
```

Een echte les heeft 4 tot 7 stappen en minstens twee quizvragen; `npm test` controleert dat. De volledige uitleg staat in [Lessen schrijven](docs/lessen-schrijven.md). Inhoud aanpassen kan ook zonder programmeerkennis.

## Aanpassen voor de vereniging

- **Logo en kleur:** `src/config/branding.ts` en `public/logo.svg`. Draai daarna `npm run icons`. Het huidige logo is een tijdelijk ontwerp.
- **Kleuren, ruimte en typografie:** `src/styles/tokens.css`. Een test bewaakt het contrast.
- **Bloksignalen:** `src/config/vereniging.json`.

## Vertalen

Alle interfaceteksten staan in `src/i18n/nl.ts`. Voor Engels: voeg `en.ts` toe met dezelfde sleutels, laat `src/i18n/index.ts` kiezen op taal, en zet de lessen in `src/content/en/`.

## Deployen

Elke push naar `main` draait `.github/workflows/ci-deploy.yml`: lint, opmaak, unittests, e2e-tests, build en Lighthouse. Slaagt alles, dan gaat de nieuwe versie live via GitHub Pages. Geïnstalleerde apps werken zichzelf bij als ze weer online zijn.

Pushes naar `.github/workflows/` vragen een GitHub-token met de scope `workflow`.

## Meer weten

- [Lessen schrijven](docs/lessen-schrijven.md)
- [Roadmap](ROADMAP.md)
- [Twijfelgevallen in de inhoud](content/TWIJFELGEVALLEN.md)

Spelregels komen uit de [FIVB Official Beach Volleyball Rules 2025-2028](https://www.fivb.com/beach-volleyball/the-game/official-rules-of-the-games/).
