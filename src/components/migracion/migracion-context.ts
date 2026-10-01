'use client';

/**
 * Lo que el panel sabe de la migración sin ser el muro.
 *
 * El estado que contestó el back —con el muro abajo inclusive— y «abrir» la
 * migración a pantalla completa. Lo provee `MuroDeMigracion` y lo consumen el
 * recordatorio del sidebar y Configuración → Migración (Nico, 2026-09-07: «si
 * no la ha terminado, que le salga en la sidebar el estado de dónde va,
 * incitando a que la termine»). `null` fuera del panel de la inmobiliaria:
 * afuera nadie abre nada.
 *
 * Vive en su propio módulo para que quien lo consume no arrastre el muro
 * entero (y sus seis importadores) por un `useContext`.
 */

import { createContext, useContext } from 'react';
import type { EstadoDeMigracion } from '@/lib/api/migracion-estado.service';

export interface ContextoDeMigracion {
  /** Lo último que dijo el back, bloquee o no. `null` = no se sabe. */
  estado: EstadoDeMigracion | null;
  /** Abre la migración a pantalla completa con el muro abajo. */
  abrir: () => void;
  /** Vuelve a preguntar el estado. */
  recargar: () => Promise<void>;
  /**
   * `true` mientras algo de la migración tapa el panel: el muro (o la pregunta
   * previa), la migración abierta a mano o la bienvenida. Es la señal para lo
   * que NO puede salir encima de eso —el recorrido del panel, por ejemplo—:
   * con `false` y el segundo factor resuelto (`useAuth().mfaEnrollRequired` y
   * `mfaRequired` en `false`), la persona ya está en el panel de verdad.
   * Opcional: quien arme el contexto a mano (pruebas) puede omitirla.
   */
  panelTapado?: boolean;
}

export const MigracionContext = createContext<ContextoDeMigracion | null>(null);

export function useMigracion(): ContextoDeMigracion | null {
  return useContext(MigracionContext);
}

/**
 * El muro le AVISA hacia arriba si está tapando el panel (`panelTapado`).
 *
 * Lo escucha `SegundoFactorDentroDelPanel`, que vive en el layout por ENCIMA
 * del muro y por eso no puede leer `useMigracion()`. Orden acordado con Nico
 * (30-09-2026): migración → segundo factor → recorrido. Si `mfaEnrollRequired`
 * se prende mientras el muro, la pregunta o la bienvenida siguen en pantalla,
 * el panel (con el muro) se queda; la escena del segundo factor entra cuando
 * el muro deja de tapar. `null` fuera de ese layout: nadie escucha.
 */
export const AvisoDelMuroContext = createContext<((tapado: boolean) => void) | null>(null);
