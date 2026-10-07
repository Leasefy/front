'use client'

/**
 * BotonNuevo — el punto de partida del panel, debajo del buscador.
 *
 * El problema que resuelve: hay 156 rutas y ninguna dice "empieza acá". Para
 * abrir una consignación hay que saber que vive dentro de Consignaciones; para
 * pedir la asegurabilidad de un candidato, que está bajo Postulaciones →
 * Asegurabilidad. El sidebar está agrupado por módulo de negocio, así que le
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
import { Plus, ArrowSquareOut, CloudArrowUp, Receipt, Wallet } from '@phosphor-icons/react'
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
import { IntroHeroe } from '@/components/inmobiliaria/intro-de-flujo'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useMigracion } from '@/components/migracion/migracion-context'
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url'
import { botonPrincipalDelRol } from '@/lib/search/acciones-rapidas-por-rol'
import { SelectorPostulacion } from '@/components/inmobiliaria/SelectorPostulacion'
import {
  FLUJOS,
  FLUJO_PRINCIPAL,
  GRUPOS,
  estadoDelFlujo,
  flujoDescKey,
  flujoLabelKey,
  grupoLabelKey,
  marcarFlujoVisto,
  yaVioElFlujo,
  type EstadoFlujo,
  type FlujoNuevo,
} from '@/lib/inmobiliaria/flujos'

const NS = 'inmobiliaria.nuevo'
/** Primer importador suelto; el mismo fallback de `SeccionMigracion`. */
const RUTA_MIGRACION = '/panel/inmobiliaria/migracion/terceros'

export interface BotonNuevoProps {
  className?: string
}

export function BotonNuevo({ className }: BotonNuevoProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { canAccess, agentPermsResolved, refetch, isAdmin, agencyRole } = usePermissionsContext()
  const migracion = useMigracion()
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

  /**
   * «Migrar mis datos»: la vuelta a la migración para quien la descartó al
   * entrar («en otro momento», «no requiero migración» o la ✕ del recordatorio).
   * No es un flujo de `FLUJOS` —no tiene ruta ni explicación de primera vez—, es
   * una acción. Misma entrada que Configuración → Migración → «Migrar ahora»:
   * sin contexto (fuera del panel) cae al primer importador suelto.
   *
   * Sólo el ADMIN (el mismo gate de esa sección) y sólo si el muro no está ya
   * puesto: con el muro arriba la migración ya está en la cara.
   */
  const ofreceMigracion = isAdmin && migracion?.estado?.bloquea !== true
  const migrar = useCallback(() => {
    if (migracion) migracion.abrir()
    else router.push(RUTA_MIGRACION)
  }, [migracion, router])

  const confirmar = useCallback(() => {
    if (!porExplicar) return
    marcarFlujoVisto(porExplicar.key)
    abrir(porExplicar)
    setPorExplicar(null)
  }, [porExplicar, abrir])

  // 🟡 BU-12 (04-10-2026): el contador veía «Nueva asegurabilidad» como botón
  // principal. Un rol sin flujos comerciales tiene el suyo (Facturación para el
  // contador, la cartera para el auxiliar); el administrador y la asesora, el
  // «Nuevo» de siempre.
  const delRol = botonPrincipalDelRol(isAdmin, agencyRole)
  if (delRol && canAccess(delRol.permiso.module, delRol.permiso.action)) {
    const IconoDelRol = delRol.icono === 'factura' ? Receipt : Wallet
    return (
      <div data-tour-target="nuevo">
        <Button
          variant="primary"
          size="sm"
          className={cn('w-full', className)}
          data-testid="boton-principal-del-rol"
          onClick={() => router.push(delRol.href)}
        >
          <span className="flex items-center gap-1.5">
            <IconoDelRol className="h-4 w-4" weight="bold" />
            {t(delRol.labelKey)}
          </span>
        </Button>
      </div>
    )
  }

  // Sin nada que ofrecer no se muestra un botón que abre un menú vacío.
  if (disponibles.length === 0) return null

  // El `?? disponibles[0]` cubre a quien no tiene permiso sobre el portafolio:
  // el segmento principal nunca queda muerto.
  const principal = disponibles.find((f) => f.key === FLUJO_PRINCIPAL) ?? disponibles[0]

  return (
    <>
      {/* El `div` es el ANCLAJE del recorrido guiado (`data-tour-target`): el
          SplitButton del DS no reenvía atributos `data-*`, y sin una caja
          propia el paso «por acá entra un inmueble» no tendría a qué apuntar.
          Sólo existe cuando el botón existe (arriba: sin flujos, `null`), así
          que el recorrido nunca señala un hueco. */}
      <div data-tour-target="nuevo">
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
            {ofreceMigracion && (
              <div>
                <DropdownListSeparator />
                <DropdownListLabel>{t(`${NS}.migracion.grupo`)}</DropdownListLabel>
                <DropdownListItem
                  data-testid="nuevo-migrar-mis-datos"
                  onSelect={migrar}
                  className="items-start gap-2.5 py-2"
                >
                  <CloudArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium text-fg">
                      {t(`${NS}.migracion.label`)}
                    </span>
                    <span className="block text-xs leading-snug text-fg-muted">
                      {t(`${NS}.migracion.desc`)}
                    </span>
                  </span>
                </DropdownListItem>
              </div>
            )}
          </>
        }
      />
      </div>

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

/**
 * La explicación de la primera vez. Se muestra una sola vez por flujo.
 *
 * Desde el 05-10-2026 es la dirección A «Héroe» que eligió Nico
 * (`components/inmobiliaria/intro-de-flujo/`): una banda de marca con el
 * medallón del flujo —el ícono SIEMPRE se ve, adentro de su círculo; la
 * «píldora celeste vacía» de antes era el ícono aplastado a 0 px por la
 * reserva de la ✕ (lo fija `BotonNuevo.intro.test.tsx`)—, los pasos de SU
 * asistente como línea de tiempo y «Antes de empezar» como lista de chequeo.
 *
 * `open` manda de verdad y el contenido es el último flujo presente
 * (`useUltimoPresente`, adentro de `IntroHeroe`): cerrar anima la salida con
 * el contenido todavía adentro. La explicación no se monta hasta que se pide
 * la primera vez: nadie paga lo que no abrió.
 */
function IntroDelFlujo({
  flujo,
  onCancelar,
  onEmpezar,
}: {
  flujo: FlujoNuevo | null
  onCancelar: () => void
  onEmpezar: () => void
}) {
  const ultimo = useUltimoPresente(flujo)
  if (!ultimo) return null
  return <IntroHeroe flujo={flujo} onCancelar={onCancelar} onEmpezar={onEmpezar} />
}
