'use client'

/**
 * Retención · Vinci — el tablero.
 *
 * 26-09-2026 (decisiones de Nico sobre Vinci): lee las rutas reales del micro
 * —quién está en riesgo con las señales del ERP (propietarios E inquilinos),
 * lo que Vinci ya retuvo, y el umbral que decide quién entra (sólo el
 * administrador lo cambia)—; nada de portafolios de ejemplo.
 *
 * 29-09-2026 · glow-up (Nico: «mira eso como se ve de horrible»). Se arma con
 * el patrón de Contratos y Cobranza:
 *   1. la cabecera del panel (Eyebrow, `h1` en `text-h2`, una línea) con
 *      «Medir ahora» a la derecha;
 *   2. los números en la franja del DS (`StatStrip`), DENTRO de una tarjeta
 *      cuyo pie dice en qué modo está Vinci, si el envío está apagado y
 *      cuándo midió. Antes eran dos frases largas y una tarjeta «Lo retenido»
 *      con una tercera; los mismos datos, ahora se leen de un vistazo;
 *   3. lo que espera tu clic (sólo si hay algo), que antes no tenía ningún
 *      camino desde acá hacia «Por aprobar»;
 *   4. lo más urgente con el patrón de tablas del panel;
 *   5. el umbral (sólo el administrador), con el valor por defecto debajo de
 *      cada campo en vez de un párrafo.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, HeartStraight, SlidersHorizontal, Warning } from '@phosphor-icons/react'
import { Stat } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { SinDatos } from '@/components/estado/SinDatos'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/format'
import { guardarUmbral } from '@/lib/api/retencion'
import {
  useDecisionesDeVinci,
  useMetricasDeVinci,
  useRiesgoDeVinci,
  useUmbralDeVinci,
} from '@/lib/hooks/retencion/use-vinci'
import { NOMBRE_DEL_MODO, QUE_HACE_EN_CADA_MODO, fechaYHora } from '@/components/retencion/vinci'
import { CabeceraDeVinci, FranjaDeVinci, TarjetaDeVinci } from '@/components/retencion/piezas'
import { TablaDeCasos } from '@/components/retencion/TablaDeCasos'
import type { MetricasDeVinci, RiesgoDeVinci } from '@/lib/types/retencion'

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Un campo del umbral con su valor por defecto debajo. */
function CampoDelUmbral({
  id,
  label,
  valor,
  onCambio,
  min,
  max,
  porDefecto,
}: {
  id: string
  label: string
  valor: string
  onCambio: (v: string) => void
  min: number
  max: number
  porDefecto: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        data-testid={id}
        type="number"
        min={min}
        max={max}
        step={1}
        className="font-mono"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
      <p className="text-caption text-fg-muted">{porDefecto}</p>
    </div>
  )
}

