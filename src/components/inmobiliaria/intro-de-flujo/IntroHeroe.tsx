'use client'

/**
 * La explicación de la primera vez de un flujo de «Nuevo» — A «HÉROE», la que
 * eligió Nico (05-10-2026): una banda de marca arriba y el plan abajo. La abre
 * `IntroDelFlujo` (`BotonNuevo.tsx`).
 *
 * Arriba, la superficie de marca (`bg-ink`, igual en claro y oscuro) con
 * grano y un resplandor cobalto: el medallón del flujo (el ícono en su
 * círculo, con tres anillos que se dibujan hacia afuera) y, a su lado, el
 * momento («Nuevo · Captar»), el título grande y el resumen. Abajo, sobre la
 * superficie del panel: «Qué vas a hacer» como línea de tiempo con un ícono
 * por paso y su riel que se dibuja, y al lado «Antes de empezar» como lista de
 * chequeo que se puede marcar (no frena nada). El pie del DS: «Esto se muestra
 * una sola vez» y las dos salidas.
 *
 * A 390 px es la hoja del DS: la banda centra el medallón sobre el título y el
 * plan y la lista se apilan.
 */

import { motion } from 'framer-motion'
import { motionDistance, motionDuration, motionEase, usePrefersReducedMotion } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { flujoIntro } from '@/lib/inmobiliaria/flujos'

import {
  CascaraDeLaIntro,
  GRANO,
  LineaDeTiempo,
  ListaDeChequeo,
  MedallonDelFlujo,
  Rotulo,
  type PropsDeLaIntro,
} from './piezas'
import { CLAVES_DE_LA_INTRO, INTROS } from './textos'

export function IntroHeroe(props: PropsDeLaIntro) {
  const { t } = useI18n()
  const reducido = usePrefersReducedMotion()
  return (
    <CascaraDeLaIntro {...props} tamano="lg" testid="intro-heroe">
      {(flujo) => {
        const claves = flujoIntro(flujo.key)
        const { icono, pasos, antes } = INTROS[flujo.key]
        return (
        <div data-flujo={flujo.key}>
          {/* ── La banda de marca ── */}
          <div className="dark relative isolate overflow-hidden bg-ink px-6 pb-7 pt-8 text-fg sm:px-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <div
                className="absolute -left-24 -top-40 h-[480px] w-[480px] rounded-full"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 34%, transparent) 0%, transparent 64%)' }}
              />
              <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: GRANO }} />
            </div>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:pr-10 sm:text-left">
              <MedallonDelFlujo icono={icono ?? flujo.icon} tamano={56} sobreTinta className="-my-4 sm:-ml-4" />
              <motion.div
                className="min-w-0 space-y-2"
                initial={reducido ? { opacity: 0 } : { opacity: 0, y: motionDistance.sm }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducido ? motionDuration.fast : motionDuration.slow, ease: motionEase.enter, delay: 0.1 }}
              >
                <Rotulo className="text-fg-muted">{t(CLAVES_DE_LA_INTRO.momento(flujo.grupo))}</Rotulo>
                <p aria-hidden="true" className="font-display text-[26px] font-semibold leading-[32px] tracking-[-0.02em] text-fg">
                  {t(claves.titulo)}
                </p>
                <p aria-hidden="true" className="text-body-sm text-fg-muted [text-wrap:pretty]">
                  {t(claves.resumen)}
                </p>
              </motion.div>
            </div>
          </div>

          {/* ── El plan y la lista ── */}
          <div className="grid gap-7 px-6 py-7 sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] sm:px-8">
            <section aria-labelledby={`heroe-plan-${flujo.key}`}>
              <Rotulo id={`heroe-plan-${flujo.key}`}>{t(CLAVES_DE_LA_INTRO.queVasAHacer)}</Rotulo>
              <LineaDeTiempo
                pasos={pasos.map((Icono, i) => ({ icono: Icono, titulo: t(claves.paso(i + 1).titulo), texto: t(claves.paso(i + 1).texto) }))}
                className="mt-4"
              />
            </section>
            <section
              aria-labelledby={`heroe-antes-${flujo.key}`}
              className="self-start rounded-lg border border-border bg-surface-hover p-3"
            >
              <Rotulo id={`heroe-antes-${flujo.key}`} className="px-2 pt-1">
                {t(CLAVES_DE_LA_INTRO.antesDeEmpezar)}
              </Rotulo>
              <ListaDeChequeo
                items={Array.from({ length: antes }, (_, i) => t(claves.antes(i + 1)))}
                idBase={`heroe-antes-${flujo.key}`}
                className="mt-2"
              />
            </section>
          </div>
        </div>
        )
      }}
    </CascaraDeLaIntro>
  )
}
