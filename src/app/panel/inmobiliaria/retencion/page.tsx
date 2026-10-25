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
 *
 * 22-10-2026 · glow up (revisora r24, Retención): el encabezado común con su ayuda; la principal es
 * «Revisar N decisiones» (o «Ver todos los casos»); el umbral en su cajón; la cifra en grande con la
 * barra que la reparte; el pie en una línea; sin «ERP».
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, HeartStraight, SlidersHorizontal } from '@phosphor-icons/react'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
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
import { CabeceraDeVinci, TarjetaDeVinci } from '@/components/retencion/piezas'
import { TablaDeCasos } from '@/components/retencion/TablaDeCasos'
import type { MetricasDeVinci, RiesgoDeVinci } from '@/lib/types/retencion'
import { RETENCION_APROBAR, RETENCION_RIESGO } from '@/lib/nav/rutas-de-retencion'
import { RetencionApagada } from '@/components/inmobiliaria/retencion/RetencionApagada'
import { esRetencionApagada } from '@/lib/api/retencion'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr'

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

/**
 * El umbral, en su cajón (revisora r24, Retención #1): se configura una vez, así que no va abierto en la
 * portada ni su «Guardar» es la acción azul de la pantalla. Lo abre «Umbral de riesgo» del encabezado.
 */
