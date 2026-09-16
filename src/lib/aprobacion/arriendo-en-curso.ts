/**
 * El inmueble que la persona está intentando arrendar, entre los tres pasos.
 *
 * Paso 1 (la ficha dice «te alcanza») → paso 2 (el estudio, con login y pago en
 * otra pestaña) → paso 3 (la respuesta en `/inquilino/aprobacion`). Entre uno y
 * otro hay navegaciones, un login y un pago: sin guardarlo, el paso 3 ya no
 * sabría de qué inmueble hablar. Vive en `sessionStorage` (sólo esta pestaña y
 * esta sesión del navegador) y vence a las 24 h. No guarda datos personales:
 * sólo el inmueble y el estimado del ingreso.
 */

import type { TipoDelEstudio } from './estimado-de-arriendo';

export interface ArriendoEnCurso {
  propertyId: string;
  titulo: string;
  ciudad: string | null;
  tipo: TipoDelEstudio | null;
  foto: string | null;
  canon: number;
  ingresoTotal: number;
  canonMaximo: number;
  guardadoEn: number;
}

const CLAVE = 'leasefy:arriendo-en-curso';
const VIGENCIA_MS = 24 * 60 * 60 * 1000;

export function guardarArriendoEnCurso(datos: Omit<ArriendoEnCurso, 'guardadoEn'>): void {
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify({ ...datos, guardadoEn: Date.now() }));
  } catch {
    // Sin almacenamiento (modo privado): el recorrido sigue, sin el contexto.
  }
}

export function leerArriendoEnCurso(propertyId?: string): ArriendoEnCurso | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as ArriendoEnCurso;
    if (!datos?.propertyId || Date.now() - datos.guardadoEn > VIGENCIA_MS) return null;
    if (propertyId && datos.propertyId !== propertyId) return null;
    return datos;
  } catch {
    return null;
  }
}

export function olvidarArriendoEnCurso(): void {
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    /* nada que olvidar */
  }
}

/** «apartamento», «casa», «local» o «inmueble» para la frase de felicitación. */
export function nombreDelTipo(tipo: TipoDelEstudio | null): string {
  return tipo ?? 'inmueble';
}
