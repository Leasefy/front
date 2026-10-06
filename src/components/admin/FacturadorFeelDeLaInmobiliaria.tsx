'use client'

import { useState, type FormEvent } from 'react'
import { useHidratado } from '@/lib/hooks/use-hidratado'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import {
  NOMBRE_DEL_TIPO,
  TIPOS_DEL_FACTURADOR,
  errorDelToken,
  estadoDelFacturador,
  guardarFacturador,
  mensajeDelFalloDelFacturador,
  probarFacturador,
  quitarFacturador,
  verFacturador,
  type AmbienteDelFacturador,
  type FacturadorFeelDeLaInmobiliaria as Datos,
  type TipoDelFacturador,
  type VistaDelFacturador,
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
 *
 * QA-FACT-CONTA-95 (05-10-2026), decisión de Nico n.º 6: «varios prefijos, uno
 * por resolución». En FEEL un token = un facturador = UNA numeración, así que
 * una inmobiliaria con la resolución de la comisión aparte necesita otro
 * facturador para ella. Debajo del de «cualquier tipo» van los de un tipo de
 * documento (canon, comisión, otros), cada uno con su token, su prueba y su
 * «Quitar». La emisión escoge el token por el tipo de la factura.
 */
export function FacturadorFeelDeLaInmobiliaria({ tenantId }: { tenantId: string }) {
  const consulta = useApiQuery((signal) => verFacturador(tenantId, signal), [tenantId])
  const [ultima, setUltima] = useState<Datos | null>(null)
  const datos = ultima ?? consulta.data
  const [agregando, setAgregando] = useState<TipoDelFacturador | null>(null)
  const [eligiendo, setEligiendo] = useState(false)

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

  const porTipo = datos.facturadoresPorTipo ?? []
  const libres = TIPOS_DEL_FACTURADOR.filter((t) => !porTipo.some((f) => f.tipoDeDocumento === t))
  const cambio = (d: Datos) => {
    setUltima(d)
    setAgregando(null)
  }

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
      </dl>

      <BloqueDelFacturador tenantId={tenantId} tipo={null} facturador={datos.facturador} datos={datos} onCambio={cambio} />

      {datos.resoluciones.length > 0 && (
        <ul className="text-xs space-y-1" data-testid="facturador-resoluciones">
          {datos.resoluciones.map((r) => (
            <li key={`${r.numero}-${r.prefijo}`} className="flex items-center gap-2">
              <span className="font-mono text-fg">
                {r.numero} · {r.prefijo || 'sin prefijo'}
              </span>
              {r.coincideConFeel === true && <Pill tone="ok">coincide con FEEL</Pill>}
              {r.coincideConFeel === false && <Pill tone="warn">ningún facturador de FEEL la tiene</Pill>}
            </li>
          ))}
        </ul>
      )}

      {/* QA-FACT-CONTA-95: un facturador por resolución (por tipo de documento). */}
      {(porTipo.length > 0 || datos.porTipoDisponible !== undefined) && (
        <div className="space-y-3 border-t border-bg-border pt-4" data-testid="facturadores-por-tipo">
          <div>
            <div className="text-sm text-fg">Facturadores por tipo de documento</div>
            <p className="text-xs text-fg-muted mt-0.5">
              En FEEL cada resolución, con su prefijo, es un facturador aparte con su propio token. Si la inmobiliaria
              numera la comisión (u otro tipo) con otra resolución, regístrala acá: esas facturas salen con su token y
              las demás con el de arriba.
            </p>
          </div>
          {porTipo.map((f) => (
            <BloqueDelFacturador
              key={f.tipoDeDocumento}
              tenantId={tenantId}
              tipo={f.tipoDeDocumento}
              facturador={f}
              datos={datos}
              onCambio={cambio}
            />
          ))}
          {agregando && (
            <BloqueDelFacturador
              tenantId={tenantId}
              tipo={agregando}
              facturador={null}
              datos={datos}
              onCambio={cambio}
              abiertoAlEmpezar
              onCancelar={() => setAgregando(null)}
            />
          )}
          {!agregando && libres.length > 0 && datos.porTipoDisponible && (
            eligiendo ? (
              <div className="flex flex-wrap items-center gap-2" data-testid="facturador-elegir-tipo">
                <span className="text-xs text-fg-muted">¿Para qué tipo de factura?</span>
                {libres.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAgregando(t)
                      setEligiendo(false)
                    }}
                  >
                    {NOMBRE_DEL_TIPO[t]}
                  </button>
                ))}
                <button type="button" className="btn" onClick={() => setEligiendo(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="btn" onClick={() => setEligiendo(true)} data-testid="facturador-agregar-tipo">
                Agregar el facturador de un tipo de documento
              </button>
            )
          )}
          {datos.porTipoDisponible === false && (
            <p className="text-xs text-warn">
              Falta la migración {datos.migracionPorTipo} en esta base: por ahora sólo hay un facturador por inmobiliaria.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Un facturador: el general (`tipo` = null, con los ids de siempre) o el de un
 * tipo de documento (ids con el tipo). Registrar / cambiar el token, probar y
 * quitar.
 */
function BloqueDelFacturador({
  tenantId,
  tipo,
  facturador: f,
  datos,
  onCambio,
  abiertoAlEmpezar = false,
  onCancelar,
}: {
  tenantId: string
  tipo: TipoDelFacturador | null
  facturador: VistaDelFacturador | null
  datos: Datos
  onCambio: (d: Datos) => void
  abiertoAlEmpezar?: boolean
  onCancelar?: () => void
}) {
  const sufijo = tipo ? `-${tipo}` : ''
  // El formulario lleva el token de FEEL (un campo de contraseña): va en POST y
  // el botón espera a que React hidrate, como todo formulario con contraseña
  // (guardián formularios-con-contrasena; si se envía antes, el token viajaría
  // en la URL).
  const hidratado = useHidratado()
  const [editando, setEditando] = useState(abiertoAlEmpezar)
  const [ambiente, setAmbiente] = useState<AmbienteDelFacturador>((f?.ambiente as AmbienteDelFacturador) ?? 'SANDBOX')
  const [token, setToken] = useState('')
  const [nit, setNit] = useState(datos.inmobiliaria.nit ?? '')
  const [tocado, setTocado] = useState(false)
  const [trabajando, setTrabajando] = useState<null | 'guardar' | 'probar' | 'quitar'>(null)
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const errorDelCampo = errorDelToken(token)
  const nombre = tipo ? `de ${NOMBRE_DEL_TIPO[tipo]}` : ''

  function abrir() {
    setAmbiente((f?.ambiente as AmbienteDelFacturador) ?? 'SANDBOX')
    setToken('')
    setNit(datos.inmobiliaria.nit ?? '')
    setTocado(false)
    setFallo(null)
    setEditando(true)
  }

  async function hacer(que: 'guardar' | 'probar' | 'quitar', trabajo: () => Promise<Datos>, accion: string) {
    setTrabajando(que)
    setFallo(null)
    try {
      const d = await trabajo()
      if (que === 'guardar') {
        setEditando(false)
        setToken('')
      }
      if (que === 'quitar') setConfirmandoQuitar(false)
      onCambio(d)
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
      () => guardarFacturador(tenantId, { ambiente, tokenIdentificador: token, nitDelFacturador: nit }, tipo),
      tipo ? `guardar el facturador ${nombre}` : 'guardar el facturador',
    )
  }

  const estado = f ? estadoDelFacturador(f.estado) : null
  const disponible = tipo ? datos.porTipoDisponible === true : datos.disponible

  return (
    <div className="space-y-3" data-testid={`facturador-bloque${sufijo}`}>
      <dl className="divide-y divide-bg-border border border-bg-border">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <dt className="text-fg-muted">{tipo ? `Facturador ${nombre}` : 'Facturador (cualquier tipo)'}</dt>
          <dd className="text-fg flex items-center gap-2" data-testid={`facturador-estado${sufijo}`}>
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
            <dd className="font-mono text-fg" data-testid={`facturador-prefijo${sufijo}`}>
              {f.prefijoFa ?? '—'}
              {f.ultimaPruebaAt && <span className="text-fg-subtle"> · probado {fmtDateTime(f.ultimaPruebaAt)}</span>}
            </dd>
          </div>
        )}
        {f?.estado === 'FALLO' && f.ultimoError && <div className="px-4 py-2.5 text-xs text-bad">{f.ultimoError}</div>}
      </dl>

      {!editando ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={abrir} disabled={!disponible || trabajando !== null}>
            {f ? 'Cambiar el token' : 'Registrar el facturador'}
          </button>
          {f && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={trabajando !== null}
              onClick={() => void hacer('probar', () => probarFacturador(tenantId, tipo), 'probar la conexión')}
              data-testid={`facturador-probar${sufijo}`}
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
        <form method="post" onSubmit={guardar} noValidate className="space-y-3" data-testid={`facturador-formulario${sufijo}`}>
          <div className="flex flex-wrap gap-4">
            <label className="text-xs text-fg-muted flex items-center gap-1.5">
              <input type="radio" name={`ambiente${sufijo}`} checked={ambiente === 'SANDBOX'} onChange={() => setAmbiente('SANDBOX')} />
              Pruebas (habilitación)
            </label>
            <label className="text-xs text-fg-muted flex items-center gap-1.5">
              <input
                type="radio"
                name={`ambiente${sufijo}`}
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
            <label htmlFor={`facturador-token${sufijo}`} className="block text-xs text-fg-muted mb-1">
              Token del facturador {nombre} (TokenIdentificador)
            </label>
            <input
              id={`facturador-token${sufijo}`}
              type="password"
              className="input max-w-md font-mono"
              autoComplete="off"
              value={token}
              aria-invalid={tocado && errorDelCampo ? true : undefined}
              aria-describedby={`facturador-token-ayuda${sufijo}`}
              onChange={(e) => {
                setToken(e.target.value)
                setFallo(null)
              }}
              onBlur={() => setTocado(true)}
            />
            <p id={`facturador-token-ayuda${sufijo}`} className={`text-xs mt-1 ${tocado && errorDelCampo ? 'text-bad' : 'text-fg-subtle'}`}>
              {tocado && errorDelCampo ? errorDelCampo : 'Se guarda cifrado; nadie lo vuelve a ver.'}
            </p>
          </div>
          <div>
            <label htmlFor={`facturador-nit${sufijo}`} className="block text-xs text-fg-muted mb-1">
              NIT con el que se dio de alta en FEEL
            </label>
            <input
              id={`facturador-nit${sufijo}`}
              className="input max-w-xs font-mono"
              inputMode="numeric"
              autoComplete="off"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
            />
            <p className="text-xs mt-1 text-fg-subtle">Tiene que ser el NIT de la inmobiliaria.</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={trabajando !== null || !hidratado}>
              {trabajando === 'guardar' ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditando(false)
                onCancelar?.()
              }}
              disabled={trabajando !== null}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {confirmandoQuitar && (
        <div className="card p-3 border-warn/40">
          <p className="text-sm text-fg mb-2">
            {tipo
              ? `Si quitas el facturador ${nombre}, esas facturas salen con el facturador de cualquier tipo (si su resolución es la de FEEL) o quedan en cola sin transmitirse.`
              : `Si quitas el facturador, lo que emita ${datos.inmobiliaria.nombre} queda en cola sin transmitirse a la DIAN hasta que lo vuelvas a registrar.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={trabajando !== null}
              onClick={() => void hacer('quitar', () => quitarFacturador(tenantId, tipo), 'quitar el facturador')}
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
    </div>
  )
}
