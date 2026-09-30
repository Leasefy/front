'use client'

/**
 * Por aprobar · Vinci — lo que Vinci dejó esperando a una persona, DICIENDO
 * QUÉ ES (26-09-2026):
 *   · «Vinci propone…» (Manual) → «Hacerlo» abre el plan y le escribe;
 *   · «Mensaje listo…» (Copiloto) → «Enviar» (en horario de ley; se puede
 *     deshacer desde la Bandeja del Piloto mientras no salga);
 *   · «Oferta por aprobar» → sólo el administrador;
 *   · «El mensaje no salió» → el porqué, y «Enterado».
 * Antes: «propietario notificado» para un correo INTERNO al responsable, y
 * un «Confirmar» igual para todo.
 *
 * 29-09-2026 · glow-up: la cabecera del panel; la lista en una tarjeta con un
 * ícono de dominio por fila (mensaje, propuesta, oferta, aviso); el mensaje
 * que saldría en un pozo, tal cual. La llave de envío apagada se dice UNA vez
 * arriba: antes cada mensaje listo repetía la misma frase del micro debajo.
 */
import { useState } from 'react'
import Link from 'next/link'
import type { Icon } from '@phosphor-icons/react'
import {
  ChatText,
  CheckCircle,
  CurrencyCircleDollar,
  EnvelopeSimple,
  Lightbulb,
  ListChecks,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { SinDatos } from '@/components/estado/SinDatos'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAuth } from '@/lib/auth'
import { ErrorDeVinci, hacerlo, resolverOferta, revisarDecision } from '@/lib/api/retencion'
import { useDecisionesDeVinci } from '@/lib/hooks/retencion/use-vinci'
import { NOMBRE_DE_LA_OFERTA, QUE_ES_CADA_DECISION, QUIEN, detalleEnPalabras, fechaYHora } from '@/components/retencion/vinci'
import { CabeceraDeVinci, TarjetaDeVinci } from '@/components/retencion/piezas'
import type { DecisionDeVinci, DetalleDeLaOferta, Poblacion } from '@/lib/types/retencion'

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

/** La frase del micro cuando la llave de envío está apagada: ya se dice arriba, una vez. */
const ES_LA_LLAVE_APAGADA = /env[ií]o de vinci est[aá] apagado/i

const ICONO_DE_CADA_DECISION: Record<string, Icon> = {
  propuesta: Lightbulb,
  mensaje_listo: ChatText,
  mensaje_no_salio: WarningCircle,
  oferta: CurrencyCircleDollar,
  notified: EnvelopeSimple,
}

function nombreDe(d: DecisionDeVinci): string {
  const p = d.payload ?? {}
  return texto(p.nombre) ?? texto((p.mensaje as Record<string, unknown> | undefined)?.nombre) ?? 'una persona sin nombre registrado'
}

function textoDelMensaje(d: DecisionDeVinci): string | null {
  const p = d.payload ?? {}
  return texto((p.mensaje as Record<string, unknown> | undefined)?.texto) ?? texto(p.texto)
}

function porQue(d: DecisionDeVinci): string | null {
  const senales = Array.isArray(d.payload?.senales) ? (d.payload!.senales as Array<{ texto?: unknown; puntos?: unknown }>) : []
  const partes = senales
    .slice(0, 3)
    .map((s) => (typeof s.texto === 'string' ? `${s.texto} (+${String(s.puntos)})` : null))
    .filter(Boolean)
  const puntaje = typeof d.payload?.puntaje === 'number' ? `${d.payload.puntaje}/100` : null
  return [puntaje, partes.join('; ')].filter(Boolean).join(': ') || null
}

