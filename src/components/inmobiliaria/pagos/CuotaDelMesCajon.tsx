'use client'

/**
 * El detalle de una cuota del mes, en un cajón.
 *
 * ── El pedido ───────────────────────────────────────────────────────────────
 *
 * Nico, 21-09-2026, sobre «Deuda del mes»: «no le hiciste el detalle al dar
 * clic en un drawer». Y sobre Cartera, la misma frase al revés: «y también
 * cuando se dé clic que me muestre todo en un drawer».
 *
 * La fila mostraba seis columnas y el único clic que hacía algo era el del
 * nombre, que se iba de la pantalla al estado de cuenta completo. Para
 * responder «¿por qué este señor está en cartera?» había que abandonar la
 * lista, mirar, y volver — y volver pierde el filtro y la página.
 *
 * ── Qué muestra, y en qué orden ─────────────────────────────────────────────
 *
 * El orden es el de la pregunta que trae a alguien acá:
 *
 *   1. **en qué cajón está y desde cuándo** — es lo que decide si se puede
 *      llamar (Ley 2300) y lo primero que se mira;
 *   2. **la plata**: lo pactado, lo que entró, lo que falta, y el interés
 *      APARTE del capital — nunca sumados en un solo número;
 *   3. **de quién y de qué inmueble** es, con su contacto;
 *   4. **a dónde ir**: el estado de cuenta completo del cliente, que es el
 *      documento donde esta cuota es un renglón.
 *
 * 🔴 No trae ni un número que la fila no tenga ya. El cajón lee la MISMA
 * `FilaDeLaCuotaDelMes` que la tabla: no pide nada al back y por eso no puede
 * contradecirla. Cuando haga falta más (los recibos que la pagaron, la bitácora
 * de cobranza) eso es una lectura nueva y va a tener su propio estado de carga;
 * mientras no exista, el cajón lleva al estado de cuenta y lo dice.
 */

