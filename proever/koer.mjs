// Starter prøveserveren og kører begge prøvesæt imod den.
import { start } from "./server.mjs";
import { spawn } from "node:child_process";
import path from "node:path";

const server = await start(8787);
const koer = fil =>
  new Promise(klar => spawn(process.execPath, [path.join(import.meta.dirname, fil)], { stdio: "inherit" }).on("exit", klar));

let kode = (await koer("opsaetning.proeve.mjs")) || 0;
kode = (await koer("api.proeve.mjs")) || kode;
if (process.argv.includes("--kun-api")) { server.close(); process.exit(kode); }
kode = (await koer("ui.proeve.mjs")) || kode;
server.close();
process.exit(kode);