function Umbral() {
  const { data, isLoading, error, refetch } = useUmbralDeVinci(true)
  const { agency } = useAuth()
  const [umbral, setUmbral] = useState<string>('')
  const [tope, setTope] = useState<string>('')
  const [diasInq, setDiasInq] = useState<string>('')
  const [diasProp, setDiasProp] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const valorUmbral = umbral !== '' ? umbral : data ? String(data.umbral) : ''
  const valorTope = tope !== '' ? tope : data ? String(data.topeDescuentoComisionPct) : ''
  const valorDiasInq = diasInq !== '' ? diasInq : data ? String(data.diasEntreMensajesInquilino) : ''
  const valorDiasProp = diasProp !== '' ? diasProp : data ? String(data.diasEntreMensajesPropietario) : ''

  const guardar = async () => {
    if (!agency?.id) return
    const u = Number(valorUmbral)
    const t = Number(valorTope)
    const di = Number(valorDiasInq)
    const dp = Number(valorDiasProp)
    if (!Number.isInteger(u) || u < 0 || u > 100 || !Number.isInteger(t) || t < 0 || t > 100) {
      toast.error('El umbral y el tope van de 0 a 100, en números enteros.')
      return
    }
    if (!Number.isInteger(di) || di < 1 || di > 365 || !Number.isInteger(dp) || dp < 1 || dp > 365) {
      toast.error('Los días entre mensajes van de 1 a 365.')
      return
    }
    setGuardando(true)
    try {
      await guardarUmbral(agency.id, {
        umbral: u,
        topeDescuentoComisionPct: t,
        diasEntreMensajesInquilino: di,
        diasEntreMensajesPropietario: dp,
      })
      toast.success('Guardado: Vinci usa el nuevo umbral desde ya.')
      setUmbral('')
      setTope('')
      setDiasInq('')
      setDiasProp('')
      await refetch()
    } catch (e) {
      toast.error('No se pudo guardar', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaDeVinci
      id="vinci-umbral"
      icono={SlidersHorizontal}
      titulo="Umbral de riesgo"
      descripcion="Desde qué puntaje alguien entra en riesgo, el tope del descuento en la comisión y cada cuánto Vinci le puede volver a escribir a la misma persona. Sólo el administrador lo cambia."
    >
      <EstadoDeDatos cargando={isLoading && !data} error={error} queEs="el umbral de Vinci" onReintentar={() => refetch()}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-start">
          <CampoDelUmbral
            id="vinci-umbral"
            label="Umbral (0–100)"
            valor={valorUmbral}
            onCambio={setUmbral}
            min={0}
            max={100}
            porDefecto={`${data?.umbralPorDefecto ?? 60} por defecto`}
          />
          <CampoDelUmbral
            id="vinci-tope"
            label="Tope del descuento (%)"
            valor={valorTope}
            onCambio={setTope}
            min={0}
            max={100}
            porDefecto="De la comisión · 20 % por defecto"
          />
          <CampoDelUmbral
            id="vinci-dias-inquilino"
            label="Días entre mensajes al inquilino"
            valor={valorDiasInq}
            onCambio={setDiasInq}
            min={1}
            max={365}
            porDefecto="7 por defecto"
          />
          <CampoDelUmbral
            id="vinci-dias-propietario"
            label="Días entre mensajes al propietario"
            valor={valorDiasProp}
            onCambio={setDiasProp}
            min={1}
            max={365}
            porDefecto="15 por defecto"
          />
          {/* Alineado con los campos, no con sus ayudas: la etiqueta mide lo mismo. */}
          <div className="flex lg:pt-[26px]">
            <Button
              type="button"
              className="w-full lg:w-auto"
              onClick={() => void guardar()}
              isLoading={guardando}
              disabled={!data?.guardable}
              hideArrow
            >
              Guardar
            </Button>
          </div>
        </div>
        {data && !data.guardable ? (
          <p className="mt-3 text-caption text-fg-muted">Falta la tabla de configuración de Vinci en esta base: no se puede guardar.</p>
        ) : null}
      </EstadoDeDatos>
    </TarjetaDeVinci>
  )
}

/** Lo retenido, en dos líneas: la cifra y lo que la acompaña. */
function retenidos(m: MetricasDeVinci): { valor: string; delta: string } {
  const n = m.contratosRetenidos + m.propietariosQueSeQuedaron
  const perdidos = m.perdidos.inquilinos + m.perdidos.propietarios
  if (n === 0 && perdidos === 0) return { valor: '0', delta: 'Ningún caso cerrado todavía' }
  const partes = [
    m.tasaDeRetencion !== null ? `${Math.round(m.tasaDeRetencion * 100)} % de los cerrados` : null,
    `${formatCurrency(m.canonConservadoCop)} al mes`,
    perdidos > 0 ? `${perdidos === 1 ? 'se fue 1' : `se fueron ${perdidos}`}` : null,
  ]
  return { valor: String(n), delta: partes.filter(Boolean).join(' · ') }
}

/** El pie de la tarjeta de números: el modo, la llave de envío y cuándo midió. */
function PieDelResumen({ r }: { r: RiesgoDeVinci }) {
  // Con la llave apagada, el «además escribe solo» de Automático sería falso:
  // lo reemplaza la línea de la llave.
  const queHace = r.modo && !(r.modo === 'autonomo' && !r.envioHabilitado) ? QUE_HACE_EN_CADA_MODO[r.modo] : null
  return (
    <div className="space-y-1.5 border-t border-border bg-surface-muted/40 px-5 py-3 text-sm text-fg-muted">
      {r.modo ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="secondary">{NOMBRE_DEL_MODO[r.modo]}</Badge>
          {queHace ? <span>{queHace}</span> : null}
          {!r.envioHabilitado ? (
            <span data-testid="vinci-envio-apagado">
              El envío de Vinci está apagado en esta plataforma: los mensajes quedan listos para que los mandes tú.
            </span>
          ) : null}
        </p>
      ) : !r.envioHabilitado ? (
        <p data-testid="vinci-envio-apagado">
          El envío de Vinci está apagado en esta plataforma: los mensajes quedan listos para que los mandes tú.
        </p>
      ) : null}
      <p className="text-caption" data-testid="vinci-medido">
        {r.deLoGuardado ? `Medido ${fechaYHora(r.leidoEn)} (el último barrido)` : `Medido ahora (${fechaYHora(r.leidoEn)})`} entre{' '}
        {plural(r.contratosLeidos, 'contrato vigente', 'contratos vigentes')} y{' '}
        {plural(r.propietariosLeidos, 'propietario', 'propietarios')}. En riesgo desde {r.umbral}/100.
      </p>
    </div>
  )
}

export default function RetencionDashboardPage() {
  const [fresco, setFresco] = useState(false)
  const riesgo = useRiesgoDeVinci(fresco)
  const metricas = useMetricasDeVinci()
  const cola = useDecisionesDeVinci({ reviewableOnly: true, limit: 100 })
  const { isAdmin } = usePermissionsContext()
  const r = riesgo.data
  const m = metricas.data
  const pendientes = cola.data?.decisiones.length ?? 0
  // «Lo más urgente» es lo que dice: los de puntaje más alto primero.
  const urgentes = useMemo(
    () =>
      (r?.casos ?? [])
        .filter((c) => c.enRiesgo)
        .sort((a, b) => b.puntaje - a.puntaje)
        .slice(0, 8),
    [r],
  )
  const sinMetricas = metricas.isLoading || Boolean(metricas.error) || !m
  const lr = m ? retenidos(m) : null
  const conCobranza = typeof r?.enCobranza === 'number'

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <CabeceraDeVinci
        titulo="Retención"
        descripcion="Vinci lee las señales del ERP —mora, PQRS, mantenimientos, fin del contrato, incremento, giros atrasados— y te dice quién se puede ir: el propietario que saca su inmueble o el inquilino que no renueva."
        acciones={
          r ? (
            <Button
              type="button"
              variant="secondary"
              hideArrow
              isLoading={riesgo.isLoading && fresco}
              onClick={() => (fresco ? void riesgo.refetch() : setFresco(true))}
            >
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Medir ahora
            </Button>
          ) : null
        }
      />

      <EstadoDeDatos
        cargando={riesgo.isLoading && !r}
        error={riesgo.error}
        queEs="el riesgo de retención"
        onReintentar={() => riesgo.refetch()}
        principal
      >
        {r && !r.disponible ? (
          <AlertaAccionable
            severidad="warning"
            titulo="Vinci no puede medir todavía."
            data-testid="vinci-no-disponible"
          >
            Faltan datos del ERP ({r.faltan.join(', ')}). No muestra casos inventados.
          </AlertaAccionable>
        ) : null}
        {r?.disponible ? (
          <section aria-label="Resumen de retención" className="overflow-hidden rounded-lg border border-border bg-card">
            <FranjaDeVinci columnas={conCobranza ? 4 : 3} data-testid="vinci-resumen">
              <Stat
                compact
                label="En riesgo"
                value={String(r.enRiesgo.inquilinos + r.enRiesgo.propietarios)}
                delta={`${plural(r.enRiesgo.inquilinos, 'inquilino', 'inquilinos')} · ${plural(r.enRiesgo.propietarios, 'propietario', 'propietarios')}`}
              />
              {conCobranza ? (
                <Stat compact label="En cobranza" value={String(r.enCobranza)} delta="Más de 60 días de mora: no se retienen" />
              ) : null}
              <Stat
                compact
                label="En gestión"
                value={sinMetricas ? '—' : String(m!.enGestion.inquilinos + m!.enGestion.propietarios)}
                delta={metricas.error ? 'No se pudo traer' : 'Planes de retención abiertos'}
              />
              <Stat
                compact
                label="Retenidos"
                value={sinMetricas || !lr ? '—' : lr.valor}
                delta={metricas.error ? 'No se pudo traer' : (lr?.delta ?? undefined)}
              />
            </FranjaDeVinci>
            <PieDelResumen r={r} />
          </section>
        ) : null}
      </EstadoDeDatos>

      {/* Sólo si hay algo: una alerta que dice «nada» no se lee. */}
      {pendientes > 0 ? (
        <AlertaAccionable
          severidad="info"
          titulo={`${plural(pendientes, 'decisión de Vinci espera', 'decisiones de Vinci esperan')} tu clic.`}
          accion={{ label: 'Revisarlas', href: '/panel/inmobiliaria/contratos/aprobar' }}
          data-testid="vinci-por-aprobar-aviso"
        >
          Propuestas, mensajes listos y ofertas que cuestan plata: nada sale sin ti.
        </AlertaAccionable>
      ) : null}

      {r?.disponible ? (
        <TarjetaDeVinci
          id="vinci-urgentes"
          icono={Warning}
          titulo="Lo más urgente"
          descripcion={
            urgentes.length > 0
              ? 'Los de puntaje más alto. Toca uno para ver por qué, qué ofrecerle y el plan.'
              : 'Los que pasan el umbral, del puntaje más alto al más bajo.'
          }
          accion={
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href="/panel/inmobiliaria/contratos/riesgo">Ver todos los casos</Link>
            </Button>
          }
          cuerpo={false}
        >
          <TablaDeCasos
            casos={urgentes}
            vacio={
              <SinDatos
                queSon="casos en riesgo"
                icono={HeartStraight}
                titulo="Nadie pasa el umbral hoy"
                descripcion={
                  r.enCobranza
                    ? `Con las señales del ERP de hoy, ningún propietario ni inquilino llega a ${r.umbral}/100. Los ${plural(r.enCobranza, 'inquilino', 'inquilinos')} con más de 60 días de mora los lleva cobranza.`
                    : `Con las señales del ERP de hoy, ningún propietario ni inquilino llega a ${r.umbral}/100.`
                }
              />
            }
          />
        </TarjetaDeVinci>
      ) : null}

      {isAdmin ? <Umbral /> : null}

    </div>
  )
}
