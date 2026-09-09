/**
 * MigrarTerceros — decidir si las invitaciones salen AHORA.
 *
 * 🔴 Nico, 2026-09-09: «debemos crear la posibilidad también, si es que dice
 * no a la hora de migrar, de enviar todos los correos de invitación de los
 * inquilinos en ese momento; que lo pueda hacer en otro momento».
 *
 * Mandarle correo a 600 personas de verdad no puede ser un efecto secundario
 * de apretar «Crear». Lo que se congela acá:
 *
 *  1. la casilla existe en inquilinos y NO en propietarios (un propietario no
 *     recibe invitación por esta vía; ofrecerla prometería algo que no pasa);
 *  2. viene puesta — es lo que la pantalla hacía hasta hoy;
 *  3. destildarla llega al back como `invitar: false`;
 *  4. el resultado dice POR QUÉ quedaron pendientes, que no es lo mismo
 *     «lo pediste» que «el correo falló».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
    resumen: vi.fn(),
    filas: vi.fn(),
    aplicar: vi.fn(),
    preparar: vi.fn(),
    corregir: vi.fn(),
    descartar: vi.fn(),
    resolverMasivo: vi.fn(),
  },
}));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/migracion-terceros.service')
  >('@/lib/api/migracion-terceros.service');
  return { ...actual, migracionTercerosApi: api };
});

import { MigrarTerceros } from './MigrarTerceros';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(tipo: 'INQUILINO' | 'PROPIETARIO' = 'INQUILINO') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo={tipo} />);
  });
  await act(async () => {});
  // La pantalla arranca en la tarjeta de «tienes una carga sin terminar»; la
  // lista de trabajo —con la casilla y el botón— vive detrás de «Retomar».
  await clicEnBoton('Retomar');
}

function casilla(): HTMLButtonElement | null {
  return container
    .querySelector('[data-testid="invitar-al-crear"]')
    ?.querySelector('button') as HTMLButtonElement | null;
}

async function clicEnBoton(texto: string) {
  const b = [...container.querySelectorAll('button')].find((x) =>
    (x.textContent ?? '').includes(texto),
  );
  if (!b) throw new Error(`No hay botón «${texto}»`);
  await act(async () => {
    (b as HTMLButtonElement).click();
  });
  await act(async () => {});
}

const lote = (tipo: 'INQUILINO' | 'PROPIETARIO') => ({
  lote: 'carga-prueba',
  tipo,
  actualizado: '2026-09-09T10:00:00.000Z',
  total: 3,
  borradores: 0,
  requierenAtencion: 0,
  listos: 3,
  aplicados: 0,
  descartados: 0,
});

beforeEach(() => {
  api.plantilla.mockResolvedValue({ tipo: 'INQUILINO', columnas: [] });
  api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });
  api.aplicar.mockResolvedValue({
    lote: 'carga-prueba',
    intentadas: 3,
    aplicadas: 3,
    fallidas: 0,
    invitados: 0,
    sinInvitar: 3,
    sinCorreo: 0,
    resultados: [],
    restantes: 0,
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('MigrarTerceros — mandar las invitaciones ahora, o después', () => {
  beforeEach(() => {
    api.lotesAbiertos.mockResolvedValue([lote('INQUILINO')]);
    api.resumen.mockResolvedValue(lote('INQUILINO'));
  });

  it('la casilla existe y viene puesta: el default no cambió', async () => {
    await pintar();

    const c = casilla();
    expect(c).not.toBeNull();
    expect(c!.getAttribute('data-state')).toBe('checked');
  });

  it('con la casilla puesta, el back recibe `invitar: true`', async () => {
    await pintar();
    await clicEnBoton('Crear 3');

    expect(api.aplicar).toHaveBeenCalledWith('carga-prueba', { invitar: true });
  });

  it('🔴 destildada, el back recibe `invitar: false` — nadie recibe correo', async () => {
    await pintar();
    await act(async () => {
      casilla()!.click();
    });
    await act(async () => {});

    await clicEnBoton('Crear 3');

    expect(api.aplicar).toHaveBeenCalledWith('carga-prueba', { invitar: false });
  });

  it('el texto de la casilla dice qué va a pasar en cada estado', async () => {
    await pintar();
    const caja = () =>
      container.querySelector('[data-testid="invitar-al-crear"]')!.textContent ?? '';

    expect(caja()).toContain('le llega el enlace para poner su contraseña');

    await act(async () => {
      casilla()!.click();
    });
    await act(async () => {});

    // Lo importante no es que no se mande: es que las cuentas SÍ se crean y
    // que hay a dónde ir después. Sin eso, «no» se lee como «no migres».
    expect(caja()).toContain('Las cuentas se crean igual');
    expect(caja()).toContain('Inquilinos');
  });

  it('🔴 el informe distingue «lo pediste» de «el correo falló»', async () => {
    await pintar();
    await act(async () => {
      casilla()!.click();
    });
    await act(async () => {});
    await clicEnBoton('Crear 3');

    const aviso = container.querySelector('[data-testid="sin-invitar"]')!;
    expect(aviso.textContent).toContain('como pediste');
    expect(aviso.textContent).not.toContain('no pudo salir');
    // Y dice a dónde ir, porque el pendiente no se resuelve solo.
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inquilinos',
    );
  });

  it('con la casilla puesta y algo que no salió, el informe habla del fallo', async () => {
    await pintar();
    await clicEnBoton('Crear 3');

    const aviso = container.querySelector('[data-testid="sin-invitar"]')!;
    expect(aviso.textContent).toContain('no pudo salir');
    expect(aviso.textContent).not.toContain('como pediste');
  });
});

describe('MigrarTerceros — propietarios', () => {
  beforeEach(() => {
    api.lotesAbiertos.mockResolvedValue([lote('PROPIETARIO')]);
    api.resumen.mockResolvedValue(lote('PROPIETARIO'));
  });

  it('no ofrece la casilla: un propietario no recibe invitación por acá', async () => {
    await pintar('PROPIETARIO');

    expect(container.querySelector('[data-testid="invitar-al-crear"]')).toBeNull();
  });
});
