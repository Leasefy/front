'use client'

/**
 * AcuerdosGeneralesCard — el acuerdo que el agente puede cerrar SOLO, editable
 * DESDE Acuerdos de pago.
 *
 * Un acuerdo puntual se arma para una persona. El acuerdo GENERAL es la regla:
 * «si el deudor cabe en estas condiciones, tómalo y no me preguntes». Vive en
 * la política de la agencia (`GET/PATCH /api/agency/:id/policy`) y el agente ya
 * la lee en cada negociación.
 *
 * Antes esta tarjeta era de sólo lectura y mandaba a Configuración a editarla.
 * Eso obligaba a salir de Acuerdos para armar un acuerdo — el marco general de
 * los acuerdos no es un ajuste del sistema, es el acuerdo más importante que
 * tiene la inmobiliaria. Ahora se edita acá, plegado hasta que hace falta.
 *
 * El resumen en una frase y los avisos de incoherencia viven en
 * `@/lib/cobranza/acuerdo-general` (con tests): la regla de cuándo el acuerdo
 * se contradice no es de presentación.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CaretDown, FloppyDisk, Robot } from '@phosphor-icons/react'
import { Card } from '@leasefy/cadence'

import { Button, Input, Label, Checkbox, Switch, Spinner } from '@/components/ui'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAgencyPolicy } from '@/lib/hooks/cobranza/use-agency-policy'
import { resumenAcuerdo, avisosDelAcuerdo } from '@/lib/cobranza/acuerdo-general'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  erroresDeLaPolitica,
  type CampoDeLaPolitica,
} from '@/lib/hooks/cobranza/limites-de-cobranza'

const PLAZOS = [1, 3, 6, 9, 12, 18, 24, 36]

/** El `id` del control de cada campo; su error vive en `${id}-error`. */
const ID_DEL_CAMPO: Record<CampoDeLaPolitica, string> = {
  maxDiscountPct: 'acuerdo-descuento',
  maxPlanMonths: 'acuerdo-plazo-max',
  minPaymentCop: 'acuerdo-pago-min',
  negotiationMaxAttempts: 'acuerdo-intentos',
  autoEscalateAfterDays: 'acuerdo-dias-escalar',
}
const CAMPOS = Object.keys(ID_DEL_CAMPO) as CampoDeLaPolitica[]

function enfocarElPrimero(errores: Partial<Record<CampoDeLaPolitica, string>>) {
  const primero = CAMPOS.find((c) => errores[c])
  if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus()
}

interface Borrador {
  maxDiscountPct: number
  maxPlanMonths: number
  minPaymentCop: number
  negotiationMaxAttempts: number
  allowedPaymentPlans: number[]
  allowHardshipPath: boolean
  autoEscalateAfterDays: number
}

