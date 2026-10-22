// Genera el ícono y la pantalla de inicio de iOS y Android a partir del símbolo de
// Leasefy (recursos/simbolo.svg, el mismo trazo del front: leasefy-logo-paths.ts).
// Uso: node scripts/generar-iconos.mjs
// Renderiza con el Chromium que Playwright ya tiene en caché (nítido a cualquier tamaño).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const AZUL = '#1A40FF'
const AZUL_EN_OSCURO = '#5B78FF'
const FONDO_OSCURO = '#0F0F0D'

// Caja real del trazo dentro de su viewBox (-4 68 250 140): x 0–241, y 71–186.
const CAJA = { x: 0, y: 71, ancho: 241, alto: 115 }
const trazo = readFileSync(join(raiz, 'recursos', 'simbolo.svg'), 'utf8').match(/ d="([^"]+)"/)[1]

/** SVG cuadrado con el símbolo centrado; `proporcion` = ancho del símbolo / lado. */
function lienzo({ lado, fondo, color, proporcion, redondo = false }) {
  const escala = (lado * proporcion) / CAJA.ancho
  const tx = lado / 2 - (CAJA.x + CAJA.ancho / 2) * escala
  const ty = lado / 2 - (CAJA.y + CAJA.alto / 2) * escala
  const fondoSvg = !fondo
    ? ''
    : redondo
      ? `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${fondo}"/>`
      : `<rect width="${lado}" height="${lado}" fill="${fondo}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">${fondoSvg}<path transform="translate(${tx} ${ty}) scale(${escala})" fill="${color}" d="${trazo}"/></svg>`
}

function chromiumEnCache() {
  const base = join(homedir(), 'Library/Caches/ms-playwright')
  const carpeta = readdirSync(base).filter((n) => n.startsWith('chromium_headless_shell-')).sort().pop()
  if (!carpeta) throw new Error('No hay Chromium de Playwright en caché (npx playwright install chromium).')
  const ejecutable = join(base, carpeta, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell')
  if (!existsSync(ejecutable)) throw new Error(`No se encontró ${ejecutable}`)
  return ejecutable
}

const navegador = await chromium.launch({ executablePath: chromiumEnCache() })
const pagina = await navegador.newPage({ deviceScaleFactor: 1 })

async function png(svg, lado, destino, { sinAlfa = false } = {}) {
  mkdirSync(dirname(destino), { recursive: true })
  await pagina.setViewportSize({ width: lado, height: lado })
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await pagina.locator('svg').screenshot({ path: destino, omitBackground: true })
  if (sinAlfa) {
    // La App Store rechaza un ícono con canal alfa.
    execFileSync('magick', [destino, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', destino])
  }
  console.log('  ', destino.replace(raiz + '/', ''))
}

// ── iOS ────────────────────────────────────────────────────────────────────
const ios = join(raiz, 'ios/App/App/Assets.xcassets')
await png(lienzo({ lado: 1024, fondo: AZUL, color: '#FFFFFF', proporcion: 0.6 }), 1024, join(ios, 'AppIcon.appiconset/icono.png'), { sinAlfa: true })
await png(lienzo({ lado: 1024, fondo: null, color: AZUL_EN_OSCURO, proporcion: 0.6 }), 1024, join(ios, 'AppIcon.appiconset/icono-oscuro.png'))
await png(lienzo({ lado: 1024, fondo: null, color: '#FFFFFF', proporcion: 0.6 }), 1024, join(ios, 'AppIcon.appiconset/icono-tintado.png'))
writeFileSync(join(ios, 'AppIcon.appiconset/Contents.json'), JSON.stringify({
  images: [
    { filename: 'icono.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], filename: 'icono-oscuro.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    { appearances: [{ appearance: 'luminosity', value: 'tinted' }], filename: 'icono-tintado.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
  ],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n')

await png(lienzo({ lado: 2732, fondo: '#FFFFFF', color: AZUL, proporcion: 0.095 }), 2732, join(ios, 'Splash.imageset/inicio.png'), { sinAlfa: true })
await png(lienzo({ lado: 2732, fondo: FONDO_OSCURO, color: AZUL_EN_OSCURO, proporcion: 0.095 }), 2732, join(ios, 'Splash.imageset/inicio-oscuro.png'), { sinAlfa: true })
writeFileSync(join(ios, 'Splash.imageset/Contents.json'), JSON.stringify({
  images: [
    { filename: 'inicio.png', idiom: 'universal' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], filename: 'inicio-oscuro.png', idiom: 'universal' },
  ],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n')

// ── Android ────────────────────────────────────────────────────────────────
// Íconos viejos (Android 7: API 24–25). Desde Android 8 manda el adaptable en XML.
const res = join(raiz, 'android/app/src/main/res')
const densidades = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [nombre, factor] of Object.entries(densidades)) {
  const lado = Math.round(48 * factor)
  await png(lienzo({ lado, fondo: AZUL, color: '#FFFFFF', proporcion: 0.6 }), lado, join(res, `mipmap-${nombre}/ic_launcher.png`))
  await png(lienzo({ lado, fondo: AZUL, color: '#FFFFFF', proporcion: 0.56, redondo: true }), lado, join(res, `mipmap-${nombre}/ic_launcher_round.png`))
  // Fondo del arranque en Android 7–11 (en 12+ el sistema dibuja el ícono).
  const ancho = Math.round(320 * factor)
  await png(lienzo({ lado: ancho, fondo: '#FFFFFF', color: AZUL, proporcion: 0.3 }), ancho, join(res, `drawable-${nombre}/splash.png`), { sinAlfa: true })
}

await navegador.close()
console.log('Íconos e inicio listos.')
