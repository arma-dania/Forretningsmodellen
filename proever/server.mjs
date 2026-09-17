// Prøveserver. Kører de rigtige funktionsfiler fra netlify/functions, men
// med et lager i hukommelsen i stedet for Netlify Blobs, så hele forløbet
// kan afprøves uden at deploye og uden at røre rigtige data.
//
//   npm run proeve        kører API- og browserprøverne
//   npm run server        starter kun serveren på http://localhost:8787
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROD = path.resolve(import.meta.dirname, "..");

// Bytter @netlify/blobs ud, før funktionerne indlæses.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "@netlify/blobs")
      return { url: pathToFileURL(path.join(ROD, "proever/blobs-attrap.mjs")).href, shortCircuit: true };
    return next(spec, ctx);
  },
});

process.env.SESSION_HEMMELIGHED ??= "proevehemmelighed";
process.env.ADMIN_KODE ??= "underviser1234";

const api = (await import(path.join(ROD, "netlify/functions/api.mjs"))).default;
const admin = (await import(path.join(ROD, "netlify/functions/admin.mjs"))).default;

const TYPER = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

export function start(port = 8787) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin-api/")) {
      const bidder = [];
      for await (const b of req) bidder.push(b);
      const forespoergsel = new Request("http://localhost" + req.url, {
        method: req.method,
        headers: { ...req.headers, "x-nf-client-connection-ip": "1.2.3.4" },
        body: bidder.length ? Buffer.concat(bidder) : undefined,
      });
      const svar = await (url.pathname.startsWith("/admin-api/") ? admin : api)(forespoergsel, {});
      res.writeHead(svar.status, Object.fromEntries(svar.headers));
      res.end(Buffer.from(await svar.arrayBuffer()));
      return;
    }

    // Kun public/ serveres – præcis som Netlify gør det.
    const fil = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      // Filen skal læses FØR statuslinjen sendes – ellers kan 404'eren ikke
      // skrives, når filen mangler, og serveren vælter i stedet.
      const indhold = await readFile(path.join(ROD, "public", fil));
      res.writeHead(200, { "content-type": TYPER[path.extname(fil)] || "application/octet-stream" });
      res.end(indhold);
    } catch {
      res.writeHead(404).end("ikke fundet");
    }
  });
  return new Promise(klar => server.listen(port, () => klar(server)));
}

if (process.argv[1] === import.meta.filename) {
  await start();
  console.log("Prøveserver på http://localhost:8787 (underviserkode: underviser1234)");
}
