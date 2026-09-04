'use client';

/**
 * El comportamiento compartido de los tres paneles del compositor (emojis,
 * plantillas y pendientes): se abren con su botón, se cierran con Escape y con
 * un clic afuera.
 *
 * Está acá y no copiado tres veces porque el detalle que se olvida al copiar
 * es siempre el mismo: **desmontar los listeners**. Un panel que deja pegado
 * su `keydown` en `document` sigue comiéndose el Escape del resto de la
 * pantalla —del cajón de «Nuevo mensaje», del diálogo de reportar— mucho
 * después de haberse cerrado.
 *
 * 🔴 El clic de afuera se escucha en `mousedown`, no en `click`: con `click` el
 * botón que abre el panel dispara primero el cierre del panel anterior y
 * después su propio toggle, y el panel «no abre» sin que nada falle.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PanelFlotante<T extends HTMLElement> {
  abierto: boolean;
  /** Va en el contenedor que envuelve AL BOTÓN Y AL PANEL, no sólo al panel. */
  ref: React.RefObject<T>;
  alternar: () => void;
  cerrar: () => void;
}

export function usePanelFlotante<T extends HTMLElement = HTMLDivElement>(): PanelFlotante<T> {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<T>(null);

  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((v) => !v), []);

  useEffect(() => {
    if (!abierto) return;

    const alClicAfuera = (evento: MouseEvent) => {
      if (ref.current && !ref.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  return { abierto, ref, alternar, cerrar };
}
