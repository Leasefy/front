'use client'

/**
 * PortalesClient — sacar un inmueble a los portales, y el estado de cada aviso.
 *
 * ── Qué pidió Nico (17-09-2026) ────────────────────────────────────────────
 *
 * «Se publica y despublica desde Leasefy con las CUENTAS QUE CADA INMOBILIARIA
 * YA PAGA en cada portal, mostrando el estado de cada publicación.»
 *
 * ── 🔴 Lo que esta pantalla era, y por qué no se entendía (18-09-2026) ─────
 *
 * Era una ventana de sólo lectura a un proceso que NO SE PODÍA EMPEZAR. De los
 * ocho endpoints de publicación que el back tiene, cuatro no tenían un solo
 * consumidor en el front: `guardarCuenta`, `publicar`, `despublicar` y
 * `revision`. En pantalla eso se veía así: seis portales diciendo «Sin cuenta
 * configurada» —sin ninguna forma de configurar una—, seis botones «Descargar
 * archivo» que bajaban un CSV vacío, y un estado vacío que mandaba a «la ficha
 * de un inmueble» a hacer algo que la ficha tampoco ofrecía.
 *
 * Y la cuenta no es un adorno: `publicar` responde `SIN_CUENTA_EN_EL_PORTAL` si
 * la inmobiliaria no tiene una cuenta ACTIVA en ese portal. O sea que, sin
 * pantalla para anotarla, publicar era imposible en todo el producto.
 *
 * Por eso esto no es un cambio de estilos. La pantalla ahora:
 *   · dice en cuatro pasos numerados cómo sale un inmueble a un portal —y los
 *     numera porque es de verdad una secuencia, no una decoración;
 *   · deja ANOTAR la cuenta que la inmobiliaria ya paga (paso 1);
 *   · deja SACAR un inmueble a los portales, preguntándole antes al back qué le
 *     falta a ese inmueble para poder salir (paso 2);
 *   · sólo ofrece descargar el archivo del portal que tiene algo por subir, con
 *     cuántos son — un botón que baja un archivo vacío es una promesa falsa;
 *   · y deja bajar del portal lo que ya no va.
 *
 * ── 🔴 Lo que esta pantalla dice sin rodeos ────────────────────────────────
 *
 * **Hoy ningún portal de afuera se publica solo.** Fincaraíz, Metrocuadrado y
 * Mercado Libre no dan credenciales de publicación sin convenio de integración,
 * y Leasefy no tiene ninguno. Así que el estado real de una publicación pedida
 * es «por subir al portal», y la pantalla lo dice en la cara con el botón de
 * descargar el archivo al lado — en vez de un interruptor que promete algo que
 * no pasa. Cuando exista el convenio, la cuenta pasa a modo API y el mismo
 * tablero cambia de estado solo.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  CloudArrowUp,
  DownloadSimple,
  Plus,
  X,
  Warning,
  CheckCircle,
  MagnifyingGlass,
} from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { useLenis } from '@/components/providers/SmoothScroll'
import { toast } from '@/components/ui/toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import {
  publicacionApi,
  type EstadoDePublicacion,
  type PortalConCuenta,
  type RevisionDePublicacion,
} from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { cn } from '@/lib/utils'

/** Cómo se lee cada estado, y con qué tono. */
const ROTULO: Record<
  EstadoDePublicacion,
  { texto: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  PENDIENTE: { texto: 'Pedida', variant: 'secondary' },
  POR_EXPORTAR: { texto: 'Por subir al portal', variant: 'outline' },
  PUBLICADA: { texto: 'Publicada', variant: 'default' },
  POR_DESPUBLICAR: { texto: 'Por bajar del portal', variant: 'outline' },
  DESPUBLICADA: { texto: 'Despublicada', variant: 'secondary' },
  ERROR: { texto: 'Con error', variant: 'destructive' },
}

