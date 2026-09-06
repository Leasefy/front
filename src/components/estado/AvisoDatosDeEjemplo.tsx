'use client'

/**
 * AvisoDatosDeEjemplo — el rótulo de las pantallas que todavía pintan datos
 * inventados.
 *
 * Regla del producto: en el panel no puede haber datos inventados. Hay
 * pantallas que hoy no la cumplen —prototipos que quedaron vivos, con nombres
 * de persona, direcciones de inmuebles y montos en pesos escritos a mano— y
 * borrarlas no es una decisión de quien programa: qué existe en el panel lo
 * decide Nico. Lo que sí se puede hacer mientras tanto es que dejen de
 * mentir.
 *
 * Por qué un cartel y no un vacío: vaciarlas dejaría media docena de pantallas
 * rotas, y un pendiente escrito vale más que eso. Por qué arriba y a lo ancho:
 * el daño de estas pantallas es que se leen como propias —«mis propietarios»,
 * «mi cartera»—, así que el aviso tiene que llegar antes que el primer número.
 *
 * Se monta desde un `layout.tsx` por carpeta, no editando cada página: así
 * cubre la subruta entera y ninguna queda afuera por olvido.
 *
 * No se puede cerrar. La forma de sacarlo es cablear la pantalla a su fuente
 * real —o retirarla—, que es justo la decisión que el cartel está pidiendo.
 */

import { Warning } from '@phosphor-icons/react'

export interface AvisoDatosDeEjemploProps {
  /**
   * Qué se está inventando, en concreto y en criollo: «los propietarios, los
   * montos a transferir y la liquidación». Genérico no sirve — quien mira
   * tiene que saber de qué número desconfiar.
   */
  queEsInventado: string
  /** Qué falta para que sea real. Si se sabe, se dice. */
  queFalta?: string
  className?: string
}

export function AvisoDatosDeEjemplo({
  queEsInventado,
  queFalta,
  className,
}: AvisoDatosDeEjemploProps) {
  return (
    <div
      role="status"
      data-testid="aviso-datos-de-ejemplo"
      className={[
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        'border-warning/30 bg-warning-soft text-warning',
        'text-sm leading-relaxed',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <Warning weight="fill" className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <p>
          <strong className="font-semibold">
            Esta pantalla muestra datos de ejemplo.
          </strong>{' '}
          {queEsInventado} no salen de tu inmobiliaria: están escritos a mano en
          el código. No tomes decisiones con lo que ves acá.
        </p>
        {queFalta ? <p className="text-warning/90">{queFalta}</p> : null}
      </div>
    </div>
  )
}
