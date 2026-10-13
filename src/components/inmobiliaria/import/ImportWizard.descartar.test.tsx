/**
 * ImportWizard.descartar.test.tsx — descartar una carga sin tener que entrar.
 *
 * 🔴 Una carga abandonada frena el paso entero del muro de migración: basta
 * UNA fila LISTO, en cualquier lote de la agencia, para que «Propiedades» se
 * quede en «pendiente» y el pie del muro no ofrezca «Seguir con Contratos».
 *
 * Hasta el 2026-09-11 la única forma de sacar una de esas cargas del medio
 * era retomarla, esperar a que cargara la revisión y buscar «Descartar lote
 * completo» adentro. Nico llegó a tener CUATRO encima —re-subidas del mismo
 * archivo— y se quedó sin salida en el paso 3.
 *
 * T-0130 (5409c377) movió la tarjeta a `CargasAMedias` («Tienes N cargas a
 * medias»): sale en cualquier paso, Descartar pide confirmación —es lo único
 * destructivo— y los 409 del lote se traducen por `code` (`mensajeDeCarga`).
 * T-0131 (a2b267c6) cuenta lo que entró como «N de M creadas».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('framer-motion', () => ({
  motion: { div: (p: Record<string, unknown>) => <div>{p.children as React.ReactNode}</div> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

const { apiMock } = vi.hoisted(() => ({
  apiMock: { lotesAbiertos: vi.fn(), descartarLote: vi.fn() },
}));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmuebles-importacion.service')
  >('@/lib/api/inmuebles-importacion.service');
  return { ...actual, inmueblesImportacionApi: apiMock };
});

/* Los pasos, inertes: lo que se mira es la tarjeta de cargas, que desde T-0130
   se dibuja en cualquier paso. */
vi.mock('./steps/StepChooseMethod', () => ({ StepChooseMethod: () => <div data-testid="paso-1" /> }));
vi.mock('./steps/StepUploadFile', () => ({ StepUploadFile: () => <div /> }));
vi.mock('./steps/StepColumnMapping', () => ({ StepColumnMapping: () => <div /> }));
vi.mock('./steps/StepConfirmImport', () => ({ StepConfirmImport: () => <div /> }));
vi.mock('./steps/StepSoftwareMigration', () => ({ StepSoftwareMigration: () => <div /> }));
vi.mock('./steps/StepPortalImport', () => ({ StepPortalImport: () => <div /> }));
vi.mock('./steps/StepPasteLinks', () => ({ StepPasteLinks: () => <div /> }));

import { ImportWizard } from './ImportWizard';
import { ApiError } from '@/lib/api/client';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

function lote(over: Partial<EstadoDeLoteInmuebles>): EstadoDeLoteInmuebles {
  return {
    lote: 'lote-x',
    estado: 'LISTO',
    total: 2_864,
    procesadas: 2_864,
    pendientes: 0,
    listos: 1_381,
    activados: 0,
    descartados: 0,
    jobId: null,
    error: null,
    creadoEn: '2026-09-10T12:00:00.000Z',
    // El back de T-0130 manda siempre la etapa; `LISTA` = ya en revisión.
    fase: 'LISTA',
    ...over,
  };
}

/*
 * T-0152 — al montar, el asistente se ata solo a la carga abierta MÁS RECIENTE
 * (la tarjeta no la repite). Estas pruebas miran la tarjeta de las OTRAS, así que
 * cada lista trae delante esa carga «actual».
 */
const actual = () => lote({ lote: 'actual', creadoEn: '2099-01-01T12:00:00.000Z' });

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  Object.values(toastMock).forEach((f) => f.mockClear());
  apiMock.lotesAbiertos.mockReset();
  apiMock.descartarLote.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportWizard congelado={false} onOcupado={vi.fn()} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Descartar y confirmar en el diálogo (T-0130: Descartar pide confirmación). */
