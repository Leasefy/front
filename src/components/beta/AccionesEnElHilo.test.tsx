/**
 * @vitest-environment happy-dom
 */
/**
 * La parte del hilo que actúa (Nico, 23-09): cada botón es un MENSAJE DE LA
 * PERSONA con su intención; «Sí, hazlo» y «No» también; «Deshacer» también.
 * Nada navega y nada se ejecuta desde el navegador: el micro decide.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    sendMessage: vi.fn(),
    anotarTarjetaAbierta: vi.fn(),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
    messages: [] as unknown[],
  },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({ useBetaChatContext: () => contexto }));

import { AccionesEnElHilo } from './AccionesEnElHilo';
import type { ChatMessage } from '@/lib/types/beta-chat';

const CONTRATO = { tipo: 'contrato' as const, id: '4a23f784-2050-4874-bfc4-bc9d1352794a' };
const PROPUESTA = '6a3540bf-5627-49b4-bad0-6c56c1eacf8c';
const SIN = { muevePlata: false, escribeATerceros: false, irreversible: false };

function mensaje(parcial: Partial<ChatMessage>): ChatMessage {
  return { id: 'a-1', role: 'assistant', content: 'x', timestamp: new Date(), status: 'complete', turnoId: 't-1', ...parcial };
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  contexto.sendMessage.mockReset();
  contexto.anotarTarjetaAbierta.mockReset();
  contexto.messages = [];
  contexto.isThinking = false;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const pintar = (m: ChatMessage) => {
  contexto.messages = [m, ...(contexto.messages as ChatMessage[]).filter((x) => x.id !== m.id)];
  act(() => root.render(<AccionesEnElHilo message={m} />));
};
const boton = (texto: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(texto));

describe('lo que se puede hacer', () => {
  const m = mensaje({
    acciones: [
      { id: 'ver_estado_de_cuenta', titulo: 'Ver el estado de cuenta', entidad: CONTRATO, disponible: true, porQueNo: null, riesgo: SIN, lectura: true, desde: null },
      {
        id: 'mandar_estado_de_cuenta_por_correo',
        titulo: 'Mandarle el estado de cuenta por correo',
        entidad: CONTRATO,
        disponible: true,
        porQueNo: null,
        riesgo: { ...SIN, escribeATerceros: true },
        lectura: false,
        desde: null,
      },
      {
        id: 'mandar_estado_de_cuenta_por_whatsapp',
        titulo: 'Mandarle el estado de cuenta por WhatsApp',
        entidad: CONTRATO,
        disponible: false,
        porQueNo: 'El inquilino no aceptó recibir mensajes por WhatsApp: mándaselo por correo.',
        riesgo: { ...SIN, escribeATerceros: true },
        lectura: false,
        desde: null,
      },
      {
        id: 'abrir_renovacion',
        titulo: 'Abrir la renovación (propuesta con el incremento)',
        entidad: CONTRATO,
        disponible: false,
        porQueNo: 'Faltan 218 días para el fin: la renovación se propone 3 meses antes.',
        riesgo: SIN,
        lectura: false,
        desde: '2027-01-29',
      },
    ],
  });

  it('cada acción disponible es un mensaje de la persona con su intención (y cuenta como tarjeta abierta)', () => {
    pintar(m);
    act(() => boton('Mandarle el estado de cuenta por correo')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Mandarle el estado de cuenta por correo', {
      intencion: { accion: 'mandar_estado_de_cuenta_por_correo', entidad: CONTRATO },
    });
    expect(contexto.anotarTarjetaAbierta).toHaveBeenCalledWith('t-1', CONTRATO);
    expect(container.querySelector('a')).toBeNull();
  });

  // Nico (23-09, 23:47): «que se vea que es un CTA… que diga cómo ver lo que
  // no se puede hacer ahora».
  it('lo que no se puede: un botón que dice qué muestra y cuántas, en el pie de la caja; adentro, el porqué y desde cuándo', () => {
    pintar(m);
    expect(boton('Mandarle el estado de cuenta por WhatsApp')).toBeUndefined();
    const caja = container.querySelector('[data-testid="caja-de-acciones"]')!;
    const ver = caja.querySelector('[data-pie-de-caja] button')!;
    expect(ver.textContent).toBe('Ver 2 acciones que todavía no puedes hacer');
    // A 390 px el texto parte línea dentro de la caja, no se sale del hilo.
    expect(ver.className).toContain('whitespace-normal');
    expect(ver.className).toContain('max-w-full');
    expect(ver.getAttribute('aria-expanded')).toBe('false');
    act(() => (ver as HTMLButtonElement).click());
    expect(ver.getAttribute('aria-expanded')).toBe('true');
    expect(ver.textContent).toBe('Ocultar las acciones que no puedes hacer');
    const lista = container.querySelector('[data-testid="acciones-no-disponibles"]')!;
    expect(ver.getAttribute('aria-controls')).toBe(lista.id);
    expect(lista.textContent).toContain('no aceptó recibir mensajes por WhatsApp');
    expect(lista.textContent).toContain('Abrir la renovación (propuesta con el incremento) · se puede desde el 29 de enero de 2027');
    expect(lista.querySelector('button')).toBeNull();
    // Mostrar/ocultar no es un mensaje ni navega; la primera vez es una señal.
    expect(contexto.sendMessage).not.toHaveBeenCalled();
    expect(contexto.anotarTarjetaAbierta).toHaveBeenCalledTimes(1);
    act(() => (ver as HTMLButtonElement).click());
    act(() => (ver as HTMLButtonElement).click());
    expect(contexto.anotarTarjetaAbierta).toHaveBeenCalledTimes(1);
  });

  it('en singular cuando es una', () => {
    pintar(mensaje({ acciones: [m.acciones![2]] }));
    expect(container.querySelector('[data-pie-de-caja] button')!.textContent).toBe('Ver 1 acción que todavía no puedes hacer');
  });

  it('mientras el chat trabaja, los botones no mandan', () => {
    contexto.isThinking = true;
    pintar(m);
    act(() => boton('Ver el estado de cuenta')!.click());
    expect(contexto.sendMessage).not.toHaveBeenCalled();
  });
});

describe('«Voy a … ¿Lo hago?»', () => {
  const conf = mensaje({
    confirmacion: {
      propuestaId: PROPUESTA,
      accion: 'mandar_estado_de_cuenta_por_correo',
      titulo: 'Mandarle el estado de cuenta por correo',
      frase: 'Voy a mandarle el estado de cuenta de el contrato #24 a Mateo Pérez por correo (mateo.perez@example.com).',
      pregunta: '¿Lo hago?',
      porQue: 'Le escribe a otra persona: aunque estés en Automático, eso siempre te lo pregunto antes.',
      modo: 'automatico',
      riesgo: { ...SIN, escribeATerceros: true },
      venceEn: new Date(Date.now() + 600_000).toISOString(),
    },
  });

  it('«Sí, hazlo» es un mensaje de la persona que confirma ESA propuesta', () => {
    pintar(conf);
    expect(container.textContent).toContain('Le escribe a otra persona');
    act(() => boton('Sí, hazlo')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Sí, hazlo', { intencion: { accion: 'confirmar', propuestaId: PROPUESTA } });
  });

  it('«No» también', () => {
    pintar(conf);
    act(() => boton('No')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('No, no lo hagas', { intencion: { accion: 'cancelar', propuestaId: PROPUESTA } });
  });

  it('ya contestada (hay un «Sí» después en el hilo), no vuelve a ofrecer los botones', () => {
    contexto.messages = [
      conf,
      { id: 'u-2', role: 'user', content: 'Sí, hazlo', timestamp: new Date(), status: 'sent', intencion: { accion: 'confirmar', propuestaId: PROPUESTA } },
    ];
    act(() => root.render(<AccionesEnElHilo message={conf} />));
    expect(boton('Sí, hazlo')).toBeUndefined();
    expect(container.querySelector('[data-estado="confirmar"]')).not.toBeNull();
  });

  it('en Manual la píldora dice el modo y la pregunta es «¿Lo hago por ti?»', () => {
    pintar(mensaje({ confirmacion: { ...conf.confirmacion!, modo: 'manual', riesgo: SIN, pregunta: '¿Lo hago por ti?' } }));
    expect(container.textContent).toContain('Manual');
    expect(container.textContent).toContain('¿Lo hago por ti?');
  });
});

describe('el resultado', () => {
  it('hecho, con «Deshacer» como otro mensaje de la persona', () => {
    pintar(
      mensaje({
        resultado: {
          propuestaId: PROPUESTA,
          estado: 'hecha',
          titulo: 'Registrar un pago o abono',
          resumen: 'Registré el pago de $500.000 en el contrato #24.',
          deshacer: { propuestaId: PROPUESTA, etiqueta: 'Anular el recibo' },
        },
      }),
    );
    expect(container.textContent).toContain('Hecho');
    act(() => boton('Deshacer')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith('Deshacer: Anular el recibo', {
      intencion: { accion: 'deshacer', propuestaId: PROPUESTA },
    });
  });

  it('un fallo se dice con su explicación (y como alerta), nunca «Error»', () => {
    pintar(
      mensaje({
        resultado: {
          propuestaId: PROPUESTA,
          estado: 'fallida',
          titulo: 'Preparar la carta del incremento',
          resumen: 'La carta ya existe para ese aniversario.',
          deshacer: null,
        },
      }),
    );
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('La carta ya existe para ese aniversario.');
    expect(container.textContent).not.toMatch(/\bError\b/);
  });
});

describe('los datos que faltan, en el hilo', () => {
  it('se llenan y salen como mensaje de la persona con los datos', () => {
    pintar(
      mensaje({
        formulario: {
          accion: 'avisar_no_renovacion',
          entidad: CONTRATO,
          titulo: 'Registrar el aviso de no renovación',
          frase: 'Para registrar el aviso…',
          campos: [
            { clave: 'motivo', etiqueta: 'Motivo', tipo: 'texto', requerido: true, opciones: [], ayuda: null, valor: null },
            { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, opciones: [], ayuda: null, valor: '2026-09-23' },
          ],
          errores: [],
        },
      }),
    );
    const enviar = boton('Listo, sigue')!;
    expect(enviar.disabled).toBe(true);
    const input = container.querySelector<HTMLInputElement>('#campo-avisar_no_renovacion-motivo')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'Se va a vivir a otra ciudad');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => boton('Listo, sigue')!.click());
    expect(contexto.sendMessage).toHaveBeenCalledWith(
      'Registrar el aviso de no renovación: Se va a vivir a otra ciudad · 2026-09-23',
      {
        intencion: {
          accion: 'avisar_no_renovacion',
          entidad: CONTRATO,
          datos: { motivo: 'Se va a vivir a otra ciudad', fecha: '2026-09-23' },
        },
      },
    );
  });
});

void React;
