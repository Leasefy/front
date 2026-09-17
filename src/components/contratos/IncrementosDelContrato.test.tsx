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
    prorroga: vi.fn(),
    registrarConstancia: vi.fn(),
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
  it('vivienda: muestra el aniversario al IPC y deja ver la carta', async () => {
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

    const generar = [...bloque.querySelectorAll('button')].find((b) => b.textContent === 'Ver y editar la carta')!;
    await act(async () => generar.click());
    expect(api.generarCarta).toHaveBeenCalledWith('c1', '2026-08-21');
    expect(document.body.textContent).toContain('Carta por revisar');
  });

  it('🔴 D6: la carta por enviar se manda con UN clic; si el correo se simula, lo dice y no hay constancia', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, bandeja: { estado: 'POR_ENVIAR', diasParaElAniversario: 12, alertaRoja: false } }],
      disponible: true,
      envioHabilitado: true,
      correoSaleDeVerdad: false,
      diasAntesDeLaCarta: 30,
    });
    api.enviarCarta.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [aniversario],
      disponible: true,
      envioHabilitado: true,
      ultimoEnvio: { resultado: 'SIMULADA', mensaje: 'No salió: EMAIL_DELIVERY_ENABLED' },
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    expect(document.body.textContent).toContain('faltan 12 días');
    expect(document.querySelector('[data-testid="correo-simulado"]')).not.toBeNull();
    const enviar = document.querySelector('[data-testid="enviar-carta-2026-08-21"]') as HTMLButtonElement;
    await act(async () => enviar.click());
    expect(api.enviarCarta).toHaveBeenCalledWith('c1', '2026-08-21', undefined);
    const { toast } = await import('@/components/ui/toast');
    expect(toast.error).toHaveBeenCalledWith('La carta no salió.', expect.anything());
  });

  it('🔴 D6: llegado el aniversario sin constancia, alerta roja; y se puede registrar la constancia de otro medio', async () => {
    api.incrementos.mockResolvedValue({
      uso: 'VIVIENDA',
      tasaAnualPactadaPct: null,
      aniversarios: [{ ...aniversario, bandeja: { estado: 'VENCIDA_SIN_CONSTANCIA', diasParaElAniversario: -3, alertaRoja: true } }],
      disponible: true,
      envioHabilitado: true,
    });
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />);
    expect(document.querySelector('[data-testid="alerta-sin-constancia-2026-08-21"]')).not.toBeNull();
    const otroMedio = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Se entregó por otro medio')!;
    await act(async () => otroMedio.click());
    expect(document.querySelector('[data-testid="constancia-2026-08-21"]')).not.toBeNull();
  });

  it('sin la migración de la constancia, enviar queda muerto y lo dice', async () => {
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
    expect(document.body.textContent).toContain('Falta una actualización de la base para enviar');
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
    api.prorroga.mockResolvedValue({ accion: 'ALERTA_AVISO_DE_NO_RENOVACION' });
    api.extender.mockResolvedValue({ contractId: 'c1', modo: 'TERMINO_INICIAL', finAnterior: '2026-08-20', finNuevo: '2027-08-20' });
    const onRenovado = vi.fn();
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={onRenovado} />);
    expect(document.body.textContent).toContain('con aviso de no renovación');
    const porDias = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Renovar por los días ocupados') as HTMLButtonElement;
    expect(porDias.disabled).toBe(true);
    const termino = [...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Renovar por el término inicial'))!;
    await act(async () => termino.click());
    expect(api.extender).toHaveBeenCalledWith('c1', { modo: 'TERMINO_INICIAL' });
    expect(onRenovado).toHaveBeenCalled();
  });

  it('🔴 D5: vencido SIN aviso de no renovación no ofrece renovar (se prorroga)', async () => {
    api.vencidos.mockResolvedValue({
      cuantos: 1,
      cuantosSinRenovacion: 1,
      aviso: null,
      contratos: [{ id: 'c1', endDate: '2026-08-20', renovarPorTerminoInicialHasta: '2027-08-20' }],
    });
    api.prorroga.mockResolvedValue({ accion: 'PRORROGAR' });
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={() => {}} />);
    expect(document.querySelector('[data-testid="renovar-contrato-vencido"]')).toBeNull();
  });

  it('un contrato que no está vencido no muestra nada', async () => {
    api.prorroga.mockResolvedValue({ accion: 'NO_VENCIDO' });
    api.vencidos.mockResolvedValue({ cuantos: 0, cuantosSinRenovacion: 0, aviso: null, contratos: [] });
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={() => {}} />);
    expect(document.querySelector('[data-testid="renovar-contrato-vencido"]')).toBeNull();
  });
});
