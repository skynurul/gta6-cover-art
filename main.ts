// Vice Cover Studio entrypoint (Node 22, standard library only).
//
// This program hands the app in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json with
// the vendored make.fun dossier library. The output directory is treated
// as a mount point in the grader, so this program never removes it: it
// creates it if missing and clears only the files inside it before
// copying, so a stale file from an earlier run can never leak into an
// entry. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function clearInside(dir) {
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

mkdirSync(outputDir, { recursive: true });
clearInside(outputDir);
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps for this bounty: the text cap shapes the dossier's
// bytes, and the rest refuse an entry the scorer would refuse anyway
// (more than 4 screenshots or one over 256 KiB; app/ over 993 files or
// 48 MiB in all; an app/ path over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
