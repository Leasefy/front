'use client'

/**
 * PilotoAccionForm — lo que el cajón pregunta antes de ejecutar una acción.
 *
 * ── Por qué existe (Nico, 2026-08-31) ─────────────────────────────────────
 * «Si le doy tomar el caso y le doy tomar, no pasa nada después.»
 *
 * El Piloto solo sabía ejecutar acciones de UN CLIC. La regla era «si la
 * decisión exige inputs, no se dibuja botón», así que todo lo que pedía un
 * dato —resolver una escalación, rechazar una carta, elegir a qué aseguradora
 * se radica— no tenía camino: te dejaba el caso asignado y te mandaba a otra
 * pantalla a terminarlo. Tomar sin poder cerrar es peor que no poder tomar.
 *
 * Los endpoints ya existían. Lo que faltaba era que la acción pudiera DECIR
 * qué necesita (`campos` en el contrato) y que el cajón supiera preguntarlo.
 * Esto es eso.
 *
 * ── Dos reglas que se conservan ───────────────────────────────────────────
 * 1. El front NO inventa campos ni valores. Pinta exactamente lo que el micro
 *    declaró; las opciones son los enums que el endpoint valida. Si allá
 *    cambian, acá se ve un 400 en el acto — nunca una copia que se desfasa en
 *    silencio.
 * 2. Lo que sale del sistema se confirma. Cuando la acción trae
 *    `confirmacion`, esa frase se muestra pegada al botón: es el último lugar
 *    donde alguien puede parar un correo a una aseguradora.
 *
 * ── Campos que dependen de otro (02-10-2026, decisión de Nico) ────────────
 * «Resolver y cerrar» una escalación pide lo mismo que la cola humana: el
 * relato con su mínimo (`minLargo`, con la pista «Mínimo 80 caracteres») y,
 * con «Pasa a jurídico», una casilla (`tipo: 'confirmacion'`, `visibleSi`)
 * que hay que marcar. La casilla NUNCA viaja (el cuerpo de `resolve` es
 * `.strict()`), se desmarca al cambiar la categoría y entra y sale con Framer.
 * Un campo oculto no cuenta ni viaja; un `tipo` desconocido no se pinta.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WarningCircle } from '@phosphor-icons/react'
import {
  Callout,
  Checkbox,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  motionDistance,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { useI18n } from '@/lib/i18n'
import type { AccionCampo, InboxAccion } from '@/lib/api/piloto'
// QA-IA-95 (PI-16): la plata que escribe el micro («$1.950.000») se pinta con el espacio de la casa.
import { conLaPlataPegada } from '@/lib/plata/plata-pegada'

export interface PilotoAccionFormProps {
  accion: InboxAccion
  /** Los valores ya validados, listos para mezclarse con `accion.body`. */
  onEnviar: (valores: Record<string, unknown>) => void
  onCancelar: () => void
  enVuelo: boolean
  /**
   * Lo que el micro dijo de cada dato al ejecutar (un 400 con `campos`), por
   * `id` del campo. Va debajo de SU campo y el primero recibe el foco; se
   * borra en cuanto la persona lo corrige.
   */
  errores?: Partial<Record<string, string>>
}

/** Los tipos que esta versión sabe pintar; uno nuevo del micro no se pinta ni viaja. */
const TIPOS_CONOCIDOS: ReadonlySet<string> = new Set<AccionCampo['tipo']>(['opcion', 'multiple', 'texto', 'confirmacion'])

/** ¿Se ve el campo con estos valores? Sin `visibleSi`, siempre. */
function esVisible(campo: AccionCampo, valores: Record<string, unknown>): boolean {
  return !campo.visibleSi || valores[campo.visibleSi.campo] === campo.visibleSi.valor
}

/**
 * Un campo requerido está completo cuando tiene algo que enviar (un texto con
 * su mínimo, si lo declara); una casilla, cuando está marcada.
 */
