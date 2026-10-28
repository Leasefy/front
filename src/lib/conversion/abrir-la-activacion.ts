'use client';

import { useEffect, useState } from 'react';

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

/**
 * La ventana de activar está en curso (QA 28-10: al quedar activa, el muro de la migración salía encima y tapaba el
 * «quedó activa»). Mientras tanto el muro espera; al «Ir a mi panel» (carga completa) pregunta como siempre.
 */
const EN_CURSO = 'leasefy:activacion-en-curso';
let activacionEnCurso = false;

export function marcarActivacionEnCurso(en: boolean): void {
  if (activacionEnCurso === en) return;
  activacionEnCurso = en;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EN_CURSO));
}

export function useActivacionEnCurso(): boolean {
  const [en, setEn] = useState(activacionEnCurso);
  useEffect(() => {
    const escuchar = () => setEn(activacionEnCurso || recienActivada());
    window.addEventListener(EN_CURSO, escuchar);
    escuchar();
    return () => window.removeEventListener(EN_CURSO, escuchar);
  }, []);
  return en;
}

/**
 * La cuenta quedó activa en esta pestaña y todavía no se celebró: sobrevive a que la escena del segundo factor del
 * panel reemplace la ventana (QA 28-10). Con ella el muro espera y, al volver, sale el «quedó activa». Se borra con
 * «Ir a mi panel».
 */
const RECIEN_ACTIVADA = 'leasefy-recien-activada';
export function marcarRecienActivada(si: boolean): void {
  try {
    if (si) window.sessionStorage.setItem(RECIEN_ACTIVADA, '1');
    else window.sessionStorage.removeItem(RECIEN_ACTIVADA);
  } catch {
    /* sin almacenamiento: el muro pregunta como siempre */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EN_CURSO));
}
export function recienActivada(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(RECIEN_ACTIVADA) === '1';
  } catch {
    return false;
  }
}
