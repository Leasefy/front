/**
 * GLOW UP (21-10-2026, reunión con Portofino): la ficha del inmueble del
 * propietario dice primero lo que viene a saber: si su inquilino está al día
 * y si la inmobiliaria ya le giró (aunque el inquilino no haya pagado).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

import type { FichaDelInmueble, GiroDelPropietario } from '@/lib/api/portal-del-propietario.service';

const { datos } = vi.hoisted(() => ({
  datos: { ficha: null as FichaDelInmueble | null, giros: [] as GiroDelPropietario[] },
}));

vi.mock('@/lib/api/portal-del-propietario.service', () => ({
  portalDelPropietarioApi: {
    inmueble: () => Promise.resolve(datos.ficha),
    giros: () => Promise.resolve({ giros: datos.giros }),
    documento: vi.fn(),
  },
}));

import FichaDelInmueblePage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function ficha(parcial: Partial<FichaDelInmueble> = {}): FichaDelInmueble {
  return {
    contrato: { id: 'k1', estado: 'VIGENTE', inicio: '2026-01-10', fin: '2027-01-09', canonCop: 2_350_000 },
    inmueble: { titulo: 'Apto 1003', direccion: 'CL 129 SUR 45-10 AP 1003', ciudad: 'Medellín', tipo: 'APARTAMENTO' },
    inmobiliaria: 'Portofino',
    inquilino: { nombre: 'Ana Pérez' },
    mesActual: { mes: '2026-10', estado: 'VENCIDO', pagadoEl: null, vence: '2026-10-05', pagadoCop: 0, pendienteCop: 2_350_000 },
    desocupado: null,
    documentos: { mandato: null, contrato: null },
    ...parcial,
  };
}

let root: Root | null = null;

async function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  const params = Promise.resolve({ contractId: 'k1' });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <FichaDelInmueblePage params={params} />
      </Suspense>,
    );
  });
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

function antes(a: Element | null, b: Element | null): boolean {
  if (!a || !b) throw new Error('falta un bloque');
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  datos.ficha = ficha();
  datos.giros = [{ id: 'g1', mes: '2026-10', valorCop: 2_115_000, estado: 'GIRADO' } as GiroDelPropietario];
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('La ficha del inmueble del propietario', () => {
  it('el encabezado común: la dirección, el estado al lado y las acciones arriba', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('CL 129 SUR 45-10 AP 1003');
    expect(encabezado?.contains($('estado-del-contrato'))).toBe(true);
    expect(encabezado?.textContent).toContain('Lo administra Portofino');
    expect($('ficha-hacer-solicitud')?.getAttribute('href')).toBe('/panel/solicitudes/nueva');
    expect($('ficha-ver-giros')?.getAttribute('href')).toBe('/panel/estado-de-cuenta');
  });

  it('«Este mes» va antes que las cifras: si pagó, si ya le giraron y el caso de los dos', async () => {
    await montar();
    expect(antes($('inquilino'), $('cifras-del-contrato'))).toBe(true);
    expect($('mes-del-inquilino')?.textContent).toContain('No ha pagado');
    expect($('giro-del-mes')?.textContent).toContain('Ya te giró');
    expect($('te-giraron-aunque-no-pago')?.textContent).toContain('Portofino igual ya te giró');
  });

  it('dice en qué mes del contrato va', async () => {
    await montar();
    expect($('avance-del-contrato')?.textContent).toMatch(/Mes \d+ de 12 del contrato/);
  });

  it('sin los giros, la ficha se ve igual (sin el giro del mes)', async () => {
    datos.giros = [];
    await montar();
    expect($('giro-del-mes')?.textContent).toContain('Todavía no te gira');
    expect($('te-giraron-aunque-no-pago')).toBeNull();
  });

  it('vuelve al inicio', async () => {
    await montar();
    expect($('ficha-volver')?.querySelector('a')?.getAttribute('href')).toBe('/panel');
  });
});
