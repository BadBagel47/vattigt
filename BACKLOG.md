# BACKLOG – Vättigt

ID-serie: en gemensam löpande nummerserie. B = bugg, F = funktion, D = planering/design.
Prioritet: Hög, Medel, Låg.

## Öppet

| ID | Prio | Status | Beskrivning |
|---|---|---|---|
| D-003 | Hög | Väntar på användaren | Välj bland förslagen i docs/DESIGN.md: namn på vapen, banor, väsen, spellägen. Svara på de öppna frågorna i HANDOFF.md. |
| D-006 | Låg | Förslag | Bestäm hur typsnitt ska levereras (egen fil i stället för Google Fonts) inför publicering. |
| D-010 | Medel | Väntar på användaren | Borås i spelet: bana, verktyget Enkel biljett till Borås, stämpeln Bara i Borås och Knallen. Förslag i docs/DESIGN.md; användaren väljer vilka delar som ska med. |
| D-017 | Hög | Väntar på användaren | Byt lagnamnet Vätternrundan, som är namnet på ett känt cykellopp (D-005). Fråga: vilket namn? Rekommendation: Vättrundan. |
| D-018 | Medel | Förslag | Gör de nya banorna spelbara (Kobbarna, Trollskogen, Gruvan) med sina egna regler: hård granit och trä som rasar, block som rullar och ett troll som vaknar, mörker med lyktor. |
| D-019 | Medel | Förslag | Bygg eget spel och lagbyggaren i spelet efter mockupen (D-008), med stämning som tre reglage. |
| D-020 | Låg | Förslag | Bestäm om vättarna ska bli större på banan (16 × 22 och banor i 640 × 360) eller bara i menyer (D-007). |
| D-012 | Medel | Parkerad | Musik: chiptune möter svensk folkmusik. Utkast 1 av Midsommarpolskan (docs/music/index.html) används tills vidare; användaren är inte helt såld. Tas upp igen när spelet är spelbart. Idéer: låt per bana, musik i lager som följer läget, korta slingor per lag och händelse. |

## Proposed runs

Prioriterat för: mer att spela med vänner, i ordningen namn, banor, eget spel.

- **A** – standardmodell, medelnivå – Byt lagnamnet
  - D-017 – Byt Vätternrundan mot ett eget namn i spelet och dokumenten, så att laget inte förväxlas med cykelloppet
  - Fråga: Vilket namn? Rekommendation: Vättrundan.
- **B** – stark modell, hög nivå – Nya banor i spelet
  - D-018 – Gör Kobbarna, Trollskogen och Gruvan spelbara med sina egna regler, så att matcherna får variation
- **C** – stark modell, hög nivå – Eget spel och lagbyggare
  - D-019 – Bygg eget spel och lagbyggaren efter mockupen, så att ni kan välja bana, stämning, turtid och egna lag
  - Fråga: Ska vättarna bli större på banan (D-020)? Rekommendation: nej, inte nu; använd det stora formatet i menyer och lagbyggaren.

D-006 (typsnitt) tas inför bredare publicering.

Parkerat: D-012 (musik).

## Klart

| ID | Klart | Beskrivning |
|---|---|---|
| D-001 | 2026-11-13 | Första designförslaget: stil, banor, arsenal, väsen, spelidéer (docs/DESIGN.md). |
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
