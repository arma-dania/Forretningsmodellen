// Login-lag. Resten af koden spørger kun "hvem er den her bruger?" gennem
// hentSession() og kender hverken adgangskoder eller cookies. Skal øvelsen
// senere logge ind gennem Moodle (LTI), er det denne fil, der skiftes ud —
// endepunkter, admin-modul og gemte data kan blive, som de er.

import { findVedKode } from "./lager.mjs";
import { Opsaetningsfejl } from "./svar.mjs";
import { UNDERVISERE } from "./undervisere.mjs";

const COOKIE = "fm_session";
const LEVETID_TIMER = 12;
const koder = new TextEncoder();

// Adgangskoderne skal kunne læses op i et lokale og tastes af en telefon.
// Derfor et alfabet uden tegn, der forveksles: intet i, l, o, 0, 1.
const ALFABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function lavKode() {
  const tal = crypto.getRandomValues(new Uint8Array(8));
  const tegn = [...tal].map(t => ALFABET[t % ALFABET.length]);
  return `${tegn.slice(0, 4).join("")}-${tegn.slice(4).join("")}`;
}

/* ---------- Signeret cookie ---------- */
// Sessionen bæres af en signeret cookie i stedet for en tabel, så et login
// ikke kræver et opslag. Hemmeligheden ligger i Netlifys miljøvariabler.
function hemmelighed() {
  const s = process.env.SESSION_HEMMELIGHED;
  if (!s)
    throw new Opsaetningsfejl(
      "SESSION_HEMMELIGHED er ikke sat. Tjek i Netlify under Site configuration → " +
        "Environment variables, at variablen findes, og at dens scope omfatter Functions. " +
        "Husk en ny deploy bagefter."
    );
  return s;
}

const tilBase64Url = bytes =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fraBase64Url = s =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

const noegle = () =>
  crypto.subtle.importKey("raw", koder.encode(hemmelighed()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

async function signer(data) {
  return tilBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", await noegle(), koder.encode(data))));
}

export async function lavSession(indhold) {
  const nyttelast = { ...indhold, udloeber: Date.now() + LEVETID_TIMER * 3600e3 };
  const krop = tilBase64Url(koder.encode(JSON.stringify(nyttelast)));
  return `${krop}.${await signer(krop)}`;
}

// Sammenligner hele vejen igennem i stedet for at afbryde ved første
// afvigende tegn, så svartiden ikke røber, hvor langt der var match.
function sammenlign(a, b) {
  const n = Math.max(a.length, b.length);
  let afvig = a.length ^ b.length;
  for (let i = 0; i < n; i++) afvig |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return afvig === 0;
}

async function laesToken(token) {
  const [krop, signatur] = String(token).split(".");
  if (!krop || !signatur) return null;
  if (!sammenlign(signatur, await signer(krop))) return null;
  try {
    const nyttelast = JSON.parse(new TextDecoder().decode(fraBase64Url(krop)));
    return nyttelast.udloeber > Date.now() ? nyttelast : null;
  } catch {
    return null;
  }
}

const laesCookie = req =>
  Object.fromEntries(
    (req.headers.get("cookie") || "")
      .split(";")
      .map(d => d.trim().split("="))
      .filter(d => d.length === 2)
  )[COOKIE];

export const saetCookie = token =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${LEVETID_TIMER * 3600}`;
export const ryddCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/* ---------- Det, resten af koden bruger ---------- */
export async function hentSession(req) {
  const token = laesCookie(req);
  return token ? laesToken(token) : null;
}

// Slår adgangskoden op og giver den studerende, koden hører til.
export async function loginMedKode(kode) {
  const studerende = await findVedKode(String(kode).trim().toLowerCase());
  if (!studerende) return null;
  return {
    rolle: "studerende",
    studId: studerende.id,
    holdId: studerende.holdId,
    gruppeId: studerende.gruppeId,
    navn: studerende.navn,
  };
}

// Hver underviser har sin egen kode i sin egen miljøvariabel, se
// lib/undervisere.mjs. Alle opsatte koder afprøves, og der afbrydes ikke
// undervejs, så svartiden ikke røber, hvilken underviser der var tæt på.
export function loginSomUnderviser(kode) {
  const opsatte = UNDERVISERE.filter(u => process.env[u.miljoenoegle]);
  if (!opsatte.length)
    throw new Opsaetningsfejl(
      "Ingen underviserkoder er sat. Tjek i Netlify under Site configuration → Environment " +
        "variables, at mindst én af " + UNDERVISERE.map(u => u.miljoenoegle).join(", ") +
        " findes, og at dens scope omfatter Functions. Husk en ny deploy bagefter."
    );
  let fundet = null;
  for (const u of opsatte) if (sammenlign(String(kode), process.env[u.miljoenoegle])) fundet = u;
  return fundet ? { rolle: "underviser", underviser: fundet.id, navn: fundet.navn } : null;
}

export const erUnderviser = session => session?.rolle === "underviser";
export const erStuderende = session => session?.rolle === "studerende";
