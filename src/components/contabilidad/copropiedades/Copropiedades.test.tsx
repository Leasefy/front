/**
 * Copropiedades — el tercero dueño de la cuota de administración.
 *
 * Lo que más importa acá NO es que la tabla pinte: es que sin la migración la
 * pantalla NO ofrezca registrar nada. «Ninguna todavía» y «la base no tiene la
 * tabla» se ven igual desde una lista vacía, y ofrecer «Registrar la primera»
 * en el segundo caso lleva derecho a un 503.
 */

import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

const listar = vi.fn();
const crear = vi.fn();
vi.mock('@/lib/api/copropiedades.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/copropiedades.service')>(
    '@/lib/api/copropiedades.service',
  );
  return {
    ...real,
    copropiedadesApi: {
      listar: (...a: unknown[]) => listar(...a),
      crear: (...a: unknown[]) => crear(...a),
      asignarAMandato: vi.fn(),
    },
  };
});

import { Copropiedades } from './Copropiedades';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

const esperar = () => act(async () => { await Promise.resolve(); });

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(<Copropiedades />); });
  await esperar();
  await esperar();
}

beforeEach(() => {
  listar.mockReset();
  crear.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

const $ = (s: string) => document.querySelector<HTMLElement>(s);
const texto = () => document.body.textContent ?? '';

describe('Copropiedades', () => {
  it('lista las copropiedades con su NIT y su dígito de verificación', async () => {
    listar.mockResolvedValue({
      faltaLaMigracion: false,
      migracion: 'm',
      copropiedades: [
        {
          id: 'c-1',
          nombre: 'Conjunto Altos del Poblado',
          nit: '900123456',
          digitoVerificacion: 7,
          direccion: 'Cra. 43A #7-50',
          activa: true,
          inmuebles: 12,
        },
      ],
    });
    await montar();
    expect(texto()).toContain('Conjunto Altos del Poblado');
    expect(texto()).toContain('900.123.456-7');
    expect(document.querySelectorAll('[data-testid="fila-de-copropiedad"]')).toHaveLength(1);
  });

  /**
   * 🔴 EL PUNTO DE ESTA PANTALLA. Sin la migración, registrar responde 503:
   * ofrecerlo sería mandar a alguien contra una pared.
   */
  it('🔴 sin la migración NO ofrece registrar, y dice qué falta', async () => {
    listar.mockResolvedValue({
      faltaLaMigracion: true,
      migracion: '20260920090000_copropiedades_como_tercero',
      copropiedades: [],
    });
    await montar();
    expect($('[data-testid="abrir-nueva-copropiedad"]')).toBeNull();
    expect(texto()).not.toContain('Registrar la primera');
    const cartel = $('[data-testid="falta-la-migracion"]')!;
    expect(cartel).not.toBeNull();
    /* 🔴 El identificador de la migración NO se le muestra al cliente —no
       puede aplicarla y no sabe qué es— pero tampoco se pierde: queda en el
       `title` para quien tenga que diagnosticar. */
    expect(texto()).not.toContain('20260920090000_copropiedades_como_tercero');
    expect(cartel.querySelector('[title]')?.getAttribute('title')).toContain(
      '20260920090000_copropiedades_como_tercero',
    );
  });

  it('con la migración aplicada y sin filas, SÍ ofrece registrar la primera', async () => {
    listar.mockResolvedValue({
      faltaLaMigracion: false,
      migracion: 'm',
      copropiedades: [],
    });
    await montar();
    expect($('[data-testid="abrir-nueva-copropiedad"]')).not.toBeNull();
    expect(texto()).toContain('Registrar la primera');
    expect($('[data-testid="falta-la-migracion"]')).toBeNull();
  });

  it('si la lista no carga lo dice DENTRO de la tabla, con reintento', async () => {
    listar.mockRejectedValue(new Error('500'));
    await montar();
    expect(texto()).toContain('No se pudo leer la lista');
    expect(document.querySelector('table')).not.toBeNull();
  });

  it('el NIT se guarda sin puntos aunque se escriba con ellos', async () => {
    listar.mockResolvedValue({ faltaLaMigracion: false, migracion: 'm', copropiedades: [] });
    crear.mockResolvedValue({ id: 'c-9', nombre: 'Torre 1', nit: '900123456', digitoVerificacion: 7 });
    await montar();
    await act(async () => {
      $('[data-testid="abrir-nueva-copropiedad"]')!.click();
    });
    const nombre = document.querySelector<HTMLInputElement>('#copro-nombre')!;
    const nit = document.querySelector<HTMLInputElement>('#copro-nit')!;
    const set = (el: HTMLInputElement, v: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await act(async () => {
      set(nombre, 'Torre 1');
      set(nit, '900.123.456');
    });
    await act(async () => {
      $('[data-testid="guardar-copropiedad"]')!.click();
    });
    await esperar();
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Torre 1', nit: '900123456' }),
    );
  });
});
