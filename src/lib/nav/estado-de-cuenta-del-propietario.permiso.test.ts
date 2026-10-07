import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 PG-R08 (QA de Pagos, 03-10-2026): el estado de cuenta del PROPIETARIO
 * pedía `cobros` en la pantalla y el back `dispersiones:view`
 * (`GET /inmobiliaria/estado-de-cuenta/propietario/:id`, «es la plata que se le
 * gira a él»). El visor y el auxiliar de cartera entraban y recibían un 403
 * («No pudimos…» + «Reintentar»); quien tiene dispersiones y no cobros no
 * entraba. La pantalla pide lo mismo que el back.
 */
describe('el estado de cuenta del propietario pide el permiso del back', () => {
  it('PageGuard con `dispersiones`, no con `cobros`', () => {
    const pagina = readFileSync(
      join(process.cwd(), 'src/app/panel/inmobiliaria/estado-de-cuenta/propietario/[id]/page.tsx'),
      'utf8',
    );
    const guardas = [...pagina.matchAll(/<PageGuard\b([^>]*)>/g)].map((m) => /\bmodule="([^"]+)"/.exec(m[1]!)?.[1]);
    expect(guardas[0]).toBe('dispersiones');
  });
});
