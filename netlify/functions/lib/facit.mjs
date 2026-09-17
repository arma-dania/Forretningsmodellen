// Facit og forklaringer. Ligger bevidst på serveren og ikke i
// assets/data.js: de studerende kan ellers læse svarene i browserens
// kildekode, og så er de resultater, underviseren følger, intet værd.
// Klienten får kun at vide, hvad der er rigtigt, når den har svaret.

export const FACIT = [
  {
    "runde": 0,
    "profiler": {
      "A": {
        "model": "elektronik",
        "forklaring": "Den lave bruttomargin og den meget høje omsætningshastighed er typisk for handel med standardvarer i skarp priskonkurrence: Indtjeningen kommer fra volumen, ikke fra avance. Kunderne betaler ved bestilling, så debitorerne er næsten væk, og der er få anlægsaktiver. Den lave soliditet viser, at lager og drift i høj grad finansieres af leverandørerne.",
        "forveksling": "Supermarkedskæden har også lav margin og kontant betaling, men butikkerne giver en langt højere anlægsgrad."
      },
      "B": {
        "model": "moebel",
        "forklaring": "En egen fabrik betyder mange materielle anlægsaktiver og et stort lager af råvarer, varer i arbejde og færdigvarer. Kapitalen vender derfor langsomt, og selv en pæn overskudsgrad bliver kun til en beskeden afkastningsgrad. Salget går gennem forhandlere, der får kredit – deraf de omkring 50 debitordage.",
        "forveksling": "Softwarevirksomheden har også høj anlægsgrad, men den består af immaterielle aktiver, og der er intet varelager."
      },
      "C": {
        "model": "saas",
        "forklaring": "Når softwaren først er udviklet, koster det næsten intet at levere den til én kunde mere, så bruttomarginen er meget høj. Omkostningerne ligger i udviklere og salg, altså kapacitetsomkostninger, og derfor er den driftsmæssige gearing høj. Den høje anlægsgrad uden varelager skyldes aktiverede udviklingsprojekter, dvs. immaterielle anlægsaktiver.",
        "forveksling": "Konsulenthuset ligner på margin og gearing, men har næsten ingen anlægsaktiver – det er medarbejderne, der er den vigtigste ressource, og de står ikke i balancen."
      },
      "D": {
        "model": "supermarked",
        "forklaring": "Dagligvarer handles med lav avance, men lageret vender hurtigt – omkring tre uger – og kunderne betaler ved kassen. Butikkerne kræver ejendomme, inventar og køleanlæg, som giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
        "forveksling": "Elektronikforhandleren har samme lave margin, men lav anlægsgrad og et lager, der vender langsommere."
      },
      "E": {
        "model": "konsulent",
        "forklaring": "Et konsulenthus sælger medarbejdernes tid. Der er næsten intet vareforbrug, så bruttomarginen er høj, men lønningerne er kapacitetsomkostninger, som skal betales, også når konsulenterne ikke er udfaktureret – derfor den meget høje driftsmæssige gearing. Der er hverken lager eller mange anlægsaktiver, men erhvervskunder på kredit giver mange debitordage.",
        "forveksling": "Softwarevirksomheden har samme høje margin og gearing, men en høj anlægsgrad fra aktiveret udvikling."
      }
    }
  },
  {
    "runde": 1,
    "profiler": {
      "A": {
        "model": "brand",
        "forklaring": "Brandet ejer hverken fabrik eller butikker, så anlægsgraden er lav. Til gengæld skal det finansiere et stort sæsonlager og give forhandlerne lang kredit – over 60 debitordage. Bruttomarginen er høj nok til at betale for design og markedsføring, og den lave kapitalbinding i anlæg giver en høj afkastningsgrad.",
        "forveksling": "Specialbutikskæden har et lignende lager og en høj margin, men butikkerne giver anlægsaktiver, og kunderne betaler ved kassen."
      },
      "B": {
        "model": "maaltid",
        "forklaring": "Friske råvarer kan kun ligge få dage, så lageret vender ekstremt hurtigt. Kunderne betaler forud for abonnementet, så der er næsten ingen debitorer. Pakkecentralen giver en betydelig anlægsgrad, og den meget lave sikkerhedsmargin og soliditet viser en model, der er sårbar over for kundeafgang – et typisk træk ved abonnementsforretninger i vækst.",
        "forveksling": "Discountkæden har også hurtigt lager og kontant betaling, men lageret ligger dobbelt så længe, og marginen og soliditeten er anderledes."
      },
      "C": {
        "model": "grossist",
        "forklaring": "Grossisten køber stort ind og sælger videre til andre virksomheder med lav avance. Kunderne er erhvervsdrivende og får kredit, derfor de mange debitordage. Lagerhaller er ofte lejede, så anlægsgraden er lav.",
        "forveksling": "Discountkæden har samme lave margin, men sælger kontant og har mange butiksaktiver."
      },
      "D": {
        "model": "specialbutik",
        "forklaring": "Mode i egne butikker giver en høj bruttomargin, men også store kapacitetsomkostninger til husleje og personale, så den driftsmæssige gearing er høj og sikkerhedsmarginen lav. Et sortiment i mange størrelser og farver kræver et stort lager, mens kunderne betaler ved kassen.",
        "forveksling": "Modebrandet har lignende lager, men giver forhandlerne kredit og har langt færre kapacitetsomkostninger og anlægsaktiver."
      },
      "E": {
        "model": "discount",
        "forklaring": "Discount betyder lav avance og et snævert sortiment, der vender meget hurtigt. Kunderne betaler kontant, og butikkerne giver en høj anlægsgrad. Afkastningsgraden skabes af omsætningshastigheden, ikke af overskudsgraden.",
        "forveksling": "Grossisten har samme lave margin, men giver kredit og har få anlægsaktiver."
      }
    }
  }
];

export const antalRunder = () => FACIT.length;
export const profilIder = runde => Object.keys(FACIT[runde].profiler);
export const rigtigModel = (runde, profilId) => FACIT[runde]?.profiler[profilId]?.model ?? null;

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
