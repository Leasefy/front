/**
 * El dictado por voz (Nico, 02-10-2026: «uno le da clic a voz y no funciona,
 * se sale de una»). Chrome corta el reconocimiento solo (silencio, el minuto);
 * eso ya no apaga la escucha. Los errores se dicen, no se tragan.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { errorDeVoz, relojDeVoz, useDictadoPorVoz, type DictadoPorVoz } from './dictado-por-voz';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ReconocimientoFalso {
  static instancias: ReconocimientoFalso[] = [];
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: ((e: { results: Array<{ 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  arrancado = false;
  constructor() {
    ReconocimientoFalso.instancias.push(this);
  }
  start() {
    this.arrancado = true;
  }
  stop() {
    this.onend?.();
  }
  oye(...trozos: string[]) {
    this.onresult?.({ results: trozos.map((t) => ({ 0: { transcript: t } })) });
  }
}
const ultima = () => ReconocimientoFalso.instancias[ReconocimientoFalso.instancias.length - 1];

let container: HTMLDivElement;
let root: Root;
let dictado: DictadoPorVoz;
const alTerminar = vi.fn();

function Prueba({ valor }: { valor: string }) {
  dictado = useDictadoPorVoz(valor, alTerminar);
  return null;
}

beforeEach(() => {
  ReconocimientoFalso.instancias = [];
  alTerminar.mockReset();
  (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = ReconocimientoFalso;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.reject(new Error('sin micrófono en la prueba'))) },
  });
  container = document.createElement('div');
  root = createRoot(container);
  act(() => root.render(<Prueba valor="Escrito:" />));
});
afterEach(() => {
  act(() => root.unmount());
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe('useDictadoPorVoz', () => {
  it('donde el navegador dicta, está soportado', () => {
    expect(dictado.soportado).toBe(true);
  });

  it('el corte por silencio de Chrome NO apaga la escucha: vuelve a arrancar y acumula', () => {
    act(() => dictado.alternar());
    expect(dictado.escuchando).toBe(true);
    const primera = ultima();
    act(() => primera.oye('cuántos contratos'));
    expect(dictado.enVivo).toBe('cuántos contratos');

    // Chrome termina la vuelta solo (no-speech + end).
    act(() => {
      primera.onerror?.({ error: 'no-speech' });
      primera.onend?.();
    });
    expect(dictado.escuchando).toBe(true);
    expect(dictado.error).toBeNull();
    const segunda = ultima();
    expect(segunda).not.toBe(primera);
    expect(segunda.arrancado).toBe(true);

    act(() => segunda.oye('vencen el próximo mes'));
    expect(dictado.enVivo).toBe('cuántos contratos vencen el próximo mes');

    // «Listo»: para y deja todo en la caja, después de lo escrito.
    act(() => dictado.alternar());
    expect(dictado.escuchando).toBe(false);
    expect(alTerminar).toHaveBeenCalledWith('Escrito: cuántos contratos vencen el próximo mes');
  });

  it('«Cancelar» bota lo dictado', () => {
    act(() => dictado.alternar());
    act(() => ultima().oye('esto no va'));
    act(() => dictado.cancelar());
    expect(dictado.escuchando).toBe(false);
    expect(alTerminar).not.toHaveBeenCalled();
  });

  it('con el permiso negado se cierra DICIENDO por qué, no en silencio', () => {
    act(() => dictado.alternar());
    const rec = ultima();
    act(() => {
      rec.onerror?.({ error: 'not-allowed' });
      rec.onend?.();
    });
    expect(dictado.escuchando).toBe(false);
    expect(dictado.error).toBe('permiso');
    expect(ReconocimientoFalso.instancias).toHaveLength(1); // no reintenta
    act(() => dictado.limpiarError());
    expect(dictado.error).toBeNull();
  });

  it('un navegador con la API pero sin su servicio (Brave, Arc) dice «servicio»', () => {
    act(() => dictado.alternar());
    const rec = ultima();
    act(() => {
      rec.onerror?.({ error: 'network' });
      rec.onend?.();
    });
    expect(dictado.error).toBe('servicio');
  });
});

describe('errorDeVoz y relojDeVoz', () => {
  it('el silencio y la parada propia no son errores', () => {
    expect(errorDeVoz('no-speech')).toBeNull();
    expect(errorDeVoz('aborted')).toBeNull();
    expect(errorDeVoz('service-not-allowed')).toBe('permiso');
    expect(errorDeVoz('audio-capture')).toBe('microfono');
    expect(errorDeVoz('raro')).toBe('otro');
  });

  it('el reloj', () => {
    expect(relojDeVoz(7)).toBe('0:07');
    expect(relojDeVoz(92)).toBe('1:32');
  });
});
