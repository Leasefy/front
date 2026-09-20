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
    'Al propietario se le gira el canon completo cada mes, haya pagado o no el inquilino. Lo que se giró sin haber recaudado queda como deuda del inquilino.',
  SOBRE_RECAUDO:
    'Al propietario se le gira sólo lo que el inquilino ya pagó. Si pagó a medias, el giro sale a medias, y no queda deuda de la inmobiliaria con él.',
};

/** Qué pasa cuando el mandato no pactó una regla especial. */
export const SIN_MODALIDAD_PACTADA =
  'Este mandato no pactó una regla especial de giro, así que se liquida como el resto: la base la define quien genera los giros del mes.';

/**
 * «Garantizado (de la inmobiliaria)», «Como siempre».
 *
 * 🔴 El caso por defecto decía «Sin modalidad: la liquidación de siempre»
 * (Nico, 18-09-2026: «nada de lo que dice aquí lo entienden los usuarios»).
 * «Modalidad» es palabra nuestra y «la liquidación de siempre» no dice qué
 * pasa. Lo que pasa es lo normal: se le gira al propietario según lo que
 * decida quien genera los giros, sin regla especial pactada en el mandato.
 */
export function modalidadEnPalabras(m: ModalidadResuelta | null | undefined): string {
  if (!m?.modalidad) return 'Como siempre, sin regla especial';
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
