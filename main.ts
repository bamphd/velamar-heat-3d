// VELAMAR 3D — entrypoint: copies game/ and screenshots/ to the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Runs on Node 22 with no install: `MAKEFUN_OUTPUT_DIR=out node main.ts`
// (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output).
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`VELAMAR 3D handed in: ${outDir} (dossier ${dossier.length} bytes)`);
