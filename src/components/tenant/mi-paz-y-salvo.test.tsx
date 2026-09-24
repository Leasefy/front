/**
 * 🔴 EL PAZ Y SALVO EN EL PORTAL DEL INQUILINO (21-09-2026).
 *
 * Pedido del CEO, 17-09: «paz y salvo / certificado de estar al día, automático
 * con contrato terminado + estado de cuenta en $0 + acta cerrada».
 *
 * Esta pantalla reemplazó DOS tarjetas que decían «Próximamente» sobre un
 * endpoint que no existía. Lo que este archivo amarra:
 *
 *   1. El nombre del documento sale del ESTADO DEL CONTRATO, no de un selector.
 *   2. Cuando no se puede, se ven TODOS los motivos, antes de tocar el botón —
 *      y el botón no está.
 *   3. El front NO pinta ninguna cifra del estado de cuenta: las pone el back
 *      dentro del documento. Un «$0» que muestre el front es un número que el
 *      front no puede defender.
 *   4. Un contrato que no ha empezado no ofrece ninguno de los dos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { disponibles: vi.fn(), emitir: vi.fn(), pdf: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/lease-documents.service', () => ({ leaseDocumentsApi: api }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { MisCertificados } from './MisCertificados';

const TERMINADO_LIMPIO = {
  contractId: 'ct-1',
  numero: 'NUI-9911',
  inmueble: 'Calle 10 # 5-20',
  agencia: { id: 'a-1', nombre: 'Inmobiliaria del Sur' },
  tipo: 'PAZ_Y_SALVO' as const,
  puedeEmitirse: true,
  impedimentos: [],
};

const VIGENTE_AL_DIA = {
  ...TERMINADO_LIMPIO,
  contractId: 'ct-2',
  numero: '412',
  tipo: 'CERTIFICADO_ESTAR_AL_DIA' as const,
};

const CON_DEUDA = {
  ...TERMINADO_LIMPIO,
  contractId: 'ct-3',
  puedeEmitirse: false,
  impedimentos: [
    { code: 'QUEDA_SALDO', mensaje: 'Quedan $1.200.000 de capital vencido.' },
    { code: 'ACTA_ABIERTA', mensaje: 'El acta de devolución está abierta.' },
  ],
};

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MisCertificados />);
  });
  await esperar();
  await esperar();
}

const texto = () => document.body.textContent ?? '';
const botones = () =>
  [...document.querySelectorAll('button')].map((b) => b.textContent ?? '');

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  api.disponibles.mockResolvedValue([TERMINADO_LIMPIO]);
  api.emitir.mockResolvedValue({ documentoId: 'doc-1', tipo: 'PAZ_Y_SALVO' });
  api.pdf.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = '';
});

describe('el nombre del documento lo decide el contrato', () => {
  it('un contrato terminado y sin deuda ofrece el paz y salvo', async () => {
    await montar();
    expect(texto()).toContain('Paz y salvo');
    expect(texto()).toContain('Contrato NUI-9911');
    expect(botones().some((b) => b.includes('Emitir'))).toBe(true);
  });

  it('un contrato vigente ofrece el certificado de estar al día, y dice que NO es un paz y salvo', async () => {
    api.disponibles.mockResolvedValue([VIGENTE_AL_DIA]);
    await montar();
    expect(texto()).toContain('Certificado de estar al día');
    expect(texto()).toContain('No es un paz y salvo');
  });

  it('un contrato que no ha empezado no ofrece ninguno', async () => {
    api.disponibles.mockResolvedValue([
      {
        ...TERMINADO_LIMPIO,
        tipo: null,
        puedeEmitirse: false,
        impedimentos: [
          { code: 'CONTRATO_SIN_EMPEZAR', mensaje: 'Este contrato todavía no ha empezado.' },
        ],
      },
    ]);
    await montar();
    expect(texto()).toContain('Sin certificado disponible');
    expect(texto()).toContain('todavía no ha empezado');
    expect(botones().some((b) => b.includes('Emitir'))).toBe(false);
  });
});

describe('cuando no se puede, se dice antes', () => {
  it('se ven TODOS los motivos, no el primero', async () => {
    api.disponibles.mockResolvedValue([CON_DEUDA]);
    await montar();
    expect(texto()).toContain('$1.200.000 de capital vencido');
    expect(texto()).toContain('acta de devolución está abierta');
  });

  it('y no hay botón que apretar', async () => {
    api.disponibles.mockResolvedValue([CON_DEUDA]);
    await montar();
    expect(botones().some((b) => b.includes('Emitir'))).toBe(false);
  });
});

describe('🔴 el front no pinta cifras del estado de cuenta', () => {
  it('ni siquiera un cero: el contrato de la API no las trae y la pantalla no las inventa', async () => {
    await montar();
    // Ningún monto en pesos en la tarjeta de un contrato que SÍ se puede emitir.
    expect(texto()).not.toMatch(/\$\s?0\b/);
    expect(texto()).not.toMatch(/\$\s?\d/);
  });
});

describe('emitir', () => {
  it('pide el documento, baja el PDF y vuelve a revisar el veredicto', async () => {
    await montar();
    const boton = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Emitir'),
    )!;
    await act(async () => {
      boton.click();
    });
    await esperar();
    await esperar();
    expect(api.emitir).toHaveBeenCalledWith('ct-1');
    expect(api.pdf).toHaveBeenCalledWith('doc-1');
    // Dos veces: la carga inicial y el refresco después de emitir.
    expect(api.disponibles).toHaveBeenCalledTimes(2);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('un fallo al emitir no promete nada: lo dice y no descarga', async () => {
    api.emitir.mockRejectedValue(new Error('Quedan $50.000 de intereses.'));
    await montar();
    const boton = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Emitir'),
    )!;
    await act(async () => {
      boton.click();
    });
    await esperar();
    expect(api.pdf).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('Quedan $50.000 de intereses.');
  });
});

describe('sin contratos', () => {
  it('lo dice sin afirmar que el paz y salvo no existe', async () => {
    api.disponibles.mockResolvedValue([]);
    await montar();
    expect(texto()).toContain('Todavía no tienes contratos');
  });
});
