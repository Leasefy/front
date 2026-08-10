'use client'

/**
 * BotonNuevo — el punto de partida del panel, debajo del buscador.
 *
 * El problema que resuelve: hay 156 rutas y ninguna dice "empezá acá". Para
 * abrir una consignación hay que saber que vive dentro de Consignaciones; para
 * evaluar a un candidato, que está bajo Evaluación de candidatos → Nueva
 * evaluación. El sidebar está agrupado por módulo de negocio, así que le
 * responde bien a quien ya sabe dónde va, y a nadie más.
 *
 * Dos decisiones que vale la pena dejar escritas:
 *
 * 1. **Se llama «Nuevo», no «Nuevo ingreso».** En este mismo sidebar hay una
 *    sección Finanzas con Cobros, Tesorería y Facturación, donde "ingreso" es
 *    plata que entra. Dos conceptos con una palabra rompe la regla madre de
 *    `docs/VOCABULARIO.md`.
 *
 * 2. **La explicación aparece una sola vez por flujo.** La primera vez que
 *    alguien abre "Nueva consignación" se le dice qué va a hacer, en tres
 *    pasos, y qué necesita tener a mano; de ahí en adelante entra directo. Un
 *    cartel que reaparece se vuelve un obstáculo, y se cierra sin leer.
 *
 * 3. **Es un `SplitButton`, no un botón con menú.** La primera versión ponía un
 *    `+` y un chevron en el mismo botón, y decía dos cosas contradictorias: el
 *    `+` promete crear de una, el chevron promete elegir. El DS ya resuelve esa
 *    tensión partiéndolo en dos segmentos — el izquierdo abre un flujo de un
 *    clic, el del chevron despliega el resto.
 *
 * 4. **El segmento izquierdo es siempre la consignación** (`FLUJO_PRINCIPAL`).
 *    Hubo una versión que mostraba el último flujo abierto, y se cambió: un
 *    botón que dice algo distinto cada vez que se mira es un historial, no un
 *    punto de partida, y este lanzador está para quien todavía no sabe a dónde
 *    ir. La consignación es lo único que se empieza en frío y la puerta de
 *    entrada de todo lo demás: sin inmueble consignado no hay postulación, ni
 *    evaluación, ni contrato.
 *
 * Todo el vestido sale del DS: `SplitButton` y `Button` de `@leasefy/cadence`,
 * y el Dialog y el DropdownMenu por sus adaptadores de `@/components/ui`, que
 * envuelven ese mismo DS con el contrato de layout de este panel.
 */

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowSquareOut, Check } from '@phosphor-icons/react'
// SplitButton del DS: separa la acción principal del menú en dos segmentos,
// que es su respuesta a la tensión "+ o chevron, no los dos" (§SplitButton).
import { Button, SplitButton } from '@leasefy/cadence'
// Dialog y DropdownMenu salen de los ADAPTADORES de `@/components/ui`, que SON
// Cadence (envuelven `@leasefy/cadence`) más el contrato de layout de este
// panel. No es una alternativa al DS: usar los crudos rompe cosas reales que
// se vieron en pantalla —el Dialog quedó descentrado y con el pie fuera de la
// ventana, y el Content del DS recorta con `overflow-hidden` (un menú largo no
// scrollea) y le encoge los iconos a 3.5.
// El adaptador los expone con los nombres legacy `DropdownList*`.
import {
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url'
import { SelectorPostulacion } from '@/components/inmobiliaria/SelectorPostulacion'
import {
  FLUJOS,
  FLUJO_PRINCIPAL,
  GRUPOS,
  estadoDelFlujo,
  flujoDescKey,
  flujoIntro,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
  yaVioElFlujo,
  type EstadoFlujo,
  type FlujoNuevo,
} from '@/lib/inmobiliaria/flujos'

const NS = 'inmobiliaria.nuevo'

export interface BotonNuevoProps {
  className?: string
}

export function BotonNuevo({ className }: BotonNuevoProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { canAccess, agentPermsResolved, refetch } = usePermissionsContext()
  const [porExplicar, setPorExplicar] = useState<FlujoNuevo | null>(null)
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  /**
   * Qué se ofrece, y cómo. Se esconde lo que la persona no puede abrir —un menú
   * que lleva a un "no tienes permiso" es peor que no tener el menú—, pero un
   * flujo cuyo permiso NO SE PUDO RESOLVER se muestra deshabilitado en vez de
   * desaparecer: es la diferencia entre "no tienes esto" y "no pudimos
   * averiguarlo", y borrar sin decir nada se lee como lo primero.
   *
   * Esto no es hipotético: con el agente devolviendo 401, `cotizador` falla
   * cerrado y **la asegurabilidad —el primer paso del recorrido— se caía del
   * menú**, dejando un lanzador que empezaba por el final.
   *
   * El avalúo además desaparece si el micro no está configurado: ahí no es que
   * no se sepa, es que no hay a dónde ir.
   */
  const ofrecidos = useMemo<{ flujo: FlujoNuevo; estado: EstadoFlujo }[]>(
    () =>
      FLUJOS.filter((f) => !(f.key === 'avaluo' && !AVALUO_WIZARD_URL))
        .map((flujo) => ({
          flujo,
          estado: estadoDelFlujo(flujo, {
            canAccess,
            permisosDelAgenteResueltos: agentPermsResolved,
          }),
        }))
        .filter(({ estado }) => estado !== 'oculto'),
    [canAccess, agentPermsResolved],
  )

  /** Los que se pueden abrir de un clic — de acá sale el segmento principal. */
  const disponibles = useMemo(
    () => ofrecidos.filter((o) => o.estado === 'disponible').map((o) => o.flujo),
    [ofrecidos],
  )

  const abrir = useCallback(
    (flujo: FlujoNuevo) => {
      // Algunos flujos no arrancan en frío: antes hay que elegir algo. Un
      // contrato se arma sobre una postulación aprobada, así que se pregunta
      // cuál en vez de navegar a una pantalla que pediría el parámetro.
      if (flujo.selector === 'postulacion') {
        setSelectorAbierto(true)
        return
      }

      const destino = flujo.key === 'avaluo' ? AVALUO_WIZARD_URL : flujo.href
      if (!destino) return
      if (flujo.externo) {
        // Pestaña nueva a propósito: el panel queda vivo detrás.
        window.open(destino, '_blank', 'noopener,noreferrer')
      } else {
        router.push(destino)
      }
    },
    [router],
  )

  const elegir = useCallback(
    (flujo: FlujoNuevo) => {
      if (yaVioElFlujo(flujo.key)) {
        abrir(flujo)
        return
      }
      setPorExplicar(flujo)
    },
    [abrir],
  )

  const confirmar = useCallback(() => {
    if (!porExplicar) return
    marcarFlujoVisto(porExplicar.key)
    abrir(porExplicar)
    setPorExplicar(null)
  }, [porExplicar, abrir])

  // Sin nada que ofrecer no se muestra un botón que abre un menú vacío.
  if (disponibles.length === 0) return null

  // El `?? disponibles[0]` cubre a quien no tiene permiso sobre el portafolio:
  // el segmento principal nunca queda muerto.
  const principal = disponibles.find((f) => f.key === FLUJO_PRINCIPAL) ?? disponibles[0]

  return (
    <>
      <SplitButton
        variant="primary"
        size="sm"
        className={cn('w-full', className)}
        label={
          <span className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" weight="bold" />
            {t(flujoLabelKey(principal.key))}
          </span>
        }
        onClick={() => elegir(principal)}
        caretLabel={t(`${NS}.aria`)}
        menuAlign="start"
        menuContent={
          <>
            {GRUPOS.map((grupo, i) => {
              const delGrupo = ofrecidos.filter((o) => o.flujo.grupo === grupo)
              if (delGrupo.length === 0) return null
              return (
                <div key={grupo}>
                  {i > 0 && <DropdownListSeparator />}
                  <DropdownListLabel>{t(grupoLabelKey(grupo))}</DropdownListLabel>
                  {delGrupo.map(({ flujo, estado }) => {
                    const Icono = flujo.icon
                    const sinResolver = estado === 'sinResolver'
                    return (
                      <DropdownListItem
                        key={flujo.key}
                        // Sin resolver no se abre: reintenta averiguarlo. Se
                        // deja el ítem seleccionable para poder decir por qué —
                        // un `disabled` puro no se enfoca ni se lee en voz alta.
                        onSelect={(e) => {
                          if (!sinResolver) {
                            elegir(flujo)
                            return
                          }
                          e.preventDefault()
                          void refetch()
                        }}
                        // items-start: el ítem del DS centra verticalmente, y
                        // con una descripción de dos líneas el icono queda
                        // flotando lejos del título al que pertenece.
                        className="items-start gap-2.5 py-2"
                      >
                        <Icono
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            sinResolver ? 'text-fg-subtle' : 'text-fg-muted',
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'flex items-center gap-1 font-medium',
                              sinResolver ? 'text-fg-muted' : 'text-fg',
                            )}
                          >
                            {t(flujoLabelKey(flujo.key))}
                            {flujo.externo && !sinResolver && (
                              <ArrowSquareOut
                                className="h-3 w-3 text-fg-subtle"
                                aria-label={t(`${NS}.intro.nuevaPestana`)}
                              />
                            )}
                          </span>
                          <span
                            className={cn(
                              'block text-xs leading-snug',
                              sinResolver ? 'text-fg-subtle' : 'text-fg-muted',
                            )}
                          >
                            {/* Se dice qué pasó y qué hacer. Callar acá es lo
                                que hacía desaparecer el paso sin explicación. */}
                            {sinResolver ? t(`${NS}.sinResolver`) : t(flujoDescKey(flujo.key))}
                          </span>
                        </span>
                      </DropdownListItem>
                    )
                  })}
                </div>
              )
            })}
          </>
        }
      />

      <IntroDelFlujo
        flujo={porExplicar}
        onCancelar={() => setPorExplicar(null)}
        onEmpezar={confirmar}
      />

      {/* El paso previo del contrato: sobre qué postulación se arma. */}
      <SelectorPostulacion abierto={selectorAbierto} onOpenChange={setSelectorAbierto} />
    </>
  )
}

