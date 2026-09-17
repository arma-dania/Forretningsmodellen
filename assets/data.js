/* ============================================================
   DATA – kan redigeres. Tal i procent angives som procenttal.
   bm = bruttomargin, og = overskudsgrad, aoh = aktivernes oms.hastighed,
   al = anlægsgrad, lager = varelagerets oms.hastighed (null = intet lager),
   deb = varedebitorernes oms.hastighed, sol = soliditetsgrad.
   Afkastningsgrad, driftsmæssig gearing og sikkerhedsmargin beregnes.
   ============================================================ */
const RUNDER = [
 {
  navn:"Runde 1",
  modeller:[
   {id:"konsulent", navn:"Konsulenthus", tekst:"Rådgiver virksomheder og fakturerer medarbejdernes timer."},
   {id:"moebel", navn:"Møbelproducent med egen fabrik", tekst:"Producerer møbler selv og sælger dem gennem møbelforhandlere."},
   {id:"elektronik", navn:"Online elektronikforhandler", tekst:"Sælger kendte mærkevarer til private via webshop."},
   {id:"saas", navn:"Softwarevirksomhed (SaaS)", tekst:"Udvikler software og sælger det som abonnement til virksomheder."},
   {id:"supermarked", navn:"Supermarkedskæde", tekst:"Driver dagligvarebutikker i egne og lejede lokaler."}
  ],
  profiler:[
   {id:"A", model:"elektronik", v:{bm:17,og:2.8,aoh:3.4,al:6,lager:9,deb:90,sol:28}, spor:["bm","aoh","deb"],
    forklaring:"Den lave bruttomargin og den meget høje omsætningshastighed er typisk for handel med standardvarer i skarp priskonkurrence: Indtjeningen kommer fra volumen, ikke fra avance. Kunderne betaler ved bestilling, så debitorerne er næsten væk, og der er få anlægsaktiver. Den lave soliditet viser, at lager og drift i høj grad finansieres af leverandørerne.",
    forveksling:"Supermarkedskæden har også lav margin og kontant betaling, men butikkerne giver en langt højere anlægsgrad."},
   {id:"B", model:"moebel", v:{bm:48,og:7,aoh:0.85,al:52,lager:2.4,deb:7.3,sol:48}, spor:["aoh","al","lager"],
    forklaring:"En egen fabrik betyder mange materielle anlægsaktiver og et stort lager af råvarer, varer i arbejde og færdigvarer. Kapitalen vender derfor langsomt, og selv en pæn overskudsgrad bliver kun til en beskeden afkastningsgrad. Salget går gennem forhandlere, der får kredit – deraf de omkring 50 debitordage.",
    forveksling:"Softwarevirksomheden har også høj anlægsgrad, men den består af immaterielle aktiver, og der er intet varelager."},
   {id:"C", model:"saas", v:{bm:88,og:18,aoh:0.7,al:60,lager:null,deb:20,sol:55}, spor:["bm","al","lager"],
    forklaring:"Når softwaren først er udviklet, koster det næsten intet at levere den til én kunde mere, så bruttomarginen er meget høj. Omkostningerne ligger i udviklere og salg, altså kapacitetsomkostninger, og derfor er den driftsmæssige gearing høj. Den høje anlægsgrad uden varelager skyldes aktiverede udviklingsprojekter, dvs. immaterielle anlægsaktiver.",
    forveksling:"Konsulenthuset ligner på margin og gearing, men har næsten ingen anlægsaktiver – det er medarbejderne, der er den vigtigste ressource, og de står ikke i balancen."},
   {id:"D", model:"supermarked", v:{bm:22,og:3.5,aoh:2.6,al:55,lager:16,deb:180,sol:38}, spor:["bm","lager","al"],
    forklaring:"Dagligvarer handles med lav avance, men lageret vender hurtigt – omkring tre uger – og kunderne betaler ved kassen. Butikkerne kræver ejendomme, inventar og køleanlæg, som giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
    forveksling:"Elektronikforhandleren har samme lave margin, men lav anlægsgrad og et lager, der vender langsommere."},
   {id:"E", model:"konsulent", v:{bm:85,og:11,aoh:1.9,al:8,lager:null,deb:6.5,sol:45}, spor:["dg","al","deb"],
    forklaring:"Et konsulenthus sælger medarbejdernes tid. Der er næsten intet vareforbrug, så bruttomarginen er høj, men lønningerne er kapacitetsomkostninger, som skal betales, også når konsulenterne ikke er udfaktureret – derfor den meget høje driftsmæssige gearing. Der er hverken lager eller mange anlægsaktiver, men erhvervskunder på kredit giver mange debitordage.",
    forveksling:"Softwarevirksomheden har samme høje margin og gearing, men en høj anlægsgrad fra aktiveret udvikling."}
  ]
 },
 {
  navn:"Runde 2",
  modeller:[
   {id:"discount", navn:"Discountkæde", tekst:"Dagligvarer med snævert sortiment og lave priser i egne butikker."},
   {id:"grossist", navn:"Grossist", tekst:"Køber stort ind og sælger videre til butikker, restauranter og håndværkere."},
   {id:"maaltid", navn:"Måltidskasse-abonnement", tekst:"Pakker og leverer måltidskasser til private fra egen pakkecentral."},
   {id:"brand", navn:"Modebrand via forhandlere", tekst:"Designer tøj, får det produceret hos underleverandører og sælger via forhandlere."},
   {id:"specialbutik", navn:"Specialbutikskæde i mode", tekst:"Sælger tøj fra flere mærker i egne butikker i bymidterne."}
  ],
  profiler:[
   {id:"A", model:"brand", v:{bm:45,og:9,aoh:1.7,al:10,lager:3.0,deb:5.5,sol:45}, spor:["al","lager","deb"],
    forklaring:"Brandet ejer hverken fabrik eller butikker, så anlægsgraden er lav. Til gengæld skal det finansiere et stort sæsonlager og give forhandlerne lang kredit – over 60 debitordage. Bruttomarginen er høj nok til at betale for design og markedsføring, og den lave kapitalbinding i anlæg giver en høj afkastningsgrad.",
    forveksling:"Specialbutikskæden har et lignende lager og en høj margin, men butikkerne giver anlægsaktiver, og kunderne betaler ved kassen."},
   {id:"B", model:"maaltid", v:{bm:35,og:2,aoh:3.0,al:35,lager:40,deb:200,sol:22}, spor:["lager","deb","sm"],
    forklaring:"Friske råvarer kan kun ligge få dage, så lageret vender ekstremt hurtigt. Kunderne betaler forud for abonnementet, så der er næsten ingen debitorer. Pakkecentralen giver en betydelig anlægsgrad, og den meget lave sikkerhedsmargin og soliditet viser en model, der er sårbar over for kundeafgang – et typisk træk ved abonnementsforretninger i vækst.",
    forveksling:"Discountkæden har også hurtigt lager og kontant betaling, men lageret ligger dobbelt så længe, og marginen og soliditeten er anderledes."},
   {id:"C", model:"grossist", v:{bm:18,og:3,aoh:2.4,al:12,lager:6.5,deb:8,sol:32}, spor:["bm","deb","al"],
    forklaring:"Grossisten køber stort ind og sælger videre til andre virksomheder med lav avance. Kunderne er erhvervsdrivende og får kredit, derfor de mange debitordage. Lagerhaller er ofte lejede, så anlægsgraden er lav.",
    forveksling:"Discountkæden har samme lave margin, men sælger kontant og har mange butiksaktiver."},
   {id:"D", model:"specialbutik", v:{bm:55,og:6,aoh:1.6,al:30,lager:2.2,deb:150,sol:40}, spor:["dg","sm","deb"],
    forklaring:"Mode i egne butikker giver en høj bruttomargin, men også store kapacitetsomkostninger til husleje og personale, så den driftsmæssige gearing er høj og sikkerhedsmarginen lav. Et sortiment i mange størrelser og farver kræver et stort lager, mens kunderne betaler ved kassen.",
    forveksling:"Modebrandet har lignende lager, men giver forhandlerne kredit og har langt færre kapacitetsomkostninger og anlægsaktiver."},
   {id:"E", model:"discount", v:{bm:20,og:3,aoh:2.8,al:50,lager:18,deb:200,sol:35}, spor:["bm","lager","al"],
    forklaring:"Discount betyder lav avance og et snævert sortiment, der vender meget hurtigt. Kunderne betaler kontant, og butikkerne giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
    forveksling:"Grossisten har samme lave margin, men giver kredit og har få anlægsaktiver."}
  ]
 }
];

