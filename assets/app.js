/* ============================================================ */
const fmt = (n,d) => n.toLocaleString("da-DK",{minimumFractionDigits:d,maximumFractionDigits:d});
const beregn = v => ({...v, ag:v.og*v.aoh, sm:v.og/v.bm*100, dg:(v.bm-v.og)/(100-v.og)*100,
  lagerD: v.lager ? 365/v.lager : null, debD: 365/v.deb});

function tomTilstand(){
  return RUNDER.map(r => ({
    valg:Object.fromEntries(r.profiler.map(p=>[p.id,""])),
    grund:Object.fromEntries(r.profiler.map(p=>[p.id,""])),
    hint:Object.fromEntries(r.profiler.map(p=>[p.id,false])),
    rigtigFoerste:{}, tjek:0, facitVist:false, refl:SPM.map(()=> "")
  }));
}
let tilstand;
try{ tilstand = JSON.parse(localStorage.getItem(LAGER_NOEGLE)) || tomTilstand(); }catch(e){ tilstand = tomTilstand(); }
if(!Array.isArray(tilstand) || tilstand.length !== RUNDER.length) tilstand = tomTilstand();
let aktiv = 0;
const gem = () => { try{ localStorage.setItem(LAGER_NOEGLE, JSON.stringify(tilstand)); }catch(e){} };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const modelNavn = (r,id) => (RUNDER[r].modeller.find(m=>m.id===id)||{}).navn || "";

/* ---------- Tabel ---------- */
const aabneDef = new Set();
function tegnTabel(){
  const R = RUNDER[aktiv], T = tilstand[aktiv];
  const data = R.profiler.map(p => beregn(p.v));
  let h = "<thead><tr><th class='navn' scope='col'>Nøgletal</th>" +
    R.profiler.map(p=>`<th class='pl' scope='col'>Profil ${p.id}</th>`).join("") + "</tr></thead><tbody>";
  RAEKKER.forEach(rk => {
    const barVal = d => rk.key==="lager" ? d.lagerD : rk.key==="deb" ? d.debD : d[rk.key];
    const max = Math.max(...data.map(d => barVal(d) || 0));
    const aaben = aabneDef.has(rk.key);
    h += `<tr><th class='navn' scope='row'><button type='button' class='rowbtn' data-def='${rk.key}' aria-expanded='${aaben}'><span class='tegn'>${aaben?"−":"+"}</span><span>${rk.navn}</span></button></th>`;
    R.profiler.forEach((p,i) => {
      const d = data[i];
      let txt;
      if(rk.key==="aoh") txt = fmt(d.aoh,2);
      else if(rk.key==="lager") txt = d.lager ? `${fmt(d.lager,1)}<span class='dage'>${fmt(d.lagerD,0)} dage</span>` : "<span aria-label='intet varelager'>–</span><span class='dage'>intet lager</span>";
      else if(rk.key==="deb") txt = `${fmt(d.deb,1)}<span class='dage'>${fmt(d.debD,0)} dage</span>`;
      else txt = fmt(d[rk.key],1)+" %";
      const b = barVal(d);
      const pct = b && max ? Math.round(b/max*100) : 0;
      const hl = T.hint[p.id] && p.spor.includes(rk.key) ? " hl" : "";
      h += `<td class='v${hl}' style='background:linear-gradient(to right, var(--bar) ${pct}%, transparent ${pct}%)'>${txt}</td>`;
    });
    h += "</tr>";
    if(aaben) h += `<tr class='defrow'><td colspan='${R.profiler.length+1}'><code>${esc(rk.def)}</code><br>${esc(rk.viser)}</td></tr>`;
  });
  $("tabel").innerHTML = h + "</tbody>";
}
$("tabel").addEventListener("click", e => {
  const b = e.target.closest("[data-def]"); if(!b) return;
  const k = b.dataset.def;
  aabneDef.has(k) ? aabneDef.delete(k) : aabneDef.add(k);
  tegnTabel();
  const nb = $("tabel").querySelector(`[data-def='${k}']`); if(nb) nb.focus();
});

