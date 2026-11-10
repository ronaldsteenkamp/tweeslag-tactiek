# Lessen schrijven

Deze handleiding is voor iedereen die inhoud wil aanpassen. Programmeren is niet nodig. Je past tekstbestanden aan, en de app doet de rest.

## Waar staat wat?

| Wat je wilt aanpassen     | Bestand                      |
| ------------------------- | ---------------------------- |
| Een les of quizvraag      | `src/content/nl/lessen/`     |
| De spelregels             | `src/content/nl/regels.json` |
| Signalen en roepwoorden   | `src/config/vereniging.json` |
| Vragen die nog open staan | `content/TWIJFELGEVALLEN.md` |

## Een tekst aanpassen op GitHub

Voor een kleine wijziging heb je alleen een GitHub-account met schrijfrechten nodig.

1. Open het bestand op GitHub.
2. Klik op het potloodje rechtsboven.
3. Pas de tekst aan. Verander alleen wat tussen aanhalingstekens staat.
4. Klik op **Commit changes** en schrijf kort wat je hebt veranderd.
5. De tests draaien daarna vanzelf. Slagen ze, dan staat je wijziging na een paar minuten live.

## Hoe een lesbestand werkt

De bestanden zijn JSON. Daar gelden een paar strenge regels:

- Tekst staat tussen dubbele aanhalingstekens: `"zo"`.
- Tussen twee items staat een komma, na het laatste item niet.
- Wil je een aanhalingsteken in je tekst, gebruik dan “deze”.

Een les bestaat uit drie delen: gegevens over de les, de stappen en de quiz.

### Gegevens over de les

| Veld           | Betekenis                                                                |
| -------------- | ------------------------------------------------------------------------ |
| `id`           | Korte naam voor de link, alleen kleine letters en streepjes              |
| `order`        | Plek in het overzicht                                                    |
| `status`       | `concept`, of `definitief` als de vereniging akkoord is                  |
| `niveau`       | `basis`, `gevorderd` of `expert`                                         |
| `vereisten`    | Id's van lessen die eerst af moeten zijn; `[]` als er geen zijn          |
| `duurMinuten`  | Geschatte duur van de les met quiz, in hele minuten                      |
| `leerdoelen`   | Twee of drie korte zinnen: "Na deze les kun je…"                         |
| `teVerifieren` | Punten die iemand moet nakijken (niet verplicht, zie onder)              |
| `title`        | Titel in het overzicht                                                   |
| `description`  | Eén zin in het overzicht                                                 |
| `level`        | Alleen voor deellinks: `beginner` of `gevorderd`. Staat los van `niveau` |

### Niveaus en vereisten

Zo begint een les op gevorderd niveau:

```json
{
  "id": "transitie",
  "order": 11,
  "status": "concept",
  "niveau": "gevorderd",
  "vereisten": ["blokken-of-peelen"],
  "duurMinuten": 5,
  "leerdoelen": [
    "Na deze les weet je wie de set geeft en wie aanvalt.",
    "Na deze les kun je als blokker na het blok een aanloop maken."
  ],
  "teVerifieren": ["Klopt deze afspraak voor Tweeslag?"]
}
```

- Een niveau gaat open als alle lessen van de niveaus eronder zijn afgerond.
- Daarna gaat een les open als de lessen in `vereisten` af zijn. Houd die lijst kort, anders zit veel op slot.
- Een vereiste mag niet naar een hoger niveau wijzen, en lessen mogen niet in een cirkel naar elkaar wijzen. `npm test` controleert dat.
- De knop **Alles ontgrendelen** in het overzicht negeert alle sloten.
- Elk niveau krijgt vanzelf een niveautoets: twee willekeurige vragen per les. Daar hoef je niets voor te doen.

JSON kent geen commentaar. Twijfel je over iets, zet het dan in `teVerifieren`. Met `npm run twijfels` komt het in `content/TWIJFELGEVALLEN.md`.

### Stappen

