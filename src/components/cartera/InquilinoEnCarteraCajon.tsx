'use client'

/**
 * Todo lo que se sabe de un deudor, en un cajón.
 *
 * Nico, 21-09-2026, sobre «Cartera por concepto»: «y también cuando se dé clic
 * que me muestre todo en un drawer».
 *
 * ── Por qué hace falta si la fila ya se abre ────────────────────────────────
 *
 * La fila se despliega en sus meses desde el 12-09 (pedido suyo: «quiero ver
 * cuánto debe POR MES, cuánto EN TOTAL, y dividido por CONCEPTO»), y eso se
 * queda. Lo que no cabe ahí es el resto: la tabla tiene ocho columnas, el nombre
 * ya se parte en tres renglones y meter los contratos, el teléfono, el estado
 * jurídico y los intereses de cada mes en esa misma reja es lo que él llamó
 * vómito.
 *
 * Así que la fila tiene TRES blancos con tres trabajos distintos, y ninguno
 * pisa al otro:
 *
 *   · el **caret** despliega los meses ahí mismo — la mirada rápida;
 *   · el **resto de la fila** abre este cajón — todo lo que se sabe;
 *   · el **kebab** son las acciones.
 *
 * 🔴 No pide nada al back: lee el MISMO `InquilinoEnCartera` que la tabla, así
 * que no puede contradecirla. Cuando haga falta más —los recibos que abonaron,
 * la bitácora de cobranza— eso es una lectura nueva, con su propio estado de
 * carga.
 */

import Link from 'next/link'
import { ArrowSquareOut, Phone } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { refDesdeLaClave } from '@/lib/estado-de-cuenta/con-quien-se-abre'
import {
  NOMBRE_DEL_CONCEPTO,
  rotuloDelContrato,
  saldoDe,
} from '@/lib/cartera/conceptos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'
import type { InquilinoEnCartera, TipoDeConcepto } from '@/lib/api/cartera.types'
import { cn } from '@/lib/utils'
import { CLAVE_DE_MORA, interesDe, sumarIntereses } from './interes-de-mora'

