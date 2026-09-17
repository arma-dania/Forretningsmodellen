// Underviserens API. Alt herunder kræver underviser-session.

import { json, fejl, krop, klientIp, ruter } from "./_svar.mjs";
import * as auth from "./_auth.mjs";
import * as lager from "./_lager.mjs";
import { antalRunder, profilIder, rigtigModel } from "./_facit.mjs";

const MAKS_FORSOEG = 8;
const VINDUE_MS = 15 * 60e3;

async function medUnderviser(req, handler) {
  const session = await auth.hentSession(req);
  if (!auth.erUnderviser(session)) return fejl("Log ind som underviser.", 401);
  return handler(session);
}

// Henter holdet og tjekker, at det er den indloggede undervisers.
//
// Uden dette tjek på hvert endepunkt kunne en underviser nå en kollegas hold
// ved at kende dets id – og id'et står i adressen, så snart man har set det
// én gang. Et fremmed hold svares som "findes ikke" og ikke "ingen adgang",
// så svaret ikke bekræfter, at holdet findes.
const medHold = (req, ctx, handler) =>
  medUnderviser(req, async session => {
    // På ruterne om én studerende er :id den studerende og :holdId holdet,
    // så holdId skal vælges først, hvor den findes.
    const holdId = ctx.params.holdId ?? ctx.params.id;
    const hold = await lager.hentHold(holdId);
    if (!hold || hold.underviser !== session.underviser) return fejl("Holdet findes ikke.", 404);
    return handler(hold, session);
  });

/* ---------- Login ---------- */
async function login(req) {
  const b = await krop(req);
  const spaerrenoegle = `admin/${klientIp(req)}`;
  if ((await lager.taelForsoeg(spaerrenoegle, VINDUE_MS)) > MAKS_FORSOEG)
    return fejl("For mange forsøg. Vent et kvarter.", 429);

  let indhold;
  try {
    indhold = auth.loginSomUnderviser(b?.kode ?? "");
  } catch (e) {
    return fejl(String(e.message), 500);
  }
  if (!indhold) return fejl("Forkert kode.", 401);
  await lager.nulstilForsoeg(spaerrenoegle);
  return json({ navn: indhold.navn }, 200, { "set-cookie": auth.saetCookie(await auth.lavSession(indhold)) });
}

/* ---------- Hold ---------- */
const listHold = req =>
  medUnderviser(req, async session => {
    const hold = (await lager.alleHold()).filter(h => h.underviser === session.underviser);
    const beriget = await Promise.all(
      hold.map(async h => {
        const [studerende, grupper] = await Promise.all([
          lager.hentStuderendePaaHold(h.id),
          lager.hentGrupperPaaHold(h.id),
        ]);
        return {
          ...h,
          antalStuderende: studerende.length,
          antalGrupper: grupper.length,
          antalLoggetInd: studerende.filter(s => s.sidstSet).length,
        };
      })
    );
    return json({ hold: beriget.sort((a, b) => b.oprettet.localeCompare(a.oprettet)) });
  });

const opretHold = req =>
  medUnderviser(req, async session => {
    const b = await krop(req);
    const navn = String(b?.navn ?? "").trim();
    if (!navn) return fejl("Holdet skal have et navn.");
    const h = {
      id: lager.nytId("hold"),
      navn,
      underviser: session.underviser,
      underviserNavn: session.navn,
      oprettet: new Date().toISOString(),
    };
    await lager.gemHold(h);
    return json({ hold: h }, 201);
  });

const sletHold = (req, ctx) =>
  medHold(req, ctx, async h => json({ slettet: await lager.sletHold(h.id), navn: h.navn }));

