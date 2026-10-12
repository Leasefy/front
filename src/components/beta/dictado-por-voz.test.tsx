/**
 * El dictado por voz (Nico, 02-10-2026: «uno le da clic a voz y no funciona,
 * se sale de una»). Chrome corta el reconocimiento solo (silencio, el minuto);
 * eso ya no apaga la escucha. Los errores se dicen, no se tragan.
 *
 * Y donde el navegador no dicta (Nico, 12-10-2026: «en arc enserio no se puede
 * hacer dictado de voz?»), se graba y el micro lo pasa a texto.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import {
  errorDeVoz,
  olvidarQueElNavegadorNoDicta,
  relojDeVoz,
  TOPE_DEL_DICTADO_S,
  useDictadoPorVoz,
  type DictadoPorVoz,
} from './dictado-por-voz';

const micro = vi.hoisted(() => ({
  disponible: vi.fn(() => false),
  transcribir: vi.fn(),
}));
vi.mock('@/lib/api/dictado.service', () => ({
  CODIGO_DICTADO_NO_DISPONIBLE: 'DICTADO_NO_DISPONIBLE',
  dictadoPorElMicroDisponible: micro.disponible,
  transcribirElDictado: micro.transcribir,
}));

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

/** El `MediaRecorder` de Arc o Firefox: al parar entrega un trozo de audio. */
class GrabadorFalso {
  static instancias: GrabadorFalso[] = [];
  static isTypeSupported = (t: string) => t === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: unknown,
    opciones?: { mimeType?: string }
  ) {
    this.mimeType = opciones?.mimeType ?? '';
    GrabadorFalso.instancias.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voz'], { type: this.mimeType }) });
    this.onstop?.();
  }
}
const pista = { stop: vi.fn() };

/** Prende la grabación: hay `MediaRecorder`, micrófono y micro. */
function sePuedeGrabarEnLaPrueba() {
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = GrabadorFalso;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [pista] })) },
  });
  micro.disponible.mockReturnValue(true);
}

/** Deja correr las promesas pendientes (el permiso del micrófono, la respuesta del micro). */
async function esperar() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

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
  GrabadorFalso.instancias = [];
  olvidarQueElNavegadorNoDicta();
  micro.disponible.mockReset().mockReturnValue(false);
  micro.transcribir.mockReset();
  pista.stop.mockReset();
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
  delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
  vi.useRealTimers();
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

  it('un navegador con la API pero sin su servicio (Brave, Arc) y sin poder grabar dice «servicio»', () => {
    act(() => dictado.alternar());
    const rec = ultima();
    act(() => {
      rec.onerror?.({ error: 'network' });
      rec.onend?.();
    });
    expect(dictado.error).toBe('servicio');
  });
});

describe('useDictadoPorVoz donde el navegador no dicta (Arc, Brave, Firefox; Nico 12-10)', () => {
  beforeEach(() => sePuedeGrabarEnLaPrueba());

  it('Arc: el servicio falla y la escucha SIGUE, grabando; «Listo» manda lo grabado al micro y el texto cae después de lo escrito', async () => {
    micro.transcribir.mockResolvedValue('dos habitaciones en Laureles');
    act(() => dictado.alternar());
    const rec = ultima();
    act(() => {
      rec.onerror?.({ error: 'network' });
      rec.onend?.();
    });
    await esperar();
    expect(dictado.error).toBeNull();
    expect(dictado.escuchando).toBe(true);
    expect(dictado.modo).toBe('grabacion');
    expect(GrabadorFalso.instancias).toHaveLength(1);
    expect(GrabadorFalso.instancias[0].mimeType).toBe('audio/webm;codecs=opus');
    expect(ReconocimientoFalso.instancias).toHaveLength(1); // no vuelve a probar el navegador

    act(() => dictado.alternar()); // «Listo»
    expect(dictado.escuchando).toBe(false);
    expect(dictado.transcribiendo).toBe(true);
    expect(pista.stop).toHaveBeenCalled(); // suelta el micrófono
    const [audio] = micro.transcribir.mock.calls[0] as [Blob];
    expect(audio.type).toBe('audio/webm;codecs=opus');

    await esperar();
    expect(dictado.transcribiendo).toBe(false);
    expect(alTerminar).toHaveBeenCalledWith('Escrito: dos habitaciones en Laureles');
  });

  it('después del primer fallo, la siguiente vez graba de una (no prueba el navegador otra vez)', async () => {
    micro.transcribir.mockResolvedValue('hola');
    act(() => dictado.alternar());
    act(() => {
      ultima().onerror?.({ error: 'network' });
      ultima().onend?.();
    });
    await esperar();
    act(() => dictado.alternar());
    await esperar();

    act(() => dictado.alternar());
    await esperar();
    expect(ReconocimientoFalso.instancias).toHaveLength(1);
    expect(GrabadorFalso.instancias).toHaveLength(2);
    expect(dictado.modo).toBe('grabacion');
  });

  it('Firefox (sin la API): el botón está y graba de una', async () => {
    act(() => root.unmount());
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    root = createRoot(container);
    act(() => root.render(<Prueba valor="" />));
    expect(dictado.soportado).toBe(true);

    act(() => dictado.alternar());
    await esperar();
    expect(dictado.escuchando).toBe(true);
    expect(dictado.modo).toBe('grabacion');
    expect(GrabadorFalso.instancias).toHaveLength(1);
  });

  it('«Cancelar» mientras graba no manda nada al micro', async () => {
    olvidarQueElNavegadorNoDicta();
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    act(() => dictado.alternar());
    await esperar();
    act(() => dictado.cancelar());
    await esperar();
    expect(dictado.escuchando).toBe(false);
    expect(micro.transcribir).not.toHaveBeenCalled();
    expect(alTerminar).not.toHaveBeenCalled();
  });

  it(`al minuto (${TOPE_DEL_DICTADO_S} s) para solo y transcribe lo que hay`, async () => {
    vi.useFakeTimers();
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    micro.transcribir.mockResolvedValue('un minuto de búsqueda');
    act(() => dictado.alternar());
    await esperar();
    expect(dictado.escuchando).toBe(true);

    act(() => vi.advanceTimersByTime(TOPE_DEL_DICTADO_S * 1000));
    await esperar();
    expect(micro.transcribir).toHaveBeenCalledTimes(1);
    expect(alTerminar).toHaveBeenCalledWith('Escrito: un minuto de búsqueda');
  });

  it('si el micro dice que ya dictó mucho (429), se dice «limite»; si no entendió (422), «otro»', async () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    micro.transcribir.mockRejectedValueOnce(new ApiError(429, 'Ya dictaste muchas veces', 'DEMASIADOS_DICTADOS'));
    act(() => dictado.alternar());
    await esperar();
    act(() => dictado.alternar());
    await esperar();
    expect(dictado.error).toBe('limite');
    expect(alTerminar).not.toHaveBeenCalled();

    micro.transcribir.mockRejectedValueOnce(new ApiError(422, 'No pude entender', 'NO_SE_ENTENDIO'));
    act(() => dictado.alternar());
    await esperar();
    act(() => dictado.alternar());
    await esperar();
    expect(dictado.error).toBe('otro');
  });

  it('con el micrófono negado al grabar, «permiso»', async () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => Promise.reject(Object.assign(new Error('negado'), { name: 'NotAllowedError' }))),
      },
    });
    act(() => dictado.alternar());
    await esperar();
    expect(dictado.escuchando).toBe(false);
    expect(dictado.error).toBe('permiso');
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
