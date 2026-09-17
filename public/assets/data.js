/* ============================================================
   ØVELSENS INDHOLD – kan redigeres.

   Facit og forklaringer ligger IKKE her, men i
   netlify/functions/_facit.mjs. Filen her sendes til browseren, og de
   studerende kan læse den i kildekoden – derfor må svarene ikke stå i
   den. Retter du en profil, skal facit rettes samme sted.

   Tal i procent angives som procenttal.
   bm = bruttomargin, og = overskudsgrad, aoh = aktivernes oms.hastighed,
   al = anlægsgrad, lager = varelagerets oms.hastighed (null = intet lager),
   deb = varedebitorernes oms.hastighed, sol = soliditetsgrad.
   Afkastningsgrad, driftsmæssig gearing og sikkerhedsmargin beregnes.
   spor = de nøgletal, hintet fremhæver (afslører ikke svaret).
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
   {id:"A", v:{bm:17,og:2.8,aoh:3.4,al:6,lager:9,deb:90,sol:28}, spor:["bm","aoh","deb"]},
   {id:"B", v:{bm:48,og:7,aoh:0.85,al:52,lager:2.4,deb:7.3,sol:48}, spor:["aoh","al","lager"]},
   {id:"C", v:{bm:88,og:18,aoh:0.7,al:60,lager:null,deb:20,sol:55}, spor:["bm","al","lager"]},
   {id:"D", v:{bm:22,og:3.5,aoh:2.6,al:55,lager:16,deb:180,sol:38}, spor:["bm","lager","al"]},
   {id:"E", v:{bm:85,og:11,aoh:1.9,al:8,lager:null,deb:6.5,sol:45}, spor:["dg","al","deb"]}
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
   {id:"A", v:{bm:45,og:9,aoh:1.7,al:10,lager:3.0,deb:5.5,sol:45}, spor:["al","lager","deb"]},
   {id:"B", v:{bm:35,og:2,aoh:3.0,al:35,lager:40,deb:200,sol:22}, spor:["lager","deb","sm"]},
   {id:"C", v:{bm:18,og:3,aoh:2.4,al:12,lager:6.5,deb:8,sol:32}, spor:["bm","deb","al"]},
   {id:"D", v:{bm:55,og:6,aoh:1.6,al:30,lager:2.2,deb:150,sol:40}, spor:["dg","sm","deb"]},
   {id:"E", v:{bm:20,og:3,aoh:2.8,al:50,lager:18,deb:200,sol:35}, spor:["bm","lager","al"]}
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
