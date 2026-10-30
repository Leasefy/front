/**
 * @vitest-environment happy-dom
 *
 * El QR del banco en el editor del medio de pago (Nico 29-10-2026: «demos opción también con llave de Bre-B y QR").
 * Lo que sostiene:
 *   1. sin QR, «Subir el QR»; al elegir la imagen se sube y la lista se entera;
 *   2. una imagen que no sirve (un PDF, más de 2 MB) se frena aquí, con su frase, sin llamar al back;
 *   3. con QR, se ve y se puede quitar;
 *   4. sin medio guardado (o guardado con un tipo sin QR), dice por qué y no ofrece subir.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ subirQr: vi.fn(), quitarQr: vi.fn() }));
vi.mock('@/lib/api/medios-de-pago.service', () => ({ mediosDePagoApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { QrDelMedio, porQueNoSirveElQr } from './QrDelMedio';

const MEDIO = { id: 'm1', nombre: 'Bancolombia ahorros' };
let raiz: Root | null = null;
async function montar(props: Partial<Parameters<typeof QrDelMedio>[0]> = {}) {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  const onCambio = vi.fn();
  await act(async () =>
    raiz!.render(<QrDelMedio medio={MEDIO} qrUrl={null} puedeEditar onCambio={onCambio} {...props} />),
  );
  return onCambio;
}
async function elegir(archivo: File) {
  const input = document.querySelector<HTMLInputElement>('[data-testid="qr-del-medio-archivo"]')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  for (let i = 0; i < 3; i++) await act(async () => {});
}
const png = (bytes = 4) => new File([new Uint8Array(bytes)], 'qr.png', { type: 'image/png' });

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('QrDelMedio', () => {
  it('sin QR: «Subir el QR», se sube y la lista se entera', async () => {
    api.subirQr.mockResolvedValue({ ...MEDIO, qrUrl: 'https://almacen.example/qr.png?firmada' });
    const onCambio = await montar();
    expect(document.querySelector('[data-testid="qr-del-medio-subir"]')?.textContent).toContain('Subir el QR');
    const imagen = png();
    await elegir(imagen);
    expect(api.subirQr).toHaveBeenCalledWith('m1', imagen);
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ qrUrl: expect.stringContaining('firmada') }));
  });

  it('una imagen que no sirve se frena aquí, con su frase', async () => {
    await montar();
    await elegir(new File([new Uint8Array(4)], 'pago.pdf', { type: 'application/pdf' }));
    expect(api.subirQr).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('JPG, PNG o WebP');
    expect(porQueNoSirveElQr(png(2 * 1024 * 1024 + 1))).toMatch(/más de 2 MB/);
    expect(porQueNoSirveElQr(png())).toBeNull();
  });

  it('con QR: se ve y se puede quitar', async () => {
    api.quitarQr.mockResolvedValue({ ...MEDIO, qrUrl: null });
    const onCambio = await montar({ qrUrl: 'https://almacen.example/qr.png?firmada' });
    expect(document.querySelector<HTMLImageElement>('[data-testid="qr-del-medio-imagen"]')?.src).toContain('firmada');
    expect(document.querySelector('[data-testid="qr-del-medio-subir"]')?.textContent).toContain('Cambiar el QR');
    await act(async () => document.querySelector<HTMLButtonElement>('[data-testid="qr-del-medio-quitar"]')!.click());
    for (let i = 0; i < 3; i++) await act(async () => {});
    expect(api.quitarQr).toHaveBeenCalledWith('m1');
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ qrUrl: null }));
  });

  it('sin medio guardado: dice por qué y no ofrece subir', async () => {
    await montar({ medio: null, porQueTodaviaNo: 'Guarda el medio con este tipo.' });
    expect(document.body.textContent).toContain('Guarda el medio con este tipo.');
    expect(document.querySelector('[data-testid="qr-del-medio-subir"]')).toBeNull();
  });
});
