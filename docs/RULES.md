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
| Jasså 39 | Tryck där på banan planet ska fälla. Fem laddningar faller på rad, tar vind och smäller när de slår ner. | 30 per laddning | liten | 1 |
| Prinsesstårtan | Dra för att sikta. Smäller där den landar. | upp till 100 | mycket stor | 1 |
| Plattpaketet | Tryck där plankan ska ligga. En planka av trä hamnar där, lite sned. | – | – | 2 |
| Halmbocken | Ställs ut där vätten står och brinner i två rundor. En vätte nära elden när det egna lagets tur börjar tar 10 skada. | 10 per tur | – | 1 |
| Enkel biljett till Borås | Tryck på en vätte. Den är borta en runda och kommer tillbaka blöt, med paraply och 10 liv mindre, någonstans på sitt lags sida. | 10 | – | 1 |
| Skurhinken | Tryck där hinken ska tömmas. Vattnet rinner längs marken, spolar med sig vättar (högst 15 skada per tur) och släcker eld. Tar ingen terräng. | upp till 15 | – | 1 |
| Kräftskivan | Dra för att sikta. Där den landar blir fyra kräftor kvar som nyper den som går förbi. | 10 per nyp | – | 1 |
| Snöbollen | Dra för att sikta. Rullar nedför och växer, välter den som står i vägen och blir en snöhög där den stannar. | 5–14 | – | 2 |
| Metspöt | Verktyg. Dra mot ett tak eller en vägg och släpp: linan hakar fast inom 130 pixlar. Svinga med pilarna och släpp med Hoppa. Kan kastas ut igen i luften. Avslutar inte turen. | – | – | obegränsat |
| Älgtestet | Släpps lös och rusar rakt fram. Den välter vättar den springer på (10 skada och en knuff) och smäller mot första branta väggen, eller efter 8 sekunder. | upp till 60 | medelstor | 1 |

- Skadan är störst mitt i smällen och minskar utåt. Smällen kastar iväg vättar som står nära.
- Surströmmingsmolnet ligger kvar i tre rundor och driver långsamt med vinden. En vätte som står i molnet när det egna lagets tur börjar tar 5 skada.

## Datorn som motståndare

- Datorn styr lag 2 på en telefon (inte online). Den prövar många skott i huvudet och väljer det som skadar motståndarna mest och det egna laget minst.
- **Lätt** missar ofta och väljer inte alltid det bästa skottet, **Lagom** missar ibland, **Svår** träffar nästan alltid. Står den bredvid en motståndare lägger den dynamit (inte på Lätt).

## Lådor

- Varannan runda faller en låda med fallskärm, i Gruvan i en av orterna.
- **Postpaket:** ett vapen till laget som tar lådan. **Fikakorg:** 25 liv till vätten som tar den, högst 150.
- En smäll förstör lådor i närheten; ett postpaket smäller då självt (upp till 20 skada).
- Lådor går att stänga av i eget spel och online.

## Bara i Borås

- När något osannolikt händer stämplas BARA I BORÅS över skärmen till en dansbandsslinga: ett eget lag förlorar en vätte under sin egen tur, fem smällar under samma tur, eller någon får en enkel biljett till Borås. Högst en gång per tur. Stämpeln ändrar inget i matchen.

## Vårfloden

- Från runda 8 stiger vattnet 5 pixlar varje tur. Det gör att varje match tar slut till sist. I eget spel kan den börja runda 6 eller 12, eller stängas av.

## Banor och material

