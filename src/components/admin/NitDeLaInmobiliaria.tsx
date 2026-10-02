'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import {
  ACCION_CORREGIR_NIT,
  corregirNit,
  errorDelNit,
  mensajeDelFallo,
  resultadoDeLaCorreccion,
  verNit,
  type CorreccionDelNit,
} from '@/lib/admin/nit'

/**
 * Corregir el NIT de una inmobiliaria (02-10-2026, Nico).
 *
 * En Configuración el NIT queda bloqueado después del registro («contacta al
 * soporte de Leasefy»). Esto es ese soporte: vive en el detalle de la
 * inmobiliaria (`/admin/tenants/:tenantId`, cuyo id ES el `Agency.id` del
 * back). Muestra el NIT de Leasefy y el que tiene el micro de agentes, deja
 * corregirlo con confirmación —mismo patrón que `RestablecerSegundoFactor`— y
 * lista las correcciones anteriores con quién y cuándo (la bitácora del
 * admin, `agency.nit.update`).
 */
export function NitDeLaInmobiliaria({ tenantId }: { tenantId: string }) {
  const consulta = useApiQuery((signal) => verNit(tenantId, signal), [tenantId])
  const [ultima, setUltima] = useState<CorreccionDelNit | null>(null)
  const datos = ultima ?? consulta.data

  const [editando, setEditando] = useState(false)
  const [nuevo, setNuevo] = useState('')
  const [tocado, setTocado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  if (consulta.isLoading && !datos) {
    return (
      <section className="card p-5" aria-busy="true">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">nit</div>
        <p className="text-sm text-fg-muted mt-2">Cargando el NIT…</p>
      </section>
    )
  }
  if (consulta.error && !datos) {
    return (
      <section className="card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">nit</div>
        <p role="alert" className="text-sm text-bad mt-2">
          No pudimos leer el NIT de esta inmobiliaria: {mensajeDelFallo(consulta.error)}
        </p>
        <button type="button" className="btn mt-3" onClick={consulta.refetch}>
          Reintentar
        </button>
      </section>
    )
  }
  if (!datos) return null

  const errorDelCampo = errorDelNit(nuevo)
  const resultado = ultima ? resultadoDeLaCorreccion(ultima) : null
  const distintoEnElMicro =
    datos.microLeido && datos.nitEnElMicro !== null && datos.nitEnElMicro !== datos.nit

  function abrir() {
    setNuevo(datos?.nit ?? '')
    setTocado(false)
    setConfirmando(false)
    setFallo(null)
    setUltima(null)
    setEditando(true)
  }

  function cerrar() {
    setEditando(false)
    setConfirmando(false)
    setFallo(null)
  }

  function revisar(e: FormEvent) {
    e.preventDefault()
    setTocado(true)
    if (errorDelCampo) return
    setFallo(null)
    setConfirmando(true)
  }

  async function guardar() {
    setGuardando(true)
    setFallo(null)
    try {
      setUltima(await corregirNit(tenantId, nuevo))
      setEditando(false)
      setConfirmando(false)
    } catch (err) {
      setFallo(mensajeDelFallo(err))
      setConfirmando(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="card p-5 space-y-4" aria-labelledby="nit-titulo">
      <div>
        <div id="nit-titulo" className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          nit · corrección del backoffice
        </div>
        <p className="text-xs text-fg-muted mt-1">
          La inmobiliaria no puede cambiarlo en Configuración. Si lo escribió mal, se corrige acá y queda
          registrado quién lo cambió, cuándo y de qué a qué.
        </p>
      </div>

      <dl className="divide-y divide-bg-border border border-bg-border">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <dt className="text-fg-muted">NIT en Leasefy</dt>
          <dd className="font-mono tabular-nums text-fg" data-testid="nit-en-leasefy">
            {datos.nit ?? 'Sin NIT'}
          </dd>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <dt className="text-fg-muted">En el micro de agentes</dt>
          <dd className="font-mono tabular-nums text-fg flex items-center gap-2" data-testid="nit-en-el-micro">
            {!datos.microLeido
              ? <span className="text-fg-subtle">no se pudo leer</span>
              : datos.nitEnElMicro === null
                ? <span className="text-fg-subtle">no la tiene (todavía no está activa)</span>
                : datos.nitEnElMicro}
            {distintoEnElMicro && <Pill tone="warn">distinto</Pill>}
          </dd>
        </div>
      </dl>

      {resultado && (
        <p role="status" className={`text-sm ${resultado.tono === 'ok' ? 'text-ok' : 'text-warn'}`}>
          {resultado.texto}
        </p>
      )}

      {!editando ? (
        <button type="button" className="btn" onClick={abrir}>
          Corregir NIT
        </button>
      ) : (
        <form onSubmit={revisar} noValidate className="space-y-3">
          <div>
            <label htmlFor="nit-nuevo" className="block text-xs text-fg-muted mb-1">
              NIT correcto
            </label>
            <input
              id="nit-nuevo"
              className="input max-w-xs font-mono"
              inputMode="numeric"
              autoComplete="off"
              placeholder="900123456-8"
              value={nuevo}
              aria-invalid={tocado && errorDelCampo ? true : undefined}
              aria-describedby="nit-ayuda"
              disabled={confirmando || guardando}
              onChange={(e) => {
                setNuevo(e.target.value)
                setFallo(null)
              }}
              onBlur={() => setTocado(true)}
            />
            <p id="nit-ayuda" className={`text-xs mt-1 ${tocado && errorDelCampo ? 'text-bad' : 'text-fg-subtle'}`}>
              {tocado && errorDelCampo
                ? errorDelCampo
                : 'Sin puntos ni espacios. El dígito de verificación va después del guion y es opcional.'}
            </p>
          </div>

          {!confirmando ? (
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Revisar el cambio
              </button>
              <button type="button" className="btn" onClick={cerrar}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="card p-3 border-warn/40">
              <p className="text-sm text-fg mb-2">
                Vas a cambiar el NIT de {datos.nombre} de{' '}
                <span className="font-mono">{datos.nit ?? 'ninguno'}</span> a{' '}
                <span className="font-mono">{nuevo.trim()}</span>. Queda registrado con tu correo.
              </p>
              <p className="text-xs text-fg-muted mb-3">
                No cambia lo que ya salió con el NIT anterior: facturas electrónicas ya transmitidas, contratos y
                mandatos firmados, ni documentos guardados. La facturación electrónica (FEEL) y los bancos tienen
                a la empresa registrada por su NIT: eso se actualiza aparte.
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" disabled={guardando} onClick={() => void guardar()}>
                  {guardando ? 'Guardando…' : 'Sí, cambiar el NIT'}
                </button>
                <button type="button" className="btn" disabled={guardando} onClick={() => setConfirmando(false)}>
                  Volver
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {fallo && (
        <p role="alert" className="text-sm text-bad">
          {fallo}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">correcciones</div>
          <Link
            href={`/admin/audit-explorer?action=${encodeURIComponent(ACCION_CORREGIR_NIT)}&entityId=${encodeURIComponent(datos.agencyId)}`}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
          >
            ver en audit search →
          </Link>
        </div>
        {!datos.cambiosLeidos ? (
          <p className="text-xs text-warn">No se pudo leer la bitácora: no sabemos si hubo correcciones antes.</p>
        ) : datos.cambios.length === 0 ? (
          <p className="text-xs text-fg-muted">Nadie ha corregido este NIT desde el backoffice.</p>
        ) : (
          <ul className="divide-y divide-bg-border border border-bg-border" data-testid="cambios-del-nit">
            {datos.cambios.map((c) => (
              <li key={`${c.cuando}-${c.despues}`} className="px-4 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="tabular-nums text-fg-muted whitespace-nowrap">{fmtDateTime(c.cuando)}</span>
                <span className="text-fg-muted">{c.quien ?? '—'}</span>
                <span className="font-mono text-fg">
                  {c.antes ?? 'sin NIT'} → {c.despues ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
