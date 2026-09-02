/**
 * «Crear con IA» del propietario, con varios documentos (2026-09-02).
 *
 * Lo que se protege: que la persona pueda subir TODO lo que tiene sobre el
 * dueño (cédula, RUT, certificación bancaria; foto, PDF o Word) y que salga
 * UN formulario prellenado con todo; que lo que el agente no sabe leer se
 * rechace antes de subirlo; y que cuando dos documentos no coinciden se vea
 * y se pueda elegir.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
  }),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

const extractMock = vi.fn();
vi.mock('@/lib/api/terceros-extract.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/terceros-extract.service')>(
    '@/lib/api/terceros-extract.service',
  );
  return {
    ...actual,
    // El mapeo a Propietario y la validación de archivos son los reales;
    // sólo la llamada de red se reemplaza.
    extractTerceroFromFiles: (...args: unknown[]) => extractMock(...args),
  };
});

/*
 * PropietarioForm es un formulario grande con react-hook-form: acá sólo
 * importa QUÉ le llega como base. Se cambia por un volcado de `initialData`.
 */
vi.mock('./PropietarioForm', () => ({
  PropietarioForm: ({ initialData }: { initialData?: Record<string, unknown> }) => (
    <pre data-testid="prefill">{JSON.stringify(initialData ?? null)}</pre>
  ),
}));

import { TerceroIACapture } from './TerceroIACapture';
import type { TerceroExtractResponse } from '@/lib/api/terceros-extract.types';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  extractMock.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function archivo(nombre: string, tipo: string, bytes = 1024): File {
  const f = new File([new Uint8Array(bytes)], nombre, { type: tipo });
  return f;
}

async function montar() {
  const onCreated = vi.fn();
  const onClose = vi.fn();
  await act(async () => {
    root.render(<TerceroIACapture onCreated={onCreated} onClose={onClose} />);
  });
  return { onCreated, onClose };
}

async function elegir(files: File[]) {
  const input = container.querySelector('[data-testid="tercero-ia-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const respuesta = (over: Partial<TerceroExtractResponse> = {}): TerceroExtractResponse => ({
  success: true,
  tercero: {
    nombre: 'Jorge Restrepo',
    tipoDocumento: 'CC',
    numeroDocumento: '71234567',
    fechaNacimiento: null,
    lugarExpedicion: null,
    razonSocial: null,
    correo: 'jorge@correo.co',
    telefono: '3001234567',
    direccion: 'Calle 10 # 43-12',
    ciudad: 'Medellín',
    banco: 'bancolombia',
    bancoNombre: 'Bancolombia S.A.',
    tipoCuenta: 'savings',
    numeroCuenta: '12345678901',
    titularCuenta: 'Jorge Restrepo',
    fieldConfidence: { nombre: 0.95 },
  },
  conflictos: [],
  documentos: [
    { nombre: 'cedula.jpg', tipo: 'cedula' },
    { nombre: 'certificacion.pdf', tipo: 'certificacion_bancaria' },
  ],
  confidence: 0.9,
  tokensUsed: 1200,
  estimatedCostUsd: 0.006,
  ...over,
});