Elke stap staat in `keyframes`. Een les op basisniveau heeft 4 tot 7 stappen, een gevorderde of expertles 5 tot 10. Boven de 7 stappen scrollt de stappenbalk op een telefoon.

| Veld         | Betekenis                                                             |
| ------------ | --------------------------------------------------------------------- |
| `id`         | Korte naam, uniek binnen de les                                       |
| `durationMs` | Hoe lang de beweging naar deze stap duurt; 1500 is anderhalve seconde |
| `players`    | Waar elke speler aan het eind van de stap staat                       |
| `ball`       | Waar de bal is, met eventueel `height` (hoogte) en `arc` (boog)       |
| `arrows`     | Lijnen op het veld (niet verplicht)                                   |
| `zones`      | Gekleurde vlakken op het veld (niet verplicht)                        |
| `caption`    | De uitleg bij deze stap                                               |
| `tip`        | Een praktijktip, los van de regels (niet verplicht, kort houden)      |

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
2. Kies **Menu** en dan **Exporteer als lesstap**. De huidige stap staat nu op je klembord.
3. Plak hem in `keyframes` in je lesbestand. Vergeet de komma tussen twee stappen niet.

Wil je alle stappen tegelijk, kies dan **Exporteren**. Je krijgt een JSON-bestand; kopieer daaruit het deel `keyframes`.

### Varianten

Dezelfde situatie op een andere manier, bijvoorbeeld met blok lijn, blok hoek of peel, zet je in `variants` onder `keyframes` in het scenario. De lesspeler toont dan knoppen boven het veld.

```json
"variants": [
  {
    "id": "blok-lijn",
    "label": "Blok lijn",
    "keyframes": []
  }
]
```

Een variant heeft eigen stappen, opgebouwd zoals hierboven, met dezelfde vier spelers.

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

Een les op basisniveau heeft minstens twee vragen. Gevorderde en expertlessen hebben er minstens drie, waarvan minstens één van een nieuw type: plaatsen, freeze frame, looplijn, fout zoeken of volgorde.

Elke vraag heeft een `id`, een `kind`, een `prompt` (de vraag) en een `explanation` (de uitleg na het antwoord).

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

### Beide spelers plaatsen

Elke speler heeft een eigen doelzone. De spelers mogen niet allemaal al goed staan.

```json
{
  "id": "blok-lijn-beide",
  "kind": "placeBoth",
  "prompt": "Jullie spelen blok lijn. Zet A1 en A2 goed neer.",
  "setup": {
    "players": {
      "A1": { "x": 5, "y": 3 },
      "A2": { "x": 6.5, "y": 2 },
      "B1": { "x": 9, "y": 1.2 },
      "B2": { "x": 10.5, "y": 4 }
    },
    "ball": { "x": 8.6, "y": 1.4, "height": 3.4 }
  },
  "targets": [
    {
      "playerId": "A1",
      "target": [
        { "x": 6.8, "y": 0.2 },
        { "x": 7.9, "y": 0.2 },
        { "x": 7.9, "y": 2 },
        { "x": 6.8, "y": 2 }
      ],
      "tolerance": 0.3
    },
    {
      "playerId": "A2",
      "target": [
        { "x": 0.5, "y": 3.5 },
        { "x": 5, "y": 3.5 },
        { "x": 5, "y": 7.5 },
        { "x": 0.5, "y": 7.5 }
      ],
      "tolerance": 0.4
    }
  ],
  "explanation": "A1 sluit de lijn af, A2 verdedigt de diagonaal."
}
```

### Freeze frame

Een korte animatie stopt op de laatste stap; daarna kies je een antwoord. `alt` beschrijft in woorden wat er gebeurt, voor wie het veld niet kan zien. De stappen in `keyframes` hebben geen `caption` nodig.

