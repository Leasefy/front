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
 * Todo el vestido sale del DS: el `Button` de `@leasefy/cadence` y el Dialog y
 * el DropdownMenu por sus adaptadores de `@/components/ui`, que envuelven ese
 * mismo DS con el contrato de layout de este panel (ver los imports).
 */

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CaretDown, ArrowSquareOut, Check } from '@phosphor-icons/react'
// El Button sale del DS directo: `variant="primary"` es exactamente lo que se
// quiere y sin la flecha automática que el adaptador local le pone a `default`.
import { Button } from '@leasefy/cadence'
// Dialog y DropdownMenu salen de los ADAPTADORES de `@/components/ui`, que SON
// Cadence (envuelven `@leasefy/cadence`) más el contrato de layout de este
// panel. No es una alternativa al DS: usar los crudos rompe cosas reales que
// se vieron en pantalla —el Dialog quedó descentrado y con el pie fuera de la
// ventana, y el Content del DS recorta con `overflow-hidden` (un menú largo no
// scrollea) y le encoge los iconos a 3.5.
// El adaptador los expone con los nombres legacy `DropdownList*`.
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListLabel,
  DropdownListSeparator,
  DropdownListTrigger,
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
import {
  FLUJOS,
  GRUPOS,
  flujoDescKey,
  flujoIntro,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
  yaVioElFlujo,
  type FlujoNuevo,
} from '@/lib/inmobiliaria/flujos'

const NS = 'inmobiliaria.nuevo'

export interface BotonNuevoProps {
  className?: string
}

export function BotonNuevo({ className }: BotonNuevoProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { canAccess } = usePermissionsContext()
  const [porExplicar, setPorExplicar] = useState<FlujoNuevo | null>(null)

  /**
   * Se ofrece solo lo que la persona puede abrir de verdad, con el mismo gate
   * que usa el sidebar: un menú que lleva a un "no tienes permiso" es peor que
   * no tener el menú. El avalúo además desaparece si el micro no está
   * configurado — su URL puede venir vacía.
   */
  const disponibles = useMemo(
    () =>
      FLUJOS.filter((f) => {
        if (f.key === 'avaluo' && !AVALUO_WIZARD_URL) return false
        return f.module === null || canAccess(f.module, 'view')
      }),
    [canAccess],
  )

  const abrir = useCallback(
    (flujo: FlujoNuevo) => {
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

  return (
    <>
      <DropdownList>
        <DropdownListTrigger asChild>
          <Button
            variant="primary"
            size="sm"
            aria-label={t(`${NS}.aria`)}
            className={cn('w-full justify-center gap-1.5', className)}
          >
            <Plus className="h-4 w-4" weight="bold" />
            {t(`${NS}.boton`)}
            <CaretDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownListTrigger>

        <DropdownListContent
          align="start"
          className="w-[264px]"
          // El menú puede crecer más que la ventana; sin esto Lenis se queda
          // con la rueda y no scrollea (docs/DESIGN.md §8).
          data-lenis-prevent
        >
          {GRUPOS.map((grupo, i) => {
            const delGrupo = disponibles.filter((f) => f.grupo === grupo)
            if (delGrupo.length === 0) return null
            return (
              <div key={grupo}>
                {i > 0 && <DropdownListSeparator />}
                <DropdownListLabel>{t(grupoLabelKey(grupo))}</DropdownListLabel>
                {delGrupo.map((flujo) => {
                  const Icono = flujo.icon
                  return (
                    <DropdownListItem
                      key={flujo.key}
                      onSelect={() => elegir(flujo)}
                      // items-start: el ítem del DS centra verticalmente, y con
                      // una descripción de dos líneas el icono queda flotando
                      // lejos del título al que pertenece.
                      className="items-start gap-2.5 py-2"
                    >
                      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 font-medium text-fg">
                          {t(flujoLabelKey(flujo.key))}
                          {flujo.externo && (
                            <ArrowSquareOut
                              className="h-3 w-3 text-fg-subtle"
                              aria-label={t(`${NS}.intro.nuevaPestana`)}
                            />
                          )}
                        </span>
                        <span className="block text-xs leading-snug text-fg-muted">
                          {t(flujoDescKey(flujo.key))}
                        </span>
                      </span>
                    </DropdownListItem>
                  )
                })}
              </div>
            )
          })}
        </DropdownListContent>
      </DropdownList>

      <IntroDelFlujo
        flujo={porExplicar}
        onCancelar={() => setPorExplicar(null)}
        onEmpezar={confirmar}
      />
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
