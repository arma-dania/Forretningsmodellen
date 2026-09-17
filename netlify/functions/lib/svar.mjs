// Fælles svarhjælpere, så alle endepunkter svarer ens.

// En fejl i opsætningen – typisk en miljøvariabel, der mangler. Den skal
// frem til skærmen, så den, der sætter siden op, kan se hvad der mangler.
// Alle andre fejl svares generisk, så interne detaljer ikke slipper ud.
export class Opsaetningsfejl extends Error {}

export const json = (data, status = 200, ekstraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...ekstraHeaders },
  });

export const fejl = (besked, status = 400, ekstraHeaders = {}) => json({ fejl: besked }, status, ekstraHeaders);

// Læser JSON-kroppen og returnerer null ved ugyldig JSON, så kaldstedet kan svare pænt.
export async function krop(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Netlify sender klientens adresse videre i x-nf-client-connection-ip.
export const klientIp = req =>
  req.headers.get("x-nf-client-connection-ip") ||
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
  "ukendt";

// Ruter en forespørgsel ud fra sti og metode. Ruterne angives som
// { "METODE /sti": handler } med :navn som pladsholder i stien.
export function ruter(ruteTabel) {
  const ruter = Object.entries(ruteTabel).map(([noegle, handler]) => {
    const [metode, sti] = noegle.split(" ");
    return { metode, noegle, dele: sti.split("/").filter(Boolean), handler };
  });
  const moenster = r => r.noegle;

  return async (req, ctx) => {
    const sti = new URL(req.url).pathname.split("/").filter(Boolean);
    for (const r of ruter) {
      if (r.metode !== req.method || r.dele.length !== sti.length) continue;
      const params = {};
      const passer = r.dele.every((del, i) => {
        if (del.startsWith(":")) {
          params[del.slice(1)] = decodeURIComponent(sti[i]);
          return true;
        }
        return del === sti[i];
      });
      if (passer) {
        try {
          return await r.handler(req, { ...ctx, params });
        } catch (e) {
          if (e instanceof Opsaetningsfejl) return fejl(e.message, 500);
          // Uden dette ville en uventet fejl give et bart 500 uden krop,
          // og klienten kunne kun sige "Serveren svarede 500".
          console.error("Uventet fejl i", moenster(r), e);
          return fejl("Der gik noget galt på serveren. Prøv igen.", 500);
        }
      }
    }
    return fejl("Ukendt endepunkt.", 404);
  };
}
