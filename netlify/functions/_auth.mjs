// Login-lag. Resten af koden spørger kun "hvem er den her bruger?" gennem
// hentSession() og kender hverken adgangskoder eller cookies. Skal øvelsen
// senere logge ind gennem Moodle (LTI), er det denne fil, der skiftes ud —
// endepunkter, admin-modul og gemte data kan blive, som de er.

import { findVedKode } from "./_lager.mjs";

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
  if (!s) throw new Error("SESSION_HEMMELIGHED er ikke sat i Netlify (Environment variables).");
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

async function laesToken(token) {
  const [krop, signatur] = String(token).split(".");
  if (!krop || !signatur) return null;
  // Sammenlign hele signaturen frem for at afbryde ved første afvigende tegn.
  const forventet = await signer(krop);
  if (signatur.length !== forventet.length) return null;
  let afvig = 0;
  for (let i = 0; i < signatur.length; i++) afvig |= signatur.charCodeAt(i) ^ forventet.charCodeAt(i);
  if (afvig !== 0) return null;
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

// Underviseren logger ind med én kode fra miljøvariablerne. Der er kun én
// underviser pr. site, så der er ikke noget brugerregister at vedligeholde.
export function loginSomUnderviser(kode) {
  const forventet = process.env.ADMIN_KODE;
  if (!forventet) throw new Error("ADMIN_KODE er ikke sat i Netlify (Environment variables).");
  if (String(kode) !== forventet) return null;
  return { rolle: "underviser" };
}

export const erUnderviser = session => session?.rolle === "underviser";
export const erStuderende = session => session?.rolle === "studerende";
