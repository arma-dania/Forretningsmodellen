# Gæt forretningsmodellen

Interaktiv gruppeøvelse til Markedsføringsøkonom (AK), Sprint 2,
Forretningsforståelse (NF1). De studerende får fem anonyme nøgletalsprofiler
og fem forretningsmodeller og skal parre dem – alene ud fra tallene. Øvelsen
træner bevægelsen fra tal til model: Hvad fortæller et nøgletal om, hvordan
virksomheden tjener sine penge?

Øvelsen består af to runder. Runde 1 stiller modeller fra vidt forskellige
brancher op mod hinanden, runde 2 er sværere og bruger modeller, der ligner
hinanden (handel og mode).

De studerende logger ind med en personlig adgangskode, arbejder i grupper på
én fælles besvarelse, og underviseren kan følge både aktiviteten hos den
enkelte og gruppernes resultater.

Der er tre undervisere – Arne, Helle og Rasmus – med hver sin kode. Et hold
hører til den underviser, der oprettede det, og kan kun ses af den underviser.

## Sådan kører øvelsen i klassen

**Før timen.** Log ind på `/admin.html` med din egen underviserkode. Opret et hold, og
indsæt listen over studerende – ét navn pr. linje, eventuelt efterfulgt af
gruppe, eller med `Gruppe 2` som overskrift over dem, der hører sammen. Du får en kode pr. studerende, som du udleverer
– fx gennem Moodle eller på print (siden kan udskrives, og kun kodelisten
kommer med).

**I timen.** De studerende går til forsiden, logger ind med koden og lander
direkte i deres gruppes besvarelse.

1. Grupperne diskuterer hver profil. Et klik på et nøgletals navn folder
   definitionen ud.
2. De vælger en model og skriver en begrundelse, der peger på konkrete
   nøgletal. Der kræves mindst 25 tegn, og hver model kan kun bruges én gang.
3. De tjekker svaret. De profiler, der ikke passer, får de ét forsøg mere til
   – her kan de bruge hintet, som fremhæver de afslørende celler i tabellen.
4. Efter andet forsøg vises facit og forklaringer, og gruppen besvarer tre
   refleksionsspørgsmål og kopierer besvarelsen til aflevering.

Besvarelsen ligger hos gruppen, ikke i browseren, så de kan arbejde fra hver
sin skærm og fortsætte i næste lektion. Gemmer to gruppemedlemmer forskelligt
samtidig, får den sidste besked og henter gruppens udgave ind i stedet for at
overskrive den.

**Efter timen.** Under `Overblik` ser du pr. gruppe, hvor mange profiler der
sad i første forsøg, hvad det endte med, hvor mange hint der blev brugt, og
hvad grupperne skrev. Under `Aktivitet` ser du, hvem der har været inde og
hvornår. `Hent resultater som CSV` giver en fil, du kan åbne i Excel.

## Sådan sætter du det op

### 1. Kobl Netlify til repoet
1. Log ind på netlify.com → **Add new site → Import an existing project**.
2. Vælg GitHub og dette repository.
3. Byggeindstillingerne læses fra `netlify.toml`. Der er intet byggetrin.
   Tryk **Deploy**.

### 2. Læg koderne og hemmeligheden ind
I Netlify: **Site configuration → Environment variables**.

| Variabel | Værdi |
| --- | --- |
| `UNDERVISER_ARNE` | Arnes kode. Vælg en lang og tilfældig. |
| `UNDERVISER_HELLE` | Helles kode. |
| `UNDERVISER_RASMUS` | Rasmus' kode. |
| `SESSION_HEMMELIGHED` | En tilfældig streng på mindst 32 tegn. Den underskriver login-cookien og skal ikke deles med nogen. |

Hver underviser har sin egen miljøvariabel, så en kode kan skiftes for én
underviser uden at røre de andre. Er en kode ikke sat, kan den underviser
ikke logge ind; de øvrige er upåvirkede.

Alle fire værdier skal være tilfældige – ikke noget, man finder på. Den
nemmeste måde kræver ikke, at der er installeret noget:

1. Åbn Chrome eller Edge på en vilkårlig side. (I Safari skal
   udviklermenuen slås til først, så spring den over her.)
2. Højreklik et tomt sted på siden → **Undersøg** (*Inspect*), og vælg
   fanen **Console**.
3. Skriv `crypto.randomUUID()` og tryk Enter. Du får en linje som
   `a19240dc-e045-4ba7-83ed-da6dc764fb0a`.
4. Tryk pil-op og Enter tre gange mere, så du har fire forskellige værdier
   – én til hver variabel.

Værdien er 36 tegn og tilfældig nok til både underviserkoderne og
sessionshemmeligheden. Har du en adgangskodemanager, kan dens generator
bruges i stedet – og den er samtidig et godt sted at lægge de tre
underviserkoder, så de kan udleveres uden at flyde rundt i en mail.

