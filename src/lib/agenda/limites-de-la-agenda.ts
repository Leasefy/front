/**
 * Los topes de la agenda (tareas y citas), con las MISMAS frases que el back
 * (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/agenda/dto/limites-de-la-agenda.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 *
 * Lo que el back rechaza con un 400 en su campo se ataja ACÁ antes de enviar,
 * con la misma frase: la persona lee lo mismo venga de donde venga.
 */

export const FECHA_DE_LA_TAREA_DESDE = '2000-01-01'
export const FECHA_DE_LA_TAREA_HASTA = '2100-12-31'
export const MAX_LARGO_TITULO_DE_LA_TAREA = 200
export const MAX_LARGO_NOTA_DE_LA_TAREA = 1000

export const FECHA_DE_LA_CITA_DESDE = '2000-01-01'
export const FECHA_DE_LA_CITA_HASTA = '2100-12-31'
export const MAX_LARGO_CONTACTO_DE_LA_CITA = 200
export const MAX_LARGO_CORREO_DE_LA_CITA = 255
export const MAX_LARGO_TELEFONO_DE_LA_CITA = 20
export const MAX_LARGO_NOTAS_DE_LA_CITA = 500

export const MENSAJES_DE_LA_AGENDA = {
  fechaNoEsUnDia: 'Elige un día válido para la tarea (AAAA-MM-DD).',
  fechaFueraDeRango: 'La fecha de la tarea debe estar entre el año 2000 y el 2100.',
  horaMalFormada: 'La hora debe ir en formato de 24 horas, como 09:30.',
  tituloCorto: 'Escribe un título de al menos 2 caracteres.',
  tituloLargo: 'El título puede tener hasta 200 caracteres.',
  notaLarga: 'La nota puede tener hasta 1000 caracteres.',
  fechaDeLaCitaNoEsUnDia: 'Elige un día válido para la visita (AAAA-MM-DD).',
  fechaDeLaCitaFueraDeRango: 'La fecha de la visita debe estar entre el año 2000 y el 2100.',
  horaDeInicioMalFormada: 'La hora de inicio debe ir en formato de 24 horas, como 09:30.',
  horaDeFinMalFormada: 'La hora de fin debe ir en formato de 24 horas, como 10:00.',
  contactoLargo: 'El nombre del contacto puede tener hasta 200 caracteres.',
  correoInvalido: 'Revisa el correo del contacto: debe tener la forma nombre@dominio.com.',
  correoLargo: 'El correo del contacto puede tener hasta 255 caracteres.',
  telefonoLargo: 'El teléfono del contacto puede tener hasta 20 caracteres.',
  notasLargas: 'Las notas pueden tener hasta 500 caracteres.',
} as const

/** Un día real del calendario en AAAA-MM-DD (lo mismo que `EsDiaDelCalendario` del back). */
export function esDiaDelCalendario(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(valor.trim())
  if (!m) return false
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === `${m[1]}-${m[2]}-${m[3]}`
}

/** `null` si la fecha sirve; si no, la frase del back. */
export function errorDeLaFecha(
  valor: string,
  { desde, hasta, noEsUnDia, fueraDeRango }: { desde: string; hasta: string; noEsUnDia: string; fueraDeRango: string },
): string | null {
  if (!esDiaDelCalendario(valor)) return noEsUnDia
  const dia = valor.slice(0, 10)
  return dia < desde || dia > hasta ? fueraDeRango : null
}

/** El correo con la forma que acepta el back (`@IsEmail`), sin pretender ser RFC. */
export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
