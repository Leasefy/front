'use client'

import { useState, type ReactNode } from 'react'
import { Presence, RadioCard, RadioCardGroup } from '@leasefy/cadence'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { Pill } from '@/components/admin/Pill'
import { ErrorBlock } from '@/components/admin/screen/states'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import {
  adoptarLaGanadora,
  empezarElExperimento,
  estadoParaMostrar,
  FORMA_COMO_HOY,
  FORMA_MENOS_CUOTAS,
  fraseDeLaRecomendacion,
  MAX_CUOTAS_MAXIMO,
  MAX_CUOTAS_MINIMO,
  MAX_CUOTAS_POR_DEFECTO,
  maxCuotasValido,
  nombreDeLaForma,
  pausarElExperimento,
  queHaceLaForma,
  verElExperimento,
  type EstadoDelExperimento,
  type Forma,
} from '@/lib/admin/experimento-de-laura'
import { Card } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Accion = null | 'empezar' | 'pausar' | 'adoptar'

/** Un dato de la forma: a 390 con su rótulo encima; a 768+ la columna ya lo dice. */
function Dato({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div role="cell" className="min-w-0 md:text-right">
      <div className="text-caption text-fg-muted md:hidden">{rotulo}</div>
      <div className="font-mono text-body-sm tabular-nums text-fg">{children}</div>
    </div>
  )
}

/**
 * El experimento de cómo Laura ofrece el acuerdo (07-10-2026, Nico).
 *
 * Laura prueba dos formas, mitad y mitad al azar por deudor, por voz y por
 * WhatsApp, en todas las inmobiliarias que no lo apagaron: A como hoy, B con
 * menos cuotas (sólo recorta lo que autoriza cada una). Gana la que recupera
 * más plata en 30 días, contada con los recibos del back. Aquí Leasefy lo
 * empieza, lo pausa y aprueba la ganadora, que desde ahí vale para todas.
 * Nada cambia en Laura sin esta aprobación.
 */
