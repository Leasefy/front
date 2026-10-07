import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 PG-R06 (QA de Pagos, decisión de Nico 03-10-2026): anular un recibo de
 * caja es SÓLO del administrador (el back ya responde 403
 * `SOLO_UN_ADMINISTRADOR_ANULA`). El estado de cuenta lo cumplía
 * (`ProveedorDeAnularRecibo habilitado={isAdmin}`); el cajón del cobro le
 * ofrecía «Anular» al contador. Un botón que siempre da 403 no se ofrece.
 */
const fuente = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8');

describe('anular un recibo: sólo el administrador ve el botón', () => {
  it('el cajón del cobro sólo pasa `onAnular` a un administrador', () => {
    const s = fuente('src/components/inmobiliaria/CobroDetail.tsx');
    expect(s).toMatch(/const puedeAnularRecibos = usePermissionsContextSafe\(\)\?\.isAdmin \?\? false/);
    expect(s).toContain('onAnular={puedeAnularRecibos ? anularRecibo : undefined}');
    expect(s).not.toMatch(/onAnular=\{anularRecibo\}/);
  });

  it('el estado de cuenta del inquilino lo sigue condicionando al administrador', () => {
    const s = fuente('src/app/panel/inmobiliaria/estado-de-cuenta/inquilino/[id]/page.tsx');
    expect(s).toContain('<ProveedorDeAnularRecibo habilitado={isAdmin}');
  });
});
