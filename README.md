# Vättigt

Turbaserat artillerispel med vättar ur svensk folktro. Två lag på samma telefon turas om att gå, hoppa, sikta och skjuta på en bana som går att spränga sönder.

**Spela:** https://badbagel47.github.io/vattigt/ (telefonen liggande; fungerar också på dator).

- Regler: [docs/RULES.md](docs/RULES.md)
- Designförslag: [docs/DESIGN.md](docs/DESIGN.md)
- Nuläge och beslut: [HANDOFF.md](HANDOFF.md)

## Utveckling

Ren JavaScript utan byggsteg. Starta en lokal webbserver i repots rot och öppna sidan, till exempel:

```sh
python3 -m http.server 8000
```

Tester (Node 22):

```sh
npm test
```

Spelets fysik i `src/sim/` räknar bara med heltal och har ingen slump utom matchens startvärde. Samma startvärde och samma knapptryck ger därför exakt samma match i alla webbläsare, vilket gör att spel över nätet senare bara behöver skicka knapptrycken.
