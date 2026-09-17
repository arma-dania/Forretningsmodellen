// Lagringslag. Alt, der rører Netlify Blobs, ligger her, så lagringen kan
// skiftes til fx Postgres uden at røre endepunkterne: de kender kun
// funktionerne herunder, ikke hvor data ender.
//
// Nøgler:
//   hold/<holdId>                                 et hold (fx "MØK 2026 forår")
//   gruppe/<holdId>/<gruppeId>                    en gruppe på holdet
//   studerende/<holdId>/<studId>                  en studerende
//   kode/<kode>                                   opslag fra adgangskode til studerende
//   besvarelse/<holdId>/<gruppeId>/<runde>        gruppens besvarelse af en runde
//   haendelse/<holdId>/<tid>-<tilf>               én logget handling
//   spaerre/<noegle>                              tæller til begrænsning af loginforsøg

import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "forretningsmodellen", consistency: "strong" });

export const laes = async noegle => (await store().get(noegle, { type: "json" })) ?? null;
export const skriv = (noegle, vaerdi) => store().setJSON(noegle, vaerdi);
export const slet = noegle => store().delete(noegle);

// Henter alle værdier under et præfiks. Blobs har ingen samlet hent, så
// nøglerne listes og hentes parallelt.
export async function laesAlle(praefiks) {
  const { blobs } = await store().list({ prefix: praefiks });
  const vaerdier = await Promise.all(blobs.map(b => laes(b.key)));
  return vaerdier.filter(Boolean);
}

export async function sletAlle(praefiks) {
  const { blobs } = await store().list({ prefix: praefiks });
  await Promise.all(blobs.map(b => slet(b.key)));
  return blobs.length;
}

export const nytId = praefiks =>
  `${praefiks}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Hold ---------- */
export const hentHold = id => laes(`hold/${id}`);
export const gemHold = h => skriv(`hold/${h.id}`, h);
export const alleHold = () => laesAlle("hold/");

// Sletter et hold med alt, hvad der hænger på det. Bruges ved semesterslut,
// så de studerendes besvarelser ikke ligger længere end nødvendigt.
export async function sletHold(holdId) {
  const studerende = await hentStuderendePaaHold(holdId);
  await Promise.all(studerende.map(s => slet(`kode/${s.kode}`)));
  const antal = {
    studerende: studerende.length,
    grupper: await sletAlle(`gruppe/${holdId}/`),
    besvarelser: await sletAlle(`besvarelse/${holdId}/`),
    haendelser: await sletAlle(`haendelse/${holdId}/`),
  };
  await sletAlle(`studerende/${holdId}/`);
  await slet(`hold/${holdId}`);
  return antal;
}

/* ---------- Grupper ---------- */
export const hentGruppe = (holdId, id) => laes(`gruppe/${holdId}/${id}`);
export const gemGruppe = g => skriv(`gruppe/${g.holdId}/${g.id}`, g);
export const hentGrupperPaaHold = holdId => laesAlle(`gruppe/${holdId}/`);

/* ---------- Studerende ---------- */
export const hentStuderende = (holdId, id) => laes(`studerende/${holdId}/${id}`);
export const gemStuderende = s => skriv(`studerende/${s.holdId}/${s.id}`, s);
export const hentStuderendePaaHold = holdId => laesAlle(`studerende/${holdId}/`);

// Adgangskoden er en henvisning til den studerende, ikke en adgangskode i
// gængs forstand: den kan ikke bruges andre steder og udskiftes frit.
export async function findVedKode(kode) {
  const henvisning = await laes(`kode/${kode.toLowerCase()}`);
  if (!henvisning) return null;
  return hentStuderende(henvisning.holdId, henvisning.studId);
}
export const knytKode = (kode, holdId, studId) => skriv(`kode/${kode.toLowerCase()}`, { holdId, studId });
export const frigivKode = kode => slet(`kode/${kode.toLowerCase()}`);

/* ---------- Besvarelser ---------- */
export const hentBesvarelse = (holdId, gruppeId, runde) => laes(`besvarelse/${holdId}/${gruppeId}/${runde}`);
// Hold, gruppe og runde stemples ind i selve objektet. Ellers kan de kun
// læses ud af nøglen, og underviserens overblik henter besvarelserne samlet.
export const gemBesvarelse = (holdId, gruppeId, runde, b) =>
  skriv(`besvarelse/${holdId}/${gruppeId}/${runde}`, { ...b, holdId, gruppeId, runde });
export const hentBesvarelserPaaHold = holdId => laesAlle(`besvarelse/${holdId}/`);

/* ---------- Hændelser ---------- */
// Hver hændelse får sin egen nøgle, så to samtidige skrivninger ikke kan
// overskrive hinanden. Tidsstemplet forrest gør, at listen kommer sorteret.
export function noterHaendelse(holdId, haendelse) {
  const tid = new Date().toISOString();
  const noegle = `haendelse/${holdId}/${tid}-${Math.random().toString(36).slice(2, 8)}`;
  return skriv(noegle, { tid, ...haendelse });
}
export const hentHaendelserPaaHold = holdId => laesAlle(`haendelse/${holdId}/`);

/* ---------- Begrænsning af loginforsøg ---------- */
export async function taelForsoeg(noegle, vindueMs) {
  const nu = Date.now();
  const gemt = await laes(`spaerre/${noegle}`);
  const taeller = gemt && gemt.udloeber > nu ? gemt : { antal: 0, udloeber: nu + vindueMs };
  taeller.antal += 1;
  await skriv(`spaerre/${noegle}`, taeller);
  return taeller.antal;
}
export const nulstilForsoeg = noegle => slet(`spaerre/${noegle}`);
