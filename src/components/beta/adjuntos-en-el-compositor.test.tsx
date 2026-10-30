/**
 * @vitest-environment happy-dom
 */
/**
 * Adjuntos en el chat de Ori (29-10-2026, «el chat lo resuelve todo»): el clip,
 * arrastrar y soltar y pegar agregan archivos a la caja; cada uno sube APENAS
 * se agrega (con su avance), se quita antes de mandar y viaja con el mensaje.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Avance = (f: number) => void;
const { subidas } = vi.hoisted(() => ({
  subidas: [] as Array<{
    archivo: File;
    avanzar: Avance;
    resolver: (v: unknown) => void;
    rechazar: (e: unknown) => void;
    cancelada: boolean;
  }>,
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/chat/subir-adjunto', () => ({
  subirAdjuntoDelChat: (archivo: File, avanzar: Avance) => {
    const s = { archivo, avanzar, resolver: (_: unknown) => {}, rechazar: (_: unknown) => {}, cancelada: false };
    const promesa = new Promise((res, rej) => {
      s.resolver = res;
      s.rechazar = rej;
    });
    subidas.push(s);
    return {
      promesa,
      cancelar: () => {
        s.cancelada = true;
        s.rechazar(Object.assign(new Error('Quitaste el archivo.'), { code: 'CANCELADA' }));
      },
    };
  },
}));

import { ChatInput } from './ChatInput';
import { UserBubble } from './UserBubble';
import { CamposEnElChat } from './CamposEnElChat';
import type { ChatMessage } from '@/lib/types/beta-chat';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  subidas.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const pintar = (el: React.ReactElement) => act(() => root.render(el));
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel);
const $$ = (sel: string) => [...container.querySelectorAll<HTMLElement>(sel)];

const foto = (nombre = 'gotera.jpg', bytes = 2048) => new File([new Uint8Array(bytes)], nombre, { type: 'image/jpeg' });
const pdf = (nombre = 'factura.pdf') => new File([new Uint8Array(4096)], nombre, { type: 'application/pdf' });

function elegir(archivos: File[]) {
  const input = $<HTMLInputElement>('[data-testid="selector-de-archivos"]')!;
  Object.defineProperty(input, 'files', { value: archivos, configurable: true });
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function terminarLaSubida(i: number, id: string) {
  const s = subidas[i]!;
  await act(async () => {
    s.resolver({ id, nombre: s.archivo.name, tipo: s.archivo.type, familia: s.archivo.type.startsWith('image/') ? 'imagen' : 'pdf', tamano: s.archivo.size });
  });
}

const botonEnviar = () => $<HTMLButtonElement>('[data-testid="enviar-llegada"]')!;

describe('adjuntar en el compositor del chat', () => {
  it('el clip agrega los archivos, cada uno sube con su avance y se manda con el mensaje', async () => {
    const onSend = vi.fn();
    pintar(<ChatInput onSend={onSend} />);
    expect($('[data-testid="adjuntar"]')!.getAttribute('aria-label')).toBe('Adjuntar archivos');

    elegir([foto(), pdf()]);
    expect(subidas).toHaveLength(2);
    expect($$('[data-testid="adjunto-en-la-caja"]').map((e) => e.getAttribute('data-estado'))).toEqual(['subiendo', 'subiendo']);
    // Mientras sube, no se manda.
    expect(botonEnviar().disabled).toBe(true);

    act(() => subidas[0]!.avanzar(0.45));
    expect($('[data-testid="adjunto-en-la-caja"]')!.textContent).toContain('Subiendo · 45 %');
    expect($('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('45');

    await terminarLaSubida(0, '11111111-1111-4111-8111-111111111111');
    await terminarLaSubida(1, '22222222-2222-4222-8222-222222222222');
    expect($$('[data-testid="adjunto-en-la-caja"]').map((e) => e.getAttribute('data-estado'))).toEqual(['listo', 'listo']);
    expect($$('[data-testid="adjunto-en-la-caja"]')[1]!.textContent).toContain('4 KB');

    // Sin escribir nada ya se puede mandar: van los archivos.
    expect(botonEnviar().disabled).toBe(false);
    act(() => botonEnviar().click());
    expect(onSend).toHaveBeenCalledTimes(1);
    const [texto, adjuntos] = onSend.mock.calls[0]!;
    expect(texto).toBe('');
    expect(adjuntos.map((a: { id: string; nombre: string }) => [a.id.slice(0, 2), a.nombre])).toEqual([
      ['11', 'gotera.jpg'],
      ['22', 'factura.pdf'],
    ]);
    // La caja queda vacía para el siguiente.
    expect($$('[data-testid="adjunto-en-la-caja"]')).toHaveLength(0);
  });

  it('quitar un archivo antes de mandar cancela su subida y no viaja', async () => {
    const onSend = vi.fn();
    pintar(<ChatInput onSend={onSend} />);
    elegir([foto('sala.jpg'), foto('baño.jpg')]);
    const quitar = $$('[data-testid="quitar-adjunto"]')[0]!;
    expect(quitar.getAttribute('aria-label')).toBe('Quitar «sala.jpg»');
    act(() => quitar.click());
    expect(subidas[0]!.cancelada).toBe(true);
    await terminarLaSubida(1, '33333333-3333-4333-8333-333333333333');
    expect($$('[data-testid="adjunto-en-la-caja"]')).toHaveLength(1);
    act(() => botonEnviar().click());
    expect(onSend.mock.calls[0]![1].map((a: { nombre: string }) => a.nombre)).toEqual(['baño.jpg']);
  });

  it('lo que el chat no recibe se dice junto a la caja y no sube', () => {
    pintar(<ChatInput onSend={vi.fn()} />);
    elegir([new File([new Uint8Array(10)], 'virus.exe'), new File([new Uint8Array(11 * 1024 * 1024)], 'grande.pdf', { type: 'application/pdf' })]);
    expect(subidas).toHaveLength(0);
    const aviso = $('[data-testid="aviso-de-adjuntos"]')!;
    expect(aviso.textContent).toContain('«virus.exe» no se puede mandar al chat');
    expect(aviso.textContent).toContain('«grande.pdf» pesa 11 MB: el máximo es 10 MB');
  });

  it('una subida que falla dice que no subió, se reintenta ahí y el mensaje no la lleva', async () => {
    const onSend = vi.fn();
    pintar(<ChatInput onSend={onSend} />);
    elegir([foto('cocina.jpg')]);
    await act(async () => subidas[0]!.rechazar(new Error('No hubo conexión para subir «cocina.jpg».')));
    const ficha = $('[data-testid="adjunto-en-la-caja"]')!;
    expect(ficha.getAttribute('data-estado')).toBe('error');
    expect(ficha.textContent).toContain('No subió');
    // Sin nada listo ni texto, no hay qué mandar.
    expect(botonEnviar().disabled).toBe(true);
    const reintentar = ficha.querySelector<HTMLButtonElement>('button[aria-label="Reintentar «cocina.jpg»"]')!;
    act(() => reintentar.click());
    expect(subidas).toHaveLength(2);
    expect($('[data-testid="adjunto-en-la-caja"]')!.getAttribute('data-estado')).toBe('subiendo');
  });

  it('soltar archivos sobre la caja los agrega (y el aviso de soltar sale mientras se arrastran)', () => {
    pintar(<ChatInput onSend={vi.fn()} />);
    const caja = $('[data-testid="compositor-del-chat"] .relative.w-full')!;
    const datos = { types: ['Files'], files: [pdf('extracto.pdf')], dropEffect: 'none' };
    const evento = (tipo: string) => {
      const e = new Event(tipo, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'dataTransfer', { value: datos });
      return e;
    };
    act(() => {
      caja.dispatchEvent(evento('dragenter'));
    });
    expect($('[data-testid="soltar-archivos"]')).not.toBeNull();
    act(() => {
      caja.dispatchEvent(evento('drop'));
    });
    expect(subidas.map((s) => s.archivo.name)).toEqual(['extracto.pdf']);
  });
});

describe('los archivos en el hilo', () => {
  it('la burbuja de la persona dice qué archivos mandó, con su peso', () => {
    const mensaje = {
      id: 'm1',
      role: 'user',
      content: 'Este es el comprobante de Ana del contrato 12',
      timestamp: new Date(),
      status: 'sent',
      adjuntos: [{ id: '44444444-4444-4444-8444-444444444444', nombre: 'comprobante.jpg', tipo: 'image/jpeg', familia: 'imagen', tamano: 230_000 }],
    } as ChatMessage;
    pintar(<UserBubble message={mensaje} />);
    const lista = $('[data-testid="adjuntos-del-mensaje"]')!;
    expect(lista.textContent).toContain('comprobante.jpg');
    expect(lista.textContent).toContain('225 KB');
    // Nunca el id a la vista.
    expect(container.textContent).not.toContain('44444444');
  });

  it('el campo «adjunto» del formulario muestra los nombres y no se escribe', () => {
    pintar(
      <CamposEnElChat
        idBase="t"
        campos={[
          { clave: 'adjuntoId', etiqueta: 'Comprobante', tipo: 'adjunto', requerido: true, opciones: [], ayuda: 'comprobante.jpg', valor: '55555555-5555-4555-8555-555555555555' },
        ]}
        valores={{ adjuntoId: '55555555-5555-4555-8555-555555555555' }}
        onCambiar={vi.fn()}
      />,
    );
    const campo = $('[data-testid="campo-adjunto-adjuntoId"]')!;
    expect(campo.textContent).toContain('Comprobante');
    expect(campo.textContent).toContain('comprobante.jpg');
    expect(campo.querySelector('input, textarea')).toBeNull();
    expect(container.textContent).not.toContain('55555555');
  });
});
