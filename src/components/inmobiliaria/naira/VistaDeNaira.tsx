'use client'

/**
 * VistaDeNaira — la LECTURA PRINCIPAL de una pestaña o ficha de Naira (Fase 13, plan 13-02; D13-4, UI-03).
 *
 * El estado se evalúa ANTES que los hijos: solo `ok` llama a `renderOk`, y cualquier otro estado reemplaza el cuerpo
 * entero. Ningún estado conserva lo anterior: no hay contenido conservado, ni memo, ni referencia al último `ok` (el
 * Δ 13-01 resolvió UI-SPEC §8.5 a favor de D13-4: un refresco que falla deja su propio estado, sin datos). Así, tras un
 * `ok`, un 403 deja `NairaSinPermiso` sin un solo token ni número de lo que se veía.
 *
 * Las lecturas SECUNDARIAS (las tareas de Aprobaciones, el loop de una señal) no usan esta vista: su 403 se omite sin
 * rastro (UI-SPEC §8.2). La vista no conoce ninguna ruta del workspace (D13-1, P17): `volverA` lo pone la página.
 *
 * El aviso de datos de ejemplo se pinta ACÁ, por el `origen` del `ok`, y no en el layout (D13-6, P3): una sola banda y
 * solo cuando lo que se ve es un ejemplo. El `origen` se provee a las primitivas con `ProveedorDeOrigen`.
 *
 * Por estado: `cargando` ⇒ esqueleto con `role="status"`; `sin_permiso` ⇒ `NairaSinPermiso`; `apagada` ⇒
 * `NairaApagada`; `no_encontrado` ⇒ copy propia sobre `EmptyState` (el 404 de `FalloDeCarga` usa léxico prohibido por
 * UI-SPEC §10.5, P5); `no_disponible`, `conflicto` y `rechazado` ⇒ `FalloDeCarga` de servidor, reintentable (13-01 junta
 * red, 503 y falta de URL en `no_disponible`: la vista no puede elegir entre los textos de §8.4); `contrato_roto` ⇒ copy
 * propia, sin reintentar.
 */

import type { JSX } from 'react'
import type { ReactNode } from 'react'
import { FileX, MagnifyingGlass } from '@phosphor-icons/react'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'
import { useI18n } from '@/lib/i18n'

import { NairaApagada } from './NairaApagada'
import { NairaSinPermiso } from './NairaSinPermiso'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'

export const VISTAS_DE_NAIRA = ['briefing', 'senal', 'seguimiento', 'loop', 'aprobaciones', 'propuesta', 'preguntar', 'memoria', 'deMi'] as const
export type NombreDeVistaDeNaira = (typeof VISTAS_DE_NAIRA)[number]

export interface VistaDeNairaProps<T> {
  /** ⇒ `data-naira-vista` (el marcador de montaje del E2E de 13-08). */
  readonly nombre: NombreDeVistaDeNaira
  /** El del hook, tal cual. */
  readonly estado: LecturaDeNaira<T>
  /** SOLO se llama con kind `ok`. */
  readonly renderOk: (data: T, origen: OrigenDeLosDatos) => ReactNode
  /** Ya traducido y con artículo: «el briefing», «esta señal». */
  readonly queEs: string
  /** La pone la PÁGINA (sin_permiso y no_encontrado). */
  readonly volverA: { readonly label: string; readonly href: string }
  /** El `recargar` del hook; solo se ofrece en no_disponible, conflicto y rechazado. */
  readonly onReintentar?: () => void
  /** La forma conocida de la vista (UI-SPEC §8.1); por defecto 3 bloques. */
  readonly esqueleto?: ReactNode
  // + 13-06: el 404 propio de una vista (p. ej. la conversación: Naira O su sub-flag); sin ella, NairaApagada
  readonly apagada?: ReactNode
}

export function VistaDeNaira<T>({
  nombre,
  estado,
  renderOk,
  queEs,
  volverA,
  onReintentar,
  esqueleto,
  apagada,
}: VistaDeNairaProps<T>): JSX.Element {
  const { t } = useI18n()
  const vigente: LecturaDeNaira<T> = estado

  function cuerpo(): ReactNode {
    switch (vigente.kind) {
      case 'cargando':
        return (
          <div role="status" aria-busy="true" aria-label={t('inmobiliaria.ai.naira.estados.cargando', { queEs })}>
            {esqueleto ?? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            )}
          </div>
        )
      case 'sin_permiso':
        return <NairaSinPermiso volverA={volverA} />
      case 'apagada':
        return <>{apagada ?? <NairaApagada />}</>
      case 'no_encontrado':
        return (
          <div data-testid="naira-no-encontrado">
            <EmptyState
              icon={MagnifyingGlass}
              title={t('inmobiliaria.ai.naira.estados.noEncontradoTitulo', { queEs })}
              description={t('inmobiliaria.ai.naira.estados.noEncontradoDescripcion')}
              action={{ label: volverA.label, href: volverA.href }}
            />
          </div>
        )
      case 'no_disponible':
      case 'conflicto':
      case 'rechazado':
        return <FalloDeCarga error={new Error('503')} queEs={queEs} onReintentar={onReintentar} />
      case 'contrato_roto':
        return (
          <div data-testid="naira-contrato-roto">
            <EmptyState
              icon={FileX}
              title={t('inmobiliaria.ai.naira.estados.contratoRotoTitulo')}
              description={t('inmobiliaria.ai.naira.estados.contratoRotoDescripcion')}
            />
          </div>
        )
      case 'ok':
        return (
          <ProveedorDeOrigen origen={vigente.origen}>
            {vigente.origen === 'ejemplo' ? (
              <AvisoDatosDeEjemplo
                queEsInventado={t('inmobiliaria.ai.naira.ejemplo.queEsInventado')}
                queFalta={t('inmobiliaria.ai.naira.ejemplo.queFalta')}
              />
            ) : null}
            {renderOk(vigente.data, vigente.origen)}
          </ProveedorDeOrigen>
        )
      default: {
        const _exhaustivo: never = vigente
        return _exhaustivo
      }
    }
  }

  return (
    <div
      data-naira-vista={nombre}
      data-naira-estado={vigente.kind}
      data-sample={vigente.kind === 'ok' && vigente.origen === 'ejemplo' ? 'true' : undefined}
      className="space-y-6"
    >
      {cuerpo()}
    </div>
  )
}
