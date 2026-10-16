'use client'

/**
 * DecisionDePropuesta — aprobar o rechazar una propuesta de Naira desde su ficha (Fase 13, plan 13-05; D13-14, UI-SPEC
 * §7.6, §8.2, §10.4, §10.6, §11.2).
 *
 * Los botones aparecen SOLO si el servidor dice que la persona puede decidir (`puedeDecidir`, P4: la UI no lo recalcula).
 * «Aprobar acción» decide sin diálogo (U9); «Rechazar propuesta» pide confirmar en un AlertDialog. El pedido lleva la
 * huella de la versión que está en pantalla (`huellaMostrada`, FG13-15). Si la situación cambió (409 `huella_distinta`),
 * se avisa, los botones se retiran y solo «Cargar la versión actual» (el `recargar` de la ficha) vuelve a mostrar la
 * consecuencia: NADA se reenvía solo (P3). Los demás errores se dicen por su razón (P5), sin copiar la razón ni un texto
 * del servidor. El resultado va a un `role="status"` que recibe el foco. Con datos de ejemplo no se decide (D13-6).
 *
 * NO pinta quién decidió ni el identificador de la decisión (B-5), ni tiempos.
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

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
import { Textarea } from '@/components/ui/textarea'
import { decidirPropuesta } from '@/lib/api/naira/cliente'
import type { ESTADOS_DE_LA_PROPUESTA } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { CLAVE_DEL_CONFLICTO_DE_DECISION, esRazonDeConflictoDeDecision } from '@/lib/naira/vocabulario-de-aprobaciones'
import { fechaLegible } from '@/lib/naira/vocabulario-de-seguimiento'

import { useOrigenDeNaira } from './OrigenDeNaira'

export interface DecisionDePropuestaProps {
  readonly proposalId: string
  /** La `huella` del MISMO detalle cuya consecuencia está en pantalla. */
  readonly huellaMostrada: string
  /** Del servidor; `false` ⇒ sin botones. */
  readonly puedeDecidir: boolean
  readonly estado: (typeof ESTADOS_DE_LA_PROPUESTA)[number]
  readonly venceEn: string
  readonly onDecidida: (decision: 'aprobada' | 'rechazada') => void
  /** El `recargar()` de la ficha (409 `huella_distinta`). */
  readonly onCargarVersionActual: () => void
}

type ResultadoDeDecidir =
  | { readonly kind: 'decidida'; readonly decision: 'aprobada' | 'rechazada' }
  | { readonly kind: 'huella_distinta' }
  | { readonly kind: 'bloqueada'; readonly clave: string; readonly params?: Readonly<Record<string, string>> }
  | { readonly kind: 'reintentable' }

