# Vättigt och network-kit (D-011)

Status: riktningen godkänd 2026-11-17 (alla räknar samma fysik). Detaljerna nedan är förslag. Bygger på network-kit v0.5.0 (`BadBagel47/network-kit`, se dess `docs/INTEGRATION.md`). Inget här är beslutat förrän det står under Decisions i [HANDOFF.md](../HANDOFF.md).

## Kort

Vättigt passar network-kits **värdstyrda rum** (`mode: 'host'`), samma sort som Critical ST8 använder. Ingen ändring i network-kit behövs för att börja.

## Varför värdstyrt och inte serverstyrt

- Fysiken (projektiler, studsar, terräng som rasar, vättar som faller) är tung att räkna. I ett serverstyrt rum skulle den köras i Cloudflare och äta av gratiskvoten.
- I ett värdstyrt rum räknar webbläsarna själva. Rummet bara skickar vidare meddelanden, och bara inkommande meddelanden kostar.

## Förslag: alla räknar samma sak

Spelet är turbaserat, och under en tur är det bara en spelare som styr. Därför:

1. Den aktiva spelaren skickar sin **indata** (gå, hoppa, sikta, skjut) när den ändras. Siktet skickas med `latest`, så att bara senaste värdet går iväg när fingret rör sig fort.
2. Värden skickar vidare till alla. Varje webbläsare räknar fram samma resultat själv.
3. Värden äger turordning, turtid och vad som finns i lådorna, och skickar ut beslut som vanliga meddelanden.
4. Efter varje tur skickar värden en kontrollsumma av läget. Om någon har räknat fel får den det fullständiga läget.
5. Värden sparar matchen med `sendSnapshot` efter varje tur: banans kratrar, vättarnas liv och platser, vapenlager, tur och runda.

Det ger ett mycket billigt spel. En tur blir några tiotal meddelanden, inte en ström av positioner.

**Takt för indata (råd från network-kits agent, 2026-11-17):** att bara skicka indata när den ändras räcker inte, eftersom de andra webbläsarna måste veta hur långt de får räkna utan att missa något. Förslag:

- Den aktiva spelaren skickar en liten bunt ungefär var tionde sekund: vilka steg den täcker och indata per steg, även tomma buntar.
- De andra ligger ungefär 0,2 sekunder efter.
- I faserna där ingen styr (vänta tills allt ligger still, matchstart) räknar alla fritt utan att vänta, eftersom spelet bara tar emot indata under sikte och reträtt.
- Försvinner den aktiva spelaren mitt i turen meddelar värden "ingen mer indata efter steg N", och resten av turen räknas som tom indata.
- Med buntar behövs inte `latest` för siktet.
- Rummets startvärde passar direkt som matchens startvärde.

**Krav på spelets kod:** fysiken måste ge exakt samma resultat i alla webbläsare. Det betyder heltal eller fasta decimaler, fast tidssteg och ingen `Math.random` (all slump från rummets `seed`). Kravet behöver finnas från första raden fysik.

**Reserv om det blir för svårt:** värden räknar ensam och skickar ut skeendet (projektilens bana, kratrar, skada). Kostar mer men kräver ingen exakt likadan fysik.

## Hur Vättigts begrepp blir network-kits

| Vättigt | network-kit |
|---|---|
| Lag (2–4) | `places`: ett ställe per lag, till exempel `{ lag1: 2, lag2: 2, lag3: 2, lag4: 2 }` så att två spelare kan dela lag |
| Spelare | rollen `player` |
| Åskådare | rollen `viewer` |
| Eget spel: bana, stämning, vapen, turtid | `room.data` (högst 4 kB), sätts av värden i lobbyn |
| Vind, bana som slumpas, lådornas innehåll | rummets `seed` (ny för varje runda) |
| Ny match med samma lag | `start()` igen |
| Värden tappar anslutningen mitt i en match | `takeover: true`: en annan spelare fortsätter från senaste sparade läget |
| Den som kommer in sent eller laddar om | värden skickar fullständigt läge när `peer` `join` eller `back` kommer |
| Rum i EU | `jurisdiction: 'eu'` |

Förslag på inställningar att börja från:

```js
export default {
  mode: 'host',
  takeover: true,
  takeoverMs: 15000,          // turbaserat: tål att någon byter app en stund
  places: { lag1: 2, lag2: 2, lag3: 2, lag4: 2 },
  roles: { player: { seats: 8 }, viewer: { seats: 4 } },
  lateJoin: 'next',
  maxMessagesPerDay: 20000,   // uppskattning, justeras efter provspel
};
```

## Behov som rapporterats till network-kit

Inget av detta krävs; Vättigt passar v0.5.0 som den är. Skickat 2026-11-17 till agenten som arbetar med network-kit. Den har lagt in idéerna som F-039 och F-040 i network-kits lista, med låg prioritet; användaren bestämmer när de byggs. Säg till den agenten när Vättigt börjar med onlinespel, så tas de upp då. Fram till dess skickar värden vidare indata.

- Den aktiva spelaren skulle kunna skicka direkt till alla, i stället för via värden. Halverar antalet meddelanden och gör att indata kommer fram även när värdens telefon sover.
- Värden skulle kunna peka ut vem som tar över först, till exempel den vars tur det är. Mellan turerna lägger spelarna ofta ifrån sig telefonen, så värdens telefon somnar lätt.

## Utanför planen

- **Brevspel** görs inte (beslut 2026-11-16). Spelet är bara lokalt och online, så network-kits rum som raderas 24 timmar efter sista spelaren räcker.
- **Repriser och åskådare i efterhand:** fungerar av sig självt om alla räknar likadant, eftersom en match då bara är seed plus indata. Lagras i Vättigt, inte i network-kit.

## Ordning

1. Flera spelare på samma skärm: kräver inget nätverk. Byggs först.
2. Spel över nätet med rumskod via network-kit.
