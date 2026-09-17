const B = "http://localhost:8787";
let fejlede = 0;
const ok = (navn, betingelse, ekstra="") => { console.log((betingelse?"  ok  ":"  FEJL") + "  " + navn + (ekstra?"  → "+ekstra:"")); if(!betingelse) fejlede++; };

function klient(){
  let cookie = "";
  return async (metode, sti, krop) => {
    const r = await fetch(B+sti, { method:metode, headers:{...(krop?{"content-type":"application/json"}:{}), ...(cookie?{cookie}:{})},
      body: krop?JSON.stringify(krop):undefined });
    const saet = r.headers.get("set-cookie");
    if(saet) cookie = saet.split(";")[0];
    const ct = r.headers.get("content-type")||"";
    return { status:r.status, data: ct.includes("json") ? await r.json() : await r.text() };
  };
}

console.log("\n=== Underviser opretter hold og studerende ===");
const a = klient();
ok("forkert underviserkode afvises", (await a("POST","/admin-api/login",{kode:"forkert"})).status === 401);
const arneLogin = await a("POST","/admin-api/login",{kode:"arne1234"});
ok("Arnes kode virker", arneLogin.status === 200 && arneLogin.data.navn === "Arne", arneLogin.data.navn);
ok("mig viser hvem der er logget ind", (await a("GET","/admin-api/mig")).data.navn === "Arne");
ok("hold kræver navn", (await a("POST","/admin-api/hold",{navn:"  "})).status === 400);
const { data:{hold} } = await a("POST","/admin-api/hold",{navn:"MØK 2026 forår"});
ok("hold oprettet", !!hold.id, hold.navn);

const liste = "Gruppe 1\nAnne Jensen\nBo Hansen\n\nGruppe 2\nCecilie Dam\nDavid Eg";
const { data:opret } = await a("POST",`/admin-api/hold/${hold.id}/studerende`,{liste});
ok("fire studerende oprettet", opret.oprettede.length === 4, opret.oprettede.map(s=>s.gruppe+"/"+s.navn).join(", "));
ok("to grupper dannet", new Set(opret.oprettede.map(s=>s.gruppe)).size === 2);
ok("koder har laesbart format", opret.oprettede.every(s=>/^[a-z2-9]{4}-[a-z2-9]{4}$/.test(s.kode)), opret.oprettede[0].kode);
ok("alle koder forskellige", new Set(opret.oprettede.map(s=>s.kode)).size === 4);
const { data:igen } = await a("POST",`/admin-api/hold/${hold.id}/studerende`,{liste});
ok("dubletter springes over", igen.oprettede.length === 0 && igen.sprunget.length === 4);

// Systemet skal ikke kende studienumre. Indsætter underviseren en gammel
// liste, hvor nummeret står forrest, skal nummeret kasseres – ikke havne
// som navn og ikke følge med i eksporten.
const { data:gammel } = await a("POST",`/admin-api/hold/${hold.id}/studerende`,
  {liste:"Gruppe 3\n201240\tErik Foss\n201241;Frida G\u00e5rd\n201242"});
ok("numre i en gammel liste kasseres", gammel.oprettede.length===2 &&
   gammel.oprettede.every(s=>!/\d/.test(s.navn)), gammel.oprettede.map(s=>s.navn).join(", "));
ok("en linje med kun et nummer bliver ikke til en studerende",
   !gammel.oprettede.some(s=>/^\d+$/.test(s.navn)), gammel.oprettede.map(s=>`"${s.navn}"`).join(", "));
ok("intet studienummer gemmes", gammel.oprettede.every(s=>s.studienummer===undefined));

const anne = opret.oprettede.find(s=>s.navn==="Anne Jensen");
const bo   = opret.oprettede.find(s=>s.navn==="Bo Hansen");
const cecilie = opret.oprettede.find(s=>s.navn==="Cecilie Dam");

