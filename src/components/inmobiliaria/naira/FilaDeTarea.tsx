'use client'

/**
 * FilaDeTarea — una tarea que creó Naira, en la pestaña Aprobaciones (Fase 13, plan 13-05; UI-SPEC §7.5, §10.4).
 *
 * Pinta el nombre (el de la métrica de su detector; desconocido ⇒ que el panel no lo reconoce, nunca el id), el dueño SOLO
 * como rol (B-5, U19), desde cuándo está abierta y «Ver la bitácora» si la página da el enlace. «Cancelar tarea» aparece
 * solo con `task-cancel` y la tarea abierta, y SIEMPRE pide confirmar en un AlertDialog (la acción del diálogo es la
 * destructiva del DS). El resultado es local a la fila y recibe el foco; nunca copia la razón del servidor. No se relee
 * la lista tras cancelar: la próxima vuelta a la pestaña la actualiza (P9). Con datos de ejemplo, el botón está
 * deshabilitado con su razón y no toca la red (D13-6).
 *
 * NO pinta quién canceló ni cuándo, ni el detector, ni la propuesta de origen. No conoce rutas (D13-1).
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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
import { Button } from '@/components/ui/button'
import { cancelarTarea } from '@/lib/api/naira/cliente'
import type { NairaTask } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { CLAVE_DEL_ESTADO_DE_TAREA, nombreDeLaTarea } from '@/lib/naira/vocabulario-de-aprobaciones'
import { CLAVE_DEL_ROL } from '@/lib/naira/vocabulario-de-seguimiento'

import { LineaConFecha } from './FilaDeSeguimiento'
import { useOrigenDeNaira } from './OrigenDeNaira'

export interface FilaDeTareaProps {
  readonly tarea: NairaTask
  /** `null` ⇒ sin «Ver la bitácora» (sin open-loops-view o id vacío). */
  readonly hrefDelLoop: string | null
  /** canAccess('naira', 'task-cancel'); `false` ⇒ sin «Cancelar tarea». */
  readonly puedeCancelar: boolean
}

type ResultadoDeCancelar = 'cancelada' | 'ya_no_abierta' | 'sin_permiso' | 'fallo'

const CLAVE_DEL_RESULTADO = {
  cancelada: 'inmobiliaria.ai.naira.tareas.cancelada',
  ya_no_abierta: 'inmobiliaria.ai.naira.tareas.yaNoEstaAbierta',
  sin_permiso: 'inmobiliaria.ai.naira.tareas.sinPermiso',
  fallo: 'inmobiliaria.ai.naira.tareas.noCancelada',
} as const satisfies Record<ResultadoDeCancelar, string>

const CLASE_DEL_ENLACE = 'text-sm text-fg-muted underline underline-offset-2 hover:text-primary'

export function FilaDeTarea({ tarea, hrefDelLoop, puedeCancelar }: FilaDeTareaProps): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const [confirmando, setConfirmando] = useState(false)
  const [enVuelo, setEnVuelo] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDeCancelar | null>(null)
  const refDelResultado = useRef<HTMLParagraphElement>(null)
  const cerradoPorResultado = useRef(false)

  useEffect(() => {
    if (resultado !== null) refDelResultado.current?.focus()
  }, [resultado])

  const rol = t(CLAVE_DEL_ROL[tarea.owner])
  const nombre = nombreDeLaTarea(tarea.detectorId) ?? t('inmobiliaria.ai.naira.tareas.sinNombre')
  const estadoVigente = resultado === 'cancelada' ? 'cancelada' : tarea.estado
  const muestraCancelar =
    puedeCancelar && tarea.estado === 'abierta' && resultado !== 'cancelada' && resultado !== 'ya_no_abierta'

  async function confirmar() {
    setEnVuelo(true)
    const r = await cancelarTarea(agencyId ?? '', tarea.tareaId)
    setEnVuelo(false)
    cerradoPorResultado.current = true
    setConfirmando(false)
    switch (r.kind) {
      case 'ok':
        setResultado('cancelada')
        break
      case 'no_encontrado':
      case 'conflicto':
        setResultado('ya_no_abierta')
        break
      case 'sin_permiso':
        setResultado('sin_permiso')
        break
      case 'apagada':
      case 'rechazado':
      case 'no_disponible':
      case 'contrato_roto':
        setResultado('fallo')
        break
      default: {
        const nunca: never = r
        return nunca
      }
    }
  }

  return (
    <li data-naira-tarea={estadoVigente} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">{nombre}</p>
      <p className="text-sm text-fg">{t('inmobiliaria.ai.naira.seguimiento.rol', { rol })}</p>
      <p className="text-sm text-fg-muted">
        {estadoVigente === 'abierta' ? (
          <LineaConFecha clave="inmobiliaria.ai.naira.tareas.abiertaDesde" valor={tarea.creadaEn} />
        ) : (
          t(CLAVE_DEL_ESTADO_DE_TAREA[estadoVigente])
        )}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {hrefDelLoop !== null ? (
          <Link href={hrefDelLoop} className={CLASE_DEL_ENLACE}>
            {t('inmobiliaria.ai.naira.seguimiento.verLaBitacora')}
          </Link>
        ) : null}
        {muestraCancelar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="naira-cancelar-tarea"
            disabled={esEjemplo || enVuelo || resultado === 'sin_permiso'}
            onClick={() => setConfirmando(true)}
          >
            {t('inmobiliaria.ai.naira.tareas.cancelar')}
          </Button>
        ) : null}
      </div>
      {muestraCancelar && esEjemplo ? (
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.tareas.ejemplo')}</p>
      ) : null}
      {resultado !== null ? (
        <p ref={refDelResultado} tabIndex={-1} role="status" className="text-sm text-fg">
          {t(CLAVE_DEL_RESULTADO[resultado])}
        </p>
      ) : null}

      <AlertDialog open={confirmando} onOpenChange={(abierto) => !enVuelo && setConfirmando(abierto)}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Tras confirmar, el foco queda en el resultado (el disparador pudo desaparecer); con «Volver», Radix lo
            // devuelve al disparador.
            if (cerradoPorResultado.current) {
              e.preventDefault()
              cerradoPorResultado.current = false
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inmobiliaria.ai.naira.tareas.dialogoTitulo')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inmobiliaria.ai.naira.tareas.dialogoCuerpo', { rol })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enVuelo}>{t('inmobiliaria.ai.naira.tareas.volver')}</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              data-testid="naira-confirmar-cancelar-tarea"
              disabled={enVuelo}
              onClick={(e) => {
                // Se queda abierto mientras cancela: el cierre lo decide la respuesta.
                e.preventDefault()
                void confirmar()
              }}
            >
              {t('inmobiliaria.ai.naira.tareas.dialogoConfirmar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
