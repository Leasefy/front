'use client'

/**
 * CarteraTable — las deudas de la cartera en la tabla de la casa.
 *
 * ── 🔴 Lo que cambió el 2026-09-16 ─────────────────────────────────────────
 *
 * La fila era un `Cobro`; ahora es una CUOTA del contrato. Y la columna de la
 * derecha dejó de ser «Mora» para ser «Estado», porque «venció» ya no
 * significa «hay que ir a buscarlo»: una cuota vencida dentro de los días de
 * plazo del contrato es deuda, no cartera, y la cobranza no la toca. El badge
 * dice en cuál de los tres cajones está y, cuando todavía no es cartera, dice
 * también cuántos días de plazo la sostienen — sin eso, un «Vencido» sin mora
 * se lee como un error del sistema.
 *
 * ── Por qué existe (Nico, 2026-09-02) ──────────────────────────────────────
 * «Esto sabes que debe tener una tabla como las que ya usamos, y hasta para
 * los empty state, y cuando tenga datos que tenga paginación.»
 *
 * Mismos primitivos que Agenda e Inquilinos (`Table` de `@/components/ui/table`,
 * que son los del DS: encabezados mono en mayúscula, divisores finos, hover de
 * fila), encabezados ordenables con `<button>` + `uppercase` explícito, fila
 * clickeable. El vacío entra por `vacio` y se pinta DENTRO del `<TableBody>`
 * para que los encabezados de columna sigan a la vista.
 *
 * ── Las columnas, en el orden que pidió Nico (2026-09-03) ──────────────────
 * inquilino · inmueble · propietario · período · días de mora · saldo ·
 * acciones. Dos datos viajan apilados dentro de la celda a la que pertenecen
 * en vez de pedir columna (el contenedor útil en desktop son ~1206 px):
 *
 *   - `dueDate`  → bajo el período («vence …»).
 *   - `paidAmount` → bajo el saldo («abonó …»), sólo si hubo abono.
 *   - `remindersSent` → bajo la mora: responde la misma pregunta («qué tan
 *     tarde va y qué hemos hecho»).
 *
 * Los que el back manda y siguen sin pintarse son de identificación, no de
 * lectura: `consignacionId`, `propietarioId`, `agenteId`/`agenteName` y
 * `status`, redundante con la mora en una pantalla de deuda.
 *
 * ── 🔴 De la fila se sale al ESTADO DE CUENTA (Nico, 2026-09-16) ───────────
 * «Todo funciona alrededor del estado de cuenta del contrato», y a esa pantalla
 * sólo se llegaba desde las fichas (contrato, propietario, inquilino), nunca
 * desde la cartera, que es donde se mira la deuda. El nombre del inquilino es el enlace
 * cuando se le puede identificar (acá, por su DOCUMENTO: `CarteraItem` no trae
 * la cuenta del portal). El `stopPropagation` es el mismo que ya llevan el
 * teléfono y el WhatsApp: la fila entera es clickeable y navega a otro lado.
 *
 * ── 🔴 Capital e interés, por separado (2026-09-16) ─────────────────────────
 * «Debe» es CAPITAL. Al lado van «Intereses» —el interés de mora que el back
 * liquida con la misma regla que la prefactura— y «Total», que suma los dos.
 * Una cuota pagada en mora sale con capital $0 y el interés que todavía debe.
 * Si la inmobiliaria no tiene reglas de mora, la celda no dice $0: dice «Sin
 * reglas de mora» y lleva a configurarlas.
 *
 * ── Y lo que se niega a hacer ──────────────────────────────────────────────
 * Un dato que el back no mandó se DICE. `remindersSent: 0` es un cero de
 * verdad («no le hemos escrito») y se escribe con palabras; un `tenantPhone`
 * en null no es un guion decorativo, es a quién no se le puede cobrar.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowSquareOut,
  Phone,
  SortAscending,
  SortDescending,
  WhatsappLogo,
} from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import { nombreDelMes } from '@/lib/utils/mes'
import { GRAVEDAD, gravedadDe } from '@/lib/cartera/edades'
import { refDelInquilino } from '@/lib/estado-de-cuenta/con-quien-se-abre'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  RUTA_DE_REGLAS_DE_MORA,
  CLAVE_DE_MORA,
  interesDe,
  totalConInteres,
} from './interes-de-mora'

/** A dónde vuelve el estado de cuenta que se abra desde esta tabla. */
const VOLVER_A = '/panel/inmobiliaria/pagos/cartera'

export type CampoDeOrdenDeCartera = 'inquilino' | 'mes' | 'debe' | 'total' | 'estado'
type Sentido = 'asc' | 'desc'