console.log("\n=== Studerende logger ind ===");
const s1 = klient(), s2 = klient(), s3 = klient();
ok("ukendt kode afvises", (await s1("POST","/api/login",{kode:"aaaa-bbbb"})).status === 401);
ok("Anne kan logge ind", (await s1("POST","/api/login",{kode:anne.kode})).status === 200);
await s2("POST","/api/login",{kode:bo.kode});
await s3("POST","/api/login",{kode:cecilie.kode});
const { data:mig } = await s1("GET","/api/mig");
ok("mig viser hold og gruppe", mig.hold==="MØK 2026 forår" && mig.gruppe==="Gruppe 1", `${mig.hold} / ${mig.gruppe}`);
ok("mig viser gruppekammerat", mig.gruppekammerater.length===2 && mig.gruppekammerater.some(k=>k.navn==="Bo Hansen"));
ok("mig udleverer ikke studienummer", mig.studienummer===undefined &&
   mig.gruppekammerater.every(k=>k.studienummer===undefined));

console.log("\n=== Gruppen deler besvarelse ===");
let { data:b } = await s1("GET","/api/besvarelse/0");
ok("tom besvarelse ved start", b.tjek===0 && b.version===0 && b.retning===null);
const g1 = await s1("PUT","/api/besvarelse/0",{version:0, valg:{A:"elektronik"}, grund:{A:"Lav bruttomargin og hoej omsaetningshastighed."}});
ok("gemt, version tæller op", g1.data.version===1);
const { data:boSer } = await s2("GET","/api/besvarelse/0");
ok("Bo ser Annes svar", boSer.valg.A==="elektronik" && boSer.version===1);
const { data:cecilieSer } = await s3("GET","/api/besvarelse/0");
ok("anden gruppe paavirkes ikke", !cecilieSer.valg.A, "Gruppe 2 er tom");
const konflikt = await s2("PUT","/api/besvarelse/0",{version:0, valg:{A:"saas"}});
ok("forældet version giver konflikt", konflikt.status===409 && konflikt.data.konflikt===true);
ok("konflikten leverer gruppens udgave", konflikt.data.besvarelse.valg.A==="elektronik");

console.log("\n=== Foerste tjek (tre rigtige, to forkerte) ===");
const delvis = {A:"elektronik", B:"moebel", C:"saas", D:"konsulent", E:"supermarked"};
const grunde = Object.fromEntries("ABCDE".split("").map(k=>[k,"En begrundelse der er laengere end femogtyve tegn."]));
ok("ufuldstaendigt svar afvises", (await s1("POST","/api/tjek/0",{valg:{A:"elektronik"}, grund:grunde})).status === 400);
ok("samme model to gange afvises", (await s1("POST","/api/tjek/0",{valg:{A:"saas",B:"saas",C:"moebel",D:"konsulent",E:"supermarked"}, grund:grunde})).status === 400);
const { data:t1 } = await s1("POST","/api/tjek/0",{valg:delvis, grund:grunde});
ok("runden fortsaetter (tjek=1)", t1.tjek===1);
ok("tre rigtige i foerste forsoeg", Object.values(t1.rigtigFoerste).filter(Boolean).length===3, JSON.stringify(t1.rigtigFoerste));
ok("facit for de rigtige vises", !!t1.retning.A.forklaring && t1.retning.A.model==="elektronik");
ok("FACIT FOR DE FORKERTE SKJULES", t1.retning.D.model===undefined && t1.retning.D.forklaring===undefined, JSON.stringify(t1.retning.D));

console.log("\n=== Forsoeg paa at snyde ===");
const laas = await s1("PUT","/api/besvarelse/0",{version:t1.version, valg:{...delvis, A:"saas"}, grund:grunde});
const { data:efterLaas } = await s1("GET","/api/besvarelse/0");
ok("laast profil kan ikke aendres", efterLaas.valg.A==="elektronik", "forsoegte at saette A=saas");
await s1("PUT","/api/besvarelse/0",{version:efterLaas.version, valg:{...delvis, D:"supermarked", E:"konsulent"}, grund:grunde});
const { data:orakel } = await s1("GET","/api/besvarelse/0");
ok("ulaast profil KAN rettes", orakel.valg.D==="supermarked");
ok("INGEN FACITMASKINE: retter man og genindlaeser, afsloeres intet",
   orakel.retning.D.rigtig===false && orakel.retning.D.model===undefined,
   "D er nu rigtigt valgt, men serveren holder paa det");

console.log("\n=== Andet tjek afslutter runden ===");
const { data:t2 } = await s1("POST","/api/tjek/0",{valg:{...delvis, D:"supermarked", E:"konsulent"}, grund:grunde});
ok("runden afsluttet (tjek=2)", t2.tjek===2);
ok("alt facit udleveres nu", "ABCDE".split("").every(k=>!!t2.retning[k].forklaring && !!t2.retning[k].model));
ok("foerste forsoeg staar fast paa tre", Object.values(t2.rigtigFoerste).filter(Boolean).length===3);
ok("tredje tjek afvises", (await s1("POST","/api/tjek/0",{valg:delvis, grund:grunde})).status === 409);

