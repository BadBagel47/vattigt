# Vättigt och network-kit (förslag, D-011)

Status: förslag. Bygger på network-kit v0.2.3 (`BadBagel47/network-kit`, se dess `docs/INTEGRATION.md`). Inget här är beslutat förrän det står under Decisions i [HANDOFF.md](../HANDOFF.md).

## Kort

Vättigt passar network-kits **värdstyrda rum** (`mode: 'host'`), samma sort som Critical ST8 använder. Ingen ändring i network-kit behövs för att börja.

## Varför värdstyrt och inte serverstyrt

- Fysiken (projektiler, studsar, terräng som rasar, vättar som faller) är tung att räkna. I ett serverstyrt rum skulle den köras i Cloudflare och äta av gratiskvoten.
- I ett värdstyrt rum räknar webbläsarna själva. Rummet bara skickar vidare meddelanden, och bara inkommande meddelanden kostar.

## Förslag: alla räknar samma sak

Spelet är turbaserat, och under en tur är det bara en spelare som styr. Därför:

1. Den aktiva spelaren skickar sin **indata** (gå, hoppa, sikta, skjut) när den ändras.
2. Värden skickar vidare till alla. Varje webbläsare räknar fram samma resultat själv.
3. Värden äger turordning, turtid och vad som finns i lådorna, och skickar ut beslut som vanliga meddelanden.
4. Efter varje tur skickar värden en kontrollsumma av läget. Om någon har räknat fel får den det fullständiga läget.
5. Värden sparar matchen med `sendSnapshot` efter varje tur: banans kratrar, vättarnas liv och platser, vapenlager, tur och runda.

Det ger ett mycket billigt spel. En tur blir några tiotal meddelanden, inte en ström av positioner.

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

## Det som inte passar än

- **Brevspel** (ta din tur när du har tid): network-kit raderar ett rum 24 timmar efter att sista spelaren lämnat, och rum är inte byggda för matcher över flera dagar. Brevspel behöver antingen en ny funktion i network-kit eller egen lagring i Vättigt. Turbaserade spel som memory eller schack skulle ha samma behov, så det kan vara en allmän funktion. Frågan tas till network-kit när Vättigt kommer dit.
- **Repriser och åskådare i efterhand:** fungerar av sig självt om alla räknar likadant, eftersom en match då bara är seed plus indata. Lagras i Vättigt, inte i network-kit.

## Ordning

1. Flera spelare på samma skärm: kräver inget nätverk. Byggs först.
2. Spel över nätet med rumskod via network-kit.
3. Brevspel: efter beslut om var lagringen ska ligga.
