'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  EL_ESTADO,
  ESTADOS_DEL_PILOTO,
  cambiarElPiloto,
  listarElPiloto,
  mensajeDelFalloDelPiloto,
  type EstadoDelPilotoPorLeasefy,
  type PilotoDeLaInmobiliaria,
} from '@/lib/admin/piloto-de-las-inmobiliarias'

const cuando = (iso: string | null) => {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? 'nunca'
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
}

const tono = (e: EstadoDelPilotoPorLeasefy) => (e === 'contratado' ? 'ok' : e === 'apagado' ? 'bad' : 'info')

/** Lo que se está cambiando: la inmobiliaria, a qué estado y el motivo (obligatorio). */
interface Cambio {
  fila: PilotoDeLaInmobiliaria
  estado: EstadoDelPilotoPorLeasefy
  motivo: string
}

/**
 * /admin/piloto — el Piloto automático de cada inmobiliaria (ACT-09, Nico
 * 05-10-2026). Leasefy lo deja en prueba, contratado o apagado, con un motivo
 * que queda en la bitácora. Es el único lugar donde se cambia el plan del
 * Piloto: la pantalla de la inmobiliaria sólo lo prende y lo apaga dentro de lo
 * que Leasefy deja.
 */
export default function PilotoDeLasInmobiliariasPage() {
  const { data, isLoading, error, refetch } = useApiQuery<PilotoDeLaInmobiliaria[]>((signal) => listarElPiloto(signal), [])
  const [buscar, setBuscar] = useState('')
  const [cambio, setCambio] = useState<Cambio | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  const filas = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (data ?? []).filter((f) => !q || f.legal_name.toLowerCase().includes(q))
  }, [data, buscar])

  const conteo = useMemo(() => {
    const c = { prueba: 0, contratado: 0, apagado: 0, activos: 0 }
    for (const f of data ?? []) {
      c[f.estado] += 1
      if (f.activo) c.activos += 1
    }
    return c
  }, [data])

  const motivoValido = (cambio?.motivo.trim().length ?? 0) >= 5

  async function guardar() {
    if (!cambio || !motivoValido) return
    setGuardando(true)
    setFallo(null)
    try {
      const nueva = await cambiarElPiloto(cambio.fila.tenant_id, cambio.estado, cambio.motivo.trim())
      setHecho(`${nueva.legal_name}: ${EL_ESTADO[nueva.estado].nombre.toLowerCase()}. ${nueva.detalle}`)
      setCambio(null)
      refetch()
    } catch (err) {
      setFallo(mensajeDelFalloDelPiloto(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl" data-testid="admin-piloto">
      <PageHeader
        label="37 · piloto"
        title="Piloto automático"
        description="El Piloto automático de cada inmobiliaria: en prueba (30 días), contratado (sin vencimiento) o apagado por Leasefy. Cada cambio pide un motivo y queda en la bitácora con quién lo hizo."
      />

      {!isLoading && data && (
        <p className="text-sm text-fg-muted mb-4" data-testid="admin-piloto-conteo">
          {data.length} inmobiliarias · {conteo.activos} con el Piloto encendido · {conteo.prueba} en prueba ·{' '}
          {conteo.contratado} contratado · {conteo.apagado} apagado por Leasefy
        </p>
      )}

      {hecho && (
        <div className="card p-4 border-l-4 border-l-ok mb-4" role="status" data-testid="admin-piloto-hecho">
          <p className="text-sm text-fg">{hecho}</p>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <ErrorBlock error={mensajeDelFalloDelPiloto(error)} />
        </div>
      )}

      <label className="block mb-4 max-w-sm">
        <span className="sr-only">Buscar una inmobiliaria</span>
        <input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar una inmobiliaria"
          className="w-full border border-bg-border bg-bg-surface px-3 py-2 text-sm"
          data-testid="admin-piloto-buscar"
        />
      </label>

      {isLoading ? (
        <LoadingBlock label="cargando inmobiliarias" />
      ) : filas.length === 0 ? (
        <EmptyBlock title={buscar ? 'Ninguna inmobiliaria con ese nombre.' : 'Todavía no hay inmobiliarias.'} />
      ) : (
        <div className="space-y-px">
          {filas.map((f) => (
            <div key={f.tenant_id} className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center" data-testid={`admin-piloto-fila-${f.tenant_id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-fg">{f.legal_name}</span>
                  <Pill tone={tono(f.estado)}>{EL_ESTADO[f.estado].nombre}</Pill>
                  <Pill tone={f.activo ? 'ok' : 'muted'}>{f.activo ? 'encendido' : 'sin encender'}</Pill>
                </div>
                <p className="text-[13px] text-fg-muted mt-1" data-testid={`admin-piloto-detalle-${f.tenant_id}`}>{f.detalle}</p>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-1">
                  últ. cambio: {cuando(f.updated_at)}
                  {f.updated_by ? ` · ${f.updated_by}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Cambiar el Piloto de ${f.legal_name}`}>
                {ESTADOS_DEL_PILOTO.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="btn btn-sm"
                    aria-pressed={f.estado === e}
                    disabled={guardando}
                    onClick={() => {
                      setHecho(null)
                      setFallo(null)
                      setCambio({ fila: f, estado: e, motivo: '' })
                    }}
                    data-testid={`admin-piloto-${e}-${f.tenant_id}`}
                  >
                    {EL_ESTADO[e].nombre}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {cambio && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-piloto-confirmar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="admin-piloto-confirmar"
        >
          <div className="card w-full max-w-lg p-5 space-y-3 bg-bg-surface">
            <h2 id="admin-piloto-confirmar-titulo" className="text-base font-medium text-fg">
              ¿Dejar el Piloto de {cambio.fila.legal_name} en «{EL_ESTADO[cambio.estado].nombre}»?
            </h2>
            <p className="text-sm text-fg-muted">{EL_ESTADO[cambio.estado].queHace}</p>
            <p className="text-sm text-fg-muted">Hoy: {cambio.fila.detalle}</p>
            <label className="block">
              <span className="text-sm text-fg">Motivo (queda en la bitácora)</span>
              <textarea
                value={cambio.motivo}
                onChange={(e) => setCambio({ ...cambio, motivo: e.target.value })}
                maxLength={500}
                rows={3}
                className="mt-1 w-full border border-bg-border bg-bg-surface px-3 py-2 text-sm"
                data-testid="admin-piloto-motivo"
              />
              {!motivoValido && <span className="text-xs text-fg-muted">Escribe al menos 5 letras.</span>}
            </label>
            {fallo && (
              <p className="text-sm text-bad" role="alert" data-testid="admin-piloto-fallo">
                {fallo}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setCambio(null)} disabled={guardando}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void guardar()}
                disabled={!motivoValido || guardando}
                data-testid="admin-piloto-guardar"
              >
                {guardando ? 'Guardando…' : 'Sí, cambiarlo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
