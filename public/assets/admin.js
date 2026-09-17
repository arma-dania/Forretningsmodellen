/* ============================================================
   Underviserens admin-modul: hold, studerende, koder, overblik.
   ============================================================ */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function kald(sti, indstillinger = {}) {
  let svar;
  try {
    svar = await fetch(sti, {
      credentials: "same-origin",
      method: indstillinger.metode || "GET",
      headers: indstillinger.krop ? { "content-type": "application/json" } : {},
      body: indstillinger.krop ? JSON.stringify(indstillinger.krop) : undefined,
    });
  } catch {
    throw new Error("Ingen forbindelse til serveren.");
  }
  if (svar.status === 401 && !indstillinger.taalerUlogget) {
    visLogin();
    throw new Error("Log ind igen.");
  }
  const data = svar.headers.get("content-type")?.includes("json") ? await svar.json() : null;
  if (!svar.ok) throw new Error(data?.fejl || `Serveren svarede ${svar.status}.`);
  return data;
}

let hold = [];
let valgtHold = null;
let overblik = null;
let underviser = null;

const dato = t => (t ? new Date(t).toLocaleString("da-DK", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–");
const navnPaa = s => s.navn || "(uden navn)";

function melding(el, tekst, slags) {
  const e = $(el);
  e.className = "status" + (slags ? " " + slags : "");
  e.textContent = tekst;
}

/* ---------- Login ---------- */
function visLogin() {
  $("loginside").hidden = false;
  $("adminside").hidden = true;
  $("adminkode").focus();
}

$("loginform").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginknap").disabled = true;
  melding("loginstatus", "Logger ind …");
  try {
    await kald("/admin-api/login", { metode: "POST", krop: { kode: $("adminkode").value }, taalerUlogget: true });
    $("adminkode").value = "";
    valgtHold = null;
    melding("loginstatus", "");
    await start();
  } catch (fejl) {
    melding("loginstatus", fejl.message, "bad");
  } finally {
    $("loginknap").disabled = false;
  }
});

$("logud").addEventListener("click", async () => {
  await kald("/admin-api/logud", { metode: "POST", taalerUlogget: true });
  location.reload();
});

/* ---------- Hold ---------- */
async function hentHold() {
  hold = (await kald("/admin-api/hold")).hold;
  // Listen indeholder kun den indloggede undervisers egne hold; serveren
  // filtrerer, så en kollegas hold aldrig når hertil.
  $("holdliste").innerHTML = hold.length
    ? hold
        .map(
          h => `<button type="button" class="holdkort" data-hold="${h.id}" aria-current="${h.id === valgtHold}">
            <strong>${esc(h.navn)}</strong>
            <span>${h.antalStuderende} studerende i ${h.antalGrupper} ${h.antalGrupper === 1 ? "gruppe" : "grupper"}<br>
            ${h.antalLoggetInd} har logget ind</span></button>`
        )
        .join("")
    : "<p class='sub'>Du har ingen hold endnu. Opret det første herunder.</p>";
}

$("holdliste").addEventListener("click", e => {
  const b = e.target.closest("[data-hold]");
  if (b) vaelgHold(b.dataset.hold);
});

$("opretholdform").addEventListener("submit", async e => {
  e.preventDefault();
  const navn = $("holdnavn").value.trim();
  if (!navn) return;
  try {
    const { hold: nyt } = await kald("/admin-api/hold", { metode: "POST", krop: { navn } });
    $("holdnavn").value = "";
    await hentHold();
    await vaelgHold(nyt.id);
  } catch (fejl) {
    alert(fejl.message);
  }
});

async function vaelgHold(id) {
  valgtHold = id;
  $("holdvisning").hidden = false;
  $("opretpanel").hidden = true;
  $("kodepanel").hidden = true;
  $("nyekoder").hidden = true;
  await hentHold();
  await hentOverblik();
}

