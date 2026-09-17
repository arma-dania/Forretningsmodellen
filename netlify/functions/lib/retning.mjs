// Retning af gruppernes arbejde.
//
// To ting rettes. Modelvalget er entydigt rigtigt eller forkert og rettes i
// facit.mjs. Begrundelserne kan ikke rettes entydigt af en maskine, så her
// måles noget snævrere og ærligere: peger begrundelsen på de nøgletal, der
// faktisk afslører profilen? Det er ikke det samme som at ræsonnementet er
// godt, og det skal læses som et fingerpeg om, hvor der skal kigges nærmere
// — ikke som en karakter. Begrundelserne står i fuld længde i overblikket,
// så underviseren altid kan læse dem selv.

import { profilIder, sporFor, rigtigModel } from "./facit.mjs";

// Ordene, der tæller som en henvisning til et nøgletal. Substring-match, så
// bøjninger følger med: "bruttomarginen" rammer "bruttomargin". Listerne må
// gerne udvides, når man ser, hvad de studerende faktisk skriver.
export const NOEGLETALSORD = {
  bm: ["bruttomargin", "bruttoavance", "bruttoresultat", "bruttofortjeneste", "avance"],
  og: ["overskudsgrad", "overskud", "primær drift", "primaer drift", "driftsresultat", "resultatgrad"],
  aoh: ["aktivernes oms", "aktivernes oms", "aoh", "kapitalens oms", "balancesum", "kapitalen vender",
        "kapitalen binder", "kapitalbinding", "hastighed på aktiv", "hastighed paa aktiv",
        "aktiverne omsættes", "aktiverne omsaettes", "kapitalen omsættes", "kapitalen omsaettes"],
  ag: ["afkastningsgrad", "afkast", "forrentning"],
  dg: ["driftsmæssig gearing", "driftsmaessig gearing", "gearing", "kapacitetsomkostning", "faste omkostninger"],
  sm: ["sikkerhedsmargin", "nulpunkt", "break-even", "breakeven", "hvor meget omsætningen kan falde"],
  al: ["anlægsgrad", "anlaegsgrad", "anlægsaktiv", "anlaegsaktiv", "anlæg", "anlaeg", "immateriel", "materielle aktiver", "bygninger", "maskiner", "inventar", "butikker", "fabrik"],
  lager: ["varelager", "lager", "lagerdage", "lagerbinding", "sortiment"],
  deb: ["debitor", "kredittid", "kreditdage", "betalingsfrist", "kredit til", "betaler ved kassen", "betaler forud", "betaler kontant", "kontant"],
  sol: ["soliditet", "egenkapital", "gældsandel", "gaeldsandel"],
};

const normaliser = t => String(t ?? "").toLowerCase().replace(/\s+/g, " ");

// Hvilke af profilens afslørende nøgletal begrundelsen peger på.
export function vurderBegrundelse(runde, profilId, tekst) {
  const spor = sporFor(runde, profilId);
  const t = normaliser(tekst);
  const naevnte = spor.filter(noegle => (NOEGLETALSORD[noegle] ?? []).some(ord => t.includes(ord)));
  return {
    naevnte,
    mangler: spor.filter(n => !naevnte.includes(n)),
    ialt: spor.length,
    andel: spor.length ? naevnte.length / spor.length : 0,
    tegn: String(tekst ?? "").trim().length,
  };
}

// Vægtene bag den samlede score. De står her ét sted, så de kan ændres uden
// at lede: er begrundelserne vigtigere end træfsikkerheden på dit hold, så
// flyt vægten. Summen skal være 1.
export const VAEGTE = { foersteForsoeg: 0.5, samlet: 0.2, begrundelser: 0.3 };

