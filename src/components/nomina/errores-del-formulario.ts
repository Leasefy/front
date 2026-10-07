'use client';

/**
 * Los errores del servidor en los formularios de nómina, cada uno en su campo
 * (sistema de errores, 02-10-2026).
 *
 * Los tres formularios que escriben plata (persona, parámetros, pago de una
 * prestación) hacen lo mismo con un fallo: lo que el back manda en `campos` va
 * bajo su campo y se enfoca el primero; lo que no tiene campo va a un toast con
 * la regla de oro («conexión» sólo sin respuesta; un 5xx «de nuestro lado» con
 * la referencia). Escrito una vez para no repetir el `if` en tres pantallas.
 */

import { useCallback, useState } from 'react';

import { toast } from '@/components/ui/toast';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';

export interface OpcionesDelFallo<Campo extends string> {
  /** Los campos que el formulario muestra, con el nombre del DTO. */
  campos: readonly Campo[];
  /** Lo que se dice si el error no trae nada legible. */
  porDefecto: string;
  /** Lo que se estaba haciendo, en infinitivo («registrar el pago»). */
  accion: string;
}

export function useErroresDelFormulario<Campo extends string>(idDe: (campo: Campo) => string) {
  const [delServidor, setDelServidor] = useState<Partial<Record<Campo, string>>>({});

  /** La persona cambió el campo: el error del servidor ya no habla de lo que hay. */
  const olvidar = useCallback((campo: Campo) => {
    setDelServidor((d) => {
      if (d[campo] === undefined) return d;
      const siguiente = { ...d };
      delete siguiente[campo];
      return siguiente;
    });
  }, []);

  const limpiar = useCallback(() => setDelServidor({}), []);

  const repartir = useCallback(
    (error: unknown, { campos, porDefecto, accion }: OpcionesDelFallo<Campo>) => {
      const reparto = repartirErroresDelServidor<Campo>(error, { campos, porDefecto, accion });
      setDelServidor(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero && typeof document !== 'undefined') {
        document.getElementById(idDe(primero))?.focus();
      }
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    },
    [idDe],
  );

  return { delServidor, olvidar, limpiar, repartir };
}

/** `aria-invalid` + `aria-describedby` del control cuando su campo tiene error. */
export function atributosDelError(id: string, mensaje: string | null | undefined) {
  return mensaje
    ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` }
    : {};
}
