// Kontrollerer, at øvelsens indhold står ens i public/assets/data.js og i
// netlify/functions/lib/facit.mjs.
//
// Denne prøve kører som Netlifys byggekommando. Er de to filer i utakt,
// stopper deployet — frem for at siden går i luften og vurderer de
// studerendes arbejde op mod forældede tal uden at nogen opdager det.
import { readFileSync } from "node:fs";
import path from "node:path";

const ROD = path.resolve(import.meta.dirname, "..");
let fejlede = 0;
const ok = (n, b, e = "") => { console.log((b ? "  ok  " : "  FEJL") + "  " + n + (e ? "  → " + e : "")); if (!b) fejlede++; };

const kilde = readFileSync(path.join(ROD, "public/assets/data.js"), "utf8");
const ctx = {};
new Function("g", kilde + "; g.R = RUNDER; g.RK = RAEKKER;")(ctx);
const facit = await import(path.join(ROD, "netlify/functions/lib/facit.mjs"));

console.log("\n=== Indholdet skal staa ens to steder ===");

ok("samme antal runder", ctx.R.length === facit.antalRunder(), `${ctx.R.length} mod ${facit.antalRunder()}`);

const afvig = [];
ctx.R.forEach((r, runde) => {
  const iData = r.profiler.map(p => p.id).sort();
  const iFacit = facit.profilIder(runde).sort();
  if (JSON.stringify(iData) !== JSON.stringify(iFacit))
    afvig.push(`runde ${runde + 1}: profiler ${iData} mod ${iFacit}`);

  for (const p of r.profiler) {
    const f = facit.profil(runde, p.id);
    if (!f) { afvig.push(`runde ${runde + 1} profil ${p.id} mangler i facit`); continue; }
    if (JSON.stringify(p.v) !== JSON.stringify(f.v))
      afvig.push(`runde ${runde + 1} profil ${p.id}: nøgletal ${JSON.stringify(p.v)} mod ${JSON.stringify(f.v)}`);
    if (JSON.stringify(p.spor) !== JSON.stringify(f.spor))
      afvig.push(`runde ${runde + 1} profil ${p.id}: spor ${JSON.stringify(p.spor)} mod ${JSON.stringify(f.spor)}`);
  }

  const mData = JSON.stringify(r.modeller);
  const mFacit = JSON.stringify(facit.modellerne(runde));
  if (mData !== mFacit) afvig.push(`runde ${runde + 1}: modellerne er forskellige`);
});
ok("nøgletal, spor og modeller stemmer", afvig.length === 0, afvig.join(" | "));

ok("nøgletalsnavnene stemmer",
   ctx.RK.every(r => facit.noegletalsnavn(r.key) === r.navn),
   ctx.RK.filter(r => facit.noegletalsnavn(r.key) !== r.navn).map(r => r.key).join(", "));

const facitModeller = [...Array(facit.antalRunder()).keys()]
  .map(i => facit.profilIder(i).map(id => facit.rigtigModel(i, id)));
ok("hvert facit peger paa en model, der findes i runden",
   facitModeller.every((liste, i) => liste.every(m => ctx.R[i].modeller.some(x => x.id === m))));
ok("hver model bruges praecis en gang pr. runde",
   facitModeller.every(liste => new Set(liste).size === liste.length));

console.log("\n=== Facit maa ikke kunne laeses i browseren ===");
ok("ingen facit i data.js",
   !/forklaring|forveksling|model:\s*"/.test(kilde.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));

console.log(fejlede ? `\n${fejlede} FEJLEDE — indholdet er i utakt.\n` : "\nIndholdet stemmer.\n");
process.exit(fejlede ? 1 : 0);
