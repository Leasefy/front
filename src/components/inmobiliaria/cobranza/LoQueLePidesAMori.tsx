'use client'

/**
 * LoQueLePidesAMori — la inmobiliaria escribe en sus palabras lo que Mori
 * puede aceptar o no al negociar; la IA lo traduce y ella confirma (Nico,
 * 21-10-2026: «La IA lo traduce y la inmobiliaria confirma»).
 *
 * 22-10-2026 — rehecha tras la revisora de diseño (5,5/10):
 *   · Con reglas, lo primero es LO QUE RIGE (modo lectura): la lista agrupada y
 *     «Rige desde … · la guardó …». El texto se abre con «Cambiar».
 *   · La revisión es una lista de una sola capa, agrupada por tipo; cada duda va
 *     dentro de su regla con dos opciones, y sin contestarla no se guarda.
 *   · Lo quitado y lo que no se puede salen del texto guardado (lo hace el
 *     micro) y el aviso de «listo» trae «Deshacer» (15 minutos).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LockSimple, X } from '@phosphor-icons/react'
import { Presence, RadioCard, RadioCardGroup } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { useAuth } from '@/lib/auth'
import { useAgencyUsers } from '@/lib/hooks/useInmobiliaria'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  useInstruccionesDeCobranza,
  type DudaDeLaRevision,
  type ReglaDeLaInmobiliaria,
  type RevisionDeLasInstrucciones,
} from '@/lib/hooks/cobranza/use-instrucciones-de-cobranza'

const LARGO_MAXIMO = 4_000
/** El contador sale sólo cuando se acerca al tope. */
const CONTADOR_DESDE = 3_500
const ACUERDOS_GENERALES = '/panel/inmobiliaria/pagos/cobranza/acuerdos#acuerdos-generales'

/** Todo lo que se aprieta como enlace se ve igual: subrayado (revisora, 11.ª ronda). */
const ENLACE = 'underline underline-offset-2'
/** Cuánto deja deshacer el micro después de guardar (`MINUTOS_PARA_DESHACER` del micro). */
const MINUTOS_PARA_DESHACER = 15
/** Con «reducir movimiento» el desplazamiento es instantáneo. */
const desplazamiento = (): ScrollBehavior =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

const EJEMPLO =
  'Por ejemplo: «La primera cuota máximo en 8 días. No aceptamos pagos en efectivo. A los inquilinos con más de 90 días de mora no les ofrezcas cuotas, sólo el pago total.»'

type Grupo = 'sistema' | 'instruccion' | 'otro_lado' | 'no_se_puede'

export function grupoDeLaRegla(r: ReglaDeLaInmobiliaria): Grupo {
  if (r.tipo === 'primera_cuota_max_dias' || r.tipo === 'ultimo_pago_max_dias') return 'sistema'
  if (r.tipo === 'instruccion') return 'instruccion'
  return r.porQue === 'acuerdo_general' ? 'otro_lado' : 'no_se_puede'
}

const TITULO_DEL_GRUPO: Record<Grupo, string> = {
  sistema: 'Se cumple siempre',
  instruccion: 'Mori lo sigue al conversar',
  otro_lado: 'Se configura en otro lado',
  no_se_puede: 'Mori no puede hacerlo',
}

/** Qué significa cada grupo, en una línea (la tarea es nueva para la inmobiliaria). */
const AYUDA_DEL_GRUPO: Record<Grupo, string> = {
  sistema: 'Leasefy no deja que Mori ofrezca otra cosa.',
  instruccion: 'Lo tiene en cuenta en las llamadas y por WhatsApp.',
  otro_lado: 'No rige aquí: se fija en Acuerdos generales, por etapa de mora.',
  no_se_puede: 'La ley no lo permite o Mori no lo hace. No rige.',
}

/** «1 regla» / «3 reglas». */
export const nReglas = (n: number) => (n === 1 ? '1 regla' : `${n} reglas`)

const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** ¿Esta regla ya regía? (misma clase y misma frase, o mismos días). */
function yaRegia(r: ReglaDeLaInmobiliaria, vigentes: readonly ReglaDeLaInmobiliaria[]): boolean {
  return vigentes.some(
    (v) => v.tipo === r.tipo && (normal(v.entendio) === normal(r.entendio) || (v.dias !== null && v.dias === r.dias)),
  )
}

function fechaLegible(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(d)
}

/** La cita sin punto final y, si es larga, recortada con «…» dentro de las comillas. */
function citaCorta(t: string, max = 90): string {
  const c = t.trim().replace(/[.;,]+$/, '')
  return c.length <= max ? c : `${c.slice(0, max).replace(/\s+\S*$/, '')}…`
}

const frasesDe = (t: string) =>
  t
    .split(/[.;\n]+/)
    .map((f) => f.trim())
    .filter((f) => normal(f).length > 0)

/**
 * Qué cambió el borrador frente a lo guardado, en una línea: «agregaste «…»»,
 * «quitaste «…»» o «escribiste «…»» (si cambió una frase). `null` si la diferencia
 * es sólo de puntuación o espacios.
 */
export function resumenDelCambio(borrador: string, guardado: string, max = 60): string | null {
  const enGuardado = new Set(frasesDe(guardado).map(normal))
  const enBorrador = new Set(frasesDe(borrador).map(normal))
  const nuevas = frasesDe(borrador).filter((f) => !enGuardado.has(normal(f)))
  const quitadas = frasesDe(guardado).filter((f) => !enBorrador.has(normal(f)))
  // Frases enteras mientras quepan; si la primera sola no cabe, se corta con «…».
  const cita = (fs: string[]) => {
    const primera = citaCorta(fs[0] as string, max)
    if (primera.endsWith('…')) return primera
    let out = primera
    for (const f of fs.slice(1)) {
      const sig = `${out}. ${f}`
      if (sig.length > max) return `${out}…`
      out = sig
    }
    return out
  }
  if (nuevas.length > 0) return `${quitadas.length > 0 ? 'escribiste' : 'agregaste'} «${cita(nuevas)}»`
  if (quitadas.length > 0) return `quitaste «${cita(quitadas)}»`
  return null
}