/** La explicación de la primera vez. Se muestra una sola vez por flujo. */
function IntroDelFlujo({
  flujo,
  onCancelar,
  onEmpezar,
}: {
  flujo: FlujoNuevo | null
  onCancelar: () => void
  onEmpezar: () => void
}) {
  const { t } = useI18n()
  if (!flujo) return null

  const claves = flujoIntro(flujo.key)
  const Icono = flujo.icon

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <Icono className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>{t(claves.titulo)}</DialogTitle>
          <DialogDescription>{t(claves.resumen)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {t(`${NS}.intro.queVasAHacer`)}
            </p>
            <ol className="space-y-2">
              {claves.pasos.map((clave, i) => (
                <li key={clave} className="flex gap-2.5 text-sm text-fg">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-xs tabular-nums text-fg-muted">
                    {i + 1}
                  </span>
                  {t(clave)}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex gap-2.5 rounded-lg border border-border bg-surface-muted p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" weight="bold" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                {t(`${NS}.intro.necesitasTitulo`)}
              </p>
              <p className="text-sm text-fg">{t(claves.necesitas)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {/* Se dice que no vuelve a aparecer: si no, cerrarlo da miedo. */}
          <p className="text-xs text-fg-subtle">{t(`${NS}.intro.soloPrimeraVez`)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancelar}>
              {t(`${NS}.intro.ahoraNo`)}
            </Button>
            <Button variant="primary" size="sm" onClick={onEmpezar}>
              {t(`${NS}.intro.empezar`)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
