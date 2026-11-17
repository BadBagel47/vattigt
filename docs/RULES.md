# Vättigt – grundregler (D-009)

Så fungerar den första spelbara versionen. Siffrorna är startvärden som ska justeras efter provspel. De finns i koden i `src/sim/rules.js`; ändras en siffra där ska den ändras här också.

## Match

- Två lag med tre vättar var. Varje vätte har 100 liv.
- Lagen turas om. Inom laget går turen runt mellan de vättar som lever.
- En tur är 45 sekunder. Under turen får vätten gå, hoppa, byta vapen och skjuta en gång.
- Efter skottet har vätten 3 sekunder på sig att springa undan. Sedan väntar spelet tills allt ligger still, och därefter går turen över.
- Laget som har vättar kvar sist vinner. Dör de sista vättarna samtidigt blir det oavgjort.

## Rörelse

- Gå: 30 pixlar i sekunden. Vätten kliver upp för kanter som är högst 3 pixlar.
- Hoppa: framåt i den riktning vätten tittar, ungefär en och en halv vätte högt.
- Fall: den som landar hårt tar skada, ungefär från ett fall på 65 pixlar och uppåt.
- Vatten och kanten: en vätte som hamnar i vattnet eller faller ut över kanten är ute direkt.
- En vätte som dör lämnar en runsten efter sig.

## Vind

- Ny vind varje tur, från −10 till 10. Visas uppe till höger.
- Vinden påverkar Kalle Gurra och surströmmingsmolnet, inte burken eller dynamiten.

## Vapen

| Vapen | Så används det | Skada | Krater | Antal |
|---|---|---|---|---|
| Kalle Gurra | Dra för att sikta, längre drag ger mer kraft. Raketen smäller när den träffar mark eller en vätte. | upp till 50 | medelstor | obegränsat |
| Surströmming | Kastas som en burk som studsar. Öppnas efter 3 sekunder med en liten smäll och lämnar ett moln. | 15 vid smällen | liten | obegränsat |
| Dynamit-Alfred | Läggs vid fötterna. Smäller efter 5 sekunder. | upp till 75 | stor | 2 per lag och match |

- Skadan är störst mitt i smällen och minskar utåt. Smällen kastar iväg vättar som står nära.
- Surströmmingsmolnet ligger kvar i tre rundor och driver långsamt med vinden. En vätte som står i molnet när det egna lagets tur börjar tar 5 skada.

## Vårfloden

- Från runda 8 stiger vattnet 5 pixlar varje tur. Det gör att varje match tar slut till sist.

## Inte med än

Lådor, fler vapen, fler banor, lagbyggare, datormotståndare och spel över nätet.
