'use client'

/**
 * ItemDeMemoria — una cosa que Naira cree (Fase 13, plan 13-07; UI-SPEC §7.8).
 *
 * Pinta la procedencia PRIMERO y la categoría DATO/INFERENCIA por el CAMPO `provenance` (D13-9), el autor solo como TIPO
 * (B-5, D13-11), el origen con el camino al listado de la fuente por el mapa cerrado (D13-7; nunca un enlace del agente) y
 * «Desde el …» en hora de Colombia. Cada acción existe solo con su permiso (D13-3) y un 403 apaga ESE control (§8.2). Un ítem
 * borrado solo dice que se borró y cuándo (P8). No conoce rutas del workspace (D13-1). Corregir y borrar viven en sus diálogos;
 * aquí solo se confirma como cierto (P2).
 */

import type { JSX } from 'react'
import { useId, useRef, useState } from 'react'
import { DotsThree } from '@phosphor-icons/react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownList, DropdownListContent, DropdownListItem, DropdownListTrigger } from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/use-mobile'
import { promoverItem } from '@/lib/api/naira/cliente'
import type { NairaMemoryItem } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { claveDelAporte } from '@/lib/naira/vocabulario-de-aprobaciones'
import {
  CLAVE_DE_LA_CAPA,
  CLAVE_DE_LA_PROCEDENCIA,
  CLAVE_DEL_AUTOR,
  autorDelItem,
  desenlaceDeEscritura,
  esPromovible,
  idDelArticuloDeMemoria,
  type DesenlaceDeEscritura,
  type DesenlaceParaLaVista,
  type OperacionDeMemoria,
} from '@/lib/naira/vocabulario-de-memoria'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { DialogoDeBorrado } from './DialogoDeBorrado'
import { DialogoDeCorreccion } from './DialogoDeCorreccion'
import { EnlaceALaFuente } from './EnlaceALaFuente'
import { LineaConFecha } from './FilaDeSeguimiento'
import { useOrigenDeNaira } from './OrigenDeNaira'

export interface PermisosDeMemoria {
  readonly corregir: boolean
  readonly borrar: boolean
  readonly promover: boolean
  readonly resolver: boolean
}

export interface ItemDeMemoriaProps {
  readonly item: NairaMemoryItem
  readonly permisos: PermisosDeMemoria
  readonly idsVisibles: readonly string[]
  readonly onDesenlace: (operacion: OperacionDeMemoria, d: DesenlaceParaLaVista, itemId: string) => void
}

type Mensaje = { readonly clave: string; readonly sufijo: string | null }

function OrigenDelItem({
  origen,
  idsVisibles,
}: {
  origen: NairaMemoryItem['derivedFrom']
  idsVisibles: readonly string[]
}): JSX.Element {
  const { t } = useI18n()
  switch (origen.kind) {
    case 'fact':
      return (
        <span data-naira-origen="fact" className="inline-flex flex-wrap items-center gap-1">
          {t('inmobiliaria.ai.naira.memoria.item.origenDato')}{' '}
          <EnlaceALaFuente de={{ kind: 'fuente', fuente: origen.source }} referenciaTecnica={origen.source} />
        </span>
      )
    case 'memory':
      return (
        <span data-naira-origen="memory" className="inline-flex flex-wrap items-center gap-1">
          {t('inmobiliaria.ai.naira.memoria.item.origenMemoria')}
          {idsVisibles.includes(origen.itemId) ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => document.getElementById(idDelArticuloDeMemoria(origen.itemId))?.focus()}
            >
              {t('inmobiliaria.ai.naira.memoria.item.verEsaMemoria')}
            </Button>
          ) : null}
        </span>
      )
    case 'human_statement':
      return <span data-naira-origen="human_statement">{t('inmobiliaria.ai.naira.memoria.item.origenPersona')}</span>
    case 'deterministic_query':
      return (
        <span data-naira-origen="deterministic_query" className="inline-flex flex-wrap items-center gap-1">
          {t('inmobiliaria.ai.naira.memoria.item.origenConsulta')}{' '}
          <span className="font-mono text-caption">{origen.queryId}</span>
        </span>
      )
    default: {
      const nunca: never = origen
      return nunca
    }
  }
}

