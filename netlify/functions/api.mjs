// De studerendes API. Alt kræver en gyldig session, undtagen login selv.

import { json, fejl, krop, klientIp, ruter } from "./lib/svar.mjs";
import * as auth from "./lib/auth.mjs";
import * as lager from "./lib/lager.mjs";
import { ret, antalRunder, profilIder } from "./lib/facit.mjs";

const MAKS_FORSOEG = 10;
const VINDUE_MS = 10 * 60e3;

// Pakker session og stamdata ud, så hver handler ikke skal hente det samme.
async function medSession(req, handler) {
  const session = await auth.hentSession(req);
  if (!auth.erStuderende(session)) return fejl("Du er ikke logget ind.", 401);
  const studerende = await lager.hentStuderende(session.holdId, session.studId);
  if (!studerende) return fejl("Din bruger findes ikke længere.", 401, { "set-cookie": auth.ryddCookie() });
  return handler({ session, studerende });
}

const gyldigRunde = r => Number.isInteger(r) && r >= 0 && r < antalRunder();

// Hvor meget af facit klienten må se. Det afgøres af det REGISTREREDE
// første forsøg, aldrig af den aktuelle markering – ellers kunne gruppen
// bruge andet forsøg som facitmaskine: ret svaret, genindlæs, se efter grønt.
function synligRetning(runde, b) {
  if (b.tjek >= 2) return ret(runde, b.valg, true);
  if (b.tjek === 1) {
    const fuld = ret(runde, b.valg, true);
    // De profiler, gruppen ramte i første forsøg, er færdige, og forklaringen
    // må gerne stå der. Resten får kun at vide, at svaret ikke holdt.
    return Object.fromEntries(profilIder(runde).map(id => [id, b.rigtigFoerste?.[id] ? fuld[id] : { rigtig: false }]));
  }
  return null;
}

/* ---------- Login ---------- */
async function login(req) {
  const b = await krop(req);
  if (!b?.kode) return fejl("Skriv din adgangskode.");

  // Uden en grænse kan koder gættes maskinelt. Grænsen følger afsenderen,
  // ikke koden, så en enkelt studerende ikke kan spærre for hele holdet.
  const spaerrenoegle = `ip/${klientIp(req)}`;
  if ((await lager.taelForsoeg(spaerrenoegle, VINDUE_MS)) > MAKS_FORSOEG)
    return fejl("For mange forsøg. Vent ti minutter, eller spørg underviseren om en ny kode.", 429);

  const indhold = await auth.loginMedKode(b.kode);
  if (!indhold) return fejl("Den kode kender vi ikke. Tjek den efter, eller spørg underviseren.", 401);
  await lager.nulstilForsoeg(spaerrenoegle);

  const studerende = await lager.hentStuderende(indhold.holdId, indhold.studId);
  await lager.gemStuderende({ ...studerende, sidstSet: new Date().toISOString() });
  await lager.noterHaendelse(indhold.holdId, {
    studId: indhold.studId,
    gruppeId: indhold.gruppeId,
    type: "login",
  });

  return json({ ok: true }, 200, { "set-cookie": auth.saetCookie(await auth.lavSession(indhold)) });
}

/* ---------- Hvem er jeg ---------- */
const mig = req =>
  medSession(req, async ({ session, studerende }) => {
    const [hold, gruppe] = await Promise.all([
      lager.hentHold(session.holdId),
      lager.hentGruppe(session.holdId, session.gruppeId),
    ]);
    const gruppekammerater = (await lager.hentStuderendePaaHold(session.holdId))
      .filter(s => s.gruppeId === session.gruppeId)
      .map(s => ({ navn: s.navn, erMig: s.id === studerende.id }));
    return json({
      navn: studerende.navn,
      hold: hold?.navn ?? "",
      gruppe: gruppe?.navn ?? "",
      gruppekammerater,
    });
  });

/* ---------- Gruppens besvarelse ---------- */
const tomBesvarelse = runde => ({
  valg: {},
  grund: {},
  hint: {},
  refl: [],
  tjek: 0,
  rigtigFoerste: {},
  facitVist: false,
  runde,
  version: 0,
});

const hentBesvarelse = (req, ctx) =>
  medSession(req, async ({ session }) => {
    const runde = Number(ctx.params.runde);
    if (!gyldigRunde(runde)) return fejl("Ukendt runde.", 404);
    const b = (await lager.hentBesvarelse(session.holdId, session.gruppeId, runde)) ?? tomBesvarelse(runde);
    return json({ ...b, retning: synligRetning(runde, b) });
  });

