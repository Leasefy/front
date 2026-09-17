/**
 * Cómo se dicen en pantalla la modalidad (D1), el destino de los intereses (D2)
 * y los estados del mandato. Un solo lugar: la liquidación, la ficha del
 * inmueble y la configuración dicen lo mismo con las mismas palabras.
 */

import type {
  DestinoResuelto,
  EstadoDelCambioDeCuenta,
  Modalidad,
  ModalidadDeLaLiquidacion,
  ModalidadResuelta,
} from '@/lib/api/mandato.service';

export const NOMBRE_DE_LA_MODALIDAD: Record<ModalidadDeLaLiquidacion, string> = {
  GARANTIZADO: 'Garantizado',
  SOBRE_RECAUDO: 'Sobre recaudo',
  MIXTA: 'Garantizado y sobre recaudo',
};

export const QUE_ES_LA_MODALIDAD: Record<Modalidad, string> = {
  GARANTIZADO:
    'Se le gira lo que el contrato causa, pague o no el inquilino, siempre completo. Lo girado sin recaudo queda como cuenta por cobrar al inquilino.',
  SOBRE_RECAUDO:
    'Se le gira lo que el inquilino de ese contrato ya pagó; el mes puede salir parcial. No hay cuenta por cobrar.',
};

/** «Garantizado (de la inmobiliaria)», «Sin modalidad: la liquidación de siempre». */
export function modalidadEnPalabras(m: ModalidadResuelta | null | undefined): string {
  if (!m?.modalidad) return 'Sin modalidad: la liquidación de siempre';
  return m.fuente === 'INMOBILIARIA'
    ? `${NOMBRE_DE_LA_MODALIDAD[m.modalidad]} (la de la inmobiliaria)`
    : NOMBRE_DE_LA_MODALIDAD[m.modalidad];
}

export function interesesEnPalabras(d: DestinoResuelto | null | undefined): string {
  if (!d) return 'De la inmobiliaria';
  const porque = d.fuente === 'MODALIDAD' ? ' (sigue a la modalidad)' : '';
  if (d.destino === 'PROPIETARIO') return `Del propietario${porque}`;
  if (d.destino === 'REPARTO') {
    return `Reparto: ${d.porcentajeAlPropietario.toLocaleString('es-CO')} % al propietario`;
  }
  return `De la inmobiliaria${porque}`;
}

export const ESTADO_DEL_CAMBIO_DE_CUENTA: Record<EstadoDelCambioDeCuenta, string> = {
  PENDIENTE_CONFIRMACION: 'Esperando la confirmación del propietario',
  CONFIRMADO: 'Confirmado · giro retenido hasta aprobar',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

export const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** `2026-09` → «septiembre de 2026». */
export function mesLegible(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  if (!a || !m) return mes;
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** `2026-09-30` → «30 de septiembre de 2026». */
export function diaLegible(dia: string | null | undefined): string {
  if (!dia) return '—';
  const d = new Date(`${dia.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dia;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