Er Node.js installeret, kan værdierne også laves i en terminal:

```
node -e "console.log(require('crypto').randomUUID())"
```

Hver variabel har et **scope** i Netlify. Det skal omfatte **Functions** –
ellers kan API'et ikke se den, uanset at den står i listen. Vælges "All
scopes", er det i orden. Variablerne må gerne markeres som *Contains secret
values*; det skjuler dem blot i brugerfladen bagefter.

Gå derefter til **Deploys → Trigger deploy → Deploy site**. Ændringer i
miljøvariabler slår først igennem ved en ny deploy.

### Hvis underviserlogin ikke virker
Beskeden på skærmen siger, hvad der er galt:

| Besked | Betydning |
| --- | --- |
| **Forkert kode.** | Variablerne når frem. Koden passer bare ikke – brug værdien fra `UNDERVISER_ARNE` i Netlify, ikke den lokale prøvekode `arne1234`. |
| **Ingen underviserkoder er sat …** | Variablerne når ikke ud til funktionerne. Tjek scope og deploy igen. |
| **SESSION_HEMMELIGHED er ikke sat …** | Samme, for den variabel. |

`arne1234`, `helle1234` og `rasmus1234` virker kun på `npm run server` på din
egen maskine. De findes ikke på det deployede site.

### 3. Slå Netlify Blobs til
Hold, studerende, besvarelser og aktivitet gemmes i Netlify Blobs, som følger
med siden. Er det ikke slået til på din konto, siger første kald til, og det
tændes under **Site configuration → Blobs**.

## Behandling af personoplysninger

Øvelsen gemmer de studerendes navne, deres besvarelser og hvornår de har
været aktive. Det er personoplysninger, og akademiet – ikke den enkelte
underviser – er dataansvarlig. Inden systemet bruges på rigtige hold, bør det
afklares med jeres IT eller DPO, om en selvbygget løsning på en privat
Netlify-konto må bruges, eller om der skal en databehandleraftale til.

Tre ting, der begrænser omfanget:

- **Der gemmes ingen studienumre.** Systemet kender kun et navn og en gruppe.
  Står der et nummer forrest på en linje i listen, bliver det kasseret ved
  oprettelsen, så en gammel liste ikke kan trække numre med ind. Navnet
  behøver ikke være det fulde: fornavn og forbogstav er nok til, at gruppen
  kan se, hvem der er hvem, og til at du kan følge aktiviteten.
- **Slet holdet, når semestret er slut.** Knappen `Slet holdet og alle data`
  fjerner studerende, grupper, besvarelser og aktivitetslog i ét greb og
  kræver, at du skriver holdets navn.
- **Adgangskoderne er ikke adgangskoder.** De gælder kun denne øvelse, kan
  ikke bruges andre steder og udskiftes frit. Derfor gemmes de, så du kan
  udskrive listen igen – i modsætning til en rigtig adgangskode, der aldrig
  bør kunne læses tilbage.

Det bedste alternativ er stadig at lægge øvelsen ind i Moodle som et
LTI-værktøj: så bruger de studerende deres eksisterende konto, resultaterne
kan lande i karakterbogen, og data bliver i et system, der allerede er
godkendt. Koden er forberedt til det, se nedenfor.

## Tre undervisere

Underviserne står i `netlify/functions/lib/undervisere.mjs`. Skal der en fjerde
til, tilføjes en linje der og en miljøvariabel i Netlify – der er ikke noget
brugerregister at vedligeholde.

Adskillelsen håndhæves på serveren, ikke på skærmen. Et holds id står i
adressen, så snart man har set holdet én gang, så hvert endepunkt om et hold
– overblik, eksport, oprettelse af studerende, ny kode, sletning – går gennem
det samme ejertjek. Et fremmed hold svares som “findes ikke” og ikke “ingen
adgang”, så svaret ikke bekræfter, at holdet findes.

De studerende logger ind samme sted uanset underviser; koden afgør, hvilket
hold og hvilken gruppe de hører til.

Et hold kan kun have én underviser. Skal to undervisere dele et hold, er det
ikke bygget – så skal holdet oprettes to gange, eller `underviser` på holdet
skal laves om til en liste.

## Filer

