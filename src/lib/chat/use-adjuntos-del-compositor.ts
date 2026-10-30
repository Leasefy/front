'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_ADJUNTOS_POR_MENSAJE,
  familiaDe,
  porQueNoSeAdjunta,
  type AdjuntoDelMensaje,
  type FamiliaDelAdjunto,
} from './adjuntos';
import { subirAdjuntoDelChat, type SubidaEnCurso } from './subir-adjunto';

/** Un archivo en el compositor, antes de mandar el mensaje. */
export interface AdjuntoEnElCompositor {
  /** Id local (el del servidor llega al terminar de subir). */
  clave: string;
  nombre: string;
  tamano: number;
  familia: FamiliaDelAdjunto;
  estado: 'subiendo' | 'listo' | 'error';
  /** 0 a 1. */
  avance: number;
  /** URL local de la miniatura (sólo fotos); se libera al quitarla. */
  miniatura: string | null;
  adjunto: AdjuntoDelMensaje | null;
  error: string | null;
}

export interface AdjuntosDelCompositor {
  adjuntos: AdjuntoEnElCompositor[];
  /** Agrega archivos; devuelve los que no entraron, con su porqué. */
  agregar: (archivos: readonly File[]) => string[];
  quitar: (clave: string) => void;
  reintentar: (clave: string) => void;
  /** Lo listo para mandar, y vacía el compositor (sin cancelar nada que ya subió). */
  tomarLosListos: () => AdjuntoDelMensaje[];
  /** Hay alguno subiendo: el mensaje espera. */
  subiendo: boolean;
  /** Hay alguno listo. */
  hayListos: boolean;
  /** El último aviso (lo que no entró), para decirlo junto a la caja. */
  aviso: string | null;
  limpiarAviso: () => void;
}

let contador = 0;
const nuevaClave = () => `adj-${Date.now().toString(36)}-${(contador++).toString(36)}`;

type Subir = typeof subirAdjuntoDelChat;

/**
 * Los archivos del compositor del chat: cada uno sube APENAS se agrega (así,
 * al mandar, ya están), con su avance; se pueden quitar antes de mandar (la
 * subida se cancela) y reintentar si falló.
 */
export function useAdjuntosDelCompositor(opciones: { subir?: Subir } = {}): AdjuntosDelCompositor {
  const subir = opciones.subir ?? subirAdjuntoDelChat;
  const [adjuntos, setAdjuntos] = useState<AdjuntoEnElCompositor[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const subidas = useRef(new Map<string, SubidaEnCurso>());
  const archivos = useRef(new Map<string, File>());
  const vivos = useRef(adjuntos);
  vivos.current = adjuntos;

  const cambiar = useCallback((clave: string, cambio: Partial<AdjuntoEnElCompositor>) => {
    setAdjuntos((prev) => prev.map((a) => (a.clave === clave ? { ...a, ...cambio } : a)));
  }, []);

  const empezar = useCallback(
    (clave: string, archivo: File) => {
      const s = subir(archivo, (f) => cambiar(clave, { avance: f }));
      subidas.current.set(clave, s);
      s.promesa
        .then((adjunto) => cambiar(clave, { estado: 'listo', avance: 1, adjunto, error: null }))
        .catch((e: unknown) => {
          if ((e as { code?: string })?.code === 'CANCELADA') return;
          cambiar(clave, { estado: 'error', error: e instanceof Error ? e.message : `No se pudo subir «${archivo.name}».` });
        })
        .finally(() => subidas.current.delete(clave));
    },
    [subir, cambiar],
  );

  const agregar = useCallback(
    (nuevos: readonly File[]) => {
      const rechazos: string[] = [];
      const entran: AdjuntoEnElCompositor[] = [];
      const lugar = MAX_ADJUNTOS_POR_MENSAJE - vivos.current.length;
      nuevos.forEach((archivo, i) => {
        const porQue = porQueNoSeAdjunta(archivo);
        if (porQue) return void rechazos.push(porQue);
        if (i >= lugar) {
          rechazos.push(`Van hasta ${MAX_ADJUNTOS_POR_MENSAJE} archivos por mensaje: «${archivo.name}» quedó por fuera.`);
          return;
        }
        const clave = nuevaClave();
        const familia = familiaDe(archivo)!;
        archivos.current.set(clave, archivo);
        entran.push({
          clave,
          nombre: archivo.name,
          tamano: archivo.size,
          familia,
          estado: 'subiendo',
          avance: 0,
          miniatura: familia === 'imagen' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null,
          adjunto: null,
          error: null,
        });
      });
      if (entran.length) {
        setAdjuntos((prev) => [...prev, ...entran]);
        for (const a of entran) empezar(a.clave, archivos.current.get(a.clave)!);
      }
      setAviso(rechazos.length ? rechazos.join(' ') : null);
      return rechazos;
    },
    [empezar],
  );

  const soltar = (a: AdjuntoEnElCompositor) => {
    if (a.miniatura && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(a.miniatura);
    archivos.current.delete(a.clave);
  };

  const quitar = useCallback((clave: string) => {
    subidas.current.get(clave)?.cancelar();
    subidas.current.delete(clave);
    setAdjuntos((prev) => {
      const a = prev.find((x) => x.clave === clave);
      if (a) soltar(a);
      return prev.filter((x) => x.clave !== clave);
    });
  }, []);

  const reintentar = useCallback(
    (clave: string) => {
      const archivo = archivos.current.get(clave);
      if (!archivo) return;
      cambiar(clave, { estado: 'subiendo', avance: 0, error: null });
      empezar(clave, archivo);
    },
    [cambiar, empezar],
  );

  const tomarLosListos = useCallback(() => {
    const listos = vivos.current.filter((a) => a.estado === 'listo' && a.adjunto).map((a) => a.adjunto!);
    for (const a of vivos.current) soltar(a);
    setAdjuntos([]);
    setAviso(null);
    return listos;
  }, []);

  // Al desmontar: cancelar lo que sube y soltar las miniaturas.
  useEffect(
    () => () => {
      for (const s of subidas.current.values()) s.cancelar();
      for (const a of vivos.current) soltar(a);
    },
    [],
  );

  return {
    adjuntos,
    agregar,
    quitar,
    reintentar,
    tomarLosListos,
    subiendo: adjuntos.some((a) => a.estado === 'subiendo'),
    hayListos: adjuntos.some((a) => a.estado === 'listo'),
    aviso,
    limpiarAviso: () => setAviso(null),
  };
}
