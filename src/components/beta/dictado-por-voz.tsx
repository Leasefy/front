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
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface DictadoPorVoz {
  /** El navegador sabe reconocer voz y pedir el micrófono. */
  soportado: boolean;
  escuchando: boolean;
  /** Lo que va reconociendo mientras se habla (se vacía al terminar). */
  enVivo: string;
  alternar: () => void;
}

/**
 * @param valor  lo que ya hay escrito: lo dictado se le suma al final.
 * @param alTerminar recibe el texto completo (lo escrito + lo dictado).
 */
export function useDictadoPorVoz(valor: string, alTerminar: (texto: string) => void): DictadoPorVoz {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(false);
  const [enVivo, setEnVivo] = useState('');
  const reconocimiento = useRef<SpeechRecognitionLike | null>(null);
  const vivoRef = useRef('');
  const baseRef = useRef('');
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
      try {
        reconocimiento.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const empezar = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'es-CO';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      let txt = '';
      const { results } = event;
      for (let i = 0; i < results.length; i++) txt += results[i][0].transcript;
      vivoRef.current = txt;
      setEnVivo(txt);
    };
    rec.onerror = () => {
      setEscuchando(false);
      setEnVivo('');
    };
    rec.onend = () => {
      const final = vivoRef.current.trim();
      if (final) {
        const base = baseRef.current.trim();
        alTerminarRef.current(base ? `${base} ${final}` : final);
      }
      vivoRef.current = '';
      setEnVivo('');
      setEscuchando(false);
    };
    reconocimiento.current = rec;
    baseRef.current = valor;
    vivoRef.current = '';
    setEnVivo('');
    try {
      rec.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
    }
  }, [valor]);

  const alternar = useCallback(() => {
    if (escuchando) {
      try {
        reconocimiento.current?.stop();
      } catch {
        /* noop */
      }
    } else {
      empezar();
    }
  }, [escuchando, empezar]);

  return { soportado, escuchando, enVivo, alternar };
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