/* ---------- Modeller ---------- */
function tegnModeller(){
  $("modeller").innerHTML = RUNDER[aktiv].modeller.map(m =>
    `<div class='model'><strong>${esc(m.navn)}</strong><span>${esc(m.tekst)}</span></div>`).join("");
}

/* ---------- Kort ---------- */
function tegnKort(){
  const R = RUNDER[aktiv], T = tilstand[aktiv];
  const sorteret = [...R.modeller].sort((a,b)=>a.navn.localeCompare(b.navn,"da"));
  $("kort").innerHTML = R.profiler.map(p => {
    const valgt = T.valg[p.id], rigtig = valgt===p.model;
    const laast = (T.tjek>=1 && T.rigtigFoerste[p.id]) || T.tjek>=2;
    const vis = laast;
    let kls = "card", badge = "";
    if(T.tjek>=2 && !valgt){
      badge = "";
    } else if(T.tjek>=1 && (T.rigtigFoerste[p.id] || T.tjek>=2)){
      kls += rigtig ? " ok" : " forkert";
      badge = rigtig ? "<span class='badge ok'>Rigtigt</span>" : "<span class='badge forkert'>Forkert</span>";
    } else if(T.tjek===1){
      kls += " forkert"; badge = "<span class='badge forkert'>Prøv igen</span>";
    }
    const n = T.grund[p.id].trim().length;
    const sporNavne = p.spor.map(k => RAEKKER.find(r=>r.key===k).navn.toLowerCase());
    const sporTekst = sporNavne.length>1 ? sporNavne.slice(0,-1).join(", ")+" og "+sporNavne.at(-1) : sporNavne[0];
    let forkl = "";
    if(vis){
      forkl = `<div class='forklaring'>` +
        (!rigtig ? `<p class='facit'>${valgt?`I valgte ${esc(modelNavn(aktiv,valgt))}. `:""}Det rigtige svar er ${esc(modelNavn(aktiv,p.model))}.</p>` : `<p class='facit'>${esc(modelNavn(aktiv,p.model))}</p>`) +
        `<p>${esc(p.forklaring)}</p><p class='forveks'>Let at forveksle med: ${esc(p.forveksling)}</p></div>`;
    }
    return `<div class='${kls}' data-profil='${p.id}'>
      <h3>Profil ${p.id} ${badge}</h3>
      <div><label for='valg-${p.id}'>Forretningsmodel</label>
      <select id='valg-${p.id}' data-felt='valg' ${laast?"disabled":""}>
        <option value=''>Vælg model …</option>
        ${sorteret.map(m=>`<option value='${m.id}' ${valgt===m.id?"selected":""}>${esc(m.navn)}</option>`).join("")}
      </select></div>
      <div><label for='grund-${p.id}'>Begrundelse – hvilke nøgletal afslører det?</label>
      <textarea id='grund-${p.id}' data-felt='grund' ${laast?"disabled":""} placeholder='Fx: Anlægsgraden er høj, men der er intet lager, så …'>${esc(T.grund[p.id])}</textarea></div>
      ${laast ? "" : `<div class='taeller ${n<MIN_TEGN?"mangler":""}' data-taeller>${n<MIN_TEGN?`Mindst ${MIN_TEGN} tegn (${n})`:"Begrundelse klar"}</div>`}
      ${T.hint[p.id] ? `<div class='hint'>Kig særligt på ${esc(sporTekst)}. Cellerne er markeret i tabellen.</div>` : (laast ? "" : `<button type='button' class='linkbtn' data-hint>Vis hint</button>`)}
      ${forkl}
    </div>`;
  }).join("");
}
$("kort").addEventListener("input", e => {
  const card = e.target.closest("[data-profil]"); if(!card) return;
  const id = card.dataset.profil, T = tilstand[aktiv];
  if(e.target.dataset.felt==="grund"){
    T.grund[id] = e.target.value;
    const n = e.target.value.trim().length, t = card.querySelector("[data-taeller]");
    if(t){ t.textContent = n<MIN_TEGN ? `Mindst ${MIN_TEGN} tegn (${n})` : "Begrundelse klar"; t.classList.toggle("mangler", n<MIN_TEGN); }
  }
  gem(); opdaterStatus();
});
$("kort").addEventListener("change", e => {
  const card = e.target.closest("[data-profil]"); if(!card) return;
  if(e.target.dataset.felt==="valg"){ tilstand[aktiv].valg[card.dataset.profil] = e.target.value; gem(); opdaterStatus(); }
});
$("kort").addEventListener("click", e => {
  if(!e.target.matches("[data-hint]")) return;
  const id = e.target.closest("[data-profil]").dataset.profil;
  tilstand[aktiv].hint[id] = true; gem(); tegnTabel(); tegnKort(); opdaterStatus();
});