console.log("\n=== Runde 2 og facit-knappen ===");
const { data:t3 } = await s3("POST","/api/tjek/1",{opgiv:true});
ok("facit uden at svare virker", t3.tjek===2 && !!t3.retning.A.forklaring);
ok("ingen talt som rigtige", Object.values(t3.rigtigFoerste).filter(Boolean).length===0);
ok("ugyldig runde afvises", (await s1("GET","/api/besvarelse/9")).status === 404);

console.log("\n=== Haendelseslog ===");
ok("ukendt haendelse afvises", (await s1("POST","/api/haendelse",{type:"noget-andet"})).status === 400);
ok("hint logges", (await s1("POST","/api/haendelse",{type:"hint", runde:0, profil:"D"})).status === 200);

console.log("\n=== Underviserens overblik ===");
const { data:o } = await a("GET",`/admin-api/hold/${hold.id}/oversigt`);
ok("tre grupper i overblikket", o.grupper.length===3, o.grupper.map(g=>g.navn).join(", "));
ok("overblik uden studienumre", o.grupper.every(g=>g.medlemmer.every(m=>m.studienummer===undefined)));
const gr1 = o.grupper.find(g=>g.navn==="Gruppe 1");
ok("gruppe 1 har to medlemmer", gr1.medlemmer.length===2);
ok("runde 1 er afsluttet", gr1.runder[0].status==="afsluttet", gr1.runder[0].status);
ok("resultat: 3 i foerste, 5 samlet", gr1.runder[0].rigtigeFoerste===3 && gr1.runder[0].rigtigeSlut===5,
   `${gr1.runder[0].rigtigeFoerste}/${gr1.runder[0].ialt} og ${gr1.runder[0].rigtigeSlut}/${gr1.runder[0].ialt}`);
ok("begrundelser er med", !!gr1.runder[0].begrundelser.A);
const gr2 = o.grupper.find(g=>g.navn==="Gruppe 2");
ok("gruppe 2: facit vist i runde 2", gr2.runder[1].status==="facit vist", gr2.runder[1].status);
ok("aktivitet paa den enkelte", gr1.medlemmer.find(m=>m.navn==="Anne Jensen").logins===1);
ok("Anne er registreret aktiv", !!gr1.medlemmer.find(m=>m.navn==="Anne Jensen").sidst);
ok("haendelser logget", o.antalHaendelser > 5, o.antalHaendelser+" handlinger");

console.log("\n=== Ny kode og eksport ===");
const { data:nk } = await a("POST",`/admin-api/studerende/${hold.id}/${anne.id}/nykode`);
ok("ny kode udstedt", /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(nk.kode), nk.kode);
ok("gammel kode virker ikke mere", (await klient()("POST","/api/login",{kode:anne.kode})).status === 401);
ok("ny kode virker", (await klient()("POST","/api/login",{kode:nk.kode})).status === 200);
const eks = await a("GET",`/admin-api/hold/${hold.id}/eksport`);
const linjer = eks.data.split("\n");
ok("CSV har overskrift og raekker", linjer.length > 20, linjer.length+" linjer");
ok("CSV har ingen studienummer-kolonne", !linjer[0].includes("studienummer"), linjer[0].slice(0,80));
const gr1linje = linjer.find(l => l.includes("Anne Jensen") && l.includes('";"A";'));
ok("CSV rummer Gruppe 1's svar og facit", !!gr1linje && gr1linje.includes("elektronik"), (gr1linje||"").slice(0,130));
ok("CSV skelner slutresultat fra foerste forsoeg",
   linjer.some(l => l.includes("Anne Jensen") && l.includes('"supermarked";"supermarked";"ja";"nej"')),
   "D blev rigtig i andet forsoeg");

console.log("\n=== Adgangskontrol ===");
ok("studerende kan ikke se overblik", (await s1("GET",`/admin-api/hold/${hold.id}/oversigt`)).status === 401);
ok("studerende kan ikke oprette hold", (await s1("POST","/admin-api/hold",{navn:"Mit eget"})).status === 401);
ok("ulogget kan ikke hente besvarelse", (await klient()("GET","/api/besvarelse/0")).status === 401);

