import { PageGuard } from '@/components/auth/PageGuard'

import { ListasClient } from './ListasClient'

/**
 * /panel/inmobiliaria/clientes/listas — C-06: las listas restrictivas cargadas
 * y la BANDEJA de terceros que operan sin haberse verificado.
 */
export default function ListasPage() {
  return (
    <PageGuard module="clientes">
      <ListasClient />
    </PageGuard>
  )
}
