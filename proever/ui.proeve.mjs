import { chromium } from "playwright";
const B = "http://localhost:8787";
let fejlede = 0;
const ok = (n,b,e="") => { console.log((b?"  ok  ":"  FEJL")+"  "+n+(e?"  → "+e:"")); if(!b) fejlede++; };

const brw = await chromium.launch({ ...(process.env.CHROMIUM_STI ? {executablePath: process.env.CHROMIUM_STI} : {}) });
const fejlLog = [];
const svarFejl = [];
const nySide = async () => {
  const k = await brw.newContext();
  const p = await k.newPage();
  p.on("pageerror", e => fejlLog.push("JS-FEJL: " + e.message));
  p.on("response", r => { if(r.status()>=400) svarFejl.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
  return p;
};

console.log("\n=== Underviserens side ===");
const u = await nySide();
await u.goto(B+"/admin.html");
await u.waitForTimeout(300);
ok("loginskaerm vises for ulogget", await u.locator("#loginside").isVisible() && await u.locator("#adminside").isHidden());
await u.fill("#adminkode","forkert");
await u.click("#loginknap");
await u.waitForTimeout(300);
ok("forkert kode giver besked", (await u.locator("#loginstatus").textContent()).includes("Forkert"));
await u.fill("#adminkode","arne1234");
await u.click("#loginknap");
await u.waitForSelector("#adminside:not([hidden])");
ok("underviser er inde", await u.locator("#adminside").isVisible());
ok("undervisernavn vises", (await u.locator("#undervisernavn").textContent()) === "Arne",
   await u.locator("#undervisernavn").textContent());

const holdnavn = "Prøvehold " + Date.now();
await u.fill("#holdnavn", holdnavn);
await u.click("#opretholdform button[type=submit]");
await u.waitForTimeout(400);
ok("holdkort vises", (await u.locator(".holdkort").count()) >= 1, await u.locator(".holdkort strong").first().textContent());

await u.click("#visOpret");
await u.fill("#liste","Gruppe 1\nAnne Jensen\nBo Hansen\n\nGruppe 2\nCecilie Dam");
await u.click("#opretStuderende");
await u.waitForTimeout(500);
ok("oprettelse melder tilbage", (await u.locator("#opretstatus").textContent()).includes("3 oprettet"),
   await u.locator("#opretstatus").textContent());
const kodetekst = await u.locator("#nyekoderliste").textContent();
const koder = Object.fromEntries(kodetekst.trim().split("\n").map(l=>{const d=l.split("\t");return [d[1], d[2]];}));
ok("koder vist til udlevering", Object.keys(koder).length===3, JSON.stringify(koder));

await u.click("#visKoder");
await u.waitForTimeout(200);
const kl = await u.locator("#kodeliste").textContent();
ok("kodeliste kan udskrives", kl.includes("Gruppe 1") && kl.includes("Anne Jensen"));
ok("ingen studienumre i overblikket", !(await u.locator("#overblik").textContent()).match(/\b20\d{4}\b/));
ok("ingen Studienr.-kolonne", (await u.locator("th:text-is('Studienr.')").count())===0);

console.log("\n=== Studerende logger ind ===");
const s = await nySide();
await s.goto(B+"/index.html");
await s.waitForURL("**/login.html*", {timeout:5000}).catch(()=>{});
ok("ulogget sendes til login", s.url().includes("login.html"), s.url());
await s.fill("#kode","aaaa-zzzz");
await s.click("#knap");
await s.waitForTimeout(400);
ok("ukendt kode giver besked", (await s.locator("#status").textContent()).includes("kender vi ikke"));
await s.fill("#kode", koder["Anne Jensen"]);
await s.click("#knap");
await s.waitForURL("**/index.html", {timeout:5000});
await s.waitForSelector("#indhold:not([hidden])");
ok("Anne er inde i øvelsen", await s.locator("#indhold").isVisible());
ok("navn og gruppe i bjælken", (await s.locator("#brugerhold").textContent()).includes("Gruppe 1"),
   (await s.locator("#brugernavn").textContent())+" — "+(await s.locator("#brugerhold").textContent()));
ok("gruppekammerat nævnt", (await s.locator("#gruppemedlemmer").textContent()).includes("Bo Hansen"));
ok("tabellen er tegnet", (await s.locator("#tabel tbody tr").count())===10);
ok("ingen facit i kildekoden", !(await s.content()).includes("Den lave bruttomargin"));

console.log("\n=== Gruppen løser runde 1 ===");
const svar = {A:"elektronik",B:"moebel",C:"saas",D:"konsulent",E:"supermarked"};
for (const [id,m] of Object.entries(svar)){
  await s.selectOption(`#valg-${id}`, m);
  await s.fill(`#grund-${id}`, `Begrundelse for profil ${id} med rigeligt over femogtyve tegn.`);
}
await s.waitForTimeout(1200);
ok("gemmestatus viser gemt", (await s.locator("#gemstatus").textContent()).includes("Gemt"),
   await s.locator("#gemstatus").textContent());

const s2 = await nySide();
await s2.goto(B+"/login.html");
await s2.fill("#kode", koder["Bo Hansen"]);
await s2.click("#knap");
await s2.waitForSelector("#indhold:not([hidden])");
ok("Bo ser gruppens fælles svar", (await s2.locator("#valg-A").inputValue())==="elektronik");
ok("Bo ser gruppens begrundelse", (await s2.locator("#grund-B").inputValue()).includes("profil B"));

await s.click("#tjek");
await s.waitForTimeout(600);
ok("status efter første tjek", (await s.locator("#status").textContent()).includes("3 af 5"),
   await s.locator("#status").textContent());
ok("rigtige er låst", await s.locator("#valg-A").isDisabled() && await s.locator("#valg-C").isDisabled());
ok("forkerte kan rettes", !(await s.locator("#valg-D").isDisabled()));
ok("forklaring vist for den rigtige", (await s.locator("[data-profil=A] .forklaring").textContent()).includes("bruttomargin"));
ok("INGEN forklaring for den forkerte", (await s.locator("[data-profil=D] .forklaring").count())===0);

await s.click("[data-profil=D] [data-hint]");
await s.waitForTimeout(300);
ok("hint fremhæver celler", (await s.locator("td.hl").count())===3);

await s.selectOption("#valg-D","supermarked");
await s.selectOption("#valg-E","konsulent");
await s.waitForTimeout(1100);
await s.click("#tjek");
await s.waitForTimeout(700);
ok("runden afsluttet", (await s.locator("#status").textContent()).includes("Første forsøg: 3 af 5"),
   await s.locator("#status").textContent());
ok("alle forklaringer vist", (await s.locator(".forklaring").count())===5);
ok("refleksionen åbnet", await s.locator("#refleksion").isVisible());

await s.fill("#refl-0","Anlægsgraden var mest afslørende.");
await s.waitForTimeout(1100);
ok("refleksion gemt", (await s.locator("#gemstatus").textContent()).includes("Gemt"));

console.log("\n=== Runde 2 ===");
await s.click("[data-runde='1']");
await s.waitForTimeout(700);
ok("runde 2 er tom", (await s.locator("#valg-A").inputValue())==="");
ok("runde 2 har egne tal", (await s.locator("#tabel tbody tr td").first().textContent()).includes("45,0"),
   await s.locator("#tabel tbody tr td").first().textContent());
await s.click("[data-runde='0']");
await s.waitForTimeout(700);
ok("tilbage til runde 1 med svar i behold", (await s.locator("#valg-A").inputValue())==="elektronik");

console.log("\n=== Underviseren ser resultatet ===");
await u.click("#opdater");
await u.waitForTimeout(600);
const overblikTekst = await u.locator("#overblik").textContent();
ok("gruppe 1 står som afsluttet", overblikTekst.includes("afsluttet"));
ok("resultat vist", overblikTekst.includes("første forsøg 3/5") && overblikTekst.includes("samlet 5/5"),
   (overblikTekst.match(/første forsøg \d\/\d, samlet \d\/\d/)||[""])[0]);
ok("modelnavne ikke id'er", overblikTekst.includes("Online elektronikforhandler"));
ok("begrundelser synlige", overblikTekst.includes("Begrundelse for profil A"));
ok("refleksion synlig", overblikTekst.includes("Anlægsgraden var mest afslørende"));
const log = await u.locator("#log").textContent();
ok("aktivitet pr. studerende", log.includes("Anne Jensen (Gruppe 1)") && log.includes("loggede ind"));
ok("hint logget", log.includes("bad om hint"));
ok("Bo registreret som aktiv", log.includes("Bo Hansen"));

console.log("\n=== Log ud ===");
await s.click("#logud");
await s.waitForURL("**/login.html", {timeout:5000});
await s.goto(B+"/index.html");
await s.waitForURL("**/login.html*", {timeout:5000}).catch(()=>{});
ok("udlogget kan ikke komme ind", s.url().includes("login.html"));

console.log(fejlLog.length ? "\nJS-fejl i browseren:\n"+fejlLog.join("\n") : "\nIngen JS-fejl i browseren.");
if (fejlLog.length) fejlede += fejlLog.length;

// Prøven fremprovokerer selv nogle 401'ere. De skal kunne gøres rede for.
const VENTEDE = new Set([
  "401 POST /admin-api/login",   // med vilje forkert underviserkode
  "401 POST /api/login",         // med vilje ukendt studenterkode
  "401 GET /admin-api/mig",      // admin-siden åbnet uden login
  "401 GET /api/mig",            // øvelsen åbnet uden login, og efter log ud
]);
console.log("\n=== Fejlsvar undervejs ===");
const uventede = [];
for (const f of [...new Set(svarFejl)]) {
  const ventet = VENTEDE.has(f);
  console.log(`  ${ventet ? "ventet  " : "UVENTET "} ${f}  (${svarFejl.filter(x=>x===f).length} gange)`);
  if (!ventet) uventede.push(f);
}
ok("ingen uventede fejlsvar", uventede.length===0, uventede.join(", "));
await u.evaluate(async () => {
  const h = await (await fetch("/admin-api/hold")).json();
  for (const x of h.hold) await fetch("/admin-api/hold/"+x.id, {method:"DELETE"});
});
await brw.close();
console.log(fejlede ? `\n${fejlede} FEJLEDE\n` : "\nAlle kontroller bestaaet.\n");
process.exit(fejlede?1:0);
