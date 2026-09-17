/* ============================================================
   Klientens forbindelse til serveren.

   Øvelsen i app.js kalder kun funktionerne herunder og ved hverken,
   at der findes cookies, endepunkter eller adgangskoder. Sammen med
   netlify/functions/_auth.mjs er det her, login bor: skal de studerende
   senere logge ind gennem Moodle, skiftes de to filer, og resten kan blive.
   ============================================================ */
const API = (() => {
  async function kald(sti, indstillinger = {}) {
    let svar;
    try {
      svar = await fetch(sti, {
        credentials: "same-origin",
        headers: indstillinger.krop ? { "content-type": "application/json" } : {},
        method: indstillinger.metode || "GET",
        body: indstillinger.krop ? JSON.stringify(indstillinger.krop) : undefined,
      });
    } catch {
      throw new Error("Ingen forbindelse til serveren. Tjek nettet og prøv igen.");
    }

    // Er sessionen udløbet, giver det ingen mening at vise en fejl inde i
    // øvelsen – så skal der logges ind igen.
    if (svar.status === 401 && !indstillinger.taalerUlogget) {
      location.href = "login.html?udloebet=1";
      throw new Error("Du er ikke logget ind.");
    }

    const data = svar.headers.get("content-type")?.includes("json") ? await svar.json() : null;
    if (svar.status === 409) return { konflikt: true, ...data };
    if (!svar.ok) throw new Error(data?.fejl || `Serveren svarede ${svar.status}.`);
    return data;
  }

  return {
    login: kode => kald("/api/login", { metode: "POST", krop: { kode }, taalerUlogget: true }),
    logud: () => kald("/api/logud", { metode: "POST", taalerUlogget: true }),
    mig: () => kald("/api/mig"),
    hentBesvarelse: runde => kald(`/api/besvarelse/${runde}`),
    gemBesvarelse: (runde, b) => kald(`/api/besvarelse/${runde}`, { metode: "PUT", krop: b }),
    tjek: (runde, krop) => kald(`/api/tjek/${runde}`, { metode: "POST", krop }),
    // Logning må aldrig afbryde undervisningen, så fejl her ties ihjel.
    noter: (type, ekstra = {}) =>
      kald("/api/haendelse", { metode: "POST", krop: { type, ...ekstra } }).catch(() => {}),
  };
})();
