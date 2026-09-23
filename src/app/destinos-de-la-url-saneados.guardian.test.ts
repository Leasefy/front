/**
 * 🔴 UN DESTINO QUE VIENE DE LA URL SE SANEA ANTES DE NAVEGAR.
 *
 * Auditoría de seguridad del 23-09: `/admin/auth/callback` hacía
 * `window.location.href = sp.get('next')` y `/pse-mock` hacía
 * `router.push(searchParams.get('returnUrl'))`. Cualquiera de los dos convertía
 * un enlace a leasefy.co en una redirección a otro sitio —o, con
 * `javascript:…`, en código del atacante corriendo en nuestro origen con la
 * sesión de quien hiciera clic—.
 *
 * La guarda existe desde antes (`sanitizeReturnUrl`, y `rutaDeRegreso` para
 * los `?volver=` del panel); lo que faltaba era usarla SIEMPRE. Esta prueba no
 * mira si cada uso está bien, mira algo más tosco y más difícil de burlar: un
 * archivo que LEE un parámetro de destino (`returnUrl`, `next`, `redirect`,
 * `redirectTo`, `returnTo`, `callbackUrl`) tiene que llamar a una de las dos
 * guardas. Leerlo sin sanear en ningún lado es exactamente el defecto de ese
 * día.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAICES = ['src/app', 'src/components', 'src/lib'];

const LEE_UN_DESTINO =
  /\.get\(\s*['"](returnUrl|next|redirect|redirectTo|returnTo|callbackUrl)['"]\s*\)/;
const SANEA = /\b(sanitizeReturnUrl|rutaDeRegreso)\(/;

function archivos(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe('destinos que vienen de la URL', () => {
  it('todo archivo que lee returnUrl/next/redirect… lo pasa por una guarda', () => {
    const sinGuarda = RAICES.flatMap((r) => archivos(r)).filter((p) => {
      const codigo = readFileSync(p, 'utf8');
      return LEE_UN_DESTINO.test(codigo) && !SANEA.test(codigo);
    });
    expect(sinGuarda).toEqual([]);
  });
});
