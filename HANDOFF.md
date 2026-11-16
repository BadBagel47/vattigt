# HANDOFF – Vättigt

Rules version: 1.9 (uppdaterad 2026-11-16, inga ändringar behövdes)
Inventory: 2026-11-13
Project language: inte bestämt (se Öppna frågor). Designunderlaget skrivs på svenska eftersom namn och ordvitsar är svenska.
Publishing method: ingen ännu. Repot är publikt och saknar GitHub Pages. Mockupen är en fristående HTML-fil.

## Mål

Vättigt är ett turbaserat artillerispel i samma genre som klassiska Worms, med egen identitet: spelfigurerna är vättar ur svensk folktro, banorna bygger på svenska miljöer och vapnen har svenskklingande namn. Grafiken är pixelgrafik med modern känsla.

## Nuläge

- Projektet är i designfasen. Ingen spelkod finns.
- Första designförslaget finns i [docs/DESIGN.md](docs/DESIGN.md).
- Första mockupen av en spelscen (Midsommarängen, fyra stämningar, sprängbar terräng) finns i [docs/mockup/index.html](docs/mockup/index.html).

## Nästa steg

- Användaren svarar på de öppna frågorna nedan och väljer bland förslagen i DESIGN.md.
- Därefter: se "Proposed runs" i [BACKLOG.md](BACKLOG.md).

## Öppna frågor till användaren

1. Språk i spelet: svenska, eller svenska och engelska?
2. Mobil först eller dator först?
3. Ton: mysig och skämtsam, eller mörkare sagoskog?
4. Vilken bana ska ritas härnäst?
5. Ska mockuperna publiceras med GitHub Pages?

## Arbetssätt

- Design först. Kod påbörjas inte förrän användaren säger till.
- Multiplayer byggs före singleplayer, så att datormotståndare inte behövs från start.
- Multiplayer byggs på network-kit (`BadBagel47/network-kit`), användarens gemensamma rumsserver på Cloudflare. Vättigt tar en egen kopia av en fast version. Allmänna behov löses i network-kit, inte här. Förslag på hur Vättigt passar in: [docs/NETWORK.md](docs/NETWORK.md).

## Decisions

- 2026-11-13: Projektet heter Vettigt. Spelfigurerna är vättar ur svensk folktro. (Namnet ersatt 2026-11-16, se nedan.)
- 2026-11-13: Banor bygger på svenska miljöer. Vapen och bifigurer har svensk inspiration.
- 2026-11-13: Namn ska gå att känna igen men inte vara samma som verkliga produkter eller varumärken (exempel: bazookan heter inte Carl Gustaf, förslaget är Kalle Gurra).
- 2026-11-13: Stilen är retro med modern känsla: låg upplösning med hela pixlar, mjukt ljus i eget lager, rastrerade övergångar, begränsad palett.
- 2026-11-13: Stämning (tid på dygnet, årstid, väder) ska gå att ställa in i eget spel.
- 2026-11-13: Spelet ska finnas som både singleplayer och multiplayer. Multiplayer först.
- 2026-11-16: Nätverkskoden kommer från network-kit.
- 2026-11-16: Inget brevspel. Spelet spelas bara lokalt (samma skärm) och online.
- 2026-11-16: Ordvitsar görs på både vett och vätt.
- 2026-11-16: Spelet heter **Vättigt** (efter vättarna). Repot heter `vattigt`, utan svenska tecken.

## Lagar och regler (kort genomgång 2026-11-13)

- Varumärken och upphovsrätt: spelet får inte använda namn, figurer eller utseende från Worms, och vapennamn får inte vara verkliga varumärken. Hanteras genom egna namn. Bevakas i B/F/D-listan (D-005).
- Typsnitt, ljud och bilder måste ha licens som tillåter användningen. Mockupen laddar två typsnitt från Google Fonts (öppen licens), vilket också innebär att besökarens webbläsare kontaktar Google. Tas upp inför publicering (D-006).
- Personuppgifter och kakor blir aktuellt först med multiplayer och konton. Inget sådant finns ännu.
- Ingen juridisk säkerhet utlovas. Frågor om varumärken kan behöva juridisk rådgivning (PRV är officiell källa).

## Miljö och begränsningar (2026-11-13)

- Agenten kan pusha direkt till main.
- GitHubs GraphQL-API är inte tillgängligt i agentens miljö; REST fungerar.

## Engångsåtgärder

- Klar (2026-11-16): repot heter `vattigt` på GitHub (tidigare `vettigt`; gamla länkar leds vidare av GitHub).

- GitHub Pages: föreslagen, väntar på svar (öppen fråga 5).

## Dokumentationskarta

- [docs/DESIGN.md](docs/DESIGN.md) – designförslaget: stil, banor, arsenal, väsen, spelidéer.
- [docs/mockup/index.html](docs/mockup/index.html) – mockup av spelscen.
- [docs/NETWORK.md](docs/NETWORK.md) – hur Vättigt använder network-kit.