// Retter én gruppes arbejde med én runde.
export function retRunde(runde, besvarelse) {
  const profiler = profilIder(runde);
  if (!besvarelse || !besvarelse.tjek)
    return { runde, begyndt: !!besvarelse, afsluttet: false, status: besvarelse ? "i gang" : "ikke begyndt", score: null, profiler: [], refleksion: [] };

  const detaljer = profiler.map(id => {
    const valgt = besvarelse.valg?.[id] ?? "";
    const rigtig = rigtigModel(runde, id);
    return {
      profil: id,
      valgt,
      rigtig,
      rigtigTilSidst: valgt === rigtig,
      rigtigFoerst: !!besvarelse.rigtigFoerste?.[id],
      // Kan mangle på besvarelser fra før første bud blev gemt.
      valgtFoerst: besvarelse.valgFoerste?.[id] ?? null,
      hint: !!besvarelse.hint?.[id],
      // Teksten følger med. Vurderingen er et fingerpeg, ikke en dom –
      // underviseren skal kunne læse begrundelsen selv.
      tekst: String(besvarelse.grund?.[id] ?? ""),
      begrundelse: vurderBegrundelse(runde, id, besvarelse.grund?.[id]),
    };
  });

  const n = profiler.length;
  const foerst = detaljer.filter(d => d.rigtigFoerst).length;
  const tilSidst = detaljer.filter(d => d.rigtigTilSidst).length;
  const begrundelseAndel = detaljer.reduce((s, d) => s + d.begrundelse.andel, 0) / (n || 1);

  const afsluttet = besvarelse.tjek >= 2;
  return {
    runde,
    begyndt: true,
    afsluttet,
    facitVist: !!besvarelse.facitVist,
    status: besvarelse.facitVist ? "facit vist" : afsluttet ? "afsluttet" : besvarelse.tjek === 1 ? "andet forsøg" : "i gang",
    rigtigeFoerste: foerst,
    rigtigeSlut: tilSidst,
    ialt: n,
    hint: detaljer.filter(d => d.hint).length,
    begrundelseAndel,
    // Runden tæller først, når den er afsluttet. En runde i gang ville ellers
    // se ud som en dårlig præstation frem for en uafsluttet.
    score: besvarelse.tjek >= 2 ? Math.round(100 * (
      VAEGTE.foersteForsoeg * (foerst / n) +
      VAEGTE.samlet * (tilSidst / n) +
      VAEGTE.begrundelser * begrundelseAndel
    )) : null,
    profiler: detaljer,
    opdateret: besvarelse.opdateret ?? null,
    opdateretAf: besvarelse.opdateretAf ?? null,
    refleksion: (besvarelse.refl ?? []).map(t => String(t ?? "").trim()),
  };
}

// Samler gruppens runder til ét tal. Kun afsluttede runder tæller med.
export function retGruppe(antalRunder, besvarelserForGruppe) {
  const runder = [...Array(antalRunder).keys()].map(r =>
    retRunde(r, besvarelserForGruppe.find(b => b.runde === r))
  );
  const talte = runder.filter(r => r.score !== null);
  return {
    runder,
    afsluttedeRunder: talte.length,
    score: talte.length ? Math.round(talte.reduce((s, r) => s + r.score, 0) / talte.length) : null,
    rigtigeFoerste: talte.reduce((s, r) => s + r.rigtigeFoerste, 0),
    rigtigeSlut: talte.reduce((s, r) => s + r.rigtigeSlut, 0),
    ialt: talte.reduce((s, r) => s + r.ialt, 0),
    hint: talte.reduce((s, r) => s + r.hint, 0),
    begrundelseAndel: talte.length ? talte.reduce((s, r) => s + r.begrundelseAndel, 0) / talte.length : null,
  };
}

// Hvor svær hver profil viste sig at være på tværs af grupperne. Det er det,
// der siger, hvad der skal bruges tid på i opsamlingen.
export function profilernesSvaerhed(antalRunder, retteGrupper) {
  return [...Array(antalRunder).keys()].map(runde => ({
    runde,
    profiler: profilIder(runde).map(id => {
      const svar = retteGrupper
        .map(g => g.runder[runde])
        .filter(r => r && r.afsluttet)
        .map(r => r.profiler.find(p => p.profil === id))
        .filter(Boolean);
      // Hvilken model blev profilen oftest forvekslet med i FØRSTE bud?
      // Det endelige svar duer ikke: en gruppe, der rettede til det rigtige
      // i andet forsøg, ville så tælle det rigtige svar som forvekslingen.
      const forkerte = {};
      for (const s of svar)
        if (!s.rigtigFoerst && s.valgtFoerst && s.valgtFoerst !== s.rigtig)
          forkerte[s.valgtFoerst] = (forkerte[s.valgtFoerst] ?? 0) + 1;
      const [hyppigsteFejl, antalFejl] = Object.entries(forkerte).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
      return {
        profil: id,
        rigtigModel: rigtigModel(runde, id),
        grupper: svar.length,
        rigtigeFoerste: svar.filter(s => s.rigtigFoerst).length,
        rigtigeSlut: svar.filter(s => s.rigtigTilSidst).length,
        hint: svar.filter(s => s.hint).length,
        begrundelseAndel: svar.length ? svar.reduce((s, x) => s + x.begrundelse.andel, 0) / svar.length : 0,
        hyppigsteFejl,
        antalFejl,
      };
    }),
  }));
}