/** Cómo está ordenada la tabla. Por defecto, lo más vencido arriba. */
export interface OrdenDeCartera {
  campo: CampoDeOrdenDeCartera
  sentido: Sentido
}

export const ORDEN_POR_DEFECTO: OrdenDeCartera = { campo: 'estado', sentido: 'desc' }

/**
 * El orden que sigue al tocar un encabezado: el mismo campo invierte el
 * sentido; uno nuevo arranca A→Z si es el nombre y de mayor a menor si no
 * (más mora, más plata, más viejo primero).
 */
export function siguienteOrden(
  actual: OrdenDeCartera,
  campo: CampoDeOrdenDeCartera,
): OrdenDeCartera {
  if (campo === actual.campo) {
    return { campo, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' }
  }
  return { campo, sentido: campo === 'inquilino' ? 'asc' : 'desc' }
}

/** Cuántas columnas tiene la tabla: el vacío las abarca todas. */
export const COLUMNAS_DE_CARTERA = 9

/**
 * Qué tan grave está una fila, como UN número comparable.
 *
 * Ordenar por `diasDeMora` a secas ya no alcanza: una cuota por vencer y una
 * vencida dentro del plazo tienen las dos 0 días de mora, y sin el cajón
 * quedarían mezcladas. La escala de `edades.ts` las separa —por vencer <
 * vencida en plazo < cartera por edad— y los días desempatan adentro.
 */
function peso(item: CarteraItem): number {
  return GRAVEDAD.indexOf(gravedadDe(item)) * 100_000 + item.diasDeMora
}

/**
 * Ordena sin mutar.
 *
 * El nombre va con `localeCompare` es-CO para que «Ñ» caiga donde debe; sin
 * nombre se compara contra vacío, que en ascendente lo deja arriba —y arriba
 * es justo donde alguien lo va a ver y a completar—.
 */
export function ordenarCartera(
  items: readonly CarteraItem[],
  campo: CampoDeOrdenDeCartera,
  sentido: Sentido,
): CarteraItem[] {
  const signo = sentido === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    switch (campo) {
      case 'inquilino':
        return (a.tenantName ?? '').localeCompare(b.tenantName ?? '', 'es-CO') * signo
      case 'mes':
        // `vence` es `YYYY-MM-DD`: comparar como texto ya es cronológico.
        return a.vence.localeCompare(b.vence) * signo
      case 'debe':
        return (a.pendingAmount - b.pendingAmount) * signo
      case 'total':
        return (
          (totalConInteres(a, a.pendingAmount) - totalConInteres(b, b.pendingAmount)) * signo
        )
      default:
        return (peso(a) - peso(b)) * signo
    }
  })
}

/**
 * A dónde lleva la fila: al cobro si finanzas ya lo emitió, y si no al
 * contrato. Se exporta porque `CarteraCompleta` abre lo mismo al tocar la fila
 * y dos rutas distintas para el mismo clic es cómo aparece un enlace muerto.
 */
export function aDondeLleva(item: CarteraItem): string {
  return item.cobroId
    ? `/panel/inmobiliaria/pagos/cartera/cobros?cobro=${item.cobroId}`
    : `/panel/inmobiliaria/contratos/${item.contractId}`
}

export interface CarteraTableProps {
  items: readonly CarteraItem[]
  /** Abrir el cobro. La fila entera lo dispara; el botón de la derecha también. */
  onVerCobro?: (item: CarteraItem) => void
  /** El vacío de esta pantalla (`<SinDatos>`), pintado dentro del cuerpo. */
  vacio?: React.ReactNode
  /**
   * El orden, cuando lo lleva quien pagina. 🔴 Con paginado, ordenar sólo las
   * filas de la página es ordenar al azar: `items` llega ya recortado y lo más
   * vencido puede estar en la página 80. Quien pagina ordena la lista ENTERA
   * con `ordenarCartera` y le pasa acá el orden para que los encabezados lo
   * muestren y lo cambien.
   */
  orden?: OrdenDeCartera
  onOrdenar?: (orden: OrdenDeCartera) => void
}

