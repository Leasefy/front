/**
 * El tablero del propietario (Nico eligió «Tablero + 3 secciones», 21-10-2026):
 * cada contrato vigente dice en qué mes va, si el inquilino pagó el mes y si la
 * inmobiliaria ya le giró — y el caso «no ha pagado pero ya te giraron».
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { inmueble: vi.fn(), giros: vi.fn() } }));
vi.mock('@/lib/api/portal-del-propietario.service', () => ({ portalDelPropietarioApi: api }));
vi.mock('@/lib/fechas/fecha-de-la-casa', async (importar) => ({
  ...(await importar<typeof import('@/lib/fechas/fecha-de-la-casa')>()),
  hoyEnColombia: () => '2026-10-21',
}));

import { ContratosConLaInmobiliaria } from './ContratosConLaInmobiliaria';
import { contrato, estadoDeCuenta } from '@/components/estado-de-cuenta/ejemplo-de-prueba';

let host: HTMLDivElement;
let root: Root;

const ficha = (estado: 'PAGADO' | 'VENCIDO') => ({
  contrato: { id: 'ct-1', estado: 'VIGENTE', inicio: '2026-03-01', fin: '2027-02-28', canonCop: 1_850_000 },
  inmueble: { titulo: 'Apto', direccion: 'Cra 43 #10-20', ciudad: 'Medellín', tipo: 'Apartamento' },
  inmobiliaria: 'Portofino',
  inquilino: { nombre: 'Ana Pérez' },
  mesActual: { mes: '2026-10', estado, pagadoEl: estado === 'PAGADO' ? '2026-10-04' : null, vence: '2026-10-05', pagadoCop: 0, pendienteCop: 1_850_000 },
  desocupado: null,
  documentos: { mandato: null, contrato: null },
});

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const doc = estadoDeCuenta({ contratos: [contrato({ id: 'ct-1', rol: 'PROPIETARIO', vigente: true })] });
  await act(async () => {
    root.render(<ContratosConLaInmobiliaria doc={doc} />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  api.inmueble.mockReset();
  api.giros.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const texto = (id: string) => host.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';

describe('cómo va cada contrato', () => {
  it('dice el inquilino, en qué mes va, que pagó y que la inmobiliaria ya giró', async () => {
    api.inmueble.mockResolvedValue(ficha('PAGADO'));
    api.giros.mockResolvedValue({ giros: [{ id: 'g', inmobiliaria: 'Portofino', mes: '2026-10', valorCop: 1, estado: 'GIRADO', giradoEl: null, banco: null, cuenta: null, referencia: null, devolucion: null }] });
    await montar();
    expect(texto('como-va-el-contrato')).toContain('Ana Pérez');
    expect(texto('avance-del-contrato')).toContain('Mes 8 de 12');
    expect(texto('mes-del-inquilino')).toContain('Pagó octubre');
    expect(texto('giro-del-mes')).toContain('Inmobiliaria: ya te giró octubre');
    expect(host.querySelector('[data-testid="te-giraron-aunque-no-pago"]')).toBeNull();
  });

  it('el caso de la reunión: el inquilino no ha pagado y la inmobiliaria igual ya te giró', async () => {
    api.inmueble.mockResolvedValue(ficha('VENCIDO'));
    api.giros.mockResolvedValue({ giros: [{ id: 'g', inmobiliaria: 'Portofino', mes: '2026-10', valorCop: 1, estado: 'GIRADO', giradoEl: null, banco: null, cuenta: null, referencia: null, devolucion: null }] });
    await montar();
    expect(texto('mes-del-inquilino')).toContain('No ha pagado octubre');
    expect(texto('te-giraron-aunque-no-pago')).toContain('igual ya te giró');
  });

  it('si la ficha no responde, la fila queda como antes (sin inventar)', async () => {
    api.inmueble.mockRejectedValue(new Error('500'));
    api.giros.mockResolvedValue({ giros: [] });
    await montar();
    expect(host.querySelector('[data-testid="como-va-el-contrato"]')).toBeNull();
    expect(host.textContent).toContain('CL 129 SUR');
  });
});
