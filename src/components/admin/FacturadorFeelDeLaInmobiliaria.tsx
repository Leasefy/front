'use client'

import { useState, type FormEvent } from 'react'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import {
  errorDelToken,
  estadoDelFacturador,
  guardarFacturador,
  mensajeDelFalloDelFacturador,
  probarFacturador,
  quitarFacturador,
  verFacturador,
  type AmbienteDelFacturador,
  type FacturadorFeelDeLaInmobiliaria as Datos,
} from '@/lib/admin/facturador-feel'

/**
 * DIAN-FEEL (04-10-2026) — la inmobiliaria dentro de la cuenta de FEEL de
 * Leasefy (Nico: «una sola cuenta FEEL de Leasefy que transmite por todas las
 * inmobiliarias»).
 *
 * En FEEL el emisor lo fija el token: cada inmobiliaria es un FACTURADOR de la
 * cuenta de Leasefy, con su propio token. El equipo de Leasefy lo da de alta en
 * FEEL (con el NIT y la resolución de la inmobiliaria), lo pega acá y lo
 * prueba. La inmobiliaria nunca ve ni escribe credenciales: ve los pasos en
 * Configuración → Facturación.
 *
 *   · Guardar: ambiente, token (se guarda cifrado y no vuelve) y el NIT con el
 *     que se dio de alta — tiene que ser el de la inmobiliaria.
 *   · Probar: `GetNumeracion(FA)`, sólo lectura. Guarda el prefijo que FEEL
 *     tiene y dice si coincide con las resoluciones cargadas.
 *   · Quitar: lo de esta inmobiliaria deja de transmitirse.
 */
