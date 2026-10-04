/**
 * 🔴 Guardián (integración de `centavos`, 04-10-2026): los formatos de plata no
 * arrastran la red.
 *
 * `lib/format.ts` → `lib/plata/escribir-plata.ts` → `lib/plata/con-centavos.ts`
 * los lee también código del SERVIDOR (p. ej. `app/api/inmuebles/desde-enlace`,
 * por `lib/types/inmobiliaria.ts`). Cuando `con-centavos.ts` cargaba el cliente
 * HTTP —aunque fuera con `import()`—, el servidor arrastraba `lib/api/client.ts`
 * y un gancho de React, y `next build` fallaba. La llamada a `GET /config/plata`
 * vive en `refrescar-config-de-plata.ts`, que sólo usan los componentes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUROS = [
  'src/lib/format.ts',
  'src/lib/plata/escribir-plata.ts',
  'src/lib/plata/con-centavos.ts',
  'src/lib/plata/plata.ts',
  'src/lib/plata/centavos-guardados.ts',
];

/** Lo que el módulo importa (estático o con `import()`), sin los comentarios. */
function importsDe(ruta: string): string[] {
  const texto = readFileSync(join(process.cwd(), ruta), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const estaticos = [...texto.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const dinamicos = [...texto.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  return [...estaticos, ...dinamicos];
}

describe('los formatos de plata no arrastran la red', () => {
  it.each(PUROS)('%s no importa el cliente HTTP ni React', (ruta) => {
    const malos = importsDe(ruta).filter(
      (i) => i.includes('/lib/api') || i.endsWith('/client') || i === 'react' || i.includes('/conexion/'),
    );
    expect(malos).toEqual([]);
  });
});
