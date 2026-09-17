// Fælles svarhjælpere, så alle endepunkter svarer ens.

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
    const [metode, moenster] = noegle.split(" ");
    const dele = moenster.split("/").filter(Boolean);
    return { metode, dele, handler };
  });

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
      if (passer) return r.handler(req, { ...ctx, params });
    }
    return fejl("Ukendt endepunkt.", 404);
  };
}