function completo(campo: AccionCampo, valor: unknown): boolean {
  if (!campo.requerido) return true
  if (campo.tipo === 'confirmacion') return valor === true
  if (campo.tipo === 'multiple') return Array.isArray(valor) && valor.length > 0
  const minimo = campo.tipo === 'texto' && typeof campo.minLargo === 'number' ? Math.max(1, campo.minLargo) : 1
  return typeof valor === 'string' && valor.trim().length >= minimo
}

/** La ayuda gris bajo un texto con mínimo, como el modal de escalaciones. */
function pistaDelMinimo(campo: AccionCampo): string | undefined {
  if (campo.tipo !== 'texto' || typeof campo.minLargo !== 'number' || campo.minLargo <= 1) return undefined
  return `Mínimo ${campo.minLargo.toLocaleString('es-CO')} caracteres`
}

export function PilotoAccionForm({
  accion,
  onEnviar,
  onCancelar,
  enVuelo,
  errores,
}: PilotoAccionFormProps) {
  const { t } = useI18n()
  const reducido = usePrefersReducedMotion()
  // `?? []` crea un array nuevo en cada render y ensucia las deps del memo.
  const campos = useMemo(
    () => (accion.campos ?? []).filter((c) => TIPOS_CONOCIDOS.has(c.tipo)),
    [accion.campos],
  )
  const [valores, setValores] = useState<Record<string, unknown>>({})
  /** Los que se ven: un campo con `visibleSi` sólo con su opción elegida. */
  const mostrados = useMemo(() => campos.filter((c) => esVisible(c, valores)), [campos, valores])
  const formRef = useRef<HTMLFormElement>(null)

  // Los errores del servidor que siguen a la vista: llegan por props y cada
  // uno se va cuando la persona toca su campo.
  const [visibles, setVisibles] = useState<Partial<Record<string, string>>>({})
  useEffect(() => {
    setVisibles(errores ?? {})
    const primero = campos.find((c) => errores?.[c.id])
    if (!primero) return
    formRef.current
      ?.querySelector<HTMLElement>(
        [`textarea`, `button`, `input`].map((tag) => `[data-campo="${primero.id}"] ${tag}`).join(', '),
      )
      ?.focus()
  }, [errores, campos])

  const faltantes = useMemo(
    () => mostrados.filter((c) => !completo(c, valores[c.id])),
    [mostrados, valores],
  )
  const listo = faltantes.length === 0

  const set = (id: string, v: unknown) => {
    setValores((prev) => {
      const siguientes = { ...prev, [id]: v }
      // Cambiar la categoría desmarca la casilla que dependía de ella.
      if (prev[id] !== v) {
        for (const c of campos) {
          if (c.tipo === 'confirmacion' && c.visibleSi?.campo === id) delete siguientes[c.id]
        }
      }
      return siguientes
    })
    setVisibles((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev))
  }

  /** Entra bajando un poco y sale subiendo; con movimiento reducido, sólo el fundido. */
  const desplazamiento = reducido ? 0 : -motionDistance.xs
  const animacion = {
    initial: { opacity: 0, y: desplazamiento },
    animate: { opacity: 1, y: 0, transition: { duration: motionDuration.base, ease: motionEase.enter } },
    exit: { opacity: 0, y: desplazamiento, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
  }

  return (
    <form
      ref={formRef}
      className="space-y-4"
      data-testid="piloto-cajon-formulario"
      onSubmit={(e) => {
        e.preventDefault()
        if (!listo || enVuelo) return
        // Solo se mandan los campos con valor: un opcional vacío no viaja
        // como cadena vacía (el endpoint valida `.min(1)` y daría 400). Una
        // casilla de confirmación y un campo oculto tampoco viajan.
        const limpio = Object.fromEntries(
          mostrados
            .filter((c) => c.tipo !== 'confirmacion')
            .map((c) => [c.id, valores[c.id]] as const)
            .filter(([, v]) =>
              Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim().length > 0,
            ),
        )
        onEnviar(limpio)
      }}
    >
      <AnimatePresence initial={false}>
        {mostrados.map((campo) => {
          const id = `accion-${campo.id}`
          const errorId = `${id}-error`
          const conError = Boolean(visibles[campo.id])
          const pista = pistaDelMinimo(campo)
          // `ErrorDelCampo` le pone a la pista el id `${errorId}-pista`.
          const describedBy = [
            campo.tipo === 'confirmacion' && campo.aviso ? `${id}-aviso` : null,
            pista ? `${errorId}-pista` : null,
            conError ? errorId : null,
          ]
            .filter(Boolean)
            .join(' ')
          const describe = {
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
            ...(conError ? { 'aria-invalid': true as const } : {}),
          }

          if (campo.tipo === 'confirmacion') {
            // Como el aviso del modal de escalaciones: la franja roja, el aviso y la casilla.
            return (
              <motion.fieldset key={campo.id} data-campo={campo.id} {...animacion}>
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3">
                  <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                  <div className="flex-1 space-y-2">
                    {campo.aviso && (
                      <p id={`${id}-aviso`} className="text-caption font-semibold text-danger">
                        {campo.aviso}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={valores[campo.id] === true}
                        onCheckedChange={(c) => set(campo.id, c === true)}
                        aria-required={campo.requerido || undefined}
                        data-testid={`piloto-confirmacion-${campo.id}`}
                        {...describe}
                      />
                      <label htmlFor={id} className="cursor-pointer text-caption text-danger">
                        {campo.label}
                      </label>
                    </div>
                    <ErrorDelCampo id={errorId} mensaje={visibles[campo.id]} />
                  </div>
                </div>
              </motion.fieldset>
            )
          }

          return (
            <motion.fieldset key={campo.id} className="space-y-2" data-campo={campo.id} {...animacion}>
              <Label htmlFor={id} {...(campo.requerido ? { required: true } : {})}>
                {campo.label}
              </Label>

              {campo.tipo === 'opcion' && (
                <RadioGroup
                  value={(valores[campo.id] as string) ?? ''}
                  onValueChange={(v) => set(campo.id, v)}
                  {...describe}
                >
                  {(campo.opciones ?? []).map((o) => (
                    <label
                      key={o.valor}
                      className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
                    >
                      <RadioGroupItem value={o.valor} id={`${id}-${o.valor}`} />
                      <span>{conLaPlataPegada(o.label)}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {campo.tipo === 'multiple' && (
                <div className="flex flex-col gap-2" role="group" aria-label={campo.label} {...describe}>
                  {(campo.opciones ?? []).map((o) => {
                    const sel = (valores[campo.id] as string[] | undefined) ?? []
                    return (
                      <label
                        key={o.valor}
                        className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
                      >
                        <Checkbox
                          checked={sel.includes(o.valor)}
                          onCheckedChange={(c) =>
                            set(
                              campo.id,
                              c === true
                                ? [...sel, o.valor]
                                : sel.filter((x) => x !== o.valor),
                            )
                          }
                        />
                        <span>{conLaPlataPegada(o.label)}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {campo.tipo === 'texto' && (
                <Textarea
                  id={id}
                  autoGrow
                  rows={3}
                  {...(campo.maxLargo ? { maxLength: campo.maxLargo } : {})}
                  {...(campo.placeholder ? { placeholder: campo.placeholder } : {})}
                  value={(valores[campo.id] as string) ?? ''}
                  onChange={(e) => set(campo.id, e.target.value)}
                  {...describe}
                />
              )}

              <ErrorDelCampo id={errorId} mensaje={visibles[campo.id]} pista={pista} />
            </motion.fieldset>
          )
        })}
      </AnimatePresence>

      {/* El último lugar donde se puede parar algo que sale del sistema. */}
      {accion.confirmacion && <Callout>{accion.confirmacion}</Callout>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" size="sm" hideArrow variant="ghost" onClick={onCancelar}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          size="sm"
          hideArrow
          variant={accion.tono === 'peligro' ? 'destructive' : 'default'}
          isLoading={enVuelo}
          disabled={!listo || enVuelo}
          data-testid="piloto-cajon-formulario-enviar"
        >
          {conLaPlataPegada(accion.label)}
        </Button>
      </div>
    </form>
  )
}
