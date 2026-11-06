# Lessen schrijven

Deze handleiding is voor iedereen die inhoud wil aanpassen. Programmeren is niet nodig. Je past tekstbestanden aan, en de app doet de rest.

## Waar staat wat?

| Wat je wilt aanpassen        | Bestand                      |
| ---------------------------- | ---------------------------- |
| Een les of quizvraag         | `src/content/nl/lessen/`     |
| De spelregels                | `src/content/nl/regels.json` |
| De bloksignalen van Tweeslag | `src/config/vereniging.json` |
| Vragen die nog open staan    | `content/TWIJFELGEVALLEN.md` |

## Een tekst aanpassen op GitHub

Voor een kleine wijziging heb je alleen een GitHub-account met schrijfrechten nodig.

1. Open het bestand op GitHub.
2. Klik op het potloodje rechtsboven.
3. Pas de tekst aan. Verander alleen wat tussen aanhalingstekens staat.
4. Klik op **Commit changes** en schrijf kort wat je hebt veranderd.
5. Vraag iemand met toegang om `npm test` en `npm run deploy` te draaien.

## Hoe een lesbestand werkt

De bestanden zijn JSON. Daar gelden een paar strenge regels:

- Tekst staat tussen dubbele aanhalingstekens: `"zo"`.
- Tussen twee items staat een komma, na het laatste item niet.
- Wil je een aanhalingsteken in je tekst, gebruik dan “deze”.

Een les bestaat uit drie delen: gegevens over de les, de stappen en de quiz.

### Gegevens over de les

| Veld          | Betekenis                                                   |
| ------------- | ----------------------------------------------------------- |
| `id`          | Korte naam voor de link, alleen kleine letters en streepjes |
| `order`       | Plek in het overzicht                                       |
| `status`      | `concept`, of `definitief` als de vereniging akkoord is     |
| `title`       | Titel in het overzicht                                      |
| `description` | Eén zin in het overzicht                                    |
| `level`       | `beginner` of `gevorderd`                                   |

### Stappen

Elke stap staat in `keyframes`. Een les heeft 4 tot 7 stappen, want meer past niet op een smalle telefoon.

| Veld         | Betekenis                                                             |
| ------------ | --------------------------------------------------------------------- |
| `id`         | Korte naam, uniek binnen de les                                       |
| `durationMs` | Hoe lang de beweging naar deze stap duurt; 1500 is anderhalve seconde |
| `players`    | Waar elke speler aan het eind van de stap staat                       |
| `ball`       | Waar de bal is, met eventueel `height` (hoogte) en `arc` (boog)       |
| `arrows`     | Lijnen op het veld (niet verplicht)                                   |
| `zones`      | Gekleurde vlakken op het veld (niet verplicht)                        |
| `caption`    | De uitleg bij deze stap                                               |

Houd de uitleg kort: **ongeveer 190 tekens** past op een kleine telefoon. Een test waarschuwt als het niet past.

In de uitleg maak je tekst **vet** met `**twee sterretjes**` en _cursief_ met `*één sterretje*`.

### Posities op het veld

Alles is in meters. Team A speelt links, team B rechts. Op een telefoon staat team A onder.

```text
          x = 0            x = 8            x = 16
  y = 0     ┌────────────────┬────────────────┐
            │     team A     │     team B     │
            │                │                │
  y = 8     └────────────────┴────────────────┘
                            net
```

Daaromheen ligt de vrije zone: `x` mag van -3 tot 19 en `y` van -3 tot 11. Een opslag van team B begint dus bijvoorbeeld op `x` 17.

Gebruik een punt in getallen: `3.5`, niet `3,5`.

### De makkelijkste manier: bouw de les op het tactiekbord

Je hoeft coördinaten niet met de hand te bedenken.

1. Maak de stappen op het tactiekbord in de app.
2. Kies **Menu** en dan **Exporteren**. Je krijgt een JSON-bestand.
3. Kopieer het deel `keyframes` uit dat bestand naar je lesbestand.

### Lijnen en zones

Een lijn:

```json
{
  "id": "aanval",
  "kind": "shot",
  "from": { "x": 9, "y": 1 },
  "to": { "x": 3, "y": 5 }
}
```

`kind` is `run` (looplijn), `ball` (balbaan) of `shot` (aanval).

Een zone is een vlak met minstens drie hoekpunten:

```json
{
  "id": "open",
  "kind": "target",
  "label": "Open",
  "polygon": [
    { "x": 0, "y": 0 },
    { "x": 3, "y": 0 },
    { "x": 3, "y": 2 },
    { "x": 0, "y": 2 }
  ]
}
```

`kind` is `cover` (blauw), `target` (groen) of `blocked` (gearceerd). Zet geen label op een plek waar een speler staat, want dan valt het eronder.

## De quiz

Elke les heeft minstens twee vragen.

### Meerkeuze

```json
{
  "id": "contacten",
  "kind": "choice",
  "prompt": "Hoeveel contacten heeft een team?",
  "options": ["Twee", "Drie", "Vier"],
  "correct": 1,
  "explanation": "Maximaal drie, en een blok telt mee."
}
```

Let op: `correct` telt vanaf 0. Bij `1` is hier "Drie" het goede antwoord. Zet het goede antwoord niet steeds op dezelfde plek.

### Slepen

```json
{
  "id": "naar-de-lijn",
  "kind": "drag",
  "prompt": "Sleep A2 naar de lijn.",
  "playerId": "A2",
  "setup": {
    "players": {
      "A1": { "x": 7.4, "y": 1.2 },
      "A2": { "x": 6.5, "y": 4 },
      "B1": { "x": 9, "y": 1.2 },
      "B2": { "x": 10.5, "y": 4 }
    },
    "ball": { "x": 8.6, "y": 1.4, "height": 3.4 }
  },
  "target": [
    { "x": 0.5, "y": 0.2 },
    { "x": 5, "y": 0.2 },
    { "x": 5, "y": 2.6 },
    { "x": 0.5, "y": 2.6 }
  ],
  "tolerance": 0.4,
  "explanation": "Bij blok hoek verdedig jij de lijn."
}
```

- `setup` is de beginstand. De speler mag daar nog niet in de doelzone staan.
- `target` is de zone waar de speler heen moet.
- `tolerance` is hoeveel meter ernaast nog goed telt.

## Bloksignalen aanpassen

Open `src/config/vereniging.json`:

```json
{
  "bloksignalen": {
    "lijn": "één vinger",
    "hoek": "twee vingers",
    "ball": "een open hand",
    "geenBlok": "een vuist"
  }
}
```

Verander de tekst, en alle lessen en quizvragen passen zich aan. In een lesbestand gebruik je zo'n signaal met `{signaal.lijn}`. Zet zo'n signaal niet vooraan in een zin, want de tekst begint met een kleine letter.

## Een les afronden

Controleer deze punten:

- [ ] Klopt de inhoud met de [FIVB-regels](https://www.fivb.com/beach-volleyball/the-game/official-rules-of-the-games/)? Verzin geen regels. Twijfel je, zet het dan in `content/TWIJFELGEVALLEN.md`.
- [ ] Is tactiek duidelijk een afspraak of gewoonte, en niet gebracht als regel?
- [ ] Heeft de les 4 tot 7 stappen en minstens twee quizvragen?
- [ ] Heeft iemand van de vereniging het nagekeken? Zet dan `status` op `definitief`, en het label "Concept" verdwijnt.

Laat daarna `npm test` en `npm run test:e2e` draaien. Die vinden tikfouten in de JSON, ontbrekende spelers en uitleg die niet past.
