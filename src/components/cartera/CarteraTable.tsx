'use client'

/**
 * CarteraTable — las deudas de la cartera en la tabla de la casa.
 *
 * ── Por qué existe (Nico, 2026-09-02) ──────────────────────────────────────
 * «Esto sabés que debe tener una tabla como las que ya usamos, y hasta para
 * los empty state, y cuando tenga datos que tenga paginación.»
 *
 * La lista de deudas ya era un `<table>`, pero no era LA tabla del panel:
 * celdas sin `p-4`, encabezados que no ordenaban, filas que no se podían
 * clickear y un paginador propio de 20 filas fijas sin selector de tamaño.
 * Al lado de Inquilinos y Propietarios se leía como otra pantalla. Acá se
 * alinea con `InquilinosTable`: mismos primitivos, mismo `p-4`, encabezados
 * ordenables con `<button>` + `uppercase` explícito, fila clickeable.
 *
 * ── Las columnas, y por qué son SIETE y no nueve ───────────────────────────
 * El contenedor útil en desktop son ~1206 px. Con una columna por dato la
 * tabla se salía de la pantalla (el mismo problema que obligó a sacar el
 * avatar y a apilar las fechas en Inquilinos), así que dos datos viajan
 * apilados dentro de la celda a la que pertenecen en vez de pedir columna:
 *
 *   - `dueDate`  → bajo el mes («vence …»). Antes NI SE MOSTRABA.
 *   - `paidAmount` → bajo lo que debe («abonó …»), sólo si hubo abono.
 *     Un pago parcial cambia la conversación con el inquilino y la tabla
 *     vieja lo escondía: mostraba el pendiente y nada más.
 *   - `remindersSent` + `lastReminderDate` → bajo la mora. Responden la
 *     misma pregunta que la mora («qué tan tarde va y qué hemos hecho»), y
 *     como columna propia el encabezado «RECORDATORIOS» costaba ~130 px que
 *     empujaban la última columna fuera de la pantalla.
 *
 * No se pierde ningún dato del que hoy se ve. Los que el back manda y siguen
 * sin pintarse son de identificación, no de lectura: `consignacionId`,
 * `propietarioId`, `agenteId`/`agenteName` (nadie filtra por agente acá) y
 * `status`, que es redundante con la mora en una pantalla de deuda.
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
import type { CarteraItem } from '@/lib/types/inmobiliaria'

export type CampoDeOrdenDeCartera = 'inquilino' | 'mes' | 'debe' | 'mora'
type Sentido = 'asc' | 'desc'

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
        // `dueDate` es ISO: comparar como texto ya es cronológico, y sirve
        // aunque el back mande fecha sola o fecha con hora.
        return a.dueDate.localeCompare(b.dueDate) * signo
      case 'debe':
        return (a.pendingAmount - b.pendingAmount) * signo
      default:
        return (a.daysLate - b.daysLate) * signo
    }
  })
}

export interface CarteraTableProps {
  items: readonly CarteraItem[]
  /** Abrir el cobro. La fila entera lo dispara; el botón de la derecha también. */
  onVerCobro?: (item: CarteraItem) => void
}

