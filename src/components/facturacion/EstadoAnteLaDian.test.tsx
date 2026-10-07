/**
 * DIAN-FEEL (04-10-2026): el aviso de Facturación y los pasos de
 * Configuración → Facturación con la cuenta de FEEL de Leasefy.
 *
 *  · con FEEL prendido y la inmobiliaria lista (en producción), el aviso
 *    «todavía no se transmiten» DESAPARECE;
 *  · si no, dice qué le falta a ESTA inmobiliaria;
 *  · los pasos nunca piden credenciales de FEEL (la cuenta es de Leasefy).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { estadoAnteLaDian, permisos } = vi.hoisted(() => ({
  estadoAnteLaDian: vi.fn(),
  permisos: { valor: { isAdmin: true } as { isAdmin: boolean } | null },
}));

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-electronica.service')>(
    '@/lib/api/facturacion-electronica.service',
  );
  return { ...real, facturacionElectronicaService: { estadoAnteLaDian } };
});

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));

import { BannerDeLaDian, PasosParaTransmitir } from './EstadoAnteLaDian';

const PASOS = [
  { id: 'datos', titulo: 'Los datos de tu inmobiliaria', detalle: 'NIT 900123456-7', quien: 'INMOBILIARIA', hecho: true, accion: null },
  {
    id: 'habilitacion',
    titulo: 'Escoger a FEEL como tu proveedor tecnológico ante la DIAN',
    detalle: 'No tienes que abrir una cuenta en FEEL ni darnos claves: la cuenta es de Leasefy.',
    quien: 'INMOBILIARIA',
    hecho: false,
    accion: null,
  },
  {
    id: 'resolucion',
    titulo: 'Tu resolución de facturación vigente, cargada en Leasefy',
    detalle: 'Cárgala.',
    quien: 'INMOBILIARIA',
    hecho: false,
    accion: { texto: 'Cargar la resolución', href: '/panel/inmobiliaria/facturacion?tab=resolucion' },
  },
  { id: 'registro', titulo: 'Leasefy registra a tu inmobiliaria en su cuenta de FEEL', detalle: '…', quien: 'LEASEFY', hecho: false, accion: null },
  { id: 'coincide', titulo: 'La resolución de Leasefy y la de FEEL son la misma', detalle: '…', quien: 'LEASEFY', hecho: false, accion: null },
];

function estado(over: Record<string, unknown> = {}) {
  return {
    estado: 'FALTA_RESOLUCION',
    titulo: 'Falta la resolución',
    descripcion: 'Tus facturas todavía no se transmiten a la DIAN: falta cargar tu resolución.',
    transmite: false,
    ambiente: null,
    pasos: PASOS,
    avisos: [],
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(nodo: React.ReactNode) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(nodo);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  permisos.valor = { isAdmin: true };
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const q = (s: string) => host.querySelector(s);
const ANTES = { titulo: 'Tus facturas se numeran, pero todavía no se transmiten', descripcion: 'texto de antes' };

describe('BannerDeLaDian', () => {
  it('🔴 con FEEL prendido y la inmobiliaria lista (producción): el aviso desaparece', async () => {
    estadoAnteLaDian.mockResolvedValue(estado({ estado: 'LISTA', transmite: true, ambiente: 'PRODUCCION' }));
    await pintar(<BannerDeLaDian textoDeAntes={ANTES} />);
    expect(q('[data-testid="banner-dian"]')).toBeNull();
  });

  it('🔴 si no, dice qué le falta a ESTA inmobiliaria y el administrador ve «Ver los pasos»', async () => {
    estadoAnteLaDian.mockResolvedValue(estado());
    await pintar(<BannerDeLaDian textoDeAntes={ANTES} />);
    const banner = q('[data-testid="banner-dian"]')!;
    expect(banner.getAttribute('data-estado')).toBe('FALTA_RESOLUCION');
    expect(banner.textContent).toContain('Falta la resolución');
    expect(q('[data-testid="dian-ver-pasos"]')!.getAttribute('href')).toBe(
      '/panel/inmobiliaria/configuracion/facturacion',
    );
  });

  it('el contador no entra a Configuración: se le dice quién ve los pasos', async () => {
    permisos.valor = { isAdmin: false };
    estadoAnteLaDian.mockResolvedValue(estado());
    await pintar(<BannerDeLaDian textoDeAntes={ANTES} />);
    expect(q('[data-testid="dian-ver-pasos"]')).toBeNull();
    expect(q('[data-testid="dian-pidele-al-administrador"]')!.textContent).toContain('administrador');
  });

  it('en el ambiente de pruebas sigue el aviso (lo transmitido no vale ante la DIAN)', async () => {
    estadoAnteLaDian.mockResolvedValue(estado({ estado: 'LISTA', transmite: true, ambiente: 'PRUEBAS' }));
    await pintar(<BannerDeLaDian textoDeAntes={ANTES} />);
    expect(q('[data-testid="banner-dian"]')!.textContent).toContain('ambiente de pruebas');
  });

  it('un back sin la ruta: el texto de siempre', async () => {
    estadoAnteLaDian.mockRejectedValue(new Error('404'));
    await pintar(<BannerDeLaDian textoDeAntes={ANTES} />);
    expect(q('[data-testid="banner-dian"]')!.textContent).toContain(ANTES.titulo);
  });
});

describe('PasosParaTransmitir', () => {
  it('🔴 muestra el estado y los cinco pasos, quién hace cada uno, y nunca pide credenciales', async () => {
    estadoAnteLaDian.mockResolvedValue(estado());
    await pintar(<PasosParaTransmitir />);
    expect(q('[data-testid="pasos-estado"]')!.textContent).toContain('Falta la resolución');
    expect(host.querySelectorAll('[data-testid^="paso-"][data-hecho]')).toHaveLength(5);
    expect(q('[data-testid="paso-datos"]')!.getAttribute('data-hecho')).toBe('si');
    expect(q('[data-testid="paso-registro"]')!.textContent).toContain('Lo hace Leasefy');
    expect(q('[data-testid="paso-resolucion"]')!.textContent).toContain('Lo haces tú');
    expect(q('[data-testid="paso-accion-resolucion"]')!.getAttribute('href')).toBe(
      '/panel/inmobiliaria/facturacion?tab=resolucion',
    );
    expect(host.querySelector('input')).toBeNull();
    expect(host.textContent).not.toMatch(/token/i);
  });

  it('lista: «Lista para transmitir» con sus avisos', async () => {
    estadoAnteLaDian.mockResolvedValue(
      estado({
        estado: 'LISTA',
        titulo: 'Lista para transmitir',
        transmite: true,
        ambiente: 'PRODUCCION',
        pasos: PASOS.map((p) => ({ ...p, hecho: true, accion: null })),
        avisos: ['Las notas débito todavía no se transmiten.'],
      }),
    );
    await pintar(<PasosParaTransmitir />);
    expect(q('[data-testid="pasos-estado"]')!.getAttribute('data-estado')).toBe('LISTA');
    expect(q('[data-testid="pasos-avisos"]')!.textContent).toContain('notas débito');
  });
});
