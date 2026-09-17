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

console.log(fejlede ? `\n${fejlede} FEJLEDE\n` : "\nAlle kontroller bestaaet.\n");
process.exit(fejlede ? 1 : 0);
