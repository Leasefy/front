/**
 * 🔴 ARREGLOS-3 (03-10-2026): la página PÚBLICA donde el inquilino firma el
 * acta, sin sesión (el token de la URL abre el acta; el código a su correo deja
 * firmar). Antes no existía: el inquilino no tenía por dónde firmar.
 *
 *   (1) 404 → «Enlace no válido»;  (2) 410 → «Este enlace venció»;
 *   (3) PARA_FIRMAR → ve el inmueble, las FOTOS por espacio, el depósito y los
 *       descuentos, y el formulario de firma;
 *   (4) firmar manda el trazo, la aceptación y el token del código, y la página
 *       queda en «Ya firmaste»;
 *   (5) NO_LISTA dice la frase del back y no deja firmar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type { ActaParaElInquilino } from '@/lib/api/firma-del-acta.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'tok-abc' }) }));

const h = vi.hoisted(() => ({
  obtener: vi.fn(),
  firmar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/firma-del-acta.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/firma-del-acta.service')>()),
  firmaPublicaDelActaApi: { obtener: h.obtener, otpSend: vi.fn(), otpVerify: vi.fn(), firmar: h.firmar },
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
// El formulario de firma: un botón que firma con el trazo y el token del código.
vi.mock('@/components/contract/SignatureForm', () => ({
  SignatureForm: ({
    onSign,
    textos,
  }: {
    onSign: (p: { signatureData: string; otpVerificationToken?: string }) => Promise<void>;
    textos?: { aceptacion?: string };
  }) => (
    <div data-testid="signature-form">
      <p>{textos?.aceptacion}</p>
      <button
        type="button"
        data-testid="firmar"
        onClick={() => void onSign({ signatureData: 'data:image/png;base64,AAA', otpVerificationToken: 'otp-tok' }).catch(() => undefined)}
      >
        firmar
      </button>
    </div>
  ),
}));

import FirmarActaPage from './page';

const PARA_FIRMAR: ActaParaElInquilino = {
  estado: 'PARA_FIRMAR',
  porQue: null,
  venceEl: '2026-10-10T15:00:00.000Z',
  correo: 'p***@example.test',
  inmobiliaria: { nombre: 'Inmobiliaria Laboratorio S.A.S.' },
  acta: {
    tipo: 'DEVOLUCION',
    inmueble: 'Apto 9',
    direccion: 'Calle 9 # 9-9',
    inquilino: 'Pedro Prueba',
    fechaDeEntrega: '2026-10-31T15:00:00.000Z',
    estadoGeneral: 'GOOD',
    observaciones: 'Una mancha en la pared de la sala.',
    espacios: [{ espacio: 'Sala', clave: 'sala', fotos: ['http://s/1.jpg', 'http://s/2.jpg'] }],
    espaciosDelInventario: [],
    inventario: [{ espacio: 'sala', nombre: 'Sofá', cantidad: 1, estado: 'GOOD', notas: null }],
    medidores: [],
    llaves: [],
    deposito: 1_000_000,
    descuentos: [{ concepto: 'Pintura', valor: 1_500_000, notas: null }],
    aDevolver: 0,
  },
  firmas: [{ papel: 'ASESOR', nombre: 'Ana Admin', firmadaEl: '2026-10-03T15:00:00.000Z' }],
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  h.obtener.mockReset();
  h.firmar.mockReset();
  Object.values(h.toast).forEach((f) => f.mockReset());
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar() {
  await act(async () => {
    root.render(<FirmarActaPage />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const q = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('/firmar/acta/[token]', () => {
  it('404 → «Enlace no válido»', async () => {
    h.obtener.mockRejectedValue(new ApiError(404, 'Este enlace no es válido.', 'ENLACE_DEL_ACTA_INVALIDO'));
    await montar();
    expect(q('enlace-invalido')).not.toBeNull();
    expect(q('signature-form')).toBeNull();
  });

  it('410 → «Este enlace venció»', async () => {
    h.obtener.mockRejectedValue(new ApiError(410, 'Este enlace venció.', 'ENLACE_DEL_ACTA_VENCIDO'));
    await montar();
    expect(q('enlace-vencido')).not.toBeNull();
  });

  it('🔴 ve lo que firma ANTES de firmar: el inmueble, las fotos por espacio, el depósito y los descuentos', async () => {
    h.obtener.mockResolvedValue(PARA_FIRMAR);
    await montar();
    expect(h.obtener).toHaveBeenCalledWith('tok-abc');
    const texto = host.textContent ?? '';
    expect(texto).toContain('Firma el acta de devolución');
    expect(texto).toContain('Apto 9');
    expect(texto).toContain('Una mancha en la pared de la sala.');
    expect(q('fotos-del-acta-publica')?.querySelectorAll('img')).toHaveLength(2);
    expect(q('deposito-del-acta')?.textContent).toContain('Pintura');
    expect(q('signature-form')?.textContent).toContain('entregué el inmueble');
    expect(texto).toContain('p***@example.test');
  });

  it('🔴 firmar manda el trazo, la aceptación y el token del código; la página queda en «Ya firmaste»', async () => {
    h.obtener.mockResolvedValue(PARA_FIRMAR);
    h.firmar.mockResolvedValue({
      ...PARA_FIRMAR,
      estado: 'YA_FIRMASTE',
      firmas: [...PARA_FIRMAR.firmas, { papel: 'INQUILINO', nombre: 'Pedro Prueba', firmadaEl: '2026-10-03T16:00:00.000Z' }],
    });
    await montar();
    await act(async () => {
      q('firmar')!.click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.firmar).toHaveBeenCalledWith('tok-abc', {
      signatureData: 'data:image/png;base64,AAA',
      acceptedTerms: true,
      otpVerificationToken: 'otp-tok',
    });
    expect(q('ya-firmaste')).not.toBeNull();
    expect(q('signature-form')).toBeNull();
    expect(h.toast.success).toHaveBeenCalledWith('Firmaste el acta.');
  });

  it('NO_LISTA: dice la frase del back y no deja firmar', async () => {
    h.obtener.mockResolvedValue({
      ...PARA_FIRMAR,
      estado: 'NO_LISTA',
      porQue: 'Tu inmobiliaria todavía tiene un paso pendiente en el acta.',
    });
    await montar();
    expect(q('acta-no-lista')?.textContent).toContain('paso pendiente');
    expect(q('signature-form')).toBeNull();
  });
});