/** En qué cajón está el mes, con sus palabras y su matiz. */
function ElCajonDelMes({
  fila,
}: {
  fila: InquilinoEnCartera['filas'][number]
}) {
  const { t } = useI18n()
  const interes = interesDe(fila)
  if (interes?.pagadaEnMora) {
    return (
      <span className="text-danger">
        {t(CLAVE_DE_MORA.pagadaEnMora)} · {fila.diasDeMora}{' '}
        {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
      </span>
    )
  }
  if (fila.enSiniestro) return <span className="text-danger">En siniestro</span>
  if (fila.enMora) {
    return (
      <span className="text-danger">
        Cartera · {fila.diasDeMora} {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
      </span>
    )
  }
  if (fila.esVencida) {
    return (
      <span className="text-warning">
        Venció el {fila.vence} · dentro del plazo de {fila.diasDePlazo}{' '}
        {fila.diasDePlazo === 1 ? 'día' : 'días'}
      </span>
    )
  }
  return <span className="text-fg-muted">Todavía no vence · vence el {fila.vence}</span>
}

export interface InquilinoEnCarteraCajonProps {
  /** `null` = cerrado. Es el MISMO objeto de la tabla, sin una lectura nueva. */
  inquilino: InquilinoEnCartera | null
  conceptos: readonly TipoDeConcepto[]
  onCerrar: () => void
  volverA: string
}

export function InquilinoEnCarteraCajon({
  inquilino,
  conceptos,
  onCerrar,
  volverA,
}: InquilinoEnCarteraCajonProps) {
  const { t } = useI18n()
  if (!inquilino) return null

  const ref = refDesdeLaClave(inquilino.clave)
  const interesTotal = sumarIntereses(inquilino.filas)
  const enJuridico = inquilino.contratos.find((c) => c.enJuridico)?.enJuridico

  return (
    <Cajon
      abierto
      onOpenChange={(a) => !a && onCerrar()}
      ancho="sm:max-w-2xl"
      data-testid="cajon-del-deudor"
    >
      <CajonCabecera
        titulo={inquilino.nombre ?? 'Sin nombre en el contrato'}
        descripcion={
          inquilino.documento
            ? `CC ${inquilino.documento}`
            : 'El contrato no trae su documento.'
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-2xl font-semibold tabular-nums text-fg" data-testid="cajon-debe">
            {formatCurrency(inquilino.totales.saldoCop)}
          </span>
          {interesTotal > 0 ? (
            <span
              className="font-mono text-sm tabular-nums text-danger"
              data-testid="cajon-interes"
              title={t(CLAVE_DE_MORA.explicacion)}
            >
              {t(CLAVE_DE_MORA.masIntereses, { monto: formatCurrency(interesTotal) })}
            </span>
          ) : null}
          {/* 🔴 «En jurídico» se ve acá también: quién lo lleva, para que nadie
              le escriba por otro lado. */}
          {enJuridico ? (
            <Badge variant="outline" data-testid="cajon-en-juridico">
              En jurídico · {enJuridico.abogado}
            </Badge>
          ) : null}
        </div>
      </CajonCabecera>

      <CajonCuerpo className="space-y-6">
        {/* 1 · Los tres momentos de su deuda, que no son sinónimos. */}
        <section className="grid grid-cols-3 gap-3">
          {(
            [
              ['Por vencer', inquilino.totales.porVencerCop, 'muted'],
              ['Vencido, en plazo', inquilino.totales.vencidaEnPlazoCop ?? 0, 'warning'],
              ['Cartera', inquilino.totales.enMoraCop, 'danger'],
            ] as const
          ).map(([rotulo, valor, tono]) => (
            <div key={rotulo} className="rounded-md border border-border px-3 py-2">
              <p className="text-caption uppercase tracking-wide text-fg-subtle">{rotulo}</p>
              <p
                className={cn(
                  'mt-0.5 font-mono text-sm font-semibold tabular-nums',
                  tono === 'danger'
                    ? 'text-danger'
                    : tono === 'warning'
                      ? 'text-warning'
                      : 'text-fg-muted',
                )}
              >
                {formatCurrency(valor)}
              </p>
            </div>
          ))}
        </section>

        {/* 2 · Sus contratos. En la tabla sólo caben como «2 contratos». */}
        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-fg">
            {inquilino.contratos.length === 1
              ? 'Su contrato'
              : `Sus ${inquilino.contratos.length} contratos`}
          </h3>
          <ul className="space-y-1 text-sm">
            {inquilino.contratos.map((c) => (
              <li
                key={c.contractId ?? c.inmueble}
                className="flex flex-wrap items-baseline gap-x-2"
                data-testid="cajon-contrato"
              >
                <span className="text-fg">{c.inmueble}</span>
                {c.contrato ? (
                  <span className="text-xs text-fg-muted">
                    {rotuloDelContrato(c).replace(/^ · /, '')}
                  </span>
                ) : null}
                {c.enJuridico ? (
                  <span className="text-xs text-danger">en jurídico</span>
                ) : null}
              </li>
            ))}
          </ul>
          {inquilino.telefono ? (
            <p className="pt-1">
              {/* Marcar lo hace la persona: de acá no sale ninguna llamada ni
                  ningún mensaje. */}
              <a
                href={`tel:${inquilino.telefono}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                data-testid="cajon-telefono"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {inquilino.telefono}
              </a>
            </p>
          ) : null}
        </section>

        {/* 3 · Mes por mes, por concepto. Es lo que pidió el 12-09, con espacio:
               acá cada mes tiene su bloque en vez de un renglón de 8 columnas. */}
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-fg">
            {inquilino.filas.length} {inquilino.filas.length === 1 ? 'mes' : 'meses'} que
            debe
          </h3>
          <ul className="space-y-2">
            {inquilino.filas.map((fila) => {
              const interes = interesDe(fila)?.pendienteCop ?? 0
              return (
                <li
                  key={fila.cuotaId}
                  className="rounded-md border border-border px-3 py-2"
                  data-testid="cajon-mes"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-fg">{mesEnTitulo(fila.month)}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {formatCurrency(fila.saldoCop)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs">
                    <ElCajonDelMes fila={fila} />
                  </p>
                  {/* Los conceptos del mes, sólo los que tienen plata: una lista
                      de guiones no informa nada. */}
                  <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-fg-muted">
                    {conceptos
                      .filter((c) => saldoDe(fila.saldoPorConcepto, c) !== 0)
                      .map((c) => (
                        <div key={c} className="flex gap-1">
                          <dt>{NOMBRE_DEL_CONCEPTO[c]}</dt>
                          <dd className="font-mono tabular-nums text-fg">
                            {formatCurrency(saldoDe(fila.saldoPorConcepto, c))}
                          </dd>
                        </div>
                      ))}
                    {/* 🔴 La diferencia que no cuadra se DELATA, no se promedia. */}
                    {fila.sinDesgloseCop !== 0 ? (
                      <div className="flex gap-1">
                        <dt className="text-warning">Sin desglose</dt>
                        <dd className="font-mono tabular-nums text-warning">
                          {formatCurrency(fila.sinDesgloseCop)}
                        </dd>
                      </div>
                    ) : null}
                    {interes > 0 ? (
                      <div className="flex gap-1">
                        <dt className="text-danger">Interés de mora</dt>
                        <dd className="font-mono tabular-nums text-danger">
                          {formatCurrency(interes)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              )
            })}
          </ul>
        </section>
      </CajonCuerpo>

      <CajonPie
        ayuda={
          ref
            ? 'Su estado de cuenta tiene todos sus períodos y sus pagos, no sólo lo que debe.'
            : 'Sin cuenta en el portal ni documento no se puede abrir su estado de cuenta: se identifica con el documento.'
        }
      >
        <Button variant="ghost" hideArrow onClick={onCerrar}>
          Cerrar
        </Button>
        {ref ? (
          <Button asChild hideArrow>
            <Link
              href={`${rutaDelEstadoDeCuenta('inquilino', ref)}?volver=${encodeURIComponent(volverA)}`}
              data-testid="cajon-estado-de-cuenta"
            >
              <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
              Estado de cuenta
            </Link>
          </Button>
        ) : null}
      </CajonPie>
    </Cajon>
  )
}