export function CarteraTable({ items, onVerCobro }: CarteraTableProps) {
  const { t } = useI18n()
  /*
   * Por defecto, lo más vencido arriba. Una pantalla de cartera se abre para
   * saber a quién hay que ir a buscar YA; el orden en que el back devolvió las
   * filas no contesta eso.
   */
  const [campo, setCampo] = useState<CampoDeOrdenDeCartera>('mora')
  const [sentido, setSentido] = useState<Sentido>('desc')

  const ordenados = useMemo(() => ordenarCartera(items, campo, sentido), [items, campo, sentido])

  const ordenarPor = (siguiente: CampoDeOrdenDeCartera) => {
    if (siguiente === campo) {
      setSentido((s) => (s === 'asc' ? 'desc' : 'asc'))
      return
    }
    setCampo(siguiente)
    // El nombre se lee A→Z; lo demás interesa de mayor a menor (más mora, más
    // plata, más viejo primero).
    setSentido(siguiente === 'inquilino' ? 'asc' : 'desc')
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
      <TableHead className="p-4 text-left">
        {/* allowlist: disparador de orden — no hay primitiva en Cadence.
            `uppercase` explícito: un <button> trae text-transform:none del
            navegador y perdía las mayúsculas del TH. Ver InquilinosTable. */}
        <button
          type="button"
          onClick={() => ordenarPor(propio)}
          className={`flex w-full items-center gap-2 uppercase hover:text-fg ${
            alineado === 'right' ? 'justify-end' : ''
          }`}
          data-testid={`ordenar-${propio}`}
        >
          {children}
          {campo === propio && <Icono className="h-3.5 w-3.5" />}
        </button>
      </TableHead>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1040px]" data-testid="cartera-tabla">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30">
            <Ordenable campo="inquilino">{t('cartera.tabla.inquilino')}</Ordenable>
            <TableHead className="p-4 text-left">{t('cartera.tabla.inmueble')}</TableHead>
            <TableHead className="p-4 text-left">{t('cartera.tabla.propietario')}</TableHead>
            <Ordenable campo="mes">{t('cartera.tabla.mes')}</Ordenable>
            <Ordenable campo="debe" alineado="right">
              {t('cartera.tabla.debe')}
            </Ordenable>
            <Ordenable campo="mora">{t('cartera.tabla.mora')}</Ordenable>
            <TableHead className="w-16 p-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((item) => (
            <FilaDeCartera
              key={item.cobroId}
              item={item}
              onVerCobro={onVerCobro ? () => onVerCobro(item) : undefined}
            />
          ))}
        </TableBody>
      </Table>
    </div>
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
      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
      onClick={onVerCobro}
      data-testid="cartera-fila"
      data-cobro-id={item.cobroId}
    >
      {/* Inquilino: quién debe y por dónde se le habla. */}
      <TableCell className="p-4 align-middle">
        <div className="min-w-0 max-w-[12rem]">
          {item.tenantName ? (
            <p className="truncate font-medium text-fg">{item.tenantName}</p>
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
                <Phone className="h-3 w-3 shrink-0" />
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
                <WhatsappLogo className="h-3.5 w-3.5" weight="fill" />
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
      <TableCell className="p-4 align-middle">
        {inmueble ? (
          <span className="block max-w-[11rem] truncate text-sm text-fg-muted">{inmueble}</span>
        ) : (
          <span className="text-sm text-warning">{t('cartera.tabla.sinDireccion')}</span>
        )}
      </TableCell>

      {/* Propietario — a quién le estamos quedando mal. */}
      <TableCell className="p-4 align-middle">
        {item.propietarioName ? (
          <span className="block max-w-[9rem] truncate text-sm text-fg-muted">
            {item.propietarioName}
          </span>
        ) : (
          <span className="text-sm text-warning">{t('cartera.tabla.sinPropietario')}</span>
        )}
      </TableCell>

      {/* Mes + vencimiento apilado: la fecha exacta es lo que se discute con el
          inquilino, y no cabía como columna aparte. */}
      <TableCell className="p-4 align-middle">
        <div className="whitespace-nowrap">
          {/* «2026-09» es el identificador del mes, no cómo se lee: la casa
              lo escribe con letras (`nombreDelMes`, ver DispersionCard). */}
          <div className="whitespace-nowrap text-sm text-fg">{nombreDelMes(item.month, locale)}</div>
          <div className="font-mono text-xs tabular-nums text-fg-subtle">
            {t('cartera.tabla.vence', { fecha: formatDate(item.dueDate) })}
          </div>
        </div>
      </TableCell>

      {/* Debe: el pendiente manda; el abono va debajo sólo si lo hubo. */}
      <TableCell className="p-4 align-middle text-right">
        <div className="whitespace-nowrap">
          <div className="font-mono text-sm font-medium tabular-nums text-fg">
            {formatCurrency(item.pendingAmount)}
          </div>
          {item.paidAmount > 0 && (
            <div className="font-mono text-xs tabular-nums text-fg-subtle">
              {t('cartera.tabla.abonado', { monto: formatCurrency(item.paidAmount) })}
            </div>
          )}
        </div>
      </TableCell>

      {/* Mora + gestión: qué tan tarde va y qué hemos hecho al respecto. */}
      <TableCell className="p-4 align-middle">
        <div className="space-y-1">
          <Badge
            variant={
              item.daysLate > 60 ? 'destructive' : item.daysLate > 0 ? 'secondary' : 'outline'
            }
          >
            {item.daysLate > 0
              ? t(item.daysLate === 1 ? 'cartera.tabla.unDiaDeMora' : 'cartera.tabla.diasDeMora', {
                  n: item.daysLate,
                })
              : t('cartera.tabla.alDia')}
          </Badge>
          <div className="whitespace-nowrap text-xs text-fg-subtle">
            {/* Cero recordatorios es un cero VERDADERO y dice algo: nadie le ha
                escrito todavía. Un «0» suelto en una columna se lee como un
                dato que faltó. */}
            {item.remindersSent > 0
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

      <TableCell className="p-4 align-middle text-right">
        {/* Enlace de verdad, no un onClick: se puede abrir en otra pestaña. */}
        <Button asChild variant="ghost" size="sm" hideArrow>
          <Link
            href={`/panel/inmobiliaria/cobros?cobro=${item.cobroId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowSquareOut className="h-4 w-4" />
            <span className="sr-only">{t('cartera.tabla.verCobro')}</span>
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}
