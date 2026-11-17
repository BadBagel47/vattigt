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
| D-009 | Låg | Förslag | Regelbeskrivning för grundspelet: turordning, skada, vind, lådor, vårflod. |
| D-010 | Medel | Väntar på användaren | Borås i spelet: bana, verktyget Enkel biljett till Borås, stämpeln Bara i Borås och Knallen. Förslag i docs/DESIGN.md; användaren väljer vilka delar som ska med. |
| D-012 | Medel | Parkerad | Musik: chiptune möter svensk folkmusik. Utkast 1 av Midsommarpolskan (docs/music/index.html) används tills vidare; användaren är inte helt såld. Tas upp igen när spelet är spelbart. Idéer: låt per bana, musik i lager som följer läget, korta slingor per lag och händelse. |
| F-013 | Hög | Förslag | Första spelbara versionen, lokalt på samma skärm, mobil först (pekskärm, liggande läge, på svenska): Midsommarängen, två lag med tre vättar, gå och hoppa, sikta och skjuta med Kalle Gurra, Dynamit-Alfred och Surströmming, sprängbar terräng, vatten som dödar, vind, turtid och vinst. Fysiken räknar exakt likadant varje gång, så att online kan läggas till sedan (D-011). Publiceras så att den kan spelas via en länk. |

## Proposed runs

- **A** – stark modell, hög nivå – Första spelbara versionen
  - F-013 – Bygg en spelbar match på samma skärm, så att spelet går att prova på riktigt
  - D-009 – Skriv in grundreglerna (turordning, skada, vind, vatten) som versionen följer, så att siffrorna går att justera efter provspel
- **B** – standardmodell, medelnivå – Fler banor som mockup
  - D-004 – Rita två till tre banor till, så att stilen prövas på olika miljöer
- **C** – stark modell, hög nivå – Figurer och skärmar
  - D-007 – Rita vättarna i större format med rörelser, så att de får personlighet
  - D-008 – Rita meny och eget spel, så att reglagen för stämning går att bedöma
- **D** – standardmodell, medelnivå – Namn
  - D-005 – Kontrollera namnen mot varumärken, så att inget behöver döpas om senare

A väntar på användarens klartecken. GitHub Pages behöver slås på av användaren för att versionen ska få en länk. D-006 (typsnitt) tas inför publicering.

Parkerat: D-012 (musik).

## Klart

| ID | Klart | Beskrivning |
|---|---|---|
| D-001 | 2026-11-13 | Första designförslaget: stil, banor, arsenal, väsen, spelidéer (docs/DESIGN.md). |
| D-011 | 2026-11-17 | Hur Vättigt använder network-kit: riktningen godkänd (alla räknar samma fysik, värdstyrda rum). docs/NETWORK.md. |
| D-002 | 2026-11-13 | Mockup av spelscen: Midsommarängen med fyra stämningar och sprängbar terräng (docs/mockup/index.html). |
