/**
 * Los pasos de «Completar perfil» del propietario: UNA sola fuente para la
 * tarjeta del perfil (`/panel/perfil`) y el «Completa tu perfil» de la barra
 * lateral (ARREGLOS-4, 03-10-2026).
 *
 * PRUEBAS-RESTO vio, en la misma sesión de la propietaria, «Completa tu cuenta
 * 0/4» en la barra y «3 de 5» en el perfil. La barra contaba los cuatro pasos
 * del asistente de bienvenida, guardados en el `localStorage` de ESE
 * navegador (en otro navegador, o si la cuenta nació por la migración, se
 * quedaba en 0/4 para siempre); el perfil, lo que la persona YA guardó (Nico,
 * 02-10-2026: «que sólo quede lo que es verdad»). Ahora las dos leen esto.
 *
 * No hay verificación de teléfono ni de identidad en el back: ningún paso es un
 * «verificar».
 */

export type IdDelPasoDelPerfil = 'basic-info' | 'phone' | 'id-number' | 'address' | 'emergency-contact'

/** Lo que mira cada paso, del usuario de la sesión. */
export interface DatosDelPerfilDelPropietario {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  rut?: string | null
  address?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export interface PasoDelPerfilDelPropietario {
  id: IdDelPasoDelPerfil
  etiquetaEs: string
  etiquetaEn: string
  completo: boolean
}

export function pasosDelPerfilDelPropietario(
  u: DatosDelPerfilDelPropietario | null | undefined,
): PasoDelPerfilDelPropietario[] {
  return [
    {
      id: 'basic-info',
      etiquetaEs: 'Información básica',
      etiquetaEn: 'Basic information',
      completo: Boolean(u?.firstName && u?.lastName),
    },
    { id: 'phone', etiquetaEs: 'Teléfono', etiquetaEn: 'Phone', completo: Boolean(u?.phone) },
    { id: 'id-number', etiquetaEs: 'Cédula', etiquetaEn: 'ID number', completo: Boolean(u?.rut) },
    { id: 'address', etiquetaEs: 'Dirección', etiquetaEn: 'Address', completo: Boolean(u?.address) },
    {
      id: 'emergency-contact',
      etiquetaEs: 'Contacto de emergencia',
      etiquetaEn: 'Emergency contact',
      completo: Boolean(u?.emergencyContactName && u?.emergencyContactPhone),
    },
  ]
}
