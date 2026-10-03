/**
 * 🔴 ARREGLOS-6b (Nico, ARREGLOS-5 Q2 a): la cuarta cuenta de las diferencias,
 * el ANTICIPO DE IMPUESTOS, para las retenciones que la pasarela le practica a
 * la inmobiliaria en el giro de Leasefy. Se elige como las otras (con la
 * propuesta de la semilla, 135515); sin su migración del back, se ve pero no
 * se guarda y dice por qué, y las otras tres siguen funcionando.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { cuentas: vi.fn(), guardar: vi.fn(), porAsentar: vi.fn(), reprocesar: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/cuentas-de-las-diferencias', () => ({ cuentasDeLasDiferenciasApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/contabilidad/use-cuentas', () => ({
  useCuentas: () => ({ cuentas: [], cargando: false, error: null, recargar: vi.fn() }),
  etiquetaDeCuenta: (c: { codigo: string; nombre: string }) => `${c.codigo} · ${c.nombre}`,
}));
vi.mock('@/components/contabilidad/use-puede-escribir', () => ({
  usePuedeEscribir: () => ({ puede: true, motivo: null }),
}));
// El selector de verdad se apaga solo sin cuentas en el plan: aquí sólo importa si la fila lo apaga.
vi.mock('@/components/contabilidad/SelectorDeCuenta', () => ({
  SelectorDeCuenta: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" data-testid="selector" disabled={disabled}>
      cuenta
    </button>
  ),
}));

import { CuentasDeLasDiferencias } from './CuentasDeLasDiferencias';

const GASTO = { id: 'c-530505', codigo: '530505', nombre: 'Gastos bancarios' };
const RETEFUENTE = { id: 'c-135515', codigo: '135515', nombre: 'Retención en la fuente' };
const MOTIVO =
  'La cuenta del anticipo de impuestos todavía no se puede guardar: falta preparar la base de datos. Mientras tanto, las retenciones que practica la pasarela quedan por asentar.';

function datos(anticipo: { disponible: boolean; motivo: string | null; cuenta?: typeof RETEFUENTE | null }) {
  return {
    disponible: true,
    motivo: null,
    eventos: [
      {
        evento: 'GASTO_BANCARIO_COMISION',
        nombre: 'Comisión del banco o de la pasarela',
        explicacion: 'Gasto bancario.',
        codigoPropuesto: '530505',
        cuenta: GASTO,
        propuesta: GASTO,
        disponible: true,
        motivo: null,
      },
      {
        evento: 'ANTICIPO_DE_IMPUESTOS',
        nombre: 'Retenciones que practica la pasarela (anticipo de impuestos)',
        explicacion: 'Son un anticipo de sus impuestos, no un gasto.',
        codigoPropuesto: '135515',
        cuenta: anticipo.cuenta ?? null,
        propuesta: RETEFUENTE,
        disponible: anticipo.disponible,
        motivo: anticipo.motivo,
      },
    ],
    cuentaDelBanco: { id: 'c-banco', codigo: '111005', nombre: 'Bancos nacionales' },
    retencionEnLaLiquidacion: true,
  };
}

let raiz: Root | null = null;
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const fila = (evento: string) => $(`[data-testid="cuenta-de-${evento}"]`)!;

async function montar() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () => {
    raiz!.render(<CuentasDeLasDiferencias />);
  });
  await act(async () => {});
}

beforeEach(() => {
  api.porAsentar.mockResolvedValue({ total: 0, valorCop: 0 });
  api.guardar.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
});

describe('🔴 ARREGLOS-6b — la cuenta del anticipo de impuestos', () => {
  it('con su migración: se elige como las demás, con la propuesta de la semilla (135515)', async () => {
    api.cuentas.mockResolvedValue(datos({ disponible: true, motivo: null }));
    api.guardar.mockResolvedValue(datos({ disponible: true, motivo: null, cuenta: RETEFUENTE }));
    await montar();
    expect(fila('ANTICIPO_DE_IMPUESTOS').textContent).toContain('Retenciones que practica la pasarela (anticipo de impuestos)');
    expect((fila('ANTICIPO_DE_IMPUESTOS').querySelector('[data-testid="selector"]') as HTMLButtonElement).disabled).toBe(false);
    expect($('[data-testid="sin-guardar-ANTICIPO_DE_IMPUESTOS"]')).toBeNull();
    const usar = $('[data-testid="usar-propuesta-ANTICIPO_DE_IMPUESTOS"]')!;
    expect(usar.textContent).toContain('135515 · Retención en la fuente');
    await act(async () => {
      usar.click();
    });
    expect(api.guardar).toHaveBeenCalledWith([{ evento: 'ANTICIPO_DE_IMPUESTOS', cuentaId: 'c-135515' }]);
  });

  it('sin su migración: se ve, dice por qué, no se puede elegir ni usar la propuesta; la comisión sigue igual', async () => {
    api.cuentas.mockResolvedValue(datos({ disponible: false, motivo: MOTIVO }));
    await montar();
    expect($('[data-testid="sin-guardar-ANTICIPO_DE_IMPUESTOS"]')?.textContent).toBe(MOTIVO);
    expect((fila('ANTICIPO_DE_IMPUESTOS').querySelector('[data-testid="selector"]') as HTMLButtonElement).disabled).toBe(true);
    expect($('[data-testid="usar-propuesta-ANTICIPO_DE_IMPUESTOS"]')).toBeNull();
    // Las demás, como siempre.
    expect((fila('GASTO_BANCARIO_COMISION').querySelector('[data-testid="selector"]') as HTMLButtonElement).disabled).toBe(false);
    expect($('[data-testid="cuentas-de-las-diferencias-sin-la-migracion"]')).toBeNull();
  });

  it('el encabezado dice a dónde van las retenciones de la pasarela', async () => {
    api.cuentas.mockResolvedValue(datos({ disponible: true, motivo: null }));
    await montar();
    expect($('[data-testid="cuentas-de-las-diferencias"]')?.textContent).toContain(
      'Las retenciones que te practica la pasarela en el giro de Leasefy van al anticipo de impuestos.',
    );
  });
});