export function DecisionDePropuesta({
  proposalId,
  huellaMostrada,
  puedeDecidir,
  estado,
  venceEn,
  onDecidida,
  onCargarVersionActual,
}: DecisionDePropuestaProps): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const [enVuelo, setEnVuelo] = useState(false)
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [resultado, setResultado] = useState<ResultadoDeDecidir | null>(null)
  const refDelResultado = useRef<HTMLParagraphElement>(null)
  const cerradoPorResultado = useRef(false)

  useEffect(() => {
    if (resultado !== null) refDelResultado.current?.focus()
  }, [resultado])

  if (!puedeDecidir) {
    return (
      <div data-naira-decision="sin_botones">
        {estado === 'pendiente' ? (
          <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.rolNoPuedeAprobar')}</p>
        ) : null}
      </div>
    )
  }

  async function decidir(decision: 'aprobar' | 'rechazar') {
    setResultado(null)
    setEnVuelo(true)
    const porQue = motivo.trim()
    const r = await decidirPropuesta(agencyId ?? '', proposalId, decision === 'rechazar' && porQue !== '' ? { decision, huellaVista: huellaMostrada, motivo: porQue.slice(0, 500) } : { decision, huellaVista: huellaMostrada })
    setEnVuelo(false)
    cerradoPorResultado.current = true
    setConfirmandoRechazo(false)
    if (r.kind === 'ok') {
      setResultado({ kind: 'decidida', decision: r.data.decision })
      onDecidida(r.data.decision)
      return
    }
    if (r.kind === 'conflicto' && r.razon === 'huella_distinta') {
      setResultado({ kind: 'huella_distinta' })
      return
    }
    switch (r.kind) {
      case 'conflicto':
        if (esRazonDeConflictoDeDecision(r.razon)) {
          setResultado(
            r.razon === 'vencida'
              ? {
                  kind: 'bloqueada',
                  clave: CLAVE_DEL_CONFLICTO_DE_DECISION[r.razon],
                  params: { fecha: fechaLegible(venceEn) ?? t('inmobiliaria.ai.naira.seguimiento.fechaIlegible') },
                }
              : { kind: 'bloqueada', clave: CLAVE_DEL_CONFLICTO_DE_DECISION[r.razon] },
          )
        } else {
          setResultado({ kind: 'reintentable' })
        }
        break
      case 'sin_permiso':
        setResultado({ kind: 'bloqueada', clave: 'inmobiliaria.ai.naira.propuesta.sinPermiso' })
        break
      case 'no_encontrado':
      case 'apagada':
        setResultado({ kind: 'bloqueada', clave: 'inmobiliaria.ai.naira.propuesta.noEncontrada' })
        break
      case 'contrato_roto':
        setResultado({ kind: 'bloqueada', clave: 'inmobiliaria.ai.naira.propuesta.sinConfirmar' })
        break
      case 'rechazado':
      case 'no_disponible':
        setResultado({ kind: 'reintentable' })
        break
      default: {
        const nunca: never = r
        return nunca
      }
    }
  }

  const quitaBotones = resultado !== null && resultado.kind !== 'reintentable'
  const marca = resultado?.kind === 'decidida' ? 'resultado' : quitaBotones ? 'sin_botones' : 'botones'

  function textoDelResultado(r: ResultadoDeDecidir): string {
    switch (r.kind) {
      case 'decidida':
        return t(r.decision === 'aprobada' ? 'inmobiliaria.ai.naira.propuesta.aprobada' : 'inmobiliaria.ai.naira.propuesta.rechazada')
      case 'huella_distinta':
        return t('inmobiliaria.ai.naira.propuesta.conflictos.huella_distinta')
      case 'bloqueada':
        return t(r.clave, r.params)
      case 'reintentable':
        return t('inmobiliaria.ai.naira.propuesta.noRegistrada')
      default: {
        const nunca: never = r
        return nunca
      }
    }
  }

  return (
    <div data-naira-decision={marca} className="space-y-2">
      {!quitaBotones ? (
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
          <Button
            type="button"
            variant="default"
            hideArrow
            data-testid="naira-aprobar"
            disabled={esEjemplo || enVuelo}
            onClick={() => void decidir('aprobar')}
          >
            {t('inmobiliaria.ai.naira.propuesta.aprobar')}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="naira-rechazar"
            disabled={esEjemplo || enVuelo}
            onClick={() => setConfirmandoRechazo(true)}
          >
            {t('inmobiliaria.ai.naira.propuesta.rechazar')}
          </Button>
        </div>
      ) : null}
      {!quitaBotones && esEjemplo ? (
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.propuesta.ejemplo')}</p>
      ) : null}
      {resultado !== null ? (
        <p ref={refDelResultado} tabIndex={-1} role="status" className="text-sm text-fg">
          {textoDelResultado(resultado)}
        </p>
      ) : null}
      {resultado?.kind === 'huella_distinta' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="naira-cargar-version-actual"
          onClick={onCargarVersionActual}
        >
          {t('inmobiliaria.ai.naira.propuesta.cargarVersionActual')}
        </Button>
      ) : null}

      <AlertDialog open={confirmandoRechazo} onOpenChange={(abierto) => !enVuelo && setConfirmandoRechazo(abierto)}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Tras decidir, el foco queda en el resultado; con «Volver», Radix lo devuelve a «Rechazar propuesta».
            if (cerradoPorResultado.current) {
              e.preventDefault()
              cerradoPorResultado.current = false
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inmobiliaria.ai.naira.propuesta.dialogoRechazoTitulo')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inmobiliaria.ai.naira.propuesta.dialogoRechazoCuerpo')}</AlertDialogDescription>
          </AlertDialogHeader>
          {/* #31: por qué la rechaza (opcional). Se guarda a su nombre solo si autorizó que Naira le atribuya su gestión. */}
          <div className="space-y-1">
            <label htmlFor="naira-motivo-rechazo" className="text-sm text-fg">
              {t('inmobiliaria.ai.naira.propuesta.motivoDelRechazo')}
            </label>
            <Textarea id="naira-motivo-rechazo" value={motivo} maxLength={500} disabled={enVuelo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enVuelo}>{t('inmobiliaria.ai.naira.propuesta.volver')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="naira-confirmar-rechazo"
              disabled={enVuelo}
              onClick={(e) => {
                // Se queda abierto mientras manda: el cierre lo decide la respuesta.
                e.preventDefault()
                void decidir('rechazar')
              }}
            >
              {t('inmobiliaria.ai.naira.propuesta.dialogoRechazoConfirmar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
