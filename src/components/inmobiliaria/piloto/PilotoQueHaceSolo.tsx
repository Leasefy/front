'use client'

/**
 * PilotoQueHaceSolo — «Qué hace solo», por agente y por tipo
 * (AUTONOMIA-POR-TIPO, 04-10-2026).
 *
 * Nico (31-08): «si la inmobiliaria eligió piloto automático, que se maneje
 * sola — según lo que haya escogido». Por defecto, lo que el Piloto detecta y
 * P-4 deja con clic sigue pidiendo el clic. Un ADMINISTRADOR puede escoger,
 * tipo por tipo, que vaya solo: con la confirmación que dice qué va a pasar y
 * a quién le llega, y con el código de su aplicación de ahora (el diálogo
 * `ConfirmarAutomatico`). Queda en la bitácora quién y cuándo. Actúa sólo con
 * el Piloto activo y el agente en Automático, dentro de los topes y del
 * horario de ley, con la gracia de «Deshacer»; si falta una condición, pide el
 * clic y lo dice. El asesor (y cualquiera que no sea administrador) lo ve sin
 * controles.
 *
 * Dos piezas:
 *   · `PilotoQueHaceSoloDelAgente`: debajo de la fila de cada agente en la
 *     hoja de Autonomía, sus tipos.
 *   · `PilotoLoQueNuncaVaSolo`: al final de la hoja, lo que nunca va solo
 *     (plata que sale, centrales, terminar contratos, jurídico) y lo que no
 *     tiene cómo hacerse solo (elegir a qué cobro va un movimiento, un aviso).
 *
 * Movimiento: Framer con los tokens de Cadence (sólo opacidad y desplazamiento;
 * `MotionProvider reducedMotion="user"` del layout raíz).
 */

import { AnimatePresence, motion } from 'framer-motion'
import { LockSimple, Lightning } from '@phosphor-icons/react'
import { MonoLabel, Switch, motionDistance, motionTransition } from '@leasefy/cadence'

import type { PilotoTiposQueVanSolosResponse, TipoQueVaSolo } from '@/lib/api/piloto'