function CajonDelUmbral({ abierto, onOpenChange }: { abierto: boolean; onOpenChange: (v: boolean) => void }) {
  const tr = useTr();
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
      toast.error(tr('El umbral y el tope van de 0 a 100, en números enteros.'))
      return
    }
    if (!Number.isInteger(di) || di < 1 || di > 365 || !Number.isInteger(dp) || dp < 1 || dp > 365) {
      toast.error(tr('Los días entre mensajes van de 1 a 365.'))
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
      toast.success(tr('Guardado: Vinci usa el nuevo umbral desde ya.'))
      setUmbral('')
      setTope('')
      setDiasInq('')
      setDiasProp('')
      await refetch()
      onOpenChange(false)
    } catch (e) {
      toast.error(tr('No se pudo guardar'), { description: mensajeParaLaPersona(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Cajon abierto={abierto} onOpenChange={onOpenChange} tamano="sm">
      <CajonCabecera
        titulo={tr('Umbral de riesgo')}
        descripcion={tr('Desde qué puntaje alguien entra en riesgo, el tope del descuento en la comisión y cada cuánto Vinci le puede volver a escribir a la misma persona. Sólo el administrador lo cambia.')}
      />
      <CajonCuerpo>
        <EstadoDeDatos cargando={isLoading && !data} error={error} queEs={tr('el umbral de Vinci')} onReintentar={() => refetch()}>
          <div className="space-y-5">
            <CampoDelUmbral
              id="vinci-umbral"
              label={tr("Umbral (0–100)")}
              valor={valorUmbral}
              onCambio={setUmbral}
              min={0}
              max={100}
              porDefecto={tr('{n} por defecto', { n: data?.umbralPorDefecto ?? 60 })}
            />
            <CampoDelUmbral
              id="vinci-tope"
              label={tr("Tope del descuento (%)")}
              valor={valorTope}
              onCambio={setTope}
              min={0}
              max={100}
              porDefecto={tr("De la comisión · 20 % por defecto")}
            />
            <CampoDelUmbral
              id="vinci-dias-inquilino"
              label={tr("Días entre mensajes al inquilino")}
              valor={valorDiasInq}
              onCambio={setDiasInq}
              min={1}
              max={365}
              porDefecto={tr('{n} por defecto', { n: 7 })}
            />
            <CampoDelUmbral
              id="vinci-dias-propietario"
              label={tr("Días entre mensajes al propietario")}
              valor={valorDiasProp}
              onCambio={setDiasProp}
              min={1}
              max={365}
              porDefecto={tr('{n} por defecto', { n: 15 })}
            />
          </div>
        </EstadoDeDatos>
      </CajonCuerpo>
      <CajonPie
        ayuda={data && !data.guardable ? tr('Todavía no se puede guardar: falta activarlo de nuestro lado.') : undefined}
      >
        <Button type="button" variant="outline" size="sm" hideArrow onClick={() => onOpenChange(false)}>
          {tr('Cancelar')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void guardar()}
          isLoading={guardando}
          disabled={!data?.guardable}
          hideArrow
        >
          {tr('Guardar el umbral')}
        </Button>
      </CajonPie>
    </Cajon>
  )
}

/** Lo retenido, en una frase del pie: «5 retenidos (80 % de los cerrados · $ 12.400.000 al mes)». */
function retenidos(m: MetricasDeVinci, en = false): string {
  const n = m.contratosRetenidos + m.propietariosQueSeQuedaron
  const perdidos = m.perdidos.inquilinos + m.perdidos.propietarios
  if (n === 0 && perdidos === 0) return en ? 'no cases closed yet' : 'ningún caso cerrado todavía'
  if (en) {
    const partesEn = [
      m.tasaDeRetencion !== null ? `${Math.round(m.tasaDeRetencion * 100)} % of closed cases` : null,
      `${formatCurrency(m.canonConservadoCop)} a month`,
      perdidos > 0 ? `${perdidos === 1 ? '1 left' : `${perdidos} left`}` : null,
    ]
    return `${n} retained (${partesEn.filter(Boolean).join(' · ')})`
  }
  const partes = [
    m.tasaDeRetencion !== null ? `${Math.round(m.tasaDeRetencion * 100)} % de los cerrados` : null,
    `${formatCurrency(m.canonConservadoCop)} al mes`,
    perdidos > 0 ? `${perdidos === 1 ? 'se fue 1' : `se fueron ${perdidos}`}` : null,
  ]
  return `${plural(n, 'retenido', 'retenidos')} (${partes.filter(Boolean).join(' · ')})`
}

/**
 * El pie, en UNA línea (revisora r24, Retención #8): cuándo midió, el modo y si el envío está apagado.
 * De cuántos contratos y propietarios, y qué hace Vinci en cada modo, va en «¿Cómo funciona?».
 */
function PieDelResumen({ r }: { r: RiesgoDeVinci }) {
  const tr = useTr();
  const en = useLocaleDelPanel() === 'en';
  const medido = en
    ? r.deLoGuardado ? `Measured ${fechaYHora(r.leidoEn, 'en')} (the last sweep)` : `Measured now (${fechaYHora(r.leidoEn, 'en')})`
    : r.deLoGuardado ? `Medido ${fechaYHora(r.leidoEn)} (el último barrido)` : `Medido ahora (${fechaYHora(r.leidoEn)})`
  return (
    <p className="flex flex-wrap gap-x-1.5 border-t border-border px-5 py-3 text-caption text-fg-muted">
      <span data-testid="vinci-medido">{medido}</span>
      {r.modo ? <span>· {tr(NOMBRE_DEL_MODO[r.modo])}</span> : null}
      {!r.envioHabilitado ? <span data-testid="vinci-envio-apagado">· {tr('el envío está apagado: los mensajes quedan listos para que los mandes tú')}</span> : null}
    </p>
  )
}

/** Lo que se consulta, en «¿Cómo funciona?»: las señales, el modo y sobre qué midió. */
function ComoFuncionaVinci({ r }: { r: RiesgoDeVinci | undefined }) {
  const tr = useTr();
  const en = useLocaleDelPanel() === 'en';
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fg-muted">
      <p>{tr('Vinci lee las señales de tu cartera —mora, PQRS, mantenimientos, fin del contrato, incremento, giros atrasados— y suma un puntaje por persona: el propietario que puede sacar su inmueble o el inquilino que puede no renovar.')}</p>
      {r ? (
        <p data-testid="vinci-alcance">
          {en
            ? `Measured across ${r.contratosLeidos} ${r.contratosLeidos === 1 ? 'active lease' : 'active leases'} and ${r.propietariosLeidos} ${r.propietariosLeidos === 1 ? 'owner' : 'owners'}. At risk from ${r.umbral}/100.`
            : `Medido entre ${plural(r.contratosLeidos, 'contrato vigente', 'contratos vigentes')} y ${plural(r.propietariosLeidos, 'propietario', 'propietarios')}. En riesgo desde ${r.umbral}/100.`}
        </p>
      ) : null}
      {r?.modo ? (
        <p>
          <span className="text-fg">{tr(NOMBRE_DEL_MODO[r.modo])}:</span> {tr(QUE_HACE_EN_CADA_MODO[r.modo])}
        </p>
      ) : null}
      <p>{tr('Los inquilinos con más de 60 días de mora no se retienen: los lleva cobranza.')}</p>
    </div>
  )
}

export default function RetencionDashboardPage() {
  const tr = useTr();
  const en = useLocaleDelPanel() === 'en';
  const [fresco, setFresco] = useState(false)
  const [umbralAbierto, setUmbralAbierto] = useState(false)
  const riesgo = useRiesgoDeVinci(fresco)
  const metricas = useMetricasDeVinci()
  const cola = useDecisionesDeVinci({ reviewableOnly: true, limit: 100 })
  const { isAdmin } = usePermissionsContext()
  const r = riesgo.data
  const m = metricas.data
  const pendientes = cola.data?.decisiones.length ?? 0
  const enRiesgoTodos = useMemo(() => (r?.casos ?? []).filter((c) => c.enRiesgo), [r])
  // «Lo más urgente» es lo que dice: los de puntaje más alto primero.
  const urgentes = useMemo(() => [...enRiesgoTodos].sort((a, b) => b.puntaje - a.puntaje).slice(0, 8), [enRiesgoTodos])
  const total = r ? r.enRiesgo.inquilinos + r.enRiesgo.propietarios : 0
  // La barra reparte LA cifra (revisora r24 #2): con plan activo · sin atender. Sólo si los casos que
  // trajo el micro son exactamente los que cuenta la cifra; si no, la barra mentiría y no se pinta.
  const conPlan = enRiesgoTodos.filter((c) => c.plan?.estado === 'activo').length
  const sePuedeRepartir = total > 0 && enRiesgoTodos.length === total
  const enCobranza = typeof r?.enCobranza === 'number' ? r.enCobranza : 0

  // 🔴 IA-C-01 (QA 04-10): apagada no hay tablero —antes caía a uno inventado—
  // ni se pinta el texto del micro (nombra su variable): se dice qué haría.
  if (esRetencionApagada(riesgo.error)) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <CabeceraDeVinci titulo={tr("Retención")} />
        <RetencionApagada />
      </div>
    )
  }

  const aparte: string[] = []
  if (enCobranza > 0) {
    aparte.push(en ? `${enCobranza} in collections (more than 60 days late)` : `${enCobranza} en cobranza (más de 60 días de mora)`)
  }
  if (metricas.error) aparte.push(tr('lo retenido no se pudo traer'))
  else if (m) aparte.push(retenidos(m, en))

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <CabeceraDeVinci
        titulo={tr("Retención")}
        descripcion={tr("Quién se puede ir —propietarios e inquilinos— y qué hacer para que se queden.")}
        ayuda={
          <ParaEntenderMas etiqueta={tr('¿Cómo funciona?')} titulo={tr('Retención')}>
            <ComoFuncionaVinci r={r ?? undefined} />
          </ParaEntenderMas>
        }
        acciones={
          r ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                isLoading={riesgo.isLoading && fresco}
                onClick={() => (fresco ? void riesgo.refetch() : setFresco(true))}
              >
                <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
                {tr("Medir ahora")}
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  hideArrow
                  data-testid="vinci-umbral-abrir"
                  onClick={() => setUmbralAbierto(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {tr("Umbral de riesgo")}
                </Button>
              ) : null}
            </>
          ) : null
        }
        accionPrincipal={
          // La principal es el trabajo de hoy (revisora r24 #1 y #3): las decisiones que esperan, con su número.
          pendientes > 0 ? (
            <Button asChild size="sm" hideArrow>
              <Link href={RETENCION_APROBAR} data-testid="vinci-por-aprobar-aviso">
                {en
                  ? `Review ${pendientes} ${pendientes === 1 ? 'decision' : 'decisions'}`
                  : `Revisar ${plural(pendientes, 'decisión', 'decisiones')}`}
              </Link>
            </Button>
          ) : r?.disponible ? (
            <Button asChild size="sm" hideArrow>
              <Link href={RETENCION_RIESGO}>{tr("Ver todos los casos")}</Link>
            </Button>
          ) : null
        }
      />

      <EstadoDeDatos
        cargando={riesgo.isLoading && !r}
        error={riesgo.error}
        queEs={tr("el riesgo de retención")}
        onReintentar={() => riesgo.refetch()}
        principal
        esqueleto={
          <div className="space-y-4 rounded-lg border border-border bg-card px-5 py-5" aria-hidden="true">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-10 w-40 animate-pulse rounded bg-surface-muted" />
            <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
          </div>
        }
      >
        {r && !r.disponible ? (
          <AlertaAccionable
            severidad="warning"
            titulo={tr("Vinci no puede medir todavía.")}
            data-testid="vinci-no-disponible"
          >
            {tr("Faltan datos (")}{r.faltan.join(', ')}{tr("). No muestra casos inventados.")}
          </AlertaAccionable>
        ) : null}
        {r?.disponible ? (
          <section aria-label={tr("Resumen de retención")} className="overflow-hidden rounded-lg border border-border bg-card">
            {/* GLOW UP 22-10 (revisora r24 #2): LA RESPUESTA —cuántos se pueden ir— en grande; la barra
                reparte ESOS (con plan activo · sin atender); lo que no es parte de la cifra va aparte, en
                una línea sin puntos de color. */}
            <div className="px-5 py-5" data-testid="vinci-resumen">
              <CifraHeroe
                rotulo={tr("En riesgo")}
                cifra={String(total)}
                contexto={
                  en
                    ? `${r.enRiesgo.inquilinos} ${r.enRiesgo.inquilinos === 1 ? 'tenant' : 'tenants'} · ${r.enRiesgo.propietarios} ${r.enRiesgo.propietarios === 1 ? 'owner' : 'owners'}`
                    : `${plural(r.enRiesgo.inquilinos, 'inquilino', 'inquilinos')} · ${plural(r.enRiesgo.propietarios, 'propietario', 'propietarios')}`
                }
                tramos={
                  sePuedeRepartir
                    ? [
                        { clave: 'con-plan', etiqueta: tr('Con plan activo'), monto: conPlan, tono: 'exito' as const, siempre: true, cifra: String(conPlan) },
                        { clave: 'sin-atender', etiqueta: tr('Sin atender'), monto: total - conPlan, tono: 'aviso' as const, siempre: true, cifra: String(total - conPlan) },
                      ]
                    : []
                }
                pie={aparte.length > 0 ? <span data-testid="vinci-aparte">{tr('Aparte:')} {aparte.join(' · ')}</span> : undefined}
              />
            </div>
            <PieDelResumen r={r} />
          </section>
        ) : null}
      </EstadoDeDatos>

      {r?.disponible ? (
        <TarjetaDeVinci
          id="vinci-urgentes"
          titulo={tr("Lo más urgente")}
          descripcion={tr(
            urgentes.length > 0
              ? 'Los de puntaje más alto. Toca uno para ver por qué, qué ofrecerle y el plan.'
              : 'Los que pasan el umbral, del puntaje más alto al más bajo.',
          )}
          accion={
            // Sin decisiones, «Ver todos los casos» ya es la principal del encabezado: no se dice dos veces.
            pendientes > 0 ? (
              <Button asChild variant="outline" size="sm" hideArrow>
                <Link href={RETENCION_RIESGO}>{tr("Ver todos los casos")}</Link>
              </Button>
            ) : undefined
          }
          cuerpo={false}
        >
          <TablaDeCasos
            casos={urgentes}
            vacio={
              <SinDatos
                queSon={tr("casos en riesgo")}
                icono={HeartStraight}
                titulo={tr("Nadie pasa el umbral hoy")}
                descripcion={
                  en
                    ? `With today's signals, no owner or tenant reaches ${r.umbral}/100.${r.enCobranza ? ` The ${r.enCobranza} ${r.enCobranza === 1 ? 'tenant' : 'tenants'} more than 60 days late are handled by collections.` : ''}`
                    : r.enCobranza
                    ? `Con las señales de hoy, ningún propietario ni inquilino llega a ${r.umbral}/100. Los ${plural(r.enCobranza, 'inquilino', 'inquilinos')} con más de 60 días de mora los lleva cobranza.`
                    : `Con las señales de hoy, ningún propietario ni inquilino llega a ${r.umbral}/100.`
                }
              />
            }
          />
        </TarjetaDeVinci>
      ) : null}

      {isAdmin && r ? <CajonDelUmbral abierto={umbralAbierto} onOpenChange={setUmbralAbierto} /> : null}
    </div>
  )
}