const RAEKKER = [
 {key:"bm", navn:"Bruttomargin", def:"Bruttoresultat · 100 / Omsætning", viser:"Hvor mange procent af omsætningen der er tilbage til at dække kapacitetsomkostninger, renter, skat og overskud."},
 {key:"og", navn:"Overskudsgrad", def:"Resultat af primær drift · 100 / Omsætning", viser:"Virksomhedens evne til at tjene penge på hver omsat krone."},
 {key:"aoh", navn:"Aktivernes omsætningshastighed", def:"Omsætning / Gennemsnitlig balancesum", viser:"Hvor mange gange kapitalen i aktiverne omsættes om året."},
 {key:"ag", navn:"Afkastningsgrad", def:"Resultat af primær drift · 100 / Gennemsnitlig balancesum (= overskudsgrad × aktivernes omsætningshastighed)", viser:"Evnen til at forrente den investerede kapital."},
 {key:"dg", navn:"Driftsmæssig gearing", def:"Kapacitetsomkostninger · 100 / Samlede driftsomkostninger", viser:"Kapacitetsomkostningernes andel af driftsomkostningerne – hvor bundet virksomheden er til omkostninger, der ikke følger salget."},
 {key:"sm", navn:"Sikkerhedsmargin", def:"(Faktisk omsætning − Nulpunktsomsætning) · 100 / Faktisk omsætning", viser:"Hvor mange procent omsætningen kan falde, før resultatet af primær drift bliver nul."},
 {key:"al", navn:"Anlægsgrad", def:"Anlægsaktiver ultimo · 100 / Samlede aktiver ultimo", viser:"Hvor stor en del af aktiverne der er anlægsaktiver – bygninger, maskiner, inventar og immaterielle aktiver."},
 {key:"lager", navn:"Varelagerets omsætningshastighed", def:"Vareforbrug / Varelager ultimo", viser:"Hvor mange gange varelageret omsættes om året. Under tallet: antal lagerdage."},
 {key:"deb", navn:"Varedebitorernes omsætningshastighed", def:"Omsætning / Varedebitorer ultimo", viser:"Hvor mange gange debitorerne udskiftes om året. Under tallet: kundernes gennemsnitlige kredittid i dage."},
 {key:"sol", navn:"Soliditetsgrad", def:"Egenkapital ultimo · 100 / Aktiver i alt ultimo", viser:"Hvor mange procent af aktiverne der kan gå tabt, før kreditorerne lider tab."}
];

const SPM = [
 "Hvilket nøgletal var mest afslørende, og hvorfor netop det?",
 "Hvilken profil var sværest? Hvilken forventning i jeres begrundelse holdt ikke – og hvad lærte I af det?",
 "Hvad betyder øvelsen for jeres analyse af Living Flowers? Hvilken profil forventer I, at virksomheden ligner mest, og hvilke nøgletal vil I se efter først?"
];

const MIN_TEGN = 25;
const LAGER_NOEGLE = "gaet-forretningsmodellen-v1";
