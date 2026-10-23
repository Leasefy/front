'use client'

import { useState } from 'react'
import { Presence, RadioCard, RadioCardGroup } from '@leasefy/cadence'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime } from '@/lib/admin/format'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { Pill } from '@/components/admin/Pill'
import { ErrorBlock } from '@/components/admin/screen/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Card, MonoLabel } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Accion = null | 'empezar' | 'pausar' | 'adoptar'

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
      <Card className="p-5 mb-6" aria-busy="true">
        <MonoLabel className="block">laura · cómo ofrece el acuerdo</MonoLabel>
        <p className="text-body-sm text-fg-muted mt-2">Cargando el experimento…</p>
      </Card>
    )
  }
  if (consulta.error && !e) {
    // Ronda 26 (revisora r25): el MISMO cartel de fallo que la tabla de abajo (antes un rojo suelto con
    // «Reintentar» y la tabla con «Intentar de nuevo»).
    return (
      <ErrorBlock
        titulo="No pudimos cargar el experimento de Laura"
        error={consulta.error}
        onReintentar={consulta.refetch}
        className="mb-6"
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
    <Card className="p-5 space-y-4 mb-6" aria-labelledby="experimento-laura-titulo" data-testid="experimento-de-laura">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div id="experimento-laura-titulo" className="font-mono text-caption uppercase tracking-[0.08em] text-fg-subtle">
            laura · cómo ofrece el acuerdo
          </div>
          <p className="text-caption text-fg-muted mt-1 max-w-3xl">
            A la mitad de los deudores Laura les ofrece el acuerdo como hoy y a la otra mitad con menos cuotas, al azar y
            por voz y WhatsApp (el mismo deudor oye lo mismo en los dos). Gana la que recupera más plata en{' '}
            {e.diasDeLaMedicion} días, contada con los recibos del back. Corre en todas las inmobiliarias
            {e.inmobiliariasQueLoApagaron > 0
              ? ` menos ${e.inmobiliariasQueLoApagaron === 1 ? 'una que lo apagó' : `${e.inmobiliariasQueLoApagaron} que lo apagaron`}`
              : ''}
            . Nada cambia en Laura para todas sin tu aprobación.
          </p>
        </div>
        <Pill tone={estado.tono}>{estado.texto}</Pill>
      </div>

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

      <div className="overflow-x-auto">
        <Table data-testid="formas-del-experimento">
          <TableHeader>
            <TableRow className="text-left text-caption text-fg-muted">
              <TableHead >Forma</TableHead>
              <TableHead className="text-right">Asignados</TableHead>
              <TableHead className="text-right">Medidos</TableHead>
              <TableHead className="text-right">Plata en {e.diasDeLaMedicion} días</TableHead>
              <TableHead className="text-right">Por deudor</TableHead>
              <TableHead className="text-right">Pagaron algo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {e.formas.map((f) => (
              <TableRow key={f.variantKey} data-testid={`forma-${f.variantKey}`}>
                <TableCell >
                  <div className="text-fg">{nombreDeLaForma(f.variantKey, e.maxCuotas)}</div>
                  <div className="text-caption text-fg-muted">{queHaceLaForma(f.variantKey, e.maxCuotas)}</div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{f.asignados.toLocaleString('es-CO')}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {f.medidos.toLocaleString('es-CO')}
                  {(f.enCurso > 0 || f.sinDatos > 0) && (
                    <div className="text-caption text-fg-subtle font-sans">
                      {f.enCurso > 0 ? `${f.enCurso} en curso` : ''}
                      {f.enCurso > 0 && f.sinDatos > 0 ? ' · ' : ''}
                      {f.sinDatos > 0 ? `${f.sinDatos} sin contrato` : ''}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmtCOP(f.plataTotal)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{f.medidos > 0 ? fmtCOP(f.plataPorDeudor) : '—'}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {f.medidos > 0 ? `${Math.round((f.conAlgunPago / f.medidos) * 100)} %` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {e.adoptada ? (
        <p role="status" className="text-body-sm text-success" data-testid="experimento-adoptada">
          Ganó {nombreDeLaForma(e.adoptada.variantKey, e.maxCuotas)}: la aprobó {e.adoptada.adoptadaPor} el{' '}
          {fmtDateTime(e.adoptada.adoptadaAt)}.{' '}
          {e.adoptada.variantKey === FORMA_COMO_HOY
            ? 'Laura sigue ofreciendo el acuerdo como siempre.'
            : 'Laura la usa con todos los deudores de todas las inmobiliarias.'}
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
            Mientras esté en pausa, Laura le ofrece el acuerdo a todos como hoy. Lo medido no se pierde y al reanudar
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
              ? 'El experimento termina y Laura sigue ofreciendo el acuerdo como siempre, en todas las inmobiliarias.'
              : `El experimento termina y desde ya Laura le ofrece ${e.maxCuotas !== null && e.maxCuotas <= 1 ? 'sólo el pago total' : `como mucho ${e.maxCuotas ?? 'las'} cuotas`} a todos los deudores de todas las inmobiliarias (nunca más de lo que autoriza cada una). Queda registrado con tu correo.`}
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