function TituloDeGrupo({ grupo }: { grupo: Grupo }) {
  return (
    <div className="pt-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
        {grupo === 'no_se_puede' || grupo === 'otro_lado' ? <LockSimple size={14} aria-hidden /> : null}
        {TITULO_DEL_GRUPO[grupo]}
      </h3>
      <p className="text-caption text-fg-muted">
        {AYUDA_DEL_GRUPO[grupo]}
        {grupo === 'otro_lado' ? (
          <>
            {' '}
            <a href={ACUERDOS_GENERALES} target="_blank" rel="noopener noreferrer" className={`text-fg ${ENLACE}`}>
              Ir a Acuerdos generales
              <span aria-hidden> ↗</span>
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </>
        ) : null}
      </p>
    </div>
  )
}

/** Lo que sale del texto al guardar (quitado o que no rige). */
function SaleDelTexto({ dijo }: { dijo: string }) {
  return <p className="text-caption text-fg-muted">Al guardar, la quitamos de tu texto: «{dijo.trim().replace(/[.;,]+$/, '')}»</p>
}

/** Una regla de la revisión, con su duda y el botón para quitarla. */
function ReglaDeLaRevision({
  regla,
  duda,
  respuesta,
  onResponder,
  quitada,
  onQuitar,
  nueva,
}: {
  regla: ReglaDeLaInmobiliaria
  duda: DudaDeLaRevision | undefined
  respuesta: number | undefined
  onResponder: (i: number | undefined) => void
  quitada: boolean
  onQuitar: () => void
  /** «Nueva» sólo cuando ya regían otras reglas. */
  nueva: boolean
}) {
  const elegida = duda && respuesta !== undefined ? duda.opciones[respuesta] : undefined
  const conDuda = Boolean(duda) && !quitada
  const pendiente = conDuda && elegida === undefined
  return (
    <li data-testid={`regla-${regla.id}`} className="space-y-2 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {pendiente || (nueva && !quitada) ? (
            <div className="flex gap-2">
              {pendiente ? <Badge variant="warning">Duda</Badge> : null}
              {nueva && !quitada ? <Badge variant="secondary">Nueva</Badge> : null}
            </div>
          ) : null}
          <p className={`text-sm text-fg ${quitada ? 'line-through opacity-60' : ''}`}>
            {elegida?.entendio ?? regla.entendio}

          </p>
          {quitada ? (
            <>
              <SaleDelTexto dijo={regla.dijo} />
              <Button type="button" variant="link" size="sm" onClick={onQuitar} className={`h-auto min-h-6 px-0 py-1 text-caption sm:hidden ${ENLACE}`}>
                Volver a incluir
              </Button>
            </>
          ) : (
            <p className="text-caption text-fg-muted">Escribiste: «{citaCorta(regla.dijo)}»</p>
          )}
        </div>
        {quitada ? (
          <Button type="button" variant="ghost" size="sm" onClick={onQuitar} className="hidden shrink-0 sm:inline-flex">
            Volver a incluir
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onQuitar}
            aria-label="Quitar esta regla"
            className={`shrink-0 px-2 ${pendiente || nueva ? 'mt-6' : ''}`}
          >
            <X size={16} aria-hidden />
          </Button>
        )}
      </div>
      {duda && !quitada ? (
        <div id={`duda-${duda.id}`} data-testid={`duda-${duda.id}`} tabIndex={-1} className="space-y-2 outline-none">
          {elegida === undefined ? (
            <>
              <p className="text-sm text-fg">{duda.pregunta}</p>
              <RadioCardGroup
                aria-label={duda.pregunta}
                value=""
                onValueChange={(v) => onResponder(Number(v))}
                className="grid items-stretch gap-2 sm:grid-cols-2"
              >
                {duda.opciones.map((o, i) => (
                  <RadioCard
                    key={o.etiqueta}
                    value={String(i)}
                    label={o.etiqueta}
                  />
                ))}
              </RadioCardGroup>
            </>
          ) : (
            <p className="text-caption text-fg-muted">
              {elegida.etiqueta} ·{' '}
              <Button type="button" variant="link" size="sm" className={`h-auto min-h-6 px-0 py-1 text-caption ${ENLACE}`} onClick={() => onResponder(undefined)}>
                Cambiar
              </Button>
            </p>
          )}
        </div>
      ) : null}
    </li>
  )
}

