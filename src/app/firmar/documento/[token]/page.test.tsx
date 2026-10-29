/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { FirmaPublica } from '@/lib/api/firmas.service';

const api = vi.hoisted(() => ({
  obtener: vi.fn(),
  otpSend: vi.fn(),
  otpVerify: vi.fn(),
  firmar: vi.fn(),
  iniciarPruebaDeVida: vi.fn(),
  comprobarPruebaDeVida: vi.fn(),
  pruebaDeVidaSimulada: vi.fn(),
}));
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
  pruebaDeVida: { requerida: false, modo: null, estado: 'PENDIENTE', intentosQuedan: 5, motivo: null },
  verificacion: null,
  ...o,
});

const conDidit = (o: Partial<FirmaPublica['pruebaDeVida']> = {}): Partial<FirmaPublica> => ({
  pruebaDeVida: { requerida: true, modo: 'DIDIT', estado: 'PENDIENTE', intentosQuedan: 5, motivo: null, ...o },
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
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

const boton = (testid: string) => document.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`);

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

  it('con la prueba de vida pedida: primero la foto, sin el formulario de firma; «Tomarme la foto» lleva a Didit', async () => {
    api.obtener.mockResolvedValue(datos(conDidit()));
    api.iniciarPruebaDeVida.mockResolvedValue({ url: 'https://verify.didit.example/ses-1', pruebaDeVida: conDidit({ estado: 'EN_CURSO' }).pruebaDeVida });
    const ir = vi.fn();
    const original = window.location.assign;
    Object.defineProperty(window.location, 'assign', { configurable: true, value: ir });
    try {
      await montar();
      const texto = document.body.textContent ?? '';
      expect(texto).toContain('Confirma que eres tú');
      expect(texto).toContain('tómate una foto para confirmar que eres tú');
      expect(texto).not.toContain('Firmante');
      await act(async () => boton('prueba-de-vida-empezar')!.click());
      expect(api.iniciarPruebaDeVida).toHaveBeenCalledWith('abc.def');
      expect(ir).toHaveBeenCalledWith('https://verify.didit.example/ses-1');
    } finally {
      Object.defineProperty(window.location, 'assign', { configurable: true, value: original });
    }
  });

  it('no pasó: dice por qué y cuántos intentos quedan; sin intentos, a quién escribirle', async () => {
    api.obtener.mockResolvedValue(datos(conDidit({ estado: 'RECHAZADA', intentosQuedan: 3, motivo: 'Busca buena luz y vuelve a intentarlo.' })));
    await montar();
    const caja = document.querySelector('[data-testid="prueba-de-vida-rechazada"]')?.textContent ?? '';
    expect(caja).toContain('Busca buena luz');
    expect(caja).toContain('Te quedan 3 intentos');
    act(() => raiz?.unmount());
    document.body.innerHTML = '';
    api.obtener.mockResolvedValue(datos(conDidit({ estado: 'RECHAZADA', intentosQuedan: 0, motivo: 'x' })));
    await montar();
    expect(document.body.textContent).toContain('Escríbele a Inmobiliaria Sabaneta');
    expect(boton('prueba-de-vida-reintentar')).toBeNull();
  });

  it('al volver de Didit pregunta el resultado solo; aprobada, aparece el código y la firma', async () => {
    window.history.replaceState(null, '', '/firmar/documento/abc.def?vida=1');
    api.obtener.mockResolvedValue(datos(conDidit({ estado: 'EN_CURSO', intentosQuedan: 4 })));
    api.comprobarPruebaDeVida.mockResolvedValue(conDidit({ estado: 'APROBADA', intentosQuedan: 4 }).pruebaDeVida);
    await montar();
    for (let i = 0; i < 4; i++) await act(async () => {});
    expect(api.comprobarPruebaDeVida).toHaveBeenCalledWith('abc.def');
    expect(document.querySelector('[data-testid="prueba-de-vida-aprobada"]')?.textContent).toContain('Confirmamos que eres tú');
    expect(document.body.textContent).toContain('Firmante');
    expect(window.location.search).toBe('');
  });

  it('firmado por todos: el código y el enlace a la verificación', async () => {
    api.obtener.mockResolvedValue(
      datos({
        firmante: { nombre: 'Ana Gómez', firmado: true, firmadoAt: '2026-10-28T20:00:00Z' },
        documento: { ...datos().documento, estado: 'FIRMADO', firmado: true },
        verificacion: { codigo: 'K7Q2M-X9P4T', url: 'https://app.leasefy.co/verificar-firma/K7Q2MX9P4T' },
      }),
    );
    await montar();
    const ya = document.querySelector('[data-testid="ya-firmaste"]');
    expect(ya?.textContent).toContain('K7Q2M-X9P4T');
    expect(ya?.querySelector('a')?.getAttribute('href')).toBe('/verificar-firma/K7Q2MX9P4T');
  });
});
