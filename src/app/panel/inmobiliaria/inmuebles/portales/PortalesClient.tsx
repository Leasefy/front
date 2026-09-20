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
 * **Hoy Leasefy no publica solo en ningún portal de afuera** — y eso es una
 * afirmación sobre NOSOTROS, no sobre el mercado.
 *
 * 🔴 19-09-2026 · Acá decía «ningún portal de afuera publica solo todavía:
 * Fincaraíz, Metrocuadrado y Mercado Libre piden firmar un convenio de
 * integración». Era FALSO, y lo peor: servía de excusa para no construir nada.
 * Mercado Libre tiene una API pública documentada y su app de DevCenter es
 * autoservicio en Colombia; Ciencuadras también se conecta sin intermediario.
 * Properati no existe como destino: se publica en Proppit, que reparte. Los
 * únicos donde de verdad hay que hablar con alguien son Fincaraíz y
 * Metrocuadrado. La corrección de fondo está en
 * `back-erp/src/inmobiliaria/publicacion/portales.ts` y el detalle por portal
 * en `@/lib/portales/como-se-conecta`; este comentario y el párrafo de la
 * pantalla se habían quedado con la versión vieja.
 *
 * El estado real de una publicación pedida es «por subir al portal», y la
 * pantalla lo dice en la cara con el botón de descargar el archivo al lado —
 * en vez de un interruptor que promete algo que no pasa. El día que se
 * construya una integración, la cuenta pasa a modo API y el mismo tablero
 * cambia de estado solo.
 */

