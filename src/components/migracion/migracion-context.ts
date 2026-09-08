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
}

export const MigracionContext = createContext<ContextoDeMigracion | null>(null);

export function useMigracion(): ContextoDeMigracion | null {
  return useContext(MigracionContext);
}