```json
{
  "id": "freeze-peel",
  "kind": "freeze",
  "prompt": "De set zweeft ver van het net. Wat doet A1 nu?",
  "scene": {
    "alt": "B2 set de bal ver van het net naar B1. A1 staat aan het net. Het beeld stopt voor de aanval.",
    "keyframes": [
      {
        "id": "pass",
        "durationMs": 0,
        "players": {
          "A1": { "x": 7.4, "y": 1.5 },
          "A2": { "x": 3, "y": 5 },
          "B1": { "x": 10.4, "y": 1.5 },
          "B2": { "x": 12, "y": 4 }
        },
        "ball": { "x": 12, "y": 4, "height": 1.5 }
      },
      {
        "id": "set",
        "durationMs": 1200,
        "players": {
          "A1": { "x": 7.4, "y": 1.5 },
          "A2": { "x": 3, "y": 5 },
          "B1": { "x": 10.4, "y": 1.5 },
          "B2": { "x": 12, "y": 4 }
        },
        "ball": { "x": 10.2, "y": 1.6, "height": 3.4, "arc": 2 }
      }
    ]
  },
  "options": ["Springen voor het blok", "Terugtrekken", "Blijven staan"],
  "correct": 1,
  "explanation": "De set ligt ver van het net, dus A1 peelt."
}
```

Net als bij meerkeuze telt `correct` vanaf 0.

### Looplijn tekenen

Je sleept de speler; de route blijft op het veld staan. De route is goed als het eindpunt in `target` ligt, hij niet over het net gaat, en hij niet langer is dan `maxDetour` keer de rechte lijn. Met 1.5 mag de route anderhalf keer zo lang zijn. Een kleine marge voor een bibberige hand zit er al in.

```json
{
  "id": "route-peel",
  "kind": "route",
  "prompt": "Teken de route van A1 bij een peel.",
  "playerId": "A1",
  "setup": {
    "players": {
      "A1": { "x": 7.4, "y": 1.5 },
      "A2": { "x": 3, "y": 5 },
      "B1": { "x": 10.4, "y": 1.5 },
      "B2": { "x": 12, "y": 4 }
    },
    "ball": { "x": 10.2, "y": 1.6, "height": 3.4 }
  },
  "target": [
    { "x": 2.5, "y": 0.3 },
    { "x": 6, "y": 0.3 },
    { "x": 6, "y": 3 },
    { "x": 2.5, "y": 3 }
  ],
  "tolerance": 0.5,
  "maxDetour": 1.5,
  "explanation": "A1 loopt zo recht mogelijk van het net weg."
}
```

### Fout zoeken

Een animatie met een tactische fout. In `spots` staat wat je kunt aantikken: een speler met `playerId`, of een zone met `polygon`. `correct` is het `id` van de plek waar het misgaat. Eén stap in `keyframes` is hier ook goed.

```json
{
  "id": "fout-blok-lijn",
  "kind": "spotError",
  "prompt": "Jullie hadden blok lijn afgesproken. Waar gaat het mis?",
  "scene": {
    "alt": "A1 blokt de lijn. A2 staat achterin langs dezelfde lijn, en de diagonaal is leeg.",
    "keyframes": [
      {
        "id": "set",
        "durationMs": 0,
        "players": {
          "A1": { "x": 7.5, "y": 1 },
          "A2": { "x": 3, "y": 1.6 },
          "B1": { "x": 9, "y": 1.2 },
          "B2": { "x": 10.5, "y": 4 }
        },
        "ball": { "x": 8.6, "y": 1.4, "height": 3.4 }
      }
    ]
  },
  "spots": [
    { "id": "a1", "label": "A1", "playerId": "A1" },
    { "id": "a2", "label": "A2", "playerId": "A2" },
    {
      "id": "diagonaal",
      "label": "Diagonaal",
      "polygon": [
        { "x": 1, "y": 4 },
        { "x": 5, "y": 4 },
        { "x": 5, "y": 7.5 },
        { "x": 1, "y": 7.5 }
      ]
    }
  ],
  "correct": "a2",
  "explanation": "A2 staat achter het blok op de lijn, die A1 al afsluit."
}
```

### Volgorde

Zet de stappen in `items` in de **goede** volgorde. De app husselt ze zelf, en begint nooit met de goede volgorde.