/* ---------- Oprettelse af studerende ---------- */
// Underviseren indsætter en liste. Formatet skal tåle både et klip fra
// Excel og en håndskrevet liste, så adskilleren må være tab, semikolon
// eller komma, og en linje som "Gruppe 3" sætter gruppen for det, der følger.
// Felterne er navn og gruppe – systemet kender ikke studienumre.
export function laesListe(tekst) {
  const raekker = [];
  let aktuelGruppe = "";
  for (const raa of String(tekst).split("\n")) {
    const linje = raa.trim();
    if (!linje) continue;

    const overskrift = linje.match(/^#?\s*gruppe\s*[:.]?\s*(.+)$/i);
    if (overskrift && !/[\t;,]/.test(linje)) {
      aktuelGruppe = `Gruppe ${overskrift[1].trim()}`.replace(/^Gruppe\s+Gruppe\s+/i, "Gruppe ");
      continue;
    }

    const felter = linje.split(/[\t;,]/).map(f => f.trim()).filter(Boolean);

    // En gammel liste har studienummeret forrest. Det kastes væk her, så et
    // nummer ikke kan komme ind i systemet som et navn ved et uheld. Et navn
    // består aldrig kun af cifre.
    if (felter.length >= 2 && /^\d+$/.test(felter[0])) felter.shift();
    if (!felter.length) continue;

    const [navn, gruppe] = felter;
    if (!navn || /^\d+$/.test(navn)) continue;
    raekker.push({ navn, gruppe: gruppe || aktuelGruppe || "Uden gruppe" });
  }
  return raekker;
}

const opretStuderende = (req, ctx) =>
  medHold(req, ctx, async hold => {
    const b = await krop(req);
    const raekker = laesListe(b?.liste ?? "");
    if (!raekker.length) return fejl("Listen gav ingen studerende. Tjek formatet.");
    if (raekker.length > 300) return fejl("Højst 300 studerende ad gangen.");

    const eksisterende = await lager.hentStuderendePaaHold(hold.id);
    const grupper = await lager.hentGrupperPaaHold(hold.id);
    const gruppeVedNavn = new Map(grupper.map(g => [g.navn.toLowerCase(), g]));

    const oprettede = [], sprunget = [];
    for (const r of raekker) {
      // Navnet er den eneste identifikator, så to ens navne på samme hold
      // opfattes som en gentagelse. Står der virkelig to ens, må den ene
      // skelnes i listen, fx "Anne Jensen (gr. 2)".
      const dublet = eksisterende.find(s => s.navn.toLowerCase() === r.navn.toLowerCase());
      if (dublet) {
        sprunget.push({ ...r, aarsag: "findes allerede" });
        continue;
      }

      let gruppe = gruppeVedNavn.get(r.gruppe.toLowerCase());
      if (!gruppe) {
        gruppe = { id: lager.nytId("gr"), holdId: hold.id, navn: r.gruppe };
        await lager.gemGruppe(gruppe);
        gruppeVedNavn.set(r.gruppe.toLowerCase(), gruppe);
      }

      const kode = auth.lavKode();
      const s = {
        id: lager.nytId("st"),
        holdId: hold.id,
        gruppeId: gruppe.id,
        navn: r.navn,
        kode,
        oprettet: new Date().toISOString(),
        sidstSet: null,
      };
      await lager.gemStuderende(s);
      await lager.knytKode(kode, hold.id, s.id);
      eksisterende.push(s);
      oprettede.push({ ...s, gruppe: gruppe.navn });
    }
    return json({ oprettede, sprunget }, 201);
  });

const nyKode = (req, ctx) =>
  medHold(req, ctx, async hold => {
    const s = await lager.hentStuderende(hold.id, ctx.params.id);
    if (!s) return fejl("Den studerende findes ikke.", 404);
    await lager.frigivKode(s.kode);
    const kode = auth.lavKode();
    await lager.gemStuderende({ ...s, kode });
    await lager.knytKode(kode, s.holdId, s.id);
    return json({ kode });
  });

const sletStuderende = (req, ctx) =>
  medHold(req, ctx, async hold => {
    const s = await lager.hentStuderende(hold.id, ctx.params.id);
    if (!s) return fejl("Den studerende findes ikke.", 404);
    await lager.frigivKode(s.kode);
    await lager.slet(`studerende/${s.holdId}/${s.id}`);
    return json({ ok: true });
  });

/* ---------- Overblik ---------- */
// Samler holdets besvarelser og aktivitet til underviserens skærm.
const oversigt = (req, ctx) =>
  medHold(req, ctx, async hold => {
    const holdId = hold.id;
    const [studerende, grupper, besvarelser, haendelser] = await Promise.all([
      lager.hentStuderendePaaHold(holdId),
      lager.hentGrupperPaaHold(holdId),
      lager.hentBesvarelserPaaHold(holdId),
      lager.hentHaendelserPaaHold(holdId),
    ]);

    const perStuderende = new Map(studerende.map(s => [s.id, { logins: 0, handlinger: 0, sidst: null }]));
    for (const h of haendelser) {
      const p = perStuderende.get(h.studId);
      if (!p) continue;
      if (h.type === "login") p.logins += 1;
      p.handlinger += 1;
      if (!p.sidst || h.tid > p.sidst) p.sidst = h.tid;
    }

    const gruppeRaekker = grupper.map(g => {
      const medlemmer = studerende.filter(s => s.gruppeId === g.id);
      const runder = [...Array(antalRunder()).keys()].map(runde => {
        const b = besvarelser.find(x => x.runde === runde && x.gruppeId === g.id) ?? null;
        // Gruppen kan have fundet en gruppe-id gennem nøglen; find via medlemmernes gruppe.
        if (!b) return { runde, status: "ikke begyndt" };
        const ialt = profilIder(runde).length;
        return {
          runde,
          status: b.tjek >= 2 ? (b.facitVist ? "facit vist" : "afsluttet") : b.tjek === 1 ? "andet forsøg" : "i gang",
          rigtigeFoerste: Object.values(b.rigtigFoerste ?? {}).filter(Boolean).length,
          rigtigeSlut: profilIder(runde).filter(id => b.valg?.[id] === rigtigModel(runde, id)).length,
          ialt,
          hint: Object.values(b.hint ?? {}).filter(Boolean).length,
          begrundelser: Object.fromEntries(profilIder(runde).map(id => [id, b.grund?.[id] ?? ""])),
          valg: b.valg ?? {},
          refleksion: b.refl ?? [],
          opdateret: b.opdateret ?? null,
          opdateretAf: b.opdateretAf ?? null,
        };
      });
      return {
        id: g.id,
        navn: g.navn,
        medlemmer: medlemmer.map(s => ({
          id: s.id,
          navn: s.navn,
          kode: s.kode,
          sidstSet: s.sidstSet,
          ...perStuderende.get(s.id),
        })),
        runder,
      };
    });

    return json({
      hold,
      antalRunder: antalRunder(),
      grupper: gruppeRaekker.sort((a, b) => a.navn.localeCompare(b.navn, "da", { numeric: true })),
      udenGruppe: studerende.filter(s => !grupper.some(g => g.id === s.gruppeId)).length,
      senesteHaendelser: haendelser.sort((a, b) => b.tid.localeCompare(a.tid)).slice(0, 150),
      antalHaendelser: haendelser.length,
    });
  });

/* ---------- Eksport ---------- */
const csvFelt = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

const eksport = (req, ctx) =>
  medHold(req, ctx, async hold => {
    const holdId = hold.id;
    const [studerende, grupper, besvarelser] = await Promise.all([
      lager.hentStuderendePaaHold(holdId),
      lager.hentGrupperPaaHold(holdId),
      lager.hentBesvarelserPaaHold(holdId),
    ]);
    const gruppeNavn = new Map(grupper.map(g => [g.id, g.navn]));

    const linjer = [
      ["hold", "gruppe", "navn", "sidst_set", "runde", "profil", "valgt_model", "rigtig_model", "rigtig", "rigtig_foerste_forsoeg", "hint_brugt", "begrundelse"]
        .map(csvFelt)
        .join(";"),
    ];
    for (const s of studerende) {
      const gNavn = gruppeNavn.get(s.gruppeId) ?? "";
      const gBesvarelser = besvarelser.filter(b => b.gruppeId === s.gruppeId);
      if (!gBesvarelser.length) {
        linjer.push([hold.navn, gNavn, s.navn, s.sidstSet ?? "", "", "", "", "", "", "", "", ""].map(csvFelt).join(";"));
        continue;
      }
      for (const b of gBesvarelser.sort((a, x) => a.runde - x.runde)) {
        for (const profil of profilIder(b.runde)) {
          const rigtig = rigtigModel(b.runde, profil);
          linjer.push(
            [
              hold.navn, gNavn, s.navn, s.sidstSet ?? "",
              b.runde + 1, profil, b.valg?.[profil] ?? "", rigtig,
              b.valg?.[profil] === rigtig ? "ja" : "nej",
              b.rigtigFoerste?.[profil] ? "ja" : "nej",
              b.hint?.[profil] ? "ja" : "nej",
              b.grund?.[profil] ?? "",
            ].map(csvFelt).join(";")
          );
        }
      }
    }

    const filnavn = `forretningsmodellen-${hold.navn.replace(/[^\wæøåÆØÅ-]+/g, "-").toLowerCase()}.csv`;
    // BOM foran, så Excel på dansk opfatter filen som UTF-8.
    return new Response("﻿" + linjer.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filnavn}"`,
        "cache-control": "no-store",
      },
    });
  });

const mig = req =>
  medUnderviser(req, async session => json({ underviser: session.underviser, navn: session.navn }));
const logud = () => json({ ok: true }, 200, { "set-cookie": auth.ryddCookie() });

export default ruter({
  "POST /admin-api/login": login,
  "POST /admin-api/logud": logud,
  "GET /admin-api/mig": mig,
  "GET /admin-api/hold": listHold,
  "POST /admin-api/hold": opretHold,
  "DELETE /admin-api/hold/:id": sletHold,
  "POST /admin-api/hold/:id/studerende": opretStuderende,
  "GET /admin-api/hold/:id/oversigt": oversigt,
  "GET /admin-api/hold/:id/eksport": eksport,
  "POST /admin-api/studerende/:holdId/:id/nykode": nyKode,
  "DELETE /admin-api/studerende/:holdId/:id": sletStuderende,
});

export const config = { path: "/admin-api/*" };
