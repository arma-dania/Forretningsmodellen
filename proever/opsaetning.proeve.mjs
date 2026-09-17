// Prøver, hvad siden svarer, når miljøvariablerne mangler. En underviser,
// der sætter siden op, skal kunne læse af skærmen, hvad der ikke er på plads
// — ikke bare få "Serveren svarede 500".
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROD = path.resolve(import.meta.dirname, "..");
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "@netlify/blobs")
      return { url: pathToFileURL(path.join(ROD, "proever/blobs-attrap.mjs")).href, shortCircuit: true };
    return next(spec, ctx);
  },
});

let fejlede = 0;
const ok = (n, b, e = "") => { console.log((b ? "  ok  " : "  FEJL") + "  " + n + (e ? "  → " + e : "")); if (!b) fejlede++; };

const admin = (await import(path.join(ROD, "netlify/functions/admin.mjs"))).default;
const api = (await import(path.join(ROD, "netlify/functions/api.mjs"))).default;

const kald = (handler, sti, krop) =>
  handler(new Request("http://localhost" + sti, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": "9.9.9.9" },
    body: JSON.stringify(krop),
  }), {});

console.log("\n=== Ingen miljoevariabler sat ===");
delete process.env.UNDERVISER_ARNE;
delete process.env.UNDERVISER_HELLE;
delete process.env.UNDERVISER_RASMUS;
delete process.env.SESSION_HEMMELIGHED;

let svar = await kald(admin, "/admin-api/login", { kode: "hvadsomhelst" });
let data = await svar.json();
ok("underviserlogin svarer 500", svar.status === 500, String(svar.status));
ok("beskeden navngiver variablerne", /UNDERVISER_ARNE/.test(data.fejl ?? ""), data.fejl);
ok("beskeden naevner scope og ny deploy", /Functions/.test(data.fejl ?? "") && /deploy/.test(data.fejl ?? ""));

console.log("\n=== Koder sat, men sessionshemmelighed mangler ===");
process.env.UNDERVISER_ARNE = "rigtigkode";
svar = await kald(admin, "/admin-api/login", { kode: "rigtigkode" });
data = await svar.json();
ok("svarer 500 med besked i stedet for bart 500", svar.status === 500 && !!data.fejl, String(svar.status));
ok("beskeden navngiver SESSION_HEMMELIGHED", /SESSION_HEMMELIGHED/.test(data.fejl ?? ""), data.fejl);

console.log("\n=== Alt sat: forkert kode skal se anderledes ud ===");
process.env.SESSION_HEMMELIGHED = "en-hemmelighed-til-proeven";
svar = await kald(admin, "/admin-api/login", { kode: "forkert" });
data = await svar.json();
ok("forkert kode giver 401, ikke 500", svar.status === 401, String(svar.status));
ok("og siger netop 'Forkert kode.'", data.fejl === "Forkert kode.", data.fejl);
svar = await kald(admin, "/admin-api/login", { kode: "rigtigkode" });
ok("rigtig kode virker", svar.status === 200, String(svar.status));

console.log("\n=== Studerendes login uden hemmelighed ===");
delete process.env.SESSION_HEMMELIGHED;
svar = await kald(api, "/api/login", { kode: "abcd-efgh" });
ok("ukendt studenterkode giver 401 uanset", svar.status === 401, String(svar.status));

console.log("\n=== Spor staar to steder og skal stemme ===");
// Klienten bruger spor til at fremhaeve celler i hintet; serveren bruger dem
// til at rette begrundelserne. Falder de fra hinanden, retter serveren efter
// andre noegletal end dem, de studerende blev peget paa.
{
  const fs = await import("node:fs");
  const kilde = fs.readFileSync(path.join(ROD, "public/assets/data.js"), "utf8");
  const ctx = {};
  new Function("g", kilde + "; g.R = RUNDER;")(ctx);
  const facit = await import(path.join(ROD, "netlify/functions/lib/facit.mjs"));

  let afvigelser = [];
  ctx.R.forEach((r, runde) => {
    for (const p of r.profiler) {
      const klient = JSON.stringify(p.spor);
      const server = JSON.stringify(facit.sporFor(runde, p.id));
      if (klient !== server) afvigelser.push(`runde ${runde + 1} profil ${p.id}: ${klient} mod ${server}`);
    }
  });
  ok("spor er ens i data.js og facit.mjs", afvigelser.length === 0, afvigelser.join("; "));

  const profilerIData = ctx.R.flatMap((r, i) => r.profiler.map(p => `${i}/${p.id}`)).sort();
  const profilerIFacit = [...Array(facit.antalRunder()).keys()]
    .flatMap(i => facit.profilIder(i).map(id => `${i}/${id}`)).sort();
  ok("samme profiler begge steder", JSON.stringify(profilerIData) === JSON.stringify(profilerIFacit));

  const modeller = ctx.R.map(r => r.modeller.map(m => m.id));
  const facitModeller = [...Array(facit.antalRunder()).keys()]
    .map(i => facit.profilIder(i).map(id => facit.rigtigModel(i, id)));
  ok("hvert facit peger paa en model, der findes i runden",
     facitModeller.every((liste, i) => liste.every(m => modeller[i].includes(m))));
  ok("hver model bruges praecis en gang pr. runde",
     facitModeller.every(liste => new Set(liste).size === liste.length));
}

console.log(fejlede ? `\n${fejlede} FEJLEDE\n` : "\nAlle kontroller bestaaet.\n");
process.exit(fejlede ? 1 : 0);
