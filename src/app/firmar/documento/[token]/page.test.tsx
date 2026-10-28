/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { FirmaPublica } from '@/lib/api/firmas.service';

const api = vi.hoisted(() => ({ obtener: vi.fn(), otpSend: vi.fn(), otpVerify: vi.fn(), firmar: vi.fn() }));
vi.mock('@/lib/api/firmas.service', () => ({ firmaPublicaApi: api }));
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'abc.def' }) }));

import FirmarDocumentoPage from './page';

const datos = (o: Partial<FirmaPublica> = {}): FirmaPublica => ({
  firmante: { nombre: 'Ana Gómez', firmado: false, firmadoAt: null },
  documento: { titulo: 'Promesa de compraventa', mensaje: 'Hola Ana', estado: 'ENVIADO', paginas: 3, ubicacion: 'HOJA_FINAL', url: 'https://almacen/x.pdf', firmado: false },
  quienEnvia: 'Inmobiliaria Sabaneta',
  firmantes: [
    { nombre: 'Ana Gómez', firmado: false, esUsted: true },
    { nombre: 'Juan Pérez', firmado: true, esUsted: false },
  ],
  canales: { correo: 'a***@correo.co', whatsapp: '+57 300 *** 4567' },
  ...o,
});

let raiz: Root | null = null;
async function montar() {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<FirmarDocumentoPage />));
  for (let i = 0; i < 4; i++) await act(async () => {});
}
afterEach(() => {
  act(() => raiz?.unmount());
  document.body.innerHTML = '';
});

describe('/firmar/documento/[token]', () => {
  it('muestra el documento, quién lo envía, quién ya firmó y el formulario para firmar', async () => {
    api.obtener.mockResolvedValue(datos());
    await montar();
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('Promesa de compraventa');
    expect(texto).toContain('Inmobiliaria Sabaneta te pide firmar');
    expect(texto).toContain('Juan Pérez');
    expect(document.querySelector('[data-testid="ver-documento-publico"]')?.getAttribute('href')).toBe('https://almacen/x.pdf');
    // El formulario de firma de siempre (`SignatureForm`), con el rol «Firmante».
    expect(texto).toContain('Firmante');
  });

  it('ya firmado por todos: descargarlo', async () => {
    api.obtener.mockResolvedValue(
      datos({ firmante: { nombre: 'Ana Gómez', firmado: true, firmadoAt: '2026-10-28T20:00:00Z' }, documento: { ...datos().documento, estado: 'FIRMADO', firmado: true } }),
    );
    await montar();
    expect(document.querySelector('[data-testid="ya-firmaste"]')?.textContent).toContain('Ya firmaron todos');
    expect(document.querySelector('[data-testid="ver-documento-publico"]')?.textContent).toContain('Descargar firmado');
  });

  it('enlace inválido y vencido', async () => {
    api.obtener.mockRejectedValue(new ApiError(404, 'Ese enlace no es válido.', 'ENLACE_DE_FIRMA_INVALIDO'));
    await montar();
    expect(document.querySelector('[data-testid="enlace-invalido"]')).toBeTruthy();
    act(() => raiz?.unmount());
    document.body.innerHTML = '';
    api.obtener.mockRejectedValue(new ApiError(410, 'Venció', 'ENLACE_DE_FIRMA_VENCIDO'));
    await montar();
    expect(document.querySelector('[data-testid="enlace-vencido"]')).toBeTruthy();
  });
});
