// Øvelsens indhold, som serveren skal kende: facit, forklaringer,
// profilernes nøgletal og modellernes beskrivelser.
//
// Filen ligger i netlify/ og ikke i public/, fordi den indeholder svarene.
// Alt her ud over 'model', 'forklaring' og 'forveksling' findes også i
// public/assets/data.js, som browseren henter. De to skal stemme overens,
// og proever/indhold.proeve.mjs fejler, hvis de ikke gør – den kører som
// Netlifys byggekommando, så et deploy stopper frem for at vurdere de
// studerendes arbejde op mod forældede tal.

export const FACIT = [
  {
    "runde": 0,
    "navn": "Runde 1",
    "modeller": [
      {
        "id": "konsulent",
        "navn": "Konsulenthus",
        "tekst": "Rådgiver virksomheder og fakturerer medarbejdernes timer."
      },
      {
        "id": "moebel",
        "navn": "Møbelproducent med egen fabrik",
        "tekst": "Producerer møbler selv og sælger dem gennem møbelforhandlere."
      },
      {
        "id": "elektronik",
        "navn": "Online elektronikforhandler",
        "tekst": "Sælger kendte mærkevarer til private via webshop."
      },
      {
        "id": "saas",
        "navn": "Softwarevirksomhed (SaaS)",
        "tekst": "Udvikler software og sælger det som abonnement til virksomheder."
      },
      {
        "id": "supermarked",
        "navn": "Supermarkedskæde",
        "tekst": "Driver dagligvarebutikker i egne og lejede lokaler."
      }
    ],
    "profiler": {
      "A": {
        "model": "elektronik",
        "forklaring": "Den lave bruttomargin og den meget høje omsætningshastighed er typisk for handel med standardvarer i skarp priskonkurrence: Indtjeningen kommer fra volumen, ikke fra avance. Kunderne betaler ved bestilling, så debitorerne er næsten væk, og der er få anlægsaktiver. Den lave soliditet viser, at lager og drift i høj grad finansieres af leverandørerne.",
        "forveksling": "Supermarkedskæden har også lav margin og kontant betaling, men butikkerne giver en langt højere anlægsgrad.",
        "spor": [
          "bm",
          "aoh",
          "deb"
        ],
        "v": {
          "bm": 17,
          "og": 2.8,
          "aoh": 3.4,
          "al": 6,
          "lager": 9,
          "deb": 90,
          "sol": 28
        }
      },
      "B": {
        "model": "moebel",
        "forklaring": "En egen fabrik betyder mange materielle anlægsaktiver og et stort lager af råvarer, varer i arbejde og færdigvarer. Kapitalen vender derfor langsomt, og selv en pæn overskudsgrad bliver kun til en beskeden afkastningsgrad. Salget går gennem forhandlere, der får kredit – deraf de omkring 50 debitordage.",
        "forveksling": "Softwarevirksomheden har også høj anlægsgrad, men den består af immaterielle aktiver, og der er intet varelager.",
        "spor": [
          "aoh",
          "al",
          "lager"
        ],
        "v": {
          "bm": 48,
          "og": 7,
          "aoh": 0.85,
          "al": 52,
          "lager": 2.4,
          "deb": 7.3,
          "sol": 48
        }
      },
      "C": {
        "model": "saas",
        "forklaring": "Når softwaren først er udviklet, koster det næsten intet at levere den til én kunde mere, så bruttomarginen er meget høj. Omkostningerne ligger i udviklere og salg, altså kapacitetsomkostninger, og derfor er den driftsmæssige gearing høj. Den høje anlægsgrad uden varelager skyldes aktiverede udviklingsprojekter, dvs. immaterielle anlægsaktiver.",
        "forveksling": "Konsulenthuset ligner på margin og gearing, men har næsten ingen anlægsaktiver – det er medarbejderne, der er den vigtigste ressource, og de står ikke i balancen.",
        "spor": [
          "bm",
          "al",
          "lager"
        ],
        "v": {
          "bm": 88,
          "og": 18,
          "aoh": 0.7,
          "al": 60,
          "lager": null,
          "deb": 20,
          "sol": 55
        }
      },
      "D": {
        "model": "supermarked",
        "forklaring": "Dagligvarer handles med lav avance, men lageret vender hurtigt – omkring tre uger – og kunderne betaler ved kassen. Butikkerne kræver ejendomme, inventar og køleanlæg, som giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
        "forveksling": "Elektronikforhandleren har samme lave margin, men lav anlægsgrad og et lager, der vender langsommere.",
        "spor": [
          "bm",
          "lager",
          "al"
        ],
        "v": {
          "bm": 22,
          "og": 3.5,
          "aoh": 2.6,
          "al": 55,
          "lager": 16,
          "deb": 180,
          "sol": 38
        }
      },
      "E": {
        "model": "konsulent",
        "forklaring": "Et konsulenthus sælger medarbejdernes tid. Der er næsten intet vareforbrug, så bruttomarginen er høj, men lønningerne er kapacitetsomkostninger, som skal betales, også når konsulenterne ikke er udfaktureret – derfor den meget høje driftsmæssige gearing. Der er hverken lager eller mange anlægsaktiver, men erhvervskunder på kredit giver mange debitordage.",
        "forveksling": "Softwarevirksomheden har samme høje margin og gearing, men en høj anlægsgrad fra aktiveret udvikling.",
        "spor": [
          "dg",
          "al",
          "deb"
        ],
        "v": {
          "bm": 85,
          "og": 11,
          "aoh": 1.9,
          "al": 8,
          "lager": null,
          "deb": 6.5,
          "sol": 45
        }
      }
    }
  },
  {
    "runde": 1,
    "navn": "Runde 2",
    "modeller": [
      {
        "id": "discount",
        "navn": "Discountkæde",
        "tekst": "Dagligvarer med snævert sortiment og lave priser i egne butikker."
      },
      {
        "id": "grossist",
        "navn": "Grossist",
        "tekst": "Køber stort ind og sælger videre til butikker, restauranter og håndværkere."
      },
      {
        "id": "maaltid",
        "navn": "Måltidskasse-abonnement",
        "tekst": "Pakker og leverer måltidskasser til private fra egen pakkecentral."
      },
      {
        "id": "brand",
        "navn": "Modebrand via forhandlere",
        "tekst": "Designer tøj, får det produceret hos underleverandører og sælger via forhandlere."
      },
      {
        "id": "specialbutik",
        "navn": "Specialbutikskæde i mode",
        "tekst": "Sælger tøj fra flere mærker i egne butikker i bymidterne."
      }
    ],
    "profiler": {
      "A": {
        "model": "brand",
        "forklaring": "Brandet ejer hverken fabrik eller butikker, så anlægsgraden er lav. Til gengæld skal det finansiere et stort sæsonlager og give forhandlerne lang kredit – over 60 debitordage. Bruttomarginen er høj nok til at betale for design og markedsføring, og den lave kapitalbinding i anlæg giver en høj afkastningsgrad.",
        "forveksling": "Specialbutikskæden har et lignende lager og en høj margin, men butikkerne giver anlægsaktiver, og kunderne betaler ved kassen.",
        "spor": [
          "al",
          "lager",
          "deb"
        ],
        "v": {
          "bm": 45,
          "og": 9,
          "aoh": 1.7,
          "al": 10,
          "lager": 3,
          "deb": 5.5,
          "sol": 45
        }
      },
      "B": {
        "model": "maaltid",
        "forklaring": "Friske råvarer kan kun ligge få dage, så lageret vender ekstremt hurtigt. Kunderne betaler forud for abonnementet, så der er næsten ingen debitorer. Pakkecentralen giver en betydelig anlægsgrad, og den meget lave sikkerhedsmargin og soliditet viser en model, der er sårbar over for kundeafgang – et typisk træk ved abonnementsforretninger i vækst.",
        "forveksling": "Discountkæden har også hurtigt lager og kontant betaling, men lageret ligger dobbelt så længe, og marginen og soliditeten er anderledes.",
        "spor": [
          "lager",
          "deb",
          "sm"
        ],
        "v": {
          "bm": 35,
          "og": 2,
          "aoh": 3,
          "al": 35,
          "lager": 40,
          "deb": 200,
          "sol": 22
        }
      },
      "C": {
        "model": "grossist",
        "forklaring": "Grossisten køber stort ind og sælger videre til andre virksomheder med lav avance. Kunderne er erhvervsdrivende og får kredit, derfor de mange debitordage. Lagerhaller er ofte lejede, så anlægsgraden er lav.",
        "forveksling": "Discountkæden har samme lave margin, men sælger kontant og har mange butiksaktiver.",
        "spor": [
          "bm",
          "deb",
          "al"
        ],
        "v": {
          "bm": 18,
          "og": 3,
          "aoh": 2.4,
          "al": 12,
          "lager": 6.5,
          "deb": 8,
          "sol": 32
        }
      },
      "D": {
        "model": "specialbutik",
        "forklaring": "Mode i egne butikker giver en høj bruttomargin, men også store kapacitetsomkostninger til husleje og personale, så den driftsmæssige gearing er høj og sikkerhedsmarginen lav. Et sortiment i mange størrelser og farver kræver et stort lager, mens kunderne betaler ved kassen.",
        "forveksling": "Modebrandet har lignende lager, men giver forhandlerne kredit og har langt færre kapacitetsomkostninger og anlægsaktiver.",
        "spor": [
          "dg",
          "sm",
          "deb"
        ],
        "v": {
          "bm": 55,
          "og": 6,
          "aoh": 1.6,
          "al": 30,
          "lager": 2.2,
          "deb": 150,
          "sol": 40
        }
      },
      "E": {
        "model": "discount",
        "forklaring": "Discount betyder lav avance og et snævert sortiment, der vender meget hurtigt. Kunderne betaler kontant, og butikkerne giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
        "forveksling": "Grossisten har samme lave margin, men giver kredit og har få anlægsaktiver.",
        "spor": [
          "bm",
          "lager",
          "al"
        ],
        "v": {
          "bm": 20,
          "og": 3,
          "aoh": 2.8,
          "al": 50,
          "lager": 18,
          "deb": 200,
          "sol": 35
        }
      }
    }
  }
];