/** Lo que no rige: aparte, en gris; la explicación va una vez en el título del grupo. */
function LoQueNoRige({ grupo, reglas }: { grupo: 'otro_lado' | 'no_se_puede'; reglas: readonly ReglaDeLaInmobiliaria[] }) {
  if (reglas.length === 0) return null
  return (
    <div data-testid={grupo === 'otro_lado' ? 'otro-lado' : 'no-se-puede'}>
      <TituloDeGrupo grupo={grupo} />
      <ul className="divide-y divide-border">
        {reglas.map((r) => (
          <li key={r.id} data-testid={`regla-${r.id}`} className="space-y-1 py-3 text-sm text-fg-muted">
            <p className="text-fg">{r.entendio}</p>
            {grupo === 'no_se_puede' && r.porQueNo ? <p>{r.porQueNo}</p> : null}
            <SaleDelTexto dijo={r.dijo} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LoQueLePidesAMori({ puedeEditar }: { puedeEditar: boolean }) {
  const { user, agency } = useAuth()
  const { datos, isLoading, error, recargar, revisar, confirmar, deshacer } = useInstruccionesDeCobranza()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [revision, setRevision] = useState<RevisionDeLasInstrucciones | null>(null)
  const [textoRevisado, setTextoRevisado] = useState('')
  const [quitar, setQuitar] = useState<Set<string>>(new Set())
  const [respuestas, setRespuestas] = useState<Record<string, number>>({})
  const [ocupado, setOcupado] = useState<'revisando' | 'guardando' | 'borrando' | 'deshaciendo' | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [faltaTexto, setFaltaTexto] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

  const vigentes = useMemo(() => (datos?.reglas ?? []).filter((r) => r.tipo !== 'no_se_puede'), [datos])
  const sinMigrar = datos?.provisionada === false
  const sePuedeRevisar = puedeEditar && !sinMigrar && datos?.revisionDisponible !== false
  // Sin reglas, el editor se ve directo; con reglas, se abre con «Cambiar».
  const enEdicion = editando || vigentes.length === 0
  // El borrador vive en el navegador (por inmobiliaria): navegar dentro de la app
  // no lo bota. Al volver se ofrece retomarlo.
  const claveDelBorrador = agency?.id ? `leasefy:mori-borrador:${agency.id}` : null
  const [borradorGuardado, setBorradorGuardado] = useState<string | null>(null)
  const borradorLeido = useRef(false)
  // Mientras se ofrece un borrador («Retomar · Descartar»), nada lo pisa ni lo borra: ni
  // ponerse al día con lo guardado ni volver a la pantalla. Es un ref porque el efecto que
  // escribe corre en la misma pasada que el que lee, antes de que el estado se repinte.
  const borradorOfrecido = useRef<string | null>(null)
  const ofrecerBorrador = (crudo: string | null) => {
    borradorOfrecido.current = crudo
    setBorradorGuardado(crudo)
  }
  // Mientras se ofrece, el aviso es la ÚNICA entrada a editar: ni «Cambiar las reglas» ni el
  // campo (abrirían lo guardado al lado de lo escrito, y cancelar ahí botaba el borrador).
  const ofreciendoBorrador = borradorGuardado !== null && !sinMigrar && puedeEditar
  useEffect(() => {
    if (!claveDelBorrador || !datos || borradorLeido.current) return
    borradorLeido.current = true
    try {
      const crudo = window.sessionStorage.getItem(claveDelBorrador)
      const b = crudo ? (JSON.parse(crudo) as { texto?: string }) : null
      if (b?.texto && b.texto !== datos.texto) ofrecerBorrador(crudo)
    } catch {
      /* sin almacenamiento, no hay borrador */
    }
  }, [claveDelBorrador, datos])
  const sucio = texto !== (datos?.texto ?? '') || revision !== null
  useEffect(() => {
    // Sólo escribe quien está editando y sin un borrador ofrecido. Fuera de edición no se toca:
    // el borrador se borra sólo al guardar, al descartarlo o al cancelar.
    if (!claveDelBorrador || !borradorLeido.current || borradorOfrecido.current !== null) return
    if (!(editando || vigentes.length === 0)) return
    try {
      if (sucio) {
        window.sessionStorage.setItem(
          claveDelBorrador,
          JSON.stringify({ texto, textoRevisado, revision, quitar: [...quitar], respuestas }),
        )
      } else window.sessionStorage.removeItem(claveDelBorrador)
    } catch {
      /* sin almacenamiento */
    }
  }, [claveDelBorrador, sucio, texto, textoRevisado, revision, quitar, respuestas, editando, vigentes.length])
  const olvidarBorrador = () => {
    try {
      if (claveDelBorrador) window.sessionStorage.removeItem(claveDelBorrador)
    } catch {
      /* sin almacenamiento */
    }
    ofrecerBorrador(null)
  }
  const retomarBorrador = () => {
    if (!borradorGuardado) return
    try {
      const b = JSON.parse(borradorGuardado) as {
        texto: string
        textoRevisado?: string
        revision?: RevisionDeLasInstrucciones | null
        quitar?: string[]
        respuestas?: Record<string, number>
      }
      cerrarAvisoDeDeshacer()
      setEditando(true)
      setTexto(b.texto)
      setTextoRevisado(b.textoRevisado ?? '')
      // Con una revisión abierta se va a su primera duda (el efecto de `irAlResultado`); si no, al campo.
      if (b.revision) irAlResultado.current = true
      else enfocarElCampo()
      setRevision(b.revision ?? null)
      setQuitar(new Set(b.quitar ?? []))
      setRespuestas(b.respuestas ?? {})
    } catch {
      /* borrador ilegible */
    }
    // Desde aquí lo escribe el efecto con cada cambio.
    ofrecerBorrador(null)
  }
  const descartarBorrador = () => {
    const copia = borradorGuardado
    olvidarBorrador()
    toast('Descartamos el cambio sin guardar.', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          if (!copia) return
          try {
            if (claveDelBorrador) window.sessionStorage.setItem(claveDelBorrador, copia)
          } catch {
            /* sin almacenamiento */
          }
          ofrecerBorrador(copia)
        },
      },
    })
  }
  const cambioDelBorrador = useMemo(() => {
    if (!borradorGuardado) return null
    try {
      return resumenDelCambio((JSON.parse(borradorGuardado) as { texto?: string }).texto ?? '', datos?.texto ?? '')
    } catch {
      return null
    }
  }, [borradorGuardado, datos?.texto])

  // Lo escrito o una revisión abierta no se pierden sin avisar.
  useAvisoAlSalir(enEdicion && (texto !== (datos?.texto ?? '') || revision !== null))

  useEffect(() => {
    if (datos && !editando) setTexto(datos.texto)
  }, [datos, editando])

  // Al llegar la revisión, la pantalla va a «Así lo entendió Mori» y a la primera duda.
  const irAlResultado = useRef(false)
  useEffect(() => {
    if (!revision || !irAlResultado.current) return
    irAlResultado.current = false
    const duda = revision.dudas.find((d) => {
      const regla = revision.reglas.find((r) => r.id === d.reglaId)
      return regla !== undefined && d.opciones.length === 2 && d.opciones.filter((o) => o.entendio.trim() === regla.entendio.trim()).length === 1
    })
    const el = document.getElementById(duda ? `duda-${duda.id}` : 'asi-lo-entendio-mori')
    el?.scrollIntoView?.({ behavior: desplazamiento(), block: 'center' })
    if (duda) el?.focus?.({ preventScroll: true })
  }, [revision])

  const limpiarRevision = () => {
    setRevision(null)
    setQuitar(new Set())
    setRespuestas({})
    setFallo(null)
  }

  const cancelar = () => {
    olvidarBorrador()
    limpiarRevision()
    setEditando(false)
    setTexto(datos?.texto ?? '')
    setFaltaTexto(false)
    volverAlEncabezado()
  }

  // Lo que de verdad se perdería al cancelar. Las respuestas que puso el sistema (iguales a una
  // regla vigente) no cuentan como contestadas, ni la lectura de la IA sola como un cambio.
  const escribio = texto !== (datos?.texto ?? '')
  const contestoAlgo =
    revision !== null &&
    Object.entries(respuestas).some(([id, i]) => {
      const o = revision.dudas.find((d) => d.id === id)?.opciones[i]
      return o !== undefined && !vigentes.some((v) => normal(v.entendio) === normal(o.entendio))
    })
  const loQueSePierde = [
    escribio ? 'lo que escribiste' : null,
    contestoAlgo ? 'lo que contestaste' : null,
    quitar.size > 0 ? 'lo que quitaste' : null,
  ].filter((x): x is string => x !== null)

  // Los dos «Cancelar» (el del editor y el del pie) preguntan antes de botar lo que se cambió.
  const alCancelar = () => (loQueSePierde.length > 0 ? setConfirmarDescarte(true) : cancelar())

  const alRevisar = async () => {
    if (texto.trim().length === 0) {
      setFaltaTexto(true)
      return
    }
    setOcupado('revisando')
    limpiarRevision()
    try {
      const r = await revisar(texto)
      // Lo que ya se había contestado y rige: se precarga (no se vuelve a preguntar).
      const yaContestadas: Record<string, number> = {}
      for (const d of r.dudas) {
        if (d.opciones.length !== 2) continue
        const i = d.opciones.findIndex((o) => vigentes.some((v) => normal(v.entendio) === normal(o.entendio)))
        if (i === 0 || i === 1) yaContestadas[d.id] = i
      }
      setRevision(r)
      setRespuestas(yaContestadas)
      setTextoRevisado(texto)
      irAlResultado.current = true
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { porDefecto: 'No pudimos revisar el texto.', accion: 'ver cómo lo entiende Mori' }))
    } finally {
      setOcupado(null)
    }
  }

  const avisoDeDeshacer = useRef<string | number | null>(null)
  // Mientras el aviso de «listo» está abierto, su «Deshacer» es el único a la vista.
  const [avisoAbierto, setAvisoAbierto] = useState(false)
  const cerrarAvisoDeDeshacer = () => {
    if (avisoDeDeshacer.current !== null) toast.dismiss?.(avisoDeDeshacer.current)
    avisoDeDeshacer.current = null
    setAvisoAbierto(false)
  }
  // «Deshacer» vale lo que deja el micro (15 minutos): está en el aviso de «listo» y, cerrado
  // el aviso, como «Volver a las de antes» en la línea de lo que rige (sólo para quien guardó).
  // No toca el borrador ofrecido: el aviso se recalcula contra lo que vuelva a regir.
  const deshacerElCambio = () => {
    if (ocupado !== null) return
    cerrarAvisoDeDeshacer()
    setOcupado('deshaciendo')
    void deshacer()
      .then((r) => {
        const n = r.reglas.filter((x) => x.tipo !== 'no_se_puede').length
        toast.success(n === 0 ? 'Listo: Mori volvió a quedar sin reglas.' : `Listo: volvieron las de antes. Mori trabaja con ${nReglas(n)}.`)
        volverAlEncabezado()
      })
      .catch((e) => toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo deshacer.', accion: 'deshacer el cambio' })))
      .finally(() => setOcupado(null))
  }
  const avisarYOfrecerDeshacer = (mensaje: string) => {
    // Un solo aviso de «listo» a la vez: el anterior deshacía otra cosa.
    cerrarAvisoDeDeshacer()
    setAvisoAbierto(true)
    const alCerrarse = (t: { id: string | number }) => {
      if (avisoDeDeshacer.current !== t.id) return
      avisoDeDeshacer.current = null
      setAvisoAbierto(false)
    }
    avisoDeDeshacer.current = toast.success(mensaje, {
      duration: 10_000,
      action: { label: 'Deshacer', onClick: deshacerElCambio },
      onDismiss: alCerrarse,
      onAutoClose: alCerrarse,
    })
  }
  // Al salir de la pantalla el aviso se va con ella: su «Deshacer» era de esta pantalla.
  useEffect(
    () => () => {
      if (avisoDeDeshacer.current !== null) toast.dismiss?.(avisoDeDeshacer.current)
    },
    [],
  )
  // `puedeDeshacer` es una foto de cuando se leyó: a los 15 minutos de guardar se deja de ofrecer.
  const [vencioElDeshacer, setVencioElDeshacer] = useState(false)
  useEffect(() => {
    setVencioElDeshacer(false)
    if (!datos?.puedeDeshacer || !datos.confirmadasEn) return
    const quedan = Date.parse(datos.confirmadasEn) + MINUTOS_PARA_DESHACER * 60_000 - Date.now()
    if (!(quedan > 0)) {
      setVencioElDeshacer(true)
      return
    }
    const reloj = setTimeout(() => setVencioElDeshacer(true), quedan)
    return () => clearTimeout(reloj)
  }, [datos?.puedeDeshacer, datos?.confirmadasEn])
  // Al abrir la edición, el cursor queda al final del texto (un toque menos; con teclado, el
  // foco no se pierde cuando el botón apretado desaparece).
  const enfocarElCampo = () => {
    requestAnimationFrame(() => {
      const campo = document.getElementById('instrucciones-de-mori') as HTMLTextAreaElement | null
      if (!campo) return
      campo.focus({ preventScroll: true })
      campo.setSelectionRange?.(campo.value.length, campo.value.length)
    })
  }
  // Al cerrar una edición larga, la tarjeta se pliega y lo que quedó a la vista era otra
  // sección: se vuelve al encabezado si quedó arriba de la ventana, y el foco va al título.
  const volverAlEncabezado = () => {
    requestAnimationFrame(() => {
      const seccion = document.querySelector<HTMLElement>('[data-testid="section-lo-que-le-pides-a-mori"]')
      const h = document.getElementById('heading-lo-que-le-pides-a-mori')
      h?.focus?.({ preventScroll: true })
      // 120 px: debajo de las barras fijas de arriba (el título tapado tampoco se ve).
      if (seccion && h && h.getBoundingClientRect().top < 120) seccion.scrollIntoView?.({ behavior: desplazamiento(), block: 'start' })
    })
  }

  const alGuardar = async () => {
    if (!revision) return
    setOcupado('guardando')
    setFallo(null)
    try {
      const g = await confirmar({ texto: textoRevisado, revisionId: revision.revisionId, quitar: [...quitar], respuestas })
      // Recién guardado se borra el borrador: si falla, lo escrito sigue a salvo.
      olvidarBorrador()
      const n = g.reglas.filter((r) => r.tipo !== 'no_se_puede').length
      const salieron = revision.reglas.filter(
        (r) => (quitar.has(r.id) || r.tipo === 'no_se_puede') && textoRevisado.includes(r.dijo.trim()),
      ).length
      limpiarRevision()
      setEditando(false)
      const frases = salieron === 0 ? '' : salieron === 1 ? ' Quitamos 1 frase de tu texto.' : ` Quitamos ${salieron} frases de tu texto.`
      avisarYOfrecerDeshacer(n === 0 ? `Listo: Mori quedó sin reglas.${frases}` : `Listo: Mori trabaja con ${nReglas(n)}.${frases}`)
      volverAlEncabezado()
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { porDefecto: 'No pudimos guardar.', accion: 'guardar lo que le pides a Mori' }))
    } finally {
      setOcupado(null)
    }
  }

  const alBorrarTodo = async () => {
    setConfirmarBorrado(false)
    olvidarBorrador()
    setOcupado('borrando')
    setFallo(null)
    try {
      await confirmar({ texto: '', revisionId: null, quitar: [], respuestas: {} })
      limpiarRevision()
      setEditando(false)
      avisarYOfrecerDeshacer('Listo: Mori quedó sin reglas.')
      volverAlEncabezado()
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { porDefecto: 'No pudimos quitarlas.', accion: 'dejar a Mori sin reglas' }))
    } finally {
      setOcupado(null)
    }
  }

  // ── Lo que se arma de la revisión ──────────────────────────────────────────
  // Una duda con opciones sólo vale si UNA opción deja la regla como está y la otra la cambia;
  // si no, contestarla no cambiaría nada: va con las que hay que aclarar en el texto.
  const dudaValida = (d: DudaDeLaRevision) => {
    if (d.reglaId === null || d.opciones.length !== 2) return false
    const regla = revision?.reglas.find((r) => r.id === d.reglaId)
    if (!regla) return false
    const iguales = d.opciones.filter((o) => o.entendio.trim() === regla.entendio.trim()).length
    return iguales === 1
  }
  const dudaDe = (reglaId: string) => revision?.dudas.find((d) => d.reglaId === reglaId && dudaValida(d))
  const dudasSinRegla = revision?.dudas.filter((d) => !dudaValida(d)) ?? []
  const pendientes =
    revision?.dudas.filter((d) => dudaValida(d) && !quitar.has(d.reglaId as string) && respuestas[d.id] === undefined)
      .length ?? 0
  // Las que tienen duda van primero en su grupo: son lo único que frena.
  const primeroConDuda = (a: ReglaDeLaInmobiliaria, b: ReglaDeLaInmobiliaria) => Number(Boolean(dudaDe(b.id))) - Number(Boolean(dudaDe(a.id)))
  const delSistema = (revision?.reglas.filter((r) => grupoDeLaRegla(r) === 'sistema') ?? []).sort(primeroConDuda)
  const instrucciones = (revision?.reglas.filter((r) => grupoDeLaRegla(r) === 'instruccion') ?? []).sort(primeroConDuda)
  const otroLado = revision?.reglas.filter((r) => grupoDeLaRegla(r) === 'otro_lado') ?? []
  const noSePuede = revision?.reglas.filter((r) => grupoDeLaRegla(r) === 'no_se_puede') ?? []
  const primeraPendiente = revision?.dudas.find(
    (d) => dudaValida(d) && !quitar.has(d.reglaId as string) && respuestas[d.id] === undefined,
  )
  const irALaDuda = () => {
    if (!primeraPendiente) return
    const el = document.getElementById(`duda-${primeraPendiente.id}`)
    el?.scrollIntoView({ behavior: desplazamiento(), block: 'center' })
    el?.focus({ preventScroll: true })
  }
  const incluidas = [...delSistema, ...instrucciones].filter((r) => !quitar.has(r.id)).length
  // Cómo queda cada regla con la opción elegida (si la hay): eso es lo que se compara con lo vigente.
  const conLaRespuesta = (r: ReglaDeLaInmobiliaria): ReglaDeLaInmobiliaria => {
    const d = dudaDe(r.id)
    const i = d ? respuestas[d.id] : undefined
    const o = d && i !== undefined ? d.opciones[i] : undefined
    return o ? { ...r, entendio: o.entendio, dias: o.dias ?? r.dias } : r
  }
  const seDejanDeAplicar = revision
    ? vigentes.filter((v) => !revision.reglas.some((r) => !quitar.has(r.id) && yaRegia(conLaRespuesta(r), [v])))
    : []
  const textoCambio = revision !== null && texto !== textoRevisado
  // Lo que Mori no tomó del texto: frases que ningún «Escribiste» cubre.
  const sinUsar = revision
    ? textoRevisado
        .split(/[.;\n]+/)
        .map((f) => f.trim())
        .filter((f) => normal(f).length > 0)
        .filter((f) => !revision.reglas.some((r) => normal(r.dijo).includes(normal(f)) || normal(f).includes(normal(r.dijo))))
    : []

  // Quién guardó. El micro guarda el correo (o el id de la sesión si no hay correo): un id
  // interno no se muestra.
  const guardasteTu = Boolean(
    datos?.confirmadasPor && user?.email && datos.confirmadasPor.toLowerCase() === user.email.toLowerCase(),
  )
  const correoDeQuienGuardo = !guardasteTu && datos?.confirmadasPor?.includes('@') ? datos.confirmadasPor : null
  // Nico (23-10-2026): el nombre de la persona, no su correo. Sale de la lista del equipo (sólo se
  // pide cuando guardó otra persona); si no está o no se puede leer, queda el correo.
  const { users: equipo } = useAgencyUsers(correoDeQuienGuardo !== null)
  const nombreDeQuienGuardo = correoDeQuienGuardo
    ? (equipo as { email?: string; name?: string }[])
        .find((m) => m.email?.toLowerCase() === correoDeQuienGuardo.toLowerCase())
        ?.name?.trim() || null
    : null
  const desde = fechaLegible(datos?.confirmadasEn ?? null)
  // «Volver a las de antes»: sólo quien guardó, dentro de los 15 minutos y con el aviso de
  // «listo» ya cerrado (si no, habría dos «Deshacer» a la vista).
  const sePuedeVolverAtras =
    puedeEditar && Boolean(datos?.puedeDeshacer) && !vencioElDeshacer && !avisoAbierto && guardasteTu
  const volverAtras = (
    <Button
      type="button"
      variant="link"
      size="sm"
      className={`-my-1 h-auto min-h-6 px-0 py-1 text-sm text-fg-muted ${ENLACE}`}
      onClick={deshacerElCambio}
      disabled={ocupado !== null}
    >
      {ocupado === 'deshaciendo' ? 'Volviendo…' : 'Volver a las de antes'}
    </Button>
  )
  const hoySinReglas = (
    <p data-testid="hoy-sin-reglas" className="text-sm text-fg-muted">
      Hoy Mori negocia sólo con los acuerdos generales y la ley.
      {/* Recién dejada sin reglas: se puede volver atrás mientras no haya escrito nada. */}
      {sePuedeVolverAtras && !sucio ? (
        <>
          {' · '}
          {volverAtras}
        </>
      ) : null}
    </p>
  )

  const filaDeRevision = (r: ReglaDeLaInmobiliaria) => {
    const d = dudaDe(r.id)
    return (
      <ReglaDeLaRevision
        key={r.id}
        regla={r}
        duda={d}
        respuesta={d ? respuestas[d.id] : undefined}
        onResponder={(i) => {
          if (!d) return
          setRespuestas((prev) => {
            const sig = { ...prev }
            if (i === undefined) delete sig[d.id]
            else sig[d.id] = i
            return sig
          })
        }}
        quitada={quitar.has(r.id)}
        onQuitar={() =>
          setQuitar((prev) => {
            const s = new Set(prev)
            if (s.has(r.id)) s.delete(r.id)
            else s.add(r.id)
            return s
          })
        }
        nueva={vigentes.length > 0 && !yaRegia(conLaRespuesta(r), vigentes)}
      />
    )
  }

  return (
    <section
      data-testid="section-lo-que-le-pides-a-mori"
      className="scroll-mt-32 rounded-lg border border-border bg-card p-6 [overflow-wrap:anywhere]"
      aria-labelledby="heading-lo-que-le-pides-a-mori"
    >
      {/* El encabezado va a todo el ancho de la tarjeta (como sus hermanas); el contenido, en una columna legible. */}
      <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 max-w-3xl space-y-1">
          <h2 id="heading-lo-que-le-pides-a-mori" tabIndex={-1} className="text-lg font-normal text-fg outline-none">
            Lo que le pides a Mori
          </h2>
          {/* Igual en los dos modos; «En tus palabras» lo dice la etiqueta del campo. */}
          <p className="text-sm text-fg-muted">Lo que Mori puede aceptar o no al negociar.</p>
        </div>
        {!isLoading && !error && !enEdicion && puedeEditar && !sinMigrar && !ofreciendoBorrador ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              cerrarAvisoDeDeshacer()
              setEditando(true)
              enfocarElCampo()
            }}
            disabled={ocupado !== null}
            className="shrink-0 self-start"
          >
            Cambiar las reglas
          </Button>
        ) : null}
      </div>
      {/* La línea bajo el encabezado, como en las tarjetas hermanas de la página. */}
      <div className="border-t border-border-faint" />

      {isLoading ? (
        <div data-testid="instrucciones-cargando" className="max-w-3xl space-y-3" aria-busy="true">
          <Skeleton className="h-3 w-40" />
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex items-center gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <FalloDeCarga error={error} queEs="lo que le pides a Mori" onReintentar={recargar} enmarcado={false} />
      ) : (
        <div className="max-w-3xl space-y-4">
          <Presence show={ofreciendoBorrador}>
            <p data-testid="borrador-sin-guardar" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg">
              <span className="w-full">
                {cambioDelBorrador ? `Tienes un cambio sin guardar: ${cambioDelBorrador}.` : 'Tienes un cambio sin guardar.'}
              </span>
              <Button type="button" variant="link" size="sm" className={`h-auto min-h-6 px-0 py-1 ${ENLACE}`} onClick={retomarBorrador}>
                Retomar
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                className={`h-auto min-h-6 px-0 py-1 text-fg-muted ${ENLACE}`}
                onClick={descartarBorrador}
              >
                Descartar
              </Button>
            </p>
          </Presence>
          <Presence show={sinMigrar}>
            <p data-testid="instrucciones-sin-migrar" className="rounded-md bg-muted p-3 text-sm text-fg-muted">
              Todavía no se puede guardar: falta una actualización de la base de Leasefy. No es algo que puedas resolver
              desde el panel.
            </p>
          </Presence>

          {!enEdicion ? (
            <div data-testid="reglas-vigentes" className="space-y-1">
              {desde ? (
                <p className="text-sm text-fg-muted">
                  {/* «las guardaste tú» / «las guardó» enteros (a 390 no queda un «las» suelto); la
                      fecha y un correo largo sí se parten, o se saldrían en pantallas angostas. */}
                  <span>Rige desde el {desde}</span>
                  {guardasteTu ? (
                    <>
                      {' · '}
                      <span className="whitespace-nowrap">las guardaste tú</span>
                    </>
                  ) : correoDeQuienGuardo ? (
                    <>
                      {' · '}
                      <span className="whitespace-nowrap">las guardó</span>{' '}
                      <span data-testid="quien-guardo" className="[overflow-wrap:anywhere]">
                        {nombreDeQuienGuardo ?? correoDeQuienGuardo}
                      </span>
                    </>
                  ) : null}
                  {sePuedeVolverAtras ? (
                    <>
                      {' · '}
                      <span className="whitespace-nowrap">{volverAtras}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
              {(['sistema', 'instruccion'] as const).map((g) => {
                const del = vigentes.filter((r) => grupoDeLaRegla(r) === g)
                if (del.length === 0) return null
                return (
                  <div key={g}>
                    <TituloDeGrupo grupo={g} />
                    <ul className="divide-y divide-border">
                      {del.map((r) => (
                        <li key={r.id} data-testid={`vigente-${r.id}`} className="py-3 text-sm text-fg">
                          {r.entendio}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              {puedeEditar && !sinMigrar && !ofreciendoBorrador ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0 text-danger hover:bg-transparent"
                    onClick={() => {
                      cerrarAvisoDeDeshacer()
                      setConfirmarBorrado(true)
                    }}
                    disabled={ocupado !== null}
                  >
                    {ocupado === 'borrando' ? 'Quitando…' : 'Dejar a Mori sin reglas'}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : !puedeEditar ? (
            <p data-testid="sin-reglas-sin-permiso" className="text-sm text-fg-muted">
              Mori todavía no tiene reglas: negocia con los acuerdos generales y la ley. Sólo un administrador puede dárselas.
            </p>
          ) : ofreciendoBorrador ? (
            // El aviso del borrador es la única entrada; lo que rige hoy se sigue viendo.
            vigentes.length === 0 ? hoySinReglas : null
          ) : (
            <div className="space-y-2">
              {vigentes.length === 0 ? hoySinReglas : null}
              <label htmlFor="instrucciones-de-mori" className="block text-sm font-medium text-fg">
                En tus palabras
              </label>
              <Textarea
                id="instrucciones-de-mori"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value.slice(0, LARGO_MAXIMO))
                  setFaltaTexto(false)
                }}
                placeholder={EJEMPLO}
                rows={4}
                className={`[field-sizing:content] min-h-[6.5rem] ${revision !== null && !textoCambio ? 'max-h-[6.5rem]' : 'max-h-[18rem]'}`}
                readOnly={ocupado === 'revisando'}
                disabled={!puedeEditar || sinMigrar}
                aria-invalid={faltaTexto || undefined}
                aria-describedby={faltaTexto ? 'instrucciones-de-mori-error' : undefined}
              />
              {faltaTexto ? <ErrorDelCampo id="instrucciones-de-mori-error" mensaje="Escribe qué le pides a Mori." /> : null}
              {texto.length >= CONTADOR_DESDE ? (
                <p className="text-right text-caption text-fg-muted">
                  {texto.length.toLocaleString('es-CO')} / {LARGO_MAXIMO.toLocaleString('es-CO')}
                </p>
              ) : null}
              <Presence show={textoCambio}>
                <p className="text-caption text-fg-muted">
                  Cambiaste el texto: revísalo otra vez para guardar.
                  {contestoAlgo ? ' Tendrás que contestar las dudas de nuevo.' : ''}
                  {quitar.size > 0 ? ' Las que quitaste vuelven a aparecer.' : ''}
                </p>
              </Presence>
              {(revision === null || textoCambio) && ocupado !== 'revisando' ? (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {vigentes.length > 0 ? (
                    <Button type="button" variant="ghost" onClick={alCancelar}>
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    hideArrow
                    variant={revision === null || textoCambio ? 'default' : 'outline'}
                    onClick={alRevisar}
                    disabled={!sePuedeRevisar || ocupado !== null}
                    className="w-full sm:w-auto"
                  >
                    Ver cómo lo entiende Mori
                  </Button>
                </div>
              ) : null}

              <Presence show={datos?.revisionDisponible === false && !sinMigrar}>
                <p className="text-caption text-fg-muted">
                  La lectura con IA no está disponible en este momento. Mori sigue con las reglas que rigen hoy; vuelve a intentarlo en unos minutos.
                </p>
              </Presence>
            </div>
          )}

          <Presence show={Boolean(fallo) && revision === null}>
            <p role="alert" className="text-sm text-danger">
              {fallo}
            </p>
          </Presence>

          <Presence show={ocupado === 'revisando'}>
            <div data-testid="mori-leyendo" className="space-y-3" aria-live="polite">
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Spinner className="h-4 w-4" /> Mori está leyendo tu texto…
              </p>
              <Skeleton className="h-3 w-40" />
              {[0, 1, 2].map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </Presence>

          {revision && !textoCambio ? (
            <div id="asi-lo-entendio-mori" data-testid="asi-lo-entendio-mori" className="space-y-1 border-t border-border pt-3">
              <h3 className="font-medium text-fg">Así lo entendió Mori</h3>
              {revision.reglas.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  Mori no encontró reglas. Escribe una por frase, como «La primera cuota máximo en 8 días».
                </p>
              ) : null}
              {delSistema.length > 0 ? (
                <div>
                  <TituloDeGrupo grupo="sistema" />
                  <ul className="divide-y divide-border">{delSistema.map(filaDeRevision)}</ul>
                </div>
              ) : null}
              {instrucciones.length > 0 ? (
                <div>
                  <TituloDeGrupo grupo="instruccion" />
                  <ul className="divide-y divide-border">{instrucciones.map(filaDeRevision)}</ul>
                </div>
              ) : null}
              {seDejanDeAplicar.length > 0 ? (
                <div data-testid="se-dejan-de-aplicar">
                  <div className="pt-3">
                    <h3 className="text-sm font-medium text-fg">Se dejan de aplicar</h3>
                    <p className="text-caption text-fg-muted">Mori deja de usarlas cuando guardes.</p>
                  </div>
                  <ul className="divide-y divide-border">
                    {seDejanDeAplicar.map((r) => (
                      <li key={r.id} className="py-3 text-sm text-fg-muted line-through">
                        {r.entendio}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <LoQueNoRige grupo="otro_lado" reglas={otroLado} />
              <LoQueNoRige grupo="no_se_puede" reglas={noSePuede} />
              {sinUsar.length > 0 ? (
                <div data-testid="sin-usar" className="pt-3">
                  <h3 className="text-sm font-medium text-fg">Mori no usó esto de tu texto</h3>
                  <ul className="space-y-1 pt-1 text-sm text-fg">
                    {sinUsar.map((f) => (
                      <li key={f}>«{citaCorta(f)}»</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className={`h-auto min-h-6 px-0 py-1 text-caption ${ENLACE}`}
                    onClick={() => document.getElementById('instrucciones-de-mori')?.focus()}
                  >
                    Acláralo en tu texto y vuelve a revisar
                  </Button>
                </div>
              ) : null}
              {dudasSinRegla.length > 0 ? (
                <div data-testid="dudas-sin-regla" className="pt-3">
                  <h3 className="text-sm font-medium text-fg">Mori no supo con qué regla va</h3>
                  <ul className="space-y-1 pt-1 text-sm text-fg">
                    {dudasSinRegla.map((d) => (
                      <li key={d.id}>{d.pregunta}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className={`h-auto min-h-6 px-0 py-1 text-caption ${ENLACE}`}
                    onClick={() => document.getElementById('instrucciones-de-mori')?.focus()}
                  >
                    Acláralo en tu texto y vuelve a revisar
                  </Button>
                </div>
              ) : null}


              <Presence show={Boolean(fallo)}>
                <p role="alert" className="pt-2 text-sm text-danger">
                  {fallo}
                </p>
              </Presence>
              <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-end">
                {pendientes > 0 ? (
                  <Button type="button" variant="link" size="sm" onClick={irALaDuda} className={`order-1 h-auto min-h-6 justify-start px-0 py-1 sm:mr-auto ${ENLACE}`}>
                    Contesta {pendientes === 1 ? '1 duda' : `${pendientes} dudas`} para guardar
                  </Button>
                ) : null}
                {revision.reglas.length > 0 ? (
                  <Button
                    type="button"
                    hideArrow
                    onClick={alGuardar}
                    disabled={ocupado !== null || sinMigrar || pendientes > 0}
                    className="order-2 w-full sm:order-3 sm:w-auto"
                  >
                    {ocupado === 'guardando'
                      ? 'Guardando…'
                      : incluidas === 0
                        ? 'Guardar sin reglas'
                        : `Guardar ${nReglas(incluidas)}`}
                  </Button>
                ) : null}
                {vigentes.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={alCancelar}
                    disabled={ocupado !== null}
                    className="order-3 sm:order-2"
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      </div>

      {/* Glow up 23-10: el rojo lo pone la variante del diálogo (Cadence), no clases a mano. */}
      <AlertDialog open={confirmarDescarte} onOpenChange={setConfirmarDescarte}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{escribio ? '¿Descartar lo que escribiste?' : '¿Descartar los cambios?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {loQueSePierde.length > 0
                ? `Se pierde ${loQueSePierde.length === 1 ? loQueSePierde[0] : `${loQueSePierde.slice(0, -1).join(', ')} y ${loQueSePierde[loQueSePierde.length - 1]}`}. `
                : ''}
              Mori sigue con las reglas que rigen hoy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarDescarte(false)
                cancelar()
              }}
            >
              Descartar los cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarBorrado} onOpenChange={setConfirmarBorrado}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dejar a Mori sin reglas?</AlertDialogTitle>
            <AlertDialogDescription>
              Mori dejará de aplicar {nReglas(vigentes.length)}. Sigue negociando con los acuerdos generales y la ley. Puedes
              deshacerlo durante {MINUTOS_PARA_DESHACER} minutos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, dejarlas</AlertDialogCancel>
            <AlertDialogAction onClick={() => void alBorrarTodo()}>Quitar {nReglas(vigentes.length)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
