'use client'

/**
 * FormasDeOfrecerElAcuerdo — el interruptor de la inmobiliaria para el A/B de
 * cómo Laura ofrece el acuerdo, en Configuración de cobranza (07-10-2026, Nico:
 * «corren en todas por defecto; la que no quiera lo apaga»).
 *
 * Prendido (por defecto): mientras Leasefy tiene una prueba corriendo, la mitad
 * de los deudores, al azar, recibe el acuerdo como hoy y la otra mitad de la
 * forma nueva, nunca por encima de lo que autoriza la inmobiliaria. Apagado: el
 * micro no la mete a ningún experimento (`listRunningExperiments`) y desde la
 * próxima llamada o mensaje Laura ofrece como hoy. La forma que Leasefy apruebe
 * como ganadora aplica igual a todas (`estrategias_adoptadas`): se dice.
 *
 * Mismo patrón que el aviso diario por WhatsApp de esta página: el interruptor
 * cambia un borrador y «Guardar» aparece sólo si cambió. Ver: `cobranza:view`.
 * Cambiar: `cobranza:approve`, lo mismo que pide el micro. Sin la migración del
 * micro se ve prendido y se dice por qué no se puede cambiar.
 */

import { useEffect, useState } from 'react'
import { Flask } from '@phosphor-icons/react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useAjustesDeLaCobranza } from '@/lib/hooks/cobranza/use-ajustes-de-la-cobranza'

export function FormasDeOfrecerElAcuerdo({ puedeCambiar }: { puedeCambiar: boolean }) {
  const { data, fallo, refetch, guardar } = useAjustesDeLaCobranza()
  const [prendido, setPrendido] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (data) setPrendido(data.experimentosPrendidos)
  }, [data])

  const sePuedeGuardar = Boolean(data?.disponible) && puedeCambiar
  const cambio = data !== null && prendido !== data.experimentosPrendidos

  const alGuardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const ahora = (await guardar({ experimentosPrendidos: prendido })).experimentosPrendidos
      toast.success(
        ahora
          ? 'Listo: Laura entra a las pruebas de cómo ofrecer el acuerdo.'
          : 'Listo: Laura le ofrece el acuerdo a todos tus deudores como hoy.',
      )
    } catch (e) {
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar el cambio.',
          accion: 'guardar las pruebas de cómo ofrecer el acuerdo',
        }),
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section
      data-testid="section-formas-del-acuerdo"
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-labelledby="heading-formas-del-acuerdo"
    >
      <div>
        <h2 id="heading-formas-del-acuerdo" className="text-xl font-semibold text-foreground">
          Formas de ofrecer el acuerdo
        </h2>
        <p className="text-sm text-fg-muted mt-1 max-w-2xl">
          Leasefy prueba formas de ofrecer el acuerdo para saber cuál recupera más plata. Mientras una prueba
          corre, Laura le ofrece el acuerdo a la mitad de tus deudores, escogidos al azar, como hoy, y a la otra
          mitad de la forma nueva (por ejemplo, con menos cuotas). Nunca ofrece más de lo que autoriza tu
          inmobiliaria, y cada deudor recibe siempre la misma forma, por llamada y por WhatsApp.
        </p>
      </div>
      <div className="border-t border-border-faint" />

      <Presence as="p" show={Boolean(fallo) && !data} role="alert" className="text-sm text-danger" data-testid="formas-ajustes-fallo">
        {mensajeParaLaPersona(fallo, { porDefecto: 'No se pudo leer si Laura está en las pruebas.' })}{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Reintentar
        </button>
      </Presence>

      <Presence as="p" show={data?.disponible === false} className="text-sm text-fg-muted" data-testid="formas-sin-migracion">
        Todavía no se puede cambiar: falta una actualización de la base. Mientras tanto queda prendido, como
        viene para todas las inmobiliarias.
      </Presence>

      {data && (
        <div className="space-y-2">
          {/* En el celular, si no caben, «Guardar» y el interruptor bajan a su
              propia línea en vez de apretar la frase en una columna. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border border-border px-4 py-3">
            <div className="flex flex-1 basis-56 items-center gap-2">
              <Flask className="h-5 w-5 shrink-0 text-fg-muted" weight="duotone" aria-hidden="true" />
              <Label htmlFor="experimentos-prendidos" className="text-sm cursor-pointer">
                Laura prueba formas de ofrecer el acuerdo con mis deudores
              </Label>
            </div>
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <Presence show={sePuedeGuardar && cambio} direction="none" initial={false}>
                <Button
                  size="sm"
                  variant="secondary"
                  hideArrow
                  isLoading={guardando}
                  onClick={() => void alGuardar()}
                  data-testid="guardar-experimentos"
                >
                  Guardar
                </Button>
              </Presence>
              <Switch
                id="experimentos-prendidos"
                data-testid="field-experimentosPrendidos"
                checked={prendido}
                disabled={!sePuedeGuardar || guardando}
                onCheckedChange={(v) => {
                  setPrendido(v)
                  setError(null)
                }}
              />
            </div>
          </div>

          <Presence as="p" show={Boolean(error)} role="alert" className="text-sm text-danger" data-testid="formas-error">
            {error}
          </Presence>

          <Presence as="p" show={!prendido} className="text-sm text-fg" data-testid="formas-apagado">
            Apagado: desde la próxima llamada o mensaje, Laura le ofrece el acuerdo a todos tus deudores como hoy.
          </Presence>

          <p className="text-caption text-fg-muted" data-testid="formas-la-ganadora">
            Cuando Leasefy aprueba la forma que recuperó más, Laura la usa con los deudores de todas las
            inmobiliarias, también si apagas las pruebas.
          </p>

          {!puedeCambiar && data.disponible && (
            <p className="text-caption text-fg-muted" data-testid="formas-solo-administrador">
              Sólo la dueña o un administrador de la inmobiliaria lo cambia.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
