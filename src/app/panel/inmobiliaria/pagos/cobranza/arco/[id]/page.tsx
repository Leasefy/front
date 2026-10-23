'use client'

/**
 * Ficha de una solicitud ARCO (enlaces profundos y notificaciones). El cuerpo
 * vive en `ArcoDetailClient`, que también monta el cajón de la bandeja
 * (ronda 30, K4, Nico: «K4 cajón»).
 */

import { use } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'
import ArcoDetailClient from './ArcoDetailClient'

interface ArcoDetailPageProps {
  params: Promise<{ id: string }>
}

// ROLES (14-10-2026): pide `resolve-arco`, lo mismo que el micro. Sin el
// permiso el micro responde 403 y la pantalla parecía caída («No pudimos
// cargar las solicitudes» con todo en cero); ahora dice que no tiene acceso.
export default function ArcoDetailPage(props: ArcoDetailPageProps) {
  const params = use(props.params)
  return (
    <PageGuard module="cotizador" action="resolve-arco">
      <ArcoDetailClient requestId={params.id} />
    </PageGuard>
  )
}