$("sletHold").addEventListener("click", async () => {
  const h = hold.find(x => x.id === valgtHold);
  if (!h) return;
  // Sletning kan ikke fortrydes, så navnet skal skrives. Det er samtidig
  // den handling, der rydder de studerendes data ved semesterslut.
  const svar = prompt(
    `Sletter holdet "${h.navn}" med alle studerende, grupper, besvarelser og logget aktivitet.\n` +
      `Det kan ikke fortrydes.\n\nSkriv holdets navn for at bekræfte:`
  );
  if (svar === null) return;
  if (svar.trim() !== h.navn) return alert("Navnet passede ikke. Der er ikke slettet noget.");
  try {
    const r = await kald(`/admin-api/hold/${valgtHold}`, { metode: "DELETE" });
    valgtHold = null;
    $("holdvisning").hidden = true;
    await hentHold();
    alert(
      `"${r.navn}" er slettet: ${r.slettet.studerende} studerende, ${r.slettet.grupper} grupper, ` +
        `${r.slettet.besvarelser} besvarelser og ${r.slettet.haendelser} loggede handlinger.`
    );
  } catch (fejl) {
    alert(fejl.message);
  }
});

/* ---------- Studerende ---------- */
$("visOpret").addEventListener("click", () => {
  $("opretpanel").hidden = !$("opretpanel").hidden;
  if (!$("opretpanel").hidden) $("liste").focus();
});

$("opretStuderende").addEventListener("click", async () => {
  const liste = $("liste").value;
  if (!liste.trim()) return melding("opretstatus", "Skriv eller indsæt en liste først.", "bad");
  melding("opretstatus", "Opretter …");
  try {
    const r = await kald(`/admin-api/hold/${valgtHold}/studerende`, { metode: "POST", krop: { liste } });
    const dele = [`${r.oprettede.length} oprettet`];
    if (r.sprunget.length) dele.push(`${r.sprunget.length} sprunget over (fandtes i forvejen)`);
    melding("opretstatus", dele.join(", ") + ".", "good");
    $("liste").value = "";
    if (r.oprettede.length) {
      $("nyekoder").hidden = false;
      $("nyekoderliste").textContent = r.oprettede
        .map(s => `${s.gruppe}\t${s.navn || ""}\t${s.kode}`)
        .join("\n");
    }
    await hentOverblik();
    await hentHold();
  } catch (fejl) {
    melding("opretstatus", fejl.message, "bad");
  }
});

/* ---------- Koder ---------- */
$("visKoder").addEventListener("click", () => {
  $("kodepanel").hidden = !$("kodepanel").hidden;
  if (!$("kodepanel").hidden) tegnKoder();
});

function tegnKoder() {
  if (!overblik) return;
  const linjer = [];
  for (const g of overblik.grupper) {
    linjer.push(g.navn);
    for (const m of g.medlemmer) linjer.push(`   ${navnPaa(m).padEnd(30)} ${m.kode}`);
    linjer.push("");
  }
  $("kodeliste").textContent = linjer.join("\n") || "Ingen studerende endnu.";
}

/* ---------- Overblik ---------- */
$("opdater").addEventListener("click", () => hentOverblik());
$("eksporter").addEventListener("click", () => {
  location.href = `/admin-api/hold/${valgtHold}/eksport`;
});

