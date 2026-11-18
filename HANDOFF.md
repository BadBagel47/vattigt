# HANDOFF – Vättigt

Rules version: 1.12 (uppdaterad 2026-11-17: körförslagets format och frågor, Pågår-markeringar)
Inventory: 2026-11-13
Project language: svenska (beslut 2026-11-17), både i spelet och i README. Kod, kodkommentarer och commits på engelska.
Publishing method: Cloudflare Worker från main (arbetsflödet deploy.yml, hemligheten CLOUDFLARE_API_TOKEN, samma nyckel som network-kits demo enligt användarens beslut). Spelet: https://vattigt.l8p1.workers.dev. Arbetsflödet kontrollerar att spelet visas och att rum kan skapas; agentens miljö når inte workers.dev. GitHub Pages är avstängt (2026-11-17).

## Mål

Vättigt är ett turbaserat artillerispel i samma genre som klassiska Worms, med egen identitet: spelfigurerna är vättar ur svensk folktro, banorna bygger på svenska miljöer och vapnen har svenskklingande namn. Grafiken är pixelgrafik med modern känsla.

## Nuläge

- Spelbar match på samma telefon (F-013) och över nätet (F-015, 2026-11-17). Online: skapa rum, bjud in med länk, QR-kod eller rumskod, välj lag i lobbyn, rumsägaren väljer stämning och startar. Den som skapade rummet kör matchen; de andra följer samma match från dennes inmatning. Laddar man om kommer man tillbaka in; försvinner den som kör matchen tar en annan spelare över efter 15 sekunder.
- Cloudflare (F-014): en Worker serverar spelet och kör rummen (network-kit v0.5.0, kopia i `vendor/network-kit`, rum i EU) på https://vattigt.l8p1.workers.dev. Publiceras från main av arbetsflödet `deploy.yml`.
- Provat: spel över nätet mellan två emulerade telefoner mot en lokal rumsserver (samma match hos båda, omladdning, värdbyte), och av användaren på Cloudflare 2026-11-17: multiplayer fungerar.
- Känd begränsning: har ett lag ingen ansluten spelare går dess tur ut av sig själv (45 sekunder).
- Spelbara banor (Midsommarängen, Kobbarna, Trollskogen, Gruvan) med egna material och regler, eget spel och lagbyggare (D-018, D-019). Sju vapen (F-023). Online väljer rumsägaren bana, stämning, lag och inställningar (F-021). Flyttblock som rullar, gruvvagn och dimma (F-022). Lådor (F-024, av/på F-028), femton vapen i en vapenmeny (F-025, F-027), Borås-stämpeln med Enkel biljett till Borås (D-010) och banan Borås med Knallen (D-026). Metspöt (F-029), datormotståndare i tre nivåer (F-030), network-kit v0.5.1 (F-031) och typsnitten i spelet (D-006). Allt 2026-11-17. Spelläget Kubb (F-032), pratbubblor på dialekt (F-033) och banorna Fjället och Takåsarna (F-034), 2026-11-18. Sju banor totalt. Siktning med pil upp och ner (F-038).
- Grundreglerna står i [docs/RULES.md](docs/RULES.md) (D-009). Hur onlinedelen fungerar står i [docs/NETWORK.md](docs/NETWORK.md).

## Nästa steg

