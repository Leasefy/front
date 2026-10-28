/**
 * Lo que el panel revisa antes de mandar (espejo de `back/src/firmas/reglas-de-firmas.ts`; el back vuelve a revisar
 * todo). Puras, para probarlas.
 */
import { celularEnE164 } from '@/lib/phone/paises-del-mundo';
import type { Posicion } from '@/lib/api/firmas.service';

export const MAX_FIRMANTES = 5;
export const MAX_MB_DEL_PDF = 15;

export interface FirmanteEnElFormulario {
  clave: string;
  nombre: string;
  email: string;
  celular: string;
  pais: string;
  numeroDocumento: string;
  posicion: Posicion | null;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** La caja por defecto de una firma: 30 % del ancho, 7 % del alto, centrada donde se tocó (sin salirse). */
export function cajaEn(pagina: number, cx: number, cy: number): Posicion {
  const ancho = 0.3;
  const alto = 0.07;
  const x = Math.min(Math.max(cx - ancho / 2, 0), 1 - ancho);
  const y = Math.min(Math.max(cy - alto / 2, 0), 1 - alto);
  return { pagina, x: redondear(x), y: redondear(y), ancho, alto };
}

/** Mover una caja sin que se salga de la página. */
export function moverCaja(p: Posicion, dx: number, dy: number): Posicion {
  return {
    ...p,
    x: redondear(Math.min(Math.max(p.x + dx, 0), 1 - p.ancho)),
    y: redondear(Math.min(Math.max(p.y + dy, 0), 1 - p.alto)),
  };
}

function redondear(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}

/** Lo que le falta a cada persona (o `null` si está lista). */
export function loQueLeFalta(f: FirmanteEnElFormulario, opciones: { codigoPorWhatsapp: boolean; enElDocumento: boolean }): string | null {
  if (f.nombre.trim().length < 2) return 'Escribe su nombre.';
  const email = f.email.trim();
  if (email && !CORREO.test(email)) return 'Revisa el correo.';
  const tel = f.celular.trim() ? celularEnE164(f.celular, f.pais) : null;
  if (f.celular.trim() && !tel) return 'Revisa el celular.';
  if (!email && !tel) return 'Necesita un correo o un celular: por ahí le llega el código.';
  if (!email && !(opciones.codigoPorWhatsapp && tel?.startsWith('+573'))) {
    return opciones.codigoPorWhatsapp
      ? 'Necesita un correo: por WhatsApp el código sólo llega a celulares de Colombia.'
      : 'Necesita un correo: por ahí le llega el código.';
  }
  if (opciones.enElDocumento && !f.posicion) return 'Ubica su firma en el documento.';
  return null;
}

/** Personas repetidas (mismo correo o mismo celular). */
export function repetidos(lista: FirmanteEnElFormulario[]): string[] {
  const vistos = new Map<string, string>();
  const rep: string[] = [];
  for (const f of lista) {
    const llaves = [f.email.trim().toLowerCase(), f.celular.trim() ? (celularEnE164(f.celular, f.pais) ?? '') : ''].filter(Boolean);
    for (const l of llaves) {
      if (vistos.has(l)) rep.push(f.clave);
      else vistos.set(l, f.clave);
    }
  }
  return rep;
}

/** «Promesa de compraventa» a partir de «promesa_de_compraventa-v2.pdf». */
export function tituloDelArchivo(nombre: string): string {
  const base = nombre.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : '';
}

export const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

/** Los colores de cada persona al ubicar las firmas (y en el resumen). */
export const COLORES_DE_FIRMANTE = ['#1A40FF', '#2B7549', '#B8372A', '#8C600E', '#6B3FA0'];
