# BACKLOG – Vättigt

ID-serie: en gemensam löpande nummerserie. B = bugg, F = funktion, D = planering/design.
Prioritet: Hög, Medel, Låg.

## Öppet

| ID | Prio | Status | Beskrivning |
|---|---|---|---|
| D-003 | Hög | Väntar på användaren | Välj bland förslagen i docs/DESIGN.md: namn på vapen, banor, väsen, spellägen. Svara på de öppna frågorna i HANDOFF.md. |
| D-006 | Låg | Förslag | Bestäm hur typsnitt ska levereras (egen fil i stället för Google Fonts) inför publicering. |
| D-010 | Medel | Väntar på användaren | Borås i spelet: bana, verktyget Enkel biljett till Borås, stämpeln Bara i Borås och Knallen. Förslag i docs/DESIGN.md; användaren väljer vilka delar som ska med. |
| F-021 | Medel | Förslag | Fler inställningar i onlinelobbyn: turtid, vättar per lag, vårflod, vapen och egna lag från lagbyggaren (i dag bara bana och stämning). |
| F-022 | Låg | Förslag | Banornas extra regler som saknas: flyttblock som rullar, gruvvagnen som rullar på rälsen, dimman i Trollskogen som döljer vättar. |
| F-023 | Medel | Förslag | Fler vapen ur designförslaget i spelet, till exempel Fallukorv, Dalahästen, Älgtestet och Köttbullar. |
| D-012 | Medel | Parkerad | Musik: chiptune möter svensk folkmusik. Utkast 1 av Midsommarpolskan (docs/music/index.html) används tills vidare; användaren är inte helt såld. Tas upp igen när spelet är spelbart. Idéer: låt per bana, musik i lager som följer läget, korta slingor per lag och händelse. |

## Proposed runs

Prioriterat för: roligare matcher med vänner.

- **A** – stark modell, hög nivå – Fler vapen
  - F-023 – Lägg till Fallukorv, Dalahästen, Älgtestet och Köttbullar, så att matcherna får fler sätt att vinna
  - Fråga: Vilka vapen först? Rekommendation: de fyra ovan, eftersom de skiljer sig mest från dagens tre.
- **B** – standardmodell, medelnivå – Inställningar online
  - F-021 – Låt rumsägaren välja turtid, vättar per lag, vårflod, vapen och egna lag, så att online blir som eget spel
- **C** – stark modell, hög nivå – Banornas sista regler
  - F-022 – Block som rullar, gruvvagnen och dimman som döljer, så att banorna blir som i designen

D-006 (typsnitt) tas inför bredare publicering.

Parkerat: D-012 (musik).

## Klart

| ID | Klart | Beskrivning |
|---|---|---|
| D-001 | 2026-11-13 | Första designförslaget: stil, banor, arsenal, väsen, spelidéer (docs/DESIGN.md). |
| D-018 | 2026-11-17 | Kobbarna, Trollskogen och Gruvan spelbara: granit och flyttblock tål mer, trä går sönder lätt, trollet kastar sten på natten, lyktor släcks av smällar och mörker i gruvan. Inte med: block som rullar, gruvvagnen, dimma som döljer. |
| D-019 | 2026-11-17 | Eget spel (bana, stämning, lag, vättar per lag, turtid, vårflod, vapen, förhandsvisning med riktig grafik) och lagbyggare (namn, färg, luva, fem vättar, sparas i webbläsaren). Online: rumsägaren väljer bana och stämning. |
| D-020 | 2026-11-17 | Beslut: vättarna behåller sin storlek på banan tills vidare. |
| D-017 | 2026-11-17 | Lagnamnet Vätternrundan bytt mot Vättrundan i spelet, mockupsidorna och designförslaget. |
| D-004 | 2026-11-17 | Tre nya banor som mockup: Kobbarna, Trollskogen, Gruvan (docs/maps/). |
| D-007 | 2026-11-17 | Vättarna i större format, 16 × 22, med rörelser och varianter (docs/characters/). |
| D-008 | 2026-11-17 | Mockup av startmeny, eget spel med stämningsreglage (riktig grafik) och lagbyggare (docs/screens/). |
| D-005 | 2026-11-17 | Namnen mot varumärken (docs/NAMES.md). Vätternrundan bör bytas; övriga kan behållas med försiktighet i grafiken. |
| F-014 | 2026-11-17 | Vättigt på Cloudflare: spelet och rummen från samma Worker, publiceras från main. Kontrollerat av publiceringsflödet och av användaren (multiplayer fungerar). GitHub Pages avstängt. |
| F-015 | 2026-11-17 | Spel över nätet: rum, länk, QR-kod och rumskod, lobby med lag, samma match hos alla via inmatningslogg, omladdning och värdbyte, integritetstext. Provat mellan två emulerade telefoner mot lokal rumsserver; inte på Cloudflare eller riktiga telefoner. |
| F-016 | 2026-11-17 | Hoppknappen flyttad till höger sida, så att man styr med vänster hand och hoppar med höger. Vapenknapparna blev kompakta ikoner; valt vapen står i bilden. |
| F-013 | 2026-11-17 | Första spelbara versionen: match på samma skärm för mobil, Midsommarängen, tre vapen, sprängbar terräng, vind, turtid, vårflod, musik och ljud. Provad i telefonsimulering, inte på riktig telefon. |
| D-009 | 2026-11-17 | Grundreglerna med siffror (docs/RULES.md). |
| D-011 | 2026-11-17 | Hur Vättigt använder network-kit: riktningen godkänd (alla räknar samma fysik, värdstyrda rum). docs/NETWORK.md. |
| D-002 | 2026-11-13 | Mockup av spelscen: Midsommarängen med fyra stämningar och sprängbar terräng (docs/mockup/index.html). |
