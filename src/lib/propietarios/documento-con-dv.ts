/**
 * El NIT de un propietario, con su dígito de verificación (QA-PROP P-06, back
 * 5731a4e2). Igual que I-14 de Inquilinos (`lib/inquilinos/documento-con-dv.ts`).
 *
 * El back guarda el número SIN el DV (la llave de duplicados es la base,
 * `normalizarDocumento`) y lo devuelve calculado en `digitoDeVerificacion`
 * (algoritmo DIAN). La ficha de Constructora Ñandú decía «900555006» y no
 * «900555006-0». Un back anterior no lo manda: se calcula aquí con el mismo
 * algoritmo (`lib/onboarding/nit.ts`).
 */

import { digitoDeVerificacion } from '@/lib/onboarding/nit';
import type { Propietario } from '@/lib/types/inmobiliaria';

type DocumentoDelPropietario = Pick<Propietario, 'documentType' | 'documentNumber'> &
  Partial<Pick<Propietario, 'digitoDeVerificacion'>>;

/**
 * El número listo para pintar: un NIT con `-DV`; lo demás, igual. `null` sin
 * número (quien lo pinta dice «Sin registrar»). Un número que ya trae su guion
 * (dato viejo, de antes de normalizar) no se toca: no se le pega otro DV.
 */
export function documentoDelPropietarioConDv(p: DocumentoDelPropietario): string | null {
  const numero = p.documentNumber?.trim();
  if (!numero) return null;
  if (p.documentType !== 'NIT' || numero.includes('-')) return numero;
  const base = numero.replace(/[.\s]/g, '');
  const dv =
    typeof p.digitoDeVerificacion === 'number'
      ? p.digitoDeVerificacion
      : /^\d{1,15}$/.test(base)
        ? digitoDeVerificacion(base)
        : null;
  return dv === null ? numero : `${numero}-${dv}`;
}
