'use client'

/**
 * VentaDelInmueble — «Registrar la venta» y la comisión de venta, en el
 * mandato (Nico, 02-10-2026).
 *
 * ── Lo que pidió Nico, tal cual ────────────────────────────────────────────
 *
 *   · Un diálogo «Registrar la venta»: pide la FECHA DE LA ESCRITURA y el
 *     PRECIO ESCRITURADO, PREVISUALIZA (qué pasa con el contrato y cuánto es
 *     la comisión, sin escribir nada) y REGISTRA la comisión.
 *   · ANULAR con motivo obligatorio. Después se puede volver a registrar: una
 *     sola comisión viva por mandato.
 *   · En el mandato se ve la comisión viva, o la anulada con su motivo, quién
 *     y cuándo.
 *   · Registrar y anular los puede quien puede EDITAR mandatos (el admin y los
 *     miembros con el permiso de la captación): `portafolio:edit`, el mismo
 *     del back (`@RequirePermission('portafolio', 'edit')`).
 *   · Sin la tabla en la base (503 `COMISION_DE_VENTA_SIN_MIGRACION`, o
 *     `disponible: false` al leer) la pantalla lo dice con una frase y no deja
 *     registrar.
 *
 * 🔴 Registrar la comisión NO termina el contrato ni cambia el propietario: la
 * previsualización dice cuál de los dos caminos corresponde (el back lo decide
 * en `venta-del-inmueble.ts`) y esos dos se hacen desde el contrato.
 *
 * Movimiento con Cadence: el contenido cambia con `CrossFade` (cargando →
 * comisión, y los dos pasos del diálogo como pasos de asistente), lo que
 * aparece y desaparece con `Presence`; los diálogos traen su coreografía.
 */

import { useRef, useState } from 'react'
import { CrossFade, Presence, SegmentedControl } from '@leasefy/cadence'

import { PermissionGate } from '@/components/auth/PermissionGate'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { Button, Input, Textarea } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoneyInput } from '@/components/ui/money-input'
import { toast } from '@/components/ui/toast'
import { captacionApi, type ComisionDeVenta } from '@/lib/api/crm.service'
import {
  MENSAJES_DE_LA_VENTA,
  MOTIVO_DE_ANULACION_MAXIMO,
  diaEnColombia,
  diaLegible,
  errorDeLaFechaDeLaEscritura,
  errorDelMotivoDeAnulacion,
  errorDelPrecioDeLaEscritura,
  esComisionSinMigracion,
  porcentajeLegible,
  sinComisionDeVentaPactada,
} from '@/lib/captacion/venta-del-inmueble'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { formatCurrency } from '@/lib/format'
import { useCrm } from '@/lib/hooks/use-crm'

type Comprador = 'EL_INQUILINO' | 'UN_TERCERO'
type CampoDeLaVenta = 'fechaDeLaEscritura' | 'precioDeVentaCop'

type Vista = Awaited<ReturnType<typeof captacionApi.previsualizarVenta>>

function quien(persona: ComisionDeVenta['registradoPor']): string {
  return persona?.nombre ?? 'alguien del equipo'
}

/** La comisión, en una línea: «$ 25.500.000 · el 3 % de $ 850.000.000». */
function resumen(c: Pick<ComisionDeVenta, 'comisionCop' | 'porcentaje' | 'precioDeVentaCop'>): string {
  return `${formatCurrency(c.comisionCop)} · el ${porcentajeLegible(c.porcentaje)} de ${formatCurrency(c.precioDeVentaCop)}`
}

// ── La sección del mandato ─────────────────────────────────────────────────

