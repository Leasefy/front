'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * El dictado por voz del chat, de una sola fuente.
 *
 * Vivía dentro de `ChatInput` (variante `hero`). La llegada del chat
 * (`CajaDeLlegada`) también lo ofrece, y dos copias del mismo reconocimiento
 * de voz terminan diciendo cosas distintas: salió de ahí tal cual.
 *
 * Es Web Speech del navegador, en es-CO: no manda audio a Leasefy ni al
 * agente — el texto dictado cae en la caja y se envía como cualquier otro.
 * Donde el navegador no lo soporta, `soportado` es `false` y el botón no se
 * dibuja (un botón que no hace nada es peor que ninguno).
 */

/** Lo mínimo que se usa del SpeechRecognition del navegador (no está en lib.dom). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Por qué no se pudo dictar, en palabras de la persona (las frases viven en
 * `beta.welcome.vozError.*`):
 * - `permiso`: el navegador no dio el micrófono (`not-allowed`, `service-not-allowed`).
 * - `microfono`: no hay micrófono (`audio-capture`).
 * - `servicio`: el navegador tiene la API pero no su servicio de dictado
 *   (`network`: Brave, Arc y otros Chromium sin las llaves de Google).
 * - `otro`: cualquier otro fallo.
 */
export type ErrorDeVoz = 'permiso' | 'microfono' | 'servicio' | 'otro';

export function errorDeVoz(codigo: string | undefined): ErrorDeVoz | null {
  switch (codigo) {
    case 'no-speech':
    case 'aborted':
      return null; // silencio o parada propia: no es un error
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permiso';
    case 'audio-capture':
      return 'microfono';
    case 'network':
      return 'servicio';
    default:
      return 'otro';
  }
}

export interface DictadoPorVoz {
  /** El navegador sabe reconocer voz y pedir el micrófono. */
  soportado: boolean;
  escuchando: boolean;
  /** Lo que va reconociendo mientras se habla (se vacía al terminar). */
  enVivo: string;
  /** Segundos desde que empezó a escuchar (0 si no escucha). */
  segundos: number;
  /** Por qué se cortó la última vez (se limpia al volver a intentar). */
  error: ErrorDeVoz | null;
  alternar: () => void;
  /** Deja de escuchar y BOTA lo dictado: la caja queda como estaba. */
  cancelar: () => void;
  limpiarError: () => void;
}

/**
 * 🔴 «Uno le da clic a voz y no funciona, se sale de una» (Nico, 02-10-2026).
 * Dos causas, las dos arregladas acá:
 * 1. Chrome corta el reconocimiento solo: tras unos segundos de silencio
 *    (`no-speech`) o al minuto, aun con `continuous`. Antes ese `onend`
 *    apagaba la escucha. Ahora, si la persona no paró, se vuelve a arrancar
 *    y lo dictado se acumula: escucha hasta «Listo» o «Cancelar».
 * 2. Los errores (permiso negado, sin micrófono, navegador sin servicio de
 *    dictado) cerraban en silencio. Ahora quedan en `error` y la caja lo dice.
 *
 * @param valor  lo que ya hay escrito: lo dictado se le suma al final.
 * @param alTerminar recibe el texto completo (lo escrito + lo dictado).
 */
