'use client'

/**
 * Las acciones masivas de Postulaciones (Nico, 10-10-2026; eligió Operación).
 *
 *  - «Rechazar» — con UN motivo para todas: el mismo rechazo del cajón.
 *  - «Pedir información» — con UN mensaje para todas.
 *
 * Sólo a las que siguen abiertas (una aprobada, rechazada o retirada se
 * salta). Cada una la valida el back (su máquina de estados); lo que no pasa
 * se dice. No tiene tope por persona: corre de a pocas en el centro.
 */

import { useRef, useState } from 'react'
import { ChatCircleText, XCircle } from '@phosphor-icons/react'

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { Button } from '@/components/ui/button'
import { confirmar } from '@/components/ui/confirmar'
import { toast } from '@/components/ui/toast'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { avisarDelBloque, hacerEnBloque } from '@/lib/masivas/en-bloque'

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`)
const MINIMO = 5

export interface PostulacionMarcada {
  id: string
  tenantName: string
  status: string
}

/** Las que siguen abiertas. Pura, para probarla. */
export function abiertas<T extends PostulacionMarcada>(marcadas: readonly T[]): T[] {
  return marcadas.filter((p) => !['APPROVED', 'REJECTED', 'WITHDRAWN', 'DRAFT', 'NOT_AWARDED'].includes(p.status))
}

export function PostulacionesMarcadas({
  marcadas,
  onQuitar,
  onCambiaron,
}: {
  marcadas: readonly PostulacionMarcada[]
  onQuitar: () => void
  onCambiaron: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const texto = useRef('')
  const vivas = abiertas(marcadas)

  const hacer = async (accion: 'reject' | 'requestInfo') => {
    const rechazar = accion === 'reject'
    texto.current = ''
    const ok = await confirmar({
      tipo: rechazar ? 'destructivo' : 'confirmacion',
      titulo: rechazar
        ? `¿Rechazamos ${plural(vivas.length, 'postulación', 'postulaciones')}?`
        : `¿Les pedimos información a ${plural(vivas.length, 'candidato', 'candidatos')}?`,
      descripcion: `${rechazar ? 'A cada candidato le llega el motivo.' : 'A cada candidato le llega el mensaje.'}${
        marcadas.length - vivas.length > 0 ? ` ${plural(marcadas.length - vivas.length, 'ya está cerrada y se salta', 'ya están cerradas y se saltan')}.` : ''
      }`,
      detalle: (
        <label className="block space-y-1.5 text-left">
          <span className="text-sm font-medium text-fg">{rechazar ? 'Motivo (para todas)' : 'Qué falta (para todas)'}</span>
          <textarea
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg placeholder:text-fg-placeholder"
            rows={3}
            maxLength={500}
            placeholder={rechazar ? 'Por qué no siguen' : 'Qué documentos o datos faltan'}
            onChange={(e) => {
              texto.current = e.target.value
            }}
            data-testid="texto-de-los-marcados"
          />
        </label>
      ),
      accion: rechazar ? 'Rechazar' : 'Pedir información',
    })
    if (!ok) return
    const t = texto.current.trim()
    if (t.length < MINIMO) {
      toast.error(rechazar ? 'Falta el motivo' : 'Falta el mensaje', { description: `Escribe al menos ${MINIMO} letras.` })
      return
    }
    setOcupado(true)
    try {
      const r = await hacerEnBloque({
        titulo: rechazar ? `Rechazar ${plural(vivas.length, 'postulación', 'postulaciones')}` : `Pedir información a ${plural(vivas.length, 'candidato', 'candidatos')}`,
        tipo: rechazar ? 'APROBACION_MASIVA' : 'ENVIO_MASIVO',
        filas: vivas.map((p) => ({ id: p.id, nombre: p.tenantName })),
        tarea: (f) => (rechazar ? landlordApplicationsApi.reject(f.id, t) : landlordApplicationsApi.requestInfo(f.id, t)),
        accion: rechazar ? 'rechazar la postulación' : 'pedir la información',
        recursos: ['applications'],
      })
      avisarDelBloque(r, {
        todas: rechazar ? 'Rechazamos las postulaciones' : 'Les pedimos la información',
        ninguna: rechazar ? 'No se rechazó ninguna' : 'No salió ningún pedido',
      })
      onCambiaron()
      onQuitar()
    } finally {
      setOcupado(false)
    }
  }

  const nada = vivas.length === 0
  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="postulaciones-marcadas"
      className="max-md:hidden"
      marcadas={marcadas.length}
      queSon={['postulación', 'postulaciones']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca postulaciones para rechazarlas o pedirles información de una vez."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void hacer('reject')} data-testid="rechazar-marcadas">
        <XCircle className="h-4 w-4" />
        Rechazar
      </Button>
      <Button size="sm" hideArrow disabled={ocupado || nada} onClick={() => void hacer('requestInfo')} data-testid="pedir-info-marcadas">
        <ChatCircleText className="h-4 w-4" />
        Pedir información
      </Button>
    </BarraDeAccionesMasivas>
  )
}