export function FacturadorFeelDeLaInmobiliaria({ tenantId }: { tenantId: string }) {
  const consulta = useApiQuery((signal) => verFacturador(tenantId, signal), [tenantId])
  const [ultima, setUltima] = useState<Datos | null>(null)
  const datos = ultima ?? consulta.data

  const [editando, setEditando] = useState(false)
  const [ambiente, setAmbiente] = useState<AmbienteDelFacturador>('SANDBOX')
  const [token, setToken] = useState('')
  const [nit, setNit] = useState('')
  const [tocado, setTocado] = useState(false)
  const [trabajando, setTrabajando] = useState<null | 'guardar' | 'probar' | 'quitar'>(null)
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const titulo = (
    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
      facturación electrónica · cuenta de FEEL de Leasefy
    </div>
  )

  if (consulta.isLoading && !datos) {
    return (
      <section className="card p-5" aria-busy="true">
        {titulo}
        <p className="text-sm text-fg-muted mt-2">Cargando el facturador…</p>
      </section>
    )
  }
  if (consulta.error && !datos) {
    return (
      <section className="card p-5">
        {titulo}
        <p role="alert" className="text-sm text-bad mt-2">
          No pudimos leer el facturador: {mensajeDelFalloDelFacturador(consulta.error, 'leer el facturador')}
        </p>
        <button type="button" className="btn mt-3" onClick={consulta.refetch}>
          Reintentar
        </button>
      </section>
    )
  }
  if (!datos) return null

  const f = datos.facturador
  const errorDelCampo = errorDelToken(token)

  function abrir() {
    setAmbiente((f?.ambiente as AmbienteDelFacturador) ?? 'SANDBOX')
    setToken('')
    setNit(datos?.inmobiliaria.nit ?? '')
    setTocado(false)
    setFallo(null)
    setEditando(true)
  }

  async function hacer(que: 'guardar' | 'probar' | 'quitar', trabajo: () => Promise<Datos>, accion: string) {
    setTrabajando(que)
    setFallo(null)
    try {
      setUltima(await trabajo())
      if (que === 'guardar') {
        setEditando(false)
        setToken('')
      }
      if (que === 'quitar') setConfirmandoQuitar(false)
    } catch (err) {
      setFallo(mensajeDelFalloDelFacturador(err, accion))
    } finally {
      setTrabajando(null)
    }
  }

  function guardar(e: FormEvent) {
    e.preventDefault()
    setTocado(true)
    if (errorDelCampo || !nit.trim()) return
    void hacer(
      'guardar',
      () => guardarFacturador(tenantId, { ambiente, tokenIdentificador: token, nitDelFacturador: nit }),
      'guardar el facturador',
    )
  }

  const estado = f ? estadoDelFacturador(f.estado) : null

  return (
    <section className="card p-5 space-y-4" aria-labelledby="facturador-titulo" data-testid="facturador-feel">
      <div id="facturador-titulo">
        {titulo}
        <p className="text-xs text-fg-muted mt-1">
          Cada inmobiliaria transmite como un facturador dentro de la cuenta de FEEL de Leasefy. Dalo de alta en FEEL con
          su NIT y su resolución, pega acá el token que FEEL le dio y pruébalo. La inmobiliaria no ve el token.
        </p>
      </div>

      {!datos.disponible && (
        <p className="text-sm text-warn">
          Falta la migración {datos.migracion} en esta base: todavía no se puede guardar un facturador.
        </p>
      )}
      {!datos.feelPrendido && (
        <p className="text-xs text-warn" data-testid="feel-apagado">
          La transmisión está apagada en el servidor (FEEL_ENABLED). Se puede registrar y probar; las facturas quedan en
          cola hasta que se prenda.
        </p>
      )}

      <dl className="divide-y divide-bg-border border border-bg-border">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <dt className="text-fg-muted">Inmobiliaria</dt>
          <dd className="text-fg text-right">
            {datos.inmobiliaria.razonSocial ?? datos.inmobiliaria.nombre} ·{' '}
            <span className="font-mono">{datos.inmobiliaria.nit ?? 'sin NIT'}</span>
          </dd>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <dt className="text-fg-muted">Facturador</dt>
          <dd className="text-fg flex items-center gap-2" data-testid="facturador-estado">
            {f ? (
              <>
                <span className="font-mono">{f.ambiente === 'PRODUCCION' ? 'producción' : 'pruebas'}</span>
                <span className="font-mono text-fg-subtle">token …{f.finalDelToken}</span>
                {estado && <Pill tone={estado.tono}>{estado.texto}</Pill>}
              </>
            ) : (
              <span className="text-fg-subtle">sin registrar</span>
            )}
          </dd>
        </div>
        {f && (
          <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
            <dt className="text-fg-muted">Prefijo en FEEL</dt>
            <dd className="font-mono text-fg" data-testid="facturador-prefijo">
              {f.prefijoFa ?? '—'}
              {f.ultimaPruebaAt && (
                <span className="text-fg-subtle"> · probado {fmtDateTime(f.ultimaPruebaAt)}</span>
              )}
            </dd>
          </div>
        )}
        {f?.estado === 'FALLO' && f.ultimoError && (
          <div className="px-4 py-2.5 text-xs text-bad">{f.ultimoError}</div>
        )}
      </dl>

      {datos.resoluciones.length > 0 && (
        <ul className="text-xs space-y-1" data-testid="facturador-resoluciones">
          {datos.resoluciones.map((r) => (
            <li key={`${r.numero}-${r.prefijo}`} className="flex items-center gap-2">
              <span className="font-mono text-fg">
                {r.numero} · {r.prefijo || 'sin prefijo'}
              </span>
              {r.coincideConFeel === true && <Pill tone="ok">coincide con FEEL</Pill>}
              {r.coincideConFeel === false && <Pill tone="warn">no es la de FEEL</Pill>}
            </li>
          ))}
        </ul>
      )}

      {!editando ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={abrir} disabled={!datos.disponible || trabajando !== null}>
            {f ? 'Cambiar el token' : 'Registrar el facturador'}
          </button>
          {f && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={trabajando !== null}
              onClick={() => void hacer('probar', () => probarFacturador(tenantId), 'probar la conexión')}
              data-testid="facturador-probar"
            >
              {trabajando === 'probar' ? 'Probando…' : 'Probar la conexión'}
            </button>
          )}
          {f && !confirmandoQuitar && (
            <button type="button" className="btn" disabled={trabajando !== null} onClick={() => setConfirmandoQuitar(true)}>
              Quitar
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={guardar} noValidate className="space-y-3" data-testid="facturador-formulario">
          <div className="flex flex-wrap gap-4">
            <label className="text-xs text-fg-muted flex items-center gap-1.5">
              <input
                type="radio"
                name="ambiente"
                checked={ambiente === 'SANDBOX'}
                onChange={() => setAmbiente('SANDBOX')}
              />
              Pruebas (habilitación)
            </label>
            <label className="text-xs text-fg-muted flex items-center gap-1.5">
              <input
                type="radio"
                name="ambiente"
                checked={ambiente === 'PRODUCCION'}
                onChange={() => setAmbiente('PRODUCCION')}
              />
              Producción
            </label>
          </div>
          {ambiente === 'PRODUCCION' && !datos.urlProduccion && (
            <p className="text-xs text-warn">El servidor no tiene la dirección de FEEL de producción: la prueba va a fallar.</p>
          )}
          {ambiente === 'SANDBOX' && !datos.urlSandbox && (
            <p className="text-xs text-warn">El servidor no tiene la dirección de FEEL de pruebas: la prueba va a fallar.</p>
          )}
          <div>
            <label htmlFor="facturador-token" className="block text-xs text-fg-muted mb-1">
              Token del facturador (TokenIdentificador)
            </label>
            <input
              id="facturador-token"
              type="password"
              className="input max-w-md font-mono"
              autoComplete="off"
              value={token}
              aria-invalid={tocado && errorDelCampo ? true : undefined}
              aria-describedby="facturador-token-ayuda"
              onChange={(e) => {
                setToken(e.target.value)
                setFallo(null)
              }}
              onBlur={() => setTocado(true)}
            />
            <p
              id="facturador-token-ayuda"
              className={`text-xs mt-1 ${tocado && errorDelCampo ? 'text-bad' : 'text-fg-subtle'}`}
            >
              {tocado && errorDelCampo ? errorDelCampo : 'Se guarda cifrado; nadie lo vuelve a ver.'}
            </p>
          </div>
          <div>
            <label htmlFor="facturador-nit" className="block text-xs text-fg-muted mb-1">
              NIT con el que se dio de alta en FEEL
            </label>
            <input
              id="facturador-nit"
              className="input max-w-xs font-mono"
              inputMode="numeric"
              autoComplete="off"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
            />
            <p className="text-xs mt-1 text-fg-subtle">Tiene que ser el NIT de la inmobiliaria.</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={trabajando !== null}>
              {trabajando === 'guardar' ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="btn" onClick={() => setEditando(false)} disabled={trabajando !== null}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {confirmandoQuitar && (
        <div className="card p-3 border-warn/40">
          <p className="text-sm text-fg mb-2">
            Si quitas el facturador, lo que emita {datos.inmobiliaria.nombre} queda en cola sin transmitirse a la DIAN
            hasta que lo vuelvas a registrar.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={trabajando !== null}
              onClick={() => void hacer('quitar', () => quitarFacturador(tenantId), 'quitar el facturador')}
            >
              {trabajando === 'quitar' ? 'Quitando…' : 'Sí, quitarlo'}
            </button>
            <button type="button" className="btn" disabled={trabajando !== null} onClick={() => setConfirmandoQuitar(false)}>
              Volver
            </button>
          </div>
        </div>
      )}

      {fallo && (
        <p role="alert" className="text-sm text-bad">
          {fallo}
        </p>
      )}
    </section>
  )
}