describe('<TerceroIACapture> varios documentos', () => {
  it('la ayuda del dropzone dice cuántos archivos caben (no deja «{{max}}» en pantalla)', async () => {
    await montar();
    // El mock de `t` pinta `clave(param)`: sin el parámetro quedaría la clave pelada.
    expect(container.textContent).toContain('inmobiliaria.terceroIA.uploadHint(10)');
  });

  it('lista foto + PDF + Word, los manda todos en UNA llamada y prellena el formulario con todo', async () => {
    extractMock.mockResolvedValue(respuesta());
    await montar();

    const cedula = archivo('cedula.jpg', 'image/jpeg');
    const pdf = archivo('certificacion.pdf', 'application/pdf');
    // Windows manda tipo vacío para .docx: la extensión decide.
    const word = archivo('camara.docx', '');
    await elegir([cedula, pdf]);
    await elegir([word]);

    const lista = container.querySelector('[data-testid="tercero-ia-archivos"]')!;
    expect(lista.textContent).toContain('cedula.jpg');
    expect(lista.textContent).toContain('certificacion.pdf');
    expect(lista.textContent).toContain('camara.docx');
    expect(toastError).not.toHaveBeenCalled();

    const boton = container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
    expect(boton.textContent).toContain('inmobiliaria.terceroIA.extractN(3)');
    await act(async () => {
      boton.click();
    });

    expect(extractMock).toHaveBeenCalledOnce();
    const enviados = extractMock.mock.calls[0][0] as File[];
    expect(enviados.map((f) => f.name)).toEqual(['cedula.jpg', 'certificacion.pdf', 'camara.docx']);

    const prefill = JSON.parse(container.querySelector('[data-testid="prefill"]')!.textContent!);
    expect(prefill.name).toBe('Jorge Restrepo');
    expect(prefill.email).toBe('jorge@correo.co');
    expect(prefill.city).toBe('Medellín');
    expect(prefill.bankAccount).toEqual({
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '12345678901',
      accountHolder: 'Jorge Restrepo',
    });
    expect(container.querySelector('[data-testid="documentos-detectados"]')?.textContent).toContain(
      'Cédula · Certificación bancaria',
    );
    expect(container.querySelector('[data-testid="conflictos"]')).toBeNull();
  });

  it('un formato que el agente no lee se rechaza antes de subirlo y no entra a la lista', async () => {
    await montar();
    await elegir([archivo('cedula.heic', 'image/heic')]);

    expect(toastError).toHaveBeenCalledWith('inmobiliaria.terceroIA.errorUnsupported(10)');
    expect(container.querySelector('[data-testid="tercero-ia-archivos"]')).toBeNull();
    expect((container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('quitar un archivo lo saca de lo que se manda', async () => {
    extractMock.mockResolvedValue(respuesta());
    await montar();
    await elegir([archivo('cedula.jpg', 'image/jpeg'), archivo('rut.pdf', 'application/pdf')]);
    await act(async () => {
      (container.querySelector('[data-testid="quitar-0"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement).click();
    });
    expect((extractMock.mock.calls[0][0] as File[]).map((f) => f.name)).toEqual(['rut.pdf']);
  });

  it('cuando dos documentos no coinciden se ve el conflicto y elegir un valor cambia el formulario', async () => {
    extractMock.mockResolvedValue(
      respuesta({
        conflictos: [
          {
            campo: 'nombre',
            valores: [
              { valor: 'Jorge Restrepo', documento: 'cedula.jpg' },
              { valor: 'Jorge Andrés Restrepo Vélez', documento: 'rut.pdf' },
            ],
          },
        ],
      }),
    );
    await montar();
    await elegir([archivo('cedula.jpg', 'image/jpeg'), archivo('rut.pdf', 'application/pdf')]);
    await act(async () => {
      (container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement).click();
    });

    const conflicto = container.querySelector('[data-testid="conflicto-nombre"]')!;
    expect(conflicto.textContent).toContain('Jorge Andrés Restrepo Vélez');
    expect(conflicto.textContent).toContain('rut.pdf');

    const botones = container.querySelectorAll('[data-testid="usar-nombre"]');
    await act(async () => {
      (botones[1] as HTMLButtonElement).click();
    });
    const prefill = JSON.parse(container.querySelector('[data-testid="prefill"]')!.textContent!);
    expect(prefill.name).toBe('Jorge Andrés Restrepo Vélez');
  });

  it('un banco que no está en la lista del formulario se avisa con el nombre impreso', async () => {
    extractMock.mockResolvedValue(
      respuesta({
        tercero: { ...respuesta().tercero, banco: null, bancoNombre: 'Nequi' },
      }),
    );
    await montar();
    await elegir([archivo('cert.pdf', 'application/pdf')]);
    await act(async () => {
      (container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="banco-fuera-de-lista"]')?.textContent).toContain('Nequi');
    const prefill = JSON.parse(container.querySelector('[data-testid="prefill"]')!.textContent!);
    expect(prefill.bankAccount.bank).toBe('');
  });

  it('el mensaje del agente (400) se muestra tal cual en el error', async () => {
    extractMock.mockRejectedValue(new Error('«rut.pdf» tiene 40 páginas; el máximo es 25. Subí sólo las páginas con los datos.'));
    await montar();
    await elegir([archivo('rut.pdf', 'application/pdf')]);
    await act(async () => {
      (container.querySelector('[data-testid="tercero-ia-extraer"]') as HTMLButtonElement).click();
    });
    expect(container.textContent).toContain('«rut.pdf» tiene 40 páginas');
  });
});
