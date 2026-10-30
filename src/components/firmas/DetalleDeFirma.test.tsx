/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const doc = {
  id: 'd1',
  titulo: 'Certificado',
  estado: 'ENVIADO',
  enviadoAt: '2026-10-30T16:58:00Z',
  paginas: 1,
  firmaron: 1,
  total: 2,
  formaDePago: null,
  mensaje: null,
  codigo: null,
  verificacion: null,
  canceladoAt: null,
  devuelto: false,
  firmantes: [
    { id: 'f1', nombre: 'jose', email: 'juankvalero@gmail.com', telefono: '+573126543976', firmado: false, firmadoAt: null, invitacion: 'ENVIADA', pruebaDeVida: null },
    { id: 'f2', nombre: 'Juan Juan', email: 'mercadeochdrms@gmail.com', telefono: '+573046425560', firmado: true, firmadoAt: '2026-10-30T17:01:00Z', invitacion: 'ENVIADA', pruebaDeVida: null },
  ],
  enlaces: [{ firmanteId: 'f1', enlace: 'https://leasefy.co/firmar/x', whatsapp: 'https://wa.me/573126543976?text=x', tieneCelular: true }],
};
const api = { detalle: vi.fn(), cambiarFirmante: vi.fn() };
vi.mock('@/lib/api/firmas.service', () => ({ firmasApi: () => api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DetalleDeFirma } from './DetalleDeFirma';
import { ApiError } from '@/lib/api/client';

let caja: HTMLDivElement;
let raiz: Root;
const porId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
async function esperar() {
  for (let i = 0; i < 6; i++) await act(async () => {});
}
function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  api.detalle.mockResolvedValue(doc);
  api.cambiarFirmante.mockReset();
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
});
afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
});

describe('DetalleDeFirma: cambiar los datos de quien no ha firmado (Nico, 30-10-2026)', () => {
  it('sólo a quien falta; guarda los datos nuevos y le reenvía el enlace', async () => {
    const alCambiar = vi.fn();
    api.cambiarFirmante.mockResolvedValue(doc);
    await act(async () => raiz.render(<DetalleDeFirma id="d1" donde="inmobiliaria" alCerrar={() => {}} alCambiar={alCambiar} />));
    await esperar();
    expect(porId('cambiar-firmante-1')).not.toBeNull();
    expect(porId('cambiar-firmante-2')).toBeNull();
    act(() => porId('cambiar-firmante-1')!.click());
    const correo = porId('editar-firmante-1')!.querySelector('input[type="email"]') as HTMLInputElement;
    expect(correo.value).toBe('juankvalero@gmail.com');
    escribir(correo, 'juan.valero@gmail.com');
    await act(async () => porId('guardar-firmante-1')!.click());
    await esperar();
    expect(api.cambiarFirmante).toHaveBeenCalledWith('d1', 'f1', { nombre: 'jose', email: 'juan.valero@gmail.com', telefono: '+573126543976' });
    expect(porId('editar-firmante-1')).toBeNull();
    expect(alCambiar).toHaveBeenCalled();
  });

  it('si el back no lo acepta, lo dice debajo del formulario', async () => {
    api.cambiarFirmante.mockRejectedValue(new ApiError(400, 'Ese correo o celular ya es de otra persona de este documento: cada persona firma una vez.', 'DATOS_DEL_FIRMANTE'));
    await act(async () => raiz.render(<DetalleDeFirma id="d1" donde="inmobiliaria" alCerrar={() => {}} alCambiar={() => {}} />));
    await esperar();
    act(() => porId('cambiar-firmante-1')!.click());
    await act(async () => porId('guardar-firmante-1')!.click());
    await esperar();
    expect(porId('error-de-la-edicion')?.textContent).toContain('cada persona firma una vez');
  });
});