/* ---------- Tjek ---------- */
function mangler(){
  const R = RUNDER[aktiv], T = tilstand[aktiv];
  const aabne = R.profiler.filter(p => !(T.tjek>=1 && T.rigtigFoerste[p.id]));
  const utilValgt = aabne.filter(p => !T.valg[p.id]).length;
  const kort = aabne.filter(p => T.grund[p.id].trim().length < MIN_TEGN).length;
  const valgte = R.profiler.map(p=>T.valg[p.id]).filter(Boolean);
  const dubletter = valgte.length !== new Set(valgte).size;
  return {utilValgt, kort, dubletter};
}
function opdaterStatus(){
  const T = tilstand[aktiv], s = $("status"), btn = $("tjek"), R = RUNDER[aktiv];
  s.className = "status";
  if(T.tjek>=2){
    const rigtige = R.profiler.filter(p=>T.valg[p.id]===p.model).length;
    const foerste = Object.values(T.rigtigFoerste).filter(Boolean).length;
    btn.hidden = true;
    s.classList.add("good");
    s.textContent = T.facitVist && !Object.keys(T.rigtigFoerste).length
      ? "Facit er vist. Brug forklaringerne som udgangspunkt for en fælles drøftelse."
      : `Første forsøg: ${foerste} af ${R.profiler.length} rigtige. Samlet: ${rigtige} af ${R.profiler.length}. Læs forklaringerne og gå videre til refleksionen.`;
    $("refleksion").hidden = false;
    return;
  }
  btn.hidden = false;
  $("refleksion").hidden = true;
  const m = mangler();
  const dele = [];
  if(m.utilValgt) dele.push(`${m.utilValgt} ${m.utilValgt===1?"profil mangler":"profiler mangler"} en model`);
  if(m.kort) dele.push(`${m.kort} ${m.kort===1?"begrundelse er":"begrundelser er"} for kort`);
  if(m.dubletter) dele.push("samme model er valgt flere gange – hver model bruges én gang");
  btn.disabled = dele.length>0;
  btn.textContent = T.tjek===1 ? "Tjek igen og vis forklaringer" : "Tjek vores svar";
  if(dele.length){ s.textContent = dele.join(". ").replace(/^./,c=>c.toUpperCase()) + "."; }
  else if(T.tjek===1){
    const f = R.profiler.filter(p=>!T.rigtigFoerste[p.id]).length;
    s.classList.add("bad");
    s.textContent = `${R.profiler.length-f} af ${R.profiler.length} rigtige. Genovervej de ${f} markerede: Holder jeres begrundelse, når I kigger på tallene igen? Brug gerne hintet.`;
  } else s.textContent = "Klar til at tjekke.";
}
$("tjek").addEventListener("click", () => {
  const R = RUNDER[aktiv], T = tilstand[aktiv];
  if(T.tjek===0){
    R.profiler.forEach(p => T.rigtigFoerste[p.id] = T.valg[p.id]===p.model);
    T.tjek = R.profiler.every(p=>T.rigtigFoerste[p.id]) ? 2 : 1;
  } else T.tjek = 2;
  gem(); tegnKort(); opdaterStatus();
});

