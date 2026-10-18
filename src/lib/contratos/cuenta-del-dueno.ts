import type { CuentaDelReparto } from '@/lib/api/mandato.service';
import { titularEnUnaLinea, titularInicial } from '@/lib/propietarios/titular-de-la-cuenta';

/**
 * La cuenta bancaria de un dueño, en una línea, para el contrato (Nico, QA de
 * agentes 17-10, «Desde el contrato, uno por uno»). `null` = no tiene cuenta.
 *
 * Si la cuenta es de otra persona se dice a nombre de quién (la ficha y el
 * lote dicen lo mismo, PROP-3); si es suya, no se repite su nombre.
 */
export interface ResumenDeLaCuenta {
  cuenta: string;
  /** `null` = la cuenta es del propio dueño, o recibe en varias. */
  aNombreDe: string | null;
}

function tipoDeCuenta(tipo: string | null): string | null {
  if (!tipo) return null;
  if (/corr/i.test(tipo)) return 'Corriente';
  if (/aho/i.test(tipo)) return 'Ahorros';
  return tipo;
}

function ultimos4(numero: string | null): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '');
  return digitos ? `•••• ${digitos.slice(-4)}` : null;
}

export function resumenDeLaCuenta(
  cuentas: readonly CuentaDelReparto[],
  dueno: { nombre: string; documento: string },
): ResumenDeLaCuenta | null {
  const conNumero = cuentas.filter((c) => (c.bankAccountNumber ?? '').replace(/\D/g, '') !== '');
  if (conNumero.length === 0) return null;
  if (conNumero.length > 1) {
    return {
      cuenta: `Recibe en ${conNumero.length} cuentas (${conNumero.map((c) => `${c.porcentaje} %`).join(' · ')})`,
      aNombreDe: null,
    };
  }
  const c = conNumero[0];
  const cuenta = [c.bankName, tipoDeCuenta(c.bankAccountType), ultimos4(c.bankAccountNumber)].filter(Boolean).join(' ');
  const deOtraPersona =
    titularInicial({
      nombreDelPropietario: dueno.nombre,
      documentoDelPropietario: dueno.documento,
      nombreDelTitular: c.bankAccountHolder,
      documentoDelTitular: c.bankAccountHolderDocument,
    }) === 'TERCERO';
  if (!deOtraPersona) return { cuenta, aNombreDe: null };
  const titular = titularEnUnaLinea({
    nombre: c.bankAccountHolder,
    tipoDocumento: c.bankAccountHolderDocumentType,
    numeroDocumento: c.bankAccountHolderDocument,
  });
  return {
    cuenta,
    aNombreDe: c.bankAccountHolder?.trim() ? `otra persona: ${titular}` : `otra persona (${titular || 'sin sus datos'})`,
  };
}