export function ExperimentoDeLaura() {
  const consulta = useApiQuery((signal) => verElExperimento(signal), [])
  const [ultimo, setUltimo] = useState<EstadoDelExperimento | null>(null)
  const e = ultimo ?? consulta.data

  const [accion, setAccion] = useState<Accion>(null)
  const [cuotas, setCuotas] = useState(String(MAX_CUOTAS_POR_DEFECTO))
  const [ganadora, setGanadora] = useState<Forma>(FORMA_COMO_HOY)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  if (consulta.isLoading && !e) {
    return (
      <Card className="p-5" aria-busy="true">
        <h2 className="text-body font-medium text-fg">Mori · cómo ofrece el acuerdo</h2>
        <p className="text-body-sm text-fg-muted mt-2">Cargando el experimento…</p>
      </Card>
    )
  }
  if (consulta.error && !e) {
    // Ronda 26 (revisora r25): el MISMO cartel de fallo que la tabla de abajo (antes un rojo suelto con
    // «Reintentar» y la tabla con «Intentar de nuevo»).
    return (
      <ErrorBlock
        titulo="No pudimos cargar el experimento de Mori"
        error={consulta.error}
        onReintentar={consulta.refetch}
        // Ronda 30: sin mb-6 (la página ya separa con space-y-6; eran 48 px)
      />
    )
  }
  if (!e) return null

  const estado = estadoParaMostrar(e)
  const cuotasLeidas = maxCuotasValido(cuotas)
  const recomendada = e.recomendacion.tipo === 'gana' ? (e.recomendacion.variantKey as Forma) : FORMA_COMO_HOY

  function abrir(a: Accion) {
    setFallo(null)
    if (a === 'adoptar') setGanadora(recomendada)
    setAccion(a)
  }

  async function hacer(fn: () => Promise<EstadoDelExperimento>, que: string) {
    setGuardando(true)
    setFallo(null)
    try {
      setUltimo(await fn())
      setAccion(null)
    } catch (err) {
      setFallo(mensajeDelAdmin(err, { accion: que }))
    } finally {
      setGuardando(false)
    }
  }

  const sePuedeCambiar = e.disponible && e.estado !== 'completed'

  return (
    <Card className="p-5 space-y-4" aria-labelledby="experimento-laura-titulo" data-testid="experimento-de-laura">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Ronda 28 (revisora r27): un título de verdad (antes un rótulo en mono minúscula) y una sola
              línea de para qué sirve; el cómo, plegado. El agente se llama Mori en la plataforma. */}
          <h2 id="experimento-laura-titulo" className="text-body font-medium text-fg">
            Mori · cómo ofrece el acuerdo
          </h2>
          <p className="mt-1 max-w-3xl text-caption text-fg-muted">
            Gana la forma que recupera más plata en {e.diasDeLaMedicion} días. Corre en todas las inmobiliarias
            {e.inmobiliariasQueLoApagaron > 0
              ? ` menos ${e.inmobiliariasQueLoApagaron === 1 ? 'una que lo apagó' : `${e.inmobiliariasQueLoApagaron} que lo apagaron`}`
              : ''}
            .
          </p>
        </div>
        <Pill tone={estado.tono}>{estado.texto}</Pill>
      </div>

      <MasDetalles etiqueta="¿Cómo funciona?" etiquetaAbierto="Ocultar cómo funciona">
        <p className="max-w-3xl text-caption text-fg-muted">
          A la mitad de los deudores Mori les ofrece el acuerdo como hoy y a la otra mitad con menos cuotas, al azar,
          por voz y WhatsApp (el mismo deudor oye lo mismo en los dos). La plata se cuenta con los pagos que
          llegaron. Nada cambia en Mori para todas sin tu aprobación.
        </p>
      </MasDetalles>

      {!e.disponible && (
        <p className="text-body-sm text-warning" data-testid="experimento-sin-migracion">
          Todavía no se puede empezar: falta una actualización de la base del asistente de cobranza.
          Sin ella no habría con qué medir la plata.
        </p>
      )}

      {e.startedAt && (
        <p className="text-caption text-fg-muted">
          {/* Sin punto final: la hora ya termina en «a. m.» / «p. m.». */}
          Empezó el {fmtDateTime(e.startedAt)}
          {e.endedAt ? ` · terminó el ${fmtDateTime(e.endedAt)}` : ''}
        </p>
      )}

      {e.estado === 'sin_empezar' ? (
        // Ronda 28 (revisora r27): sin empezar no hay nada medido; antes una tabla de ceros
        // («0 · 0 · $ 0 · — · —»). Las dos formas, una por renglón.
        <ul className="divide-y divide-border-faint rounded-lg border border-border" data-testid="formas-del-experimento">
          {e.formas.map((f) => (
            <li key={f.variantKey} className="px-4 py-3" data-testid={`forma-${f.variantKey}`}>
              <div className="text-body-sm text-fg">{nombreDeLaForma(f.variantKey, e.maxCuotas)}</div>
              <div className="text-caption text-fg-muted">{queHaceLaForma(f.variantKey, e.maxCuotas)}</div>
            </li>
          ))}
        </ul>
      ) : (
        // Ronda 28 (revisora r27): a 390 cada forma es una tarjeta (antes la tabla encogida que se corría
        // a los lados); a 768+ las columnas de siempre.
        <div data-testid="formas-del-experimento" role="table" aria-label="Cómo va cada forma">
          <div
            role="row"
            className="hidden gap-3 border-b border-border px-1 pb-2 text-caption text-fg-muted md:grid md:grid-cols-[minmax(0,2.4fr)_repeat(5,minmax(0,1fr))]"
          >
            <span role="columnheader">Forma</span>
            <span role="columnheader" className="text-right">Asignados</span>
            <span role="columnheader" className="text-right">Medidos</span>
            <span role="columnheader" className="text-right">Plata en {e.diasDeLaMedicion} días</span>
            <span role="columnheader" className="text-right">Por deudor</span>
            <span role="columnheader" className="text-right">Pagaron algo</span>
          </div>
          {e.formas.map((f) => (
            <div
              key={f.variantKey}
              role="row"
              data-testid={`forma-${f.variantKey}`}
              className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-border-faint px-1 py-3 last:border-b-0 md:grid-cols-[minmax(0,2.4fr)_repeat(5,minmax(0,1fr))] md:items-start"
            >
              <div role="cell" className="col-span-2 md:col-span-1">
                <div className="text-body-sm text-fg">{nombreDeLaForma(f.variantKey, e.maxCuotas)}</div>
                <div className="text-caption text-fg-muted">{queHaceLaForma(f.variantKey, e.maxCuotas)}</div>
              </div>
              <Dato rotulo="Asignados">{f.asignados.toLocaleString('es-CO')}</Dato>
              <Dato rotulo="Medidos">
                {f.medidos.toLocaleString('es-CO')}
                {(f.enCurso > 0 || f.sinDatos > 0) && (
                  <div className="font-sans text-caption text-fg-subtle">
                    {f.enCurso > 0 ? `${f.enCurso} en curso` : ''}
                    {f.enCurso > 0 && f.sinDatos > 0 ? ' · ' : ''}
                    {f.sinDatos > 0 ? `${f.sinDatos} sin contrato` : ''}
                  </div>
                )}
              </Dato>
              <Dato rotulo={`Plata en ${e.diasDeLaMedicion} días`}>{fmtCOP(f.plataTotal)}</Dato>
              <Dato rotulo="Por deudor">{f.medidos > 0 ? fmtCOP(f.plataPorDeudor) : '—'}</Dato>
              <Dato rotulo="Pagaron algo">
                {f.medidos > 0 ? `${Math.round((f.conAlgunPago / f.medidos) * 100)} %` : '—'}
              </Dato>
            </div>
          ))}
        </div>
      )}

      {e.adoptada ? (
        <p role="status" className="text-body-sm text-success" data-testid="experimento-adoptada">
          Ganó {nombreDeLaForma(e.adoptada.variantKey, e.maxCuotas)}: la aprobó {e.adoptada.adoptadaPor} el{' '}
          {fmtDateTime(e.adoptada.adoptadaAt)}.{' '}
          {e.adoptada.variantKey === FORMA_COMO_HOY
            ? 'Mori sigue ofreciendo el acuerdo como siempre.'
            : 'Mori la usa con todos los deudores de todas las inmobiliarias.'}
        </p>
      ) : (
        e.estado !== 'sin_empezar' && (
          <p className="text-body-sm text-fg" data-testid="experimento-recomendacion">
            {fraseDeLaRecomendacion(e)}
          </p>
        )
      )}

      {sePuedeCambiar && accion === null && (
        <div className="flex flex-wrap gap-2">
          {e.estado === 'sin_empezar' && (
            <Button hideArrow type="button"  onClick={() => abrir('empezar')}>
              Empezar el experimento
            </Button>
          )}
          {e.estado === 'paused' && (
            <Button hideArrow type="button"
              
              disabled={guardando}
              onClick={() => void hacer(() => empezarElExperimento(e.maxCuotas ?? MAX_CUOTAS_POR_DEFECTO), 'reanudar el experimento')}
            >
              {guardando ? 'Reanudando…' : 'Reanudar'}
            </Button>
          )}
          {e.estado === 'running' && (
            <Button variant="outline" hideArrow type="button"  onClick={() => abrir('pausar')}>
              Pausar
            </Button>
          )}
          {(e.estado === 'running' || e.estado === 'paused') && (
            <Button variant="outline" hideArrow type="button"  onClick={() => abrir('adoptar')}>
              Aprobar la ganadora
            </Button>
          )}
        </div>
      )}

      <Presence show={accion === 'empezar'}>
        <Card className="p-3 border-warning/40 space-y-3" data-testid="confirmar-empezar">
          <div>
            <label htmlFor="cuotas-de-b" className="block text-caption text-fg-muted mb-1">
              La forma B ofrece como mucho
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="cuotas-de-b"
                className="max-w-[5rem] font-mono"
                inputMode="numeric"
                value={cuotas}
                aria-invalid={cuotasLeidas === null ? true : undefined}
                aria-describedby="cuotas-de-b-ayuda"
                disabled={guardando}
                onChange={(ev) => setCuotas(ev.target.value)}
              />
              <span className="text-body-sm text-fg">cuotas</span>
            </div>
            <p id="cuotas-de-b-ayuda" className={`text-caption mt-1 ${cuotasLeidas === null ? 'text-danger' : 'text-fg-subtle'}`}>
              {cuotasLeidas === null
                ? `Escribe un número de cuotas entre ${MAX_CUOTAS_MINIMO} y ${MAX_CUOTAS_MAXIMO}.`
                : 'Con 1, la forma B sólo ofrece el pago total. No se puede cambiar una vez que haya deudores asignados.'}
            </p>
          </div>
          <p className="text-body-sm text-fg">
            Vas a empezar el experimento en todas las inmobiliarias que no lo apagaron. Desde la próxima llamada o
            mensaje, la mitad de los deudores oirá
            {cuotasLeidas === null ? ' la forma B' : ` «${nombreDeLaForma(FORMA_MENOS_CUOTAS, cuotasLeidas)}»`} y la otra
            mitad, como hoy. Queda registrado con tu correo.
          </p>
          <div className="flex gap-2">
            <Button hideArrow type="button"
              
              disabled={guardando || cuotasLeidas === null}
              onClick={() => cuotasLeidas !== null && void hacer(() => empezarElExperimento(cuotasLeidas), 'empezar el experimento')}
            >
              {guardando ? 'Empezando…' : 'Sí, empezar'}
            </Button>
            <Button variant="outline" hideArrow type="button"  disabled={guardando} onClick={() => setAccion(null)}>
              Volver
            </Button>
          </div>
        </Card>
      </Presence>

      <Presence show={accion === 'pausar'}>
        <Card className="p-3 border-warning/40 space-y-3" data-testid="confirmar-pausar">
          <p className="text-body-sm text-fg">
            Mientras esté en pausa, Mori le ofrece el acuerdo a todos como hoy. Lo medido no se pierde y al reanudar
            cada deudor vuelve a su misma forma.
          </p>
          <div className="flex gap-2">
            <Button hideArrow type="button"
              
              disabled={guardando}
              onClick={() => void hacer(() => pausarElExperimento(), 'pausar el experimento')}
            >
              {guardando ? 'Pausando…' : 'Sí, pausar'}
            </Button>
            <Button variant="outline" hideArrow type="button"  disabled={guardando} onClick={() => setAccion(null)}>
              Volver
            </Button>
          </div>
        </Card>
      </Presence>

      <Presence show={accion === 'adoptar'}>
        <Card className="p-3 border-warning/40 space-y-3" data-testid="confirmar-adoptar">
          <fieldset className="space-y-2">
            <legend className="text-caption text-fg-muted mb-1">¿Cuál gana?</legend>
            <RadioCardGroup
              value={ganadora}
              onValueChange={(v) => setGanadora(v as Forma)}
              disabled={guardando}
              orientation="vertical"
              aria-label="Cuál gana"
            >
              {[FORMA_COMO_HOY, FORMA_MENOS_CUOTAS].map((f) => (
                <RadioCard
                  key={f}
                  value={f}
                  data-testid={`ganadora-${f}`}
                  label={nombreDeLaForma(f, e.maxCuotas)}
                  badge={f === recomendada && e.recomendacion.tipo === 'gana' ? 'La recomendada' : undefined}
                />
              ))}
            </RadioCardGroup>
          </fieldset>
          {e.recomendacion.tipo !== 'gana' && (
            <p className="text-caption text-warning">{fraseDeLaRecomendacion(e)}</p>
          )}
          <p className="text-body-sm text-fg">
            {ganadora === FORMA_COMO_HOY
              ? 'El experimento termina y Mori sigue ofreciendo el acuerdo como siempre, en todas las inmobiliarias.'
              : `El experimento termina y desde ya Mori le ofrece ${e.maxCuotas !== null && e.maxCuotas <= 1 ? 'sólo el pago total' : `como mucho ${e.maxCuotas ?? 'las'} cuotas`} a todos los deudores de todas las inmobiliarias (nunca más de lo que autoriza cada una). Queda registrado con tu correo.`}
          </p>
          <div className="flex gap-2">
            <Button hideArrow type="button"
              
              disabled={guardando}
              onClick={() => void hacer(() => adoptarLaGanadora(ganadora), 'aprobar la ganadora')}
            >
              {guardando ? 'Aprobando…' : 'Sí, aprobar'}
            </Button>
            <Button variant="outline" hideArrow type="button"  disabled={guardando} onClick={() => setAccion(null)}>
              Volver
            </Button>
          </div>
        </Card>
      </Presence>

      {fallo && (
        <p role="alert" className="text-body-sm text-danger">
          {fallo}
        </p>
      )}
    </Card>
  )
}
