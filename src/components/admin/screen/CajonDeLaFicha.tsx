'use client'

import Link from 'next/link'

import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

/**
 * Ronda 26 (revisora r25, «cajón ✗ (página aparte)»): la ficha de una fila se abre en un cajón sobre la
 * lista —se trabaja sin perderla— y queda en la URL (`?ver=<id>`) para compartirla o recargar. La página
 * `/admin/<sección>/<id>` sigue para los enlaces directos (correo, bitácora): el pie la ofrece.
 */
export function useFichaEnLaUrl(clave = 'ver') {
  const { get, setFilters } = useUrlFilters()
  const ver = get(clave)
  const abrir = (id: string | null) => setFilters({ [clave]: id ?? undefined })
  return { ver, abrir }
}

export function CajonDeLaFicha({
  ver,
  onCerrar,
  titulo,
  descripcion,
  enlace,
  tamano = 'lg',
  children,
}: {
  /** El id abierto (vacío = cerrado). */
  ver: string
  onCerrar: () => void
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  /** La página propia de la ficha, para abrirla aparte. */
  enlace?: string
  tamano?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}) {
  return (
    <Cajon abierto={Boolean(ver)} onOpenChange={(a) => (a ? null : onCerrar())} tamano={tamano}>
      <CajonCabecera titulo={titulo} descripcion={descripcion} />
      <CajonCuerpo>{ver ? children : null}</CajonCuerpo>
      <CajonPie
        izquierda={
          ver && enlace ? (
            <Link href={enlace} className="text-body-sm text-fg-muted underline underline-offset-4 hover:text-fg">
              Abrir en su página
            </Link>
          ) : null
        }
      >
        <Button variant="outline" hideArrow onClick={onCerrar}>
          Cerrar
        </Button>
      </CajonPie>
    </Cajon>
  )
}
