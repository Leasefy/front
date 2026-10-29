/**
 * @vitest-environment happy-dom
 *
 * La asegurabilidad manual en la ficha del candidato (Nico, 28-10-2026). Lo que sostiene:
 *   1. el comprobante por revisar se ve y se acepta (o se rechaza con un motivo de al menos 5 letras);
 *   2. «Aprobado» / «No aprobado» por aseguradora, y el máximo afianzable cuando aprobó;
 *   3. sin la asegurabilidad manual prendida y sin nada guardado, no se pinta.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AsegurabilidadDeLaPostulacion } from '@/lib/api/asegurabilidad-manual.service';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ deLaPostulacion: vi.fn(), aceptar: vi.fn(), rechazar: vi.fn(), marcar: vi.fn() }));
vi.mock('@/lib/api/asegurabilidad-manual.service', () => ({ asegurabilidadManualApi: api }));
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => ({ canAccess: () => true }) }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AsegurabilidadManualDeLaPostulacion } from './AsegurabilidadManualDeLaPostulacion';

const SURA = '11111111-1111-4111-8111-111111111111';
const vista = (o: Partial<AsegurabilidadDeLaPostulacion> = {}): AsegurabilidadDeLaPostulacion => ({
  disponible: true,
  activa: true,
  precioCop: 85_000,
  estudioVigente: null,
  comprobante: {
    estado: 'POR_REVISAR',
    subidoAt: '2026-10-28T20:00:00.000Z',
    tipo: 'application/pdf',
    url: 'https://almacen.example/c.pdf?firmada',
    motivo: null,
    revisadoAt: null,
  },
  aseguradoras: [{ id: SURA, nombre: 'Sura', resultado: null }],
  maximoAfianzableCop: null,
  ...o,
});

let raiz: Root | null = null;
async function montar() {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<AsegurabilidadManualDeLaPostulacion applicationId="app-1" />));
  for (let i = 0; i < 3; i++) await act(async () => {});
}
const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
async function tocar(el: HTMLElement | null) {
  await act(async () => el!.click());
  for (let i = 0; i < 3; i++) await act(async () => {});
}

beforeEach(() => api.deLaPostulacion.mockResolvedValue(vista()));
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('AsegurabilidadManualDeLaPostulacion', () => {
  it('el comprobante por revisar se ve y se acepta', async () => {
    api.aceptar.mockResolvedValue(vista({ comprobante: { ...vista().comprobante!, estado: 'ACEPTADO' } }));
    await montar();
    expect($('[data-testid="comprobante-del-estudio"]')?.textContent).toContain('Por revisar');
    expect($<HTMLAnchorElement>('a[href*="firmada"]')).toBeTruthy();
    expect(document.body.textContent).toMatch(/El estudio cuesta \$\s?85\.000/);
    await tocar($('[data-testid="aceptar-comprobante"]'));
    expect(api.aceptar).toHaveBeenCalledWith('app-1');
    expect($('[data-testid="comprobante-del-estudio"]')?.textContent).toContain('Pago aceptado');
    expect($('[data-testid="aceptar-comprobante"]')).toBeNull();
  });

  it('rechazar pide un motivo de al menos 5 letras', async () => {
    api.rechazar.mockResolvedValue(vista({ comprobante: { ...vista().comprobante!, estado: 'RECHAZADO', motivo: 'No se ve el valor' } }));
    await montar();
    const rechazar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Rechazar')!;
    await tocar(rechazar);
    const motivo = $<HTMLTextAreaElement>('[data-testid="motivo-del-rechazo"]')!;
    const escribir = async (v: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(motivo, v);
        motivo.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    await escribir('no');
    expect($<HTMLButtonElement>('[data-testid="enviar-rechazo"]')!.disabled).toBe(true);
    await escribir('No se ve el valor');
    await tocar($('[data-testid="enviar-rechazo"]'));
    expect(api.rechazar).toHaveBeenCalledWith('app-1', 'No se ve el valor');
    expect(document.body.textContent).toContain('Motivo: No se ve el valor');
  });

  it('«Aprobado» por Sura con su máximo afianzable', async () => {
    const aprobada = vista({
      aseguradoras: [{ id: SURA, nombre: 'Sura', resultado: { estado: 'APROBADO', maximoAfianzableCop: null, nota: null, marcadoAt: '' } }],
    });
    api.marcar.mockResolvedValueOnce(aprobada);
    await montar();
    await tocar($(`[data-testid="marcar-${SURA}-APROBADO"]`));
    expect(api.marcar).toHaveBeenLastCalledWith('app-1', SURA, { estado: 'APROBADO', maximoAfianzableCop: null });
    expect($(`[data-testid="marcar-${SURA}-APROBADO"]`)?.getAttribute('aria-pressed')).toBe('true');
    expect($(`#maximo-${SURA}`)).toBeTruthy();
  });

  it('sin la asegurabilidad manual prendida y sin nada guardado, no se pinta', async () => {
    api.deLaPostulacion.mockResolvedValue(vista({ activa: false, comprobante: null, aseguradoras: [{ id: SURA, nombre: 'Sura', resultado: null }] }));
    await montar();
    expect($('[data-testid="asegurabilidad-manual"]')).toBeNull();
  });
});
