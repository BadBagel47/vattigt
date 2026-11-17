# Vättigt

Turbaserat artillerispel med vättar ur svensk folktro. Två lag på samma telefon turas om att gå, hoppa, sikta och skjuta på en bana som går att spränga sönder.

**Spela:** https://vattigt.l8p1.workers.dev (telefonen liggande; fungerar också på dator). Där finns både spel på en telefon och spel över nätet.

- Regler: [docs/RULES.md](docs/RULES.md)
- Designförslag: [docs/DESIGN.md](docs/DESIGN.md)
- Nuläge och beslut: [HANDOFF.md](HANDOFF.md)

## Utveckling

Ren JavaScript utan byggsteg. Spelet och rummen lokalt (Cloudflares verktyg, efter `npm install`), på http://localhost:8787:

```sh
npm run dev
```

Onlinedelen bygger på [network-kit](https://github.com/BadBagel47/network-kit); kopian i `vendor/network-kit` ändras inte här.

Tester (Node 22):

```sh
npm test
```

Spelets fysik i `src/sim/` räknar bara med heltal och har ingen slump utom matchens startvärde. Samma startvärde och samma knapptryck ger därför exakt samma match i alla webbläsare, vilket gör att spel över nätet senare bara behöver skicka knapptrycken.
