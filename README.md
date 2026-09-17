# Gæt forretningsmodellen

Interaktiv gruppeøvelse til Markedsføringsøkonom (AK), Sprint 2,
Forretningsforståelse (NF1). De studerende får fem anonyme nøgletalsprofiler
og fem forretningsmodeller og skal parre dem – alene ud fra tallene. Øvelsen
træner bevægelsen fra tal til model: Hvad fortæller et nøgletal om, hvordan
virksomheden tjener sine penge?

Øvelsen består af to runder. Runde 1 stiller modeller fra vidt forskellige
brancher op mod hinanden, runde 2 er sværere og bruger modeller, der ligner
hinanden (handel og mode).

## Sådan kører øvelsen

1. Grupperne diskuterer hver profil. Et klik på et nøgletals navn folder
   definitionen ud.
2. De vælger en model og skriver en begrundelse, der peger på konkrete
   nøgletal. Der kræves mindst 25 tegn, og hver model kan kun bruges én gang.
3. De tjekker svaret. De profiler, der ikke passer, får de ét forsøg mere til
   – her kan de bruge hintet, som fremhæver de afslørende celler i tabellen.
4. Efter andet forsøg vises facit og forklaringer, og gruppen besvarer tre
   refleksionsspørgsmål og kopierer besvarelsen til aflevering.

Undervisersiden har to knapper nederst: `Start runden forfra` (kræver to klik)
og `Underviser: vis facit uden at tjekke`. Svarene gemmes i browserens
localStorage under nøglen `gaet-forretningsmodellen-v1` – de forlader aldrig
maskinen, og der er intet login.

## Sådan køres den lokalt

Siden er ren HTML, CSS og JavaScript uden byggetrin og uden afhængigheder.
Åbn `index.html` direkte i en browser, eller servér mappen:

```
python3 -m http.server 8000
```

## Filer

| Fil | Indhold |
| --- | --- |
| `index.html` | Sidens struktur og tekst |
| `assets/styles.css` | Styling, inkl. lyst og mørkt tema |
| `assets/data.js` | Øvelsens indhold: runder, profiler, nøgletal, spørgsmål |
| `assets/app.js` | Logik: tabel, kort, tjek, hint, refleksion, kopiering |

## Sådan redigeres indholdet

Alt fagligt indhold ligger i `assets/data.js`, så en ny runde eller en rettet
profil kræver ikke ændringer i logikken.

En profil angives med de syv grundtal, og resten beregnes:

```js
{id:"A", model:"elektronik", v:{bm:17, og:2.8, aoh:3.4, al:6, lager:9, deb:90, sol:28},
 spor:["bm","aoh","deb"], forklaring:"…", forveksling:"…"}
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

`model` skal matche et `id` i rundens `modeller`-liste, og `spor` er de
nøgletal, hintet fremhæver.

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

## Baggrund

Første version blev udviklet i en Claude-chat og ligger som den var i den
første commit. Alt efterfølgende arbejde sker her i repoet.
