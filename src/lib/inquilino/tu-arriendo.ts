/**
 * «Tu arriendo», lo primero del Inicio de quien ya arrienda.
 *
 * QA de agentes 17-10 (Nico, «Inicio de arrendatario»): a un inquilino con
 * contrato vigente el Inicio le decía «Todavía no te has postulado» y le
 * ofrecía «Propiedades para ti». Lo que necesita ver es su arriendo: cuánto
 * debe, cuándo vence lo próximo y por dónde pagar.
 *
 * Todo sale del estado de cuenta (la misma cuenta que «Pagos» y «Mi
 * arriendo»): lo vencido de `resumirElCliente` y el próximo pago de
 * `proximoPagoDelPortal`, que suma lo que vence el mismo día.
 */

import { resumirElCliente } from '@/components/estado-de-cuenta/resumen';
import { proximoPagoDelPortal, type ProximoPagoDelPortal } from '@/lib/estado-de-cuenta/proximo-pago-del-portal';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface InmuebleDeTuArriendo {
  contratoId: string;
  /** El título del inmueble si se sabe (de su arriendo); si no, la dirección. */
  titulo: string;
  /** La dirección, sólo si el título no la dice ya. */
  direccion: string | null;
}

export interface VencidoDeTuArriendo {
  valor: number;
  cuotas: number;
  /** `YYYY-MM-DD`: el vencimiento de la más vieja. */
  desde: string;
  /** Pasó el plazo de pago: ya es mora. */
  enMora: boolean;
  diasDeMora: number;
}

export interface VistaDeTuArriendo {
  inmuebles: InmuebleDeTuArriendo[];
  vencido: VencidoDeTuArriendo | null;
  proximo: ProximoPagoDelPortal | null;
  /** Nada vencido y nada por vencer. */
  alDia: boolean;
}

/**
 * Lo que dice «Tu arriendo». Sólo mira los contratos donde la persona es la
 * INQUILINA (si también es propietaria, lo suyo de propietario va en el otro
 * portal); de esos, nombra los vigentes o por empezar, y la deuda la cuenta de
 * todos (un contrato terminado con saldo también se debe).
 */
export function vistaDeTuArriendo(
  doc: EstadoDeCuenta,
  hoy: string,
  titulos: Readonly<Record<string, string>> = {},
): VistaDeTuArriendo {
  const comoInquilino = doc.contratos.filter((c) => c.rol === 'INQUILINO');
  const vigentes = comoInquilino.filter((c) =>
    c.estadoDelContrato ? c.estadoDelContrato === 'VIGENTE' || c.estadoDelContrato === 'POR_EMPEZAR' : c.vigente,
  );
  const inmuebles = vigentes.map((c) => {
    const titulo = titulos[c.id]?.trim();
    const direccion = c.inmueble?.direccion?.trim() || null;
    return {
      contratoId: c.id,
      titulo: titulo || direccion || `Contrato ${c.numero}`,
      direccion: titulo && direccion && !titulo.includes(direccion) ? direccion : null,
    };
  });

  const docDelInquilino: EstadoDeCuenta = { ...doc, contratos: comoInquilino, proximaCuota: undefined };
  const r = resumirElCliente(docDelInquilino, hoy);
  const vencido =
    r.cuotasVencidas > 0 && r.vencidoCop > 0 && r.masVieja
      ? {
          valor: r.vencidoCop,
          cuotas: r.cuotasVencidas,
          desde: r.masVieja.fecha,
          enMora: r.enMora,
          diasDeMora: r.diasDeMora,
        }
      : null;
  const proximo = proximoPagoDelPortal(docDelInquilino, hoy);
  return { inmuebles, vencido, proximo, alDia: !vencido && !proximo };
}