export function CarteraTable({ items, onVerCobro, vacio, orden, onOrdenar }: CarteraTableProps) {
  const { t } = useI18n()
  /*
   * Por defecto, lo más vencido arriba. Una pantalla de cartera se abre para
   * saber a quién hay que ir a buscar YA; el orden en que el back devolvió las
   * filas no contesta eso.
   */
  const [ordenPropio, setOrdenPropio] = useState<OrdenDeCartera>(ORDEN_POR_DEFECTO)
  const { campo, sentido } = orden ?? ordenPropio

  // Con el orden controlado las filas ya vienen ordenadas; reordenarlas con el
  // mismo criterio (estable) no las mueve.
  const ordenados = useMemo(() => ordenarCartera(items, campo, sentido), [items, campo, sentido])

  const ordenarPor = (siguiente: CampoDeOrdenDeCartera) => {
    const nuevo = siguienteOrden({ campo, sentido }, siguiente)
    if (onOrdenar) onOrdenar(nuevo)
    if (!orden) setOrdenPropio(nuevo)
  }

  const Ordenable = ({
    campo: propio,
    alineado,
    children,
  }: {
    campo: CampoDeOrdenDeCartera
    alineado?: 'right'
    children: React.ReactNode
  }) => {
    const Icono = sentido === 'asc' ? SortAscending : SortDescending
    return (
      <TableHead className="whitespace-nowrap">
        {/* allowlist: disparador de orden — no hay primitiva en Cadence.
            `uppercase` explícito: un <button> trae text-transform:none del
            navegador y perdía las mayúsculas del TH. Ver InquilinosTable. */}
        <button
          type="button"
          onClick={() => ordenarPor(propio)}
          aria-sort={campo === propio ? (sentido === 'asc' ? 'ascending' : 'descending') : undefined}
          className={`flex w-full items-center gap-2 uppercase hover:text-fg ${
            alineado === 'right' ? 'justify-end' : ''
          }`}
          data-testid={`ordenar-${propio}`}
        >
          {children}
          {campo === propio && <Icono className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </TableHead>
    )
  }

  return (
    <Table className="min-w-[1220px]" data-testid="cartera-tabla">
      <TableHeader>
        <TableRow>
          <Ordenable campo="inquilino">{t('cartera.tabla.inquilino')}</Ordenable>
          <TableHead className="whitespace-nowrap">{t('cartera.tabla.inmueble')}</TableHead>
          <TableHead className="whitespace-nowrap">{t('cartera.tabla.propietario')}</TableHead>
          <Ordenable campo="mes">{t('cartera.tabla.mes')}</Ordenable>
          <Ordenable campo="estado">{t('cartera.tabla.mora')}</Ordenable>
          <Ordenable campo="debe" alineado="right">
            {t('cartera.tabla.debe')}
          </Ordenable>
          <TableHead className="whitespace-nowrap text-right" title={t(CLAVE_DE_MORA.explicacion)}>
            {t(CLAVE_DE_MORA.columnaIntereses)}
          </TableHead>
          <Ordenable campo="total" alineado="right">
            {t(CLAVE_DE_MORA.columnaTotal)}
          </Ordenable>
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenados.length === 0 && vacio ? (
          <TableRow>
            <TableCell colSpan={COLUMNAS_DE_CARTERA} className="p-0">
              {vacio}
            </TableCell>
          </TableRow>
        ) : (
          ordenados.map((item) => (
            <FilaDeCartera
              key={item.cuotaId}
              item={item}
              onVerCobro={onVerCobro ? () => onVerCobro(item) : undefined}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
}

function FilaDeCartera({
  item,
  onVerCobro,
}: {
  item: CarteraItem
  onVerCobro?: () => void
}) {
  const { t, locale, formatCurrency, formatDate } = useI18n()

  const inmueble = item.propertyAddress ?? item.propertyTitle
  const whatsapp = item.tenantPhone
    ? `https://wa.me/57${item.tenantPhone.replace(/\D/g, '').slice(-10)}`
    : null

  return (
    <TableRow
      className="cursor-pointer"
      onClick={onVerCobro}
      data-testid="cartera-fila"
      data-cuota-id={item.cuotaId}
      data-cajon={item.cajon}
    >
      {/* Inquilino: quién debe y por dónde se le habla. */}
      <TableCell className="align-middle">
        <div className="min-w-0 max-w-[12rem]">
          {item.tenantName ? (
            refDelInquilino({ documento: item.tenantDocument }) ? (
              <Link
                href={`${rutaDelEstadoDeCuenta('inquilino', refDelInquilino({ documento: item.tenantDocument })!)}?volver=${encodeURIComponent(VOLVER_A)}`}
                onClick={(e) => e.stopPropagation()}
                data-testid="cartera-estado-de-cuenta"
                title={`Ver el estado de cuenta de ${item.tenantName}`}
                className="block truncate font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
              >
                {item.tenantName}
              </Link>
            ) : (
              <p className="truncate font-medium text-fg">{item.tenantName}</p>
            )
          ) : (
            /* Un cobro sin inquilino es un cobro que nadie puede reclamar.
               «Sin nombre» sonaba a detalle estético; esto pide arreglarlo. */
            <p className="truncate font-medium text-warning">
              {t('cartera.tabla.sinInquilino')}
            </p>
          )}
          {item.tenantPhone ? (
            <span className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
              <a
                href={`tel:${item.tenantPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 font-mono tabular-nums hover:underline"
              >
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                {item.tenantPhone}
              </a>
              {/* En Colombia la cobranza pasa por WhatsApp antes que por una
                  llamada. */}
              <a
                href={whatsapp!}
                target="_blank"
                rel="noopener noreferrer"
                title={t('cartera.tabla.whatsapp')}
                onClick={(e) => e.stopPropagation()}
                className="text-success hover:opacity-80"
              >
                <WhatsappLogo className="h-3.5 w-3.5" weight="fill" aria-hidden="true" />
                <span className="sr-only">{t('cartera.tabla.whatsapp')}</span>
              </a>
            </span>
          ) : (
            /* Sin teléfono no hay llamada ni WhatsApp: es la deuda que sólo se
               puede cobrar por correo, y hay que saberlo antes de intentarlo. */
            <span className="mt-0.5 block text-xs text-warning">
              {t('cartera.tabla.sinTelefono')}
            </span>
          )}
        </div>
      </TableCell>

      {/* Inmueble */}
      <TableCell className="align-middle">
        {inmueble ? (
          <span className="block max-w-[11rem] truncate text-fg-muted">{inmueble}</span>
        ) : (
          <span className="text-warning">{t('cartera.tabla.sinDireccion')}</span>
        )}
      </TableCell>

      {/* Propietario — a quién le estamos quedando mal. */}
      <TableCell className="align-middle">
        {item.propietarioName ? (
          <span className="block max-w-[9rem] truncate text-fg-muted">
            {item.propietarioName}
          </span>
        ) : (
          <span className="text-warning">{t('cartera.tabla.sinPropietario')}</span>
        )}
      </TableCell>

      {/* Período + vencimiento apilado: la fecha exacta es lo que se discute
          con el inquilino, y no cabía como columna aparte. */}
      <TableCell className="align-middle">
        <div className="whitespace-nowrap">
          {/* «2026-09» es el identificador del mes, no cómo se lee: la casa
              lo escribe con letras (`nombreDelMes`, ver DispersionCard). */}
          <div className="whitespace-nowrap text-fg">{nombreDelMes(item.month, locale)}</div>
          <div className="font-mono text-xs tabular-nums text-fg-subtle">
            {t('cartera.tabla.vence', { fecha: formatDate(item.vence) })}
          </div>
        </div>
      </TableCell>

      {/* Estado + gestión: en qué cajón está, por qué, y qué hemos hecho.

          🔴 El badge NO dice «al día» cuando no hay mora: una cuota que venció
          hace dos días con tres de plazo no está al día, está dentro del plazo
          —y la diferencia es justo la que decide si la cobranza la toca—. */}
      <TableCell className="align-middle">
        <div className="space-y-1">
          <Badge
            variant={
              item.cajon !== 'CARTERA'
                ? 'outline'
                : item.diasDeMora > 60
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {item.cajon === 'CARTERA'
              ? t(
                  item.diasDeMora === 1
                    ? 'cartera.tabla.unDiaDeMora'
                    : 'cartera.tabla.diasDeMora',
                  { n: item.diasDeMora },
                )
              : item.cajon === 'VENCIDA_EN_PLAZO'
                ? t('cartera.tabla.vencidoEnPlazo')
                : t('cartera.tabla.porVencer')}
          </Badge>
          {/* El plazo se dice sólo donde explica algo: es la razón por la que
              una cuota vencida todavía no es cartera. */}
          {item.cajon === 'VENCIDA_EN_PLAZO' && item.diasDePlazo > 0 ? (
            <div className="whitespace-nowrap text-xs text-fg-subtle">
              {t(
                item.diasDePlazo === 1
                  ? 'cartera.tabla.unDiaDePlazo'
                  : 'cartera.tabla.diasDePlazo',
                { n: item.diasDePlazo },
              )}
            </div>
          ) : null}
          <div className="whitespace-nowrap text-xs text-fg-subtle">
            {/* Tres estados, no dos. `null` es «no hay cobro emitido desde el
                cual escribirle»; un 0 es un cero VERDADERO («no le hemos
                escrito»). Taparlos con el mismo texto los vuelve el mismo
                hecho, y no lo son. */}
            {item.remindersSent === null
              ? t('cartera.tabla.sinCobroEmitido')
              : item.remindersSent > 0
                ? t(
                    item.remindersSent === 1
                      ? 'cartera.tabla.unRecordatorio'
                      : 'cartera.tabla.recordatorios',
                    { n: item.remindersSent },
                  )
                : t('cartera.tabla.sinRecordatorios')}
          </div>
        </div>
      </TableCell>

      {/* Saldo: el pendiente manda; el abono va debajo sólo si lo hubo. */}
      <TableCell className="align-middle text-right">
        <div className="whitespace-nowrap">
          <div className="font-mono font-medium tabular-nums text-fg">
            {formatCurrency(item.pendingAmount)}
          </div>
          {item.paidAmount > 0 && (
            <div className="font-mono text-xs tabular-nums text-fg-subtle">
              {t('cartera.tabla.abonado', { monto: formatCurrency(item.paidAmount) })}
            </div>
          )}
        </div>
      </TableCell>

      {/* Intereses: aparte del capital. Nunca un $0 mudo. */}
      <TableCell className="align-middle text-right" data-testid="cartera-intereses">
        <InteresDeLaFila item={item} />
      </TableCell>

      {/* Total: capital + interés, lo que hay que pagar hoy por esta cuota. */}
      <TableCell className="align-middle text-right" data-testid="cartera-total">
        <div className="whitespace-nowrap font-mono font-medium tabular-nums text-fg">
          {interesDe(item)
            ? formatCurrency(totalConInteres(item, item.pendingAmount))
            : formatCurrency(item.pendingAmount)}
        </div>
      </TableCell>

      <TableCell className="align-middle text-right">
        {/* Enlace de verdad, no un onClick: se puede abrir en otra pestaña.

            🔴 Sin cobro emitido no hay cobro que abrir: el enlace va al
            CONTRATO, que es de donde nace la deuda. Un `?cobro=null` era una
            pestaña en blanco. */}
        <Button asChild variant="ghost" size="sm" hideArrow>
          <Link
            href={aDondeLleva(item)}
            onClick={(e) => e.stopPropagation()}
            data-testid="cartera-abrir-deuda"
          >
            <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">
              {item.cobroId ? t('cartera.tabla.verCobro') : t('cartera.tabla.verContrato')}
            </span>
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

/**
 * El interés de una fila.
 *
 *  · Con interés: el monto, y debajo si ya se abonó algo o si la cuota se pagó
 *    en mora (su capital está en $0 y aun así debe esto).
 *  · En mora sin reglas: «Sin reglas de mora» con el enlace a configurarlas.
 *    Un $0 ahí se leería «no hay mora», que es exactamente lo contrario.
 *  · En mora por otro motivo: «Sin interés», con el motivo del back en el
 *    `title`.
 *  · Sin mora: un guion. No hay nada que liquidar.
 *  · El back no lo mandó: un guion con el porqué en el `title`, nunca $0.
 */
function InteresDeLaFila({ item }: { item: CarteraItem }) {
  const { t, formatCurrency } = useI18n()
  const interes = interesDe(item)

  if (!interes) {
    return (
      <span className="text-fg-subtle" title={t(CLAVE_DE_MORA.sinDato)}>
        —
      </span>
    )
  }

  if (interes.liquidadoCop > 0) {
    return (
      <div className="whitespace-nowrap">
        <div
          className={`font-mono tabular-nums ${
            interes.pendienteCop > 0 ? 'text-danger' : 'text-fg-subtle'
          }`}
        >
          {formatCurrency(interes.pendienteCop)}
        </div>
        {interes.abonadoCop > 0 && (
          <div className="font-mono text-xs tabular-nums text-fg-subtle">
            {t(CLAVE_DE_MORA.abonado, { monto: formatCurrency(interes.abonadoCop) })}
          </div>
        )}
        {interes.pagadaEnMora && (
          <div className="text-xs text-fg-subtle">{t(CLAVE_DE_MORA.pagadaEnMora)}</div>
        )}
      </div>
    )
  }

  if (interes.motivo && interes.sinReglas) {
    return (
      <div className="whitespace-nowrap text-xs" title={interes.motivo}>
        <div className="text-warning" data-testid="cartera-sin-reglas">
          {t(CLAVE_DE_MORA.sinReglas)}
        </div>
        <Link
          href={RUTA_DE_REGLAS_DE_MORA}
          onClick={(e) => e.stopPropagation()}
          className="text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          {t(CLAVE_DE_MORA.configurar)}
        </Link>
      </div>
    )
  }

  if (interes.motivo) {
    return (
      <span className="whitespace-nowrap text-xs text-fg-muted" title={interes.motivo}>
        {t(CLAVE_DE_MORA.sinInteres)}
      </span>
    )
  }

  return <span className="text-fg-subtle">—</span>
}
