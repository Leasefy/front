/**
 * api-gen-back.mjs — genera `src/lib/api/generated/back.ts` desde el OpenAPI
 * del back principal.
 *
 * Uso: pnpm api:gen:back
 *
 * ── Por qué no alcanza con `openapi-typescript spec -o salida` ──────────────
 *
 * El spec del back trae `operationId` repetidos (NestJS los deriva de
 * `Clase_metodo`, y varios controllers están montados en su ruta pública Y en
 * `/api/v1/admin/*`). Eso genera claves duplicadas dentro de `interface
 * operations` y `tsc` corta el CI con TS2300. Ver `openapi-dedupe.mjs` para el
 * detalle y la regla de desambiguación.
 *
 * ── Qué se guarda y qué no ──────────────────────────────────────────────────
 *
 * El snapshot (`scripts/back-openapi.json`) se guarda CRUDO, tal cual lo manda
 * el back. La desambiguación vive sólo en memoria, camino al codegen. Si se
 * guardara ya desduplicado, el snapshot dejaría de ser evidencia de lo que el
 * back publica de verdad y el aviso de abajo no volvería a aparecer nunca —
 * justo cuando su razón de ser es que la colisión se arregle en el back.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { dedupeOperationIds } from './openapi-dedupe.mjs'

const ORIGEN = path.resolve('../back/openapi.json')
const SNAPSHOT = path.resolve('scripts/back-openapi.json')
const SALIDA = path.resolve('src/lib/api/generated/back.ts')

// Paso 1 — refrescar el snapshot desde el repo del back si está al lado.
// Si no está (CI, clone suelto), se usa el snapshot commiteado: mismo criterio
// de fallback que `api-gen.sh` para el agente.
let fuente = 'snapshot'
if (fs.existsSync(ORIGEN)) {
  fs.copyFileSync(ORIGEN, SNAPSHOT)
  fuente = '../back/openapi.json'
} else if (!fs.existsSync(SNAPSHOT)) {
  console.error('ERROR: no está ../back/openapi.json ni el snapshot scripts/back-openapi.json.')
  console.error('Cloná el back al lado del front, o recuperá el snapshot del repo.')
  process.exit(1)
}

// Paso 2 — desambiguar los operationId colisionados, en memoria.
const spec = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
const { spec: specLimpio, renamed } = dedupeOperationIds(spec)

if (renamed.length > 0) {
  console.warn('')
  console.warn(`WARNING: el back publica ${renamed.length} operationId colisionados.`)
  console.warn('Se desambiguaron para que el codegen compile, pero el arreglo de raíz')
  console.warn('es un operationId explícito en los controllers del back:')
  for (const r of renamed) {
    console.warn(`  - ${r.operationId}  (${r.method.toUpperCase()} ${r.path})  →  ${r.nuevo}`)
  }
  console.warn('')
}

// Paso 3 — codegen desde un temporal. `openapi-typescript` lee de un archivo,
// así que el spec desambiguado necesita existir en disco: va al temp del
// sistema, nunca al repo, para que no se commitee por accidente.
//
// El CLI se invoca por su entrypoint JS con el mismo node que corre esto, y no
// por el shim de `node_modules/.bin`: en Windows ese shim es un `.cmd` que
// `execFileSync` no sabe ejecutar (falla con ENOENT). Resolverlo por
// `require.resolve` además lo encuentra igual bajo el layout de pnpm.
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'leasefy-back-')), 'openapi.json')
fs.writeFileSync(tmp, JSON.stringify(specLimpio))

fs.mkdirSync(path.dirname(SALIDA), { recursive: true })
const require = createRequire(import.meta.url)
const cli = path.join(
  path.dirname(require.resolve('openapi-typescript/package.json')),
  'bin',
  'cli.js',
)

try {
  execFileSync(process.execPath, [cli, tmp, '-o', SALIDA], { stdio: 'inherit' })
} finally {
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true })
}

console.log(`api:gen:back complete — back.ts actualizado (fuente: ${fuente})`)
