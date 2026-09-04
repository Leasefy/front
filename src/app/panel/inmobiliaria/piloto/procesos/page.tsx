'use client'

/**
 * /panel/inmobiliaria/piloto/procesos — el «process view» del Piloto.
 *
 * Lo que el Piloto hizo, contado proceso por proceso: depósitos que detectó
 * y concilió, llamadas de Laura con su resultado, conversaciones de
 * WhatsApp con los inquilinos. Todo de filas reales del ERP y del micro.
 *
 * La página es dueña del hook y del cajón (misma forma que la torre del
 * Piloto): un proceso abre el MISMO cajón que la bandeja y el feed
 * (`mov:` · `call:` · `wa:`), con sus acciones reales.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { usePilotoProcesos } from '@/lib/hooks/piloto/use-piloto-procesos'
import { PilotoProcesos } from '@/components/inmobiliaria/piloto/PilotoProcesos'
import { PilotoCajon, type PilotoApertura } from '@/components/inmobiliaria/piloto/PilotoCajon'
import type { TipoDeProceso } from '@/lib/api/piloto'

export default function PilotoProcesosPage() {
  const { t } = useI18n()
  const [tipo, setTipo] = useState<TipoDeProceso | 'todos'>('todos')
  const procesos = usePilotoProcesos(tipo)

  const [pila, setPila] = useState<PilotoApertura[]>([])
  const apertura = pila.length > 0 ? (pila[pila.length - 1] as PilotoApertura) : null
  const abrirItem = useCallback((id: string) => setPila((p) => [...p, { tipo: 'item', id }]), [])
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrar = useCallback(() => setPila([]), [])

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="piloto-procesos-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Button asChild variant="link" size="sm" hideArrow className="-ml-2 h-auto px-2 text-fg-muted">
            <Link href="/panel/inmobiliaria/piloto">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t('inmobiliaria.piloto.procesos.volver')}
            </Link>
          </Button>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.piloto.procesos.titulo')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">{t('inmobiliaria.piloto.procesos.descripcion')}</p>
        </div>
      </header>

      <PilotoProcesos
        data={procesos.data}
        isLoading={procesos.isLoading}
        error={procesos.error}
        notAvailable={procesos.notAvailable}
        tipo={tipo}
        onTipo={setTipo}
        onRefetch={procesos.refetch}
        onAbrir={abrirItem}
      />

      <PilotoCajon
        apertura={apertura}
        onClose={cerrar}
        {...(pila.length > 1 ? { onVolver: volver } : {})}
        onAbrirItem={abrirItem}
        onAccionEjecutada={procesos.refetch}
      />
    </div>
  )
}
