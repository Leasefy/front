'use client'

/**
 * Retención · Vinci — el tablero.
 *
 * 26-09-2026 (decisiones de Nico sobre Vinci): el tablero mostraba un
 * portafolio de EJEMPLO con el aviso «las rutas no están montadas» —las rutas
 * sí estaban—. Ahora lee las rutas reales del micro: quién está en riesgo con
 * las señales del ERP (propietarios E inquilinos), lo que Vinci ya retuvo, y
 * el umbral que decide quién entra (sólo el administrador lo cambia).
 */
import { useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, CaretRight, HeartStraight, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAuth } from '@/lib/auth'
import { guardarUmbral } from '@/lib/api/retencion'
import { useMetricasDeVinci, useRiesgoDeVinci, useUmbralDeVinci } from '@/lib/hooks/retencion/use-vinci'
import { NOMBRE_DEL_MODO, PuntajeDeVinci, QUE_HACE_EN_CADA_MODO, QUIEN } from '@/components/retencion/vinci'
import { fraseDeLasMetricas, fraseDelRiesgo } from '@/components/retencion/frases'

function Umbral() {
  const { data, isLoading, error, refetch } = useUmbralDeVinci(true)
  const { agency } = useAuth()
  const [umbral, setUmbral] = useState<string>('')
  const [tope, setTope] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const valorUmbral = umbral !== '' ? umbral : data ? String(data.umbral) : ''
  const valorTope = tope !== '' ? tope : data ? String(data.topeDescuentoComisionPct) : ''

  const guardar = async () => {
    if (!agency?.id) return
    const u = Number(valorUmbral)
    const t = Number(valorTope)
    if (!Number.isInteger(u) || u < 0 || u > 100 || !Number.isInteger(t) || t < 0 || t > 100) {
      toast.error('El umbral y el tope van de 0 a 100, en números enteros.')
      return
    }
    setGuardando(true)
    try {
      await guardarUmbral(agency.id, { umbral: u, topeDescuentoComisionPct: t })
      toast.success('Guardado: Vinci usa el nuevo umbral desde ya.')
      setUmbral('')
      setTope('')
      await refetch()
    } catch (e) {
      toast.error('No se pudo guardar', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-label="Umbral de Vinci" className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg">Umbral de riesgo</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Desde este puntaje un propietario o un inquilino entra en riesgo (60 por defecto). Sólo el administrador lo cambia.
      </p>
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el umbral de Vinci" onReintentar={() => void refetch()}>
        <div className="mt-4 grid gap-4 sm:grid-cols-[repeat(2,minmax(0,12rem))_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="vinci-umbral">Umbral (0–100)</Label>
            <Input
              id="vinci-umbral"
              data-testid="vinci-umbral"
              type="number"
              min={0}
              max={100}
              step={1}
              className="font-mono"
              value={valorUmbral}
              onChange={(e) => setUmbral(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vinci-tope">Tope del descuento (% de la comisión)</Label>
            <Input
              id="vinci-tope"
              type="number"
              min={0}
              max={100}
              step={1}
              className="font-mono"
              value={valorTope}
              onChange={(e) => setTope(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => void guardar()} isLoading={guardando} disabled={!data?.guardable} hideArrow>
            Guardar
          </Button>
        </div>
        {data && !data.guardable ? (
          <p className="mt-2 text-caption text-fg-muted">Falta la tabla de configuración de Vinci en esta base: no se puede guardar.</p>
        ) : null}
      </EstadoDeDatos>
    </section>
  )
}

export default function RetencionDashboardPage() {
  const [fresco, setFresco] = useState(false)
  const riesgo = useRiesgoDeVinci(fresco)
  const metricas = useMetricasDeVinci()
  const { isAdmin } = usePermissionsContext()
  const r = riesgo.data
  const urgentes = (r?.casos ?? []).filter((c) => c.enRiesgo).slice(0, 8)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">Retención · Vinci</h1>
        <p className="text-sm text-fg-muted">
          Mide con las señales del ERP —mora de las cuotas, PQRS, mantenimientos, fin del contrato, incremento, giros atrasados—
          quién se puede ir: el propietario que saca su inmueble o el inquilino que no renueva.
        </p>
      </header>

      <EstadoDeDatos
        cargando={riesgo.isLoading && !r}
        error={riesgo.error}
        queEs="el riesgo de retención"
        onReintentar={() => void riesgo.refetch()}
        principal
      >
        {r ? (
          <section aria-label="Resumen" className="space-y-3">
            {!r.disponible ? (
              <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3" role="status">
                <Warning className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="fill" aria-hidden="true" />
                <p className="text-sm text-fg">
                  Vinci no puede medir todavía: faltan datos del ERP ({r.faltan.join(', ')}). No muestra casos inventados.
                </p>
              </div>
            ) : (
              <p className="text-body text-fg" data-testid="vinci-frase">
                {fraseDelRiesgo(r)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {r.modo ? (
                <p className="text-sm text-fg-muted">
                  Piloto en <span className="font-medium text-fg">{NOMBRE_DEL_MODO[r.modo]}</span>. {QUE_HACE_EN_CADA_MODO[r.modo]}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                isLoading={riesgo.isLoading && fresco}
                onClick={() => (fresco ? void riesgo.refetch() : setFresco(true))}
              >
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
                Medir ahora
              </Button>
            </div>
            {!r.envioHabilitado ? (
              <p className="text-caption text-fg-muted" data-testid="vinci-envio-apagado">
                El envío de Vinci está apagado en esta plataforma: aun en Automático, deja el mensaje listo para que lo mandes tú.
              </p>
            ) : null}
          </section>
        ) : null}
      </EstadoDeDatos>

      <section aria-label="Lo que Vinci retuvo" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">Lo retenido</h2>
        <EstadoDeDatos
          cargando={metricas.isLoading && !metricas.data}
          error={metricas.error}
          queEs="lo que Vinci retuvo"
          onReintentar={() => void metricas.refetch()}
        >
          {metricas.data ? (
            <p className="mt-2 text-sm text-fg" data-testid="vinci-metricas">
              {fraseDeLasMetricas(metricas.data)}
            </p>
          ) : null}
        </EstadoDeDatos>
      </section>

      {isAdmin ? <Umbral /> : null}

      {r?.disponible ? (
        <section aria-label="Lo más urgente">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg">Lo más urgente</h2>
            <Link href="/panel/inmobiliaria/contratos/riesgo" className="text-sm font-medium text-primary hover:underline">
              Ver todos los casos
            </Link>
          </div>
          <div className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
            {urgentes.map((c) => (
              <Link
                key={c.caseId}
                href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(c.caseId)}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {c.nombre ?? 'Sin nombre registrado'} <span className="text-fg-muted">· {QUIEN[c.poblacion]}</span>
                  </p>
                  <p className="truncate text-caption text-fg-muted">
                    {c.senales
                      .slice(0, 2)
                      .map((s) => `${s.texto} (+${s.puntos})`)
                      .join(' · ')}
                  </p>
                </div>
                <PuntajeDeVinci puntaje={c.puntaje} enRiesgo={c.enRiesgo} />
                <CaretRight size={16} className="shrink-0 text-fg-subtle" />
              </Link>
            ))}
            {urgentes.length === 0 ? (
              <EmptyState
                icon={HeartStraight}
                title="Nadie pasa el umbral hoy."
                description="Con las señales del ERP de hoy, ningún propietario ni inquilino llega al umbral de riesgo."
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