import { useEffect, useMemo, useState } from 'react'
import { motivoEnCristiano } from '@/lib/errores/en-cristiano';
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
import { EL_CATALOGO_DE_LEASEFY, marcaDelPortal } from '@/lib/portales/marca'
import { comoSeConecta } from '@/lib/portales/como-se-conecta'
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
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-background"
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
  const conexion = comoSeConecta(portal.portal)

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

        {/* 🔴 El identificador se llama como lo llama SU portal (Nico, 19-09:
            «creo que hasta para conectar con cada portal puede ser diferente
            cada portal»). Antes decía «Usuario o código en el portal» para los
            seis, con el ejemplo «el usuario con el que entras a su panel» —y
            en Metrocuadrado ése es justamente el dato equivocado, porque las
            credenciales de integración son OTRAS. Ver `como-se-conecta.ts`. */}
        <div className="space-y-1.5">
          <Label htmlFor="cuenta-identificador">{conexion.rotuloDelIdentificador}</Label>
          <Input
            id="cuenta-identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            maxLength={120}
            placeholder={conexion.ejemploDelIdentificador}
            data-testid="cuenta-identificador"
          />
          <p className="text-xs text-fg-subtle">
            No guardamos contraseñas. Esto es sólo para que el equipo sepa con
            qué usuario cargar el archivo.
          </p>
          {conexion.cuidado && (
            <p className="text-xs text-warning" data-testid="cuidado-del-portal">
              {conexion.cuidado}
            </p>
          )}
        </div>

        {/* 🔴 Lo que haría falta el día que se conecte de verdad, plegado.
            Hoy no se pide nada de esto —esta pantalla es una libreta, Leasefy
            todavía no publica en ningún portal de afuera— pero saberlo cambia
            a quién se llama: en Ciencuadras la contraseña la genera la propia
            inmobiliaria en 30 segundos; en Metrocuadrado hay que pedirle
            cuatro datos al asesor; en Mercado Libre hay que pagar un paquete
            o el aviso no se crea. Callarlo es dejar que lo descubran a mitad
            de camino. */}
        <details className="rounded-lg border border-border" data-testid="que-pide-este-portal">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-fg">
            Qué pide {portal.nombre} para conectarse de verdad
          </summary>
          <div className="space-y-2 border-t border-border px-3 py-2.5">
            <ul className="space-y-1.5 text-sm text-fg-muted">
              {conexion.paraConectarloDeVerdad.map((linea) => (
                <li key={linea}>· {linea}</li>
              ))}
            </ul>
            <p className="text-xs text-fg-subtle">
              Hoy Leasefy no publica solo en este portal: lo que guardas acá es
              a nombre de quién está la cuenta, para saber con qué usuario
              cargar el archivo. Verificado el 19-09-2026 — {conexion.fuente}
            </p>
          </div>
        </details>

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
  cargandoInmuebles,
  portales,
  onCerrar,
  onPublicado,
}: {
  inmuebles: InmuebleParaPublicar[]
  /**
   * 🔴 El portafolio de una inmobiliaria grande son miles de filas y el
   * endpoint no pagina, así que tarda. Sin esto el diálogo afirmaba «Todavía no
   * tienes inmuebles en el portafolio» a alguien con 2.818 — una frase falsa,
   * dicha con total seguridad, mientras la respuesta venía en camino.
   */
  cargandoInmuebles: boolean
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
      titulo="Publicar un inmueble"
      ayuda="Elige el inmueble y en qué portales quieres publicarlo."
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
            {cargandoInmuebles && inmuebles.length === 0 ? (
              <p
                className="py-6 text-center text-sm text-fg-muted"
                data-testid="buscando-inmuebles"
              >
                Buscando tus inmuebles…
              </p>
            ) : resultados.length === 0 ? (
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
// Una tarjeta por portal
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔴 Por qué monograma y no el logo de cada portal (Nico pidió los logos).
 *
 * No tenemos los archivos, y las tres salidas fáciles son peores que esto:
 * bajarlos del sitio de cada portal deja copyright sin verificar adentro del
 * producto; redibujarlos de memoria o teñir un cuadrado con «más o menos su
 * color» deja una marca FALSA de una empresa que existe, justo en la pantalla
 * que dice dónde se publica el inmueble de un cliente. Es la misma decisión ya
 * tomada para las aseguradoras (`lib/aseguradoras/marca.ts`).
 *
 * `lib/portales/marca.ts` tiene el mapa `LOGOS` listo y vacío: el día que haya
 * un archivo con su licencia verificada, esta tarjeta lo pinta sola.
 */
function TarjetaDePortal({
  portal: p,
  porSubir: cuantos,
  puedeEditar,
  onAnotar,
}: {
  portal: PortalConCuenta
  porSubir: number
  puedeEditar: boolean
  onAnotar: () => void
}) {
  const { iniciales, logo } = marcaDelPortal(p.portal, p.nombre)
  const esNuestro = p.portal === EL_CATALOGO_DE_LEASEFY
  const alDia = p.cuenta?.activa === true
  const enPausa = Boolean(p.cuenta) && !alDia

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4',
        alDia ? 'border-border bg-card' : 'border-dashed border-border bg-surface',
      )}
      data-testid={`portal-${p.portal}`}
    >
      <div className="flex items-start gap-3">
        {/* El mismo recuadro de marca que las aseguradoras
            (`AseguradorasConPrima`): fondo blanco fijo para que un logo de
            marca oscura no desaparezca en modo noche, y `object-contain` para
            que los seis se vean del mismo tamaño aunque sus proporciones vayan
            de 2:1 a 7:1. */}
        <span
          aria-hidden="true"
          className="flex h-11 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md border border-faint bg-white p-1.5 text-sm font-semibold tracking-wide text-fg-muted"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- SVG/PNG de marca; next/image no aporta acá
            <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            iniciales
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{p.nombre}</p>
          <p className="mt-0.5 text-xs">
            {alDia ? (
              <span className="text-success">● Lista para publicar</span>
            ) : enPausa ? (
              <span className="text-warning">● En pausa</span>
            ) : (
              <span className="text-fg-subtle">○ Sin configurar</span>
            )}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg-muted">
        {esNuestro ? (
          <>
            Es nuestro propio catálogo.{' '}
            <span className="font-medium text-fg">Se publica automático</span>,
            sin archivos ni trámites.
          </>
        ) : !p.cuenta ? (
          <>
            {/*
              🔴 19-09 (visto en el navegador): las seis tarjetas decían EXACTAMENTE
              la misma frase, así que la pantalla contestaba «lo mismo» a la
              pregunta de Nico del 18 —«creo que hasta para conectar con cada
              portal puede ser diferente cada portal»—. El detalle por portal ya
              existía (`como-se-conecta.ts`) pero vivía escondido dentro del
              diálogo, a un clic de distancia: había que abrir seis diálogos para
              descubrir que piden cosas distintas. Ahora la tarjeta dice con qué
              se identifica ESTE portal, que es lo primero que cambia entre uno y
              otro.
            */}
            Para publicar aquí necesitamos tu{' '}
            <span className="font-medium text-fg">
              {/* Sin `toLowerCase()`: son nombres propios y los rompía
                  («mercado libre», «proppit», «ciencuadras»). */}
              {comoSeConecta(p.portal).rotuloDelIdentificador}
            </span>
            {comoSeConecta(p.portal).cuidado ? (
              <>
                {'. '}
                {comoSeConecta(p.portal).cuidado}
              </>
            ) : (
              ' — la cuenta que tu inmobiliaria ya paga.'
            )}
          </>
        ) : p.cuenta.modoEfectivo === 'API' ? (
          'Los avisos se publican y se bajan automático.'
        ) : (
          <>
            Se publica con archivo: lo descargas de acá y lo subes en la página
            del portal
            {p.cuenta.identificadorEnElPortal
              ? `, con el usuario ${p.cuenta.identificadorEnElPortal}`
              : ''}
            .
          </>
        )}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {/* 🔴 Descargar sólo si hay algo que descargar: seis botones que bajan
            un CSV vacío es lo que hacía que esta pantalla no se entendiera. */}
        {cuantos > 0 ? (
          <Button variant="outline" size="sm" asChild data-testid={`exportar-${p.portal}`}>
            <a
              href={publicacionApi.exportarUrl(p.portal)}
              download={`${p.portal.toLowerCase()}.csv`}
            >
              <DownloadSimple className="mr-1.5 h-4 w-4" />
              Descargar archivo ({cuantos})
            </a>
          </Button>
        ) : null}
        {puedeEditar ? (
          <Button
            variant={p.cuenta ? 'ghost' : 'outline'}
            size="sm"
            onClick={onAnotar}
            data-testid={`cuenta-${p.portal}`}
          >
            {p.cuenta ? 'Editar' : 'Configurar'}
          </Button>
        ) : null}
      </div>
    </div>
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
    que: 'Conecta tu cuenta',
    como: 'La que tu inmobiliaria ya paga en ese portal. Sin eso, el portal no acepta el aviso.',
  },
  {
    que: 'Elige el inmueble',
    como: 'Cuál publicas y en qué portales. Te avisamos antes si le falta algo.',
  },
  {
    que: 'Sube el archivo',
    como: 'Lo descargas de acá y lo cargas en la página del portal, con tu usuario.',
  },
  {
    que: 'Confirma que ya salió',
    como: 'Así dejamos de pedírtelo y queda registrado cuándo se publicó.',
  },
]

