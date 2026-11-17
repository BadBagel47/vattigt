# HANDOFF – Vättigt

Rules version: 1.12 (uppdaterad 2026-11-17: körförslagets format och frågor, Pågår-markeringar)
Inventory: 2026-11-13
Project language: svenska (beslut 2026-11-17), både i spelet och i README. Kod, kodkommentarer och commits på engelska.
Publishing method: just nu GitHub Pages från main, roten: https://badbagel47.github.io/vattigt/ (igång och kontrollerat 2026-11-17). Ska ersättas av en Cloudflare Worker som också kör rummen (beslut 2026-11-17, F-014). Mockuper och musikverkstad är fristående HTML-filer under docs/.

## Mål

Vättigt är ett turbaserat artillerispel i samma genre som klassiska Worms, med egen identitet: spelfigurerna är vättar ur svensk folktro, banorna bygger på svenska miljöer och vapnen har svenskklingande namn. Grafiken är pixelgrafik med modern känsla.

## Nuläge

- Första spelbara versionen finns (F-013, 2026-11-17): en match på samma skärm, för mobil i liggande läge, på Midsommarängen. Två lag med tre vättar, Kalle Gurra, Surströmming och Dynamit-Alfred, sprängbar terräng, vind, turtid, vårflod och vinst. Musiken (utkast 1) och ljudeffekter är med.
- Spelet ligger i repots rot (`index.html`, `src/`). Fysiken i `src/sim/` räknar bara med heltal, så samma startvärde och samma knapptryck ger samma match överallt (D-011). Tester: `npm test`.
- Grundreglerna står i [docs/RULES.md](docs/RULES.md) (D-009).
- Provat i en telefonsimulering (iPhone och Pixel i liggande läge). Inte provat på en riktig telefon.
- Designförslaget finns i [docs/DESIGN.md](docs/DESIGN.md), mockupen i [docs/mockup/index.html](docs/mockup/index.html).

## Nästa steg

- Användaren provspelar på telefonen och säger vad som ska ändras.
- Därefter: se "Proposed runs" i [BACKLOG.md](BACKLOG.md).

## Öppna frågor till användaren

1. Ton: mysig och skämtsam, eller mörkare sagoskog?
2. Vilken bana ska ritas härnäst?

## Arbetssätt

- Kod skrivs i körningar som användaren godkänt. Spelet är ren JavaScript utan byggsteg.
- Multiplayer byggs före singleplayer, så att datormotståndare inte behövs från start.
- Multiplayer byggs på network-kit (`BadBagel47/network-kit`), användarens gemensamma rumsserver på Cloudflare. Vättigt tar en egen kopia av en fast version. Allmänna behov löses i network-kit, inte här. Förslag på hur Vättigt passar in: [docs/NETWORK.md](docs/NETWORK.md).

## Decisions

