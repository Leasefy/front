'use client';

/**
 * El borrador del asistente de publicación: guardarlo solo y ofrecerlo al
 * volver. El porqué de dónde vive está en `lib/inmuebles/borrador-de-publicacion.ts`.
 *
 * Dos reglas que este hook sostiene y que son la mitad del pedido:
 *
 * 1. **Nunca se revive a escondidas.** Al montar sólo se LEE. Lo que haya
 *    queda en `encontrado` y el asistente sigue en blanco hasta que la persona
 *    diga «continuar» o «descartar». Que la pantalla se rellene sola al entrar
 *    es peor que perder el borrador: nadie sabe de dónde salieron esos datos
 *    ni si son de este inmueble.
 * 2. **Mientras hay una decisión pendiente no se guarda nada.** Si el
 *    autoguardado corriera con el aviso en pantalla, el primer campo que
 *    alguien toque pisaría el borrador que todavía no decidió si quiere.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  almacenDePublicacion,
  estaVencido,
  hayAlgoQueGuardar,
  llaveDelBorrador,
  sinRepetidas,
  VERSION_DEL_FORMATO,
  type BorradorDePublicacion,
  type DatosDelBorrador,
} from '@/lib/inmuebles/borrador-de-publicacion';

/** Cuánto se espera después de la última tecla antes de escribir. */
export const ESPERA_MS = 800;

interface Opciones {
  agencyId?: string | null;
  userId?: string | null;
  /** El formulario actual, sin fotos. */
  datos: DatosDelBorrador;
  fotos: File[];
  paso: number;
  /**
   * Con `false` el hook no lee ni escribe nada. Se usa mientras la sesión
   * todavía no dice quién es: sin usuario la llave sería la de «sin-usuario» y
   * dos personas compartirían borrador.
   */
  activo: boolean;
}

export interface EstadoDelBorradorDePublicacion {
  /** El borrador que había al entrar, SIN aplicar. `null` = no había. */
  encontrado: BorradorDePublicacion | null;
  /** Se está esperando que la persona decida qué hacer con `encontrado`. */
  decisionPendiente: boolean;
  /** Cuándo se guardó por última vez, para poder decirlo en pantalla. */
  guardadoEn: number | null;
  /** Lo toma quien va a aplicarlo; deja de ofrecerlo. */
  aceptar: () => BorradorDePublicacion | null;
  /** Lo borra del navegador y deja de ofrecerlo. */
  descartar: () => Promise<void>;
  /** Borra el borrador sin preguntar (al publicar, al cancelar). */
  limpiar: () => Promise<void>;
}

export function useBorradorDePublicacion({
  agencyId,
  userId,
  datos,
  fotos,
  paso,
  activo,
}: Opciones): EstadoDelBorradorDePublicacion {
  const [encontrado, setEncontrado] = useState<BorradorDePublicacion | null>(null);
  const [decisionPendiente, setDecisionPendiente] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<number | null>(null);
  /**
   * La pausa se lleva por DOS caminos a propósito: el estado hace que el
   * autoguardado vuelva a correr cuando se suelta, y el `ref` corta el
   * temporizador que ya estaba en vuelo (el estado tarda un render en llegar,
   * y en ese hueco un guardado pendiente reviviría un borrador recién
   * borrado).
   */
  const [pausado, setPausado] = useState(true);
  const pausaRef = useRef(true);
  const pausar = useCallback((valor: boolean) => {
    pausaRef.current = valor;
    setPausado(valor);
  }, []);
  const llave = llaveDelBorrador(agencyId, userId);

  // Al entrar: ¿quedó algo de la última vez? Sólo se lee.
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    pausar(true);
    const almacen = almacenDePublicacion();
    void almacen
      .leer(llave)
      .then(async (b) => {
        if (!vivo) return;
        if (b && estaVencido(b)) {
          // Un borrador vencido o de otro formato se tira acá mismo: ofrecerlo
          // sería ofrecer un inmueble que ya casi seguro se cargó por otro lado.
          await almacen.borrar(llave);
          pausar(false);
          return;
        }
        if (b) {
          setEncontrado(b);
          setDecisionPendiente(true);
          // Sigue en pausa: el autoguardado se suelta recién cuando decida.
        } else {
          pausar(false);
        }
      })
      .catch(() => {
        // Sin borrador legible se trabaja igual, en blanco: el asistente no
        // depende de esto para funcionar.
        pausar(false);
      });
    return () => {
      vivo = false;
    };
  }, [activo, llave, pausar]);

  // Autoguardado. Se escribe todo el formulario cada vez, no un parche: el
  // borrador es una foto del asistente, y una foto parcial no se puede retomar.
  useEffect(() => {
    if (!activo || pausado) return;
    if (!hayAlgoQueGuardar(datos, fotos)) return;
    const reloj = setTimeout(() => {
      if (pausaRef.current) return;
      const ahora = Date.now();
      void almacenDePublicacion()
        .guardar({
          llave,
          datos,
          fotos: sinRepetidas(fotos),
          paso,
          actualizadoEn: ahora,
          version: VERSION_DEL_FORMATO,
        })
        .then(() => setGuardadoEn(ahora))
        .catch(() => {
          // Que no se pueda guardar no puede frenar la carga del inmueble. Se
          // queda sin borrador, como antes de este cambio.
        });
    }, ESPERA_MS);
    return () => clearTimeout(reloj);
  }, [activo, datos, fotos, paso, llave, pausado]);

  const aceptar = useCallback(() => {
    setDecisionPendiente(false);
    pausar(false);
    const b = encontrado;
    setEncontrado(null);
    if (b) setGuardadoEn(b.actualizadoEn);
    return b;
  }, [encontrado, pausar]);

  const descartar = useCallback(async () => {
    setDecisionPendiente(false);
    setEncontrado(null);
    pausar(false);
    setGuardadoEn(null);
    await almacenDePublicacion().borrar(llave).catch(() => {});
  }, [llave, pausar]);

  const limpiar = useCallback(async () => {
    // Se pausa ANTES de borrar: si no, el autoguardado pendiente volvería a
    // escribirlo un segundo después y el borrador reviviría solo.
    pausar(true);
    setGuardadoEn(null);
    await almacenDePublicacion().borrar(llave).catch(() => {});
  }, [llave, pausar]);

  return { encontrado, decisionPendiente, guardadoEn, aceptar, descartar, limpiar };
}
