'use client'

/**
 * Las seis lecturas de la cartera, como pantallas hermanas.
 *
 * Nico (2026-09-12): «Ver la cartera: los cobros pendientes de los inquilinos
 * y los pagos pendientes, dividido por CONCEPTO. […] Y cuánto le debe la
 * inmobiliaria al propietario, por mes. Esos deben de ser módulos.»
 *
 * Son la MISMA plata mirada de varias formas, así que viven bajo la misma ruta
 * (`/pagos/cartera`) y no como filas del sidebar:
 *
 *   · Por edad         — cuánto hace que está vencida (la que ya existía).
 *   · Por concepto     — cuánto debe cada inquilino, por mes y por concepto.
 *   · Por pagar        — cuánto le debemos a cada propietario, por mes.
 *   · Cobros emitidos  — los DOCUMENTOS con los que se reclamó una parte.
 *   · Cobro jurídico   — lo que ya no se cobra con una llamada (17-09-2026).
 *   · Castigada        — la que se dejó de perseguir (21-09-2026).
 *
 * 🔴 «Cobros emitidos» entró acá el 2026-09-15 y no es una mudanza cosmética.
 * Era el módulo «Cobros» del sidebar, con su propia fila. La deuda NACE CON EL
 * CONTRATO y vive en su estado de cuenta; el cobro del mes no la crea, es el
 * documento con el que finanzas reclama una parte de ella —y lo decide una
 * persona mirando la cartera, no un cron (CEO, 2026-09-15)—. Un documento se
 * mira DESDE la cartera que lo justifica; por eso es una lectura más de
 * cartera y no un módulo paralelo. Ver
 * `back-erp/docs/pagos-conciliacion-dispersion-plan.md` §P2.7.
 *
 * Son enlaces y no un control de estado a propósito: cada lectura es una URL
 * que se puede compartir y a la que se puede volver, y el sidebar sigue
 * marcando «Cartera» en todas (`arquitectura-del-panel.ts` deja activa la
 * pantalla cuando la ruta cuelga de su `href`).
 *
 * El dibujo salió a `RielDePestanas` el 2026-09-16, cuando Liquidaciones
 * necesitó el mismo riel: acá quedan la LISTA y el porqué, que es lo propio de
 * Cartera. `PESTANAS_DE_CARTERA` sigue exportada — hay tests que la leen.
 */

import { CalendarBlank, CurrencyCircleDollar, Gavel, HandCoins, Receipt, Scales } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { RielDePestanas, type PestanaDelRiel } from '@/components/inmobiliaria/RielDePestanas'

const RAIZ = '/panel/inmobiliaria/pagos/cartera'

export const PESTANAS_DE_CARTERA: readonly PestanaDelRiel[] = [
  { href: RAIZ, labelKey: 'cartera.pestanas.porEdad', icon: CalendarBlank },
  { href: `${RAIZ}/conceptos`, labelKey: 'cartera.pestanas.porConcepto', icon: CurrencyCircleDollar },
  { href: `${RAIZ}/por-pagar`, labelKey: 'cartera.pestanas.porPagar', icon: HandCoins },
  { href: `${RAIZ}/cobros`, labelKey: 'cartera.pestanas.cobrosEmitidos', icon: Receipt },
  // 🔴 (17-09-2026) El final del camino de la cartera: el cobro jurídico.
  { href: `${RAIZ}/juridico`, labelKey: 'cartera.pestanas.juridico', icon: Gavel },
  /*
   * 🔴 (21-09-2026) Y el final del final: la que se dejó de perseguir. Va
   * DESPUÉS de jurídico porque es lo que pasa cuando el jurídico no alcanzó, y
   * entra como pestaña —no como sección de «Por edad»— justamente porque el
   * pedido es que SALGA de la cartera activa: mezclarla ahí sería volver a
   * ponerla en la lista de a quién llamar.
   */
  { href: `${RAIZ}/castigada`, labelKey: 'cartera.pestanas.castigada', icon: Scales },
]

export function PestanasDeCartera() {
  const { t } = useI18n()
  return <RielDePestanas items={PESTANAS_DE_CARTERA} ariaLabel={t('cartera.pestanas.ariaLabel')} />
}
