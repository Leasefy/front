'use client'

/**
 * Recordatorios — la cobranza con reglaje.
 *
 * ── Qué era esta pantalla y qué es ahora ────────────────────────────────────
 * Hasta hoy era una maqueta honesta: la secuencia era una constante, los
 * controles vivían en estado local y «Guardar» decía «Próximamente» porque no
 * había back. Ya lo hay (`/inmobiliaria/cobranza/secuencia`), así que la
 * pantalla dejó de describir una intención y pasó a operar.
 *
 * ── Lo que pidió el CEO (2026-09-15) ────────────────────────────────────────
 * «El cobro no debería generarse de forma automática: que la persona de
 * finanzas decida cuándo cobrar, basada en la cartera.»
 * «Al inicio del mes, que se envíe el recordatorio. Le ponemos un reglaje:
 * después del recordatorio le damos 3 días; si al tercer día no paga, otro
 * cobro ya con el interés generado; y así.»
 *
 * Por eso la pantalla tiene tres bloques y ese orden:
 *   1. Las CONDICIONES de cobro (las pone la inmobiliaria).
 *   2. El CALENDARIO que sale de esas condiciones: qué va a pasar y cuándo.
 *   3. El DISPARO desde la cartera, con la vista previa antes de mandar.
 *
 * 🔴 No hay ningún interruptor de «automático»: nada se envía sin que alguien
 * lo dispare acá. `activa` significa «ya definí mis condiciones», no «mandá
 * solo». Un envío automático de cobros es lo que produjo los ~680 correos
 * reales del 14-09.
 *
 * 🔴 El botón de enviar NUNCA está habilitado sin vista previa: la persona
 * tiene que haber visto a cuántos le va a llegar.
 *
 * ── Deuda ≠ cartera (2026-09-15) ────────────────────────────────────────────
 * «Otra cosa es que se tarde en pagar sobre los días máximos de mora, y ahí ya
 * es CARTERA como tal, y entra el agente de cobranza.» Por eso del paso 1 en
 * adelante —los avisos CON INTERÉS— la lista se encoge: sólo entra quien ya
 * pasó el plazo de su contrato. Los dos motivos nuevos (`AUN_NO_VENCE` y
 * `DENTRO_DEL_PLAZO`) tienen que RENDERIZARSE: sin ellos en el catálogo del
 * front, esa gente desaparecía del conteo y nadie sabía por qué la lista se
 * había encogido.
 *
 * 🔴 La selección viaja como `soloEstasCuotas`, con los `cuotaId` de la vista
 * previa. El filtro viejo (`soloEstosCobros`) sigue aceptándose pero sus
 * valores se leen como `cuotaId`: mandar ids de cobro deja la selección vacía
 * y no sale nada, en silencio.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellRinging,
  CalendarCheck,
  ChatCircleDots,
  EnvelopeSimple,
  Info,
  PaperPlaneTilt,
  Warning,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Switch,
  Textarea,
  toast,
} from '@/components/ui'
import { Eyebrow, SegmentedControl } from '@leasefy/cadence'

import {
  cobranzaSecuenciaApi,
  mesDeHoy,
} from '@/lib/api/cobranza-secuencia.service'
import {
  ETIQUETA_DEL_MOTIVO,
  MOTIVOS_DE_EXCLUSION,
  type CalendarioDeLaSecuencia,
  type CanalDeCobranza,
  type SecuenciaDeCobranza,
  type VistaPreviaDeCobranza,
} from '@/lib/api/cobranza-secuencia.types'

const CANALES: { value: CanalDeCobranza; label: string }[] = [
  { value: 'CORREO', label: 'Correo' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

function pesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

/** `2026-10-04` → `sábado, 4 de octubre`. Sin husos: es un día del calendario. */
function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function mensajeDeError(err: unknown): string {
  const posible = err as { message?: string; response?: { data?: { message?: string } } }
  return posible?.response?.data?.message ?? posible?.message ?? 'No se pudo completar la acción.'
}