async function hentOverblik() {
  if (!valgtHold) return;
  $("gemstatus").className = "gemstatus";
  $("gemstatus").textContent = "Henter …";
  try {
    overblik = await kald(`/admin-api/hold/${valgtHold}/oversigt`);
    tegnResultater();
    tegnVurdering(await kald(`/admin-api/hold/${valgtHold}/vurdering`).catch(() => null));
    tegnOverblik();
    tegnLog();
    if (!$("kodepanel").hidden) tegnKoder();
    $("gemstatus").textContent = `Opdateret ${new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (fejl) {
    $("gemstatus").textContent = fejl.message;
    $("gemstatus").classList.add("bad");
  }
}

const maerke = r => {
  if (r.status === "ikke begyndt") return `<span class="maerke ingen">ikke begyndt</span>`;
  if (r.status === "facit vist") return `<span class="maerke facit">facit vist</span>`;
  if (r.status === "afsluttet") return `<span class="maerke ok">afsluttet</span>`;
  return `<span class="maerke i-gang">${esc(r.status)}</span>`;
};

// Modellernes navne står i assets/data.js, som også indlæses her. Filen
// indeholder ikke facit, så der følger ikke noget følsomt med.
const modelnavn = (runde, id) =>
  id ? (RUNDER[runde]?.modeller.find(m => m.id === id)?.navn ?? id) : "(ikke valgt)";

const pct = a => Math.round(a * 100);

/* ---------- Søjler ----------
   Én serie, én farve. Søjlen viser størrelse; værdien står ved spidsen i
   tekstfarve, så tallet aldrig skal aflæses af farven alene. Tallene står
   desuden i tabellerne nedenfor, så intet er låst inde i en grafik. */
function soejler(raekker, maks = 100) {
  return raekker
    .map(r => {
      const bredde = r.vaerdi === null ? 0 : Math.max(0, Math.min(100, (r.vaerdi / maks) * 100));
      return `<div class="soejle${r.vaerdi === null ? " ingen" : ""}"${r.titel ? ` title="${esc(r.titel)}"` : ""}>
        <span class="navn" title="${esc(r.navn)}">${esc(r.navn)}</span>
        <span class="bane"><span class="fyld" style="width:${bredde}%"></span></span>
        <span class="vaerdi">${esc(r.etiket)}</span>
      </div>`;
    })
    .join("");
}

function tegnResultater() {
  const b = overblik.benchmark;
  $("resultatsub").textContent =
    `Modelvalget rettes entydigt. Begrundelserne måles på, om de peger på de nøgletal, ` +
    `der faktisk afslører profilen – det er et fingerpeg, ikke en karakter. Scoren vejer ` +
    `første forsøg ${pct(b.vaegte.foersteForsoeg)} %, slutresultatet ${pct(b.vaegte.samlet)} % ` +
    `og begrundelserne ${pct(b.vaegte.begrundelser)} %.`;

  const stat = (tal, mrk) => `<div class="stat"><span class="tal">${tal}</span><span class="mrk">${esc(mrk)}</span></div>`;
  $("stattavle").innerHTML = b.antalMedScore
    ? stat(b.snit, "gennemsnit") + stat(b.median, "median") +
      stat(`${b.lavest}–${b.hoejest}`, "spænd") +
      stat(`${b.antalMedScore}/${b.antalGrupper}`, "grupper færdige")
    : "<p class='sub'>Ingen grupper har afsluttet en runde endnu.</p>";

  // Grupperne, sorteret efter score. Grupper uden afsluttet runde står sidst.
  const sorteret = [...overblik.grupper].sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
  $("gruppesub").textContent = b.antalMedScore
    ? "Samlet score pr. gruppe, højest øverst. Hold musen over en søjle for opdelingen."
    : "";
  $("gruppesoejler").innerHTML = soejler(
    sorteret.map(g => ({
      navn: g.navn,
      vaerdi: g.score,
      etiket: g.score === null ? "ikke afsluttet" : `${g.score} / 100`,
      titel: g.score === null
        ? "Gruppen har ikke afsluttet en runde endnu."
        : `${g.rigtigeFoerste}/${g.ialt} rigtige i første forsøg, ${g.rigtigeSlut}/${g.ialt} til sidst. ` +
          `Begrundelserne peger på ${pct(g.begrundelseAndel)} % af de afslørende nøgletal. ${g.hint} hint brugt.`,
    }))
  );

  // Profilernes sværhed pr. runde.
  $("profilsoejler").innerHTML = overblik.svaerhed
    .map(r => {
      const medSvar = r.profiler.filter(p => p.grupper > 0);
      if (!medSvar.length) return "";
      const raekker = medSvar.map(p => ({
        navn: `Profil ${p.profil} – ${modelnavn(r.runde, p.rigtigModel)}`,
        vaerdi: pct(p.rigtigeFoerste / p.grupper),
        etiket: `${p.rigtigeFoerste}/${p.grupper}`,
        titel: `${p.rigtigeSlut}/${p.grupper} ramte til sidst. ${p.hint} brugte hint. ` +
          `Begrundelserne peger på ${pct(p.begrundelseAndel)} % af de afslørende nøgletal.`,
      }));
      const fejl = medSvar
        .filter(p => p.hyppigsteFejl)
        .map(p => `Profil ${p.profil} blev oftest forvekslet med ${esc(modelnavn(r.runde, p.hyppigsteFejl))} (${p.antalFejl} ${p.antalFejl === 1 ? "gruppe" : "grupper"})`);
      return `<p class="soejlenote"><strong>Runde ${r.runde + 1}</strong></p>
        <div class="soejler">${soejler(raekker)}</div>
        ${fejl.length ? `<p class="forveksling">${fejl.join(". ")}.</p>` : ""}`;
    })
    .join("");

  tegnStuderende();
}

/* ---------- De studerende ----------
   Scoren er gruppens. Det individuelle er deltagelsen, og den står for sig,
   så tabellen ikke kommer til at ligne en rangliste over enkeltpersoner. */
let studSort = { felt: "navn", op: true };

function tegnStuderende() {
  const raekker = overblik.grupper.flatMap(g =>
    g.medlemmer.map(m => ({
      navn: navnPaa(m), gruppe: g.navn, score: g.score,
      logins: m.logins, handlinger: m.handlinger, hint: m.hint, sidst: m.sidst,
    }))
  );
  if (!raekker.length) { $("studerendetavle").innerHTML = "<p class='sub'>Ingen studerende endnu.</p>"; return; }

  const { felt, op } = studSort;
  raekker.sort((a, x) => {
    const [p, q] = [a[felt], x[felt]];
    const c = typeof p === "number" || typeof q === "number"
      ? (p ?? -1) - (q ?? -1)
      : String(p ?? "").localeCompare(String(q ?? ""), "da", { numeric: true });
    return op ? c : -c;
  });

  const kolonner = [
    ["navn", "Studerende", "l"], ["gruppe", "Gruppe", "l"], ["score", "Gruppens score", ""],
    ["logins", "Logins", ""], ["handlinger", "Handlinger", ""], ["hint", "Hint", ""], ["sidst", "Senest aktiv", "l"],
  ];
  $("studerendetavle").innerHTML = `<div class="tabelwrap"><table class="admin sorterbar"><thead><tr>${kolonner
    .map(([n, t, k]) => `<th class="${k}${n === "navn" ? " navn" : ""}" scope="col" data-sort="${n}"${
      felt === n ? ` aria-sort="${op ? "ascending" : "descending"}"` : ""}>${t}</th>`)
    .join("")}</tr></thead><tbody>${raekker
    .map(r => `<tr>
      <th class="navn l" scope="row">${esc(r.navn)}</th>
      <td class="l">${esc(r.gruppe)}</td>
      <td>${r.score === null ? "<span class='maerke ingen'>ingen</span>" : r.score}</td>
      <td>${r.logins}</td><td>${r.handlinger}</td><td>${r.hint}</td>
      <td class="l">${r.sidst ? dato(r.sidst) : "<span class='maerke ingen'>aldrig</span>"}</td>
    </tr>`)
    .join("")}</tbody></table></div>`;
}

$("studerendetavle").addEventListener("click", e => {
  const th = e.target.closest("[data-sort]");
  if (!th) return;
  const felt = th.dataset.sort;
  studSort = { felt, op: studSort.felt === felt ? !studSort.op : felt === "navn" || felt === "gruppe" };
  tegnStuderende();
});

/* ---------- Gruppernes svar ---------- */
function tegnOverblik() {
  const antal = overblik.grupper.reduce((n, g) => n + g.medlemmer.length, 0);
  $("overbliksub").textContent =
    `${overblik.hold.navn}: ${antal} studerende i ${overblik.grupper.length} ` +
    `${overblik.grupper.length === 1 ? "gruppe" : "grupper"}.`;

  if (!overblik.grupper.length) {
    $("overblik").innerHTML = "<p class='sub'>Ingen grupper endnu. Opret studerende ovenfor.</p>";
    return;
  }

  $("overblik").innerHTML = overblik.grupper
    .map(g => {
      const medlemmer = `<div class="tabelwrap"><table class="admin"><thead><tr>
          <th class="navn l" scope="col">Studerende</th>
          <th class="l" scope="col">Kode</th><th scope="col">Logins</th>
          <th scope="col">Handlinger</th><th class="l" scope="col">Senest aktiv</th><th></th>
        </tr></thead><tbody>${g.medlemmer
          .map(m => `<tr><th class="navn l" scope="row">${esc(navnPaa(m))}</th>
              <td class="kode">${esc(m.kode)}</td>
              <td>${m.logins}</td><td>${m.handlinger}</td>
              <td class="l">${m.sidst ? dato(m.sidst) : "<span class='maerke ingen'>aldrig</span>"}</td>
              <td><button type="button" class="linkbtn" data-nykode="${m.id}">ny kode</button></td></tr>`)
          .join("")}</tbody></table></div>`;

      const runder = g.runder
        .map(r => {
          if (!r.begyndt) return `<p><strong>Runde ${r.runde + 1}</strong> ${maerke(r)}</p>`;
          const svar = r.profiler
            .map(p => {
              const v = p.begrundelse;
              const tynd = v.naevnte.length === 0 ? " tynd" : "";
              return `<li>Profil ${esc(p.profil)}: ${esc(modelnavn(r.runde, p.valgt))}
                ${p.rigtigFoerst ? "<span class='maerke ok'>første forsøg</span>"
                  : p.rigtigTilSidst ? "<span class='maerke i-gang'>andet forsøg</span>"
                  : `<span class='maerke facit'>forkert – ${esc(modelnavn(r.runde, p.rigtig))}</span>`}
                <span class="daek${tynd}">peger på ${v.naevnte.length}/${v.ialt} afslørende nøgletal</span>
                <span class="begrundelse">${esc(p.tekst) || "<em>ingen begrundelse</em>"}</span></li>`;
            })
            .join("");
          const refl = (r.refleksion || []).filter(x => x);
          return `<p><strong>Runde ${r.runde + 1}</strong> ${maerke(r)}
              ${r.score !== null ? `— score ${r.score}/100,` : "—"}
              første forsøg ${r.rigtigeFoerste}/${r.ialt}, samlet ${r.rigtigeSlut}/${r.ialt},
              ${r.hint} hint. Senest ${dato(r.opdateret)}${r.opdateretAf ? ` af ${esc(r.opdateretAf)}` : ""}.</p>
            <ul class="svarliste">${svar}</ul>
            ${refl.length ? `<ul class="svarliste">${refl.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`;
        })
        .join("");

      return `<div class="gruppeblok"><h3>${esc(g.navn)}${
        g.score !== null ? ` <span class="maerke ok">${g.score}/100</span>` : ""
      }</h3>${medlemmer}${runder}</div>`;
    })
    .join("");
}