// Gemmer gruppens kladde. Version'en fanger, at to gruppemedlemmer skriver
// samtidig: den, der gemmer på et forældet grundlag, får gruppens udgave
// tilbage i stedet for at overskrive den.
const gemBesvarelse = (req, ctx) =>
  medSession(req, async ({ session, studerende }) => {
    const runde = Number(ctx.params.runde);
    if (!gyldigRunde(runde)) return fejl("Ukendt runde.", 404);
    const b = await krop(req);
    if (!b) return fejl("Ugyldig JSON.");

    const nuvaerende = (await lager.hentBesvarelse(session.holdId, session.gruppeId, runde)) ?? tomBesvarelse(runde);
    if (Number(b.version) !== nuvaerende.version)
      return json({ konflikt: true, besvarelse: nuvaerende }, 409);

    // Serveren håndhæver de samme låse, som skærmen viser: en profil, gruppen
    // ramte i første forsøg, kan ikke laves om, og en afsluttet runde er låst.
    // Ellers ville låsene kun være en høflig henstilling til browseren.
    const laast = id => (nuvaerende.tjek >= 1 && nuvaerende.rigtigFoerste?.[id]) || nuvaerende.tjek >= 2;
    const flet = (gammelt, nyt) =>
      Object.fromEntries(profilIder(runde).map(id => [id, laast(id) ? gammelt?.[id] : nyt?.[id] ?? gammelt?.[id]]));

    const opdateret = {
      ...nuvaerende,
      valg: flet(nuvaerende.valg, b.valg ?? nuvaerende.valg),
      grund: flet(nuvaerende.grund, b.grund ?? nuvaerende.grund),
      hint: b.hint ?? nuvaerende.hint,
      refl: b.refl ?? nuvaerende.refl,
      version: nuvaerende.version + 1,
      opdateret: new Date().toISOString(),
      opdateretAf: studerende.navn,
    };
    await lager.gemBesvarelse(session.holdId, session.gruppeId, runde, opdateret);
    return json({ version: opdateret.version, opdateret: opdateret.opdateret, opdateretAf: opdateret.opdateretAf });
  });

/* ---------- Tjek af svar ---------- */
// Serveren retter. Klienten får kun rigtigt/forkert, indtil runden er
// afsluttet – ellers kunne facit hentes ud af det første svar.
const tjek = (req, ctx) =>
  medSession(req, async ({ session, studerende }) => {
    const runde = Number(ctx.params.runde);
    if (!gyldigRunde(runde)) return fejl("Ukendt runde.", 404);
    const b = await krop(req);
    const opgiv = Boolean(b?.opgiv);

    const nuvaerende = (await lager.hentBesvarelse(session.holdId, session.gruppeId, runde)) ?? tomBesvarelse(runde);
    if (nuvaerende.tjek >= 2) return fejl("Runden er allerede afsluttet.", 409);

    const valg = b?.valg ?? nuvaerende.valg;
    const grund = b?.grund ?? nuvaerende.grund;

    if (!opgiv) {
      const profiler = profilIder(runde);
      const uafsluttede = profiler.filter(id => !(nuvaerende.tjek >= 1 && nuvaerende.rigtigFoerste[id]));
      if (uafsluttede.some(id => !valg[id])) return fejl("Alle profiler skal have en model.");
      const valgte = profiler.map(id => valg[id]).filter(Boolean);
      if (new Set(valgte).size !== valgte.length) return fejl("Hver model må kun bruges én gang.");
    }

    const foersteForsoeg = nuvaerende.tjek === 0;
    const retning = ret(runde, valg, true);
    const rigtigFoerste = foersteForsoeg
      ? Object.fromEntries(Object.entries(retning).map(([id, r]) => [id, !opgiv && r.rigtig]))
      : nuvaerende.rigtigFoerste;

    const alleRigtige = Object.values(retning).every(r => r.rigtig);
    const nyTjek = opgiv || !foersteForsoeg || alleRigtige ? 2 : 1;
    const afsluttet = nyTjek >= 2;

    const opdateret = {
      ...nuvaerende,
      valg,
      grund,
      tjek: nyTjek,
      rigtigFoerste,
      facitVist: nuvaerende.facitVist || opgiv,
      version: nuvaerende.version + 1,
      opdateret: new Date().toISOString(),
      opdateretAf: studerende.navn,
      ...(afsluttet ? { afsluttet: new Date().toISOString() } : {}),
    };
    await lager.gemBesvarelse(session.holdId, session.gruppeId, runde, opdateret);
    await lager.noterHaendelse(session.holdId, {
      studId: session.studId,
      gruppeId: session.gruppeId,
      type: opgiv ? "facit-vist" : afsluttet ? "runde-afsluttet" : "foerste-tjek",
      runde,
      rigtige: Object.values(retning).filter(r => r.rigtig).length,
      ialt: Object.keys(retning).length,
    });

    return json({
      tjek: nyTjek,
      version: opdateret.version,
      rigtigFoerste,
      // Forklaringerne udleveres først, når runden er slut.
      retning: synligRetning(runde, opdateret),
    });
  });

/* ---------- Hændelser fra klienten ---------- */
const TILLADTE_HAENDELSER = new Set(["aabnet", "hint", "runde-skiftet", "kopieret"]);

const haendelse = req =>
  medSession(req, async ({ session }) => {
    const b = await krop(req);
    if (!TILLADTE_HAENDELSER.has(b?.type)) return fejl("Ukendt hændelse.");
    await lager.noterHaendelse(session.holdId, {
      studId: session.studId,
      gruppeId: session.gruppeId,
      type: b.type,
      ...(Number.isInteger(b.runde) ? { runde: b.runde } : {}),
      ...(b.profil ? { profil: String(b.profil).slice(0, 8) } : {}),
    });
    return json({ ok: true });
  });

const logud = () => json({ ok: true }, 200, { "set-cookie": auth.ryddCookie() });

export default ruter({
  "POST /api/login": login,
  "POST /api/logud": logud,
  "GET /api/mig": mig,
  "GET /api/besvarelse/:runde": hentBesvarelse,
  "PUT /api/besvarelse/:runde": gemBesvarelse,
  "POST /api/tjek/:runde": tjek,
  "POST /api/haendelse": haendelse,
});

export const config = { path: "/api/*" };
