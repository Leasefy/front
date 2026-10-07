'use client'

/**
 * Cambiar a un agente desde su tarjeta (Nico, 05-10-2026 19:30: «al dar hover
 * que reaccione la orbe y que muestre información con un popover y cta para
 * poder activar y desactivar»).
 *
 * NO es un camino nuevo: son las MISMAS llamadas y las MISMAS reglas que la
 * hoja de «Autonomía» (`PilotoAutonomia`):
 *   · encender / apagar el agente para la inmobiliaria → `putPilotoGobierno`
 *     (el interruptor de Autonomía); se puede sólo si Leasefy lo ofrece
 *     (`disponibleGlobal`) y no está en `AGENTES_NO_DISPONIBLES`;
 *   · su modo → `usePilotoAutonomia().setModo` (la perilla de Autonomía);
 *     subir a Automático pide la MISMA confirmación (`ConfirmarAutomatico`, con
 *     el código del segundo factor si el micro lo pide); bajar es directo;
 *   · sólo un administrador (lo mismo que Autonomía: `isAdmin`); los demás lo
 *     ven deshabilitado con el porqué;
 *   · lo que pasó se dice con el traductor (`mensajeParaLaPersona`), y después
 *     se vuelve a leer la flota: la tarjeta se refresca sola.
 *
 * En la MUESTRA (`controlDeLaMuestra`) nada se ejecuta: avisa que es la muestra.
 */

import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmarAutomatico, pideSegundoFactor } from '@/components/inmobiliaria/piloto/ConfirmarAutomatico'
import { AGENTES_NO_DISPONIBLES } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { fetchPilotoGobierno, putPilotoGobierno, type AutonomiaModo, type GobiernoItem } from '@/lib/api/piloto'
import { AuthContext } from '@/lib/auth/auth-context'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import type { AgentePiloto, UsePilotoAutonomiaResult } from '@/lib/hooks/piloto/use-piloto-autonomia'

import { TEXTOS } from './textos'

/** Lo que la tarjeta de un agente puede hacer con él. */
export interface ControlDeAgentes {
  /** `true` en la muestra: nada se ejecuta. */
  esMuestra: boolean
  /** ¿Quien mira puede cambiar agentes? (un administrador, como en Autonomía). */
  puedeCambiar: boolean
  /** Por qué no, en palabras (cuando no puede). */
  porQueNo: string | null
  /** El agente con una escritura en vuelo. */
  ocupado: string | null
  /** El último fallo, dicho en palabras, por agente. */
  error: { agente: string; mensaje: string } | null
  /** ¿Se puede ENCENDER? `null` = todavía no se sabe (se pregunta al abrir). */
  sePuedeEncender: (agente: string) => { si: boolean | null; porQueNo: string | null }
  /** ¿Se le puede cambiar el modo? (el micro tiene que publicarlo en la autonomía). */
  tieneModo: (agente: string) => boolean
  /** Al abrir una tarjeta: lee el gobierno (una vez) si quien mira puede cambiar. */
  alAbrir: () => void
  encender: (agente: string, nombre: string, encendido: boolean) => Promise<void>
  cambiarModo: (agente: string, nombre: string, modo: AutonomiaModo) => Promise<void>
}

/** La muestra: todo visible, nada se ejecuta. */
export function controlDeLaMuestra(): ControlDeAgentes {
  const avisar = async () => {
    toast.info(TEXTOS.muestra.ctaNoEjecuta)
  }
  return {
    esMuestra: true,
    puedeCambiar: true,
    porQueNo: null,
    ocupado: null,
    error: null,
    sePuedeEncender: () => ({ si: true, porQueNo: null }),
    tieneModo: () => true,
    alAbrir: () => {},
    encender: avisar,
    cambiarModo: avisar,
  }
}

export interface UseControlDeAgentesArgs {
  /** La MISMA lectura de autonomía que usa la hoja de Autonomía del encabezado. */
  autonomia: UsePilotoAutonomiaResult
  /** Vuelve a leer la flota (lo que pintan las tarjetas). */
  refrescarFlota: () => Promise<void> | void
  /** ¿El Piloto automático está activo? (para la confirmación de Automático). */
  pilotoActivo: boolean
  isAdmin: boolean
}

