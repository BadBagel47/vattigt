# Vättigt – grundregler (D-009)

Så fungerar den första spelbara versionen. Siffrorna är startvärden som ska justeras efter provspel. De finns i koden i `src/sim/rules.js`; ändras en siffra där ska den ändras här också.

## Match

- Två lag med tre vättar var (1–5 i eget spel och online). Varje vätte har 100 liv.
- Lagen turas om. Inom laget går turen runt mellan de vättar som lever.
- En tur är 45 sekunder (30, 60 eller 90 i eget spel). Under turen får vätten gå, hoppa, byta vapen och skjuta en gång.
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
| Köttbullar | Dra för att sikta. Den stora köttbullen smäller där den landar och delar sig i fem små som också smäller. | 30 + upp till 20 per liten | liten | 2 |
| Fallukorv | Tryck där på banan korvarna ska falla. Fem korvringar faller från himlen, studsar och smäller vid tredje studsen. I Gruvan landar de ovanpå berget. | 30 per korv | liten | 1 |
| Dalahästen | Släpps lös vid fötterna och travar framåt, hoppar över det den inte kan klättra uppför. Tryck Spräng! när den är framme, annars smäller den efter 10 sekunder. | upp till 60 | medelstor | 1 |
| Älgtestet | Släpps lös och rusar rakt fram. Den välter vättar den springer på (10 skada och en knuff) och smäller mot första branta väggen, eller efter 8 sekunder. | upp till 60 | medelstor | 1 |

- Skadan är störst mitt i smällen och minskar utåt. Smällen kastar iväg vättar som står nära.
- Surströmmingsmolnet ligger kvar i tre rundor och driver långsamt med vinden. En vätte som står i molnet när det egna lagets tur börjar tar 5 skada.

## Vårfloden

- Från runda 8 stiger vattnet 5 pixlar varje tur. Det gör att varje match tar slut till sist. I eget spel kan den börja runda 6 eller 12, eller stängas av.

## Banor och material

- Jord försvinner inom hela smällen. Berg och sten (granit, flyttblock) tål mer: kratern blir hälften så stor. Trä (bryggan, sjöbodens golv) går sönder lättare än jord.
- **Midsommarängen:** jord, två bon under jord.
- **Kobbarna:** granitkobbar med mycket vatten emellan, en brygga och sjöbodens golv av trä.
- **Trollskogen:** jord med hårda flyttblock och en stenmur. Ett flyttblock som tappar marken under sig faller, och rullar åt det håll där det saknar stöd. Den som står i vägen tar 30 skada. Dimman i sänkorna döljer motståndarlagets vättar medan en tur pågår. Det största blocket är ett troll. På natten (stämningarna Midsommarnatt och Vinternatt) vaknar trollet om en smäll når det, och kastar en sten mot den vars tur det är (skada upp till 40), högst en gång per tur.
- **Gruvan:** orter under jord. Gruvvagnen rullar längs gången när en smäll knuffar den, och den som träffas av den i fart tar 25 skada. Det är mörkt utom där lyktorna och vättarnas pannlampor lyser. En smäll som når en lykta släcker den för resten av matchen.

## Inte med än

Lådor, resten av vapnen ur designförslaget och datormotståndare.
