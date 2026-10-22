'use client';

/**
 * Un estado de pantalla (filtros, orden, pestaña) que vive TAMBIÉN en la URL
 * (DESIGN.md §25.1, punto 6b: «filtros y pestaña quedan en la URL»).
 *
 * Sin esto, abrir una fila y volver dejaba la lista en blanco: los filtros que
 * la persona había puesto se perdían al remontar la página, y un enlace no
 * podía llevar a «los contratos por firmar».
 *
 * - Al montar lee `window.location.search` con `leer` (que valida: un valor
 *   desconocido vuelve al de por defecto, nunca deja la lista vacía).
 * - Cada cambio se escribe con `history.replaceState` (sin remontar la página,
 *   sin llenar el historial con cada letra del buscador). Next sincroniza
 *   `useSearchParams` con `replaceState` desde la 14.1.
 * - Lee `window` y no `useSearchParams` a propósito: así no pide `Suspense` y
 *   las pruebas no necesitan simular el enrutador.
 */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export interface ComoVaEnLaUrl<T> {
  /** De los parámetros de la URL al estado (validando cada valor). */
  leer: (params: URLSearchParams) => T;
  /** Del estado a los parámetros: pone los que difieren del valor por defecto y borra los demás. */
  escribir: (valor: T, params: URLSearchParams) => void;
}

export function useEstadoEnLaUrl<T>(inicial: T, como: ComoVaEnLaUrl<T>): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(inicial);
  const montado = useRef(false);
  const comoRef = useRef(como);
  comoRef.current = como;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setValor(comoRef.current.leer(new URLSearchParams(window.location.search)));
  }, []);

  useEffect(() => {
    // El render de montaje todavía tiene el valor por defecto (la URL se lee en
    // el efecto de arriba): escribirlo borraría los filtros del enlace.
    if (!montado.current) {
      montado.current = true;
      return;
    }
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    comoRef.current.escribir(valor, url.searchParams);
    const nueva = `${url.pathname}${url.search}${url.hash}`;
    const actual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nueva !== actual) window.history.replaceState(window.history.state, '', nueva);
  }, [valor]);

  return [valor, setValor];
}
