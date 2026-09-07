/**
 * De un pendiente a un mensaje escrito.
 *
 * Elegir «el cobro de septiembre» tiene que dejar en el campo una frase que un
 * humano pueda mandar tal cual —o editar—, no un volcado de campos. Todo lo de
 * acá es puro y sin React a propósito: son las reglas de formato que se pueden
 * probar sin montar nada.
 *
 * ── Dos trampas que este archivo evita ─────────────────────────────────────
 *
 * 1. 🔴 **La fecha NO pasa por `new Date`.** `vencimiento` es una fecha de
 *    calendario ('YYYY-MM-DD'); `new Date('2026-09-05')` la lee como medianoche
 *    UTC y en Colombia (UTC-5) se muestra el 4. Un vencimiento corrido un día
 *    en un mensaje de cobro no es un detalle cosmético. Se parte la cadena y
 *    listo.
 * 2. **La plata se agrupa a mano.** `toLocaleString` depende del ICU que traiga
 *    el runtime y puede devolver espacios finos o comas según dónde corra. Acá
 *    el separador de miles es el punto siempre, que es como se escribe en
 *    Colombia.
 */

import type {
  CobroPendienteDelHilo,
  DispersionPendienteDelHilo,
  DocumentoDelHilo,
} from '@/lib/api/messages.types';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `1234567` → `$1.234.567`. Enteros en pesos: el back no manda decimales. */
export function formatearPesos(monto: number): string {
  const negativo = monto < 0;
  const entero = Math.abs(Math.round(monto)).toString();
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}$${conPuntos}`;
}

/** `'2026-09-05'` → `'05/09/2026'`. Nunca pasa por `Date` (ver el encabezado). */
export function formatearFecha(fecha: string): string {
  const partes = fecha.slice(0, 10).split('-');
  if (partes.length !== 3) return fecha;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

/** `'2026-09'` → `'septiembre de 2026'`. Lo desconocido se devuelve tal cual. */
export function mesEnPalabras(mes: string): string {
  const partes = mes.split('-');
  if (partes.length < 2) return mes;
  const indice = Number(partes[1]) - 1;
  const nombre = MESES[indice];
  if (!nombre) return mes;
  return `${nombre} de ${partes[0]}`;
}

/** El mes en curso, en palabras y sin año — para la variable `{{mes}}`. */
export function mesEnCurso(hoy: Date = new Date()): string {
  return MESES[hoy.getMonth()] ?? '';
}

/**
 * El cobro.
 *
 * Se dice el saldo PENDIENTE, no el total: si ya abonó, recordarle el total es
 * pedirle plata que no debe. La mora se menciona sólo cuando existe, y se
 * cuenta como un dato («lleva N días de mora»), sin adjetivos ni presión —
 * Ley 2300 art. 7: no se le exige explicación por un atraso.
 */
export function mensajeDeCobro(cobro: CobroPendienteDelHilo, nombre: string): string {
  const partes: string[] = [];
  partes.push(
    `Hola ${nombre}, te escribo por el cobro de ${mesEnPalabras(cobro.mes)}` +
      (cobro.inmueble ? ` de ${cobro.inmueble}` : '') +
      `: quedan ${formatearPesos(cobro.pendienteCop)} por pagar` +
      (cobro.pendienteCop !== cobro.totalCop
        ? ` de ${formatearPesos(cobro.totalCop)}`
        : '') +
      '.',
  );
  partes.push(`Venció el ${formatearFecha(cobro.vencimiento)}.`);
  if (cobro.diasDeMora > 0) {
    partes.push(
      cobro.diasDeMora === 1
        ? 'Lleva 1 día de mora.'
        : `Lleva ${cobro.diasDeMora} días de mora.`,
    );
  }
  partes.push('Cualquier cosa me contás.');
  return partes.join(' ');
}

/**
 * La dispersión: plata que la inmobiliaria le DEBE al propietario. El tono se
 * invierte —acá el que debe somos nosotros— y por eso no se habla de mora ni
 * de vencimiento, que en esta dirección no existen en el dato.
 */
export function mensajeDeDispersion(
  dispersion: DispersionPendienteDelHilo,
  nombre: string,
): string {
  return (
    `Hola ${nombre}, te confirmo el giro de ${mesEnPalabras(dispersion.mes)}` +
    (dispersion.inmueble ? ` por ${dispersion.inmueble}` : '') +
    `: ${formatearPesos(dispersion.netoCop)} netos. ` +
    'Te aviso apenas salga.'
  );
}

/**
 * El documento. El enlace va TAL CUAL viene del back: acá no se arma ninguna
 * URL a mano, porque el acceso al archivo lo decide el servidor.
 */
export function mensajeDeDocumento(documento: DocumentoDelHilo, nombre: string): string {
  const comoSeLlama =
    documento.tipo === 'CONTRATO'
      ? 'el contrato'
      : documento.tipo === 'ACTA'
        ? 'el acta'
        : 'el documento';
  return (
    `Hola ${nombre}, te comparto ${comoSeLlama} «${documento.nombre}»` +
    (documento.url ? `: ${documento.url}` : '') +
    '.'
  );
}