async function descartarYConfirmar(lote: string) {
  await act(async () => {
    q(`descartar-${lote}`)!.click();
  });
  expect(q('dialogo-descartar-carga')).not.toBeNull();
  // Hasta confirmar no sale nada: abrir el diálogo no descarta.
  expect(apiMock.descartarLote).not.toHaveBeenCalled();
  await act(async () => {
    q('confirmar-descartar-carga')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<ImportWizard> — las cargas sin terminar se pueden descartar desde la tarjeta', () => {
  it('descarta sin entrar, lo saca de la lista y dice cuántas filas quedaron fuera', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([
      actual(),
      lote({ lote: 'vieja-a', creadoEn: '2026-09-10T12:00:00.000Z' }),
      lote({ lote: 'vieja-b', listos: 1_210, creadoEn: '2026-09-11T04:00:00.000Z' }),
    ]);
    apiMock.descartarLote.mockResolvedValue({ lote: 'vieja-a', descartadas: 2_864, activadas: 0, yaDescartadas: 0 });

    await pintar();
    expect(q('lotes-inmuebles-abiertos')!.textContent).toContain('Tienes 2 cargas a medias');

    await descartarYConfirmar('vieja-a');

    expect(apiMock.descartarLote).toHaveBeenCalledTimes(1);
    expect(apiMock.descartarLote).toHaveBeenCalledWith('vieja-a');
    expect(q('descartar-vieja-a')).toBeNull();
    // La otra sigue: descartar una no toca a las demás.
    expect(q('descartar-vieja-b')).not.toBeNull();
    expect(toastMock.success).toHaveBeenCalledWith(
      'Carga descartada',
      expect.objectContaining({ description: expect.stringContaining('2864') }),
    );
  });

  /*
   * 🔴 «¿Cuál de esos retomo?» — Nico, 2026-09-11, con cinco cargas del mismo
   * archivo en pantalla, las cinco empezando por «2864 inmuebles».
   */
  it('cada carga se distingue: cuándo fue, cuántos entraron y si frena el paso', async () => {
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 86_400_000);
    apiMock.lotesAbiertos.mockResolvedValue([
      actual(),
      // La buena: todo activado, nada que frene.
      lote({ lote: 'buena', activados: 2_824, pendientes: 40, listos: 0, creadoEn: hoy.toISOString() }),
      // La que frena: tiene filas listas sin activar.
      lote({ lote: 'frena', activados: 2_145, pendientes: 40, listos: 679, creadoEn: hoy.toISOString() }),
      // La fantasma: 2.864 por revisar y CERO listas — no frena nada.
      lote({ lote: 'fantasma', activados: 0, pendientes: 2_864, listos: 0, creadoEn: ayer.toISOString() }),
    ]);

    await pintar();

    // Cuántos entraron: desde T-0131 se cuenta como «N de M creadas».
    const buena = q('carga-buena')!.textContent!;
    expect(buena).toContain('hoy');
    expect(buena).toContain('2.824 de 2.864 creadas');
    expect(buena).toContain('Sin nada que activar');
    expect(buena).not.toContain('frenan este paso');

    const frena = q('carga-frena')!.textContent!;
    expect(frena).toContain('2.145 de 2.864 creadas');
    expect(frena).toContain('679 listos sin activar');
    expect(frena).toContain('frenan este paso');

    // La fantasma no puede verse tan alarmante como la que sí frena.
    const fantasma = q('carga-fantasma')!.textContent!;
    expect(fantasma).toContain('ayer');
    expect(fantasma).toContain('0 de 2.864 creadas');
    expect(fantasma).toContain('2.864 por revisar');
    expect(fantasma).toContain('no frena este paso');
    expect(fantasma).not.toContain('frenan este paso');
  });

  it('un 409 «todavía se está procesando» se dice tal cual y la carga NO se saca de la lista', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([actual(), lote({ lote: 'vieja-a' })]);
    // T-0130: el 409 trae `code`, y es el `code` el que decide qué se dice.
    apiMock.descartarLote.mockRejectedValue(
      new ApiError(409, 'Lote en proceso', 'LOTE_EN_PROCESO'),
    );

    await pintar();
    await descartarYConfirmar('vieja-a');

    expect(apiMock.descartarLote).toHaveBeenCalledWith('vieja-a');
    expect(q('descartar-vieja-a')).not.toBeNull();
    expect(toastMock.success).not.toHaveBeenCalled();
    // «Espera», no un fallo de la persona.
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining('se está procesando en este momento. Espera a que termine'),
    );
  });

  it('una carga que el worker todavía está procesando no se puede descartar', async () => {
    apiMock.lotesAbiertos.mockResolvedValue([actual(), lote({ lote: 'en-vuelo', estado: 'PROCESANDO' })]);

    await pintar();

    expect((q('descartar-en-vuelo') as HTMLButtonElement).disabled).toBe(true);
  });
});
