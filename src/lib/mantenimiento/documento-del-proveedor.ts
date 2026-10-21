/**
 * El documento del proveedor: TIPO aparte del número (Nico, 21-10-2026, en la
 * reunión con Portofino: «se deben pedir datos reales acá, separa el tipo de
 * donde pone el campo y dale varias opciones»).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/mantenimiento/proveedores/tipo-de-documento-del-proveedor.ts`:
 * mismos tipos, mismos largos y mismas frases. Sólo largo y caracteres, y el
 * NIT con su dígito de verificación DIAN; nada de «parece un celular».
 */
import { digitoDeVerificacion } from '@/lib/onboarding/nit'

export const TIPOS_DE_DOCUMENTO_DEL_PROVEEDOR = ['CC', 'NIT', 'CE', 'PPT', 'PASSPORT'] as const
export type TipoDeDocumentoDelProveedor = (typeof TIPOS_DE_DOCUMENTO_DEL_PROVEEDOR)[number]

export const NOMBRE_DEL_TIPO_DE_DOCUMENTO: Record<TipoDeDocumentoDelProveedor, string> = {
  CC: 'Cédula de ciudadanía',
  NIT: 'NIT (empresa)',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por Protección Temporal',
  PASSPORT: 'Pasaporte',
}

export const EJEMPLO_DEL_TIPO_DE_DOCUMENTO: Record<TipoDeDocumentoDelProveedor, string> = {
  CC: '71234567',
  NIT: '900123456-8',
  CE: '1234567',
  PPT: '1234567',
  PASSPORT: 'AB123456',
}

const LARGOS: Record<'CC' | 'CE' | 'PPT', { min: number; max: number }> = {
  CC: { min: 6, max: 10 },
  CE: { min: 5, max: 10 },
  PPT: { min: 5, max: 15 },
}

export type RevisionDelDocumentoDelProveedor = { ok: true; numero: string } | { ok: false; mensaje: string }

/** El número según su tipo, ya limpio (el NIT con su `-DV`). Nunca lanza. */
export function revisarDocumentoDelProveedor(
  tipo: TipoDeDocumentoDelProveedor,
  crudo: string | null | undefined,
): RevisionDelDocumentoDelProveedor {
  const texto = (crudo ?? '').trim()
  if (!texto) return { ok: false, mensaje: 'Escribe el número de documento del proveedor.' }
  if (tipo === 'PASSPORT') {
    const numero = texto.replace(/[\s.-]/g, '').toUpperCase()
    return /^[A-Z0-9]{5,20}$/.test(numero)
      ? { ok: true, numero }
      : { ok: false, mensaje: 'El pasaporte lleva entre 5 y 20 letras o números.' }
  }
  if (tipo === 'NIT') {
    const limpio = texto.replace(/[.\s]/g, '')
    const m = /^(\d{5,15})(?:-(\d))?$/.exec(limpio)
    if (!m) return { ok: false, mensaje: 'Escribe el NIT así: 900123456-8 (el guion separa el dígito de verificación).' }
    const dv = digitoDeVerificacion(m[1])
    if (m[2] !== undefined && Number(m[2]) !== dv) {
      return { ok: false, mensaje: `El dígito de verificación no corresponde a ese NIT: debería ser ${dv}. Revisa el número.` }
    }
    return { ok: true, numero: `${m[1]}-${dv}` }
  }
  const limpio = texto.replace(/[.\s,]/g, '')
  const { min, max } = LARGOS[tipo]
  if (!/^\d+$/.test(limpio)) return { ok: false, mensaje: 'Ese tipo de documento lleva sólo números.' }
  if (limpio.length < min || limpio.length > max) {
    return { ok: false, mensaje: `Ese tipo de documento lleva entre ${min} y ${max} dígitos.` }
  }
  return { ok: true, numero: limpio }
}