export function useControlDeAgentes({ autonomia, refrescarFlota, pilotoActivo, isAdmin }: UseControlDeAgentesArgs): {
  control: ControlDeAgentes
  /** La confirmación de Automático: la pantalla la monta una vez. */
  dialogo: React.ReactNode
} {
  // Sin proveedor (una prueba, otra sección) no hay inmobiliaria: nada se escribe.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null
  const [gobierno, setGobierno] = useState<Map<string, GobiernoItem> | null>(null)
  const leyendo = useRef(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<{ agente: string; mensaje: string } | null>(null)
  const [pidiendo, setPidiendo] = useState<{ agente: AgentePiloto; nombre: string } | null>(null)

  const alAbrir = useCallback(() => {
    if (!isAdmin || !agencyId || gobierno || leyendo.current) return
    leyendo.current = true
    void fetchPilotoGobierno(agencyId).then((r) => {
      leyendo.current = false
      if (r.ok && r.data) setGobierno(new Map(r.data.agentes.map((a) => [a.agente, a])))
    })
  }, [isAdmin, agencyId, gobierno])

  const filaDeAutonomia = useCallback(
    (agente: string) => autonomia.rows.find((r) => r.agente === agente) ?? null,
    [autonomia.rows],
  )

  const encender = useCallback(
    async (agente: string, nombre: string, encendido: boolean) => {
      if (!agencyId) return
      setOcupado(agente)
      setError(null)
      const res = await putPilotoGobierno(agencyId, agente, encendido)
      setOcupado(null)
      if (res.ok && res.data) {
        setGobierno(new Map(res.data.agentes.map((a) => [a.agente, a])))
        toast.success(encendido ? TEXTOS.agente.encendido(nombre) : TEXTOS.agente.apagado(nombre))
        await Promise.allSettled([refrescarFlota(), autonomia.refetch()])
        return
      }
      const mensaje = mensajeParaLaPersona(res.fallo, {
        porDefecto: encendido ? 'No se pudo encender el agente.' : 'No se pudo apagar el agente.',
        accion: encendido ? 'encender el agente' : 'apagar el agente',
      })
      setError({ agente, mensaje })
      toast.error(mensaje)
    },
    [agencyId, refrescarFlota, autonomia],
  )

  const aplicarModo = useCallback(
    async (agente: AgentePiloto, nombre: string, modo: AutonomiaModo): Promise<{ ok: boolean; fallo?: unknown }> => {
      setOcupado(agente)
      setError(null)
      const res = await autonomia.setModo(agente, modo)
      setOcupado(null)
      if (res.ok) {
        toast.success(TEXTOS.agente.modoCambiado(nombre, TEXTOS.tripulacion.modos[modo]))
        await Promise.allSettled([refrescarFlota()])
        return { ok: true }
      }
      // Si pide el código, lo pide el diálogo (no un aviso rojo), igual que en Autonomía.
      if (!pideSegundoFactor(res.fallo)) {
        const mensaje = mensajeParaLaPersona(res.fallo, { porDefecto: 'No se pudo cambiar el modo.', accion: 'cambiar el modo' })
        setError({ agente, mensaje })
        toast.error(mensaje)
      }
      return { ok: false, fallo: res.fallo }
    },
    [autonomia, refrescarFlota],
  )

  const cambiarModo = useCallback(
    async (agente: string, nombre: string, modo: AutonomiaModo) => {
      const fila = filaDeAutonomia(agente)
      if (!fila) return
      // 🔴 PI-23: subir a Automático se confirma (y queda a nombre de quien lo hace).
      if (modo === 'autonomo') {
        setPidiendo({ agente: fila.agente, nombre })
        return
      }
      await aplicarModo(fila.agente, nombre, modo)
    },
    [filaDeAutonomia, aplicarModo],
  )

  const control = useMemo<ControlDeAgentes>(
    () => ({
      esMuestra: false,
      puedeCambiar: isAdmin,
      porQueNo: isAdmin ? null : TEXTOS.agente.soloAdmin,
      ocupado,
      error,
      sePuedeEncender: (agente) => {
        if (AGENTES_NO_DISPONIBLES.has(agente as AgentePiloto)) return { si: false, porQueNo: TEXTOS.agente.noDisponible }
        const g = gobierno?.get(agente)
        if (!g) return { si: null, porQueNo: null }
        return g.disponibleGlobal ? { si: true, porQueNo: null } : { si: false, porQueNo: TEXTOS.agente.loPrendeLeasefy }
      },
      tieneModo: (agente) => filaDeAutonomia(agente) !== null,
      alAbrir,
      encender,
      cambiarModo,
    }),
    [isAdmin, ocupado, error, gobierno, filaDeAutonomia, alAbrir, encender, cambiarModo],
  )

  const dialogo = (
    <ConfirmarAutomatico
      abierto={pidiendo !== null}
      quien={pidiendo?.nombre ?? 'este agente'}
      pilotoActivo={pilotoActivo}
      onConfirmar={async () => (pidiendo ? aplicarModo(pidiendo.agente, pidiendo.nombre, 'autonomo') : { ok: false })}
      onCerrar={() => setPidiendo(null)}
    />
  )

  return { control, dialogo }
}
