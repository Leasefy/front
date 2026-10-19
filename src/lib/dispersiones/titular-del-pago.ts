import type { CuentaDeOtraPersona } from '@/lib/api/lotes-de-dispersion.types';

/**
 * Qué dice la columna «Titular» de un pago del lote (PROP-3, QA de agentes
 * 17-10, Nico «Decirlo claro y girar»).
 *
 * 164 cuentas de Portofino son de otra persona y sólo se sabe su cédula: el
 * lote decía «Erika Andrea Agudelo Atehortua · CC 21436689» y quien aprobaba
 * creía que le pagaba a Erika. El archivo del banco no cambia (el banco valida
 * cuenta y cédula); la pantalla dice de quién es la cuenta y para quién es la
 * plata.
 */
export interface TitularDelPago {
  /** Lo que va en negrita. */
  titular: string;
  /** La segunda línea, o `null` si la cuenta es del propietario. */
  detalle: string | null;
  deOtraPersona: boolean;
}

export function titularDelPago(
  item: { id: string; nombreTitular: string },
  cuentasDeOtraPersona: readonly CuentaDeOtraPersona[] | undefined,
): TitularDelPago {
  const otra = cuentasDeOtraPersona?.find((c) => c.itemId === item.id);
  if (!otra) return { titular: item.nombreTitular, detalle: null, deOtraPersona: false };
  if (otra.nombreDelTitular) {
    return {
      titular: otra.nombreDelTitular,
      detalle: `Cuenta de otra persona · para ${otra.propietarioNombre}`,
      deOtraPersona: true,
    };
  }
  return {
    titular: 'Cuenta de otra persona',
    detalle: `Para ${otra.propietarioNombre} · no tenemos el nombre del titular, sólo su documento`,
    deOtraPersona: true,
  };
}
