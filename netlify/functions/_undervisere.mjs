// Underviserne på siden.
//
// Hver underviser har sin egen kode i sin egen miljøvariabel, så en kode kan
// skiftes for én underviser uden at røre de andre. Skal der en fjerde til,
// tilføjes en linje her og en miljøvariabel i Netlify – der er ikke noget
// brugerregister at vedligeholde.
//
// Et hold hører til den underviser, der oprettede det, og kan kun ses af
// den underviser. Adskillelsen håndhæves i admin.mjs på hvert endepunkt.

export const UNDERVISERE = [
  { id: "arne", navn: "Arne", miljoenoegle: "UNDERVISER_ARNE" },
  { id: "helle", navn: "Helle", miljoenoegle: "UNDERVISER_HELLE" },
  { id: "rasmus", navn: "Rasmus", miljoenoegle: "UNDERVISER_RASMUS" },
];

export const findUnderviser = id => UNDERVISERE.find(u => u.id === id) ?? null;
