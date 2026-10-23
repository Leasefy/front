'use client'

/**
 * /ai/pagos/fallidos — "Pagos fallidos" (visión §7, punto 7).
 *
 * Concentra los cobros que NO se completaron en una sola superficie operativa:
 * tabla {inquilino, valor, motivo, acción sugerida} + un banner del agente que
 * resume cuántos fallaron y por qué, y un bloque de acciones masivas.
 *
 * SOLO UX sobre el backend ya funcional: NO existe endpoint dedicado de fallidos,
 * así que las filas se derivan de la cola humana real (useAgentWorkItems('pagos'))
 * filtrando los WorkItem en estado de fallo (esPagoFallido). Si no hay fuente de
 * datos / no hay fallidos → <EmptyState> honesto. Las operaciones profundas viven
 * en /cobros — acá se cross-linkea, NUNCA se duplica esa tabla.
 *
 * T-323: ninguna acción auto-rechaza. COBRI-13 (Nico 18-10): las acciones masivas
 * funcionan sobre los links de Cobri que se marcan (`LinksFallidosDeCobri`). CERO hex inline (tokens DS).
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  XCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/ui'
import {
  PagoFallidoTabla,
  esPagoFallido,
  clasificarMotivo,
} from '@/components/inmobiliaria/pagos/PagoFallidoTabla'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { useLinksDeCobriQueNoSePagaron } from '@/lib/hooks/use-links-de-cobri-que-no-se-pagaron'
import { useCobrosEnLaBandeja } from '@/lib/hooks/use-cobros-en-la-bandeja'
import { LinksFallidosDeCobri } from '@/components/inmobiliaria/pagos/LinksFallidosDeCobri'
import { CrossFade } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'

function PagosFallidos() {
  const router = useRouter()
  const { items, isLoading, error, runAction } = useAgentWorkItems('pagos')
  const deCobri = useLinksDeCobriQueNoSePagaron()
  const enLaBandeja = useCobrosEnLaBandeja()

  // Deriva los fallidos de la cola real + cuenta por motivo para el banner.
  const { fallidos, conteo } = useMemo(() => {
    const f = items.filter(esPagoFallido)
    const c = { abandonada: 0, banco: 0, link_vencido: 0, pasarela: 0 }
    for (const item of f) c[clasificarMotivo(item)] += 1
    return { fallidos: f, conteo: c }
  }, [items])

  const total = fallidos.length
  // Reagrupa a las 3 recomendaciones del banner (reenviar / otro método / esperar).
  const reenviar = conteo.abandonada + conteo.link_vencido
  const otroMetodo = conteo.banco
  const esperar = conteo.pasarela

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo="Pagos fallidos"
        descripcion="Los cobros que no se completaron, agrupados por lo que conviene hacer con cada uno."
      />

      {/* LA RESPUESTA: cuántos fallaron y, en la barra, qué hacer con ellos.
          Antes eran una cajita con el total en el encabezado y un cartel del
          agente con un ícono en caja de color que decía lo mismo en una frase. */}
      {!isLoading && !deCobri.cargando && !error && total + deCobri.total > 0 ? (
        <CifraHeroe
          data-testid="fallidos-total"
          rotulo="Pagos fallidos"
          cifra={(total + deCobri.total).toLocaleString('es-CO')}
          contexto={
            deCobri.total > 0 && total > 0
              ? `${total} en la cola del agente · ${deCobri.total} de enlaces de pago`
              : undefined
          }
          total={total}
          tramos={[
            { clave: 'reenviar', etiqueta: 'Reenviar el enlace', monto: reenviar, tono: 'aviso', cifra: reenviar.toLocaleString('es-CO') },
            { clave: 'otro', etiqueta: 'Ofrecer otro medio de pago', monto: otroMetodo, tono: 'neutro', cifra: otroMetodo.toLocaleString('es-CO') },
            { clave: 'esperar', etiqueta: 'Esperar y reintentar', monto: esperar, tono: 'neutro', cifra: esperar.toLocaleString('es-CO') },
          ]}
        />
      ) : null}

      {/* COBRI-13 (Nico 18-10): las acciones masivas de verdad, sobre los links de Cobri que se marcan. */}
      <LinksFallidosDeCobri lectura={deCobri} esperanEnLaBandeja={enLaBandeja.porCuota} />

      {/* Tabla de fallidos / estados de carga, error y vacío: cada estado
          entra con su fundido (`CrossFade`). Con links de Cobri arriba, la cola
          vacía no dice «Sin pagos fallidos» (COBRI-7). */}
      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : total === 0 ? (deCobri.items.length > 0 ? 'nada' : 'vacio') : 'tabla'}>
      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-lg border border-border bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={XCircle}
          title="No pudimos cargar los pagos fallidos"
          description="Hubo un problema al consultar la cola del agente. Vuelve a intentarlo en un momento."
        />
      ) : total === 0 && deCobri.items.length > 0 ? null : total === 0 ? (
        <EmptyState
          icon={XCircle}
          title="Sin pagos fallidos"
          description="Ningún cobro quedó marcado como fallido. Cuando una transacción se abandone, un banco rechace, un link venza o la pasarela falle, lo verás aquí con la acción sugerida."
        />
      ) : (
        <PagoFallidoTabla
          items={fallidos}
          onAction={(item, action, body) => runAction(item, action, body)}
          onOpen={(item) =>
            router.push(`/panel/inmobiliaria/pagos/${encodeURIComponent(item.id)}`)
          }
        />
      )}
      </CrossFade>

      {/* Cross-link a la operación profunda — NUNCA duplicar esa tabla acá */}
      <div className="text-body-sm">
        <Link
          href="/panel/inmobiliaria/pagos/cartera/cobros"
          className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline font-medium"
        >
          Ver todos los cobros y el detalle de cada factura
        </Link>
      </div>
    </div>
  )
}

export default function PagosFallidosPage() {
  return (
    /*
     * 🔴 El gate cambió con la mudanza (2026-09-16). Estando suelta en la raíz
     * de Pagos se abría por ROL (ADMIN|CONTADOR); ahora vive dentro de
     * Cobranza, cuyo `layout.tsx` ya exige el módulo `cobranza`, y su pestaña
     * se ofrece con ese mismo módulo. Dejar el gate por rol haría que un
     * gestor de cobranza viera la pestaña y lo devolvieran sin decirle nada
     * —el defecto MSJ-6—, y pedir las dos cosas le quitaría la pantalla a
     * quien la usa. La pantalla se gatea con lo mismo que la ofrece.
     */
    <PageGuard module="cobranza" action="view">
      <PagosFallidos />
    </PageGuard>
  )
}
