'use client'

/**
 * Por aprobar · Vinci — lo que Vinci dejó esperando a una persona, DICIENDO
 * QUÉ ES (26-09-2026):
 *   · «Vinci propone…» (Manual) → «Hacerlo» abre el plan y le escribe;
 *   · «Mensaje listo…» (Copiloto) → «Enviar» (en horario de ley; se puede
 *     deshacer desde la Bandeja del Piloto mientras no salga);
 *   · «Oferta por aprobar» → sólo el administrador;
 *   · «El mensaje no salió» → el porqué, y «Enterado».
 * Antes: «propietario notificado» para un correo INTERNO al responsable, y
 * un «Confirmar» igual para todo.
 */
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAuth } from '@/lib/auth'
import { ErrorDeVinci, hacerlo, resolverOferta, revisarDecision } from '@/lib/api/retencion'
import { useDecisionesDeVinci } from '@/lib/hooks/retencion/use-vinci'
import { QUE_ES_CADA_DECISION, fechaYHora } from '@/components/retencion/vinci'
import type { DecisionDeVinci } from '@/lib/types/retencion'

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

function nombreDe(d: DecisionDeVinci): string {
  const p = d.payload ?? {}
  return texto(p.nombre) ?? texto((p.mensaje as Record<string, unknown> | undefined)?.nombre) ?? 'una persona sin nombre registrado'
}

function textoDelMensaje(d: DecisionDeVinci): string | null {
  const p = d.payload ?? {}
  return texto((p.mensaje as Record<string, unknown> | undefined)?.texto) ?? texto(p.texto)
}

function porQue(d: DecisionDeVinci): string | null {
  const senales = Array.isArray(d.payload?.senales) ? (d.payload!.senales as Array<{ texto?: unknown; puntos?: unknown }>) : []
  const partes = senales
    .slice(0, 3)
    .map((s) => (typeof s.texto === 'string' ? `${s.texto} (+${String(s.puntos)})` : null))
    .filter(Boolean)
  const puntaje = typeof d.payload?.puntaje === 'number' ? `${d.payload.puntaje}/100` : null
  return [puntaje, partes.join('; ')].filter(Boolean).join(': ') || null
}

