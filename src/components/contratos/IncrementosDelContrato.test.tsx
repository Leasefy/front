import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    incrementos: vi.fn(),
    fijarTasaAnual: vi.fn(),
    digitarIncremento: vi.fn(),
    generarCarta: vi.fn(),
    revisarCarta: vi.fn(),
    enviarCarta: vi.fn(),
    vencidos: vi.fn(),
    extender: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service';
import { IncrementosDelContrato } from './IncrementosDelContrato';
import { RenovarContratoVencido } from './RenovarContratoVencido';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
let root: Root | null = null;
let container: HTMLDivElement | null = null;

const aniversario = {
  desde: '2026-08-21',
  origen: 'IPC',
  porcentaje: 5.1,
  canonAnteriorCop: 1_000_000,
  canonNuevoCop: 1_051_000,
  motivo: null,
  carta: null,
};

async function montar(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(el);
  });
  await act(async () => {});
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe('<IncrementosDelContrato> (17-09)', () => {
  it('vivienda: muestra el aniversario al IPC y deja generar la carta', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: false,
    });
    api.generarCarta.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, carta: { estado: 'PENDIENTE_DE_REVISION', contenido: 'Señor(a)…', generadaAt: null, revisadaAt: null, enviadaAt: null } }],
      disponible: true,
      envioHabilitado: false,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const bloque = document.querySelector('[data-testid="aniversario-2026-08-21"]')!;
    expect(bloque.textContent).toContain('IPC del año anterior');
    expect(bloque.textContent).toContain('5.1 %');
    expect(document.querySelector('[data-testid="tasa-pactada"]')).toBeNull();

    const generar = [...bloque.querySelectorAll('button')].find((b) => b.textContent === 'Generar la carta')!;
    await act(async () => generar.click());
    expect(api.generarCarta).toHaveBeenCalledWith('c1', '2026-08-21');
    expect(document.body.textContent).toContain('Carta por revisar');
  });

  it('🔴 con la carta revisada, el envío apagado deja el botón muerto y lo dice', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, carta: { estado: 'REVISADA', contenido: 'x', generadaAt: null, revisadaAt: null, enviadaAt: null } }],
      disponible: true,
      envioHabilitado: false,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const enviar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Enviar la carta') as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    expect(document.body.textContent).toContain('El envío de cartas está apagado');
  });

  it('local comercial: guarda la tasa pactada', async () => {
    const comercial = {
      uso: 'COMERCIAL',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, origen: null, porcentaje: null, canonNuevoCop: 1_000_000, motivo: 'Local comercial sin incremento digitado ni tasa pactada: el canon no sube.' }],
      disponible: true,
      envioHabilitado: false,
    };
    api.incrementos.mockResolvedValue(comercial);
    api.fijarTasaAnual.mockResolvedValue({ ...comercial, tasaAnualPactadaPct: 6 });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    const input = document.querySelector('[data-testid="tasa-pactada"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '6');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const guardar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Guardar tasa')!;
    await act(async () => guardar.click());
    expect(api.fijarTasaAnual).toHaveBeenCalledWith('c1', 6);
  });
});

describe('<RenovarContratoVencido> (17-09)', () => {
  it('ofrece las dos salidas y renueva por el término inicial', async () => {
    api.vencidos.mockResolvedValue({
      cuantos: 1,
      cuantosSinRenovacion: 1,
      aviso: null,
      contratos: [{ id: 'c1', endDate: '2026-08-20', renovarPorTerminoInicialHasta: '2027-08-20' }],
    });
    api.extender.mockResolvedValue({ contractId: 'c1', modo: 'TERMINO_INICIAL', finAnterior: '2026-08-20', finNuevo: '2027-08-20' });
    const onRenovado = vi.fn();
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={onRenovado} />);
    expect(document.body.textContent).toContain('No se prorroga solo');
    const porDias = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Renovar por los días ocupados') as HTMLButtonElement;
    expect(porDias.disabled).toBe(true);
    const termino = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Renovar por el término inicial'))!;
    await act(async () => termino.click());
    expect(api.extender).toHaveBeenCalledWith('c1', { modo: 'TERMINO_INICIAL' });
    expect(onRenovado).toHaveBeenCalled();
  });

  it('un contrato que no está vencido no muestra nada', async () => {
    api.vencidos.mockResolvedValue({ cuantos: 0, cuantosSinRenovacion: 0, aviso: null, contratos: [] });
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={() => {}} />);
    expect(document.querySelector('[data-testid="renovar-contrato-vencido"]')).toBeNull();
  });
});
