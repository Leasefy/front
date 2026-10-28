'use client';

import { useEffect } from 'react';

/**
 * «Activar mi cuenta» desde cualquier parte del panel (la tarjeta de una parte cerrada, el aviso del mes gratis) abre
 * los pasos cortos (`PasosParaActivar`, montado una vez en el layout) en vez de llevar al asistente largo.
 */
const EVENTO = 'leasefy:activar-la-cuenta';

export function abrirLaActivacion(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function useAlPedirLaActivacion(abrir: () => void): void {
  useEffect(() => {
    const escuchar = () => abrir();
    window.addEventListener(EVENTO, escuchar);
    return () => window.removeEventListener(EVENTO, escuchar);
  }, [abrir]);
}
