/**
 * La configuración de la exógena.
 *
 * Los cuatro casos que este archivo protege:
 *
 * 🔴 1. Los dos interruptores se ven DISTINTO: el de los giros ya está
 *       decidido y el del 2815 espera al contador. Iguales, alguien prende el
 *       que no debía — y prender el de los giros manda al 1001 pagos que bajo
 *       mandato la inmobiliaria no deduce.
 *
 * 🔴 2. Los textos son los del back, no copy de la pantalla: son decisiones
 *       tributarias.
 *
 * 🔴 3. El tope heredado se ve AL LADO del propio, con su año y su resolución.
 *       Y un tope ausente dice «no se agrupa nada», nunca «$0».
 *
 * 🔴 4. El cuerpo del PUT lleva las tres claves del DTO y ninguna más — sin
 *       `anio`, que la configuración no es por año.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ConfiguracionDeExogena as Configuracion } from '@/lib/api/exogena.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, escrituraMock, toastMock } = vi.hoisted(() => ({
  api: { configuracion: vi.fn(), guardarConfiguracion: vi.fn() },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/exogena.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/exogena.service')>(
    '@/lib/api/exogena.service',
  );
  return { ...actual, exogenaApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { ConfiguracionDeExogena } from './ConfiguracionDeExogena';

const config = (extra: Partial<Configuracion> = {}): Configuracion => ({
  disponible: true,
  motivo: null,
  girosAPropietariosEn1001: false,
  saldo2815En1009: false,
  topeCuantiasMenoresCop: null,
  delAnioDeLaPlataforma: {
    anio: 2026,
    resolucion: 'Resolución 000162 de 2023',
    topeCuantiasMenoresCop: 1_000_000,
    nitCuantiasMenores: '222222222',
  },
  decididoPorNico: {
    girosAPropietariosEn1001:
      'Los giros a propietarios van SÓLO en el 1647 (decidido el 18-09). Bajo mandato la inmobiliaria no es quien deduce ese pago.',
  },
  esperaAlContador: {
    saldo2815En1009:
      'El saldo de 2815 al 31 de diciembre es un pasivo real, pero también es el objeto entero del 1647.',
  },
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.configuracion.mockReset().mockResolvedValue(config());
  api.guardarConfiguracion.mockReset().mockResolvedValue({
    id: 'cfg-1',
    agencyId: 'a-1',
    girosAPropietariosEn1001: false,
    saldo2815En1009: true,
    topeCuantiasMenoresCop: null,
    actualizadoPorUserId: 'u-1',
  });
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(anio = 2026) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ConfiguracionDeExogena anio={anio} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
    await Promise.resolve();
  });
}

describe('<ConfiguracionDeExogena>', () => {
  it('🔴 distingue lo DECIDIDO de lo que espera al contador', async () => {
    await pintar();

    expect(q('estado-girosAPropietariosEn1001')!.textContent).toBe('Decidido');
    expect(q('estado-saldo2815En1009')!.textContent).toBe('Espera al contador');

    // Y no se dibujan igual: el pendiente va en amarillo.
    expect(q('interruptor-saldo2815En1009')!.className).toContain('warning');
    expect(q('interruptor-girosAPropietariosEn1001')!.className).not.toContain('warning');
  });

  it('🔴 los textos son los del back, enteros', async () => {
    await pintar();
    expect(q('explicacion-girosAPropietariosEn1001')!.textContent).toContain(
      'Bajo mandato la inmobiliaria no es quien deduce ese pago',
    );
    expect(q('explicacion-saldo2815En1009')!.textContent).toContain('objeto entero del 1647');
  });

  it('un back sin esos textos no inventa ninguno', async () => {
    api.configuracion.mockResolvedValue(config({ decididoPorNico: {}, esperaAlContador: {} }));
    await pintar();
    expect(q('explicacion-girosAPropietariosEn1001')).toBeNull();
    expect(q('explicacion-saldo2815En1009')).toBeNull();
  });

  it('🔴 muestra lo heredado al lado del campo propio', async () => {
    await pintar();
    const heredado = q('del-anio-de-la-plataforma')!;
    expect(heredado.textContent).toContain('2026');
    expect(heredado.textContent).toContain('222222222');
    expect(heredado.textContent).toContain('Resolución 000162');
    // El campo propio arranca VACÍO, no en cero: vacío significa heredar.
    expect((q('tope-propio') as HTMLInputElement).value).toBe('');
    expect(q('frase-del-tope')!.textContent).toContain('Deja el campo vacío');
  });

  it('🔴 sin tope publicado dice que no se agrupa nada — nunca «$0»', async () => {
    api.configuracion.mockResolvedValue(config({ delAnioDeLaPlataforma: null }));
    await pintar();

    expect(q('del-anio-de-la-plataforma')!.textContent).toContain('no hay nada que heredar');
    expect(q('sin-tope-vigente')!.textContent).toContain('no se agrupa ningún tercero');
    expect(q('tope-de-cuantias-menores')!.textContent).not.toContain('$0');
  });

  it('🔴 guarda las tres claves del DTO y ninguna más (sin `anio`)', async () => {
    await pintar();
    await clic(q('switch-saldo2815En1009')!);
    await clic(q('guardar-configuracion')!);

    expect(api.guardarConfiguracion).toHaveBeenCalledWith({
      girosAPropietariosEn1001: false,
      saldo2815En1009: true,
      topeCuantiasMenoresCop: null,
    });
  });

  it('vuelve a pedir el GET después de guardar: el PUT devuelve la fila pelada', async () => {
    await pintar();
    expect(api.configuracion).toHaveBeenCalledTimes(1);

    await clic(q('switch-saldo2815En1009')!);
    await clic(q('guardar-configuracion')!);

    expect(api.configuracion).toHaveBeenCalledTimes(2);
  });

  it('sin cambios el botón está apagado y lo dice', async () => {
    await pintar();
    expect((q('guardar-configuracion') as HTMLButtonElement).disabled).toBe(true);
    expect(q('guardar-configuracion-motivo')!.textContent).toContain('No cambiaste nada');
  });

  it('un rol que no escribe ve el motivo en vez de un botón gris a secas', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo = 'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';
    await pintar();

    expect((q('switch-saldo2815En1009') as HTMLButtonElement).disabled).toBe(true);
    expect(q('guardar-configuracion-motivo')!.textContent).toContain('administrador o el contador');
  });

  it('sin la migración 70 explica qué falta y no deja guardar', async () => {
    api.configuracion.mockResolvedValue(
      config({
        disponible: false,
        motivo:
          'Falta la migración 20260919002000_no_deducible_y_configuracion_de_exogena: se usan los valores por defecto y guardar responde 503.',
      }),
    );
    await pintar();

    expect(q('configuracion-sin-migracion')!.textContent).toContain('20260919002000');
    expect(q('configuracion-sin-migracion')!.textContent).toContain('La aplica Víctor');
    expect((q('guardar-configuracion') as HTMLButtonElement).disabled).toBe(true);
    expect((q('switch-girosAPropietariosEn1001') as HTMLButtonElement).disabled).toBe(true);
  });
});