/* ---------- Refleksion og kopi ---------- */
function tegnSpm(){
  const T = tilstand[aktiv];
  $("spm").innerHTML = SPM.map((q,i)=>`<div class='spm'><label for='refl-${i}'>${esc(q)}</label><textarea id='refl-${i}' data-refl='${i}'>${esc(T.refl[i])}</textarea></div>`).join("");
}
$("spm").addEventListener("input", e => {
  const i = e.target.dataset.refl; if(i===undefined) return;
  tilstand[aktiv].refl[i] = e.target.value; gem();
});
function byggTekst(){
  const R = RUNDER[aktiv], T = tilstand[aktiv];
  let t = `GÆT FORRETNINGSMODELLEN – ${R.navn}\n\n`;
  R.profiler.forEach(p => {
    const rigtig = T.valg[p.id]===p.model;
    t += `Profil ${p.id}\n`;
    t += `Valgt model: ${modelNavn(aktiv,T.valg[p.id]) || "(ikke valgt)"} – ${rigtig?"rigtigt":"forkert, rigtigt svar: "+modelNavn(aktiv,p.model)}`;
    if(T.rigtigFoerste[p.id]===false && rigtig) t += " (rigtigt i andet forsøg)";
    if(T.hint[p.id]) t += " (hint brugt)";
    t += `\nBegrundelse: ${T.grund[p.id].trim() || "(ingen)"}\n\n`;
  });
  t += "REFLEKSION\n\n";
  SPM.forEach((q,i)=> t += `${q}\n${T.refl[i].trim() || "(ikke besvaret)"}\n\n`);
  return t.trim();
}
$("kopier").addEventListener("click", async () => {
  const tekst = byggTekst();
  try{
    await navigator.clipboard.writeText(tekst);
    $("kopistatus").className = "status good";
    $("kopistatus").textContent = "Besvarelsen er kopieret. Indsæt den i jeres fælles dokument eller på Moodle.";
    $("kopifelt").hidden = true;
  }catch(e){
    $("kopifelt").hidden = false;
    $("kopitekst").value = tekst;
    $("kopitekst").select();
    $("kopistatus").className = "status";
    $("kopistatus").textContent = "";
  }
});

/* ---------- Runder, nulstil, facit ---------- */
function tegnAlt(){
  document.querySelectorAll(".runder button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.runde)===aktiv)));
  $("rundeinfo").textContent = aktiv===0 ? "Modeller fra vidt forskellige brancher." : "Sværere: modeller, der ligner hinanden.";
  $("kopifelt").hidden = true; $("kopistatus").textContent = "";
  tegnTabel(); tegnModeller(); tegnKort(); tegnSpm(); opdaterStatus();
}
document.querySelector(".runder").addEventListener("click", e => {
  const b = e.target.closest("[data-runde]"); if(!b) return;
  aktiv = Number(b.dataset.runde); tegnAlt();
});
let nulstilKlar = false;
$("nulstil").addEventListener("click", () => {
  if(!nulstilKlar){ nulstilKlar = true; $("nulstil").textContent = "Klik igen for at slette rundens svar"; setTimeout(()=>{nulstilKlar=false; $("nulstil").textContent="Start runden forfra";},4000); return; }
  nulstilKlar = false; $("nulstil").textContent = "Start runden forfra";
  tilstand[aktiv] = tomTilstand()[aktiv]; gem(); tegnAlt();
});
$("facit").addEventListener("click", () => {
  const T = tilstand[aktiv];
  T.tjek = 2; T.facitVist = true;
  RUNDER[aktiv].profiler.forEach(p => T.hint[p.id] = true);
  gem(); tegnAlt();
});

tegnAlt();