/** «4 de octubre de 2026» (el día en Bogotá). */
export function diaDeLaEleccion(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/**
 * FALTANTES (05-10-2026, decisión 18): quién lo escogió, con su NOMBRE. El micro
 * ya lo manda con el nombre; un micro anterior mandaba el correo, y un correo
 * nunca se pinta.
 */
export function quienLoEscogio(escogidoPor: string | null | undefined): string {
  const q = (escogidoPor ?? '').trim()
  if (!q) return 'un administrador'
  return q.includes('@') ? 'una persona del equipo' : q
}

export interface PilotoQueHaceSoloDelAgenteProps {
  agente: string
  datos: PilotoTiposQueVanSolosResponse | null
  /** El tipo que se está guardando ahora (apaga su interruptor). */
  ocupado: string | null
  /** Escoger (true) pide confirmación; quitar (false) es directo. */
  onEscoger: (tipo: TipoQueVaSolo, vaSolo: boolean) => void
}

export function PilotoQueHaceSoloDelAgente({ agente, datos, ocupado, onEscoger }: PilotoQueHaceSoloDelAgenteProps) {
  const tipos = (datos?.tipos ?? []).filter((t) => t.agente === agente)
  if (!datos || tipos.length === 0) return null
  const sePuedeEscoger = datos.puedeEditar && datos.guardable !== false
  return (
    <motion.div
      initial={{ opacity: 0, y: motionDistance.xs }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransition.enter}
      className="ml-3 space-y-2 border-l border-border pl-3"
      data-testid={`piloto-que-hace-solo-${agente}`}
    >
      <MonoLabel>Qué hace solo</MonoLabel>
      {tipos.map((t) => (
        <div key={t.tipo} className="space-y-1" data-testid={`piloto-tipo-${t.tipo}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">{t.nombre}</p>
              <p className="text-caption leading-snug text-fg-muted">
                {t.escogido ? 'Tu inmobiliaria escogió que vaya solo.' : `Por defecto: ${t.porDefecto.toLowerCase()}`}
              </p>
            </div>
            {sePuedeEscoger ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-caption text-fg-subtle">Que vaya solo</span>
                <Switch
                  checked={t.escogido}
                  disabled={ocupado === t.tipo}
                  onCheckedChange={(v: boolean) => onEscoger(t, v)}
                  aria-label={`Que «${t.nombre}» vaya solo`}
                  data-testid={`piloto-tipo-switch-${t.tipo}`}
                />
              </span>
            ) : (
              <span
                className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-caption text-fg-muted"
                data-testid={`piloto-tipo-estado-${t.tipo}`}
              >
                {t.escogido ? 'Va solo' : 'Pide tu clic'}
              </span>
            )}
          </div>
          <AnimatePresence initial={false}>
            {t.escogido && (
              <motion.div
                key="escogido"
                initial={{ opacity: 0, y: motionDistance.xs }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -motionDistance.xs }}
                transition={motionTransition.enter}
                className="space-y-0.5"
              >
                {(t.escogidoPor || t.escogidoEn) && (
                  <p className="text-caption leading-snug text-fg-subtle" data-testid={`piloto-tipo-quien-${t.tipo}`}>
                    Lo escogió {quienLoEscogio(t.escogidoPor)}
                    {diaDeLaEleccion(t.escogidoEn) ? ` el ${diaDeLaEleccion(t.escogidoEn)}` : ''}.
                  </p>
                )}
                {t.actuaHoy ? (
                  <p className="flex items-center gap-1 text-caption leading-snug text-fg-muted">
                    <Lightning weight="duotone" className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Hoy va solo cuando se cumple lo de abajo, dentro de tus topes y del horario de ley, con tu gracia
                    para deshacerlo.
                  </p>
                ) : (
                  t.porQueNoActua && (
                    <p className="text-caption leading-snug text-warning" data-testid={`piloto-tipo-no-actua-${t.tipo}`}>
                      {t.porQueNoActua}
                    </p>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="space-y-0.5 pt-0.5">
            {t.condiciones.map((c) => (
              <li key={c} className="text-caption leading-snug text-fg-subtle">
                · {c}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!sePuedeEscoger && datos.porQueNo && (
        <p className="text-caption leading-snug text-fg-subtle" data-testid={`piloto-que-hace-solo-porqueno-${agente}`}>
          {datos.porQueNo}
        </p>
      )}
    </motion.div>
  )
}

export interface PilotoLoQueNuncaVaSoloProps {
  datos: PilotoTiposQueVanSolosResponse | null
  /** El nombre del agente en pantalla (`workspaceVocab`). */
  nombreDelAgente: (agente: string) => string
}

export function PilotoLoQueNuncaVaSolo({ datos, nombreDelAgente }: PilotoLoQueNuncaVaSoloProps) {
  if (!datos || (datos.nunca.length === 0 && datos.noPuedenIrSolos.length === 0)) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: motionDistance.xs }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransition.enter}
      className="mt-6 space-y-3 rounded-lg border border-border p-3"
      data-testid="piloto-nunca-va-solo"
    >
      <div className="flex items-center gap-1.5">
        <LockSimple weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        <MonoLabel>Lo que nunca va solo</MonoLabel>
      </div>
      <p className="text-caption leading-snug text-fg-muted">
        Aunque lo escojas, esto siempre lo prepara el Piloto y lo hace una persona con su clic.
      </p>
      <ul className="space-y-2">
        {datos.nunca.map((g) => (
          <li key={g.categoria} className="space-y-0.5" data-testid={`piloto-nunca-${g.categoria}`}>
            <p className="text-body-sm font-medium text-fg">{g.nombre}</p>
            <p className="text-caption leading-snug text-fg-muted">{g.porQue}</p>
            <p className="text-caption leading-snug text-fg-subtle">{g.procesos.map((p) => p.queHace).join(' · ')}</p>
          </li>
        ))}
      </ul>
      {datos.noPuedenIrSolos.length > 0 && (
        <>
          <MonoLabel>Siempre con tu clic: no hay cómo hacerlo solo</MonoLabel>
          <ul className="space-y-2">
            {datos.noPuedenIrSolos.map((x) => (
              <li key={x.id} className="space-y-0.5" data-testid={`piloto-no-puede-${x.id}`}>
                <p className="text-caption leading-snug text-fg">
                  <span className="font-medium">{nombreDelAgente(x.agente)}:</span> {x.queHace}
                </p>
                <p className="text-caption leading-snug text-fg-subtle">{x.porQue}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.section>
  )
}

/** Lo que dice la confirmación antes de escoger que un tipo vaya solo. */
export function ExplicacionDeQueVayaSolo({ tipo, pilotoActivo }: { tipo: TipoQueVaSolo; pilotoActivo: boolean }) {
  return (
    <>
      <p data-testid="confirmar-tipo-que-pasa">{tipo.queVaAPasar}</p>
      <p className="text-fg-muted" data-testid="confirmar-tipo-a-quien">
        <span className="font-medium text-fg">A quién le llega: </span>
        {tipo.aQuienLeLlega}
      </p>
      <div className="space-y-0.5">
        <p className="font-medium text-fg">Sólo va solo si se cumple:</p>
        <ul className="space-y-0.5 text-fg-muted">
          {tipo.condiciones.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>
      </div>
      <p className="text-fg-muted">
        Actúa sólo con el Piloto activo y su agente en Automático, dentro de tus topes y del horario de ley, con tu gracia
        para deshacerlo antes de que salga. Cada vez queda en la Actividad, a tu nombre. Si falta algo, te lo deja en la
        Bandeja y dice qué.
      </p>
      {!pilotoActivo && (
        <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-fg" data-testid="confirmar-tipo-apagado">
          El Piloto automático no está activo en tu inmobiliaria: guardo tu elección, pero no actuará solo hasta que lo
          actives.
        </p>
      )}
      <p className="text-fg-muted">Te pedimos el código de tu aplicación de autenticación: así queda a tu nombre.</p>
    </>
  )
}
