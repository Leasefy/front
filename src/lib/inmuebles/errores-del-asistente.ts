/**
 * Los errores del asistente de consignación (`ConsignacionWizard`), 02-10-2026.
 *
 * Sistema de errores, tanda 2: el back responde `campos[]` con el nombre de su
 * DTO; acá se traducen al campo del asistente y al paso donde vive, para llevar
 * a la persona ahí con el error debajo del campo y el foco puesto. Lo que no
 * tiene campo en pantalla (`null`) va al toast.
 *
 * Los topes del cliente son los de `limites-del-inmueble.ts` (espejo del DTO).
 */

import type { WizardFormData } from '@/components/inmobiliaria/ConsignacionWizardSteps'
import { erroresDelInmueble, type CampoDelInmueble } from './limites-del-inmueble'

export type CampoDelAsistente = keyof WizardFormData

/** El id del control de un campo del asistente (y `${id}-error` el de su error). */
export function idDelCampoDelAsistente(campo: string): string {
  return `asistente-${campo}`
}

/** `POST /properties` (`CreatePropertyDto`) → el asistente. */
export const MAPA_DEL_INMUEBLE: Record<string, CampoDelAsistente | null> = {
  title: 'propertyTitle',
  description: 'propertyDescription',
  type: 'propertyType',
  city: 'propertyCity',
  neighborhood: 'propertyZone',
  address: 'propertyAddress',
  department: 'department',
  listingType: 'listingType',
  monthlyRent: 'monthlyRent',
  salePrice: 'salePrice',
  consignedAt: 'consignedAt',
  adminFee: 'adminFee',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  area: 'area',
}

/** `POST /inmobiliaria/consignaciones` (`CreateConsignacionDto`) → el asistente. */
export const MAPA_DEL_MANDATO: Record<string, CampoDelAsistente | null> = {
  propertyTitle: 'propertyTitle',
  propertyAddress: 'propertyAddress',
  propertyCity: 'propertyCity',
  propertyZone: 'propertyZone',
  propertyType: 'propertyType',
  monthlyRent: 'monthlyRent',
  adminFee: 'adminFee',
  commissionPercent: 'commissionPercent',
  saleCommissionPercent: 'saleCommissionPercent',
  minimumTerm: 'minimumTerm',
}

/** El paso donde se corrige cada campo. */
export const PASO_DEL_CAMPO: Partial<Record<CampoDelAsistente, number>> = {
  propertyTitle: 2,
  propertyDescription: 2,
  propertyType: 2,
  propertyCity: 2,
  propertyZone: 2,
  propertyAddress: 2,
  department: 2,
  listingType: 2,
  monthlyRent: 2,
  salePrice: 2,
  consignedAt: 2,
  adminFee: 2,
  bedrooms: 2,
  bathrooms: 2,
  area: 2,
  commissionPercent: 3,
  saleCommissionPercent: 3,
  minimumTerm: 3,
}

export const CAMPOS_CON_LUGAR = Object.keys(PASO_DEL_CAMPO) as CampoDelAsistente[]

/** Campo del DTO del inmueble → campo del asistente (para los topes). */
const CAMPO_DEL_ASISTENTE: Partial<Record<CampoDelInmueble, CampoDelAsistente>> = {
  title: 'propertyTitle',
  address: 'propertyAddress',
  city: 'propertyCity',
  neighborhood: 'propertyZone',
  monthlyRent: 'monthlyRent',
  adminFee: 'adminFee',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  area: 'area',
  consignedAt: 'consignedAt',
}

/**
 * Los topes del back sobre lo que el paso 2 tiene escrito, con el nombre del
 * campo del asistente. Se ven sin esperar a que el campo pierda el foco: un
 * canon de once cifras se dice en el momento, no después de mandarlo. El
 * asistente no deja avanzar con alguno.
 */
export function topesDelPasoDelInmueble(
  formData: Partial<WizardFormData>,
): Partial<Record<CampoDelAsistente, string>> {
  const deVenta = formData.listingType === 'sale'
  const errores = erroresDelInmueble({
    title: formData.propertyTitle,
    address: formData.propertyAddress,
    city: formData.propertyCity,
    neighborhood: formData.propertyZone,
    monthlyRent: deVenta ? undefined : formData.monthlyRent,
    adminFee: formData.adminFee,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    area: formData.area,
    consignedAt: formData.consignedAt,
  })
  const delAsistente: Partial<Record<CampoDelAsistente, string>> = {}
  for (const [campo, mensaje] of Object.entries(errores) as [CampoDelInmueble, string][]) {
    const destino = CAMPO_DEL_ASISTENTE[campo]
    if (destino) delAsistente[destino] = mensaje
  }
  return delAsistente
}