- 2026-11-13: Projektet heter Vettigt. Spelfigurerna är vättar ur svensk folktro. (Namnet ersatt 2026-11-16, se nedan.)
- 2026-11-13: Banor bygger på svenska miljöer. Vapen och bifigurer har svensk inspiration.
- 2026-11-13: Namn ska gå att känna igen men inte vara samma som verkliga produkter eller varumärken (exempel: bazookan heter inte Carl Gustaf, förslaget är Kalle Gurra).
- 2026-11-13: Stilen är retro med modern känsla: låg upplösning med hela pixlar, mjukt ljus i eget lager, rastrerade övergångar, begränsad palett.
- 2026-11-13: Stämning (tid på dygnet, årstid, väder) ska gå att ställa in i eget spel.
- 2026-11-13: Spelet ska finnas som både singleplayer och multiplayer. Multiplayer först.
- 2026-11-16: Nätverkskoden kommer från network-kit. (Agentens tolkning av "där har vi upplägg för nätverkskod"; bekräftad 2026-11-17 när användaren bad att behoven rapporteras dit.) Behov av nätverksfunktioner rapporteras till agenten som arbetar med network-kit (meddelande till den sessionen), inte genom att ändra i network-kits repo.
- 2026-11-16: Inget brevspel. Spelet spelas bara lokalt (samma skärm) och online.
- 2026-11-16: Ordvitsar görs på både vett och vätt.
- 2026-11-16: Musiken är chiptune som möter svensk folkmusik. Agenten komponerar och producerar allt (ljudet skapas i webbläsaren, inga riktiga instrument); användaren lyssnar och styr.
- 2026-11-17: Mobil först: spelet byggs för pekskärm och liggande läge; tangentbord och mus kommer sedan.
- 2026-11-17: Spelet är på svenska.
- 2026-11-17: Spelet publiceras med GitHub Pages. (Ersatt samma dag, se nedan.)
- 2026-11-17: Riktningen i D-011 är godkänd: fysiken räknar exakt likadant i alla webbläsare, från första raden kod, så att online kan läggas till med network-kit.
- 2026-11-17: Fokus är att komma till något spelbart.
- 2026-11-17: Vättigt är första spelet på network-kit (före Critical ST8, som fortsätter parallellt). Beslutat i network-kit-sessionen, bekräftat här.
- 2026-11-17: Online: Cloudflares gratisadress (workers.dev) nu, egen domän senare; två lag med en eller flera spelare per lag plus åskådare; GitHub Pages stängs när Cloudflare-versionen är kontrollerad (svar på körförslagets frågor, rekommendationerna godkända).
- 2026-11-17: Vättigt ska ligga på Cloudflare: spelets sidor och rummen kommer från samma Worker, på en adress. Ersätter GitHub Pages, som ligger kvar tills Cloudflare-versionen är på plats och kontrollerad (F-014). Musiken (utkast 1) används tills vidare och tas upp senare.
- 2026-11-16: Spelet heter **Vättigt** (efter vättarna). Repot heter `vattigt`, utan svenska tecken.

## Lagar och regler (kort genomgång 2026-11-13)

- Varumärken och upphovsrätt: spelet får inte använda namn, figurer eller utseende från Worms, och vapennamn får inte vara verkliga varumärken. Hanteras genom egna namn. Bevakas i B/F/D-listan (D-005).
- Typsnitt, ljud och bilder måste ha licens som tillåter användningen. Mockupen laddar två typsnitt från Google Fonts (öppen licens), vilket också innebär att besökarens webbläsare kontaktar Google. Tas upp inför publicering (D-006).
- Personuppgifter och kakor blir aktuellt först med multiplayer och konton. Inget sådant finns ännu.
- Ingen juridisk säkerhet utlovas. Frågor om varumärken kan behöva juridisk rådgivning (PRV är officiell källa).

## Miljö och begränsningar (2026-11-13)

- Agenten kan pusha direkt till main.
- GitHubs GraphQL-API är inte tillgängligt i agentens miljö; REST fungerar.
- 2026-11-17: API-anropet som slår på GitHub Pages spärras av agentens miljö.

## Engångsåtgärder

- Klar (2026-11-16): repot heter `vattigt` på GitHub (tidigare `vettigt`; gamla länkar leds vidare av GitHub).

- Klar (2026-11-17): GitHub Pages påslaget av användaren (main, roten).
- Väntar (F-014): användaren lägger in en Cloudflare-nyckel som hemlighet i repot (`CLOUDFLARE_API_TOKEN`, samma sort som network-kits demo), så att spelet kan publiceras till Cloudflare automatiskt. Agenten får inte göra det själv: GitHubs API för Pages är spärrat i agentens miljö.

## Dokumentationskarta

- [docs/DESIGN.md](docs/DESIGN.md) – designförslaget: stil, banor, arsenal, väsen, spelidéer.
- [index.html](index.html) och [src/](src/) – spelet. `src/sim/` är matchen (regler, fysik), `src/render/` grafiken, `src/audio/` ljudet, `src/main.js` kontroller och skärmar.
- [tests/](tests/) – tester av matchen (`npm test`).
- [docs/RULES.md](docs/RULES.md) – grundreglerna med siffror (D-009).
- [README.md](README.md) – kort om spelet och hur det körs lokalt.
- [docs/mockup/index.html](docs/mockup/index.html) – mockup av spelscen.
- [docs/NETWORK.md](docs/NETWORK.md) – hur Vättigt använder network-kit.
- [docs/music/index.html](docs/music/index.html) – musikverkstad med Midsommarpolskan, utkast 1.