| Fil | Indhold |
| --- | --- |
| `public/index.html` | Selve øvelsen |
| `public/login.html` | De studerendes login |
| `public/admin.html` | Underviserens modul |
| `public/assets/data.js` | Øvelsens indhold: runder, profiler, nøgletal, spørgsmål |
| `public/assets/app.js` | Øvelsens logik |
| `public/assets/api.js` | Klientens forbindelse til serveren |
| `public/assets/admin.js` | Admin-modulets logik |
| `public/assets/styles.css` | Styling, inkl. lyst og mørkt tema |
| `netlify/functions/api.mjs` | De studerendes API |
| `netlify/functions/admin.mjs` | Underviserens API |
| `netlify/functions/lib/facit.mjs` | **Facit og forklaringer** |
| `netlify/functions/lib/auth.mjs` | Login: koder, sessioner |
| `netlify/functions/lib/undervisere.mjs` | Underviserne og deres miljøvariabler |
| `netlify/functions/lib/lager.mjs` | Lagring i Netlify Blobs |
| `netlify/functions/lib/svar.mjs` | Ruter og svarhjælpere |
| `proever/` | Prøver, der kan køres lokalt |

`public/` og `netlify/` holdes adskilt med vilje: alt under `public/` lægges
ud som statiske filer, og facit ligger i `netlify/`, hvor det ikke kan hentes
af en browser. De delte filer ligger i `lib/`, fordi hver fil i selve
`functions`-mappen bliver til sit eget endepunkt – en undermappe gør ikke.

## Sådan redigeres indholdet

Indholdet ligger to steder, og de skal følges ad:

- **`public/assets/data.js`** – profilernes nøgletal, modellernes navne og
  beskrivelser, nøgletalsdefinitionerne og refleksionsspørgsmålene.
- **`netlify/functions/lib/facit.mjs`** – hvilken model der er den rigtige til
  hver profil, og forklaringerne.

Delingen er ikke tilfældig. `data.js` sendes til browseren, og de studerende
kan læse den i kildekoden; lå facit der, kunne svarene aflæses på forhånd, og
så var der ikke meget ved at følge resultaterne. Serveren retter svarene og
udleverer først forklaringen, når runden er afgjort.

En profil angives med de syv grundtal, og resten beregnes:

```js
{id:"A", v:{bm:17, og:2.8, aoh:3.4, al:6, lager:9, deb:90, sol:28}, spor:["bm","aoh","deb"]}
```

| Felt | Betydning |
| --- | --- |
| `bm` | Bruttomargin i procent |
| `og` | Overskudsgrad i procent |
| `aoh` | Aktivernes omsætningshastighed (gange pr. år) |
| `al` | Anlægsgrad i procent |
| `lager` | Varelagerets omsætningshastighed – `null`, hvis der intet lager er |
| `deb` | Varedebitorernes omsætningshastighed |
| `sol` | Soliditetsgrad i procent |
| `spor` | De nøgletal, hintet fremhæver. Afslører ikke svaret |

Afkastningsgrad, driftsmæssig gearing og sikkerhedsmargin beregnes af
`beregn()` i `app.js` ud fra de syv tal:

- Afkastningsgrad = overskudsgrad × aktivernes omsætningshastighed
- Driftsmæssig gearing = (bruttomargin − overskudsgrad) / (100 − overskudsgrad)
- Sikkerhedsmargin = overskudsgrad / bruttomargin

De to sidste bygger på den forenkling, at alt ud over vareforbruget er
kapacitetsomkostninger. Det står også i fodnoten under tabellen.

Tallene er stiliserede og konstrueret, så de hænger sammen internt og ligner
typiske profiler for modellerne. De er altså ikke hentet fra konkrete
regnskaber.

## Sådan afprøves det lokalt

`proever/` indeholder en server, der kører de rigtige funktionsfiler med et
lager i hukommelsen i stedet for Netlify Blobs. Der kræves hverken deploy,
Netlify-konto eller rigtige data.

```
npm install
npm run proeve       # hele forløbet: API og browser
npm run proeve:api   # kun API, uden browser (hurtig)
npm run server       # kun serveren, på http://localhost:8787
```

Med `npm run server` kan du klikke rundt i det hele lokalt. Underviserkoderne
er `arne1234`, `helle1234` og `rasmus1234`.

Prøverne dækker blandt andet, at facit ikke kan hentes ud før tid, at en låst
profil ikke kan ændres, at gruppen deler besvarelse uden at overskrive
hinanden, at sletning af et hold fjerner alt, og at én underviser ikke kan nå
en kollegas hold – heller ikke ved at kende holdets id.

## Skift til login gennem Moodle

Login er holdt adskilt fra resten, så det kan skiftes uden at røre øvelsen,
admin-modulet eller de data, der allerede er indsamlet. Resten af koden
spørger kun "hvem er den her bruger?" gennem to steder:

- `netlify/functions/lib/auth.mjs` – `hentSession()` på serveren
- `public/assets/api.js` – klientens kald

Skal øvelsen senere ligge i Moodle som LTI-værktøj, er det de to filer, der
skiftes ud. Datamodellen kender ikke adgangskoder: en studerende er et id, et
navn og en gruppe, og det gælder også, når brugeren kommer fra Moodle.

## Baggrund

Første version blev udviklet i en Claude-chat og ligger som den var i den
første commit. Alt efterfølgende arbejde sker her i repoet.