export function AcuerdosGeneralesCard() {
  const { canAccess } = usePermissionsContext()
  const canEdit = canAccess('cobranza', 'configure')
  const { data, isLoading, error, notProvisioned, patchPolicy } = useAgencyPolicy()

  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const guardadoRef = useRef<Borrador | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  /** El error de cada campo: el del cliente (topes del micro) o el que mandó el micro en `campos`. */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaPolitica, string>>>({})

  useEffect(() => {
    if (!data) return
    const b: Borrador = {
      maxDiscountPct: data.maxDiscountPct,
      maxPlanMonths: data.maxPlanMonths,
      minPaymentCop: data.minPaymentCop,
      negotiationMaxAttempts: data.negotiationMaxAttempts,
      allowedPaymentPlans: data.allowedPaymentPlans ?? [],
      allowHardshipPath: data.allowHardshipPath,
      autoEscalateAfterDays: data.autoEscalateAfterDays,
    }
    setBorrador(b)
    guardadoRef.current = b
  }, [data])

  const set = useCallback(<K extends keyof Borrador>(k: K, v: Borrador[K]) => {
    setBorrador((prev) => (prev ? { ...prev, [k]: v } : prev))
    setErrores((prev) => {
      if (!(k in prev)) return prev
      const siguiente = { ...prev }
      delete siguiente[k as CampoDeLaPolitica]
      return siguiente
    })
  }, [])

  const togglePlazo = useCallback((meses: number, marcado: boolean) => {
    setBorrador((prev) => {
      if (!prev) return prev
      const next = marcado
        ? [...prev.allowedPaymentPlans, meses].sort((a, b) => a - b)
        : prev.allowedPaymentPlans.filter((m) => m !== meses)
      return { ...prev, allowedPaymentPlans: next }
    })
  }, [])

  const sucio =
    !!borrador &&
    !!guardadoRef.current &&
    JSON.stringify(borrador) !== JSON.stringify(guardadoRef.current)

  const guardar = useCallback(async () => {
    if (!borrador || !guardadoRef.current) return
    const antes = guardadoRef.current
    const patch: Record<string, unknown> = {}
    ;(Object.keys(borrador) as (keyof Borrador)[]).forEach((k) => {
      if (JSON.stringify(antes[k]) !== JSON.stringify(borrador[k])) patch[k] = borrador[k]
    })
    if (Object.keys(patch).length === 0) return
    setErrorGuardar(null)
    // Lo que el micro rechazaría se ataja acá, debajo de su campo.
    const delCliente = erroresDeLaPolitica(patch as Partial<Record<CampoDeLaPolitica, number>>)
    if (Object.keys(delCliente).length > 0) {
      setErrores(delCliente)
      enfocarElPrimero(delCliente)
      return
    }
    setErrores({})
    setGuardando(true)
    try {
      await patchPolicy(patch)
      guardadoRef.current = borrador
    } catch (e) {
      // Un 400 con `campos` va a su campo; abajo, sólo lo suelto (los plazos, un 5xx, la red).
      const reparto = repartirErroresDelServidor<CampoDeLaPolitica>(e, {
        campos: CAMPOS,
        porDefecto: 'No pudimos guardar el acuerdo general.',
        accion: 'guardar el acuerdo general',
      })
      setErrores(reparto.porCampo)
      enfocarElPrimero(reparto.porCampo)
      setErrorGuardar(reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : null)
    } finally {
      setGuardando(false)
    }
  }, [borrador, patchPolicy])

  // Sin política todavía no hay marco general que mostrar; una tarjeta con
  // ceros se leería como «el agente no puede cerrar nada», que no es lo mismo.
  if (isLoading || error || notProvisioned || !data || !borrador) return null

  const avisos = avisosDelAcuerdo(borrador)

  /** Lo que lleva cada control para leer su error. */
  const aria = (campo: CampoDeLaPolitica) => ({
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${ID_DEL_CAMPO[campo]}-error` : undefined,
  })

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
            <Robot className="w-5 h-5 text-fg-muted" weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">Límites del agente</h2>
            <p className="text-xs text-fg-muted max-w-xl leading-relaxed">
              El máximo que el agente puede ofrecer, pase lo que pase. Ningún
              acuerdo general se sale de acá: si uno dice 50% y este límite dice
              20%, el deudor recibe 20%.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          className="shrink-0"
          aria-expanded={abierto}
          aria-controls="acuerdo-general-form"
          data-testid="acuerdo-general-toggle"
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? 'Listo' : canEdit ? 'Ajustar' : 'Ver condiciones'}
          <CaretDown
            className={`w-3.5 h-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* El acuerdo dicho en una frase — lo que se está editando, leído de
          corrido. Es lo que permite revisar de un vistazo si dice lo que uno cree. */}
      <p
        data-testid="acuerdo-resumen"
        className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-fg"
      >
        {resumenAcuerdo(borrador)}
      </p>

      {avisos.map((aviso) => (
        <p
          key={aviso}
          data-testid="acuerdo-aviso"
          className="mt-2 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          {aviso}
        </p>
      ))}

      {abierto && (
        <div id="acuerdo-general-form" className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Plazos que puede aceptar</Label>
            <p className="text-xs text-fg-muted">
              Si el deudor pide uno de estos, el agente lo cierra. Cualquier otro
              número de cuotas te lo escala.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLAZOS.map((meses) => (
                <div key={meses} className="flex items-center gap-2 min-h-[44px]">
                  <Checkbox
                    id={`acuerdo-plazo-${meses}`}
                    data-testid={`acuerdo-plazo-${meses}`}
                    checked={borrador.allowedPaymentPlans.includes(meses)}
                    disabled={!canEdit}
                    onCheckedChange={(c) => togglePlazo(meses, !!c)}
                  />
                  <Label htmlFor={`acuerdo-plazo-${meses}`} className="text-sm cursor-pointer">
                    {meses} {meses === 1 ? 'mes' : 'meses'}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="acuerdo-descuento" className="text-sm">
                Descuento máximo
              </Label>
              {/* Se escribe en %, no en fracción: la política guarda 0 a 0.5 y
                  nadie piensa un descuento en centésimos. */}
              <div className="relative">
                <Input
                  id="acuerdo-descuento"
                  data-testid="acuerdo-descuento"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  className="min-h-[44px] pr-8"
                  disabled={!canEdit}
                  value={Math.round(borrador.maxDiscountPct * 100)}
                  onChange={(e) =>
                    set('maxDiscountPct', Math.min(50, Math.max(0, Number(e.target.value))) / 100)
                  }
                  {...aria('maxDiscountPct')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
                  %
                </span>
              </div>
              <ErrorDelCampo
                id="acuerdo-descuento-error"
                mensaje={errores.maxDiscountPct}
                pista="Sobre el saldo. Máximo 50%."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="acuerdo-plazo-max" className="text-sm">
                Plazo máximo del cronograma (meses)
              </Label>
              <Input
                id="acuerdo-plazo-max"
                data-testid="acuerdo-plazo-max"
                type="number"
                min={1}
                max={24}
                className="min-h-[44px]"
                disabled={!canEdit}
                value={borrador.maxPlanMonths}
                onChange={(e) => set('maxPlanMonths', Number(e.target.value))}
                {...aria('maxPlanMonths')}
              />
              <ErrorDelCampo
                id="acuerdo-plazo-max-error"
                mensaje={errores.maxPlanMonths}
                pista="Tope con el que el agente arma las cuotas. Tiene que llegar al plazo más largo que marcaste arriba."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="acuerdo-pago-min" className="text-sm">
                Pago mínimo
              </Label>
              <Input
                id="acuerdo-pago-min"
                data-testid="acuerdo-pago-min"
                type="number"
                min={0}
                step={10000}
                className="min-h-[44px]"
                disabled={!canEdit}
                value={borrador.minPaymentCop}
                onChange={(e) => set('minPaymentCop', Number(e.target.value))}
                {...aria('minPaymentCop')}
              />
              <ErrorDelCampo
                id="acuerdo-pago-min-error"
                mensaje={errores.minPaymentCop}
                pista={
                  borrador.minPaymentCop > 0
                    ? 'No acepta abonos por debajo de ese monto.'
                    : 'En 0 acepta cualquier abono, por chico que sea.'
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="acuerdo-intentos" className="text-sm">
                Intentos de negociación
              </Label>
              <Input
                id="acuerdo-intentos"
                data-testid="acuerdo-intentos"
                type="number"
                min={1}
                max={10}
                className="min-h-[44px]"
                disabled={!canEdit}
                value={borrador.negotiationMaxAttempts}
                onChange={(e) => set('negotiationMaxAttempts', Number(e.target.value))}
                {...aria('negotiationMaxAttempts')}
              />
              <ErrorDelCampo
                id="acuerdo-intentos-error"
                mensaje={errores.negotiationMaxAttempts}
                pista="Cuántas contraofertas hace antes de escalarte el caso."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="acuerdo-dias-escalar" className="text-sm">
                Días de mora antes de escalar
              </Label>
              <Input
                id="acuerdo-dias-escalar"
                data-testid="acuerdo-dias-escalar"
                type="number"
                min={1}
                max={365}
                className="min-h-[44px]"
                disabled={!canEdit}
                value={borrador.autoEscalateAfterDays}
                onChange={(e) => set('autoEscalateAfterDays', Number(e.target.value))}
                {...aria('autoEscalateAfterDays')}
              />
              <ErrorDelCampo
                id="acuerdo-dias-escalar-error"
                mensaje={errores.autoEscalateAfterDays}
                pista="Pasado ese punto el caso deja de negociarse solo y pasa a cobro humano."
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <div>
              <Label htmlFor="acuerdo-hardship" className="text-sm cursor-pointer">
                Permitir ruta de dificultad económica
              </Label>
              <p className="text-xs text-fg-muted mt-0.5">
                Habilita condiciones más blandas cuando el deudor declara una
                situación puntual (desempleo, salud).
              </p>
            </div>
            <Switch
              id="acuerdo-hardship"
              data-testid="acuerdo-hardship"
              checked={borrador.allowHardshipPath}
              disabled={!canEdit}
              onCheckedChange={(c) => set('allowHardshipPath', c)}
              className="shrink-0 mt-0.5"
            />
          </div>

          {errorGuardar && (
            <p role="alert" className="text-sm text-danger" data-testid="acuerdo-general-error">
              {errorGuardar}
            </p>
          )}

          {canEdit && (
            <div className="flex items-center justify-end gap-2">
              {sucio && (
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  className="min-h-[44px]"
                  onClick={() => guardadoRef.current && setBorrador(guardadoRef.current)}
                  data-testid="acuerdo-general-descartar"
                >
                  Descartar
                </Button>
              )}
              <Button
                size="sm"
                className="min-h-[44px]"
                data-testid="acuerdo-general-guardar"
                disabled={!sucio || guardando}
                onClick={() => void guardar()}
              >
                {guardando ? (
                  <Spinner size="sm" variant="current" className="mr-1" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                Guardar acuerdo general
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
