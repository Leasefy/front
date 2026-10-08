'use client'

/**
 * DiasDeGraciaDeLaPromesa — «Promesas de pago» en Configuración de cobranza
 * (07-10-2026, Nico: «configurable los días»; 7 por defecto).
 *
 * Cada mañana el agente revisa las promesas vencidas contra los recibos del
 * back: si entró el monto prometido hasta la fecha + estos días, la promesa
 * queda cumplida; si no, incumplida (un pago parcial también). Sólo se marca y
 * se muestra; no dispara nada.
 *
 * Ver: cualquiera con `cobranza:view`. Cambiar: `cobranza:approve` (dueña o
 * administrador), lo mismo que pide el micro. Sin la migración del micro se ve
 * con los 7 días y se dice por qué no se puede guardar.
 */

import { useEffect, useState } from 'react'
import { Handshake } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { useAjustesDeLaCobranza } from '@/lib/hooks/cobranza/use-ajustes-de-la-cobranza'
import {
  DIAS_DE_GRACIA_MAXIMOS,
  DIAS_DE_GRACIA_POR_DEFECTO,
  diasDeGraciaValidos,
} from '@/lib/cobranza/promesas-de-pago'

export function DiasDeGraciaDeLaPromesa({ puedeCambiar }: { puedeCambiar: boolean }) {
  const { data, fallo, refetch, guardar } = useAjustesDeLaCobranza()
  const [dias, setDias] = useState('')
  const [errorDeDias, setErrorDeDias] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (data) setDias(String(data.diasDeGraciaDeLaPromesa))
  }, [data])

  const leidos = diasDeGraciaValidos(dias)
  const sePuedeGuardar = Boolean(data?.disponible) && puedeCambiar

  const alGuardar = async () => {
    if (leidos === null) return
    setGuardando(true)
    setErrorDeDias(null)
    try {
      const n = (await guardar({ diasDeGraciaDeLaPromesa: leidos })).diasDeGraciaDeLaPromesa
      toast.success(
        n === 0
          ? 'Listo: una promesa se cuenta cumplida sólo si pagan hasta la fecha prometida.'
          : `Listo: una promesa se cuenta cumplida si pagan hasta ${n === 1 ? '1 día' : `${n} días`} después de la fecha prometida.`,
      )
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['diasDeGraciaDeLaPromesa'] as const,
        porDefecto: 'No se pudieron guardar los días de gracia.',
        accion: 'guardar los días de gracia de la promesa',
      })
      if (porCampo.diasDeGraciaDeLaPromesa) setErrorDeDias(porCampo.diasDeGraciaDeLaPromesa)
      if (sueltos.length > 0) toast.error(sueltos.join(' · '))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section
      data-testid="section-promesas"
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-labelledby="heading-promesas"
    >
      <div>
        <h2 id="heading-promesas" className="text-xl font-semibold text-foreground">
          Promesas de pago
        </h2>
        <p className="text-sm text-fg-muted mt-1 max-w-2xl">
          Cada mañana revisamos las promesas vencidas contra los pagos que entraron (consignación, pasarela o
          caja). Si pagaron el monto prometido a tiempo, la promesa queda cumplida; si no, o si pagaron sólo una
          parte, queda incumplida y se sigue cobrando lo que falta. Sólo se marca: no se manda nada a nadie.
        </p>
      </div>
      <div className="border-t border-border-faint" />

      <Presence as="p" show={Boolean(fallo) && !data} role="alert" className="text-sm text-danger" data-testid="promesas-ajustes-fallo">
        {mensajeParaLaPersona(fallo, { porDefecto: 'No se pudieron leer los días de gracia.' })}{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Reintentar
        </button>
      </Presence>

      <Presence as="p" show={data?.disponible === false} className="text-sm text-fg-muted" data-testid="promesas-sin-migracion">
        Todavía no se puede cambiar: falta una actualización de la base. Mientras tanto una promesa se cuenta
        cumplida si pagan hasta {DIAS_DE_GRACIA_POR_DEFECTO} días después de la fecha prometida.
      </Presence>

      {data && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-fg-muted" weight="duotone" aria-hidden="true" />
            <Label htmlFor="dias-de-gracia-de-la-promesa">Días de gracia después de la fecha prometida</Label>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Input
              id="dias-de-gracia-de-la-promesa"
              inputMode="numeric"
              className="w-24"
              value={dias}
              onChange={(e) => {
                setDias(e.target.value)
                setErrorDeDias(null)
              }}
              disabled={!sePuedeGuardar || guardando}
              aria-invalid={errorDeDias || (dias && leidos === null) ? true : undefined}
              aria-describedby="dias-de-gracia-de-la-promesa-error"
              data-testid="dias-de-gracia-de-la-promesa"
            />
            <span className="py-2 text-sm text-fg">días</span>
            <Presence show={sePuedeGuardar} direction="none" initial={false}>
              <Button
                hideArrow
                variant="outline"
                disabled={leidos === null || leidos === data.diasDeGraciaDeLaPromesa}
                isLoading={guardando}
                onClick={() => void alGuardar()}
                data-testid="guardar-dias-de-gracia"
              >
                Guardar
              </Button>
            </Presence>
          </div>
          <ErrorDelCampo
            id="dias-de-gracia-de-la-promesa-error"
            mensaje={
              errorDeDias ??
              (dias && leidos === null ? `Escribe un número de días entre 0 y ${DIAS_DE_GRACIA_MAXIMOS}.` : null)
            }
            pista={`Entre 0 y ${DIAS_DE_GRACIA_MAXIMOS}. Por defecto, ${DIAS_DE_GRACIA_POR_DEFECTO}. Cuenta para las promesas que venzan desde que lo guardes.`}
          />
          {!puedeCambiar && data.disponible && (
            <p className="text-caption text-fg-muted" data-testid="promesas-solo-administrador">
              Sólo la dueña o un administrador de la inmobiliaria lo cambia.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