/** Lo que todavía le falta a la inmobiliaria hacer con sus propias manos. */
const PIDE_MANO: readonly EstadoDePublicacion[] = ['POR_EXPORTAR', 'POR_DESPUBLICAR']

/**
 * 🔴 DESIGN §8: todo modal para a Lenis mientras está abierto y lo vuelve a
 * arrancar al cerrar (incluido el cleanup). Sin esto la rueda del mouse queda
 * secuestrada y el cuerpo del modal se ve congelado. El contenedor que scrollea
 * además lleva `data-lenis-prevent`.
 */
function useLenisQuieto() {
  const lenis = useLenis()
  useEffect(() => {
    lenis.stop()
    return () => lenis.start()
  }, [lenis])
}

/** El 503 y el 400 del back traen su motivo redactado: vale más que un genérico. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return porDefecto
}

// ═══════════════════════════════════════════════════════════════════════════
// El armazón de un modal, que los dos comparten
// ═══════════════════════════════════════════════════════════════════════════

function Modal({
  titulo,
  ayuda,
  onCerrar,
  bloqueado,
  children,
}: {
  titulo: string
  ayuda?: string
  onCerrar: () => void
  bloqueado?: boolean
  children: React.ReactNode
}) {
  useLenisQuieto()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={bloqueado ? undefined : onCerrar}
      />
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-6 py-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-fg">{titulo}</h2>
            {ayuda ? <p className="text-sm text-fg-muted">{ayuda}</p> : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Paso 1 — anotar la cuenta que la inmobiliaria ya paga
// ═══════════════════════════════════════════════════════════════════════════

function DialogoDeCuenta({
  portal,
  onCerrar,
  onGuardado,
}: {
  portal: PortalConCuenta
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [etiqueta, setEtiqueta] = useState(portal.cuenta?.etiqueta ?? '')
  const [identificador, setIdentificador] = useState(
    portal.cuenta?.identificadorEnElPortal ?? '',
  )
  const [notas, setNotas] = useState(portal.cuenta?.notas ?? '')
  const [activa, setActiva] = useState(portal.cuenta?.activa ?? true)
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await publicacionApi.guardarCuenta({
        portal: portal.portal,
        etiqueta: etiqueta.trim() || undefined,
        identificadorEnElPortal: identificador.trim() || undefined,
        notas: notas.trim() || undefined,
        activa,
        // El modo se deja en EXPORTACION a propósito: hoy ningún portal de
        // afuera tiene integración, y ofrecer «API» sería ofrecer un modo que
        // el back degrada de inmediato. Cuando exista el convenio, acá entra
        // el selector.
        modo: 'EXPORTACION',
      })
      toast.success(
        r.aviso ?? `Cuenta de ${portal.nombre} guardada. Ya puedes publicar ahí.`,
      )
      invalidar('portafolio')
      onGuardado()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la cuenta'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={
        portal.cuenta ? `Cuenta de ${portal.nombre}` : `Anotar tu cuenta de ${portal.nombre}`
      }
      ayuda="Es la cuenta que tu inmobiliaria ya paga en ese portal. Leasefy no la crea ni te cobra por ella: la anota para saber a nombre de quién sale cada aviso."
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={enviar} className="space-y-4 p-6" data-testid="form-de-cuenta">
        <div className="space-y-1.5">
          <Label htmlFor="cuenta-etiqueta">Cómo la llamas</Label>
          <Input
            id="cuenta-etiqueta"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            maxLength={120}
            placeholder={`Plan ${portal.nombre} 2026`}
          />
          <p className="text-xs text-fg-subtle">
            Para reconocerla si mañana tienes más de una. Opcional.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cuenta-identificador">Usuario o código en el portal</Label>
          <Input
            id="cuenta-identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            maxLength={120}
            placeholder="El usuario con el que entras a su panel"
          />
          <p className="text-xs text-fg-subtle">
            No guardamos contraseñas. Esto es sólo para que el equipo sepa con
            qué usuario cargar el archivo.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cuenta-notas">Notas</Label>
          <Textarea
            id="cuenta-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Cuántos avisos incluye el plan, cuándo se renueva, a quién llamar…"
          />
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
            className="mt-0.5 h-4 w-4"
            data-testid="cuenta-activa"
          />
          <span className="text-sm">
            <span className="font-medium text-fg">La cuenta está al día</span>
            <span className="block text-fg-muted">
              Si la desmarcas, ese portal deja de ofrecerse al publicar. Es lo que
              corresponde cuando el plan se venció.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando} data-testid="guardar-cuenta">
            {guardando ? 'Guardando…' : 'Guardar la cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Paso 2 — sacar un inmueble a los portales
// ═══════════════════════════════════════════════════════════════════════════

interface InmuebleParaPublicar {
  propertyId: string
  titulo: string
  codigo: number | null
  donde: string
}

function DialogoDePublicar({
  inmuebles,
  portales,
  onCerrar,
  onPublicado,
}: {
  inmuebles: InmuebleParaPublicar[]
  portales: PortalConCuenta[]
  onCerrar: () => void
  onPublicado: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<InmuebleParaPublicar | null>(null)
  const [revision, setRevision] = useState<RevisionDePublicacion | null>(null)
  const [revisando, setRevisando] = useState(false)
  const [marcados, setMarcados] = useState<string[]>([])
  const [publicando, setPublicando] = useState(false)

  /** Sólo los portales donde la inmobiliaria tiene cuenta al día: el back
   *  rechaza los demás con `SIN_CUENTA_EN_EL_PORTAL`, así que ofrecerlos sería
   *  ofrecer un error. */
  const conCuenta = portales.filter((p) => p.cuenta?.activa)

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const base = q
      ? inmuebles.filter(
          (i) =>
            i.titulo.toLowerCase().includes(q) ||
            i.donde.toLowerCase().includes(q) ||
            String(i.codigo ?? '').includes(q),
        )
      : inmuebles
    return base.slice(0, 8)
  }, [inmuebles, busqueda])

  const escoger = async (i: InmuebleParaPublicar) => {
    setElegido(i)
    setRevision(null)
    setRevisando(true)
    try {
      setRevision(await publicacionApi.revision(i.propertyId))
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos revisar ese inmueble'))
      setElegido(null)
    } finally {
      setRevisando(false)
    }
  }

  const publicar = async () => {
    if (!elegido || marcados.length === 0) return
    setPublicando(true)
    try {
      const r = await publicacionApi.publicar(elegido.propertyId, marcados)
      const aMano = r.porSubirAMano.length
      toast.success(
        aMano > 0
          ? `Listo. Quedan ${aMano === 1 ? '1 aviso' : `${aMano} avisos`} por subir al portal: descarga el archivo y cárgalo en su panel.`
          : 'Listo, el inmueble queda publicado.',
      )
      invalidar('portafolio')
      onPublicado()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo publicar'))
    } finally {
      setPublicando(false)
    }
  }

  const puedeSalir = revision?.sePuedePublicar === true && revision.ocupacion.puede

  return (
    <Modal
      titulo="Sacar un inmueble a los portales"
      ayuda="Escoge el inmueble y en qué portales quieres que salga."
      onCerrar={onCerrar}
      bloqueado={publicando}
    >
      <div className="space-y-5 p-6">
        {/* ── Escoger el inmueble ─────────────────────────────────────── */}
        {!elegido ? (
          <div className="space-y-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca por título, barrio o código…"
                className="pl-9"
                data-testid="buscar-inmueble"
                autoFocus
              />
            </div>
            {resultados.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                {inmuebles.length === 0
                  ? 'Todavía no tienes inmuebles en el portafolio.'
                  : 'Ningún inmueble coincide con eso.'}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-border" data-testid="resultados">
                {resultados.map((i) => (
                  <li key={i.propertyId}>
                    <button
                      type="button"
                      onClick={() => void escoger(i)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-muted"
                      data-testid={`elegir-${i.propertyId}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">
                          {i.titulo}
                          {i.codigo != null ? (
                            <span className="ml-1.5 font-normal text-fg-subtle">
                              #{i.codigo}
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-fg-muted">
                          {i.donde}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{elegido.titulo}</p>
                <p className="truncate text-xs text-fg-muted">{elegido.donde}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setElegido(null)
                  setRevision(null)
                  setMarcados([])
                }}
                disabled={publicando}
              >
                Cambiar
              </Button>
            </div>

            {/* ── Qué dice el back de ese inmueble ───────────────────── */}
            {revisando ? (
              <p className="text-sm text-fg-muted">Revisando el inmueble…</p>
            ) : revision ? (
              puedeSalir ? (
                <p className="flex items-start gap-2 text-sm text-fg-muted">
                  <CheckCircle
                    weight="duotone"
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span>
                    El aviso está completo: {revision.fotos} fotos y todos los datos
                    que piden los portales.
                  </span>
                </p>
              ) : (
                <div
                  className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3"
                  data-testid="le-falta"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    <Warning weight="duotone" className="h-4 w-4 text-warning" aria-hidden="true" />
                    Este inmueble todavía no puede salir
                  </p>
                  <ul className="ml-6 list-disc space-y-1 text-sm text-fg-muted">
                    {revision.falta.map((f) => (
                      <li key={f.campo}>{f.que}</li>
                    ))}
                    {!revision.ocupacion.puede ? (
                      <li>{revision.ocupacion.motivo ?? revision.ocupacion.porQue}</li>
                    ) : null}
                  </ul>
                  <p className="text-xs text-fg-subtle">
                    Complétalo en la ficha del inmueble y vuelve acá.
                  </p>
                </div>
              )
            ) : null}

            {/* ── En qué portales ────────────────────────────────────── */}
            {puedeSalir ? (
              conCuenta.length === 0 ? (
                <p
                  className="rounded-lg border border-border bg-surface p-3 text-sm text-fg-muted"
                  data-testid="sin-cuentas-para-publicar"
                >
                  No tienes ninguna cuenta de portal al día. Anota abajo la que ya
                  pagas y vuelve: sin cuenta activa el portal no recibe el aviso.
                </p>
              ) : (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium text-fg">
                    ¿En qué portales?
                  </legend>
                  {conCuenta.map((p) => (
                    <label
                      key={p.portal}
                      className="flex items-start gap-2.5 rounded-lg border border-border p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={marcados.includes(p.portal)}
                        onChange={(e) =>
                          setMarcados((antes) =>
                            e.target.checked
                              ? [...antes, p.portal]
                              : antes.filter((x) => x !== p.portal),
                          )
                        }
                        data-testid={`marcar-${p.portal}`}
                      />
                      <span className="text-sm">
                        <span className="font-medium text-fg">{p.nombre}</span>
                        <span className="block text-fg-muted">
                          {p.cuenta?.modoEfectivo === 'API'
                            ? 'Sale solo, sin que tengas que hacer nada más.'
                            : 'Vas a tener que subir el archivo en su panel.'}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )
            ) : null}
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onCerrar} disabled={publicando}>
            Cancelar
          </Button>
          <Button
            onClick={() => void publicar()}
            disabled={!puedeSalir || marcados.length === 0 || publicando}
            data-testid="confirmar-publicar"
          >
            {publicando ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Cómo funciona: los cuatro pasos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Los pasos van numerados porque son de verdad una secuencia —el 2 no se puede
 * sin el 1, y el back lo hace cumplir—, no porque un «01 / 02 / 03» decore.
 */
const PASOS: { que: string; como: string }[] = [
  {
    que: 'Anota tu cuenta',
    como: 'La que ya pagas en ese portal. Sin una cuenta al día, el portal no recibe el aviso.',
  },
  {
    que: 'Saca el inmueble',
    como: 'Escoge cuál y en qué portales. Te decimos antes si le falta algo para poder salir.',
  },
  {
    que: 'Sube el archivo',
    como: 'Descargas el archivo del portal y lo cargas en su panel, con tu usuario.',
  },
  {
    que: 'Marca «ya la subí»',
    como: 'Así el tablero deja de pedírtelo y queda constancia de cuándo salió.',
  },
]

function ComoFunciona() {
  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="como-funciona"
    >
      <h2 className="mb-4 text-sm font-medium text-fg">
        Cómo sale un inmueble a un portal
      </h2>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map((p, i) => (
          <li key={p.que} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg text-xs font-medium text-background"
            >
              {i + 1}
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-fg">{p.que}</span>
              <span className="block text-sm leading-relaxed text-fg-muted">{p.como}</span>
            </span>
          </li>
        ))}
      </ol>
      <p
        className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-fg-muted"
        data-testid="aviso-sin-api"
      >
        Los pasos 3 y 4 los hace una persona, y no es un descuido nuestro:{' '}
        <span className="font-medium text-fg">
          ningún portal de afuera publica solo todavía
        </span>
        . Fincaraíz, Metrocuadrado y Mercado Libre piden firmar un convenio de
        integración y Leasefy no tiene ninguno. Sólo «Sitio propio» —el catálogo
        de Leasefy— sale solo. El día que exista el convenio, este mismo tablero
        cambia de estado sin que tengas que hacer nada.
      </p>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// La pantalla
// ═══════════════════════════════════════════════════════════════════════════

export function PortalesClient() {
  const cuentas = useCrm(() => publicacionApi.cuentas(), [], ['portafolio'])
  const tablero = useCrm(() => publicacionApi.tablero(), [], ['portafolio'])
  const { consignaciones } = useConsignaciones()
  const { canAccess } = usePermissions()
  const puedeEditar = canAccess('portafolio', 'edit')

  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [bajando, setBajando] = useState<string | null>(null)
  const [cuentaAbierta, setCuentaAbierta] = useState<PortalConCuenta | null>(null)
  const [publicando, setPublicando] = useState(false)

  const filas = tablero.datos?.filas ?? []
  const portales = cuentas.datos?.portales ?? []

  /** Cuántos avisos esperan que una persona los suba, por portal. Es lo que
   *  decide si «Descargar archivo» sirve para algo. */
  const porSubir = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const f of filas) {
      if (f.estado === 'POR_EXPORTAR') {
        cuenta.set(f.portal, (cuenta.get(f.portal) ?? 0) + 1)
      }
    }
    return cuenta
  }, [filas])

  /** Lo que pide mano primero; lo demás debajo, en el mismo orden que vino. */
  const ordenadas = useMemo(
    () =>
      [...filas].sort((a, b) => {
        const pa = PIDE_MANO.includes(a.estado) ? 0 : 1
        const pb = PIDE_MANO.includes(b.estado) ? 0 : 1
        return pa - pb
      }),
    [filas],
  )

  const pendientes = filas.filter((f) => PIDE_MANO.includes(f.estado)).length

  const inmuebles: InmuebleParaPublicar[] = useMemo(
    () =>
      consignaciones
        .filter((c) => c.propertyId)
        .map((c) => ({
          propertyId: c.propertyId,
          titulo: c.propertyTitle,
          codigo: c.propertyCode,
          donde: [c.propertyZone, c.propertyCity].filter(Boolean).join(', '),
        })),
    [consignaciones],
  )

  async function confirmar(propertyId: string, portal: string) {
    const clave = `${propertyId}:${portal}`
    setConfirmando(clave)
    try {
      await publicacionApi.confirmar(propertyId, portal)
      toast.success('Queda registrado que el aviso ya está arriba.')
      invalidar('portafolio')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar'))
    } finally {
      setConfirmando(null)
    }
  }

  async function bajar(propertyId: string, portal: string) {
    const clave = `${propertyId}:${portal}`
    setBajando(clave)
    try {
      const r = await publicacionApi.despublicar(propertyId, [portal])
      toast.success(
        r.porBajarAMano.length > 0
          ? 'Marcado para bajar. Acuérdate de quitarlo también en el panel del portal.'
          : 'El aviso queda despublicado.',
      )
      invalidar('portafolio')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo despublicar'))
    } finally {
      setBajando(null)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Publicación en portales</h1>
        <p className="text-sm text-fg-muted">
          Saca tus inmuebles a los portales donde ya pagas cuenta, y lleva en un
          solo lado qué está publicado dónde.
        </p>
      </header>

      <ComoFunciona />

      {/* ── 1 · Las cuentas ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tus cuentas en cada portal</CardTitle>
          <p className="text-sm text-fg-muted">
            Leasefy no vende ni crea estas cuentas: publica con las que tu
            inmobiliaria ya paga.
          </p>
        </CardHeader>
        <CardContent>
          {cuentas.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="cuentas-no-habilitadas">
              Próximamente: {cuentas.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={cuentas.cargando}
              error={cuentas.errorCrudo}
              queEs="las cuentas de portal"
              onReintentar={cuentas.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={4} columnas={3} />}
            >
              <ul className="divide-y" data-testid="lista-de-portales">
                {portales.map((p) => {
                  const cuantos = porSubir.get(p.portal) ?? 0
                  return (
                    <li
                      key={p.portal}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                      data-testid={`portal-${p.portal}`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="flex items-center gap-2 font-medium text-fg">
                          {p.nombre}
                          {p.cuenta?.activa ? (
                            <Badge variant="secondary">Cuenta al día</Badge>
                          ) : null}
                          {p.cuenta && !p.cuenta.activa ? (
                            <Badge variant="outline">Cuenta en pausa</Badge>
                          ) : null}
                          {p.cuenta?.modoEfectivo === 'API' ? (
                            <Badge>Publica solo</Badge>
                          ) : null}
                        </p>
                        <p className="text-sm text-fg-muted">
                          {!p.cuenta ? (
                            <>
                              Sin cuenta anotada — hoy este portal{' '}
                              <span className="font-medium text-fg">
                                no puede recibir avisos
                              </span>
                              .
                            </>
                          ) : p.cuenta.modoEfectivo === 'API' ? (
                            'Los avisos salen y se bajan solos.'
                          ) : (
                            <>
                              Por archivo: se descarga y se sube al panel del portal
                              {p.cuenta.identificadorEnElPortal
                                ? ` con ${p.cuenta.identificadorEnElPortal}`
                                : ''}
                              .
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 🔴 Descargar sólo si hay algo que descargar: seis
                            botones que bajan un CSV vacío es lo que hacía que
                            esta pantalla no se entendiera. */}
                        {cuantos > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`exportar-${p.portal}`}
                          >
                            <a
                              href={publicacionApi.exportarUrl(p.portal)}
                              download={`${p.portal.toLowerCase()}.csv`}
                            >
                              <DownloadSimple className="mr-1.5 h-4 w-4" />
                              Descargar {cuantos} {cuantos === 1 ? 'aviso' : 'avisos'}
                            </a>
                          </Button>
                        ) : null}
                        {puedeEditar ? (
                          <Button
                            variant={p.cuenta ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => setCuentaAbierta(p)}
                            data-testid={`cuenta-${p.portal}`}
                          >
                            {p.cuenta ? 'Editar' : 'Anotar la cuenta'}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      {/* ── 2 · Las publicaciones ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Qué está publicado dónde</CardTitle>
            <p className="text-sm text-fg-muted">
              {pendientes > 0
                ? `${pendientes} ${pendientes === 1 ? 'aviso espera' : 'avisos esperan'} que alguien los suba o los baje en el panel del portal.`
                : 'Un renglón por inmueble y portal, con el estado de su aviso.'}
            </p>
          </div>
          {puedeEditar ? (
            <Button
              size="sm"
              onClick={() => setPublicando(true)}
              data-testid="abrir-publicar"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Sacar un inmueble
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {tablero.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="tablero-no-habilitado">
              Próximamente: {tablero.noHabilitado}
            </p>
          ) : (
            <EstadoDeDatos
              cargando={tablero.cargando}
              error={tablero.errorCrudo}
              vacio={filas.length === 0}
              queEs="las publicaciones"
              onReintentar={tablero.refetch}
              conservarContenido
              esqueleto={<EsqueletoTabla filas={6} columnas={4} />}
              cuandoVacio={
                <EmptyState
                  icon={CloudArrowUp}
                  title="Ningún inmueble está en un portal todavía"
                  description="Usa «Sacar un inmueble» para escoger cuál sale y a dónde. Acá vas a ver el estado de cada aviso y lo que te falta hacer."
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tabla-publicaciones">
                  <thead>
                    <tr className="border-b text-left text-fg-muted">
                      <th className="py-2 pr-4 font-medium">Inmueble</th>
                      <th className="py-2 pr-4 font-medium">Portal</th>
                      <th className="py-2 pr-4 font-medium">Estado</th>
                      <th className="py-2 font-medium">Qué falta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenadas.map((f) => {
                      const rotulo = ROTULO[f.estado]
                      const clave = `${f.propertyId}:${f.portal}`
                      return (
                        <tr
                          key={f.id}
                          className={cn(
                            'border-b last:border-0',
                            PIDE_MANO.includes(f.estado) && 'bg-warning/5',
                          )}
                          data-testid={`publicacion-${f.id}`}
                        >
                          <td className="py-2 pr-4">
                            <span className="font-medium">
                              {f.inmueble?.title ?? 'Inmueble'}
                            </span>
                            {f.inmueble?.code ? (
                              <span className="ml-1.5 text-fg-subtle">
                                #{f.inmueble.code}
                              </span>
                            ) : null}
                            <div className="text-fg-muted">
                              {[f.inmueble?.neighborhood, f.inmueble?.city]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </td>
                          <td className="py-2 pr-4">{f.nombreDelPortal}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={rotulo.variant}>{rotulo.texto}</Badge>
                            {f.ultimoError ? (
                              <div className="mt-1 text-xs text-destructive">
                                {f.ultimoError}
                              </div>
                            ) : null}
                            {f.exportadaEl && f.estado === 'POR_EXPORTAR' ? (
                              <div className="mt-1 text-xs text-fg-muted">
                                Archivo descargado el {f.exportadaEl.slice(0, 10)}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {f.estado === 'POR_EXPORTAR' && puedeEditar ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={confirmando === clave}
                                  onClick={() => void confirmar(f.propertyId, f.portal)}
                                  data-testid={`confirmar-${f.id}`}
                                >
                                  {confirmando === clave ? 'Guardando…' : 'Ya la subí'}
                                </Button>
                              ) : null}
                              {f.urlExterna ? (
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={f.urlExterna} target="_blank" rel="noreferrer">
                                    Ver el aviso
                                  </a>
                                </Button>
                              ) : null}
                              {f.viva && puedeEditar ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={bajando === clave}
                                  onClick={() => void bajar(f.propertyId, f.portal)}
                                  data-testid={`bajar-${f.id}`}
                                >
                                  {bajando === clave ? 'Bajando…' : 'Bajar del portal'}
                                </Button>
                              ) : null}
                              {!f.viva && !f.urlExterna ? (
                                <span className="text-fg-subtle">Nada</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </EstadoDeDatos>
          )}
        </CardContent>
      </Card>

      {cuentaAbierta ? (
        <DialogoDeCuenta
          portal={cuentaAbierta}
          onCerrar={() => setCuentaAbierta(null)}
          onGuardado={() => {
            setCuentaAbierta(null)
            void cuentas.refetch()
          }}
        />
      ) : null}

      {publicando ? (
        <DialogoDePublicar
          inmuebles={inmuebles}
          portales={portales}
          onCerrar={() => setPublicando(false)}
          onPublicado={() => {
            setPublicando(false)
            void tablero.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