function ComoFunciona() {
  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="como-funciona"
    >
      <h2 className="mb-4 text-sm font-medium text-fg">
        Cómo se publica un inmueble
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
        Los pasos 3 y 4 los hace una persona porque{' '}
        <span className="font-medium text-fg">
          todavía no hemos construido ninguna de las integraciones
        </span>
        , no porque los portales no las tengan. Mercado Libre y Ciencuadras se
        conectan por cuenta propia, sin hablar con nadie; Properati va por
        Proppit, que hay que pedir que lo habilite; Fincaraíz y Metrocuadrado sí
        exigen un acuerdo con su equipo. Sólo «Sitio propio» —el catálogo de
        Leasefy— sale solo. Cada tarjeta dice qué pide la suya.
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
  const { consignaciones, isLoading: cargandoInmuebles } = useConsignaciones()
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
          Publica tus inmuebles en los portales donde tu inmobiliaria ya tiene
          cuenta, y mira en un solo lugar cuáles están publicados y dónde.
        </p>
      </header>

      <ComoFunciona />

      {/* ── 1 · Las cuentas ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tus cuentas de portal</CardTitle>
          <p className="text-sm text-fg-muted">
            Nosotros no vendemos estas cuentas. Publicamos con las que tu inmobiliaria
            ya tiene contratadas: acá sólo nos dices cuáles son.
          </p>
        </CardHeader>
        <CardContent>
          {cuentas.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="cuentas-no-habilitadas">
              {motivoEnCristiano(cuentas.noHabilitado)}
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
              <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                data-testid="lista-de-portales"
              >
                {portales.map((p) => (
                  <TarjetaDePortal
                    key={p.portal}
                    portal={p}
                    porSubir={porSubir.get(p.portal) ?? 0}
                    puedeEditar={puedeEditar}
                    onAnotar={() => setCuentaAbierta(p)}
                  />
                ))}
              </div>
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
              Publicar un inmueble
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {tablero.noHabilitado ? (
            <p className="text-sm text-fg-muted" data-testid="tablero-no-habilitado">
              {motivoEnCristiano(tablero.noHabilitado)}
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
                  title="Todavía no has publicado ningún inmueble"
                  description="Usa «Publicar un inmueble» para elegir cuál y en qué portales. Acá vas a ver el estado de cada publicación y qué te falta hacer."
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
          cargandoInmuebles={cargandoInmuebles}
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