export function useDictadoPorVoz(valor: string, alTerminar: (texto: string) => void): DictadoPorVoz {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(false);
  const [enVivo, setEnVivo] = useState('');
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<ErrorDeVoz | null>(null);
  const reconocimiento = useRef<SpeechRecognitionLike | null>(null);
  /** Lo que había escrito antes de dictar. */
  const baseRef = useRef('');
  /** Lo dictado en las vueltas anteriores (Chrome reinicia los resultados en cada vuelta). */
  const acumuladoRef = useRef('');
  /** Lo de la vuelta en curso. */
  const vivoRef = useRef('');
  /** La persona paró («Listo»), canceló, o hubo un error que no se arregla reintentando. */
  const pararRef = useRef<'no' | 'listo' | 'cancelar' | 'error'>('no');
  const reintentosRef = useRef(0);
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  useEffect(() => {
    setSoportado(
      typeof window !== 'undefined' &&
        ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia
    );
    return () => {
      pararRef.current = 'cancelar';
      try {
        reconocimiento.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const juntar = (...partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join(' ');

  const empezar = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError('servicio');
      return;
    }

    baseRef.current = valor;
    acumuladoRef.current = '';
    vivoRef.current = '';
    pararRef.current = 'no';
    reintentosRef.current = 0;
    setEnVivo('');
    setError(null);

    const arrancar = () => {
      const rec = new SR();
      rec.lang = 'es-CO';
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (event) => {
        let txt = '';
        const { results } = event;
        for (let i = 0; i < results.length; i++) txt += results[i][0].transcript;
        vivoRef.current = txt;
        reintentosRef.current = 0; // oyó algo: la vuelta sirvió
        setEnVivo(juntar(acumuladoRef.current, txt));
      };
      rec.onerror = (event) => {
        const tipo = errorDeVoz(event?.error);
        if (!tipo) return; // silencio: el `onend` lo vuelve a arrancar
        pararRef.current = 'error';
        setError(tipo);
      };
      rec.onend = () => {
        acumuladoRef.current = juntar(acumuladoRef.current, vivoRef.current);
        vivoRef.current = '';
        // Se cortó solo (silencio, el minuto de Chrome): otra vuelta. Con tope,
        // para no quedar en un bucle si el navegador corta al instante siempre.
        if (pararRef.current === 'no' && reintentosRef.current < 20) {
          reintentosRef.current += 1;
          try {
            arrancar();
            return;
          } catch {
            /* cae al cierre */
          }
        }
        const dictado = pararRef.current === 'cancelar' ? '' : acumuladoRef.current;
        if (dictado) alTerminarRef.current(juntar(baseRef.current, dictado));
        acumuladoRef.current = '';
        setEnVivo('');
        setEscuchando(false);
      };
      reconocimiento.current = rec;
      rec.start();
    };

    try {
      arrancar();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
      setError('otro');
    }
  }, [valor]);

  const parar = useCallback((como: 'listo' | 'cancelar') => {
    pararRef.current = como;
    try {
      reconocimiento.current?.stop();
    } catch {
      setEscuchando(false);
    }
  }, []);

  const alternar = useCallback(() => {
    if (escuchando) parar('listo');
    else empezar();
  }, [escuchando, empezar, parar]);

  const cancelar = useCallback(() => parar('cancelar'), [parar]);
  const limpiarError = useCallback(() => setError(null), []);

  // El reloj de «0:07»: corre sólo mientras escucha.
  useEffect(() => {
    if (!escuchando) {
      setSegundos(0);
      return;
    }
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [escuchando]);

  return { soportado, escuchando, enVivo, segundos, error, alternar, cancelar, limpiarError };
}

/** «0:07», «1:32». */
export function relojDeVoz(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

/**
 * Le pone a `ref` la variable CSS `--nivel` (0–1) con la intensidad real del
 * micrófono, cuadro a cuadro y sin re-render — la usa el resplandor de abajo
 * de la caja mientras se dicta (`.llegada-voz`, como el `<voice-beam>` de la
 * referencia). Sin permiso o sin micrófono, el nivel queda en un reposo suave:
 * nunca se finge que alguien habla. Con «reducir movimiento» no se anima.
 */
export function useNivelDelMicrofono(
  ref: React.RefObject<HTMLElement | null>,
  activo: boolean,
  reducido: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (!activo || !el) return;
    if (reducido) {
      el.style.setProperty('--nivel', '0.35');
      return;
    }
    let raf = 0;
    let audio: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let analizador: AnalyserNode | null = null;
    let datos: Float32Array<ArrayBuffer> | null = null;
    let cancelado = false;
    let nivel = 0;

    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (Ctx && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          if (cancelado) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          stream = s;
          audio = new Ctx();
          analizador = audio.createAnalyser();
          analizador.fftSize = 1024;
          audio.createMediaStreamSource(s).connect(analizador);
          datos = new Float32Array(analizador.fftSize);
        })
        .catch(() => {
          /* sin permiso: queda el reposo */
        });
    }

    const paso = (ahora: number) => {
      let objetivo = 0.12 + 0.05 * Math.sin(ahora / 700); // reposo: respira, no habla
      if (analizador && datos) {
        analizador.getFloatTimeDomainData(datos);
        let suma = 0;
        for (let i = 0; i < datos.length; i++) suma += datos[i] * datos[i];
        const rms = Math.sqrt(suma / datos.length);
        objetivo = Math.max(objetivo, Math.min(1, (rms * 6.5 - 0.02) / 0.98));
      }
      // Sube rápido y baja despacio, como la referencia.
      nivel += (objetivo - nivel) * (objetivo > nivel ? 0.35 : 0.1);
      el.style.setProperty('--nivel', nivel.toFixed(3));
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audio?.close().catch(() => {});
      el.style.removeProperty('--nivel');
    };
  }, [ref, activo, reducido]);
}

const BARRAS = 5;

/**
 * Ecualizador que reacciona al micrófono de verdad: abre su propio stream y
 * mueve N barras con un AnalyserNode por rAF (refs, sin re-render). En reposo,
 * un piso suave. Se limpia solo.
 */
export function BarrasDeVoz() {
  const barras = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let raf = 0;
    let audio: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelado = false;

    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        audio = new Ctx();
        const fuente = audio.createMediaStreamSource(s);
        const analizador = audio.createAnalyser();
        analizador.fftSize = 64;
        analizador.smoothingTimeConstant = 0.7;
        fuente.connect(analizador);
        const datos = new Uint8Array(analizador.frequencyBinCount);

        const paso = () => {
          analizador.getByteFrequencyData(datos);
          for (let i = 0; i < BARRAS; i++) {
            const el = barras.current[i];
            if (!el) continue;
            const v = datos[i * 2 + 2] / 255; // los bins medios-bajos llevan la voz
            el.style.transform = `scaleY(${Math.max(0.18, Math.min(1, 0.18 + v * 1.9))})`;
          }
          raf = requestAnimationFrame(paso);
        };
        paso();
      })
      .catch(() => {
        /* sin permiso o sin micrófono: las barras quedan en el piso */
      });

    return () => {
      cancelado = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audio?.close().catch(() => {});
    };
  }, []);

  return (
    <span className="flex h-7 items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: BARRAS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barras.current[i] = el;
          }}
          className="h-7 w-[3px] rounded-full bg-primary will-change-transform"
          style={{ transform: 'scaleY(0.2)', transformOrigin: 'center' }}
        />
      ))}
    </span>
  );
}
