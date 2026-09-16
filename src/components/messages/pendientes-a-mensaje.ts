/**
 * De un pendiente a un mensaje escrito.
 *
 * Elegir «la cuota de septiembre» tiene que dejar en el campo una frase que un
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
  CuotaPendienteDelHilo,
  DocumentoDelHilo,
  GiroPendienteDelHilo,
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
 * La cuota del contrato.
 *
 * 🔴 Es la CUOTA, no el cobro: la deuda nace con el contrato y el cobro es sólo
 * el documento con que se reclama (puede no existir). Hasta el 2026-09-16 esto
 * era `mensajeDeCobro`.
 *
 * Se dice el saldo PENDIENTE, no el total: si ya abonó, recordarle el total es
 * pedirle plata que no debe. El verbo sigue al cajón —«vence» si todavía no
 * venció, «venció» si ya—, y la mora se menciona SÓLO en cartera, contada desde
 * que se acabó el plazo del contrato: decirle «lleva 3 días de mora» a quien
 * está dentro del plazo que le dio la inmobiliaria es falso. Como un dato, sin
 * adjetivos ni presión — Ley 2300 art. 7: no se le exige explicación por un
 * atraso.
 */
export function mensajeDeCuota(cuota: CuotaPendienteDelHilo, nombre: string): string {
  const partes: string[] = [];
  partes.push(
    `Hola ${nombre}, te escribo por la cuota de ${mesEnPalabras(cuota.mes)}` +
      (cuota.inmueble ? ` de ${cuota.inmueble}` : '') +
      `: quedan ${formatearPesos(cuota.pendienteCop)} por pagar` +
      (cuota.pendienteCop !== cuota.totalCop
        ? ` de ${formatearPesos(cuota.totalCop)}`
        : '') +
      '.',
  );
  partes.push(
    cuota.cajon === 'POR_VENCER'
      ? `Vence el ${formatearFecha(cuota.vencimiento)}.`
      : `Venció el ${formatearFecha(cuota.vencimiento)}.`,
  );
  if (cuota.cajon === 'CARTERA' && cuota.diasDeMora > 0) {
    partes.push(
      cuota.diasDeMora === 1
        ? 'Lleva 1 día de mora.'
        : `Lleva ${cuota.diasDeMora} días de mora.`,
    );
  }
  partes.push('Cualquier cosa me cuentas.');
  return partes.join(' ');
}

/**
 * El giro: plata que la inmobiliaria le DEBE al propietario, de la cuota del
 * propietario de su contrato (su parte, si hay varios dueños). El tono se
 * invierte —acá el que debe somos nosotros— y por eso no se habla de mora.
 * Hasta el 2026-09-16 esto era `mensajeDeDispersion` y salía de la dispersión
 * generada, que puede no existir todavía.
 */
export function mensajeDeGiro(giro: GiroPendienteDelHilo, nombre: string): string {
  return (
    `Hola ${nombre}, te confirmo el giro de ${mesEnPalabras(giro.mes)}` +
    (giro.inmueble ? ` por ${giro.inmueble}` : '') +
    `: ${formatearPesos(giro.pendienteCop)} netos. ` +
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
