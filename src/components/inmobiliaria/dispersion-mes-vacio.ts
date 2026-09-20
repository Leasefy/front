/**
 * Por qué un mes no deja nada que girar, dicho en palabras. Función PURA.
 *
 * ── La causa que ya no existe ───────────────────────────────────────────────
 *
 * El asistente de dispersión explicaba el vacío con «Sin cobros pagados — No
 * hay cobros pagados en agosto. Esperá a que se registren pagos». Desde el
 * 16-09 la dispersión NO sale de los cobros pagados: sale de las cuotas del
 * lado PROPIETARIO de cada contrato (`dispersiones/desde-las-cuotas.ts` en el
 * back), y se puede girar aunque el inquilino no haya pagado (Nico, 15-09). Esa
 * frase mandaba a esperar un pago que no iba a cambiar nada.
 *
 * Medido en la inmobiliaria migrada el 16-09: agosto tiene 761 cuotas de
 * propietario y 0 por girar, porque todas vienen del sistema anterior.
 *
 * ── De dónde sale la razón ──────────────────────────────────────────────────
 *
 * La cuenta la hace el back (`preview.vacio`, en la tabla de donde sale el
 * giro); acá sólo se elige la frase, en este orden: ya generadas → sin
 * contratos vigentes → ningún contrato con cuota ese mes → cuotas con saldo
 * pero sin propietario a quien girar → ya en una dispersión → del sistema
 * anterior → sin saldo. Un back que todavía no manda `vacio` recibe la frase
 * general, que tampoco nombra a los cobros.
 */

import type { PorQueElMesVieneVacio } from '@/lib/types/inmobiliaria';
import { mesEnTitulo, nombreDelMes } from '@/lib/utils/mes';

export interface MotivoDelMesVacio {
  titulo: string;
  detalle: string;
}

const numero = new Intl.NumberFormat('es-CO');

/** «1 cuota de propietario» / «761 cuotas de propietario». */
function cuotas(n: number): string {
  return n === 1 ? '1 cuota de propietario' : `${numero.format(n)} cuotas de propietario`;
}

export function motivoDelMesVacio({
  mes,
  yaGenerados,
  vacio,
}: {
  /** `YYYY-MM`. */
  mes: string;
  /** Propietarios que ya tienen la dispersión de este mes. */
  yaGenerados: number;
  /** La cuenta del back. `undefined`/`null` con un back anterior al 16-09. */
  vacio?: PorQueElMesVieneVacio | null;
}): MotivoDelMesVacio {
  const enElMes = nombreDelMes(mes);

  if (yaGenerados > 0) {
    return {
      titulo: 'Ya están generadas',
      detalle:
        yaGenerados === 1
          ? `La dispersión de ${enElMes} ya existe. Búscala en la lista.`
          : `Las ${numero.format(yaGenerados)} dispersiones de ${enElMes} ya existen. Búscalas en la lista.`,
    };
  }

  if (!vacio) {
    return {
      titulo: 'Nada por girar',
      detalle: `No hay cuotas de propietario por girar en ${enElMes}. Elige otro mes.`,
    };
  }

  if (vacio.cuotasDelMes === 0) {
    if (vacio.contratosVigentes === 0) {
      return {
        titulo: 'No tienes contratos vigentes',
        detalle:
          'Cada giro sale de la cuota del propietario de un contrato, y hoy no hay ningún contrato vigente del que salga.',
      };
    }
    return {
      titulo: `Ningún contrato tiene cuota en ${enElMes}`,
      detalle: `${
        vacio.contratosVigentes === 1
          ? 'Tienes 1 contrato vigente, pero no tiene'
          : `Tienes ${numero.format(vacio.contratosVigentes)} contratos vigentes, pero ninguno tiene`
      } cuota de propietario en ${enElMes}: el mes queda fuera de su vigencia o su tabla de cuotas todavía no se armó.`,
    };
  }

  if (vacio.porGirar > 0) {
    return {
      titulo: 'Hay cuotas, pero no a quién girarlas',
      detalle: `${
        vacio.porGirar === 1
          ? `1 cuota de propietario de ${enElMes} tiene saldo por girar, pero su contrato no tiene`
          : `${cuotas(vacio.porGirar)} de ${enElMes} tienen saldo por girar, pero sus contratos no tienen`
      } un propietario de tu inmobiliaria asociado. Revisa el propietario del inmueble en cada contrato.`,
    };
  }

  if (vacio.enUnaDispersion > 0) {
    return {
      titulo: 'Ya están en una dispersión',
      detalle: `${
        vacio.enUnaDispersion === 1
          ? `La cuota de propietario de ${enElMes} ya quedó`
          : `Las ${cuotas(vacio.enUnaDispersion)} de ${enElMes} ya quedaron`
      } en una dispersión. Búscala en la lista.`,
    };
  }

  if (vacio.delSistemaAnterior > 0) {
    return {
      titulo: `${mesEnTitulo(mes)} lo gestionó tu sistema anterior`,
      detalle: `${
        vacio.delSistemaAnterior === 1
          ? 'Su cuota de propietario viene'
          : `Sus ${cuotas(vacio.delSistemaAnterior)} vienen`
      } del sistema del que migraste: no hay saldo por girar en Leasefy.`,
    };
  }

  return {
    titulo: 'Nada por girar',
    detalle: `${
      vacio.cuotasDelMes === 1
        ? `La cuota de propietario de ${enElMes} ya no tiene saldo por girar: está cancelada o anulada.`
        : `Las ${cuotas(vacio.cuotasDelMes)} de ${enElMes} ya no tienen saldo por girar: están canceladas o anuladas.`
    }`,
  };
}
