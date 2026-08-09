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
 * 4. **El segmento izquierdo muestra lo último que esa persona abrió.** No una
 *    preferencia elegida por nosotros: todos los flujos ya tienen su propio
 *    botón donde viven, así que fijar uno duplicaba algo que está a un clic, y
 *    cuál es "el más usado" no lo sabíamos. Quien capta inmuebles todo el día
 *    ve consignación; quien evalúa candidatos ve evaluación. Ver `FLUJO_INICIAL`
 *    para el arranque.
 *
 * Todo el vestido sale del DS: `SplitButton` y `Button` de `@leasefy/cadence`,
 * y el Dialog y el DropdownMenu por sus adaptadores de `@/components/ui`, que
 * envuelven ese mismo DS con el contrato de layout de este panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FLUJO_INICIAL,
  GRUPOS,
  flujoDescKey,
  flujoIntro,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
  recordarUltimoFlujo,
  ultimoFlujoUsado,
  yaVioElFlujo,
  type FlujoKey,
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
   * El último flujo abierto, para el segmento principal. Arranca en `null` y se
   * lee después del montaje a propósito: leer `localStorage` durante el render
   * hace que el servidor y el cliente pinten etiquetas distintas (hydration
   * mismatch). El primer pintado usa `FLUJO_INICIAL`, igual para todos.
   */
  const [ultimo, setUltimo] = useState<FlujoKey | null>(null)
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  useEffect(() => setUltimo(ultimoFlujoUsado()), [])

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
      // Se recuerda para que el segmento principal muestre lo último que esta
      // persona abrió, en vez de una preferencia adivinada por nosotros.
      recordarUltimoFlujo(flujo.key)
      setUltimo(flujo.key)

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

  // Lo último que abrió esta persona; si nunca abrió nada, el de arranque. El
  // último `?? disponibles[0]` cubre el caso de no tener permiso sobre ninguno
  // de los dos: el segmento principal nunca queda muerto.
  const principal =
    (ultimo && disponibles.find((f) => f.key === ultimo)) ??
    disponibles.find((f) => f.key === FLUJO_INICIAL) ??
    disponibles[0]

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
                        // items-start: el ítem del DS centra verticalmente, y
                        // con una descripción de dos líneas el icono queda
                        // flotando lejos del título al que pertenece.
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