- Jord försvinner inom hela smällen. Berg och sten (granit, flyttblock) tål mer: kratern blir hälften så stor. Trä (bryggan, sjöbodens golv) går sönder lättare än jord.
- **Midsommarängen:** jord, två bon under jord.
- **Kobbarna:** granitkobbar med mycket vatten emellan, en brygga och sjöbodens golv av trä.
- **Trollskogen:** jord med hårda flyttblock och en stenmur. Ett flyttblock som tappar marken under sig faller, och rullar åt det håll där det saknar stöd. Den som står i vägen tar 30 skada. Dimman i sänkorna döljer motståndarlagets vättar medan en tur pågår. Det största blocket är ett troll. På natten (stämningarna Midsommarnatt och Vinternatt) vaknar trollet om en smäll når det, och kastar en sten mot den vars tur det är (skada upp till 40), högst en gång per tur.
- **Borås:** parkeringshus, ån med en bro, betongklossar och en bronsstaty. Det regnar alltid, så eld slocknar direkt. Mellan rundorna öppnar sig ibland ett slukhål. En låda kommer varje runda, men ett postpaket kan innehålla fel vara. Knallen vandrar omkring och byter: den vars tur det är får ett vapen av honom och lämnar ett annat, en gång per lag och runda.
- **Fjället:** två fjäll med branta sidor, berg under ett lager snö (tjockare högre upp) och ljung. En smäll sätter fart på snön runt omkring: snö som har fritt under sig faller, och snö på en sluttning brantare än 45 grader glider ner, tills allt ligger still. En vätte som träffas av snö i rörelse tar 12 skada en gång per lavin och knuffas undan. Snö som når vattnet smälter bort. Turen går inte vidare förrän lavinen stannat.
- **Takåsarna:** tre kvarter på kajer av sten, med kanaler emellan. Husen är av puts, taken av koppar (går sönder lätt som trä), skorstenarna och kyrktornet av tegel (hårt som berg). I en gränd i varje ytterkvarter och på torget i mitten finns en tunnelbanestation (blå T-skylt). En vätte som står still vid en station åker till nästa station åt det håll den tittar, och från den sista runt till den första. Den åker inte igen förrän den har lämnat stationen.
- **Raukarna:** strand med ringmur till vänster, klint till höger och fem raukar av kalksten i havet emellan. Kalksten går sönder som jord. När mindre än 40 procent av en rauks fot (de nedersta sex raderna) finns kvar efter en smäll välter rauken bort från smällen och lägger sig ner. Den som står där den faller tar 35 skada och knuffas undan.
- **Slätten:** rapsfält, pilevallar och en väderkvarn på en kulle i mitten. Inget lä: vinden påverkar skotten dubbelt så mycket. Kvarnvingarna snurrar åt vindens håll, fortare ju mer det blåser, och ett skott som träffar en vinge slås tillbaka åt det håll det kom ifrån och uppåt. Skjuts kvarnens tak sönder stannar vingarna.
- **Gruvan:** orter under jord. Gruvvagnen rullar längs gången när en smäll knuffar den, och den som träffas av den i fart tar 25 skada. Det är mörkt utom där lyktorna och vättarnas pannlampor lyser. En smäll som når en lykta släcker den för resten av matchen.

## Spellägen

- **Klassiskt:** sista laget med vättar kvar vinner.
- **Kubb:** varje lag har fem kubbar på sin sida och kungen står nära mitten. En smäll som når en kubb eller kungen (inom smällens radie plus 3 pixlar), eller en direktträff, fäller den, och en pjäs som faller i vattnet räknas också som fälld. Fäller ett lag kungen när alla motståndarens kubbar ligger, vinner det. Fälls kungen innan dess vinner motståndarlaget. Det lag vars tur det är räknas som det som fällde kungen. Ett lag utan vättar förlorar som vanligt.
- **Boet:** varje lag har ett bo (150 i liv) längst bak på sin sida. Smällar skadar boet på samma sätt som en vätte, och en direktträff smäller vid boet. Ett bo som faller i vattnet är förstört. Laget vars bo förstörs förlorar; förstörs båda samtidigt blir det oavgjort. Ett lag utan vättar förlorar som vanligt.
- **Stången:** en midsommarstång står nära mitten, med en ring på 28 pixlar runt sig. När en runda är slut får det lag som har flest vättar inom ringen en poäng (lika eller ingen: ingen poäng). Först till 5 poäng vinner. Ett lag utan vättar förlorar som vanligt.

## Pratbubblor

Varje lag pratar en dialekt, vald i lagbyggaren: göteborgska (med ordvitsar), skånska, norrländska (bara "jo") eller tyst. Vättarna säger något ibland när de skjuter, när de träffas, när turen börjar och när laget vinner. Bubblorna påverkar inte matchen.

## Inte med än

Resten av vapnen ur designförslaget och fler banor.
