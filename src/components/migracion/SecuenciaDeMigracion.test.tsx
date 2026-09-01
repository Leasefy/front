/**
 * SecuenciaDeMigracion.test.tsx — el progreso de los cinco pasos.
 *
 * Lo que se prueba no es que pinte cinco tarjetas: es **qué afirma cuando NO
 * sabe**. La pantalla mide leyendo cuatro endpoints que viven detrás de tres
 * permisos distintos, así que un CONTADOR recibe un 403 en alguno de ellos. Un
 * «0 migrados» dibujado sobre un 403 le dice a alguien que no migró nada
 * cuando en realidad migró 1.200 y no tiene permiso de verlo — y lo manda a
 * hacerlo de nuevo.
 *
 * También se congela acá que los pasos 4 y 5 NO tienen botón: un `<button
 * disabled>` invita a clickearlo y no explica nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}::${JSON.stringify(params)}` : k,
    locale: 'es',
  }),
}));

const { tercerosMock, inmueblesMock, contratosMock } = vi.hoisted(() => ({
  tercerosMock: { lotesAbiertos: vi.fn(), filas: vi.fn() },
  inmueblesMock: { lotesAbiertos: vi.fn() },
  contratosMock: { lotesAbiertos: vi.fn() },
}));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/migracion-terceros.service')
  >('@/lib/api/migracion-terceros.service');
  return { ...actual, migracionTercerosApi: tercerosMock };
});

vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmuebles-importacion.service')
  >('@/lib/api/inmuebles-importacion.service');
  return { ...actual, inmueblesImportacionApi: inmueblesMock };
});

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  );
  return { ...actual, contractsApi: { ...actual.contractsApi, migracion: contratosMock } };
});

import { SecuenciaDeMigracion } from './SecuenciaDeMigracion';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<SecuenciaDeMigracion />);
  });
  // Una vuelta más: el efecto resuelve el `allSettled` en un microtask.
  await act(async () => {});
}

const RESUMEN = (over: Record<string, unknown> = {}) => ({
  lote: 'l',
  tipo: 'PROPIETARIO',
  actualizado: '2026-08-31T10:00:00.000Z',
  total: 0,
  borradores: 0,
  requierenAtencion: 0,
  listos: 0,
  aplicados: 0,
  descartados: 0,
  ...over,
});

beforeEach(() => {
  tercerosMock.lotesAbiertos.mockResolvedValue([]);
  tercerosMock.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 1 });
  inmueblesMock.lotesAbiertos.mockResolvedValue([]);
  contratosMock.lotesAbiertos.mockResolvedValue([]);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('SecuenciaDeMigracion', () => {
  it('pinta los cinco pasos en el orden acordado', async () => {
    await pintar();

    const pasos = container.querySelectorAll('[data-testid^="paso-"]');
    expect(pasos).toHaveLength(5);
    // terceros → propiedades → contratos → PUC → contables. El orden no es
    // estético: el inmueble necesita dueño y el contrato necesita inmueble.
    const titulos = [...pasos].map((p) => p.textContent ?? '');
    expect(titulos[0]).toContain('migracion.pasos.terceros.titulo');
    expect(titulos[1]).toContain('migracion.pasos.propiedades.titulo');
    expect(titulos[2]).toContain('migracion.pasos.contratos.titulo');
    expect(titulos[3]).toContain('migracion.pasos.puc.titulo');
    expect(titulos[4]).toContain('migracion.pasos.contables.titulo');
  });

  it('los pasos 4 y 5 no tienen ningún control clickeable', async () => {
    await pintar();

    for (const n of [4, 5]) {
      const paso = container.querySelector(`[data-testid="paso-${n}"]`)!;
      // Ni botón ni enlace: un botón deshabilitado invita a apretarlo y no
      // explica nada. La frase «todavía no está disponible» sí.
      expect(paso.querySelectorAll('button, a')).toHaveLength(0);
      expect(paso.textContent).toContain('migracion.noDisponible');
    }
  });

  it('cuenta los terceros aplicados con el `total` del back, no con las filas', async () => {
    // Se pide UNA fila (`porPagina: 1`) sólo para leer el `total`. Contar
    // `filas.length` diría «1 migrado» de 847.
    tercerosMock.filas.mockResolvedValue({
      filas: [{ id: 'f-1' }],
      total: 847,
      pagina: 1,
      porPagina: 1,
    });

    await pintar();

    expect(tercerosMock.filas).toHaveBeenCalledWith({ estado: 'APLICADO', porPagina: 1 });
    const paso1 = container.querySelector('[data-testid="paso-1"]')!;
    expect(paso1.textContent).toContain('"n":847');
    expect(paso1.textContent).toContain('migracion.estados.conDatos');
  });

  it('un 403 en un paso no borra la medición de los otros, ni inventa un cero', async () => {
    /*
     * 🔴 El caso del CONTADOR: `configuracion` lo tiene sólo el ADMIN, así que
     * los dos endpoints de terceros tiran 403. Con `Promise.all` eso dejaría
     * la pantalla entera sin medir; con un `catch → 0` diría «0 migrados» a
     * quien migró 847. Lo correcto es no afirmar nada de ese paso y seguir
     * midiendo los demás.
     */
    tercerosMock.lotesAbiertos.mockRejectedValue(new Error('403'));
    tercerosMock.filas.mockRejectedValue(new Error('403'));
    inmueblesMock.lotesAbiertos.mockResolvedValue([
      { lote: 'inm-1', estado: 'LISTO', total: 10, procesadas: 10, pendientes: 0, listos: 0, activados: 10, descartados: 0, jobId: null, error: null, creadoEn: '2026-08-30T10:00:00.000Z' },
    ]);

    await pintar();

    const paso1 = container.querySelector('[data-testid="paso-1"]')!;
    expect(paso1.textContent).not.toContain('migracion.avance.hechas');
    expect(paso1.textContent).not.toContain('migracion.estados.conDatos');

    // El paso 2 sí se midió: un permiso faltante en el 1 no lo arrastra.
    const paso2 = container.querySelector('[data-testid="paso-2"]')!;
    expect(paso2.textContent).toContain('"n":10');
  });

  it('un lote sin terminar se dice, y el botón pasa a «retomar»', async () => {
    tercerosMock.lotesAbiertos.mockResolvedValue([
      RESUMEN({ lote: 'propietarios-marzo', total: 640, requierenAtencion: 12, listos: 628 }),
    ]);

    await pintar();

    expect(container.querySelector('[data-testid="migracion-sin-terminar"]')).not.toBeNull();
    const paso1 = container.querySelector('[data-testid="paso-1"]')!;
    // 12 + 628: lo que queda por resolver Y lo que quedó listo sin crear.
    expect(paso1.textContent).toContain('"n":640');
    expect(paso1.textContent).toContain('propietarios-marzo');
    expect(paso1.querySelector('a')?.textContent).toContain('migracion.retomar');
  });

  it('sin nada empezado no dice «sin terminar» ni promete progreso', async () => {
    await pintar();

    expect(container.querySelector('[data-testid="migracion-sin-terminar"]')).toBeNull();
    const paso1 = container.querySelector('[data-testid="paso-1"]')!;
    expect(paso1.textContent).toContain('migracion.empezar');
    expect(paso1.textContent).not.toContain('migracion.estados.conDatos');
    expect(paso1.textContent).not.toContain('migracion.estados.enCurso');
  });

  it('no afirma que no migraste contratos: ese conteo el back no lo da', async () => {
    /*
     * `/contracts/migrar/lotes` lista sólo lo que sigue ABIERTO — no sabe
     * cuántos contratos se activaron históricamente. Poner 0 ahí le diría «no
     * migraste ninguno» a quien migró 1.200 la semana pasada.
     */
    await pintar();
    const paso3 = container.querySelector('[data-testid="paso-3"]')!;
    expect(paso3.textContent).not.toContain('migracion.avance.hechas');
  });
});