function Aviso({ tono, children }: { tono: 'info' | 'warning'; children: React.ReactNode }) {
  const Icono = tono === 'warning' ? Warning : Info
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        tono === 'warning'
          ? 'border-warning/30 bg-warning/5'
          : 'border-border bg-surface-muted'
      }`}
    >
      <Icono
        className={`mt-0.5 h-5 w-5 shrink-0 ${tono === 'warning' ? 'text-warning' : 'text-fg-muted'}`}
        weight="duotone"
        aria-hidden="true"
      />
      <div className="text-sm text-fg-muted">{children}</div>
    </div>
  )
}

function PagosRecordatorios() {
  const [secuencia, setSecuencia] = useState<SecuenciaDeCobranza | null>(null)
  const [calendario, setCalendario] = useState<CalendarioDeLaSecuencia | null>(null)
  const [previa, setPrevia] = useState<VistaPreviaDeCobranza | null>(null)

  const [mes, setMes] = useState(() => mesDeHoy())
  const [paso, setPaso] = useState<number | null>(null)
  const [canal, setCanal] = useState<CanalDeCobranza | null>(null)
  /**
   * A quién se le manda de la lista, por `cuotaId`. `null` = «todos los que la
   * vista previa marcó», que es el default; en cuanto alguien destilda a uno
   * pasa a ser un conjunto concreto. Lo que viaja SIEMPRE es la lista
   * explícita: nadie puede quedar contactado sin haber estado en la lista que
   * la persona aprobó.
   */
  const [seleccion, setSeleccion] = useState<ReadonlySet<string> | null>(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [consultando, setConsultando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El borrador de la configuración: se edita en local y sólo viaja al guardar.
  const [borrador, setBorrador] = useState<Partial<SecuenciaDeCobranza>>({})
  const valor = <K extends keyof SecuenciaDeCobranza>(clave: K): SecuenciaDeCobranza[K] | undefined =>
    (borrador[clave] ?? secuencia?.[clave]) as SecuenciaDeCobranza[K] | undefined

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const config = await cobranzaSecuenciaApi.obtener()
      setSecuencia(config)
      setBorrador({})
      setCanal((actual) => actual ?? config.canalPreferido)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // El calendario se vuelve a pedir cada vez que cambia el mes o se guarda el
  // reglaje: es la promesa que la pantalla le hace a la persona.
  useEffect(() => {
    if (!secuencia?.disponible) return
    let vigente = true
    void cobranzaSecuenciaApi
      .calendario(mes)
      .then((c) => {
        if (vigente) setCalendario(c)
      })
      .catch(() => {
        if (vigente) setCalendario(null)
      })
    return () => {
      vigente = false
    }
  }, [mes, secuencia])

  const guardar = async () => {
    if (Object.keys(borrador).length === 0) return
    setGuardando(true)
    try {
      const config = await cobranzaSecuenciaApi.guardar({
        ...(borrador.activa !== undefined && { activa: borrador.activa }),
        ...(borrador.diaDelRecordatorio !== undefined && {
          diaDelRecordatorio: borrador.diaDelRecordatorio,
        }),
        ...(borrador.diasEntreAvisos !== undefined && {
          diasEntreAvisos: borrador.diasEntreAvisos,
        }),
        ...(borrador.maxAvisosConInteres !== undefined && {
          maxAvisosConInteres: borrador.maxAvisosConInteres,
        }),
        ...(borrador.canalPreferido !== undefined && { canalPreferido: borrador.canalPreferido }),
        ...(borrador.mensajeDelRecordatorio !== undefined && {
          mensajeDelRecordatorio: borrador.mensajeDelRecordatorio ?? '',
        }),
        ...(borrador.mensajeDelAviso !== undefined && {
          mensajeDelAviso: borrador.mensajeDelAviso ?? '',
        }),
      })
      setSecuencia(config)
      setBorrador({})
      // El reglaje cambió: lo que la vista previa decía ya no vale.
      setPrevia(null)
      setSeleccion(null)
      toast.success('Se guardaron las condiciones de cobro.')
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  const consultar = async () => {
    setConsultando(true)
    setPrevia(null)
    setSeleccion(null)
    try {
      const vista = await cobranzaSecuenciaApi.destinatarios({
        mes,
        ...(paso !== null && { paso }),
        ...(canal !== null && { canal }),
      })
      setPrevia(vista)
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setConsultando(false)
    }
  }

  const enviar = async () => {
    if (!previa || elegidas.size === 0) return
    setEnviando(true)
    try {
      const resultado = await cobranzaSecuenciaApi.enviar({
        mes,
        paso: previa.paso,
        canal: previa.canal,
        /*
         * 🔴 Siempre explícito, aunque no se haya destildado a nadie: así lo
         * que sale es exactamente la lista que la persona vio y aprobó, y no
         * lo que el back vuelva a calcular en el segundo que pasó. Son
         * `cuotaId` — con ids de cobro la selección queda vacía y no sale nada.
         */
        soloEstasCuotas: [...elegidas],
      })
      toast.success(
        `Salieron ${resultado.enviados} avisos. ` +
          `${resultado.omitidos} omitidos y ${resultado.fallidos} fallidos.`,
      )
      // Después de enviar, la vista previa vieja miente: se vuelve a pedir.
      await consultar()
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const hayCambios = Object.keys(borrador).length > 0
  const whatsappApagado =
    secuencia?.canalDeWhatsapp && !secuencia.canalDeWhatsapp.disponible
      ? secuencia.canalDeWhatsapp.motivo
      : null

  const excluidos = useMemo(
    () =>
      previa
        ? MOTIVOS_DE_EXCLUSION.filter((m) => (previa.excluidos[m] ?? 0) > 0).map((m) => ({
            motivo: m,
            etiqueta: ETIQUETA_DEL_MOTIVO[m],
            cuantos: previa.excluidos[m] ?? 0,
          }))
        : [],
    [previa],
  )

  /** Las cuotas a las que el back dice que SÍ les llega. */
  const elegibles = useMemo(
    () => (previa?.destinatarios ?? []).filter((d) => d.leLlega).map((d) => d.cuotaId),
    [previa],
  )
  /** Y a cuáles de ésas se les va a mandar de verdad. */
  const elegidas = useMemo(
    () => seleccion ?? new Set(elegibles),
    [seleccion, elegibles],
  )

  const alternarDestinatario = (cuotaId: string) =>
    setSeleccion((previos) => {
      const siguiente = new Set(previos ?? elegibles)
      if (siguiente.has(cuotaId)) siguiente.delete(cuotaId)
      else siguiente.add(cuotaId)
      return siguiente
    })

  if (cargando) {
    return <div className="p-6 text-sm text-fg-muted lg:p-8">Cargando las condiciones de cobro…</div>
  }

  if (error) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Aviso tono="warning">{error}</Aviso>
        <Button hideArrow onClick={() => void cargar()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <Eyebrow>Cobranza</Eyebrow>
        <h1 className="text-h2 text-fg">Recordatorios</h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Las condiciones con las que esta inmobiliaria cobra, y el disparo desde la cartera. Nada
          sale solo: el recordatorio y los avisos los manda una persona, después de ver a cuántos le
          va a llegar.
        </p>
      </header>

      {secuencia && !secuencia.disponible && (
        <Aviso tono="warning">{secuencia.motivo}</Aviso>
      )}

      {/* ── 1. Las condiciones de cobro ─────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-6 p-5 lg:p-6">
          <div className="space-y-1">
            <Eyebrow>Condiciones de cobro</Eyebrow>
            <h2 className="text-base font-semibold text-fg">El reglaje</h2>
            <p className="max-w-2xl text-sm text-fg-muted">
              Un recordatorio al inicio del mes y, si no pagan, avisos con el interés ya generado,
              separados por los días que definas.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-fg">Secuencia activa</p>
              <p className="text-xs text-fg-muted">
                Significa que las condiciones ya están definidas y finanzas puede disparar la
                secuencia. <span className="font-medium text-fg">No envía nada por su cuenta.</span>
              </p>
            </div>
            <Switch
              checked={valor('activa') ?? false}
              onCheckedChange={(v) => setBorrador((b) => ({ ...b, activa: v }))}
              aria-label="Secuencia activa"
              disabled={!secuencia?.disponible}
              className="mt-0.5 shrink-0"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dia-recordatorio">Día del recordatorio</Label>
              <Input
                id="dia-recordatorio"
                type="number"
                min={1}
                max={28}
                value={valor('diaDelRecordatorio') ?? 1}
                disabled={!secuencia?.disponible}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, diaDelRecordatorio: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-fg-muted">
                Hasta 28: el 30 no existe en febrero y ese mes no saldría.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dias-entre">Días entre avisos</Label>
              <Input
                id="dias-entre"
                type="number"
                min={1}
                max={30}
                value={valor('diasEntreAvisos') ?? 3}
                disabled={!secuencia?.disponible}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, diasEntreAvisos: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-fg-muted">Lo que se le da al inquilino para pagar.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-avisos">Avisos con interés</Label>
              <Input
                id="max-avisos"
                type="number"
                min={0}
                max={10}
                value={valor('maxAvisosConInteres') ?? 3}
                disabled={!secuencia?.disponible}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, maxAvisosConInteres: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-fg-muted">El tope. Sin él, «y así» sería para siempre.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <SegmentedControl
              options={CANALES.map((c) => ({ value: c.value, label: c.label }))}
              value={valor('canalPreferido') ?? 'CORREO'}
              onChange={(v) =>
                setBorrador((b) => ({ ...b, canalPreferido: v as CanalDeCobranza }))
              }
              aria-label="Canal de cobranza"
            />
            {whatsappApagado && <Aviso tono="info">{whatsappApagado}</Aviso>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="msg-recordatorio">Tu texto en el recordatorio</Label>
              <Textarea
                id="msg-recordatorio"
                rows={3}
                maxLength={1000}
                placeholder="Opcional. Se agrega al correo de la plantilla."
                value={valor('mensajeDelRecordatorio') ?? ''}
                disabled={!secuencia?.disponible}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, mensajeDelRecordatorio: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-aviso">Tu texto en el aviso con interés</Label>
              <Textarea
                id="msg-aviso"
                rows={3}
                maxLength={1000}
                placeholder="Opcional. Se agrega al correo de la plantilla."
                value={valor('mensajeDelAviso') ?? ''}
                disabled={!secuencia?.disponible}
                onChange={(e) => setBorrador((b) => ({ ...b, mensajeDelAviso: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-fg-muted">
              El interés lo calcula el motor de mora con tus{' '}
              <Link
                href="/panel/inmobiliaria/pagos/cartera/reglas-de-mora"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                reglas de mora
              </Link>
              . Acá se define cuándo se avisa, no cuánto se cobra.
            </p>
            <Button
              hideArrow
              onClick={() => void guardar()}
              disabled={!hayCambios || guardando || !secuencia?.disponible}
              className="shrink-0"
            >
              {guardando ? 'Guardando…' : 'Guardar condiciones'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. El calendario que sale del reglaje ───────────────────────── */}
      <Card>
        <CardContent className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <Eyebrow>Así queda tu secuencia</Eyebrow>
              <h2 className="text-base font-semibold text-fg">Qué va a pasar y cuándo</h2>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mes">Mes que se cobra</Label>
              <Input
                id="mes"
                type="month"
                value={mes}
                onChange={(e) => {
                  setMes(e.target.value)
                  setPrevia(null)
                  setSeleccion(null)
                  setPaso(null)
                }}
                className="w-44"
              />
            </div>
          </div>

          {hayCambios && (
            <Aviso tono="info">
              Estás viendo el calendario de las condiciones <strong>guardadas</strong>. Guarda los
              cambios para verlos reflejados acá.
            </Aviso>
          )}

          {calendario && calendario.pasos.length > 0 ? (
            <ol className="space-y-2">
              {calendario.pasos.map((p) => (
                <li
                  key={p.paso}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
                >
                  {p.conInteres ? (
                    <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="duotone" aria-hidden="true" />
                  ) : (
                    <BellRinging className="mt-0.5 h-5 w-5 shrink-0 text-primary" weight="duotone" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{p.titulo}</p>
                    <p className="text-xs text-fg-muted">
                      {fechaLegible(p.fecha)}
                      {p.conInteres
                        ? ' · con el interés ya generado'
                        : ' · todavía sin mora que cobrar'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-fg-muted">
              El calendario aparece cuando las condiciones están guardadas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 3. El disparo desde la cartera ──────────────────────────────── */}
      <Card>
        <CardContent className="space-y-5 p-5 lg:p-6">
          <div className="space-y-1">
            <Eyebrow>Disparo desde la cartera</Eyebrow>
            <h2 className="text-base font-semibold text-fg">
              A quién le va a llegar el aviso de {mes}
            </h2>
            <p className="max-w-2xl text-sm text-fg-muted">
              Sólo a quienes deban ese mes. Quien ya pagó —o adelantó la cuota— no recibe nada, y en
              los avisos con interés tampoco entra quien todavía está dentro de su plazo.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="paso">Paso</Label>
              <select
                id="paso"
                value={paso === null ? '' : String(paso)}
                onChange={(e) => {
                  setPaso(e.target.value === '' ? null : Number(e.target.value))
                  setPrevia(null)
                  setSeleccion(null)
                }}
                className="h-10 rounded-md border border-border bg-card px-3 text-sm text-fg"
              >
                <option value="">El que toque hoy</option>
                {(calendario?.pasos ?? []).map((p) => (
                  <option key={p.paso} value={p.paso}>
                    {p.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <SegmentedControl
                options={CANALES.map((c) => ({ value: c.value, label: c.label }))}
                value={canal ?? secuencia?.canalPreferido ?? 'CORREO'}
                onChange={(v) => {
                  setCanal(v as CanalDeCobranza)
                  setPrevia(null)
                  setSeleccion(null)
                }}
                aria-label="Canal del disparo"
              />
            </div>
            <Button
              hideArrow
              variant="secondary"
              onClick={() => void consultar()}
              disabled={consultando || !secuencia?.disponible}
            >
              {consultando ? 'Consultando…' : 'Ver a quién le llega'}
            </Button>
          </div>

          {previa && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <p className="text-sm text-fg">
                  De <strong>{previa.revisados}</strong> cuotas de {previa.mes}, le va a llegar a{' '}
                  <strong className="text-primary">{previa.lesLlega}</strong> por{' '}
                  {previa.canal === 'CORREO' ? 'correo' : 'WhatsApp'}.
                </p>
                {/*
                  🔴 Por qué la lista se encoge al cambiar de paso. El paso 0 es
                  el recordatorio y basta con deber; de 1 en adelante el aviso
                  lleva el interés generado, y eso sólo se le manda a quien ya
                  es CARTERA. Sin esta línea, quien ve pasar la lista de 40 a 6
                  concluye que el sistema está roto.
                */}
                <p className="mt-1 text-xs text-fg-muted" data-testid="exige-cartera">
                  {previa.exigeCartera
                    ? 'Este paso lleva el interés generado: sólo entra quien ya pasó los días de plazo de su contrato. Deber y estar en cartera no son lo mismo.'
                    : 'Este paso es el recordatorio: entra quien deba el mes, aunque todavía esté dentro de su plazo. Todavía no hay interés que cobrar.'}
                </p>
                {excluidos.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                    {excluidos.map((e) => (
                      <li key={e.motivo} data-testid={`excluidos-${e.motivo}`}>
                        {e.etiqueta}: <strong className="text-fg">{e.cuantos}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Toda fila que NO recibe sale igual, con su motivo: una lista sin
                  eso es una lista en la que nadie confía. */}
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase tracking-wide text-fg-muted">
                    <tr>
                      <th className="w-10 px-3 py-2 font-medium">
                        <span className="sr-only">Enviar</span>
                      </th>
                      <th className="px-3 py-2 font-medium">Inquilino</th>
                      <th className="px-3 py-2 font-medium">Inmueble</th>
                      <th className="px-3 py-2 text-right font-medium">Debe</th>
                      <th className="px-3 py-2 font-medium">¿Le llega?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/*
                      🔴 `key={d.cuotaId}`: `cobroId` ahora puede ser `null` y
                      lo es en toda cuota que finanzas no reclamó. Como llave de
                      React eso son claves duplicadas.
                    */}
                    {previa.destinatarios.map((d) => (
                      <tr key={d.cuotaId} className="border-t border-border" data-testid="fila-destinatario">
                        <td className="px-3 py-2">
                          {/* Sólo se puede destildar a quien de verdad recibiría:
                              tildar a un excluido no lo desbloquea, y ofrecerlo
                              sería prometer un envío que el back va a omitir. */}
                          {d.leLlega && (
                            <Checkbox
                              checked={elegidas.has(d.cuotaId)}
                              onCheckedChange={() => alternarDestinatario(d.cuotaId)}
                              aria-label={`Enviarle a ${d.nombre}`}
                              data-testid={`elegir-${d.cuotaId}`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-fg">
                          {d.nombre}
                          {/* Deuda y cartera se distinguen en la fila, no sólo
                              en el conteo de arriba. */}
                          <span className="ml-2 text-xs text-fg-muted">
                            {d.esCartera
                              ? `cartera · ${d.diasDeMora} ${d.diasDeMora === 1 ? 'día' : 'días'} de mora`
                              : 'deuda · dentro del plazo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-fg-muted">{d.inmueble}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg">
                          {pesos(d.pendienteCop)}
                        </td>
                        <td className="px-3 py-2">
                          {d.leLlega ? (
                            <span className="inline-flex items-center gap-1.5 text-primary">
                              {previa.canal === 'CORREO' ? (
                                <EnvelopeSimple className="h-4 w-4" weight="duotone" aria-hidden="true" />
                              ) : (
                                <ChatCircleDots className="h-4 w-4" weight="duotone" aria-hidden="true" />
                              )}
                              {d.destino ?? 'Sí'}
                            </span>
                          ) : (
                            <span className="text-fg-muted">{d.explicacion}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-fg-muted">
                  Se manda una sola vez por paso y canal. La Ley 2300 permite un contacto al día por
                  persona: quien tenga varios inmuebles recibe un aviso, no uno por contrato.
                </p>
                <Button
                  hideArrow
                  onClick={() => void enviar()}
                  disabled={enviando || elegidas.size === 0 || !previa.disponible}
                  className="shrink-0"
                  data-testid="enviar-cobranza"
                >
                  <PaperPlaneTilt className="mr-2 h-4 w-4" weight="duotone" aria-hidden="true" />
                  {enviando ? 'Enviando…' : `Enviar a ${elegidas.size}`}
                </Button>
              </div>
            </div>
          )}

          {!previa && (
            <Aviso tono="info">
              El botón de enviar aparece <strong>después</strong> de ver la lista: nadie manda un
              cobro sin saber a cuántos le llega.
            </Aviso>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagosRecordatoriosPage() {
  return (
    /* Mudada a Cobranza el 2026-09-16: el gate es el del módulo que la
       contiene y el que la ofrece como pestaña, no el de la cartera. */
    <PageGuard module="cobranza" action="view">
      <PagosRecordatorios />
    </PageGuard>
  )
}
