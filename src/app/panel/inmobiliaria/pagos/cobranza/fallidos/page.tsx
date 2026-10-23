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

import { useMemo, useState, type ComponentProps } from 'react'
import Link from 'next/link'

import { PageGuard } from '@/components/auth/PageGuard'
import {
  PagoFallidoTabla,
  BotonDeLaAccion,
  MOTIVO_META,
  esPagoFallido,
  clasificarMotivo,
  inquilinoDelFallido,
  valorDelFallido,
} from '@/components/inmobiliaria/pagos/PagoFallidoTabla'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { useLinksDeCobriQueNoSePagaron } from '@/lib/hooks/use-links-de-cobri-que-no-se-pagaron'
import { useCobrosEnLaBandeja } from '@/lib/hooks/use-cobros-en-la-bandeja'
import { LinksFallidosDeCobri } from '@/components/inmobiliaria/pagos/LinksFallidosDeCobri'
import { Card, CrossFade } from '@leasefy/cadence'
import { Badge, Button } from '@/components/ui'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from '@/components/ui/sheet'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import type { WorkItem } from '@/lib/api/work-item'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { XCircle } from '@phosphor-icons/react'

/**
 * Glow up (revisora r25, 6,5 → ronda 26):
 *   · la cifra y su barra cuentan lo MISMO: la cola del agente + los enlaces
 *     de pago de Cobri que no se pagaron (antes la cifra sumaba los dos y la
 *     barra sólo la cola: «5» con tramos 2 · 1 · 0);
 *   · lo que conviene hacer con cada uno son las PESTAÑAS de la tabla, con su
 *     conteo y su buscador (antes tramos que no filtraban);
 *   · la fila abre un cajón con el detalle y la acción; el caso completo,
 *     desde ahí (antes mandaba fuera de Cobranza de un clic);
 *   · el fallo con «Intentar de nuevo» (`FalloDeCarga`); antes un vacío que
 *     decía «vuelve a intentarlo» sin botón;
 *   · «enlace», nunca «link» (decisión de Nico).
 */
function PagosFallidos() {
  const { items, isLoading, error, errorCrudo, refetch, runAction } = useAgentWorkItems('pagos')
  const deCobri = useLinksDeCobriQueNoSePagaron()
  const enLaBandeja = useCobrosEnLaBandeja()
  const [abierto, setAbierto] = useState<WorkItem | null>(null)

  const fallidos = useMemo(() => items.filter(esPagoFallido), [items])
  const total = fallidos.length
  const todo = total + deCobri.total

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo="Pagos fallidos"
        descripcion="Los cobros que no se completaron y lo que conviene hacer con cada uno."
        acciones={
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cartera/cobros">Ver todos los cobros</Link>
          </Button>
        }
      />

      {/* LA RESPUESTA: cuántos fallaron, partidos entre la cola del agente y los enlaces de Cobri. */}
      {!isLoading && !deCobri.cargando && !error && todo > 0 ? (
        <CifraHeroe
          data-testid="fallidos-total"
          rotulo="Pagos fallidos"
          cifra={todo.toLocaleString('es-CO')}
          contexto={todo === 1 ? 'cobro por recuperar' : 'cobros por recuperar'}
          total={todo}
          tramos={[
            { clave: 'cola', etiqueta: 'En la cola del agente', monto: total, tono: 'aviso', cifra: total.toLocaleString('es-CO'), siempre: deCobri.total > 0, 'data-testid': 'fallidos-tramo-cola' },
            { clave: 'cobri', etiqueta: 'Enlaces de pago sin pagar', monto: deCobri.total, tono: 'neutro', cifra: deCobri.total.toLocaleString('es-CO'), siempre: total > 0, 'data-testid': 'fallidos-tramo-cobri' },
          ]}
        />
      ) : null}

      {/* COBRI-13 (Nico 18-10): las acciones masivas de verdad, sobre los enlaces de Cobri que se marcan. */}
      <LinksFallidosDeCobri lectura={deCobri} esperanEnLaBandeja={enLaBandeja.porCuota} />

      {/* Cada estado entra con su fundido. Con enlaces de Cobri arriba, la cola
          vacía no dice «Sin pagos fallidos» (COBRI-7). */}
      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : total === 0 ? (deCobri.items.length > 0 ? 'nada' : 'vacio') : 'tabla'}>
      {isLoading ? (
        <Card className="overflow-hidden" aria-busy="true">
          <EsqueletoTabla columnas={5} filas={4} />
        </Card>
      ) : error ? (
        <FalloDeCarga error={errorCrudo ?? error} queEs="los pagos fallidos" onReintentar={refetch} />
      ) : total === 0 && deCobri.items.length > 0 ? null : total === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="fallidos-vacio">
          <XCircle className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
          <p className="text-body font-medium text-fg">Sin pagos fallidos</p>
          <p className="max-w-md text-body-sm text-fg-muted">
            Cuando una transacción se abandone, un banco la rechace, un enlace de pago venza o la pasarela falle, aparece aquí con lo que conviene hacer.
          </p>
        </Card>
      ) : (
        <PagoFallidoTabla
          items={fallidos}
          onAction={(item, action, body) => runAction(item, action, body)}
          onOpen={setAbierto}
        />
      )}
      </CrossFade>

      <CajonDelFallido
        item={abierto}
        onClose={() => setAbierto(null)}
        onAction={async (item, action, body) => {
          const r = await runAction(item, action, body)
          if (r.ok) setAbierto(null)
          return r
        }}
      />
    </div>
  )
}

/** El detalle del pago que no entró, sin salir de Cobranza. */
function CajonDelFallido({
  item,
  onClose,
  onAction,
}: {
  item: WorkItem | null
  onClose: () => void
  onAction: ComponentProps<typeof PagoFallidoTabla>['onAction']
}) {
  const ultimo = useUltimoPresente(item)
  return (
    <Sheet open={Boolean(item)} onOpenChange={(a) => { if (!a) onClose() }}>
      <SheetContent side="right" size="md" layout="manual" aria-describedby={undefined}>
        {ultimo ? (
          <>
            <SheetHeader
              title={inquilinoDelFallido(ultimo)}
              description={ultimo.titulo !== inquilinoDelFallido(ultimo) ? ultimo.titulo : undefined}
              actions={
                <Badge variant={MOTIVO_META[clasificarMotivo(ultimo)].variant} className="shrink-0">
                  {MOTIVO_META[clasificarMotivo(ultimo)].label}
                </Badge>
              }
            />
            <SheetBody className="space-y-5">
              <div className="space-y-1">
                <p className="text-caption text-fg-muted">Valor del cobro</p>
                <p className="font-mono text-body tabular-nums text-fg">{valorDelFallido(ultimo)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-caption text-fg-muted">Qué conviene hacer</p>
                <p className="text-body-sm text-fg">{MOTIVO_META[clasificarMotivo(ultimo)].accionSugerida}</p>
                {ultimo.accionSugerida?.razon ? (
                  <p className="text-body-sm text-fg-muted leading-relaxed">{ultimo.accionSugerida.razon}</p>
                ) : null}
              </div>
            </SheetBody>
            <SheetFooter
              start={
                <Button asChild variant="outline" hideArrow>
                  <Link href={`/panel/inmobiliaria/pagos/${encodeURIComponent(ultimo.id)}`}>Ver el caso completo</Link>
                </Button>
              }
            >
              <BotonDeLaAccion item={ultimo} onAction={onAction} />
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
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
