/**
 * «Resolución» con el QA de Facturación (QA-FACT, 03-10-2026):
 *
 *  · Q12 (Nico, la recomendada): anular una resolución, SÓLO el administrador
 *    (el back responde 403 SOLO_EL_ADMINISTRADOR al contador): al contador no
 *    se le ofrece el botón;
 *  · Nico (19:4x): la resolución de PRUEBA se marca con una casilla al cargarla;
 *  · Nico (03-10, noche): el administrador la marca o desmarca YA cargada, desde
 *    su cajón, sólo mientras no haya numerado nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { resolucionesMock, crearMock, marcarMock, toastMock, permisos } = vi.hoisted(() => ({
  resolucionesMock: vi.fn(),
  crearMock: vi.fn(),
  marcarMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: { valor: { isAdmin: false, agencyRole: 'CONTADOR' as string | null } },
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return {
    ...real,
    facturacionPorMesService: {
      resoluciones: (...a: unknown[]) => resolucionesMock(...a),
      crearResolucion: (...a: unknown[]) => crearMock(...a),
      anularResolucion: vi.fn(),
      marcarDePrueba: (...a: unknown[]) => marcarMock(...a),
      sugerenciaDeLaResolucion: () => Promise.reject(new Error('404')),
    },
  };
});

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

vi.mock('./CampoDeFecha', async () => {
  const R = await import('react');
  return {
    CampoDeFecha: ({ value, onChange, testid, id }: { value: string; onChange: (v: string) => void; testid?: string; id: string }) =>
      R.createElement('input', {
        id,
        'data-testid': testid,
        value,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      }),
  };
});

import { ResolucionDeFacturacion } from './ResolucionDeFacturacion';

function respuesta(): ResolucionesDeLaAgencia {
  return {
    resoluciones: [
      {
        id: 'res-1',
        numero: '18764000000001',
        fechaResolucion: '2026-09-01T00:00:00.000Z',
        prefijo: 'LABQA',
        tipoDeDocumento: null,
        tipoNombre: 'Cualquier tipo de documento',
        desde: 1,
        hasta: 5000,
        vigenteDesde: '2026-09-01T00:00:00.000Z',
        vigenteHasta: '2027-09-01T00:00:00.000Z',
        ultimoNumeroUsado: 7,
        anulada: false,
        esDePrueba: true,
        documentosNumerados: 7,
        sePuedeMarcarDePrueba: false,
        usados: 7,
        disponibles: 4993,
        puedeNumerar: true,
        motivo: null,
        explicacion: null,
        siguiente: 'LABQA-8',
      },
    ],
    vigente: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '18764000000001',
      prefijo: 'LABQA',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2027-09-01T00:00:00.000Z',
      disponibles: 4993,
      siguiente: 'LABQA-8',
    },
    porTipoDisponible: false,
    marcaDePruebaDisponible: true,
    porTipo: [],
    umbrales: { numeros: 100, dias: 30 },
    avisos: [],
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<ResolucionDeFacturacion />);
  });
}

const q = (s: string) => document.querySelector(s);

function escribir(testid: string, valor: string) {
  const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  resolucionesMock.mockReset().mockResolvedValue(respuesta());
  crearMock.mockReset().mockResolvedValue({});
  marcarMock.mockReset().mockResolvedValue({});
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

/** El disparador de Radix abre con `pointerdown`; el menú vive en un portal. */
async function abrirAcciones(id: string) {
  const kebab = q(`[data-testid="acciones-${id}"]`) as HTMLButtonElement;
  await act(async () => {
    kebab.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
    );
  });
}

async function abrirDetalle(id: string) {
  await abrirAcciones(id);
  const item = q(`[data-testid="detalle-${id}"]`) as HTMLElement;
  await act(async () => {
    item.click();
  });
}

