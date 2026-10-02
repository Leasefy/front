/**
 * Los topes de la tesorería, donde una persona escribe el valor (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/tesoreria/dto/limites-de-tesoreria.ts`:
 * mismos números, mismas frases. Lo que el back rechaza se ataja acá, antes
 * de mandar:
 *
 *   · el valor a devolver de un pendiente (`PendientesDeAplicar`);
 *   · la fecha y el nombre de un festivo (`CalendarioDeFestivos`);
 *   · los textos del convenio de recaudo (`ConvenioDeRecaudoCajon`).
 *
 * Las frases que dicen «escribe…» o «no más de lo que queda» son SÓLO del
 * front: el back no las necesita (sin valor devuelve el saldo entero y lo que
 * pase del saldo lo recorta), pero acá un campo vacío no puede significar
 * «devolver todo» sin que nadie lo diga.
 */

import { formatCurrency } from '@/lib/format';

export const VALOR_MAXIMO_DE_TESORERIA_COP = 2_000_000_000;
export const FECHA_DE_TESORERIA_DESDE = '2000-01-01';
export const FECHA_DE_TESORERIA_HASTA = '2100-12-31';
export const MAX_LARGO_DEL_MOTIVO = 300;
export const MAX_LARGO_DEL_NOMBRE_DEL_FESTIVO = 120;

/** Los textos del convenio de recaudo, contra sus columnas. */
export const LARGOS_DEL_CONVENIO = {
  banco: 80,
  codigo: 40,
  nombre: 120,
  separador: 4,
  marcaDeDetalle: 8,
  referenciaPrefijo: 20,
  cuentaBancaria: 60,
} as const;

export type TextoDelConvenio = keyof typeof LARGOS_DEL_CONVENIO;

export const MENSAJES_DE_TESORERIA = {
  valorEntero: 'El valor debe ser un número entero de pesos, sin decimales.',
  valorPositivo: 'El valor debe ser mayor que cero.',
  valorMaximo: 'El valor no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  fecha: 'Elige una fecha válida (un día real del calendario).',
  fechaFueraDeRango: 'La fecha debe estar entre el año 2000 y el 2100.',
  fechaDelFestivo: 'Elige una fecha válida para el festivo.',
  fechaDelFestivoFueraDeRango: 'La fecha del festivo debe estar entre el año 2000 y el 2100.',
  nombreDelFestivoLargo: 'El nombre del festivo puede tener hasta 120 caracteres.',
  motivoLargo: 'El motivo puede tener hasta 300 caracteres.',
  bancoLargo: 'El banco puede tener hasta 80 caracteres.',
  codigoLargo: 'El código del convenio puede tener hasta 40 caracteres.',
  nombreDelConvenioLargo: 'El nombre del convenio puede tener hasta 120 caracteres.',
  separadorLargo: 'El separador puede tener hasta 4 caracteres.',
  marcaDeDetalleLarga: 'La marca de los registros de detalle puede tener hasta 8 caracteres.',
  prefijoLargo: 'El prefijo de la referencia puede tener hasta 20 caracteres.',
  cuentaBancariaLarga: 'El número de cuenta puede tener hasta 60 caracteres.',
} as const;

/** Sólo del front (ver arriba). */
export const MENSAJES_DE_LA_DEVOLUCION = {
  valorFalta: 'Escribe cuánto devolver.',
  motivoFalta: 'Escribe por qué se devuelve.',
  masQueElSaldo: (saldoCop: number) =>
    `No puedes devolver más de lo que queda pendiente (${formatCurrency(saldoCop)}).`,
} as const;

const FRASE_DEL_TEXTO: Record<TextoDelConvenio, string> = {
  banco: MENSAJES_DE_TESORERIA.bancoLargo,
  codigo: MENSAJES_DE_TESORERIA.codigoLargo,
  nombre: MENSAJES_DE_TESORERIA.nombreDelConvenioLargo,
  separador: MENSAJES_DE_TESORERIA.separadorLargo,
  marcaDeDetalle: MENSAJES_DE_TESORERIA.marcaDeDetalleLarga,
  referenciaPrefijo: MENSAJES_DE_TESORERIA.prefijoLargo,
  cuentaBancaria: MENSAJES_DE_TESORERIA.cuentaBancariaLarga,
};

/** `AAAA-MM-DD` y un día que existe (el mismo criterio que `@EsDiaDelCalendario`). */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!m) return false;
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`;
}

/** El error de la fecha de un festivo, o `null`. Vacía no opina: el botón no se aprieta. */
export function errorDeLaFechaDelFestivo(fecha: string): string | null {
  const dia = fecha.trim();
  if (!dia) return null;
  if (!esDiaDelCalendario(dia)) return MENSAJES_DE_TESORERIA.fechaDelFestivo;
  if (dia < FECHA_DE_TESORERIA_DESDE || dia > FECHA_DE_TESORERIA_HASTA) {
    return MENSAJES_DE_TESORERIA.fechaDelFestivoFueraDeRango;
  }
  return null;
}

/** El error del nombre de un festivo, o `null`. */
export function errorDelNombreDelFestivo(nombre: string): string | null {
  return nombre.trim().length > MAX_LARGO_DEL_NOMBRE_DEL_FESTIVO
    ? MENSAJES_DE_TESORERIA.nombreDelFestivoLargo
    : null;
}

/**
 * El error del valor a devolver, o `null`. El campo es texto (un input
 * vacío no es 0): vacío, decimal, cero, más del tope o más del saldo.
 */
export function errorDelValorADevolver(texto: string, saldoCop: number): string | null {
  const limpio = texto.trim();
  if (!limpio) return MENSAJES_DE_LA_DEVOLUCION.valorFalta;
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || !Number.isInteger(valor)) return MENSAJES_DE_TESORERIA.valorEntero;
  if (valor < 1) return MENSAJES_DE_TESORERIA.valorPositivo;
  if (valor > VALOR_MAXIMO_DE_TESORERIA_COP) return MENSAJES_DE_TESORERIA.valorMaximo;
  if (valor > saldoCop) return MENSAJES_DE_LA_DEVOLUCION.masQueElSaldo(saldoCop);
  return null;
}

/** El error del motivo de una devolución o un rechazo, o `null`. */
export function errorDelMotivo(motivo: string): string | null {
  const limpio = motivo.trim();
  if (!limpio) return MENSAJES_DE_LA_DEVOLUCION.motivoFalta;
  if (limpio.length > MAX_LARGO_DEL_MOTIVO) return MENSAJES_DE_TESORERIA.motivoLargo;
  return null;
}

/**
 * Los textos del convenio que pasan de su columna, con su frase. Se le pasa
 * lo que VA a viajar (ya recortado donde se recorta).
 */
export function erroresDeLosTextosDelConvenio(
  textos: Partial<Record<TextoDelConvenio, string | undefined>>,
): Partial<Record<TextoDelConvenio, string>> {
  const errores: Partial<Record<TextoDelConvenio, string>> = {};
  for (const campo of Object.keys(LARGOS_DEL_CONVENIO) as TextoDelConvenio[]) {
    const valor = textos[campo];
    if (valor !== undefined && valor.length > LARGOS_DEL_CONVENIO[campo]) {
      errores[campo] = FRASE_DEL_TEXTO[campo];
    }
  }
  return errores;
}