$("overblik").addEventListener("click", async e => {
  const b = e.target.closest("[data-nykode]");
  if (!b) return;
  if (!confirm("Den gamle kode holder op med at virke med det samme. Fortsæt?")) return;
  try {
    const { kode } = await kald(`/admin-api/studerende/${valgtHold}/${b.dataset.nykode}/nykode`, { metode: "POST" });
    await hentOverblik();
    alert(`Ny kode: ${kode}`);
  } catch (fejl) {
    alert(fejl.message);
  }
});

/* ---------- Claudes laesning ---------- */
// Arbejdet gøres af en baggrundsfunktion, fordi fjorten kald til modellen
// ikke når igennem en almindelig funktions timeout. Derfor sættes den i gang
// og status hentes indtil den er færdig.
let vurderTimer = null;

$("vurder").addEventListener("click", async () => {
  if (!valgtHold) return;
  $("vurder").disabled = true;
  melding("vurderstatus", "Claude læser besvarelserne … det tager typisk et halvt til et helt minut.");
  try {
    const svar = await fetch("/.netlify/functions/vurder-background", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ holdId: valgtHold }),
    });
    if (svar.status === 401) { visLogin(); return; }
    if (svar.status === 404) throw new Error("Holdet findes ikke.");
    if (!svar.ok && svar.status !== 202) throw new Error(`Serveren svarede ${svar.status}.`);
    foelgVurdering();
  } catch (fejl) {
    melding("vurderstatus", fejl.message, "bad");
    $("vurder").disabled = false;
  }
});