function Fila({ d, onListo }: { d: DecisionDeVinci; onListo: () => Promise<void> }) {
  const { agency } = useAuth()
  const { isAdmin } = usePermissionsContext()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aceptada, setAceptada] = useState(false)
  const p = d.payload ?? {}

  const correr = async (clave: string, f: () => Promise<unknown>, ok: (r: unknown) => string) => {
    if (!agency?.id) return
    setOcupado(clave)
    try {
      const r = await f()
      toast.success(ok(r))
      await onListo()
    } catch (e) {
      if (e instanceof ErrorDeVinci && e.code === 'ENVIO_APAGADO') {
        toast.message('El envío de Vinci está apagado', {
          description: 'El mensaje sigue listo: escríbele tú y márcalo con «Ya lo contacté».',
        })
      } else {
        toast.error('No se pudo', { description: e instanceof Error ? e.message : undefined })
      }
    } finally {
      setOcupado(null)
    }
  }

  const confirmar = (label: string, outcome: 'upheld' | 'overridden' = 'upheld') => (
    <Button
      type="button"
      size="sm"
      variant={outcome === 'upheld' ? 'outline' : 'ghost'}
      hideArrow
      isLoading={ocupado === `rev:${outcome}`}
      onClick={() => void correr(`rev:${outcome}`, () => revisarDecision(agency!.id, d.id, outcome), () => 'Listo.')}
    >
      {label}
    </Button>
  )

  let titulo = QUE_ES_CADA_DECISION[d.decisionType] ?? d.decisionType
  let acciones: React.ReactNode = confirmar('Confirmar')
  if (d.decisionType === 'propuesta') {
    titulo = `Vinci propone retener a ${nombreDe(d)}`
    acciones = (
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          hideArrow
          isLoading={ocupado === 'hacer'}
          onClick={() => void correr('hacer', () => hacerlo(agency!.id, d.id), (r) => (r as { mensaje: string }).mensaje)}
        >
          Hacerlo
        </Button>
        {confirmar('Descartar', 'overridden')}
      </div>
    )
  } else if (d.decisionType === 'mensaje_listo') {
    titulo = `Mensaje de Vinci listo para ${nombreDe(d)}`
    acciones =
      p.sinContacto === true ? (
        confirmar('Ya lo contacté')
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            hideArrow
            isLoading={ocupado === 'hacer'}
            onClick={() => void correr('hacer', () => hacerlo(agency!.id, d.id), (r) => (r as { mensaje: string }).mensaje)}
          >
            Enviar
          </Button>
          {confirmar('Ya lo contacté')}
        </div>
      )
  } else if (d.decisionType === 'mensaje_no_salio') {
    titulo = `El mensaje de Vinci a ${nombreDe(d)} no salió`
    acciones = confirmar('Enterado')
  } else if (d.decisionType === 'oferta') {
    titulo = `Oferta por aprobar (${String(p.poblacion ?? '')})`
    const incremento = p.tipo === 'congelar_incremento' || p.tipo === 'bajar_incremento'
    acciones = isAdmin ? (
      <div className="flex flex-wrap items-center gap-2">
        {incremento ? (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={aceptada} onChange={(e) => setAceptada(e.target.checked)} />
            El propietario ya aceptó
          </label>
        ) : null}
        <Button
          type="button"
          size="sm"
          hideArrow
          isLoading={ocupado === 'aprobar'}
          onClick={() =>
            void correr('aprobar', () => resolverOferta(agency!.id, d.id, 'aprobar', incremento ? { aceptadaPorElPropietario: aceptada } : {}), () => 'Aprobada: Vinci ya la puede ofrecer.')
          }
        >
          Aprobar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          hideArrow
          isLoading={ocupado === 'rechazar'}
          onClick={() => void correr('rechazar', () => resolverOferta(agency!.id, d.id, 'rechazar'), () => 'Rechazada.')}
        >
          Rechazar
        </Button>
      </div>
    ) : (
      <span className="text-caption text-fg-muted">Cuesta plata: sólo el administrador la aprueba.</span>
    )
  } else if (d.decisionType === 'notified') {
    // 🔴 Fue un correo INTERNO al responsable. Nunca «propietario notificado».
    acciones = confirmar('Enterado')
  }

  const mensaje = textoDelMensaje(d)
  const razon = d.decisionType === 'mensaje_no_salio' ? texto(p.mensaje) : null
  const motivo = texto(p.motivo)
  const causa = porQue(d)
  return (
    <li className="space-y-2 px-4 py-4" data-testid="vinci-por-aprobar">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{titulo}</p>
          <p className="text-caption text-fg-muted">
            {fechaYHora(d.createdAt)}
            {' · '}
            <Link href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(d.caseId)}`} className="text-primary hover:underline">
              ver el caso
            </Link>
          </p>
        </div>
        {acciones}
      </div>
      {causa ? <p className="text-sm text-fg-muted">{causa}</p> : null}
      {mensaje ? <blockquote className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm text-fg">{mensaje}</blockquote> : null}
      {razon ? <p className="text-sm text-fg">{razon}</p> : null}
      {motivo && !razon ? <p className="text-caption text-fg-muted">{motivo}</p> : null}
    </li>
  )
}

export default function RevisionesClient() {
  const { data, isLoading, error, refetch } = useDecisionesDeVinci({ reviewableOnly: true, limit: 100 })
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">Por aprobar · Vinci</h1>
        <p className="text-sm text-fg-muted">
          Lo que Vinci dejó esperando tu clic: propuestas, mensajes listos, ofertas que cuestan plata y mensajes que no salieron.
        </p>
      </header>
      <EstadoDeDatos
        cargando={isLoading && !data}
        error={error}
        vacio={(data?.length ?? 0) === 0}
        queEs="lo que espera tu aprobación"
        onReintentar={() => void refetch()}
        principal
        cuandoVacio={<EmptyState icon={CheckCircle} title="Nada esperando." description="Vinci no tiene nada pendiente de tu clic." />}
      >
        <ul className="divide-y divide-border-faint rounded-lg border border-border bg-surface">
          {(data ?? []).map((d) => (
            <Fila key={d.id} d={d} onListo={refetch} />
          ))}
        </ul>
      </EstadoDeDatos>
    </div>
  )
}
