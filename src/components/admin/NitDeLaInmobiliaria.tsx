'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Alert, KeyValueList, MonoLabel, Presence } from '@leasefy/cadence'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { LoadingBlock } from '@/components/admin/screen/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <Tarjeta titulo="NIT" aria-busy="true">
        <LoadingBlock label="Cargando el NIT" filas={2} suelto={false} />
      </Tarjeta>
    )
  }
  if (consulta.error && !datos) {
    return (
      <Tarjeta titulo="NIT">
        <div className="space-y-3">
          <Alert variant="danger">
            No pudimos leer el NIT de esta inmobiliaria: {mensajeDelFallo(consulta.error, 'leer el NIT')}
          </Alert>
          <Button variant="outline" size="sm" hideArrow onClick={consulta.refetch}>
            Reintentar
          </Button>
        </div>
      </Tarjeta>
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
      setFallo(mensajeDelFallo(err, 'corregir el NIT'))
      setConfirmando(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta
      titulo={<span id="nit-titulo">NIT</span>}
      descripcion="La inmobiliaria no puede cambiarlo en Configuración. Si lo escribió mal, se corrige aquí y queda registrado quién lo cambió, cuándo y de qué a qué."
      aria-labelledby="nit-titulo"
    >
      <div className="space-y-5">
        <KeyValueList
          items={[
            {
              label: 'NIT en Leasefy',
              value: (
                <span className="font-mono tabular-nums text-fg" data-testid="nit-en-leasefy">
                  {datos.nit ?? 'Sin NIT'}
                </span>
              ),
            },
            {
              label: 'En el micro de agentes',
              value: (
                <span className="flex items-center justify-end gap-2 font-mono tabular-nums text-fg" data-testid="nit-en-el-micro">
                  {!datos.microLeido ? (
                    <span className="font-body text-fg-subtle">no se pudo leer</span>
                  ) : datos.nitEnElMicro === null ? (
                    <span className="font-body text-fg-subtle">no la tiene (todavía no está activa)</span>
                  ) : (
                    datos.nitEnElMicro
                  )}
                  {distintoEnElMicro && <Pill tone="warn">distinto</Pill>}
                </span>
              ),
            },
          ]}
        />

        <Presence show={Boolean(resultado)}>
          {resultado ? (
            <Alert
              role="status"
              variant={resultado.tono === 'ok' ? 'success' : 'warning'}
              className={resultado.tono === 'ok' ? 'text-success' : 'text-warning'}
            >
              {resultado.texto}
            </Alert>
          ) : null}
        </Presence>

        {!editando ? (
          <Button variant="outline" hideArrow onClick={abrir}>
            Corregir NIT
          </Button>
        ) : (
          <form onSubmit={revisar} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nit-nuevo">NIT correcto</Label>
              <Input
                id="nit-nuevo"
                className="max-w-xs font-mono"
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
              <p id="nit-ayuda" className={`text-caption ${tocado && errorDelCampo ? 'text-danger' : 'text-fg-subtle'}`}>
                {tocado && errorDelCampo
                  ? errorDelCampo
                  : 'Sin puntos ni espacios. El dígito de verificación va después del guion y es opcional.'}
              </p>
            </div>

            {!confirmando ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" hideArrow>
                  Revisar el cambio
                </Button>
                <Button type="button" variant="outline" hideArrow onClick={cerrar}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Alert variant="warning" title="Confirma el cambio" role="region" aria-label="Confirmar el cambio del NIT">
                <div className="space-y-3 text-fg">
                  <p>
                    Vas a cambiar el NIT de {datos.nombre} de <span className="font-mono">{datos.nit ?? 'ninguno'}</span> a{' '}
                    <span className="font-mono">{nuevo.trim()}</span>. Queda registrado con tu correo.
                  </p>
                  <p className="text-fg-muted">
                    No cambia lo que ya salió con el NIT anterior: facturas electrónicas ya transmitidas, contratos y
                    mandatos firmados, ni documentos guardados. La facturación electrónica (FEEL) y los bancos tienen a
                    la empresa registrada por su NIT: eso se actualiza aparte.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" hideArrow isLoading={guardando} disabled={guardando} onClick={() => void guardar()}>
                      {guardando ? 'Guardando…' : 'Sí, cambiar el NIT'}
                    </Button>
                    <Button type="button" variant="outline" hideArrow disabled={guardando} onClick={() => setConfirmando(false)}>
                      Volver
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
          </form>
        )}

        {fallo && <Alert variant="danger">{fallo}</Alert>}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MonoLabel>Correcciones</MonoLabel>
            <Link
              href={`/admin/audit-explorer?action=${encodeURIComponent(ACCION_CORREGIR_NIT)}&entityId=${encodeURIComponent(datos.agencyId)}`}
              className="group inline-flex items-center gap-1 text-body-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Ver en el buscador de auditoría
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          {!datos.cambiosLeidos ? (
            <p className="text-body-sm text-warning">No se pudo leer la bitácora: no sabemos si hubo correcciones antes.</p>
          ) : datos.cambios.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Nadie ha corregido este NIT desde el admin.</p>
          ) : (
            <ul className="divide-y divide-border-faint rounded-md border border-border" data-testid="cambios-del-nit">
              {datos.cambios.map((c) => (
                <li key={`${c.cuando}-${c.despues}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-body-sm">
                  <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(c.cuando)}</span>
                  <span className="text-fg-muted">{c.quien ?? '—'}</span>
                  <span className="font-mono text-fg">
                    {c.antes ?? 'sin NIT'} → {c.despues ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Tarjeta>
  )
}
