# BACKLOG – Vättigt

ID-serie: en gemensam löpande nummerserie. B = bugg, F = funktion, D = planering/design.
Prioritet: Hög, Medel, Låg.

## Öppet

| ID | Prio | Status | Beskrivning |
|---|---|---|---|
| D-003 | Hög | Väntar på användaren | Välj bland förslagen i docs/DESIGN.md: namn på vapen, banor, väsen, spellägen. Svara på de öppna frågorna i HANDOFF.md. |
| F-032 | Medel | Förslag | Spellägen ur designförslaget: Boet (skydda ert bo), Kubb (fäll motståndarens kubbar och sist kungen) och Stången (håll platsen vid midsommarstången). |
| F-033 | Låg | Förslag | Pratbubblor där lagen pratar dialekt (skånska, göteborgska, norrländska). |
| F-034 | Låg | Förslag | Fler banor ur designförslaget: Fjället, Slätten, Raukarna, Takåsarna, Älven, Villaområdet. |
| D-012 | Medel | Parkerad | Musik: chiptune möter svensk folkmusik. Utkast 1 av Midsommarpolskan (docs/music/index.html) används tills vidare; användaren är inte helt såld. Tas upp igen när spelet är spelbart. Idéer: låt per bana, musik i lager som följer läget, korta slingor per lag och händelse. |

## Proposed runs

Prioriterat för: att det som finns fungerar bra på riktiga telefoner innan mer läggs till.

- **A** – stark modell, hög nivå – Spellägen
  - F-032 – Boet, Kubb och Stången, så att matcherna kan vinnas på fler sätt än att vara sist kvar
  - Fråga: Vilket läge först? Rekommendation: Kubb, eftersom det är mest svenskt och lättast att förstå.
- **B** – standardmodell, medelnivå – Pratbubblor
  - F-033 – Vättarna säger saker på dialekt när de skjuter, träffas och vinner
- **C** – stark modell, hög nivå – Fler banor
  - F-034 – Två eller tre banor till ur designförslaget
  - Fråga: Vilka? Rekommendation: Fjället (snö som rasar) och Takåsarna (tak och tunnelbana).

Användarens provspel går före allt detta.

Parkerat: D-012 (musik).

## Klart

| ID | Klart | Beskrivning |
|---|---|---|
| D-001 | 2026-11-13 | Första designförslaget: stil, banor, arsenal, väsen, spelidéer (docs/DESIGN.md). |
| F-029 | 2026-11-17 | Metspöt: kasta ut linan, svinga med pilarna, släpp med Hoppa; avslutar inte turen. |
| F-030 | 2026-11-17 | Datormotståndare i tre nivåer (lätt, lagom, svår): "Spela mot datorn" på startsidan och Motståndare i eget spel. Bara på en telefon, inte online. |
| F-031 | 2026-11-17 | network-kit v0.5.1 inne (felrättningar: platsen i laget tillbaka efter lång frånvaro, namnet syns direkt). |
| D-006 | 2026-11-17 | Typsnitten ligger i spelet med licenser; inga anrop till Google från någon sida. |
| F-028 | 2026-11-17 | Lådor av/på i eget spel och online. |
| F-027 | 2026-11-17 | Skurhinken, Kräftskivan och Snöbollen. Metspöt väntar (F-029). |
| D-026 | 2026-11-17 | Banan Borås (parkeringshus, ån, regn, slukhål, fel vara i lådor, bronsstaty) och Knallen som byter vapen. |
| F-024 | 2026-11-17 | Lådor varannan runda: postpaket med vapen, fikakorg med liv, fallskärm, förstörs av smällar. |
| F-025 | 2026-11-17 | Fem till: Jasså 39, Prinsesstårtan, Plattpaketet, Halmbocken och Enkel biljett till Borås. Vapnen väljs nu i en meny (tolv får inte plats i panelen). |
| D-010 | 2026-11-17 | Borås: stämpeln Bara i Borås med dansbandsslinga och verktyget Enkel biljett till Borås. Banan och Knallen är kvar (D-026). |
| F-023 | 2026-11-17 | Fyra nya vapen: Köttbullar, Fallukorv, Dalahästen och Älgtestet. |
| F-021 | 2026-11-17 | Online väljer rumsägaren lag från sin lagbyggare, vättar per lag, turtid, vårflod och vapen (under "Inställningar för matchen" i lobbyn). |
| F-022 | 2026-11-17 | Flyttblock som faller och rullar, gruvvagnen som rullar när den knuffas, dimman som döljer motståndarlaget. |
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