export function VentaDelInmueble({ consignacionId }: { consignacionId: string }) {
  const comisiones = useCrm(
    () => captacionApi.comisionesDeVenta(consignacionId),
    [consignacionId],
    ['portafolio'],
  )
  const [registrando, setRegistrando] = useState(false)
  const [anulando, setAnulando] = useState<ComisionDeVenta | null>(null)

  const datos = comisiones.datos
  const sinTabla = datos?.disponible === false || Boolean(comisiones.noHabilitado)
  const viva = datos?.viva ?? null
  const anulada = viva ? null : (datos?.anuladas[0] ?? null)
  const clave = sinTabla ? 'sin-tabla' : viva ? `viva-${viva.id}` : anulada ? `anulada-${anulada.id}` : 'sin-comision'

  const alCambiar = () => {
    void comisiones.refetch()
  }

  return (
    <div className="space-y-2 border-t pt-4" data-testid="venta-del-inmueble">
      <p className="text-sm font-medium">La venta del inmueble</p>

      <EstadoDeDatos
        cargando={comisiones.cargando && !datos}
        error={comisiones.errorCrudo}
        queEs="la comisión de venta"
        onReintentar={comisiones.refetch}
        conservarContenido
      >
        <CrossFade swapKey={clave} className="space-y-2">
          {sinTabla ? (
            <p className="text-muted-foreground text-sm" data-testid="venta-sin-migracion">
              {MENSAJES_DE_LA_VENTA.sinMigracion}
            </p>
          ) : viva ? (
            <div className="space-y-2" data-testid="comision-viva">
              <p className="text-sm">
                Comisión de venta: <span className="font-medium">{resumen(viva)}</span>.
              </p>
              <p className="text-muted-foreground text-sm">
                Escritura del {diaLegible(viva.fechaDeLaEscritura)}. La registró {quien(viva.registradoPor)} el{' '}
                {diaEnColombia(viva.createdAt)}.
              </p>
              <PermissionGate module="portafolio" action="edit" fallback={null}>
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  onClick={() => setAnulando(viva)}
                  data-testid="anular-comision"
                >
                  Anular la comisión
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="space-y-2" data-testid="sin-comision-viva">
              {anulada?.anulacion ? (
                <p className="text-muted-foreground text-sm" data-testid="comision-anulada">
                  <span className="text-foreground">Comisión anulada</span> ({resumen(anulada)}). La anuló{' '}
                  {quien(anulada.anulacion.por)} el {diaEnColombia(anulada.anulacion.anuladaEl)}: «
                  {anulada.anulacion.motivo}».
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Si el propietario vendió el inmueble, registra la venta: te decimos qué pasa con el
                  contrato y cuánto es la comisión antes de guardar nada.
                </p>
              )}
              <PermissionGate module="portafolio" action="edit" fallback={null}>
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  onClick={() => setRegistrando(true)}
                  data-testid="registrar-la-venta"
                >
                  Registrar la venta
                </Button>
              </PermissionGate>
            </div>
          )}
        </CrossFade>
      </EstadoDeDatos>

      {registrando ? (
        <RegistrarLaVenta
          consignacionId={consignacionId}
          onCerrar={() => setRegistrando(false)}
          onRegistrada={() => {
            setRegistrando(false)
            alCambiar()
          }}
        />
      ) : null}

      {anulando ? (
        <AnularLaComision
          consignacionId={consignacionId}
          comision={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={() => {
            setAnulando(null)
            alCambiar()
          }}
        />
      ) : null}
    </div>
  )
}

// ── «Registrar la venta»: datos → revisar → registrar ──────────────────────

const ID_DEL_FORMULARIO_DE_LA_VENTA = 'form-registrar-la-venta'

export function RegistrarLaVenta({
  consignacionId,
  onCerrar,
  onRegistrada,
}: {
  consignacionId: string
  onCerrar: () => void
  onRegistrada: () => void
}) {
  const [paso, setPaso] = useState<'datos' | 'revisar'>('datos')
  const [comprador, setComprador] = useState<Comprador>('UN_TERCERO')
  const [fecha, setFecha] = useState('')
  const [precio, setPrecio] = useState('')
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaVenta, string>>>({})
  const [falla, setFalla] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  const enfocar = (campo: CampoDeLaVenta | undefined) => {
    if (!campo) return
    // Después de que el paso de los datos vuelva a estar montado.
    setTimeout(() => formulario.current?.querySelector<HTMLElement>(`#venta-${campo}`)?.focus(), 0)
  }

  const repartir = (e: unknown, porDefecto: string, accion: string) => {
    if (esComisionSinMigracion(e)) {
      setFalla(MENSAJES_DE_LA_VENTA.sinMigracion)
      return
    }
    const reparto = repartirErroresDelServidor<CampoDeLaVenta>(e, {
      campos: ['fechaDeLaEscritura', 'precioDeVentaCop'],
      porDefecto,
      accion,
    })
    setErrores(reparto.porCampo)
    if (reparto.orden.length > 0) {
      setPaso('datos')
      enfocar(reparto.orden[0])
    }
    setFalla(
      reparto.sueltos.length
        ? reparto.sueltos.join(' · ')
        : reparto.orden.length
          ? null
          : mensajeParaLaPersona(e, { porDefecto, accion }),
    )
  }

  const revisar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ocupado) return
    const propios: Partial<Record<CampoDeLaVenta, string>> = {}
    const deLaFecha = errorDeLaFechaDeLaEscritura(fecha)
    if (deLaFecha) propios.fechaDeLaEscritura = deLaFecha
    const delPrecio = errorDelPrecioDeLaEscritura(precio)
    if (delPrecio) propios.precioDeVentaCop = delPrecio
    setErrores(propios)
    setFalla(null)
    const primero = (['fechaDeLaEscritura', 'precioDeVentaCop'] as const).find((c) => propios[c])
    if (primero) {
      enfocar(primero)
      return
    }
    setOcupado(true)
    try {
      const r = await captacionApi.previsualizarVenta(consignacionId, {
        comprador,
        fechaDeLaEscritura: fecha,
        precioDeVentaCop: Number(precio),
      })
      setVista(r)
      setPaso('revisar')
    } catch (err) {
      repartir(err, 'No pudimos revisar la venta.', 'revisar la venta')
    } finally {
      setOcupado(false)
    }
  }

  const comision = vista?.comision ?? null
  const pactada = Boolean(comision?.pactada && comision.comisionCop > 0)
  const sePuede = Boolean(vista?.sePuedeRegistrarLaComision && pactada && vista?.contrato)

  const registrar = async () => {
    if (!vista || !sePuede || ocupado) return
    setOcupado(true)
    setFalla(null)
    try {
      const r = await captacionApi.registrarComisionDeVenta(consignacionId, {
        contractId: vista.contrato?.id,
        fechaDeLaEscritura: fecha,
        precioDeVentaCop: Number(precio),
      })
      toast.success('Comisión de venta registrada', {
        description: `${formatCurrency(r.comisionCop)}, sobre la escritura del ${diaLegible(r.fechaDeLaEscritura)}.`,
      })
      onRegistrada()
    } catch (err) {
      repartir(err, 'No pudimos registrar la comisión.', 'registrar la comisión')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !ocupado) onCerrar()
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Registrar la venta</DialogTitle>
          <DialogDescription>
            {paso === 'datos'
              ? 'Con la fecha de la escritura y el precio escriturado te mostramos qué pasa con el contrato y cuánto es la comisión. Todavía no se guarda nada.'
              : 'Revisa antes de registrar. Registrar guarda la comisión de venta; el contrato se termina o cambia de propietario desde su ficha.'}
          </DialogDescription>
        </DialogHeader>

        <CrossFade swapKey={paso} direction={paso === 'revisar' ? 'forward' : 'backward'}>
          {paso === 'datos' ? (
            <form
              id={ID_DEL_FORMULARIO_DE_LA_VENTA}
              ref={formulario}
              onSubmit={revisar}
              className="space-y-4"
              data-testid="venta-datos"
            >
              <div className="space-y-1">
                <p className="text-caption font-medium text-foreground">¿A quién se lo vendió?</p>
                <SegmentedControl<Comprador>
                  aria-label="A quién se lo vendió"
                  value={comprador}
                  onChange={setComprador}
                  options={[
                    { value: 'UN_TERCERO', label: 'A un tercero' },
                    { value: 'EL_INQUILINO', label: 'Al inquilino' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="venta-fechaDeLaEscritura" className="mb-1 block text-caption font-medium text-foreground">
                  Fecha de la escritura<span className="ml-0.5 text-danger">*</span>
                </label>
                <Input
                  id="venta-fechaDeLaEscritura"
                  aria-required="true"
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value)
                    setErrores((x) => ({ ...x, fechaDeLaEscritura: undefined }))
                  }}
                  aria-invalid={errores.fechaDeLaEscritura ? true : undefined}
                  aria-describedby={errores.fechaDeLaEscritura ? 'venta-fechaDeLaEscritura-error' : undefined}
                />
                <ErrorDelCampo id="venta-fechaDeLaEscritura-error" mensaje={errores.fechaDeLaEscritura} />
              </div>
              <div>
                <label htmlFor="venta-precioDeVentaCop" className="mb-1 block text-caption font-medium text-foreground">
                  Precio escriturado<span className="ml-0.5 text-danger">*</span>
                </label>
                <MoneyInput
                  id="venta-precioDeVentaCop"
                  aria-required="true"
                  value={precio}
                  onChange={(crudo) => {
                    setPrecio(crudo)
                    setErrores((x) => ({ ...x, precioDeVentaCop: undefined }))
                  }}
                  placeholder="Lo que dice la escritura, no lo que se pedía"
                  aria-invalid={errores.precioDeVentaCop ? true : undefined}
                  aria-describedby={errores.precioDeVentaCop ? 'venta-precioDeVentaCop-error' : undefined}
                />
                <ErrorDelCampo id="venta-precioDeVentaCop-error" mensaje={errores.precioDeVentaCop} />
              </div>
            </form>
          ) : vista ? (
            <div className="space-y-3 text-sm" data-testid="venta-revisar">
              <div className="space-y-1">
                <p className="font-medium">Qué pasa con el contrato</p>
                <p className="text-muted-foreground">{vista.camino.porQue}</p>
                <p className="text-muted-foreground">{vista.camino.elInquilino}</p>
              </div>
              <div className="space-y-1" data-testid="venta-comision">
                <p className="font-medium">La comisión de venta</p>
                {pactada && comision ? (
                  <p>
                    <span className="font-medium">{formatCurrency(comision.comisionCop)}</span>: el{' '}
                    {porcentajeLegible(comision.porcentaje)} de {formatCurrency(comision.precioDeVentaCop)}, una sola
                    vez. Es de la inmobiliaria y la paga el propietario; no entra a las cuotas del inquilino.
                  </p>
                ) : (
                  <p className="text-danger" data-testid="venta-sin-comision">
                    {sinComisionDeVentaPactada(vista)}
                  </p>
                )}
                {vista.contrato ? (
                  <p className="text-muted-foreground" data-testid="venta-contrato">
                    Sobre el contrato{vista.contrato.codigo !== null ? ` N.º ${vista.contrato.codigo}` : ''}
                    {vista.contrato.inquilino ? ` de ${vista.contrato.inquilino}` : ''}.
                  </p>
                ) : (
                  <p className="text-danger" data-testid="venta-sin-contrato">
                    No encontramos el contrato de arriendo de este inmueble: la comisión de venta se registra sobre
                    el contrato del inmueble que se vendió.
                  </p>
                )}
              </div>
              {!vista.sePuedeRegistrarLaComision ? (
                <p className="text-muted-foreground" data-testid="venta-sin-migracion">
                  {MENSAJES_DE_LA_VENTA.sinMigracion}
                </p>
              ) : null}
            </div>
          ) : null}
        </CrossFade>

        <Presence show={Boolean(falla)}>
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-caption text-danger"
          >
            {falla}
          </div>
        </Presence>

        <DialogFooter>
          {paso === 'datos' ? (
            <>
              <Button type="button" variant="outline" hideArrow onClick={onCerrar} disabled={ocupado}>
                Cancelar
              </Button>
              <Button type="submit" form={ID_DEL_FORMULARIO_DE_LA_VENTA} hideArrow isLoading={ocupado} disabled={ocupado}>
                Ver qué pasa
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                hideArrow
                onClick={() => {
                  setFalla(null)
                  setPaso('datos')
                }}
                disabled={ocupado}
              >
                Cambiar los datos
              </Button>
              <Button
                type="button"
                hideArrow
                isLoading={ocupado}
                disabled={!sePuede || ocupado}
                onClick={() => void registrar()}
                data-testid="confirmar-registro"
              >
                Registrar la comisión
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Anular la comisión: SIEMPRE con motivo ─────────────────────────────────

const ID_DEL_FORMULARIO_DE_ANULAR = 'form-anular-comision'

export function AnularLaComision({
  consignacionId,
  comision,
  onCerrar,
  onAnulada,
}: {
  consignacionId: string
  comision: ComisionDeVenta
  onCerrar: () => void
  onAnulada: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null)
  const [falla, setFalla] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)

  const anular = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ocupado) return
    const propio = errorDelMotivoDeAnulacion(motivo)
    setErrorDelMotivo(propio)
    setFalla(null)
    if (propio) {
      campo.current?.focus()
      return
    }
    setOcupado(true)
    try {
      await captacionApi.anularComisionDeVenta(consignacionId, comision.id, motivo.trim())
      toast.success('Comisión de venta anulada', {
        description: 'Queda con su motivo. Ya puedes registrar la venta otra vez.',
      })
      onAnulada()
    } catch (err) {
      if (esComisionSinMigracion(err)) {
        setFalla(MENSAJES_DE_LA_VENTA.sinMigracion)
        return
      }
      const reparto = repartirErroresDelServidor<'motivo'>(err, {
        campos: ['motivo'],
        porDefecto: 'No pudimos anular la comisión.',
        accion: 'anular la comisión',
      })
      if (reparto.porCampo.motivo) {
        setErrorDelMotivo(reparto.porCampo.motivo)
        campo.current?.focus()
      }
      setFalla(
        reparto.sueltos.length
          ? reparto.sueltos.join(' · ')
          : reparto.porCampo.motivo
            ? null
            : mensajeParaLaPersona(err, { porDefecto: 'No pudimos anular la comisión.', accion: 'anular la comisión' }),
      )
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !ocupado) onCerrar()
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Anular la comisión de venta</DialogTitle>
          <DialogDescription>
            {resumen(comision)}, escritura del {diaLegible(comision.fechaDeLaEscritura)}. La comisión no se borra:
            queda anulada con tu motivo, quién y cuándo. Después puedes registrar la venta otra vez.
          </DialogDescription>
        </DialogHeader>

        <form id={ID_DEL_FORMULARIO_DE_ANULAR} onSubmit={anular} className="space-y-1" data-testid="anular-formulario">
          <label htmlFor="anular-motivo" className="mb-1 block text-caption font-medium text-foreground">
            ¿Por qué se anula?<span className="ml-0.5 text-danger">*</span>
          </label>
          <Textarea
            id="anular-motivo"
            aria-required="true"
            ref={campo}
            value={motivo}
            rows={3}
            maxLength={MOTIVO_DE_ANULACION_MAXIMO}
            onChange={(e) => {
              setMotivo(e.target.value)
              setErrorDelMotivo(null)
            }}
            placeholder="Por ejemplo: el precio de la escritura quedó mal digitado"
            aria-invalid={errorDelMotivo ? true : undefined}
            aria-describedby={errorDelMotivo ? 'anular-motivo-error' : undefined}
          />
          <ErrorDelCampo id="anular-motivo-error" mensaje={errorDelMotivo ?? undefined} />
        </form>

        <Presence show={Boolean(falla)}>
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-caption text-danger"
          >
            {falla}
          </div>
        </Presence>

        <DialogFooter>
          <Button type="button" variant="outline" hideArrow onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_DEL_FORMULARIO_DE_ANULAR}
            variant="destructive"
            hideArrow
            isLoading={ocupado}
            disabled={ocupado}
            data-testid="confirmar-anulacion"
          >
            Anular la comisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
