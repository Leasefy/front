'use client'

/**
 * La presentación de cada agente — A «ESCENARIO», la que eligió Nico (05-10
 * 19:10): el agente despierta en el centro de la marca.
 *
 * Todo el modal es la superficie de marca (`bg-ink`, la misma en claro y en
 * oscuro), con grano y la LUZ del agente (el halo de su propio orbe) que
 * respira. En el centro, el orbe grande con SUS dos anillos (el punteado y el
 * arco de su color), que giran: entra, despierta (quieto → pensando →
 * trabajando → listo) y una franja de luz cruza el escenario una vez, como un
 * escaneo. Sin las líneas grandes alrededor (Nico: «sin esas líneas alrededor
 * que son enormes, sólo las de la orbe que tiene y ya»). Arriba a la
 * izquierda, «Modo · Copiloto»; en el centro, el rol, el nombre y la promesa;
 * después las tres capacidades en una fila de losetas, y abajo lo que
 * necesita de ti y lo que significa su modo, lado a lado. El pie lleva
 * «¿Cómo funciona?» a la izquierda y el llamado a la derecha.
 *
 * La usan la presentación de cada agente (`PresentacionDelAgente`, en
 * `tour/AgentIntroModal.tsx`) y la del piloto automático (`PilotoNovedad`).
 * Los textos son claves de i18n (`textos.ts`).
 *
 * Movimiento: el orbe y sus anillos entran con escala y fundido (`reveal`,
 * `enter`); el texto y las losetas suben escalonados (`Stagger`, `sm`); el
 * barrido de luz es una sola pasada. Con movimiento reducido: fundidos cortos,
 * el orbe `listo` de una, sin barrido ni bucles.
 *
 * A 390 px es la hoja del DS que sube desde abajo: el orbe baja a 100 px y las
 * losetas se apilan. A 1440 cabe entera, sin scroll.
 */

import { Stagger, StaggerItem } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import {
  BloqueDelModo,
  CascaraDePresentacion,
  ComoFuncionaDelAgente,
  FondoDeMarca,
  OrbeQueDespierta,
  PuntoQueLate,
  Rotulo,
  luzDelAgente,
  useDespertar,
  type PropsDePresentacion,
} from './piezas'
import { CLAVES_COMUNES, MODO_CON_EL_QUE_ARRANCA, claveDelModo } from './textos'

export function PresentacionEscenario({
  ficha,
  abierta,
  onCerrar,
  modo,
  pilotoActivo,
  onCloseAutoFocus,
  testid = 'presentacion-escenario',
  testidCerrar,
}: PropsDePresentacion) {
  const { t } = useI18n()
  return (
    <CascaraDePresentacion
      abierta={abierta}
      onCerrar={onCerrar}
      onCloseAutoFocus={onCloseAutoFocus}
      titulo={t(ficha.nombre)}
      descripcion={t(ficha.promesa)}
      tamano="xl"
      tinta
      testid={testid}
      testidCerrar={testidCerrar}
    >
      {/* Radix monta el contenido sólo abierto (y mientras sale): sin `abierta &&`, que lo vaciaría a mitad de la salida. */}
      <Contenido ficha={ficha} onCerrar={onCerrar} modo={modo} pilotoActivo={pilotoActivo} />
    </CascaraDePresentacion>
  )
}

