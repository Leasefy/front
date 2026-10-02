'use client'

/**
 * El formulario de una acción que DECLARA su cuerpo (02-10-2026).
 *
 * «Resolver» desde la cola humana mandaba `{ reason }` y el micro pide
 * `{ category, resolution_text }`: 400 siempre. Ahora el micro declara los
 * campos de la acción (`WorkItemAction.campos`) y esto los pinta: una lista
 * para cada `opcion`, un texto con su contador para cada `texto`. Valida antes
 * de mandar con los mismos topes que el micro (`campos-de-la-accion.ts`) y el
 * error va BAJO su campo, con el foco en el primero. Un 400 del micro con
 * `campos` también va a cada campo; lo demás (un 5xx con su referencia, un
 * 409, la red) va al toast por el traductor.
 *
 * Lo usan la cola (`ColaHumana`) y el detalle del caso (`AccionSugerida`). Una
 * acción sin `campos` no pasa por acá: sigue con el motivo de siempre.
 *
 * Una `confirmacion` (02-10-2026, «Pasa a jurídico») es una casilla con su
 * aviso, como la del modal de escalaciones: obligatoria mientras se vea, se
 * reinicia al cambiar la categoría y NUNCA viaja en el cuerpo. Un campo con
 * `visibleSi` entra y sale con su opción; oculto, no se valida ni viaja.
 *
 * Entra con Framer y los tokens de movimiento de Cadence (sólo `opacity` y
 * `transform`; con movimiento reducido, sólo el fundido).
 */

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, WarningCircle, XCircle } from '@phosphor-icons/react'
import {
  motionDistance,
  motionDuration,
  motionEase,
  usePrefersReducedMotion,
} from '@leasefy/cadence'

import type { CampoDeLaAccion, WorkItemAction } from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { textosDelFallo } from '@/components/inmobiliaria/piloto/fallo-de-la-accion'
import { cn } from '@/lib/utils'
import {
  CONFIRMADO,
  cambiarValor,
  camposDeLaAccion,
  camposVisibles,
  cuerpoDeLaAccion,
  errorDelCampo,
  erroresDelCliente,
  largoDelTexto,
  pistaDelCampo,
  valoresIniciales,
  type ErroresDeLaAccion,
  type ValoresDeLaAccion,
} from './campos-de-la-accion'

const WORKSPACE_NS = 'inmobiliaria.ai.workspace'

export interface FormularioDeLaAccionProps {
  /** Prefijo único de los ids: cada campo es `${idBase}-${nombre}`. */
  idBase: string
  action: WorkItemAction
  /** Manda el cuerpo armado con las claves del micro. */
  onEnviar: (cuerpo: Record<string, string>) => Promise<{ ok: boolean; fallo?: unknown }>
  onCancelar: () => void
  /** Otra acción del mismo caso está en vuelo. */
  deshabilitado?: boolean
  className?: string
}

