'use client'

/**
 * Laboratorio — /admin → Maestro → Laboratorio (Nico, 19-10-2026, al ver el «Paper Lab»: «quiero que al final el maestro
 * sea así de crack»; eligió «Repetición + Correr ahora»).
 *
 * QUÉ ES: una noche del maestro, paso a paso, con sus datos reales:
 *   - arriba, los contadores de la noche y la barra de avance;
 *   - al centro, el anillo (`AnilloDelMaestro`): las inmobiliarias por tamaño con sus agentes y sus preguntas al chat, y
 *     los seis del maestro trabajando;
 *   - abajo, los paneles (`PanelesDelLaboratorio`).
 * Al abrir, REPITE la noche elegida (la última, si no se elige otra) comprimida a unos 20 segundos; «Ver todo» salta al
 * final. «Correr ahora» corre una noche ya (pide confirmar con lo que costó la última y el tope) y la muestra EN VIVO: se
 * pregunta la bitácora cada 1,5 s hasta el paso «fin» y entonces se vuelve a leer la noche guardada.
 * Con movimiento reducido no hay repetición: se ve la noche entera de una vez.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'

import { correrElMaestroAhora, getBitacoraDelMaestro, getLaboratorioDelMaestro, type PasoDelMaestro } from '@/lib/admin/agent-api'
import { avanceDeLosRoles, inmobiliariasDelAnillo, lineaDeTiempo, nombresPorAlias } from '@/lib/admin/laboratorio'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { ErrorBlock, LoadingBlock } from '@/components/admin/screen/states'

import { AnilloDelMaestro } from './AnilloDelMaestro'
import { PanelAgentes, PanelBitacora, PanelEnsayo, PanelIndice, PanelInsights, PanelMesa, PanelSirvio, PanelValidacion } from './PanelesDelLaboratorio'

const usd = (n: number) => `US$${n.toFixed(n < 1 ? 3 : 2).replace('.', ',')}`
const CADA_CUANTO_EN_VIVO_MS = 1_500

function Contador({ nombre, valor, rojo = false }: { nombre: string; valor: string | number; rojo?: boolean }) {
  return (
    <div className="min-w-[88px]">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">{nombre}</p>
      <motion.p key={String(valor)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`font-mono text-[15px] tabular-nums ${rojo ? 'text-[#e84855]' : 'text-white'}`}>
        {valor}
      </motion.p>
    </div>
  )
}

export function Laboratorio({ onVerMejoras, onNocheNueva }: { onVerMejoras: () => void; onNocheNueva?: () => void }) {
  const reducido = useReducedMotion() ?? false
  const [corrida, setCorrida] = useState<string | null>(null)
  const [vuelta, setVuelta] = useState(0)
  const lab = useApiQuery((signal) => getLaboratorioDelMaestro(corrida, signal), [corrida, vuelta])
  const data = lab.data

  // Los pasos que se conocen (la bitácora entera, o lo que va llegando en vivo) y cuántos se muestran.
  const [pasos, setPasos] = useState<PasoDelMaestro[]>([])
  const [n, setN] = useState(0)
  const [enVivo, setEnVivo] = useState<string | null>(null)
  // La noche que se pidió con «Correr ahora»: se sigue en vivo aunque Inngest tarde en escribir su primer paso.
  const [pedida, setPedida] = useState<string | null>(null)
  const [elegida, setElegida] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'ok' | 'bad'; texto: string } | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parar = () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
  }

  /** Repite desde el paso `desde` con las esperas de la línea de tiempo. */
  const repetir = useCallback(
    (lista: PasoDelMaestro[], desde = 0) => {
      parar()
      if (reducido || lista.length === 0) {
        setN(lista.length)
        return
      }
      const esperas = lineaDeTiempo(lista)
      let i = desde
      setN(i)
      const siguiente = () => {
        i++
        setN(i)
        if (i < lista.length) temporizador.current = setTimeout(siguiente, esperas[i] ?? 200)
      }
      temporizador.current = setTimeout(siguiente, 400)
    },
    [reducido],
  )

  // Llegó una noche: si está corriendo, en vivo; si no, se repite.
  useEffect(() => {
    if (!data) return
    const lista = data.bitacora
    setPasos(lista)
    const corriendo =
      data.enCurso && data.enCurso.corridaId === data.corridaId
        ? data.enCurso.corridaId
        : pedida && data.corridaId === pedida && data.corrida === null && !lista.some((p) => p.paso === 'fin')
          ? pedida
          : null
    setEnVivo(corriendo)
    if (corriendo) {
      parar()
      setN(lista.length)
    } else {
      repetir(lista)
    }
    return parar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.generadoEn])

  // En vivo: pregunta lo nuevo hasta el «fin»; entonces vuelve a leer la noche guardada.
  useEffect(() => {
    if (!enVivo) return
    let vivo = true
    let id: ReturnType<typeof setTimeout> | null = null
    const preguntar = async () => {
      try {
        const r = await getBitacoraDelMaestro(enVivo, pasos.length)
        if (!vivo) return
        if (r.pasos.length > 0) {
          setPasos((p) => {
            const nuevos = r.pasos.filter((x) => x.orden >= p.length)
            const todo = [...p, ...nuevos]
            setN(todo.length)
            return todo
          })
        }
        if (r.terminada) {
          // Se vuelve a leer la noche ya guardada (con sus propuestas, su anillo y su costo).
          const terminada = enVivo
          setPedida(null)
          setEnVivo(null)
          setCorrida(terminada)
          setVuelta((v) => v + 1)
          // La pantalla de arriba (Por decidir, Mejoras) también se vuelve a leer.
          onNocheNueva?.()
          return
        }
      } catch {
        // Un tropiezo de red no corta el vivo: se vuelve a preguntar.
      }
      if (vivo) id = setTimeout(preguntar, CADA_CUANTO_EN_VIVO_MS)
    }
    id = setTimeout(preguntar, CADA_CUANTO_EN_VIVO_MS)
    return () => {
      vivo = false
      if (id) clearTimeout(id)
    }
  }, [enVivo, pasos.length])

  const visibles = useMemo(() => pasos.slice(0, n), [pasos, n])
  const ultimo = visibles[visibles.length - 1] ?? null
  const avance = useMemo(() => avanceDeLosRoles(pasos, n), [pasos, n])
  const alias = useMemo(() => (data ? nombresPorAlias(data, pasos) : {}), [data, pasos])
  const inmobiliarias = useMemo(() => (data ? inmobiliariasDelAnillo(data, visibles) : []), [data, visibles])
  const propuestas = useMemo(() => data?.propuestas ?? [], [data])
  // La propuesta elegida: la que el usuario tocó, o la del último ensayo que salió, o la primera.
  const huellaDelUltimoEnsayo = [...visibles].reverse().find((p) => p.paso === 'ensayo' && typeof p.detalle.huella === 'string')?.detalle.huella as string | undefined
  const propuesta = propuestas.find((p) => p.id === elegida) ?? propuestas.find((p) => p.huella === huellaDelUltimoEnsayo) ?? propuestas[0] ?? null
  const ensayoDe = useCallback(
    (huella: string) => propuestas.find((p) => p.huella === huella)?.ensayo?.porInmobiliaria.map((x) => ({ alias: x.alias, veredicto: x.veredicto })) ?? null,
    [propuestas],
  )

  const correr = async () => {
    setOcupado(true)
    setAviso(null)
    try {
      const r = await correrElMaestroAhora()
      setConfirmando(false)
      setAviso({ tono: 'ok', texto: r.mensaje })
      parar()
      setPasos([])
      setN(0)
      setElegida(null)
      setPedida(r.corridaId)
      setCorrida(r.corridaId)
      setVuelta((v) => v + 1)
    } catch (e) {
      setAviso({ tono: 'bad', texto: mensajeDelAdmin(e, { accion: 'correr la noche del maestro' }) })
    } finally {
      setOcupado(false)
    }
  }

  if (lab.isLoading && !data) return <LoadingBlock />
  if (lab.error && !data) return <ErrorBlock error={lab.error} />
  if (!data) return null

  const porRevisar = propuestas.filter((p) => p.veredicto === 'por_revisar').length
  const costo = data.corrida?.costoUsd ?? null
  const terminado = n >= pasos.length && pasos.length > 0 && !enVivo
  const alto = 560

  return (
    <MotionConfig reducedMotion="user">
      <section className="bg-[#08090b] text-white" aria-label="Laboratorio del maestro" data-maestro-laboratorio="">
        {/* Cabecera: nombre, contadores y controles. */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-white">Leasefy / maestro</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">diarios de las Nairas → mejoras ensayadas y revisadas</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Contador nombre="Inmobiliarias" valor={data.corrida?.inmobiliarias ?? inmobiliarias.length} />
            <Contador nombre="Diarios" valor={data.corrida?.diarios ?? visibles.filter((p) => p.paso === 'leyo').reduce((s, p) => s + Number(p.detalle.diarios ?? 0), 0)} />
            <Contador nombre="Agentes del maestro" valor={6} />
            <Contador nombre="Propuestas" valor={propuestas.length} />
            <Contador nombre="Por revisar" valor={porRevisar} rojo={porRevisar > 0} />
            <Contador nombre="Costo" valor={costo === null ? '—' : usd(costo)} />
          </div>
        </header>
        <div className="h-[2px] w-full bg-white/[0.06]" aria-hidden="true">
          <motion.div className="h-full bg-white" initial={false} animate={{ scaleX: pasos.length === 0 ? 0 : n / pasos.length }} style={{ originX: 0 }} transition={{ duration: 0.25 }} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-white/60">
            {enVivo ? (
              <span className="inline-flex items-center gap-2 text-white" data-maestro-en-vivo="">
                <motion.span className="inline-block h-2 w-2 bg-[#e84855]" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }} /> EN VIVO
              </span>
            ) : null}
            <label className="inline-flex items-center gap-2">
              <span className="uppercase tracking-[0.12em] text-white/45">Noche</span>
              <select
                className="h-8 border border-white/20 bg-[#0e1013] px-2 font-mono text-[11px] text-white"
                value={data.corridaId ?? ''}
                onChange={(e) => {
                  setElegida(null)
                  setCorrida(e.target.value || null)
                }}
              >
                {data.enCurso && !data.corridas.some((c) => c.id === data.enCurso?.corridaId) ? <option value={data.enCurso.corridaId}>Corriendo ahora…</option> : null}
                {data.corridas.length === 0 && !data.enCurso ? <option value="">Todavía no hay noches</option> : null}
                {data.corridas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.dia} · {c.origen === 'manual' ? `a pedido ${c.creadaEn.slice(11, 16)}` : 'la de la noche'} · {usd(c.costoUsd)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-on-dark h-8 px-3" disabled={!!enVivo || pasos.length === 0} onClick={() => repetir(pasos)}>
              {terminado ? 'Repetir la noche' : 'Desde el principio'}
            </button>
            <button
              type="button"
              className="btn btn-on-dark h-8 px-3"
              disabled={!!enVivo || terminado || pasos.length === 0}
              onClick={() => {
                parar()
                setN(pasos.length)
              }}
            >
              Ver todo
            </button>
            <button type="button" className="btn btn-inverted h-8 px-3" disabled={!!enVivo || !data.prendido} onClick={() => setConfirmando(true)} title={data.prendido ? undefined : 'El maestro está apagado en este servidor'}>
              Correr ahora
            </button>
          </div>
        </div>

        <AnimatePresence>
          {confirmando ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-4 mt-3 space-y-2 border border-white/25 bg-white/[0.04] p-3"
              role="alertdialog"
              aria-label="Confirmar correr la noche ahora"
            >
              <p className="text-[13px] text-white">
                Corre una noche completa ya: lee los diarios de todas las Nairas, piensa, ensaya, revisa y mide lo aplicado.{' '}
                {data.costoEstimadoUsd !== null ? `Las últimas noches costaron unos ${usd(data.costoEstimadoUsd)}` : 'Todavía no hay una noche con costo para comparar'}; el tope es {usd(data.topeUsd)}.
              </p>
              <p className="text-[12px] text-white/55">No reparte nada: lo que proponga queda para aprobar en Mejoras.</p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-inverted h-8 px-3" disabled={ocupado} onClick={() => void correr()}>
                  {ocupado ? 'Un momento…' : 'Sí, correrla ahora'}
                </button>
                <button type="button" className="btn btn-on-dark h-8 px-3" disabled={ocupado} onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {aviso ? (
          <p role="status" className={`mx-4 mt-3 font-mono text-[11px] ${aviso.tono === 'ok' ? 'text-white/80' : 'text-[#e84855]'}`}>
            {aviso.texto}
          </p>
        ) : null}

        {/* El anillo. */}
        <div className="px-2 sm:px-4">
          <AnilloDelMaestro inmobiliarias={inmobiliarias} paso={ultimo} rolActivo={enVivo || !terminado ? (ultimo?.rol ?? null) : null} reducido={reducido} ensayoDe={ensayoDe} alto={alto} />
        </div>

        {/* Los paneles. */}
        <div className="grid grid-cols-1 gap-2 p-2 sm:p-4 md:grid-cols-2 lg:grid-cols-4">
          <PanelBitacora pasos={visibles} alias={alias} />
          <PanelEnsayo propuesta={propuesta} />
          <PanelAgentes avance={avance} activo={enVivo || !terminado ? (ultimo?.rol ?? null) : null} />
          <PanelMesa propuesta={propuesta} onVerMejoras={onVerMejoras} />
          <PanelValidacion propuesta={propuesta} alias={alias} />
          <PanelSirvio mediciones={data.mediciones} />
          <PanelIndice propuestas={propuestas} inmobiliarias={data.inmobiliarias} elegida={propuesta?.id ?? null} onElegir={setElegida} />
          <PanelInsights pasos={visibles} alias={alias} />
        </div>
        <p className="px-4 pb-4 font-mono text-[10px] text-white/35">
          Todo sale de la noche: los diarios que dejó cada Naira, lo que propuso el maestro, su ensayo con 30 días reales y lo que dijo el revisor. {data.ontologia.agentes.length} agentes y {data.ontologia.limites} límites en la ontología de Leasefy.
        </p>
      </section>
    </MotionConfig>
  )
}
