/**
 * Quién gestiona la reparación y su seguimiento por avisos, en el detalle
 * (reunión con Portofino, Nico 29-10-2026).
 *
 * Lo que fija: con otro que la inmobiliaria se dice POR QUÉ no hay cotización,
 * aprobación, costo final ni descuentos, se ve la línea de tiempo de los pasos y
 * se registra el siguiente con su nota; «Cambiar» manda el campo al back y, con
 * una cotización aprobada, no deja pasarla a otro; sin permiso, sólo se lee.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: { cambiarGestion: vi.fn(), registrarSeguimiento: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatDate: (d: string) => `fecha:${d}` }),
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({ mantenimientoApi: h.api }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));

import { GestionDeLaReparacion } from './GestionDeLaReparacion';

function hacerSolicitud(overrides: Partial<SolicitudMantenimiento> = {}): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'reported',
    title: 'Filtración por la fachada',
    description: 'Entra agua por la ventana del estudio cuando llueve',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  h.api.cambiarGestion.mockResolvedValue({});
  h.api.registrarSeguimiento.mockResolvedValue({});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(solicitud: SolicitudMantenimiento, onCambio?: () => void) {
  act(() => {
    root.render(<GestionDeLaReparacion solicitud={solicitud} onCambio={onCambio} />);
  });
}

const $ = (testid: string) => container.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
const boton = (texto: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim() === texto);

describe('GestionDeLaReparacion — la inmobiliaria', () => {
  it('dice que es la inmobiliaria y cómo sigue; sin seguimiento', () => {
    montar(hacerSolicitud(), vi.fn());
    expect($('quien-la-gestiona')!.textContent).toBe('La inmobiliaria');
    expect(container.textContent).toContain('Cotizas, apruebas');
    expect($('seguimiento-por-avisos')).toBeNull();
    expect($('cambiar-gestion')).not.toBeNull();
  });

  it('un back anterior (sin el campo) se lee igual: la inmobiliaria', () => {
    montar(hacerSolicitud({ gestionadoPor: undefined, seguimientoExterno: undefined }), vi.fn());
    expect($('gestion-de-la-reparacion')!.getAttribute('data-gestion')).toBe('inmobiliaria');
  });
});

describe('GestionDeLaReparacion — la gestiona otro', () => {
  const conPasos = hacerSolicitud({
    gestionadoPor: 'administracion',
    seguimientoExterno: [
      { etapa: 'visita', nota: 'Vino el técnico de la administración', fecha: '2026-10-27T15:00:00.000Z', registradoPorUserId: 'u-1' },
    ],
  });

  it('dice por qué no hay cotización, aprobación, costo final ni descuentos, en una línea', () => {
    montar(conPasos, vi.fn());
    expect($('por-que-no-se-cotiza')!.textContent).toBe(
      'La gestiona la administración: no hay cotizaciones, aprobación, costo final ni descuentos. Registras en qué va.',
    );
  });

  it('la línea de tiempo muestra cada paso con su fecha y su nota', () => {
    montar(conPasos, vi.fn());
    const visita = $('paso-visita')!;
    expect(visita.textContent).toContain('Visita');
    expect(visita.textContent).toContain('fecha:2026-10-27T15:00:00.000Z');
    expect(visita.textContent).toContain('«Vino el técnico de la administración»');
  });

  it('el siguiente paso viene elegido (después de la visita, el arreglo) y se registra con su nota', async () => {
    const onCambio = vi.fn();
    montar(conPasos, onCambio);
    expect($('registrar-paso')!.textContent).toBe('Registrar «En arreglo»');

    const nota = $('nota-del-paso') as HTMLTextAreaElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      set.call(nota, 'Empezaron hoy');
      nota.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      $('registrar-paso')!.click();
    });

    expect(h.api.registrarSeguimiento).toHaveBeenCalledWith('sol-1', 'en_arreglo', 'Empezaron hoy');
    expect(h.toast.success).toHaveBeenCalledWith('Listo: quedó registrado «En arreglo»', {
      description: 'La tarjeta pasa a «En arreglo».',
    });
    expect(onCambio).toHaveBeenCalled();
  });

  it('se puede elegir otro paso (p. ej. terminarla de una)', async () => {
    montar(conPasos, vi.fn());
    await act(async () => {
      boton('Terminado')!.click();
    });
    await act(async () => {
      $('registrar-paso')!.click();
    });
    expect(h.api.registrarSeguimiento).toHaveBeenCalledWith('sol-1', 'terminado', '');
  });

  it('si el back no puede (sin la migración), lo dice con su frase y no rompe nada', async () => {
    h.api.registrarSeguimiento.mockRejectedValue(
      new ApiError(503, 'Todavía no se puede dejar la gestión de una reparación…: falta una actualización de Leasefy en la base de datos.', 'GESTIONADO_POR_SIN_MIGRAR', {
        statusCode: 503,
        code: 'GESTIONADO_POR_SIN_MIGRAR',
        message: 'Todavía no se puede dejar la gestión de una reparación…: falta una actualización de Leasefy en la base de datos.',
      }),
    );
    const onCambio = vi.fn();
    montar(conPasos, onCambio);
    await act(async () => {
      $('registrar-paso')!.click();
    });
    expect(h.toast.error).toHaveBeenCalledWith('No se pudo registrar el paso', {
      description: expect.stringContaining('falta una actualización de Leasefy'),
    });
    expect(onCambio).not.toHaveBeenCalled();
    expect($('registrar-paso')).not.toBeNull();
  });

  it('sin pasos todavía: lo dice y ofrece la visita', () => {
    montar(hacerSolicitud({ gestionadoPor: 'propietario' }), vi.fn());
    expect($('seguimiento-sin-pasos')).not.toBeNull();
    expect($('registrar-paso')!.textContent).toBe('Registrar «Visita»');
  });

  it('terminada (o cancelada) ya no ofrece registrar', () => {
    montar(
      hacerSolicitud({
        gestionadoPor: 'propietario',
        status: 'completed',
        seguimientoExterno: [{ etapa: 'terminado', nota: null, fecha: '2026-10-28T10:00:00.000Z', registradoPorUserId: null }],
      }),
      vi.fn(),
    );
    expect($('paso-terminado')).not.toBeNull();
    expect($('registrar-paso')).toBeNull();
    expect($('cambiar-gestion')).toBeNull();
  });

  it('sin permiso de editar sólo se lee: ni «Cambiar» ni «Registrar»', () => {
    montar(conPasos);
    expect($('paso-visita')).not.toBeNull();
    expect($('registrar-paso')).toBeNull();
    expect($('cambiar-gestion')).toBeNull();
  });
});

describe('GestionDeLaReparacion — cambiar quién la gestiona', () => {
  it('«Cambiar» abre las cuatro opciones; guardar manda el campo y relee', async () => {
    const onCambio = vi.fn();
    montar(hacerSolicitud(), onCambio);
    await act(async () => {
      $('cambiar-gestion')!.click();
    });
    expect($('guardar-gestion')!.hasAttribute('disabled')).toBe(true);
    await act(async () => {
      container.querySelector<HTMLElement>('[data-testid="gestion-administracion"]')!.click();
    });
    await act(async () => {
      $('guardar-gestion')!.click();
    });
    expect(h.api.cambiarGestion).toHaveBeenCalledWith('sol-1', 'administracion');
    expect(h.toast.success).toHaveBeenCalledWith('Listo: ahora la gestiona la administración.');
    expect(onCambio).toHaveBeenCalled();
  });

  it('con una cotización aprobada no deja pasarla a otro y dice por qué', async () => {
    montar(hacerSolicitud({ status: 'approved', selectedQuoteId: 'q-1', approvedAmount: 380_000 }), vi.fn());
    await act(async () => {
      $('cambiar-gestion')!.click();
    });
    expect($('gestion-bloqueada')!.textContent).toContain('ya no se le puede pasar la gestión a otro');
    for (const g of ['propietario', 'administracion', 'inquilino']) {
      expect(container.querySelector(`[data-testid="gestion-${g}"]`)!.hasAttribute('disabled')).toBe(true);
    }
  });

  it('el 409 del back se dice con su frase', async () => {
    h.api.cambiarGestion.mockRejectedValue(
      new ApiError(409, 'Esta reparación ya tiene una cotización aprobada por la inmobiliaria.', 'GESTION_CON_COTIZACION_APROBADA', {
        statusCode: 409,
        code: 'GESTION_CON_COTIZACION_APROBADA',
        message: 'Esta reparación ya tiene una cotización aprobada por la inmobiliaria.',
      }),
    );
    montar(hacerSolicitud(), vi.fn());
    await act(async () => {
      $('cambiar-gestion')!.click();
    });
    await act(async () => {
      container.querySelector<HTMLElement>('[data-testid="gestion-propietario"]')!.click();
    });
    await act(async () => {
      $('guardar-gestion')!.click();
    });
    expect(h.toast.error).toHaveBeenCalledWith('No se pudo cambiar quién la gestiona', {
      description: 'Esta reparación ya tiene una cotización aprobada por la inmobiliaria.',
    });
  });

  it('«la hace el propietario» (22-10) no se cambia con «Cambiar»: se retoma', () => {
    montar(
      hacerSolicitud({
        laHaceElPropietario: { loDecidio: 'PROPIETARIO', nota: null, desde: '2026-10-27T10:00:00.000Z', terminadaAt: null, terminadaNota: null },
      }),
      vi.fn(),
    );
    expect($('quien-la-gestiona')!.textContent).toBe('El propietario');
    expect($('cambiar-gestion')).toBeNull();
  });
});