- Användaren provspelar och säger vad som ska ändras.
- Användaren provspelar online på två telefoner.
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
- 2026-11-17: Lagnamnet Vätternrundan byts mot Vättrundan (D-017), eftersom Vätternrundan är namnet på ett känt cykellopp.
- 2026-11-17: Vättarna behåller sin storlek ute på banan tills vidare; det stora formatet (16 × 22) används i menyer och lagbyggaren (D-020).
- 2026-11-17: Nästa vapen i spelet: Fallukorv, Dalahästen, Älgtestet och Köttbullar (F-023).
- 2026-11-17: Lådor: postpaket med vapen och fikakorg med liv, en låda varannan runda (F-024).
- 2026-11-17: Borås först med stämpeln "Bara i Borås" och verktyget Enkel biljett till Borås; Knallen senare (D-010).
- 2026-11-17: Metspöt (svingrep) väntar; Skurhinken, Kräftskivan och Snöbollen först (F-027).
- 2026-11-17: Datormotståndaren får tre nivåer (lätt, lagom, svår); den lätta missar ofta (F-030).
- 2026-11-18: Första spelläget utöver klassiskt är Kubb (F-032); Boet och Stången senare. Nästa banor: Fjället och Takåsarna (F-034).
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
- Typsnitt, ljud och bilder måste ha licens som tillåter användningen. Typsnitten Albert Sans och Pixelify Sans (SIL Open Font License) ligger i spelet med licenstexterna i `fonts/` (D-006, 2026-11-17), så ingen sida hämtar något från Google. Ljud och musik skapas i webbläsaren och har inga externa källor.
- Spel över nätet hanterar smeknamn och IP-adresser hos Cloudflare (rum i EU, raderas ett dygn efter sista spelaren). Spelet säger det på skärmen för spel över nätet. Webbläsarens lagring används för att komma tillbaka in i ett rum efter omladdning (sessionStorage, försvinner när fliken stängs) och för lagen i lagbyggaren (localStorage, bara på enheten). Båda behövs för funktioner som spelaren själv väljer, så samtycke bedöms inte behövas (lagen om elektronisk kommunikation 9 kap. 28 §); ingen spårning eller analys finns. Ingen juridisk säkerhet.
- Ingen juridisk säkerhet utlovas. Frågor om varumärken kan behöva juridisk rådgivning (PRV är officiell källa).

## Miljö och begränsningar (2026-11-13)

- Agenten kan pusha direkt till main.
- GitHubs GraphQL-API är inte tillgängligt i agentens miljö; REST fungerar.
- 2026-11-17: API-anropet som slår på GitHub Pages spärras av agentens miljö.

## Engångsåtgärder

- Klar (2026-11-16): repot heter `vattigt` på GitHub (tidigare `vettigt`; gamla länkar leds vidare av GitHub).

- Klar (2026-11-17): GitHub Pages påslaget av användaren (main, roten).
- Klar (2026-11-17): Cloudflare-nyckeln `CLOUDFLARE_API_TOKEN` inlagd i repot av användaren (samma nyckel som network-kits demo; beslut: en publiceringsnyckel för alla spel).
- Klar (2026-11-17): GitHub Pages avstängt av användaren. Agenten får inte göra det själv: GitHubs API för Pages är spärrat i agentens miljö.

## Dokumentationskarta

- [docs/DESIGN.md](docs/DESIGN.md) – designförslaget: stil, banor, arsenal, väsen, spelidéer.
- [index.html](index.html) och [src/](src/) – spelet. `src/sim/` är matchen (regler, fysik), `src/render/` grafiken, `src/audio/` ljudet, `src/main.js` kontroller och skärmar.
- [tests/](tests/) – tester av matchen och inmatningsloggen (`npm test`); `npm run smoke` provar network-kit-kopian med spelets rumsinställningar.
- [worker/](worker/), [rooms-options.js](rooms-options.js), [wrangler.jsonc](wrangler.jsonc), [.assetsignore](.assetsignore) – Cloudflare: Workern, rumsinställningarna och vilka filer som inte ska serveras.
- [vendor/network-kit/](vendor/network-kit/) – kopia av network-kit v0.5.0. Ändras aldrig här; fel rättas i network-kit först.
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) – tester och publicering till Cloudflare.
- [docs/RULES.md](docs/RULES.md) – grundreglerna med siffror (D-009).
- [README.md](README.md) – kort om spelet och hur det körs lokalt.
- [docs/mockup/index.html](docs/mockup/index.html) – mockup av spelscen.
- [docs/maps/index.html](docs/maps/index.html) – mockup av Kobbarna, Trollskogen och Gruvan (D-004).
- [docs/characters/index.html](docs/characters/index.html) – vättarna i större format med rörelser (D-007).
- [docs/screens/index.html](docs/screens/index.html) – mockup av startmeny, eget spel och lagbyggare (D-008).
- [docs/NAMES.md](docs/NAMES.md) – namnen mot varumärken (D-005).
- [fonts/](fonts/) – spelets typsnitt med licenser.
- [docs/NETWORK.md](docs/NETWORK.md) – hur Vättigt använder network-kit.
- [docs/music/index.html](docs/music/index.html) – musikverkstad med Midsommarpolskan, utkast 1.
