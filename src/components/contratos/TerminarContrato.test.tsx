import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `vi.mock` se iza sobre todo lo demás del módulo: los mocks se crean DENTRO
// de la fábrica y se leen después, importando el módulo ya mockeado.
vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    motivosDeTerminacion: vi.fn(),
    vistaPreviaDeTerminacion: vi.fn(),
    terminar: vi.fn(),
    vencidos: vi.fn(),
    registrarCesion: vi.fn(),
  },
}));
// `vi.mock` se iza sobre las constantes: el objeto se crea DENTRO de la
// fábrica y se lee después con `vi.mocked`.
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service';
import { toast } from '@/components/ui/toast';
import { TerminarContrato } from './TerminarContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  api.motivosDeTerminacion.mockResolvedValue({
    motivos: [
      { codigo: 'MUTUO_ACUERDO', nombre: 'Mutuo acuerdo', exigeNota: false },
      { codigo: 'OTRO', nombre: 'Otro', exigeNota: true },
    ],
  });
  api.vistaPreviaDeTerminacion.mockResolvedValue({
    puedeTerminarse: true,
    razon: null,
    finPactado: '2026-12-31',
    disponible: true,
    prorrateoDelUltimoMes: {
      mes: '2026-09',
      diasOcupados: 12,
      diasDelMes: 30,
      valorCop: 1200000,
      canonMensualCop: 3000000,
    },
  });
  api.terminar.mockResolvedValue({
    contractId: 'c1',
    terminadoEn: '2026-09-12',
    motivo: 'MUTUO_ACUERDO',
    motivoLegible: 'Mutuo acuerdo',
    finPactadoOriginal: '2026-12-31',
    inmuebleLiberado: true,
    prorrateoDelUltimoMes: null,
  });
});

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

async function montar(onTerminado = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <TerminarContrato
        contractId="c1"
        abierto
        onCerrar={vi.fn()}
        onTerminado={onTerminado}
      />,
    );
  });
  return document.body;
}

const q = (sel: string) => document.body.querySelector(sel) as HTMLElement | null;

describe('TerminarContrato', () => {
  it('🔴 muestra qué paga el último mes ANTES de confirmar', async () => {
    // La auditoría marcó que las acciones destructivas de este panel se
    // disparan sin decir qué se llevan por delante (C11/C12/M5).
    await montar();
    const bloque = q('[data-testid="prorrateo-del-ultimo-mes"]');
    expect(bloque?.textContent).toContain('12 días de 30');
    expect(bloque?.textContent).toContain('2026-09');
  });

  it('dice hasta cuándo se había pactado: el plazo original no se pierde', async () => {
    await montar();
    expect(document.body.textContent).toContain('Se había pactado hasta el 2026-12-31');
  });

  it('🔴 no deja confirmar sin motivo', async () => {
    await montar();
    const boton = q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  it('🔴 «Otro» sin nota queda bloqueado: un motivo sin explicación no sirve después', async () => {
    await montar();
    const select = q('[data-testid="motivo-de-terminacion"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'OTRO';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect((q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con motivo simple sí deja confirmar y manda lo que se eligió', async () => {
    const onTerminado = vi.fn();
    await montar(onTerminado);
    const select = q('[data-testid="motivo-de-terminacion"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'MUTUO_ACUERDO';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const boton = q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
    await act(async () => { boton.click(); });
    expect(api.terminar).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ motivo: 'MUTUO_ACUERDO' }),
    );
    expect(onTerminado).toHaveBeenCalled();
  });

  it('🔴 regla 9: manda la penalidad pactada y dice cuándo se cobra', async () => {
    await montar();
    const select = q('[data-testid="motivo-de-terminacion"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'MUTUO_ACUERDO';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const input = q('[data-testid="penalidad-de-terminacion"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '3300000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(document.body.textContent).toContain('una sola vez, en la cuota del último mes');
    await act(async () => { (q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement).click(); });
    expect(api.terminar).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ motivo: 'MUTUO_ACUERDO', penalidadCop: 3_300_000 }),
    );
  });

  it('🔴 el mensaje del back llega al usuario, no un «algo salió mal»', async () => {
    api.terminar.mockRejectedValue(new Error('La terminación es posterior al fin pactado.'));
    await montar();
    const select = q('[data-testid="motivo-de-terminacion"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'MUTUO_ACUERDO';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { (q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement).click(); });
    expect(toastMock.error).toHaveBeenCalledWith(
      'No se pudo terminar el contrato.',
      expect.objectContaining({
        description: 'La terminación es posterior al fin pactado.',
      }),
    );
  });

  it('🔴 si el back dice que no se puede, lo dice y bloquea', async () => {
    api.vistaPreviaDeTerminacion.mockResolvedValue({
      puedeTerminarse: false,
      razon: 'Falta aplicar la migración 20260915170000_contratos_terminacion_anticipada.',
      finPactado: null,
      disponible: false,
      prorrateoDelUltimoMes: null,
    });
    await montar();
    expect(q('[data-testid="razon-para-no-terminar"]')?.textContent).toContain('Falta aplicar la migración');
    const select = q('[data-testid="motivo-de-terminacion"]') as HTMLSelectElement;
    await act(async () => {
      select.value = 'MUTUO_ACUERDO';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect((q('[data-testid="confirmar-terminacion"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin canon no inventa un número: lo dice', async () => {
    api.vistaPreviaDeTerminacion.mockResolvedValue({
      puedeTerminarse: true,
      razon: null,
      finPactado: null,
      disponible: true,
      prorrateoDelUltimoMes: null,
    });
    await montar();
    expect(q('[data-testid="sin-prorrateo"]')?.textContent).toContain('no se puede calcular');
  });
});