/** Una resolución sin nada numerado (la de `respuesta()` lleva 7). */
function sinNumerar(cambios: Record<string, unknown> = {}): ResolucionesDeLaAgencia {
  const base = respuesta();
  return {
    ...base,
    resoluciones: [
      {
        ...base.resoluciones[0],
        esDePrueba: false,
        usados: 0,
        ultimoNumeroUsado: 0,
        disponibles: 5000,
        siguiente: 'LABQA-1',
        documentosNumerados: 0,
        sePuedeMarcarDePrueba: true,
        ...cambios,
      },
    ],
  };
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ResolucionDeFacturacion · QA-FACT', () => {
  it('🔴 Q12: al contador no se le ofrece anular la resolución (sí ver su detalle)', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR' };
    await montar();
    expect(q('[data-testid="resolucion-res-1"]')).not.toBeNull();
    await abrirAcciones('res-1');
    expect(q('[data-testid="detalle-res-1"]')).not.toBeNull();
    expect(q('[data-testid="anular-res-1"]')).toBeNull();
  });

  it('al administrador sí', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    await abrirAcciones('res-1');
    expect(q('[data-testid="anular-res-1"]')).not.toBeNull();
  });

  it('la resolución de prueba se marca en la lista', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    expect(q('[data-testid="resolucion-res-1"]')!.textContent).toContain('De prueba');
  });

  it('🔴 la casilla «Es una resolución de prueba» viaja como `esDePrueba` sólo marcada', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    await act(async () => {
      (q('[data-testid="resolucion-abrir-carga"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      escribir('resolucion-campo-numero', 'PRUEBA-LAB-0002');
      escribir('resolucion-campo-fecha', '2026-10-01');
      escribir('resolucion-campo-prefijo', 'LABP');
      escribir('resolucion-campo-desde', '1');
      escribir('resolucion-campo-hasta', '40');
      escribir('resolucion-campo-vigente-desde', '2026-10-01');
      escribir('resolucion-campo-vigente-hasta', '2026-12-31');
    });
    await act(async () => {
      (q('[data-testid="resolucion-campo-de-prueba"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(crearMock).toHaveBeenCalledTimes(1);
    expect(crearMock.mock.calls[0][0]).toMatchObject({ prefijo: 'LABP', esDePrueba: true });
  });
});

describe('ResolucionDeFacturacion · la casilla de prueba sólo si la base la guarda', () => {
  it('🔴 sin `marcaDePruebaDisponible` la casilla no se ofrece (el back rechazaría `esDePrueba`)', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue({ ...respuesta(), marcaDePruebaDisponible: false });
    await montar();
    await act(async () => {
      (q('[data-testid="resolucion-abrir-carga"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="resolucion-cargar-una"], [data-testid="cajon-de-la-resolucion"]')).not.toBeNull();
    expect(q('[data-testid="resolucion-campo-de-prueba"]')).toBeNull();
  });
});

describe('ResolucionDeFacturacion · marcar «de prueba» una resolución ya cargada (Nico, 03-10)', () => {
  const interruptor = () => q('[data-testid="resolucion-de-prueba-interruptor"]') as HTMLButtonElement | null;
  const motivo = () => q('[data-testid="resolucion-de-prueba-motivo"]')?.textContent ?? '';

  it('🔴 el administrador la marca mientras no haya numerado: PATCH con `esDePrueba` y se vuelve a leer', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue(sinNumerar());
    await montar();
    await abrirDetalle('res-1');
    expect(q('[data-testid="cajon-del-detalle-de-la-resolucion"]')).not.toBeNull();
    expect(interruptor()!.disabled).toBe(false);
    expect(interruptor()!.getAttribute('aria-checked')).toBe('false');
    expect(motivo()).toBe('');
    const lecturas = resolucionesMock.mock.calls.length;
    await act(async () => {
      interruptor()!.click();
    });
    expect(marcarMock).toHaveBeenCalledWith('res-1', true);
    expect(resolucionesMock.mock.calls.length).toBe(lecturas + 1);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('y la desmarca', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue(sinNumerar({ esDePrueba: true }));
    await montar();
    await abrirDetalle('res-1');
    expect(interruptor()!.getAttribute('aria-checked')).toBe('true');
    await act(async () => {
      interruptor()!.click();
    });
    expect(marcarMock).toHaveBeenCalledWith('res-1', false);
  });

  it('🔴 con algo ya numerado queda apagado y dice por qué', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar(); // la de `respuesta()` lleva 7 numerados
    await abrirDetalle('res-1');
    expect(interruptor()!.disabled).toBe(true);
    expect(motivo()).toContain('Ya numeró 7 documentos');
    await act(async () => {
      interruptor()!.click();
    });
    expect(marcarMock).not.toHaveBeenCalled();
  });

  it('🔴 «ya numeró» lo dice el back, no `usados`: el último número del programa anterior no la bloquea', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue(sinNumerar({ usados: 120, ultimoNumeroUsado: 120 }));
    await montar();
    await abrirDetalle('res-1');
    expect(interruptor()!.disabled).toBe(false);
  });

  it('con un back sin la ruta (`sePuedeMarcarDePrueba` ausente) no se ofrece', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue(
      sinNumerar({ sePuedeMarcarDePrueba: undefined, documentosNumerados: undefined }),
    );
    await montar();
    await abrirDetalle('res-1');
    expect(q('[data-testid="cajon-del-detalle-de-la-resolucion"]')).not.toBeNull();
    expect(q('[data-testid="resolucion-de-prueba"]')).toBeNull();
  });

  it('🔴 al contador se le muestra la marca, apagada, con su motivo', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR' };
    resolucionesMock.mockResolvedValue(sinNumerar());
    await montar();
    await abrirDetalle('res-1');
    expect(interruptor()!.disabled).toBe(true);
    expect(motivo()).toContain('Sólo el administrador');
  });

  it('sin `marcaDePruebaDisponible` no se ofrece', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue({ ...sinNumerar(), marcaDePruebaDisponible: false });
    await montar();
    await abrirDetalle('res-1');
    expect(q('[data-testid="cajon-del-detalle-de-la-resolucion"]')).not.toBeNull();
    expect(q('[data-testid="resolucion-de-prueba"]')).toBeNull();
  });

  it('🔴 el 409 del back (ya numeró entre medio) se dice con su frase, sin «conexión»', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    resolucionesMock.mockResolvedValue(sinNumerar());
    const { ApiError } = await import('@/lib/api/client');
    marcarMock.mockRejectedValue(
      new ApiError(409, 'La resolución ya numeró documentos: la marca de prueba no se puede cambiar.', 'RESOLUCION_YA_NUMERO', {
        statusCode: 409,
        code: 'RESOLUCION_YA_NUMERO',
        message: 'La resolución ya numeró documentos: la marca de prueba no se puede cambiar.',
      }),
    );
    await montar();
    await abrirDetalle('res-1');
    await act(async () => {
      interruptor()!.click();
    });
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    const texto = String(toastMock.error.mock.calls[0][0]);
    expect(texto).toContain('ya numeró');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });
});
