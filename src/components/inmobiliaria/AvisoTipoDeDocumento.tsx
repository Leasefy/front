'use client'

/**
 * AVISO-TIPO-DOC (05-10-2026): «N propietarios sin tipo de documento: sus
 * facturas por mandato no se emiten hasta completarlo».
 *
 * Nico (04-10 noche, TAL CUAL): la factura por mandato sin el documento del
 * propietario no se numera, y se avisa ANTES para que la inmobiliaria complete
 * la ficha. El título y el detalle los escribe el back con el número (la regla
 * de las alertas del 02-09: qué pasó con el número · qué hacer · el botón).
 *
 * Sin «cerrar»: se va solo cuando ya no queda ninguno (`mostrar`, que lo saca
 * con su animación de salida). Lo ve quien puede arreglarlo
 * (`useAvisoTipoDeDocumento`): administrador, o contador que edita propietarios.
 *
 * `enLaLista`: en Propietarios el botón filtra la lista en el sitio y, con el
 * filtro puesto, ya no se ofrece (la lista de abajo ES lo que pide).
 */
import Link from 'next/link'
import { Presence } from '@leasefy/cadence'

import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { cn } from '@/lib/utils'
import { useAvisoTipoDeDocumento } from '@/lib/hooks/use-aviso-tipo-de-documento'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'

export function AvisoTipoDeDocumento({
  enLaLista = false,
  filtroPuesto = false,
  className,
}: {
  enLaLista?: boolean
  filtroPuesto?: boolean
  className?: string
}) {
  const { aviso: vigente } = useAvisoTipoDeDocumento()
  // Mientras sale animado, el último que hubo (sin él saldría en blanco).
  const ultimo = useUltimoPresente(vigente)
  const aviso = vigente ?? ultimo
  const total = aviso?.total ?? 0
  const accion =
    aviso && !(enLaLista && filtroPuesto)
      ? {
          label: enLaLista
            ? `Ver ${total === 1 ? 'cuál es' : `los ${total}`}`
            : total === 1
              ? 'Completar la ficha'
              : 'Completar las fichas',
          href: aviso.enlace,
        }
      : undefined

  // Glow up (22-10): en la lista de Propietarios es UN renglón —punto ámbar, la frase y
  // «Ver cuál es»—, no un bloque ámbar encima de las cifras (el detalle, al pasar el cursor).
  if (enLaLista) {
    return (
      <Presence
        show={Boolean(vigente)}
        className={cn('grid grid-cols-[auto_1fr] items-start gap-x-2 text-body-sm text-fg', className)}
        data-testid="aviso-tipo-de-documento"
        data-severidad="warning"
        data-total={vigente?.total ?? 0}
        role="status"
      >
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
        <span className="min-w-0">
          <span title={typeof aviso?.detalle === 'string' ? aviso.detalle : undefined}>{aviso?.titulo ?? ''}</span>
          {accion ? (
            <>
              {' '}
              <Link
                href={accion.href}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {accion.label}
              </Link>
            </>
          ) : null}
        </span>
      </Presence>
    )
  }

  return (
    <AlertaAccionable
      mostrar={Boolean(vigente)}
      severidad="warning"
      titulo={aviso?.titulo ?? ''}
      accion={accion}
      className={className}
      data-testid="aviso-tipo-de-documento"
      data-total={vigente?.total ?? 0}
    >
      {aviso?.detalle}
    </AlertaAccionable>
  )
}