console.log("\n=== Tre undervisere, adskilte hold ===");
const h = klient(), r = klient();
ok("Helles kode virker", (await h("POST","/admin-api/login",{kode:"helle1234"})).data.navn === "Helle");
ok("Rasmus' kode virker", (await r("POST","/admin-api/login",{kode:"rasmus1234"})).data.navn === "Rasmus");
ok("Arnes kode logger ikke ind som Helle", (await klient()("POST","/admin-api/login",{kode:"arne1234"})).data.navn !== "Helle");

ok("Helle ser ingen hold endnu", (await h("GET","/admin-api/hold")).data.hold.length === 0);
const { data:{hold:helleHold} } = await h("POST","/admin-api/hold",{navn:"Helles hold"});
await h("POST",`/admin-api/hold/${helleHold.id}/studerende`,{liste:"Gruppe 1\nGrete Holm"});
ok("Helle ser sit eget hold", (await h("GET","/admin-api/hold")).data.hold.map(x=>x.navn).join() === "Helles hold");
ok("Arne ser kun sit eget", (await a("GET","/admin-api/hold")).data.hold.every(x=>x.navn !== "Helles hold"),
   (await a("GET","/admin-api/hold")).data.hold.map(x=>x.navn).join(", "));
ok("Rasmus ser ingen af delene", (await r("GET","/admin-api/hold")).data.hold.length === 0);

// Id'et står i adressen, så snart man har set holdet én gang. Derfor skal
// hvert endepunkt afvise et fremmed hold, ikke bare listningen.
console.log("  -- Helle forsoeger sig paa Arnes hold (id kendt) --");
ok("overblik afvises", (await h("GET",`/admin-api/hold/${hold.id}/oversigt`)).status === 404);
ok("eksport afvises", (await h("GET",`/admin-api/hold/${hold.id}/eksport`)).status === 404);
ok("oprettelse af studerende afvises", (await h("POST",`/admin-api/hold/${hold.id}/studerende`,{liste:"Gruppe 1\nIndsat Person"})).status === 404);
ok("ny kode til fremmed studerende afvises", (await h("POST",`/admin-api/studerende/${hold.id}/${bo.id}/nykode`)).status === 404);
ok("sletning af fremmed studerende afvises", (await h("DELETE",`/admin-api/studerende/${hold.id}/${bo.id}`)).status === 404);
ok("sletning af fremmed hold afvises", (await h("DELETE",`/admin-api/hold/${hold.id}`)).status === 404);
ok("svaret roeber ikke at holdet findes", (await h("GET",`/admin-api/hold/${hold.id}/oversigt`)).data.fejl ===
   (await h("GET","/admin-api/hold/hold_findesikke/oversigt")).data.fejl);
ok("Arnes hold er uroert", (await a("GET",`/admin-api/hold/${hold.id}/oversigt`)).data.grupper.length === 3);
ok("Arne kan ikke naa Helles hold", (await a("GET",`/admin-api/hold/${helleHold.id}/oversigt`)).status === 404);

// De studerende hører til hvert sit hold, men logger ind samme sted.
const grete = (await h("GET",`/admin-api/hold/${helleHold.id}/oversigt`)).data.grupper[0].medlemmer[0];
const gs = klient();
ok("Helles studerende kan logge ind", (await gs("POST","/api/login",{kode:grete.kode})).status === 200);
ok("og lander paa Helles hold", (await gs("GET","/api/mig")).data.hold === "Helles hold");

await h("DELETE",`/admin-api/hold/${helleHold.id}`);

console.log("\n=== Sletning ved semesterslut ===");
const { data:slettet } = await a("DELETE",`/admin-api/hold/${hold.id}`);
ok("alt slettet", slettet.slettet.studerende===6 && slettet.slettet.grupper===3 && slettet.slettet.besvarelser>0,
   JSON.stringify(slettet.slettet));
ok("koden virker ikke efter sletning", (await klient()("POST","/api/login",{kode:nk.kode})).status === 401);
ok("holdet er vaek", (await a("GET",`/admin-api/hold/${hold.id}/oversigt`)).status === 404);

console.log(fejlede ? `\n${fejlede} FEJLEDE\n` : "\nAlle kontroller bestaaet.\n");
process.exit(fejlede ? 1 : 0);