import Link from 'next/link'
import { ArrowSquareOut, Phone } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { refDelInquilino } from '@/lib/estado-de-cuenta/con-quien-se-abre'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { rotuloDelContrato } from '@/lib/cartera/conceptos'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { nombreDelMes } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'
import type { FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { cn } from '@/lib/utils'
import { CLAVE_DE_MORA, interesPendiente } from '@/components/cartera/interes-de-mora'
import { NOMBRE_DEL_CAJON, VARIANTE_DEL_CAJON, fechaLocal } from './cajon-de-la-cuota'

/** Un dato del cajón: rótulo arriba, valor abajo. */
function Dato({
  rotulo,
  children,
  testId,
  tono,
}: {
  rotulo: string
  children: React.ReactNode
  testId?: string
  tono?: 'success' | 'danger' | 'muted'
}) {
  return (
    <div>
      <p className="text-caption uppercase tracking-wide text-fg-subtle">{rotulo}</p>
      <p
        className={cn(
          'mt-0.5 text-sm text-fg',
          tono === 'success' && 'text-success',
          tono === 'danger' && 'text-danger',
          tono === 'muted' && 'text-fg-muted',
        )}
        data-testid={testId}
      >
        {children}
      </p>
    </div>
  )
}

export interface CuotaDelMesCajonProps {
  /** `null` = cerrado. Es la MISMA fila de la tabla, sin una lectura nueva. */
  fila: FilaDeLaCuotaDelMes | null
  onCerrar: () => void
  /** A dónde vuelve el estado de cuenta cuando se abre desde acá. */
  volverA: string
}

export function CuotaDelMesCajon({ fila, onCerrar, volverA }: CuotaDelMesCajonProps) {
  const { locale, t } = useI18n()
  const idioma = locale === 'es' ? 'es' : 'en'

  if (!fila) return null

  const ref = refDelInquilino(fila)
  const interes = interesPendiente(fila)
  const nombre = fila.inquilino ?? 'Sin nombre en el contrato'

  return (
    <Cajon
      abierto
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar()
      }}
      data-testid="cajon-de-la-cuota"
    >
      <CajonCabecera
        titulo={nombre}
        descripcion={`${nombreDelMes(fila.mes, idioma)} · ${fila.inmueble}`}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={VARIANTE_DEL_CAJON[fila.cajon]}>
            {fila.enSiniestro ? 'En siniestro' : NOMBRE_DEL_CAJON[fila.cajon]}
          </Badge>
          {/* El matiz del cajón: la cartera dice cuántos días lleva y lo
              vencido en plazo cuántos le quedan. Son dos hechos distintos, y
              confundirlos es cómo se llama a alguien que está usando el plazo
              que la inmobiliaria misma le dio. */}
          {fila.cajon === 'CARTERA' && (
            <span className="text-sm text-danger" data-testid="cajon-dias-de-mora">
              {fila.diasDeMora} {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
            </span>
          )}
          {fila.cajon === 'VENCIDA_EN_PLAZO' && (
            <span className="text-sm text-fg-muted" data-testid="cajon-dias-de-plazo">
              venció, pero tiene {fila.diasDePlazo}{' '}
              {fila.diasDePlazo === 1 ? 'día' : 'días'} de plazo
            </span>
          )}
        </div>
      </CajonCabecera>

      <CajonCuerpo className="space-y-6">
        {/* 1 · La plata. Lo pactado, lo que entró, lo que falta. */}
        <section className="grid grid-cols-2 gap-4">
          <Dato rotulo="Se debe en el período" testId="cajon-se-debe">
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(fila.totalCop)}
            </span>
          </Dato>
          <Dato rotulo="Pagado" testId="cajon-pagado" tono={fila.pagadoCop > 0 ? 'success' : 'muted'}>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(fila.pagadoCop)}
            </span>
          </Dato>
          <Dato
            rotulo="Falta (capital)"
            testId="cajon-falta"
            tono={fila.pendienteCop > 0 ? 'danger' : 'muted'}
          >
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(fila.pendienteCop)}
            </span>
          </Dato>
          {/* 🔴 El interés SIEMPRE aparte. Una cuota ya pagada que todavía lo
              debe tiene «falta $0» y este renglón: sumarlos borraría la
              diferencia entre lo que se pactó y lo que costó no pagarlo. */}
          {interes > 0 ? (
            <Dato rotulo="Interés de mora" testId="cajon-interes" tono="danger">
              <span className="font-mono font-semibold tabular-nums">
                {formatCurrency(interes)}
              </span>
              <span className="block text-caption text-fg-muted">
                {t(CLAVE_DE_MORA.explicacion)}
              </span>
            </Dato>
          ) : null}
        </section>

        {/* 2 · De quién y de qué es. */}
        <section className="space-y-4 border-t border-border pt-5">
          <Dato rotulo="Inquilino">
            {nombre}
            {fila.documento ? (
              <span className="block text-caption text-fg-muted">CC {fila.documento}</span>
            ) : (
              /* Sin documento no hay a quién identificar, y eso explica por qué
                 abajo no se puede abrir su estado de cuenta. */
              <span className="block text-caption text-fg-muted">
                El contrato no trae su documento.
              </span>
            )}
          </Dato>
          <Dato rotulo="Inmueble">{fila.inmueble}</Dato>
          <Dato rotulo="Contrato" tono="muted">
            {fila.contrato ? rotuloDelContrato(fila).replace(/^ · /, '') : 'Sin número'}
          </Dato>
          <Dato rotulo="Vence" tono="muted">
            {fechaLocal(fila.vence, idioma)}
          </Dato>
          {fila.telefono ? (
            <Dato rotulo="Teléfono">
              {/* Marcar lo hace la persona, no la pantalla: desde acá no se
                  dispara ninguna llamada ni ningún mensaje. */}
              <a
                href={`tel:${fila.telefono}`}
                className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                data-testid="cajon-telefono"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {fila.telefono}
              </a>
            </Dato>
          ) : null}
        </section>
      </CajonCuerpo>

      <CajonPie
        ayuda={
          ref
            ? 'Esta cuota es un renglón del estado de cuenta del cliente: ahí están todos sus períodos y sus pagos.'
            : 'Sin cuenta en el portal ni documento en el contrato no se puede abrir su estado de cuenta: se identifica con el documento.'
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
