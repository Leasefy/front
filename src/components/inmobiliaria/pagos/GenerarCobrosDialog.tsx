'use client'

/**
 * GenerarCobrosDialog — la confirmación de la única acción MASIVA de esta
 * pantalla.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * El botón decía «Generar cobros del mes» y llevaba a `/ai/pagos/generar`, una
 * pantalla cuyo modo masivo es una vista previa ILUSTRATIVA con el CTA en
 * «Próximamente». O sea: el botón más prominente del header no generaba nada, y
 * su nombre no decía ni sobre qué mes ni sobre cuántos contratos iba a operar.
 *
 * Mientras tanto el endpoint real existe y está desplegado —
 * `POST /inmobiliaria/cobros/generate { month }` (`cobrosApi.generate`, tipado
 * en `generated/back.ts` como «Generate cobros for a month») — y NADIE en el
 * front lo llamaba.
 *
 * Este diálogo cierra las dos cosas: llama al endpoint de verdad y, antes de
 * hacerlo, DICE SU ALCANCE. Regla de la casa: nunca una acción masiva sin decir
 * a cuántos y sobre qué va a caer.
 *
 * ── Qué se afirma y qué no ───────────────────────────────────────────────────
 * Sólo se muestran hechos verificables desde el front:
 *   · el mes, escrito con todas las letras (nunca 'YYYY-MM' a secas);
 *   · cuántos cobros de ese mes YA existen — es `cobros.length` de la misma
 *     tabla que el usuario está viendo, no un número traído de otro lado.
 * NO se promete «va a crear N cobros» ni «no duplica»: el reparto lo decide el
 * back y desde acá no se puede saber sin inventarlo.
 */

import { useState } from 'react'
import { Warning, CheckCircle } from '@phosphor-icons/react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { cobrosApi } from '@/lib/api/inmobiliaria.service'
import { mesEnTitulo } from '@/lib/utils/mes'
import { useI18n } from '@/lib/i18n'

export interface GenerarCobrosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** El mes sobre el que se va a generar, en 'YYYY-MM'. */
  mes: string
  /** Cuántos cobros de ese mes ya existen HOY (dato real de la tabla de al lado). */
  yaGenerados: number
  /** Se llama tras un generate exitoso para que la tabla se vuelva a leer. */
  onGenerado: () => void
}

export function GenerarCobrosDialog({
  open,
  onOpenChange,
  mes,
  yaGenerados,
  onGenerado,
}: GenerarCobrosDialogProps) {
  const { t } = useI18n()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const titulo = mesEnTitulo(mes)

  async function confirmar() {
    setEnviando(true)
    setError(null)
    try {
      await cobrosApi.generate(mes)
      onGenerado()
      onOpenChange(false)
    } catch (err) {
      // El error se queda EN el diálogo: cerrarlo escondería el fallo y el
      // usuario creería que se generaron.
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  function cambiarApertura(siguiente: boolean) {
    if (enviando) return // no cerrar a mitad de una acción masiva
    if (!siguiente) setError(null)
    onOpenChange(siguiente)
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent className="sm:max-w-lg" data-testid="generar-cobros-dialog">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.ai.pagos_home.resumen.generar.titulo', { mes: titulo })}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.ai.pagos_home.resumen.generar.descripcion', { mes: titulo })}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <FalloDeCarga
            error={error}
            queEs={t('inmobiliaria.ai.pagos_home.resumen.generar.queEs')}
            onReintentar={confirmar}
            enmarcado={false}
          />
        ) : (
          <div className="space-y-3">
            {/* El alcance, en hechos: sobre qué mes y qué hay hoy. */}
            <dl className="rounded-lg border border-border bg-surface-muted/40 divide-y divide-border">
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-fg-muted">
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.mesLabel')}
                </dt>
                <dd className="text-sm font-semibold text-fg" data-testid="generar-mes">
                  {titulo}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-fg-muted">
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.yaGeneradosLabel')}
                </dt>
                <dd
                  className="text-sm font-semibold text-fg tabular-nums"
                  data-testid="generar-ya-generados"
                >
                  {yaGenerados}
                </dd>
              </div>
            </dl>

            {yaGenerados > 0 ? (
              <p
                className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
                data-testid="generar-aviso-duplicado"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" aria-hidden="true" />
                <span>
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.avisoYaHay', {
                    n: yaGenerados,
                    mes: titulo,
                  })}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 px-1 text-sm text-fg-muted">
                <CheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  weight="duotone"
                  aria-hidden="true"
                />
                <span>
                  {t('inmobiliaria.ai.pagos_home.resumen.generar.avisoLimpio', { mes: titulo })}
                </span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            hideArrow
            onClick={() => cambiarApertura(false)}
            disabled={enviando}
          >
            {t('common.cancel')}
          </Button>
          <Button
            hideArrow
            onClick={confirmar}
            disabled={enviando}
            data-testid="generar-confirmar"
          >
            {enviando
              ? t('inmobiliaria.ai.pagos_home.resumen.generar.enviando')
              : t('inmobiliaria.ai.pagos_home.resumen.generar.confirmar', { mes: titulo })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
