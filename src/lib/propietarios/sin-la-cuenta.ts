import type { PropietarioFormData } from '@/lib/types/inmobiliaria';

/**
 * Lo que se guarda cuando quien llena el formulario no ve la cuenta: NINGÚN
 * campo de la cuenta. `mapPropietarioBankFields` manda `bankAccountNumber` y
 * el titular apenas no son `undefined` —un `''` borraría o «cambiaría» la
 * cuenta—, así que se van en `undefined`, no vacíos.
 */
export function sinLaCuenta(datos: PropietarioFormData): PropietarioFormData {
  const {
    accountNumber: _numero,
    accountHolder: _titular,
    accountHolderDocument: _documento,
    accountHolderDocumentType: _tipoDeDocumento,
    titularDeLaCuenta: _pregunta,
    ...resto
  } = datos;
  return { ...resto, bankCode: '', accountType: '' } as PropietarioFormData;
}
