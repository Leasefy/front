// Gráfico de funciones de Google Play (1024 × 500): tiendas/grafico-de-funciones.png
import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const logotipo = readFileSync(join(raiz, 'recursos/logotipo.svg'), 'utf8').replace('<svg ', '<svg class="logo" ')
const base = join(homedir(), 'Library/Caches/ms-playwright')
const carpeta = readdirSync(base).filter((n) => n.startsWith('chromium_headless_shell-')).sort().pop()
const navegador = await chromium.launch({ executablePath: join(base, carpeta, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell') })
const pagina = await navegador.newPage({ viewport: { width: 1024, height: 500 } })
await pagina.setContent(`<!doctype html><html><head><style>
  *{margin:0;box-sizing:border-box}
  body{width:1024px;height:500px;background:#1A40FF;color:#fff;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
       display:flex;flex-direction:column;justify-content:center;padding:0 96px;position:relative;overflow:hidden}
  .logo{width:300px;height:auto;color:#fff;display:block}
  h1{margin-top:40px;font-size:46px;line-height:1.1;font-weight:600;letter-spacing:-.02em;max-width:640px}
  p{margin-top:18px;font-size:22px;line-height:1.4;opacity:.82;max-width:560px}
  .rayas{position:absolute;right:-60px;top:0;bottom:0;width:360px;
         background:repeating-linear-gradient(90deg,rgba(255,255,255,.10) 0 2px,transparent 2px 22px);
         -webkit-mask-image:linear-gradient(90deg,transparent,#000 60%)}
</style></head><body><div class="rayas"></div>${logotipo}
  <h1>Tu arriendo, en tu celular</h1>
  <p>Pagos, contratos y solicitudes para inquilinos,<br>propietarios e inmobiliarias.</p>
</body></html>`)
const destino = join(raiz, 'tiendas/grafico-de-funciones.png')
await pagina.screenshot({ path: destino })
await navegador.close()
execFileSync('magick', [destino, '-alpha', 'off', destino])
console.log(destino)
