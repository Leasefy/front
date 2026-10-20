'use client'

import { useState, type FormEvent } from 'react'
import { Alert, KeyValueList, Presence, SegmentedControl } from '@leasefy/cadence'
import { useHidratado } from '@/lib/hooks/use-hidratado'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { LoadingBlock } from '@/components/admin/screen/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  const titulo = 'Facturación electrónica'
  const descripcion = 'La inmobiliaria como facturador dentro de la cuenta de FEEL de Leasefy.'

  if (consulta.isLoading && !datos) {
    return (
      <Tarjeta titulo={titulo} descripcion={descripcion} aria-busy="true">
        <LoadingBlock label="Cargando el facturador" filas={2} suelto={false} />
      </Tarjeta>
    )
  }
  if (consulta.error && !datos) {
    return (
      <Tarjeta titulo={titulo} descripcion={descripcion}>
        <div className="space-y-3">
          <Alert variant="danger">
            No pudimos leer el facturador: {mensajeDelFalloDelFacturador(consulta.error, 'leer el facturador')}
          </Alert>
          <Button variant="outline" size="sm" hideArrow onClick={consulta.refetch}>
            Reintentar
          </Button>
        </div>
      </Tarjeta>
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
    <Tarjeta
      titulo={<span id="facturador-titulo">{titulo}</span>}
      descripcion="Cada inmobiliaria transmite como un facturador dentro de la cuenta de FEEL de Leasefy. Dalo de alta en FEEL con su NIT y su resolución, pega acá el token que FEEL le dio y pruébalo. La inmobiliaria no ve el token."
      aria-labelledby="facturador-titulo"
      data-testid="facturador-feel"
    >
      <div className="space-y-5">
        {!datos.disponible && (
          <Alert variant="warning" role="note">
            Falta la migración {datos.migracion} en esta base: todavía no se puede guardar un facturador.
          </Alert>
        )}
        {!datos.feelPrendido && (
          <Alert variant="info" role="note" data-testid="feel-apagado">
            La transmisión está apagada en el servidor (FEEL_ENABLED). Se puede registrar y probar; las facturas quedan
            en cola hasta que se prenda.
          </Alert>
        )}

        <KeyValueList
          items={[
            {
              label: 'Inmobiliaria',
              value: (
                <span className="text-right">
                  {datos.inmobiliaria.razonSocial ?? datos.inmobiliaria.nombre} ·{' '}
                  <span className="font-mono">{datos.inmobiliaria.nit ?? 'sin NIT'}</span>
                </span>
              ),
            },
          ]}
        />

        <BloqueDelFacturador tenantId={tenantId} tipo={null} facturador={datos.facturador} datos={datos} onCambio={cambio} />

        {datos.resoluciones.length > 0 && (
          <ul className="space-y-1.5 text-body-sm" data-testid="facturador-resoluciones">
            {datos.resoluciones.map((r) => (
              <li key={`${r.numero}-${r.prefijo}`} className="flex flex-wrap items-center gap-2">
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
          <div className="space-y-4 border-t border-border-faint pt-5" data-testid="facturadores-por-tipo">
            <div className="space-y-1">
              <h3 className="text-body font-medium text-fg">Facturadores por tipo de documento</h3>
              <p className="text-body-sm text-fg-muted">
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
                  <span className="text-body-sm text-fg-muted">¿Para qué tipo de factura?</span>
                  {libres.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant="outline"
                      hideArrow
                      onClick={() => {
                        setAgregando(t)
                        setEligiendo(false)
                      }}
                    >
                      {NOMBRE_DEL_TIPO[t]}
                    </Button>
                  ))}
                  <Button type="button" size="sm" variant="ghost" hideArrow onClick={() => setEligiendo(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={() => setEligiendo(true)}
                  data-testid="facturador-agregar-tipo"
                >
                  Agregar el facturador de un tipo de documento
                </Button>
              )
            )}
            {datos.porTipoDisponible === false && (
              <Alert variant="warning" role="note">
                Falta la migración {datos.migracionPorTipo} en esta base: por ahora sólo hay un facturador por inmobiliaria.
              </Alert>
            )}
          </div>
        )}
      </div>
    </Tarjeta>
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
    <div className="space-y-3 rounded-md border border-border p-4" data-testid={`facturador-bloque${sufijo}`}>
      <KeyValueList
        compact
        items={[
          {
            label: tipo ? `Facturador ${nombre}` : 'Facturador (cualquier tipo)',
            value: (
              <span className="flex flex-wrap items-center justify-end gap-2 text-fg" data-testid={`facturador-estado${sufijo}`}>
                {f ? (
                  <>
                    <span className="font-mono">{f.ambiente === 'PRODUCCION' ? 'producción' : 'pruebas'}</span>
                    <span className="font-mono text-fg-subtle">token …{f.finalDelToken}</span>
                    {estado && <Pill tone={estado.tono}>{estado.texto}</Pill>}
                  </>
                ) : (
                  <span className="text-fg-subtle">sin registrar</span>
                )}
              </span>
            ),
          },
          ...(f
            ? [
                {
                  label: 'Prefijo en FEEL',
                  value: (
                    <span className="font-mono text-fg" data-testid={`facturador-prefijo${sufijo}`}>
                      {f.prefijoFa ?? '—'}
                      {f.ultimaPruebaAt && (
                        <span className="font-body text-fg-subtle"> · probado {fmtDateTime(f.ultimaPruebaAt)}</span>
                      )}
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      {f?.estado === 'FALLO' && f.ultimoError && (
        <Alert variant="danger" role="note">
          {f.ultimoError}
        </Alert>
      )}

      {!editando ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" hideArrow onClick={abrir} disabled={!disponible || trabajando !== null}>
            {f ? 'Cambiar el token' : 'Registrar el facturador'}
          </Button>
          {f && (
            <Button
              type="button"
              size="sm"
              hideArrow
              disabled={trabajando !== null}
              isLoading={trabajando === 'probar'}
              onClick={() => void hacer('probar', () => probarFacturador(tenantId, tipo), 'probar la conexión')}
              data-testid={`facturador-probar${sufijo}`}
            >
              {trabajando === 'probar' ? 'Probando…' : 'Probar la conexión'}
            </Button>
          )}
          {f && !confirmandoQuitar && (
            <Button type="button" variant="ghost" size="sm" hideArrow disabled={trabajando !== null} onClick={() => setConfirmandoQuitar(true)}>
              Quitar
            </Button>
          )}
        </div>
      ) : (
        <form method="post" onSubmit={guardar} noValidate className="space-y-4" data-testid={`facturador-formulario${sufijo}`}>
          <div className="space-y-1.5">
            <Label>Ambiente de FEEL</Label>
            <SegmentedControl<AmbienteDelFacturador>
              size="sm"
              value={ambiente}
              onChange={setAmbiente}
              options={[
                { value: 'SANDBOX', label: 'Pruebas (habilitación)' },
                { value: 'PRODUCCION', label: 'Producción' },
              ]}
            />
          </div>
          {ambiente === 'PRODUCCION' && !datos.urlProduccion && (
            <Alert variant="warning" role="note">
              El servidor no tiene la dirección de FEEL de producción: la prueba va a fallar.
            </Alert>
          )}
          {ambiente === 'SANDBOX' && !datos.urlSandbox && (
            <Alert variant="warning" role="note">
              El servidor no tiene la dirección de FEEL de pruebas: la prueba va a fallar.
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`facturador-token${sufijo}`}>Token del facturador {nombre} (TokenIdentificador)</Label>
            <Input
              id={`facturador-token${sufijo}`}
              type="password"
              className="max-w-md font-mono"
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
            <p
              id={`facturador-token-ayuda${sufijo}`}
              className={`text-caption ${tocado && errorDelCampo ? 'text-danger' : 'text-fg-subtle'}`}
            >
              {tocado && errorDelCampo ? errorDelCampo : 'Se guarda cifrado; nadie lo vuelve a ver.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`facturador-nit${sufijo}`}>NIT con el que se dio de alta en FEEL</Label>
            <Input
              id={`facturador-nit${sufijo}`}
              className="max-w-xs font-mono"
              inputMode="numeric"
              autoComplete="off"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
            />
            <p className="text-caption text-fg-subtle">Tiene que ser el NIT de la inmobiliaria.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" hideArrow disabled={trabajando !== null || !hidratado} isLoading={trabajando === 'guardar'}>
              {trabajando === 'guardar' ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              hideArrow
              onClick={() => {
                setEditando(false)
                onCancelar?.()
              }}
              disabled={trabajando !== null}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <Presence show={confirmandoQuitar}>
        <Alert variant="warning" role="region" aria-label="Confirmar quitar el facturador">
          <div className="space-y-3 text-fg">
            <p>
              {tipo
                ? `Si quitas el facturador ${nombre}, esas facturas salen con el facturador de cualquier tipo (si su resolución es la de FEEL) o quedan en cola sin transmitirse.`
                : `Si quitas el facturador, lo que emita ${datos.inmobiliaria.nombre} queda en cola sin transmitirse a la DIAN hasta que lo vuelvas a registrar.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                hideArrow
                disabled={trabajando !== null}
                isLoading={trabajando === 'quitar'}
                onClick={() => void hacer('quitar', () => quitarFacturador(tenantId, tipo), 'quitar el facturador')}
              >
                {trabajando === 'quitar' ? 'Quitando…' : 'Sí, quitarlo'}
              </Button>
              <Button type="button" variant="outline" size="sm" hideArrow disabled={trabajando !== null} onClick={() => setConfirmandoQuitar(false)}>
                Volver
              </Button>
            </div>
          </div>
        </Alert>
      </Presence>

      {fallo && <Alert variant="danger">{fallo}</Alert>}
    </div>
  )
}
