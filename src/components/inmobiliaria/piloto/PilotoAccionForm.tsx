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
 */

import { useMemo, useState } from 'react'
import { Callout, Checkbox, Label, RadioGroup, RadioGroupItem, Textarea } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import type { AccionCampo, InboxAccion } from '@/lib/api/piloto'

export interface PilotoAccionFormProps {
  accion: InboxAccion
  /** Los valores ya validados, listos para mezclarse con `accion.body`. */
  onEnviar: (valores: Record<string, unknown>) => void
  onCancelar: () => void
  enVuelo: boolean
}

/** Un campo requerido está completo cuando tiene algo que enviar. */
function completo(campo: AccionCampo, valor: unknown): boolean {
  if (!campo.requerido) return true
  if (campo.tipo === 'multiple') return Array.isArray(valor) && valor.length > 0
  return typeof valor === 'string' && valor.trim().length > 0
}

export function PilotoAccionForm({
  accion,
  onEnviar,
  onCancelar,
  enVuelo,
}: PilotoAccionFormProps) {
  const { t } = useI18n()
  // `?? []` crea un array nuevo en cada render y ensucia las deps del memo.
  const campos = useMemo(() => accion.campos ?? [], [accion.campos])
  const [valores, setValores] = useState<Record<string, unknown>>({})

  const faltantes = useMemo(
    () => campos.filter((c) => !completo(c, valores[c.id])),
    [campos, valores],
  )
  const listo = faltantes.length === 0

  const set = (id: string, v: unknown) => setValores((prev) => ({ ...prev, [id]: v }))

  return (
    <form
      className="space-y-4"
      data-testid="piloto-cajon-formulario"
      onSubmit={(e) => {
        e.preventDefault()
        if (!listo || enVuelo) return
        // Solo se mandan los campos con valor: un opcional vacío no viaja
        // como cadena vacía (el endpoint valida `.min(1)` y daría 400).
        const limpio = Object.fromEntries(
          Object.entries(valores).filter(([, v]) =>
            Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim().length > 0,
          ),
        )
        onEnviar(limpio)
      }}
    >
      {campos.map((campo) => {
        const id = `accion-${campo.id}`
        return (
          <fieldset key={campo.id} className="space-y-2">
            <Label htmlFor={id} {...(campo.requerido ? { required: true } : {})}>
              {campo.label}
            </Label>

            {campo.tipo === 'opcion' && (
              <RadioGroup
                value={(valores[campo.id] as string) ?? ''}
                onValueChange={(v) => set(campo.id, v)}
              >
                {(campo.opciones ?? []).map((o) => (
                  <label
                    key={o.valor}
                    className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
                  >
                    <RadioGroupItem value={o.valor} id={`${id}-${o.valor}`} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {campo.tipo === 'multiple' && (
              <div className="flex flex-col gap-2">
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
                      <span>{o.label}</span>
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
              />
            )}
          </fieldset>
        )
      })}

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
          {accion.label}
        </Button>
      </div>
    </form>
  )
}