```json
{
  "id": "volgorde-callen",
  "kind": "order",
  "prompt": "Zet de stappen van de setter op volgorde.",
  "items": [
    "Set de bal",
    "Draai naar het net",
    "Kijk waar de verdediger heen gaat",
    "Roep de open zone"
  ],
  "explanation": "Eerst de set, dan pas kijken."
}
```

### Tijdslimiet

Op expertniveau kiest de speler vooraf of er een tijdslimiet is. In een vraag hoef je daarvoor niets in te vullen: de tijd hangt af van het type, van 20 seconden voor meerkeuze tot 40 voor volgorde. De tijden staan in `src/domain/exam.ts`.

## Bloksignalen en roepwoorden aanpassen

Open `src/config/vereniging.json`:

```json
{
  "roepwoorden": {
    "lijn": "lijn",
    "hoek": "hoek",
    "niemand": "niemand",
    "cut": "cut"
  },
  "bloksignalen": {
    "lijn": "één vinger",
    "hoek": "twee vingers",
    "ball": "een open hand",
    "geenBlok": "een vuist",
    "schijnLijn": "drie vingers",
    "schijnHoek": "vier vingers",
    "spreid": "duim en pink"
  },
  "opslagsignalen": {
    "doel": "wiebelen met de hand"
  }
}
```

Verander de tekst, en alle lessen en quizvragen passen zich aan. In een lesbestand gebruik je:

| Blok in `vereniging.json` | In een lesbestand | Voorbeeld              | Betekenis                                          |
| ------------------------- | ----------------- | ---------------------- | -------------------------------------------------- |
| `bloksignalen`            | `{signaal.…}`     | `{signaal.lijn}`       | Blok lijn                                          |
|                           |                   | `{signaal.hoek}`       | Blok hoek (diagonaal)                              |
|                           |                   | `{signaal.ball}`       | Geen kant vooraf, blok op de bal                   |
|                           |                   | `{signaal.geenBlok}`   | Geen blok, de blokker trekt terug                  |
|                           |                   | `{signaal.schijnLijn}` | Hoek laten zien, op het laatste moment lijn pakken |
|                           |                   | `{signaal.schijnHoek}` | Lijn laten zien, op het laatste moment hoek pakken |
|                           |                   | `{signaal.spreid}`     | Spreidblok, armen wijd                             |
| `opslagsignalen`          | `{opslag.…}`      | `{opslag.doel}`        | Serveer op de tegenstander aan die kant            |
| `roepwoorden`             | `{roep.…}`        | `{roep.lijn}`          | Wat je roept voor je aanvaller                     |

Zet een signaal niet vooraan in een zin, want de tekst begint met een kleine letter. Het opslagsignaal is een werkwoord (“wiebelen met de hand”); schrijf de zin daarom zo dat dat past, bijvoorbeeld: “het opslagsignaal: **{opslag.doel}**”.

De sleutels in de tabel zijn verplicht; laat ze staan en verander alleen de tekst erachter. Een nieuwe sleutel mag je toevoegen, die is dan meteen te gebruiken. Een verwijzing naar een sleutel die niet bestaat, laat `npm test` mislukken.

## Een les afronden

Controleer deze punten:

- [ ] Klopt de inhoud met de [FIVB-regels](https://www.fivb.com/beach-volleyball/the-game/official-rules-of-the-games/)? Verzin geen regels. Twijfel je, zet het dan in `teVerifieren`.
- [ ] Is tactiek duidelijk een afspraak of gewoonte, en niet gebracht als regel?
- [ ] Kloppen `niveau`, `vereisten`, `duurMinuten` en `leerdoelen`?
- [ ] Heeft de les genoeg stappen en quizvragen (zie hierboven)?
- [ ] Heeft iemand van de vereniging het nagekeken? Zet dan `status` op `definitief`, en het label "Concept" verdwijnt.

Laat daarna `npm test` en `npm run test:e2e` draaien. Die vinden tikfouten in de JSON, ontbrekende spelers en uitleg die niet past.
