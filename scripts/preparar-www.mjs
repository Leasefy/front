// Arma www/ con la URL de Leasefy a la que apunta esta compilación.
// Lo corre `npm run sync` antes de `cap sync` (LEASEFY_URL elige la URL).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = (process.env.LEASEFY_URL ?? 'https://leasefy.co').replace(/\/$/, '')
if (!/^https?:\/\/[^\s"'<>]+$/.test(url)) {
  console.error(`LEASEFY_URL no es una dirección válida: ${url}`)
  process.exit(1)
}

mkdirSync(join(raiz, 'www'), { recursive: true })
for (const nombre of ['index.html', 'sin-conexion.html']) {
  const plantilla = readFileSync(join(raiz, 'plantillas', nombre), 'utf8')
  writeFileSync(join(raiz, 'www', nombre), plantilla.replaceAll('__URL_DE_LEASEFY__', url))
}
console.log(`www/ lista para ${url}`)
