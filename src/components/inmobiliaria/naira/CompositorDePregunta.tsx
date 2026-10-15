'use client'

/**
 * CompositorDePregunta — donde se escribe la pregunta para Naira (Fase 13, plan 13-06; P10, UI-SPEC §7.7, §10.6, §11.1-§11.2).
 *
 * Controlado: el borrador lo guarda la vista (estado de UI, no dato del agente). El botón visible «Enviar pregunta» es su
 * propio nombre accesible (WCAG 2.5.3); Enter envía, Shift+Enter salta de línea y durante la composición IME no se envía.
 * El largo máximo es el del contrato (2000) y el contador aparece desde 1800. Mientras Naira responde el campo queda de
 * solo lectura, no deshabilitado (desvío declarado de §7.7): deshabilitar el campo que tiene el foco lo tira al `body`.
 * Sin autofoco. Funciona igual con datos de ejemplo (UI-SPEC §8.6: el envío sigue habilitado). No guarda nada.
 */

import type { JSX, Ref } from 'react'
import { useId } from 'react'
import { PaperPlaneRight } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { useI18n } from '@/lib/i18n'
import { LARGO_MAXIMO_DE_PREGUNTA, UMBRAL_DEL_CONTADOR, preguntaLista } from '@/lib/naira/conversacion'

export interface CompositorDePreguntaProps {
  readonly valor: string
  readonly onCambiar: (valor: string) => void
  /** Recibe la pregunta lista (recortada, no vacía, hasta 2000). */
  readonly onEnviar: (pregunta: string) => void
  /** Una pregunta en curso ⇒ botón deshabilitado y campo de solo lectura. */
  readonly ocupado: boolean
  /** Para devolverle el foco al precargar una sugerencia. */
  readonly refDelCampo?: Ref<HTMLTextAreaElement>
}

export function CompositorDePregunta({ valor, onCambiar, onEnviar, ocupado, refDelCampo }: CompositorDePreguntaProps): JSX.Element {
  const { t } = useI18n()
  const idDelCampo = useId()
  const idDeLaAyuda = useId()
  const lista = preguntaLista(valor)
  const puedeEnviar = !ocupado && lista !== null
  const enviar = () => {
    if (puedeEnviar && lista !== null) onEnviar(lista)
  }

  return (
    <form
      data-naira-compositor=""
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="sticky bottom-0 z-10 space-y-1 border-t border-border-faint bg-surface pt-3"
    >
      <VisuallyHidden asChild>
        <label htmlFor={idDelCampo}>{t('inmobiliaria.ai.naira.preguntar.tuPregunta')}</label>
      </VisuallyHidden>
      <div className="flex items-end gap-2">
        <Textarea
          id={idDelCampo}
          ref={refDelCampo}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              enviar()
            }
          }}
          readOnly={ocupado}
          maxLength={LARGO_MAXIMO_DE_PREGUNTA}
          rows={2}
          placeholder={t('inmobiliaria.ai.naira.preguntar.placeholder')}
          aria-describedby={idDeLaAyuda}
          className="min-w-0 flex-1 resize-none"
        />
        <Button type="submit" variant="default" size="sm" hideArrow disabled={!puedeEnviar}>
          <PaperPlaneRight aria-hidden size={16} />
          {t('inmobiliaria.ai.naira.preguntar.enviar')}
        </Button>
      </div>
      <p id={idDeLaAyuda} className="text-caption text-fg-muted">
        {t('inmobiliaria.ai.naira.preguntar.atajos')}
      </p>
      {valor.length >= UMBRAL_DEL_CONTADOR ? (
        <p data-naira-contador="" aria-live="polite" className="text-caption text-fg-muted">
          {t('inmobiliaria.ai.naira.preguntar.quedan', { n: LARGO_MAXIMO_DE_PREGUNTA - valor.length })}
        </p>
      ) : null}
    </form>
  )
}
