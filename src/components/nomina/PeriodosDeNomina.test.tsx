/**
 * LA LIQUIDACIÓN: el orden de los botones ES la regla de negocio.
 *
 * Lo que estos tests fijan:
 *
 *   1. **un BORRADOR se aprueba; un APROBADO se asienta y se paga; un PAGADO no
 *      se anula.** Si los botones salieran todos siempre, alguien asentaría un
 *      borrador que todavía puede cambiar — y un asiento no se borra.
 *   2. **anular exige motivo de 10 caracteres** y se pide con `AlertDialog`, NO
 *      con `window.confirm` (hay un test estático que lo cuida en todo el panel).
 *   3. **el 422 de parámetros incompletos se muestra con la lista de lo que
 *      falta**, no como «no se pudo liquidar».
 *   4. **el 422 de mapeo contable dice CUÁLES conceptos están sin cuenta** y
 *      explica por qué el asiento no se escribe a medias.
 *   5. **marcar pagado sin lote de egresos avisa que el giro salió por fuera.**
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { PeriodoDeNomina } from '@/lib/api/nomina.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const h = vi.hoisted(() => ({
  periodos: vi.fn(),
  armar: vi.fn(),
  aprobar: vi.fn(),
  anular: vi.fn(),
  asentar: vi.fn(),
  pagar: vi.fn(),
  detalle: vi.fn(() => ({})),
  noEstaHabilitada: vi.fn(() => false),
  faltaLaMigracion: vi.fn(() => false),
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: {
    periodos: h.periodos,
    armarBorrador: h.armar,
    aprobar: h.aprobar,
    anular: h.anular,
    asentar: h.asentar,
    marcarPagado: h.pagar,
  },
  detalleDelFallo: h.detalle,
  noEstaHabilitada: h.noEstaHabilitada,
  faltaLaMigracion: h.faltaLaMigracion,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { PeriodosDeNominaPanel } from './PeriodosDeNomina';

function periodo(extra: Partial<PeriodoDeNomina> = {}): PeriodoDeNomina {
  return {
    id: 'per-1',
    mes: '2026-03',
    quincena: null,
    desde: '2026-03-01',
    hasta: '2026-03-31',
    estado: 'BORRADOR',
    totalDevengadoCop: 2_200_000,
    totalDeduccionesCop: 160_000,
    totalNetoCop: 2_040_000,
    totalAportesCop: 600_440,
    personas: 1,
    aprobadoAt: null,
    pagadoAt: null,
    asientoId: null,
    loteDeEgresosId: null,
    motivoAnulacion: null,
    ...extra,
  };
}

let contenedor: HTMLDivElement;
let root: Root;

async function montar(periodos: PeriodoDeNomina[]) {
  h.periodos.mockResolvedValue({
    disponible: true,
    motivo: null,
    periodos,
  });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<PeriodosDeNominaPanel />);
  });
}

beforeEach(() => {
  for (const fn of Object.values(h)) {
    if (typeof fn === 'function' && 'mockReset' in fn) fn.mockReset();
  }
  h.detalle.mockReturnValue({});
  h.noEstaHabilitada.mockReturnValue(false);
  h.faltaLaMigracion.mockReturnValue(false);
  h.aprobar.mockResolvedValue({});
  h.asentar.mockResolvedValue({ yaEstaba: false, asientoId: 'a-1', mensaje: 'ok' });
  h.pagar.mockResolvedValue({ periodo: periodo(), aviso: null });
  h.anular.mockResolvedValue({ anulado: true, asientoPorReversar: null, aviso: null });
});

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

const boton = (testId: string) =>
  contenedor.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
const texto = () => contenedor.textContent ?? '';

describe('🔴 el orden de los botones es la regla de negocio', () => {
  it('un BORRADOR se aprueba y se anula, pero NO se asienta ni se paga', async () => {
    await montar([periodo({ estado: 'BORRADOR' })]);
    expect(boton('aprobar-per-1')).not.toBeNull();
    expect(boton('anular-per-1')).not.toBeNull();
    expect(boton('asentar-per-1')).toBeNull();
    expect(boton('pagar-per-1')).toBeNull();
  });

  it('un APROBADO se asienta y se paga, pero ya no se aprueba', async () => {
    await montar([
      periodo({ estado: 'APROBADO', aprobadoAt: '2026-03-31T00:00:00.000Z' }),
    ]);
    expect(boton('asentar-per-1')).not.toBeNull();
    expect(boton('pagar-per-1')).not.toBeNull();
    expect(boton('aprobar-per-1')).toBeNull();
  });

  it('un APROBADO que YA tiene asiento no ofrece asentar otra vez', async () => {
    await montar([periodo({ estado: 'APROBADO', asientoId: 'a-1' })]);
    expect(boton('asentar-per-1')).toBeNull();
    expect(boton('pagar-per-1')).not.toBeNull();
  });

  it('🔴 un PAGADO no se anula: anular no devuelve la plata', async () => {
    await montar([periodo({ estado: 'PAGADO' })]);
    expect(boton('anular-per-1')).toBeNull();
    expect(boton('aprobar-per-1')).toBeNull();
  });

  it('un ANULADO no ofrece nada', async () => {
    await montar([
      periodo({ estado: 'ANULADO', motivoAnulacion: 'se cargó mal el archivo' }),
    ]);
    expect(boton('aprobar-per-1')).toBeNull();
    expect(boton('anular-per-1')).toBeNull();
    expect(boton('asentar-per-1')).toBeNull();
  });

  it('cada estado explica qué significa, en la leyenda', async () => {
    await montar([periodo()]);
    const leyenda = contenedor.querySelector('[data-testid="leyenda-de-estados"]');
    expect(leyenda?.textContent).toContain('Se puede recalcular');
    expect(leyenda?.textContent).toContain('congeladas');
  });
});

describe('🔴 aprobar manda los desprendibles, y la pantalla lo dice', () => {
  it('muestra cuántos salieron, cuántos sin correo y cuántos fallaron', async () => {
    await montar([periodo({ estado: 'BORRADOR' })]);
    h.aprobar.mockResolvedValue({
      envioDeDesprendibles: {
        enviados: 28,
        sinCorreo: 1,
        fallaron: 1,
        avisos: ['1 persona no tiene correo en su ficha: su desprendible no salió.'],
      },
    });
    await act(async () => {
      boton('aprobar-per-1')?.click();
    });
    const avisos = contenedor.querySelector(
      '[data-testid="avisos-de-liquidacion"]',
    );
    expect(avisos?.textContent).toContain('28 enviados');
    expect(avisos?.textContent).toContain('1 sin correo');
    expect(avisos?.textContent).toContain('1 con fallo');
    expect(avisos?.textContent).toContain('no tiene correo en su ficha');
  });

  it('también lo dice cuando salieron TODOS: quien aprueba no puede quedarse sin saber', async () => {
    await montar([periodo({ estado: 'BORRADOR' })]);
    h.aprobar.mockResolvedValue({
      envioDeDesprendibles: { enviados: 5, sinCorreo: 0, fallaron: 0, avisos: [] },
    });
    await act(async () => {
      boton('aprobar-per-1')?.click();
    });
    expect(texto()).toContain('5 enviados');
  });

  it('avisa en la pantalla que aprobar manda los desprendibles, ANTES de aprobar', async () => {
    await montar([periodo()]);
    expect(texto()).toContain('desprendible en PDF por correo');
    expect(texto()).toContain('se puede reenviar');
  });
});

describe('anular', () => {
  it('🔴 se pide con AlertDialog, no con el diálogo del navegador', async () => {
    const confirmar = vi.fn(() => true);
    (globalThis as { confirm?: unknown }).confirm = confirmar;
    await montar([periodo()]);
    await act(async () => {
      boton('anular-per-1')?.click();
    });
    expect(confirmar).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="dialogo-de-anulacion"]'),
    ).not.toBeNull();
  });

  it('el botón de confirmar está deshabilitado con un motivo corto', async () => {
    await montar([periodo()]);
    await act(async () => {
      boton('anular-per-1')?.click();
    });
    const confirmar = document.querySelector<HTMLButtonElement>(
      '[data-testid="confirmar-anulacion"]',
    );
    expect(confirmar?.disabled).toBe(true);
  });

  it('el diálogo explica que el asiento NO se borra', async () => {
    await montar([periodo({ estado: 'APROBADO', asientoId: 'a-1' })]);
    await act(async () => {
      boton('anular-per-1')?.click();
    });
    const dialogo = document.querySelector('[data-testid="dialogo-de-anulacion"]');
    expect(dialogo?.textContent).toContain('NO se borra');
    expect(dialogo?.textContent).toContain('se reversa desde Contabilidad');
  });
});

describe('🔴 los 422 se muestran con su lista, no como «no se pudo»', () => {
  it('parámetros incompletos: dice CUÁL cifra falta y dónde cargarla', async () => {
    await montar([]);
    h.armar.mockRejectedValue(new Error('422'));
    h.detalle.mockReturnValue({
      queFalta: ['el salario mínimo del año', 'la UVT del año'],
    });
    await act(async () => {
      boton('armar-borrador')?.click();
    });
    const avisos = contenedor.querySelector(
      '[data-testid="avisos-de-liquidacion"]',
    );
    expect(avisos?.textContent).toContain('el salario mínimo del año');
    expect(avisos?.textContent).toContain('la UVT del año');
    expect(avisos?.textContent).toContain('Configuración');
  });

  it('mapeo contable: dice CUÁLES conceptos y por qué no se asienta a medias', async () => {
    await montar([periodo({ estado: 'APROBADO' })]);
    h.asentar.mockRejectedValue(new Error('422'));
    h.detalle.mockReturnValue({ conceptos: ['BONIF (Bonificación)'] });
    await act(async () => {
      boton('asentar-per-1')?.click();
    });
    const avisos = contenedor.querySelector(
      '[data-testid="avisos-de-liquidacion"]',
    );
    expect(avisos?.textContent).toContain('BONIF');
    expect(avisos?.textContent).toContain('NO se escribe a medias');
  });

  it('cuentas que no existen: dice que nómina no crea cuentas', async () => {
    await montar([periodo({ estado: 'APROBADO' })]);
    h.asentar.mockRejectedValue(new Error('422'));
    h.detalle.mockReturnValue({ cuentas: ['510599'] });
    await act(async () => {
      boton('asentar-per-1')?.click();
    });
    const avisos = contenedor.querySelector(
      '[data-testid="avisos-de-liquidacion"]',
    );
    expect(avisos?.textContent).toContain('510599');
    expect(avisos?.textContent).toContain('Nómina no crea cuentas');
  });
});

describe('el pago', () => {
  it('🔴 sin lote de egresos avisa que el giro salió por fuera de Leasefy', async () => {
    await montar([periodo({ estado: 'APROBADO' })]);
    h.pagar.mockResolvedValue({
      periodo: periodo({ estado: 'PAGADO' }),
      aviso:
        'Este pago quedó marcado sin lote de egresos: el giro se hizo por fuera de Leasefy.',
    });
    await act(async () => {
      boton('pagar-per-1')?.click();
    });
    expect(texto()).toContain('por fuera de Leasefy');
  });
});

describe('armar el borrador', () => {
  it('manda `quincena: null` cuando la periodicidad es mensual', async () => {
    await montar([]);
    h.armar.mockResolvedValue({
      periodoId: 'per-1',
      personas: 3,
      devengado: 1,
      deducciones: 0,
      neto: 1,
      aportes: 0,
      avisos: [],
    });
    await act(async () => {
      boton('armar-borrador')?.click();
    });
    expect(h.armar).toHaveBeenCalledWith(
      expect.objectContaining({ quincena: null }),
    );
  });

  it('los avisos que devuelve el back se muestran', async () => {
    await montar([]);
    h.armar.mockResolvedValue({
      periodoId: 'per-1',
      personas: 1,
      devengado: 1,
      deducciones: 0,
      neto: 1,
      aportes: 0,
      avisos: ['Esta persona no tiene clase de riesgo de ARL en su ficha.'],
    });
    await act(async () => {
      boton('armar-borrador')?.click();
    });
    expect(texto()).toContain('clase de riesgo de ARL');
  });

  it('explica que la contabilidad cierra el mes completo', async () => {
    await montar([]);
    expect(texto()).toContain('cierra el mes completo');
  });

  it('explica que los contratistas NO entran a la nómina laboral', async () => {
    await montar([]);
    expect(texto()).toContain('no son nómina laboral');
  });
});
