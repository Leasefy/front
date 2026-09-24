/**
 * Saca la TABLA DE RUTAS del back y la deja en `src/lib/api/rutas-del-back.json`.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * El 22-09 se midió que el front tenía catorce métodos pidiéndole al back rutas
 * que el back no expone. Ninguno rompía una pantalla —no los llamaba nadie—,
 * pero cada uno era una trampa puesta: el día que alguien cableara el botón,
 * el usuario recibía un 404.
 *
 * Esto NO lo puede vigilar `pnpm api:check`: el OpenAPI generado del back tiene
 * 451 operaciones y el back expone ~1.100 rutas, porque sólo salen las que
 * llevan decoradores de Swagger. Por eso la instantánea se saca del código.
 *
 * ── Cómo se usa ────────────────────────────────────────────────────────────
 *
 *   node scripts/rutas-del-back.mjs [ruta/al/back-erp]
 *
 * Necesita el repo del back al lado (por defecto `../back-erp`), así que es un
 * paso A MANO, como `pnpm api:check`. La instantánea queda commiteada con su
 * fecha, y el guardián `rutas-que-el-back-no-tiene.guardian.test.ts` la lee.
 *
 * 🔴 Una instantánea vieja NO inventa fallos sobre lo que ya andaba: que el
 * back agregue rutas nunca rompe una llamada que ya existía. Lo que sí pide es
 * regenerarla cuando el front estrena una ruta recién hecha en el back.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BACK = resolve(process.argv[2] ?? '../back-erp');
const SALIDA = 'src/lib/api/rutas-del-back.json';

let raiz;
try {
  raiz = join(BACK, 'src');
  statSync(raiz);
} catch {
  console.error(
    `No encuentro el back en ${BACK}.\n` +
      `Pásale la ruta: node scripts/rutas-del-back.mjs /ruta/al/back-erp`,
  );
  process.exit(1);
}

function controladores(d, out = []) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) controladores(p, out);
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

const rutas = new Set();
for (const f of controladores(raiz)) {
  const texto = readFileSync(f, 'utf8');
  // 🔴 Nueve archivos declaran MÁS DE UN `@Controller` (mandato declara tres).
  // Quedarse con el primero le cambia el prefijo a las rutas de los otros y las
  // hace pasar por inexistentes: se parte el archivo por cada `@Controller`.
  const marcas = [...texto.matchAll(/@Controller\(\s*(?:['"`]([^'"`]*)['"`])?/g)];
  for (let i = 0; i < marcas.length; i++) {
    const prefijo = marcas[i][1] ?? '';
    const trozo = texto.slice(
      marcas[i].index,
      i + 1 < marcas.length ? marcas[i + 1].index : texto.length,
    );
    for (const m of trozo.matchAll(
      /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g,
    )) {
      const sub = m[2] ?? '';
      const camino = ('/' + prefijo + (sub ? '/' + sub : '')).replace(/\/+/g, '/');
      rutas.add(`${m[1].toUpperCase()} ${camino}`);
    }
  }
}

const lista = [...rutas].sort();
writeFileSync(
  SALIDA,
  JSON.stringify(
    {
      _comentario:
        'Generado por scripts/rutas-del-back.mjs. No editar a mano: regenerar.',
      sacadaDe: 'back-erp/src/**/*.controller.ts',
      cuando: new Date().toISOString().slice(0, 10),
      cuantas: lista.length,
      rutas: lista,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${lista.length} rutas → ${SALIDA}`);