export function FormularioDeLaAccion({
  idBase,
  action,
  onEnviar,
  onCancelar,
  deshabilitado,
  className,
}: FormularioDeLaAccionProps) {
  const { t } = useI18n()
  const reducido = usePrefersReducedMotion()
  const campos = useMemo(() => camposDeLaAccion(action), [action])
  const [valores, setValores] = useState<ValoresDeLaAccion>(() => valoresIniciales(campos))
  /** Lo que dijo el micro de cada campo (un 400 con `campos`). */
  const [delServidor, setDelServidor] = useState<ErroresDeLaAccion>({})
  /** Después del primer intento, los errores del cliente se ven mientras se corrige. */
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enVuelo = useRef(false)

  const idDe = (nombre: string) => `${idBase}-${nombre}`

  function enfocar(nombre: string | undefined) {
    if (!nombre) return
    // El campo puede estar recién pintado (el error lo cambia): al siguiente cuadro.
    requestAnimationFrame(() => document.getElementById(idDe(nombre))?.focus())
  }

  function cambiar(nombre: string, valor: string) {
    // Cambiar la categoría desmarca la casilla que dependía de ella.
    setValores((v) => cambiarValor(campos, v, nombre, valor))
    setDelServidor(({ [nombre]: _, ...resto }) => resto)
  }

  /** El error que se ve bajo el campo. El máximo se avisa apenas se pasa. */
  function errorVisible(campo: CampoDeLaAccion): string | undefined {
    const delCliente = errorDelCampo(campo, valores[campo.nombre])
    const pasado =
      campo.tipo === 'texto' &&
      typeof campo.maximo === 'number' &&
      largoDelTexto(valores[campo.nombre]) > campo.maximo
    return (intentado || pasado ? delCliente : undefined) ?? delServidor[campo.nombre]
  }

  async function enviar(ev?: React.FormEvent) {
    ev?.preventDefault()
    if (enVuelo.current || deshabilitado) return
    setIntentado(true)
    const { orden } = erroresDelCliente(campos, valores)
    if (orden.length > 0) {
      enfocar(orden[0])
      return
    }
    enVuelo.current = true
    setEnviando(true)
    let res: { ok: boolean; fallo?: unknown }
    try {
      res = await onEnviar(cuerpoDeLaAccion(campos, valores))
    } finally {
      enVuelo.current = false
      setEnviando(false)
    }
    if (res.ok) return
    // El error de cada campo, a su campo; lo demás por el traductor, al toast.
    const reparto = repartirErroresDelServidor<string>(res.fallo, {
      campos: campos.map((c) => c.nombre),
      ...textosDelFallo(action.label),
    })
    setDelServidor(reparto.porCampo)
    enfocar(reparto.orden[0])
    if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
  }

  const ocupado = enviando || Boolean(deshabilitado)
  const visibles = camposVisibles(campos, valores)
  /** Entra bajando un poco y sale subiendo; con movimiento reducido, sólo el fundido. */
  const desplazamiento = reducido ? 0 : -motionDistance.xs

  return (
    <motion.form
      noValidate
      onSubmit={(ev) => void enviar(ev)}
      className={cn('space-y-3', className)}
      data-testid="formulario-de-la-accion"
      data-accion={action.id}
      initial={{ opacity: 0, y: reducido ? 0 : motionDistance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.base, ease: motionEase.enter }}
    >
      <AnimatePresence initial={false}>
        {visibles.map((campo) => {
          const id = idDe(campo.nombre)
          const error = errorVisible(campo)
          const pista = pistaDelCampo(campo)
          const describedBy = [
            campo.tipo === 'confirmacion' && campo.aviso ? `${id}-aviso` : null,
            // `ErrorDelCampo` le pone a la pista el id `${idDelError}-pista`.
            pista ? `${id}-error-pista` : null,
            error ? `${id}-error` : null,
          ]
            .filter(Boolean)
            .join(' ')
          const describe = {
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
            ...(error ? { 'aria-invalid': true as const } : {}),
          }
          const animacion = {
            initial: { opacity: 0, y: desplazamiento },
            animate: { opacity: 1, y: 0, transition: { duration: motionDuration.base, ease: motionEase.enter } },
            exit: { opacity: 0, y: desplazamiento, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
          }

          if (campo.tipo === 'confirmacion') {
            // Como el aviso del modal de escalaciones: la franja roja, el aviso y la casilla.
            return (
              <motion.div key={campo.nombre} data-campo={campo.nombre} {...animacion}>
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
                        checked={valores[campo.nombre] === CONFIRMADO}
                        onCheckedChange={(c) => cambiar(campo.nombre, c === true ? CONFIRMADO : '')}
                        disabled={ocupado}
                        aria-required={campo.obligatorio || undefined}
                        data-testid={`confirmacion-${campo.nombre}`}
                        {...describe}
                      />
                      <label htmlFor={id} className="cursor-pointer text-caption text-danger">
                        {campo.etiqueta}
                        {campo.obligatorio && (
                          <span className="ml-0.5" aria-hidden="true">
                            *
                          </span>
                        )}
                      </label>
                    </div>
                    <ErrorDelCampo id={`${id}-error`} mensaje={error} className="mt-0" />
                  </div>
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div key={campo.nombre} className="space-y-1.5" data-campo={campo.nombre} {...animacion}>
              <label htmlFor={id} className="block text-[11px] font-medium text-fg-muted">
                {campo.etiqueta}
                {campo.obligatorio && (
                  <span className="ml-0.5 text-danger" aria-hidden="true">
                    *
                  </span>
                )}
              </label>

              {campo.tipo === 'opcion' ? (
                <Select
                  value={valores[campo.nombre] || undefined}
                  onValueChange={(v) => cambiar(campo.nombre, v)}
                  disabled={ocupado}
                >
                  <SelectTrigger id={id} className="w-full max-w-md" {...describe}>
                    <SelectValue placeholder="Elige una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    {(campo.opciones ?? []).map((o) => (
                      <SelectItem key={o.valor} value={o.valor}>
                        {o.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Textarea
                  id={id}
                  value={valores[campo.nombre] ?? ''}
                  onChange={(e) => cambiar(campo.nombre, e.target.value)}
                  rows={3}
                  disabled={enviando}
                  className="w-full max-w-2xl resize-none text-caption"
                  {...describe}
                />
              )}

              <div className="flex items-start justify-between gap-3">
                {/* Con mínimo, la pista («Mínimo 80 caracteres») hasta que haya un error, como el modal. */}
                <ErrorDelCampo id={`${id}-error`} mensaje={error} pista={pista} className="mt-0" />
                {campo.tipo === 'texto' && typeof campo.maximo === 'number' && (
                  <span
                    className={cn(
                      'ml-auto shrink-0 font-mono text-[11px] tabular-nums',
                      largoDelTexto(valores[campo.nombre]) > campo.maximo ? 'text-danger' : 'text-fg-subtle',
                    )}
                    data-testid={`contador-${campo.nombre}`}
                  >
                    {largoDelTexto(valores[campo.nombre]).toLocaleString('es-CO')} /{' '}
                    {campo.maximo.toLocaleString('es-CO')}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant={action.kind === 'danger' ? 'destructive' : 'default'}
          size="sm"
          hideArrow
          disabled={ocupado}
          isLoading={enviando}
          data-testid="formulario-de-la-accion-enviar"
        >
          {action.kind === 'danger' ? (
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {action.label}
        </Button>
        <Button type="button" variant="ghost" size="sm" hideArrow disabled={enviando} onClick={onCancelar}>
          {t(`${WORKSPACE_NS}.acciones.cancelar`)}
        </Button>
      </div>
    </motion.form>
  )
}