function Contenido({
  ficha,
  onCerrar,
  modo: modoDado,
  pilotoActivo,
}: Pick<PropsDePresentacion, 'ficha' | 'onCerrar' | 'modo' | 'pilotoActivo'>) {
  const { t } = useI18n()
  const estado = useDespertar()
  const modo = modoDado ?? MODO_CON_EL_QUE_ARRANCA
  const nombreDelModo = ficha.modo.gobierna ? t(claveDelModo(modo)) : t(CLAVES_COMUNES.aPedido)
  const luz = luzDelAgente(ficha)

  return (
    <div className="relative isolate" data-agente={ficha.id}>
      <FondoDeMarca luz={luz} centro="50% 140px" barrido />

      {/* ── El escenario: el orbe ── */}
      <div className="flex flex-col items-center px-6 pt-14 sm:px-10 sm:pt-5">
        <p className="absolute left-6 top-6 z-[1] inline-flex items-center gap-2 rounded-full sm:left-8 border border-border bg-[color-mix(in_srgb,var(--fg)_4%,transparent)] px-3 py-1 font-mono text-label uppercase tracking-[0.08em] text-fg-muted">
          <PuntoQueLate color={luz} />
          {t(CLAVES_COMUNES.modo)}
          <span aria-hidden="true" className="text-fg-subtle">·</span>
          {nombreDelModo}
        </p>
        <OrbeQueDespierta ficha={ficha} tamano={108} estado={estado} className="-my-3 max-sm:hidden" />
        <OrbeQueDespierta ficha={ficha} tamano={100} estado={estado} className="-my-3 sm:hidden" />
      </div>

      {/* ── Quién es ── */}
      <Stagger className="flex flex-col items-center px-6 text-center sm:px-10" delay={0.18} layout={false}>
        <StaggerItem key="rol">
          <Rotulo>{t(ficha.rol)}</Rotulo>
        </StaggerItem>
        <StaggerItem key="nombre">
          <p aria-hidden="true" className="mt-1.5 font-display text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-fg sm:text-[32px] sm:leading-[38px]">
            {t(ficha.nombre)}
          </p>
        </StaggerItem>
        <StaggerItem key="promesa">
          <p aria-hidden="true" className="mt-2 max-w-[56ch] text-body text-fg-muted [text-wrap:balance]">
            {t(ficha.promesa)}
          </p>
        </StaggerItem>
      </Stagger>

      {/* ── Lo que hace por ti: tres losetas ── */}
      <section className="px-6 pt-5 sm:px-10" aria-labelledby={`escenario-hace-${ficha.id}`}>
        <Rotulo className="text-center">
          <span id={`escenario-hace-${ficha.id}`}>{t(CLAVES_COMUNES.loQueHace)}</span>
        </Rotulo>
        <Stagger as="ul" className="mt-2.5 grid gap-3 sm:grid-cols-3" delay={0.32} layout={false}>
          {ficha.capacidades.map((c) => {
            const Icono = c.icono
            return (
              <StaggerItem
                as="li"
                key={c.titulo}
                className="rounded-lg border border-border bg-[color-mix(in_srgb,var(--fg)_3%,transparent)] px-4 py-3"
              >
                <p className="flex items-center gap-2.5 text-body-sm font-semibold text-fg">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-border"
                    style={{ color: luz, background: `color-mix(in srgb, ${luz} 14%, transparent)` }}
                  >
                    <Icono className="size-4" weight="duotone" aria-hidden="true" />
                  </span>
                  {t(c.titulo)}
                </p>
                <p className="mt-1.5 text-caption text-fg-muted">{t(c.texto)}</p>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>

      {/* ── Lo que necesita de ti · el modo ── */}
      <div className="grid gap-6 px-6 pb-5 pt-5 sm:grid-cols-2 sm:gap-10 sm:px-10">
        <section aria-labelledby={`escenario-necesita-${ficha.id}`}>
          <Rotulo>
            <span id={`escenario-necesita-${ficha.id}`}>{t(CLAVES_COMUNES.loQueNecesita)}</span>
          </Rotulo>
          <Stagger as="ul" className="mt-2.5 space-y-1.5" delay={0.45} layout={false}>
            {ficha.necesita.map((n) => {
              const Icono = n.icono
              return (
                <StaggerItem as="li" key={n.texto} className="flex items-start gap-2.5 text-caption text-fg">
                  <Icono className="mt-px size-4 shrink-0 text-fg-subtle" weight="bold" aria-hidden="true" />
                  {t(n.texto)}
                </StaggerItem>
              )
            })}
          </Stagger>
        </section>
        <section aria-label={t(CLAVES_COMUNES.modo)}>
          {/* El modo ya está en la píldora de arriba: aquí, lo que significa. */}
          <Rotulo>
            {t(CLAVES_COMUNES.modo)} · {nombreDelModo}
          </Rotulo>
          <BloqueDelModo ficha={ficha} modo={modo} pilotoActivo={pilotoActivo} className="mt-2.5" />
        </section>
      </div>

      {/* ── Las salidas ── */}
      {/* Pegado abajo del cuerpo que scrollea: en la hoja del celular el llamado siempre se ve. */}
      <div
        className={cn(
          'sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-border bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10',
          'max-sm:pb-[max(16px,env(safe-area-inset-bottom))]',
        )}
      >
        <ComoFuncionaDelAgente ficha={ficha} className="sm:-ml-3" />
        <Button onClick={() => onCerrar('completo')} className="max-sm:w-full" data-testid="presentacion-empezar">
          {t(ficha.empezar)}
        </Button>
      </div>
    </div>
  )
}