function foelgVurdering() {
  clearTimeout(vurderTimer);
  vurderTimer = setTimeout(async () => {
    try {
      const v = await kald(`/admin-api/hold/${valgtHold}/vurdering`);
      tegnVurdering(v);
      if (v.status === "i gang") foelgVurdering();
    } catch (fejl) {
      melding("vurderstatus", fejl.message, "bad");
      $("vurder").disabled = false;
    }
  }, 3000);
}

// Modellens svar er tekst og skal renses, før det sættes ind. Afsnit skilles
// ved blanke linjer.
const afsnit = t => String(t ?? "").split(/\n\s*\n/).filter(Boolean).map(a => `<p>${esc(a.trim())}</p>`).join("");

function tegnVurdering(v) {
  if (!v || v.status === "ingen") { $("vurdering").innerHTML = ""; return; }

  if (v.status === "i gang") {
    melding("vurderstatus", "Claude læser besvarelserne … det tager typisk et halvt til et helt minut.");
    $("vurder").disabled = true;
    return;
  }
  $("vurder").disabled = false;
  if (v.status === "fejl") { melding("vurderstatus", v.fejl || "Det gik galt.", "bad"); return; }

  melding("vurderstatus", `Læst ${dato(v.afsluttet)} af ${v.model}.`, "good");
  $("vurder").textContent = "Læs besvarelserne igen";

  const opsamlinger = (v.opsamlinger ?? [])
    .map(o => `<div class="opsamling"><h4>Til opsamlingen – runde ${o.runde + 1}</h4>
      ${afsnit(o.tekst)}
      <p class="udkast">På tværs af ${o.antalGrupper} grupper. Udkast til dig, ikke til de studerende.</p></div>`)
    .join("");

  const grupper = (v.grupper ?? [])
    .map(g => `<div class="vurdering"><h4>${esc(g.navn)}</h4>${g.runder
      .map(r => `<p class="runde">Runde ${r.runde + 1}</p>${afsnit(r.note)}`)
      .join("")}</div>`)
    .join("");

  $("vurdering").innerHTML = opsamlinger + grupper;
}

