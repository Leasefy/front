import type { Contract } from '@/lib/types/contract';

/**
 * Lo que dice la pantalla de la inmobiliaria al terminar de firmar.
 *
 * CONTR-5 (QA de agentes 17-10): decía «nacieron sus cuotas» también cuando el
 * contrato quedaba SIN tabla de cuotas (el inmueble no tiene comisión): un
 * contrato activo sin nada que cobrar, y la pantalla diciendo lo contrario.
 * Ahora repite el motivo del back (`sinTablaDeCuotas`) y qué hacer.
 */
export function textoDelCierre(contrato: Pick<Contract, 'status' | 'sinTablaDeCuotas'>): string {
  const pdf = 'El PDF final incluye las dos firmas con su certificado.';
  if (contrato.status !== 'active') {
    return `Firmaron las dos partes. El contrato se activa en su fecha de inicio. ${pdf}`;
  }
  const motivo = contrato.sinTablaDeCuotas?.trim();
  if (motivo) {
    return `Firmaron las dos partes y el contrato ya está activo, pero todavía no tiene tabla de cuotas. ${motivo} ${pdf}`;
  }
  return `Firmaron las dos partes y el contrato ya está activo: nacieron sus cuotas. ${pdf}`;
}