export const NOEGLETAL = [
  {
    "key": "bm",
    "navn": "Bruttomargin",
    "def": "Bruttoresultat · 100 / Omsætning"
  },
  {
    "key": "og",
    "navn": "Overskudsgrad",
    "def": "Resultat af primær drift · 100 / Omsætning"
  },
  {
    "key": "aoh",
    "navn": "Aktivernes omsætningshastighed",
    "def": "Omsætning / Gennemsnitlig balancesum"
  },
  {
    "key": "ag",
    "navn": "Afkastningsgrad",
    "def": "Resultat af primær drift · 100 / Gennemsnitlig balancesum (= overskudsgrad × aktivernes omsætningshastighed)"
  },
  {
    "key": "dg",
    "navn": "Driftsmæssig gearing",
    "def": "Kapacitetsomkostninger · 100 / Samlede driftsomkostninger"
  },
  {
    "key": "sm",
    "navn": "Sikkerhedsmargin",
    "def": "(Faktisk omsætning − Nulpunktsomsætning) · 100 / Faktisk omsætning"
  },
  {
    "key": "al",
    "navn": "Anlægsgrad",
    "def": "Anlægsaktiver ultimo · 100 / Samlede aktiver ultimo"
  },
  {
    "key": "lager",
    "navn": "Varelagerets omsætningshastighed",
    "def": "Vareforbrug / Varelager ultimo"
  },
  {
    "key": "deb",
    "navn": "Varedebitorernes omsætningshastighed",
    "def": "Omsætning / Varedebitorer ultimo"
  },
  {
    "key": "sol",
    "navn": "Soliditetsgrad",
    "def": "Egenkapital ultimo · 100 / Aktiver i alt ultimo"
  }
];

export const antalRunder = () => FACIT.length;
export const profilIder = runde => Object.keys(FACIT[runde].profiler);
export const profil = (runde, profilId) => FACIT[runde]?.profiler[profilId] ?? null;
export const modellerne = runde => FACIT[runde]?.modeller ?? [];
export const sporFor = (runde, profilId) => FACIT[runde]?.profiler[profilId]?.spor ?? [];
export const rigtigModel = (runde, profilId) => FACIT[runde]?.profiler[profilId]?.model ?? null;
export const noegletalsnavn = key => NOEGLETAL.find(n => n.key === key)?.navn ?? key;

// Retter et sæt valg. Returnerer kun rigtigt/forkert, medmindre facit må vises.
export function ret(runde, valg, visFacit) {
  const profiler = FACIT[runde]?.profiler ?? {};
  return Object.fromEntries(Object.entries(profiler).map(([id, p]) => [
    id,
    {
      rigtig: valg?.[id] === p.model,
      ...(visFacit ? { model: p.model, forklaring: p.forklaring, forveksling: p.forveksling } : {}),
    },
  ]));
}
