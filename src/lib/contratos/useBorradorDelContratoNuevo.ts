'use client';

/**
 * Nico, 29-10-2026: «si la persona empieza a crear el contrato y se va (cierra,
 * navega, se cae), lo que ya llenó no se pierde». El back no acepta un
 * contrato a medio llenar (sin inmueble ni inquilino no nace), así que se
 * guarda el FORMULARIO: en el navegador al instante y en el back
 * (`/inmobiliaria/contratos/borrador`, uno por persona e inmobiliaria) para
 * retomarlo desde otro equipo. Gana el más reciente. Los archivos (el PDF,
 * los documentos) no se guardan: se vuelven a subir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { contratoAlCrearApi } from '@/lib/api/contrato-al-crear.service';

export const CLAVE_DEL_BORRADOR = 'leasefy:borrador-del-contrato-nuevo';
const ESPERA_AL_ESCRIBIR_MS = 1200;

interface Guardado {
  datos: Record<string, unknown>;
  actualizadoEn: string;
}

function leerDelNavegador(): Guardado | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_DEL_BORRADOR);
    const g = crudo ? (JSON.parse(crudo) as Guardado) : null;
    return g && typeof g.datos === 'object' && typeof g.actualizadoEn === 'string' ? g : null;
  } catch {
    return null;
  }
}

function escribirEnElNavegador(g: Guardado | null) {
  try {
    if (g) window.localStorage.setItem(CLAVE_DEL_BORRADOR, JSON.stringify(g));
    else window.localStorage.removeItem(CLAVE_DEL_BORRADOR);
  } catch {
    /* modo privado o almacenamiento lleno: el back igual lo guarda */
  }
}

/** El más reciente de los dos (el del navegador, si empatan). */
export function elMasReciente(a: Guardado | null, b: Guardado | null): Guardado | null {
  if (!a) return b;
  if (!b) return a;
  return b.actualizadoEn > a.actualizadoEn ? b : a;
}

export function useBorradorDelContratoNuevo({
  habilitado,
  datos,
  tieneAlgo,
  alRetomar,
}: {
  habilitado: boolean;
  /** Lo que se guarda (sin archivos). */
  datos: Record<string, unknown>;
  /** Si no hay nada escrito, no se guarda (ni se pisa un borrador anterior). */
  tieneAlgo: boolean;
  alRetomar: (datos: Record<string, unknown>) => void;
}) {
  const [listo, setListo] = useState(!habilitado);
  const [retomadoDe, setRetomadoDe] = useState<string | null>(null);
  const alRetomarRef = useRef(alRetomar);
  alRetomarRef.current = alRetomar;
  const ultimo = useRef<string>('');

  useEffect(() => {
    if (!habilitado) return;
    let vivo = true;
    const local = leerDelNavegador();
    // `Promise.resolve().then`: un cliente que no responde (o que falta) nunca rompe la pantalla.
    Promise.resolve()
      .then(() => contratoAlCrearApi.leerBorrador())
      .then((r) => (r.borrador && typeof r.borrador.datos === 'object' ? (r.borrador as Guardado) : null))
      .catch(() => null)
      .then((delBack) => {
        if (!vivo) return;
        const g = elMasReciente(local, delBack);
        if (g) {
          ultimo.current = JSON.stringify(g.datos);
          alRetomarRef.current(g.datos);
          setRetomadoDe(g.actualizadoEn);
        }
        setListo(true);
      });
    return () => {
      vivo = false;
    };
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado || !listo || !tieneAlgo) return;
    const texto = JSON.stringify(datos);
    if (texto === ultimo.current) return;
    const g: Guardado = { datos, actualizadoEn: new Date().toISOString() };
    escribirEnElNavegador(g);
    const t = window.setTimeout(() => {
      ultimo.current = texto;
      Promise.resolve()
        .then(() => contratoAlCrearApi.guardarBorrador(datos))
        .catch(() => undefined);
    }, ESPERA_AL_ESCRIBIR_MS);
    return () => window.clearTimeout(t);
  }, [habilitado, listo, tieneAlgo, datos]);

  /** Al crear el contrato o al «Empezar de cero». */
  const descartar = useCallback(() => {
    escribirEnElNavegador(null);
    ultimo.current = '';
    setRetomadoDe(null);
    Promise.resolve()
      .then(() => contratoAlCrearApi.borrarBorrador())
      .catch(() => undefined);
  }, []);

  return { listo, retomadoDe, descartar };
}