function Fila({ d, envioApagado, onListo }: { d: DecisionDeVinci; envioApagado: boolean; onListo: () => Promise<void> }) {
  const { agency } = useAuth()
  const { isAdmin } = usePermissionsContext()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aceptada, setAceptada] = useState(false)
  const p = d.payload ?? {}

  const correr = async (clave: string, f: () => Promise<unknown>, ok: (r: unknown) => string) => {
    if (!agency?.id) return
    setOcupado(clave)
    try {
      const r = await f()
      toast.success(ok(r))
      await onListo()
    } catch (e) {
      if (e instanceof ErrorDeVinci && e.code === 'ENVIO_APAGADO') {
        toast.message('El envío de Vinci está apagado', {
          description: 'El mensaje sigue listo: escríbele tú y márcalo con «Ya lo contacté».',
        })
      } else {
        toast.error('No se pudo', { description: e instanceof Error ? e.message : undefined })
      }
    } finally {
      setOcupado(null)
    }
  }

  const confirmar = (label: string, outcome: 'upheld' | 'overridden' = 'upheld') => (
    <Button
      type="button"
      size="sm"
      variant={outcome === 'upheld' ? 'outline' : 'ghost'}
      hideArrow
      isLoading={ocupado === `rev:${outcome}`}
      onClick={() => void correr(`rev:${outcome}`, () => revisarDecision(agency!.id, d.id, outcome), () => 'Listo.')}
    >
      {label}
    </Button>
  )

  let titulo = QUE_ES_CADA_DECISION[d.decisionType] ?? d.decisionType
  let subtitulo: string | null = null
  let acciones: React.ReactNode = confirmar('Confirmar')
  if (d.decisionType === 'propuesta') {
    titulo = `Vinci propone retener a ${nombreDe(d)}`
    acciones = (
      <>
        <Button
          type="button"
          size="sm"
          hideArrow
          isLoading={ocupado === 'hacer'}
          onClick={() => void correr('hacer', () => hacerlo(agency!.id, d.id), (r) => (r as { mensaje: string }).mensaje)}
        >
          Hacerlo
        </Button>
        {confirmar('Descartar', 'overridden')}
      </>
    )
  } else if (d.decisionType === 'mensaje_listo') {
    titulo = `Mensaje de Vinci listo para ${nombreDe(d)}`
    // Sin la llave de envío, «Enviar» no haría nada: sólo «Ya lo contacté».
    acciones =
      p.sinContacto === true || envioApagado ? (
        confirmar('Ya lo contacté')
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            hideArrow
            isLoading={ocupado === 'hacer'}
            onClick={() => void correr('hacer', () => hacerlo(agency!.id, d.id), (r) => (r as { mensaje: string }).mensaje)}
          >
            Enviar
          </Button>
          {confirmar('Ya lo contacté')}
        </>
      )
  } else if (d.decisionType === 'mensaje_no_salio') {
    titulo = `El mensaje de Vinci a ${nombreDe(d)} no salió`
    acciones = confirmar('Enterado')
  } else if (d.decisionType === 'oferta') {
    const tipo = texto(p.tipo)
    const nombre = texto(p.nombre)
    titulo = `Oferta por aprobar: ${tipo && NOMBRE_DE_LA_OFERTA[tipo as keyof typeof NOMBRE_DE_LA_OFERTA] ? NOMBRE_DE_LA_OFERTA[tipo as keyof typeof NOMBRE_DE_LA_OFERTA] : 'retención'}`
    const poblacion = p.poblacion === 'inquilino' || p.poblacion === 'propietario' ? QUIEN[p.poblacion as Poblacion] : null
    const detalle = p.detalle && typeof p.detalle === 'object' ? detalleEnPalabras(p.detalle as DetalleDeLaOferta) : ''
    subtitulo = [poblacion ? (nombre ? `${poblacion}: ${nombre}` : poblacion) : nombre, detalle || null].filter(Boolean).join(' · ') || null
    const incremento = p.tipo === 'congelar_incremento' || p.tipo === 'bajar_incremento'
    acciones = isAdmin ? (
      <>
        {incremento ? (
          <div className="flex items-center gap-2">
            <Checkbox id={`vinci-aceptada-${d.id}`} checked={aceptada} onCheckedChange={(v) => setAceptada(v === true)} />
            <label htmlFor={`vinci-aceptada-${d.id}`} className="cursor-pointer text-sm text-fg">
              El propietario ya aceptó
            </label>
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          hideArrow
          isLoading={ocupado === 'aprobar'}
          onClick={() =>
            void correr('aprobar', () => resolverOferta(agency!.id, d.id, 'aprobar', incremento ? { aceptadaPorElPropietario: aceptada } : {}), () => 'Aprobada: Vinci ya la puede ofrecer.')
          }
        >
          Aprobar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          hideArrow
          isLoading={ocupado === 'rechazar'}
          onClick={() => void correr('rechazar', () => resolverOferta(agency!.id, d.id, 'rechazar'), () => 'Rechazada.')}
        >
          Rechazar
        </Button>
      </>
    ) : (
      <span className="text-caption text-fg-muted">Cuesta plata: sólo el administrador la aprueba.</span>
    )
  } else if (d.decisionType === 'notified') {
    // 🔴 Fue un correo INTERNO al responsable. Nunca «propietario notificado».
    acciones = confirmar('Enterado')
  }

  const Icono = ICONO_DE_CADA_DECISION[d.decisionType] ?? ListChecks
  const mensaje = textoDelMensaje(d)
  const razon = d.decisionType === 'mensaje_no_salio' ? texto(p.mensaje) : null
  const motivoCrudo = texto(p.motivo)
  // La llave apagada ya se dijo arriba, una vez: no se repite en cada fila.
  const motivo = motivoCrudo && envioApagado && ES_LA_LLAVE_APAGADA.test(motivoCrudo) ? null : motivoCrudo
  const causa = porQue(d)
  return (
    <li className="flex gap-4 px-5 py-5" data-testid="vinci-por-aprobar">
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted sm:flex">
        <Icono className="h-[18px] w-[18px] text-fg-muted" weight="duotone" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{titulo}</p>
            {subtitulo ? <p className="mt-0.5 text-sm text-fg-muted">{subtitulo}</p> : null}
            <p className="mt-0.5 text-caption text-fg-muted">
              {fechaYHora(d.createdAt)}
              {' · '}
              <Link href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(d.caseId)}`} className="text-primary hover:underline">
                ver el caso
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
        </div>
        {causa ? <p className="text-sm text-fg-muted">{causa}</p> : null}
        {mensaje ? (
          <blockquote className="whitespace-pre-line rounded-md bg-surface-muted px-4 py-3 text-sm leading-relaxed text-fg">{mensaje}</blockquote>
        ) : null}
        {razon ? <p className="text-sm text-fg">{razon}</p> : null}
        {motivo && !razon ? <p className="text-caption text-fg-muted">{motivo}</p> : null}
      </div>
    </li>
  )
}

export default function RevisionesClient() {
  const { data: cola, isLoading, error, refetch } = useDecisionesDeVinci({ reviewableOnly: true, limit: 100 })
  const data = cola?.decisiones
  const envioApagado = cola?.envioHabilitado === false
  const n = data?.length ?? 0
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <CabeceraDeVinci
        titulo="Por aprobar"
        descripcion="Lo que Vinci dejó esperando tu clic: propuestas, mensajes listos, ofertas que cuestan plata y mensajes que no salieron."
      />
      <EstadoDeDatos
        cargando={isLoading && !data}
        error={error}
        vacio={n === 0}
        queEs="lo que espera tu aprobación"
        onReintentar={() => refetch()}
        principal
        cuandoVacio={
          <div className="rounded-lg border border-border bg-card">
            <SinDatos
              queSon="decisiones por aprobar"
              icono={CheckCircle}
              titulo="Nada esperando tu clic"
              descripcion="Cuando Vinci deje un mensaje listo, una propuesta o una oferta que cueste plata, aparece acá."
            />
          </div>
        }
      >
        <div className="space-y-4">
          {envioApagado ? (
            <AlertaAccionable
              severidad="info"
              titulo="El envío de Vinci está apagado en esta plataforma."
              data-testid="vinci-envio-apagado"
            >
              Cada mensaje está listo para que se lo mandes tú; después márcalo con «Ya lo contacté».
            </AlertaAccionable>
          ) : null}
          <TarjetaDeVinci
            id="vinci-cola"
            icono={ListChecks}
            titulo="Esperando tu clic"
            descripcion={`${n} ${n === 1 ? 'decisión' : 'decisiones'} de Vinci.`}
            cuerpo={false}
          >
            <ul className="divide-y divide-border-faint">
              {(data ?? []).map((d) => (
                <Fila key={d.id} d={d} envioApagado={envioApagado} onListo={refetch} />
              ))}
            </ul>
          </TarjetaDeVinci>
        </div>
      </EstadoDeDatos>
    </div>
  )
}
