# BACKLOG – Vättigt

ID-serie: en gemensam löpande nummerserie. B = bugg, F = funktion, D = planering/design.
Prioritet: Hög, Medel, Låg.

## Öppet

| ID | Prio | Status | Beskrivning |
|---|---|---|---|
| D-003 | Hög | Väntar på användaren | Välj bland förslagen i docs/DESIGN.md: namn på vapen, banor, väsen, spellägen. Svara på de öppna frågorna i HANDOFF.md. |
| D-004 | Medel | Förslag | Mockup av fler banor (förslag: Kobbarna, Trollskogen, Gruvan) i samma stil som Midsommarängen. |
| D-005 | Medel | Förslag | Gå igenom alla namn mot verkliga varumärken innan de låses. |
| D-006 | Låg | Förslag | Bestäm hur typsnitt ska levereras (egen fil i stället för Google Fonts) inför publicering. |
| D-007 | Medel | Förslag | Rita vättarna i större format: lagfärger, luvor, skägg, rörelser (gå, sikta, falla, fika). |
| D-008 | Medel | Förslag | Skärmar utanför matchen: startmeny, eget spel med reglage för stämning, lagbyggare. |
| D-010 | Medel | Väntar på användaren | Borås i spelet: bana, verktyget Enkel biljett till Borås, stämpeln Bara i Borås och Knallen. Förslag i docs/DESIGN.md; användaren väljer vilka delar som ska med. |
| F-014 | Hög | Förslag | Vättigt på Cloudflare: en Worker som serverar spelets sidor och kör rummen (network-kit v0.5.0, rum i EU), publicering från main med ett arbetsflöde. Kräver en Cloudflare-nyckel som hemlighet i repot. GitHub Pages stängs när Cloudflare-versionen är kontrollerad. |
| F-015 | Hög | Förslag | Spel över nätet: skapa rum, bjud in med länk eller QR-kod, lobby med lag, matchen räknas likadant hos alla (indata i buntar, se docs/NETWORK.md), värden tar över om någon försvinner. Kort integritetstext i spelet (smeknamn och IP-adresser hos Cloudflare). |
| D-012 | Medel | Parkerad | Musik: chiptune möter svensk folkmusik. Utkast 1 av Midsommarpolskan (docs/music/index.html) används tills vidare; användaren är inte helt såld. Tas upp igen när spelet är spelbart. Idéer: låt per bana, musik i lager som följer läget, korta slingor per lag och händelse. |

## Proposed runs

- **A** – stark modell, hög nivå – Spel över nätet
  - F-014 – Flytta spelet till Cloudflare tillsammans med rummen, så att allt finns på en adress
  - F-015 – Spela över nätet med rumskod eller länk, så att man inte behöver dela telefon
  - Fråga A1: Vilken adress? Rekommendation: Cloudflares gratisadress (vattigt.<konto>.workers.dev) nu, egen domän senare.
  - Fråga A2: Hur många spelare online? Rekommendation: två lag med en eller flera spelare per lag, plus åskådare; fler lag senare.
  - Fråga A3: Vad händer med GitHub Pages? Rekommendation: stängs av när Cloudflare-versionen är kontrollerad, så att det bara finns en adress.
- **B** – standardmodell, medelnivå – Fler banor som mockup
  - D-004 – Rita två till tre banor till, så att stilen prövas på olika miljöer
- **C** – stark modell, hög nivå – Figurer och skärmar
  - D-007 – Rita vättarna i större format med rörelser, så att de får personlighet
  - D-008 – Rita meny och eget spel, så att reglagen för stämning går att bedöma
- **D** – standardmodell, medelnivå – Namn
  - D-005 – Kontrollera namnen mot varumärken, så att inget behöver döpas om senare

A behöver Cloudflare-nyckeln i repot (HANDOFF.md, Engångsåtgärder). Användarens provspel av F-013 kan ge nya punkter som går före. D-006 (typsnitt) tas inför bredare publicering.

Parkerat: D-012 (musik).

## Klart

| ID | Klart | Beskrivning |
|---|---|---|
| D-001 | 2026-11-13 | Första designförslaget: stil, banor, arsenal, väsen, spelidéer (docs/DESIGN.md). |
| F-016 | 2026-11-17 | Hoppknappen flyttad till höger sida, så att man styr med vänster hand och hoppar med höger. Vapenknapparna blev kompakta ikoner; valt vapen står i bilden. |
| F-013 | 2026-11-17 | Första spelbara versionen: match på samma skärm för mobil, Midsommarängen, tre vapen, sprängbar terräng, vind, turtid, vårflod, musik och ljud. Provad i telefonsimulering, inte på riktig telefon. |
| D-009 | 2026-11-17 | Grundreglerna med siffror (docs/RULES.md). |
| D-011 | 2026-11-17 | Hur Vättigt använder network-kit: riktningen godkänd (alla räknar samma fysik, värdstyrda rum). docs/NETWORK.md. |
| D-002 | 2026-11-13 | Mockup av spelscen: Midsommarängen med fyra stämningar och sprängbar terräng (docs/mockup/index.html). |