export function ItemDeMemoria({ item, permisos, idsVisibles, onDesenlace }: ItemDeMemoriaProps): JSX.Element {
  const { t } = useI18n()
  const idTexto = useId()
  const esMovil = useIsMobile()
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const agencyId = useAuth().agency?.id ?? null
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [confirmandoPromocion, setConfirmandoPromocion] = useState(false)
  const [enVuelo, setEnVuelo] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [bloqueadas, setBloqueadas] = useState<readonly OperacionDeMemoria[]>([])
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const huboDesenlace = useRef(false)

  function alDesenlaceLocal(operacion: OperacionDeMemoria, d: DesenlaceDeEscritura): void {
    switch (d.kind) {
      case 'hecho':
      case 'recargar':
        onDesenlace(operacion, d, item.id)
        return
      case 'sin_permiso':
        setBloqueadas((b) => (b.includes(operacion) ? b : [...b, operacion]))
        setMensaje({ clave: 'inmobiliaria.ai.naira.memoria.acciones.sinPermiso', sufijo: null })
        return
      case 'reintentable':
        setMensaje({ clave: 'inmobiliaria.ai.naira.memoria.promocion.noConfirmado', sufijo: null })
        return
      case 'rechazo_de_contenido':
        setMensaje({ clave: d.clave, sufijo: 'inmobiliaria.ai.naira.memoria.promocion.corrigeloPrimero' })
        return
      default: {
        const nunca: never = d
        return nunca
      }
    }
  }

  async function confirmarPromocion(): Promise<void> {
    setEnVuelo(true)
    setMensaje(null)
    const r = await promoverItem(agencyId ?? '', item.id)
    setEnVuelo(false)
    huboDesenlace.current = true
    setConfirmandoPromocion(false)
    alDesenlaceLocal('promover', desenlaceDeEscritura('promover', r))
  }

  const abrirCorreccion = () => setCorrigiendo(true)
  const abrirBorrado = () => setBorrando(true)
  const abrirPromocion = () => setConfirmandoPromocion(true)

  if (item.content.kind === 'erased') {
    return (
      <article
        id={idDelArticuloDeMemoria(item.id)}
        tabIndex={-1}
        data-naira-memoria="erased"
        aria-labelledby={idTexto}
        className="min-w-0 rounded-lg border border-border bg-surface-muted p-4"
      >
        <p id={idTexto} className="text-sm text-fg-muted">
          <LineaConFecha clave="inmobiliaria.ai.naira.memoria.item.borrado" valor={item.content.erasedAt} />
        </p>
      </article>
    )
  }

  const textoActual = item.content.text
  const autor = t(CLAVE_DEL_AUTOR[autorDelItem(item.writtenBy)])
  const aporte = claveDelAporte(item.trust)
  const puedePromover = permisos.promover && esPromovible(item)
  const acciones: ReadonlyArray<{
    readonly op: OperacionDeMemoria
    readonly etiqueta: string
    readonly variante: 'outline' | 'ghost'
    readonly abrir: () => void
  }> = [
    ...(puedePromover
      ? [{ op: 'promover' as const, etiqueta: 'inmobiliaria.ai.naira.memoria.acciones.promover', variante: 'outline' as const, abrir: abrirPromocion }]
      : []),
    ...(permisos.corregir
      ? [{ op: 'corregir' as const, etiqueta: 'inmobiliaria.ai.naira.memoria.acciones.corregir', variante: 'outline' as const, abrir: abrirCorreccion }]
      : []),
    ...(permisos.borrar
      ? [{ op: 'borrar' as const, etiqueta: 'inmobiliaria.ai.naira.memoria.acciones.borrar', variante: 'ghost' as const, abrir: abrirBorrado }]
      : []),
  ]
  const deshabilitada = (op: OperacionDeMemoria) => esEjemplo || enVuelo || bloqueadas.includes(op)

  return (
    <article
      id={idDelArticuloDeMemoria(item.id)}
      tabIndex={-1}
      data-naira-memoria="present"
      aria-labelledby={idTexto}
      className="min-w-0"
    >
      <BloqueDeCategoria origen={{ kind: 'memoria', procedencia: item.provenance }}>
        <div className="space-y-3">
          <div data-naira-etiquetas-del-item="" className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" data-naira-procedencia={item.provenance}>
              {t(CLAVE_DE_LA_PROCEDENCIA[item.provenance])}
            </Badge>
            <Badge variant="outline">{t(CLAVE_DE_LA_CAPA[item.layer])}</Badge>
            {aporte !== null ? (
              <span className="text-caption text-fg-muted">
                {t('inmobiliaria.ai.naira.propuesta.aporte', { origen: t(aporte) })}
              </span>
            ) : null}
          </div>
          <p id={idTexto} className="whitespace-pre-wrap text-sm text-fg">
            {textoActual}
          </p>
          <div className="flex flex-col gap-1 text-sm text-fg-muted md:flex-row md:flex-wrap md:items-center md:gap-3">
            <span data-naira-autor={autorDelItem(item.writtenBy)}>{autor}</span>
            <OrigenDelItem origen={item.derivedFrom} idsVisibles={idsVisibles} />
            <LineaConFecha clave="inmobiliaria.ai.naira.memoria.item.desde" valor={item.recordedAt} />
          </div>
          {acciones.length > 0 ? (
            esMovil ? (
              <DropdownList open={menuAbierto} onOpenChange={setMenuAbierto}>
                <DropdownListTrigger asChild>
                  <Button type="button" variant="outline" size="sm" data-naira-acciones-movil="" disabled={esEjemplo}>
                    <DotsThree aria-hidden="true" className="h-4 w-4" />
                    {t('inmobiliaria.ai.naira.memoria.item.acciones')}
                  </Button>
                </DropdownListTrigger>
                <DropdownListContent align="end">
                  {acciones.map(({ op, etiqueta, abrir }) => (
                    <DropdownListItem
                      key={op}
                      disabled={deshabilitada(op)}
                      onClick={() => {
                        setMenuAbierto(false)
                        abrir()
                      }}
                    >
                      {t(etiqueta)}
                    </DropdownListItem>
                  ))}
                </DropdownListContent>
              </DropdownList>
            ) : (
              <div className="flex flex-wrap gap-2">
                {acciones.map(({ op, etiqueta, variante, abrir }) => (
                  <Button
                    key={op}
                    type="button"
                    variant={variante}
                    size="sm"
                    data-naira-accion={op}
                    disabled={deshabilitada(op)}
                    onClick={abrir}
                  >
                    {t(etiqueta)}
                  </Button>
                ))}
              </div>
            )
          ) : null}
          {esEjemplo && acciones.length > 0 ? (
            <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.memoria.acciones.ejemplo')}</p>
          ) : null}
          {mensaje !== null ? (
            <p role="status" data-naira-mensaje-del-item="" className="text-sm text-fg">
              {t(mensaje.clave)}
              {mensaje.sufijo !== null ? ' ' + t(mensaje.sufijo) : ''}
            </p>
          ) : null}
        </div>
      </BloqueDeCategoria>
      {permisos.corregir ? (
        <DialogoDeCorreccion
          itemId={item.id}
          textoActual={textoActual}
          abierto={corrigiendo}
          onAbiertoCambia={setCorrigiendo}
          onDesenlace={(d) => alDesenlaceLocal('corregir', d)}
        />
      ) : null}
      {permisos.borrar ? (
        <DialogoDeBorrado
          itemId={item.id}
          abierto={borrando}
          onAbiertoCambia={setBorrando}
          onDesenlace={(d) => alDesenlaceLocal('borrar', d)}
        />
      ) : null}
      {puedePromover ? (
        <AlertDialog
          open={confirmandoPromocion}
          onOpenChange={(a) => {
            if (!enVuelo) {
              if (a) huboDesenlace.current = false
              setConfirmandoPromocion(a)
            }
          }}
        >
          <AlertDialogContent
            onCloseAutoFocus={(e) => {
              if (huboDesenlace.current) e.preventDefault()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{t('inmobiliaria.ai.naira.memoria.promocion.titulo')}</AlertDialogTitle>
              <AlertDialogDescription>{t('inmobiliaria.ai.naira.memoria.promocion.cuerpo')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enVuelo}>{t('inmobiliaria.ai.naira.memoria.promocion.volver')}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="naira-confirmar-promocion"
                disabled={enVuelo}
                onClick={(e) => {
                  e.preventDefault()
                  void confirmarPromocion()
                }}
              >
                {t('inmobiliaria.ai.naira.memoria.promocion.confirmar')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </article>
  )
}
