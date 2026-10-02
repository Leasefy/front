/**
 * Los datos personales del perfil (inquilino, propietario e inmobiliaria),
 * validados con las MISMAS reglas y frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/users/dto/update-profile.dto.ts` (PATCH /users/me) y
 * de `back/src/users/dto/limites-del-perfil.ts`. Los largos son los
 * `@MaxLength` del DTO; la frase de un largo es la que arma el sobre de error
 * del back (`mensajeDeLaRegla('longitud_maxima', …)`), así el cliente y el
 * servidor dicen lo mismo. Si cambia uno, cambia el otro.
 *
 * 🔴 La fecha de nacimiento: `users.birth_date` es `@db.Date` y el service
 * hacía `new Date(dto.birthDate)`; un año 99999 pasaba `@IsDateString` y daba
 * 500 en Prisma. El back ahora la frena (día real, entre 1900 y hoy en
 * Colombia) y el cliente la ataja ANTES de mandar nada.
 */

import { esDiaDelCalendario } from '@/lib/onboarding/preferencias-del-inquilino'

export const FECHA_DE_NACIMIENTO_DESDE = '1900-01-01'

/** Los `@MaxLength` de `UpdateProfileDto`. */
export const LARGOS_DEL_PERFIL = {
  firstName: 50,
  lastName: 50,
  rut: 20,
  address: 255,
  emergencyContactName: 100,
  emergencyContactPhone: 30,
} as const

export const MENSAJES_DE_DATOS_PERSONALES = {
  fechaDeNacimiento: 'Elige una fecha de nacimiento válida.',
  fechaDeNacimientoFueraDeRango: 'La fecha de nacimiento debe estar entre 1900 y hoy.',
  firstName: 'El nombre no puede tener más de 50 caracteres.',
  lastName: 'El apellido no puede tener más de 50 caracteres.',
  rut: 'El número de documento no puede tener más de 20 caracteres.',
  address: 'La dirección no puede tener más de 255 caracteres.',
  emergencyContactName: 'El nombre del contacto de emergencia no puede tener más de 100 caracteres.',
  emergencyContactPhone: 'El teléfono del contacto de emergencia no puede tener más de 30 caracteres.',
} as const

/** Los campos de `PATCH /users/me` que las pantallas de perfil editan. */
export const CAMPOS_PERSONALES = [
  'firstName',
  'lastName',
  'phone',
  'rut',
  'address',
  'birthDate',
  'emergencyContactName',
  'emergencyContactPhone',
] as const

export type CampoPersonal = (typeof CAMPOS_PERSONALES)[number]

export type ErroresPersonales = Partial<Record<CampoPersonal, string>>

/** Hoy en Colombia, `AAAA-MM-DD` (el mismo día que usa el back). */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/**
 * Qué está mal en lo que se va a mandar. Sólo mira los campos presentes (un
 * `null` es «borrar el dato», siempre válido). Vacío = se puede enviar.
 */
export function revisarDatosPersonales(
  datos: Partial<Record<CampoPersonal, string | null | undefined>>,
  ahora: Date = new Date(),
): ErroresPersonales {
  const errores: ErroresPersonales = {}

  for (const [campo, largo] of Object.entries(LARGOS_DEL_PERFIL) as [keyof typeof LARGOS_DEL_PERFIL, number][]) {
    const valor = datos[campo]
    if (typeof valor === 'string' && valor.length > largo) {
      errores[campo] = MENSAJES_DE_DATOS_PERSONALES[campo]
    }
  }

  const nacimiento = datos.birthDate
  if (typeof nacimiento === 'string' && nacimiento.trim() !== '') {
    if (!esDiaDelCalendario(nacimiento)) {
      errores.birthDate = MENSAJES_DE_DATOS_PERSONALES.fechaDeNacimiento
    } else {
      const dia = nacimiento.trim().slice(0, 10)
      if (dia < FECHA_DE_NACIMIENTO_DESDE || dia > hoyEnColombia(ahora)) {
        errores.birthDate = MENSAJES_DE_DATOS_PERSONALES.fechaDeNacimientoFueraDeRango
      }
    }
  }

  return errores
}

/** El `id` del campo en la pantalla (el del `<input>` y su `aria-describedby`). */
export function idDelCampoPersonal(prefijo: string, campo: CampoPersonal): string {
  return `${prefijo}-${campo}`
}

/** Le da el foco al primer campo con error (el reparto no lo hace sin RHF). */
export function enfocarCampoPersonal(prefijo: string, campo: CampoPersonal | undefined): void {
  if (!campo || typeof document === 'undefined') return
  document.getElementById(idDelCampoPersonal(prefijo, campo))?.focus()
}