/* ---------- Aktivitet ---------- */
const HAENDELSESTEKST = {
  login: "loggede ind",
  aabnet: "åbnede øvelsen",
  "runde-skiftet": "skiftede runde",
  hint: "bad om hint",
  "foerste-tjek": "tjekkede første gang",
  "runde-afsluttet": "afsluttede runden",
  "facit-vist": "fik facit vist",
  kopieret: "kopierede besvarelsen",
};

function tegnLog() {
  const navne = new Map();
  for (const g of overblik.grupper) for (const m of g.medlemmer) navne.set(m.id, `${navnPaa(m)} (${g.navn})`);

  $("aktivitetsub").textContent = `${overblik.antalHaendelser} handlinger i alt. De nyeste ${Math.min(
    overblik.antalHaendelser,
    overblik.senesteHaendelser.length
  )} vises.`;

  $("log").innerHTML = overblik.senesteHaendelser.length
    ? overblik.senesteHaendelser
        .map(h => {
          const hvad = HAENDELSESTEKST[h.type] || h.type;
          const detalje = [
            Number.isInteger(h.runde) ? `runde ${h.runde + 1}` : "",
            h.profil ? `profil ${h.profil}` : "",
            h.rigtige !== undefined ? `${h.rigtige}/${h.ialt} rigtige` : "",
          ]
            .filter(Boolean)
            .join(", ");
          return `<div><time>${dato(h.tid)}</time><span>${esc(navne.get(h.studId) || "ukendt")} ${esc(hvad)}${
            detalje ? ` — ${esc(detalje)}` : ""
          }</span></div>`;
        })
        .join("")
    : "<p class='sub'>Ingen aktivitet endnu.</p>";
}

/* ---------- Start ---------- */
async function start() {
  try {
    underviser = await kald("/admin-api/mig", { taalerUlogget: true });
  } catch {
    return visLogin();
  }
  $("loginside").hidden = true;
  $("adminside").hidden = false;
  $("undervisernavn").textContent = underviser.navn;
  await hentHold();
  if (!valgtHold && hold.length) await vaelgHold(hold[0].id);
}
start();
