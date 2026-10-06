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
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
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
