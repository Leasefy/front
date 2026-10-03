/**
 * La palabra del estado de un contrato, la MISMA en la lista y en la ficha
 * (QA-CONT 03-10-2026). Encima de `etiquetaDeVigencia`:
 *
 *  · C-05 (Nico: «Empieza el 1 de nov»): un contrato que todavía no empieza no
 *    dice «Activo» ni suma en los activos: dice «Empieza el 1 de nov».
 *  · C-01 (Nico: «con fecha futura el contrato sigue activo hasta esa fecha»):
 *    con la terminación programada dice «Activo · Termina el 31 de oct».
 *
 * El resto, como siempre: «Vencido», «Terminado» o la etiqueta del estado.
 */
import type { Contract } from '@/lib/types/contract';
import { fechaDeVigencia } from './fecha-de-vigencia';
import { etiquetaDeVigencia, type Vigencia } from './vigencia';

export type ClaveDelEstado = 'POR_EMPEZAR' | 'TERMINA' | 'NORMAL';

export interface EstadoParaMostrar {
  clave: ClaveDelEstado;
  texto: string;
  /** Lo que va en el `title`/lector de pantalla cuando el texto es una fecha. */
  titulo?: string;
}

/** «1 de nov», con el año si no es el de `hoy` («1 de nov de 2027»). */
export function fechaCortaDelEstado(iso: string | null | undefined, locale: string, hoy: Date = new Date()): string {
  const d = fechaDeVigencia(iso);
  if (!d) return '';
  const otroAnio = d.getFullYear() !== hoy.getFullYear();
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'short',
    ...(otroAnio ? { year: 'numeric' } : {}),
  });
}

/** ¿Corre y todavía no empieza? Por día de calendario, en la hora de quien mira. */
export function noHaEmpezado(
  c: Pick<Contract, 'status' | 'startDate'>,
  hoy: Date = new Date(),
): boolean {
  if (c.status !== 'active' && c.status !== 'signed') return false;
  const inicio = fechaDeVigencia(c.startDate);
  if (!inicio) return false;
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return inicio.getTime() > h;
}

export function estadoParaMostrar(args: {
  contrato: Pick<Contract, 'status' | 'startDate'>;
  vigencia: Vigencia;
  /** La etiqueta del estado crudo (`CONTRACT_STATUS_LABELS`). */
  etiquetaDelEstado: string;
  locale: string;
  hoy?: Date;
}): EstadoParaMostrar {
  const { contrato, vigencia, etiquetaDelEstado, locale } = args;
  const hoy = args.hoy ?? new Date();
  const en = locale === 'en';
  if (noHaEmpezado(contrato, hoy)) {
    const fecha = fechaCortaDelEstado(contrato.startDate, locale, hoy);
    return {
      clave: 'POR_EMPEZAR',
      texto: en ? `Starts ${fecha}` : `Empieza el ${fecha}`,
      titulo: en ? 'Not started yet' : 'Por empezar',
    };
  }
  if (vigencia.terminaEl) {
    const fecha = fechaCortaDelEstado(vigencia.terminaEl, locale, hoy);
    return {
      clave: 'TERMINA',
      texto: en ? `Active · Ends ${fecha}` : `Activo · Termina el ${fecha}`,
      titulo: en ? 'Termination scheduled' : 'Terminación programada',
    };
  }
  return { clave: 'NORMAL', texto: etiquetaDeVigencia(vigencia, etiquetaDelEstado) };
}
