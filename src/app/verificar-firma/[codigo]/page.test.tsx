/**
 * @vitest-environment happy-dom
 *
 * «¿Este documento firmado es de verdad?» — lo que abre el QR de la hoja de firmas (Nico, 28-10-2026). Lo que sostiene:
 *   1. el código se escribe como sea y al back va limpio;
 *   2. la respuesta arriba: firmado por todos, le faltan firmas, cancelado o no existe (con dónde escribir otro);
 *   3. quién firmó y cómo se identificó (código, prueba de vida), sin datos de contacto;
 *   4. comparar el archivo en el navegador: firmado, original o distinto.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DocumentoVerificado } from '@/lib/api/firmas.service';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const verificar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/firmas.service', () => ({ firmaPublicaApi: { verificar } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import VerificarFirmaPage from './page';

function params(codigo: string) {
  const valor = { codigo };
  return Object.assign(Promise.resolve(valor), { status: 'fulfilled', value: valor });
}

const HUELLA_FIRMADO = 'f'.repeat(64);

const firmado = (o: Partial<Extract<DocumentoVerificado, { encontrado: true }>> = {}): DocumentoVerificado => ({
  encontrado: true,
  codigo: 'K7Q2M-X9P4T',
  titulo: 'Contrato de arrendamiento de local comercial',
  estado: 'FIRMADO',
  quienEnvia: 'Portofino Propiedad Raíz',
  paginas: 18,
  enviadoAt: '2026-10-27T19:42:00.000Z',
  firmadoAt: '2026-10-28T21:03:00.000Z',
  canceladoAt: null,
  huellas: { original: 'a'.repeat(64), firmado: HUELLA_FIRMADO, sellado: null },
  sellado: null,
  firmantes: [
    {
      nombre: 'Laura R. G.',
      firmado: true,
      firmadoAt: '2026-10-28T20:15:36.000Z',
      conCodigo: true,
      canales: ['correo', 'WhatsApp'],
      pruebaDeVida: { proveedor: 'DIDIT', puntaje: 97.5 },
      huella: 'b'.repeat(64),
    },
    {
      nombre: 'Hernando R. P.',
      firmado: true,
      firmadoAt: '2026-10-28T21:03:00.000Z',
      conCodigo: true,
      canales: ['correo'],
      pruebaDeVida: { proveedor: 'DIDIT', puntaje: 99.1 },
      huella: 'c'.repeat(64),
    },
  ],
  ...o,
});

let raiz: Root | null = null;
async function montar(codigo = 'k7q2m-x9p4t') {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<VerificarFirmaPage params={params(codigo)} />));
  for (let i = 0; i < 4; i++) await act(async () => {});
}
afterEach(() => {
  act(() => raiz?.unmount());
  document.body.innerHTML = '';
  verificar.mockReset();
});

const texto = () => document.body.textContent ?? '';

describe('/verificar-firma/[codigo]', () => {
  it('firmado por todos: es auténtico, quiénes firmaron y cómo se identificaron', async () => {
    verificar.mockResolvedValue(firmado());
    await montar();
    expect(verificar).toHaveBeenCalledWith('K7Q2MX9P4T');
    expect(document.querySelector('[data-testid="codigo-verificado"]')?.textContent).toBe('K7Q2M-X9P4T');
    expect(document.querySelector('[data-testid="veredicto"]')?.textContent).toBe('Es auténtico: lo firmaron todos con Leasefy');
    expect(texto()).toContain('Laura R. G.');
    expect(texto()).toContain('Código por correo y WhatsApp');
    expect(texto()).toContain('Prueba de vida · 97,5 %');
    expect(texto()).toContain('18 páginas');
  });

  it('le faltan firmas, o lo cancelaron: lo dice sin llamarlo firmado', async () => {
    verificar.mockResolvedValue(
      firmado({
        estado: 'ENVIADO',
        firmadoAt: null,
        firmantes: [{ ...(firmado() as Extract<DocumentoVerificado, { encontrado: true }>).firmantes[0] }, { nombre: 'Hernando R. P.', firmado: false, firmadoAt: null, conCodigo: false, canales: [], pruebaDeVida: null, huella: null }],
      }),
    );
    await montar();
    expect(document.querySelector('[data-testid="veredicto"]')?.textContent).toBe('Existe y todavía le faltan firmas');
    expect(texto()).toContain('Firmaron 1 de 2');
    expect(texto()).toContain('Falta su firma');
    act(() => raiz?.unmount());
    document.body.innerHTML = '';
    verificar.mockResolvedValue(firmado({ estado: 'CANCELADO', canceladoAt: '2026-10-28T10:00:00.000Z' }));
    await montar();
    expect(document.querySelector('[data-testid="veredicto"]')?.textContent).toContain('lo canceló');
  });

  it('un código que no es nuestro: lo dice y deja escribir otro', async () => {
    verificar.mockResolvedValue({ encontrado: false });
    await montar('ZZZZZ-ZZZZZ');
    expect(document.querySelector('[data-testid="documento-no-encontrado"]')?.textContent).toContain(
      'No encontramos un documento con ese código',
    );
    expect(document.querySelector('#otro-codigo')).toBeTruthy();
  });

  it('comparar el archivo: el firmado, el original o uno distinto, sin subirlo', async () => {
    verificar.mockResolvedValue(firmado());
    await montar();
    const huella = (bytes: Uint8Array<ArrayBuffer>) =>
      crypto.subtle.digest('SHA-256', bytes).then((d) => Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join(''));
    const contenido = new TextEncoder().encode('%PDF-1.7 firmado') as Uint8Array<ArrayBuffer>;
    const h = await huella(contenido);
    act(() => raiz?.unmount());
    document.body.innerHTML = '';
    verificar.mockResolvedValue(firmado({ huellas: { original: 'a'.repeat(64), firmado: h, sellado: null } }));
    await montar();
    const input = document.querySelector<HTMLInputElement>('[data-testid="archivo-a-comparar"]')!;
    const elegir = async (bytes: Uint8Array<ArrayBuffer>) => {
      const archivo = new File([bytes], 'contrato.pdf', { type: 'application/pdf' });
      Object.defineProperty(input, 'files', { configurable: true, value: [archivo] });
      await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
      for (let i = 0; i < 6; i++) await act(async () => {});
    };
    await elegir(contenido);
    expect(document.querySelector('[data-testid="resultado-de-la-comparacion"]')?.textContent).toContain(
      'Es exactamente el documento firmado',
    );
    await elegir(new TextEncoder().encode('otra cosa') as Uint8Array<ArrayBuffer>);
    expect(document.querySelector('[data-testid="resultado-de-la-comparacion"]')?.textContent).toContain(
      'Este archivo no es el que se firmó',
    );
  });

  it('si el back no responde, lo dice con reintentar', async () => {
    verificar.mockRejectedValue(new Error('red'));
    await montar();
    expect(texto()).toContain('No pudimos comprobarlo en este momento');
  });
});
