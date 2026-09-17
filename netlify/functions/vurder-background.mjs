// Baggrundsfunktion: lader Claude læse et holds besvarelser.
//
// Navnet skal slutte på "-background" — det er sådan Netlify kender en
// baggrundsfunktion. Den svarer 202 med det samme og må køre i op til et
// kvarter, hvor en almindelig funktion timer ud efter få sekunder. Fjorten
// kald til modellen når aldrig igennem på en almindelig funktion.
//
// Resultatet lægges i lageret, og admin-siden henter det med
// GET /admin-api/hold/:id/vurdering, indtil status er "faerdig".

import * as auth from "./lib/auth.mjs";
import * as lager from "./lib/lager.mjs";
import { retGruppe } from "./lib/retning.mjs";
import { antalRunder } from "./lib/facit.mjs";
import { vurderHold, lavKlient, MODEL } from "./lib/vurdering.mjs";
import { Opsaetningsfejl } from "./lib/svar.mjs";

export default async req => {
  const session = await auth.hentSession(req);
  if (!auth.erUnderviser(session)) return new Response(null, { status: 401 });

  const { holdId } = (await req.json().catch(() => ({}))) ?? {};
  const hold = holdId ? await lager.hentHold(holdId) : null;
  // Samme ejertjek som alle andre hold-endepunkter.
  if (!hold || hold.underviser !== session.underviser) return new Response(null, { status: 404 });

  // Netlify svarer 202 til klienten, så snart funktionen er sat i gang;
  // resten herunder kører bagefter. Status gemmes, så admin-siden kan følge med.
  const noegle = `vurdering/${holdId}`;
  const paabegyndt = { status: "i gang", startet: new Date().toISOString(), model: MODEL };
  await lager.skriv(noegle, paabegyndt);

  try {
    const [studerende, grupper, besvarelser] = await Promise.all([
      lager.hentStuderendePaaHold(holdId),
      lager.hentGrupperPaaHold(holdId),
      lager.hentBesvarelserPaaHold(holdId),
    ]);
    const rettede = grupper
      .filter(g => studerende.some(s => s.gruppeId === g.id))
      .map(g => ({ id: g.id, navn: g.navn, ...retGruppe(antalRunder(), besvarelser.filter(b => b.gruppeId === g.id)) }))
      .sort((a, b) => a.navn.localeCompare(b.navn, "da", { numeric: true }));

    const resultat = await vurderHold({ grupper: rettede, antalRunder: antalRunder(), klient: await lavKlient() });

    await lager.skriv(noegle, { ...paabegyndt, ...resultat, status: "faerdig", afsluttet: new Date().toISOString() });
  } catch (e) {
    // Beskeden skal kunne læses på admin-siden. En manglende nøgle er det
    // sandsynlige, og den siger sig selv; alt andet logges råt.
    console.error("Vurdering fejlede:", e);
    await lager.skriv(noegle, {
      ...paabegyndt,
      status: "fejl",
      afsluttet: new Date().toISOString(),
      fejl: e instanceof Opsaetningsfejl ? e.message : "Kunne ikke hente vurderingen. Prøv igen.",
    });
  }

  return new Response(null, { status: 202 });
};
