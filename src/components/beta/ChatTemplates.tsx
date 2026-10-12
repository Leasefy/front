'use client';

import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase, motionStagger } from '@leasefy/cadence';
import {
  ArrowUpRight,
  CurrencyDollar,
  Buildings,
  FileText,
  Wrench,
  UsersThree,
  ChartBar,
  Coins,
  Handshake,
  CalendarCheck,
  ListNumbers,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { AuthContext } from '@/lib/auth/auth-context';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';

// ============================================================================
// Catálogo
// ============================================================================

/**
 * Las acciones que vivían como las seis tarjetas del estado-0.
 *
 * Se mudaron acá por decisión de producto (Nico, 2026-08-27): las tarjetas
 * ocupaban el lugar donde ahora va el historial de conversaciones, y el botón
 * «Plantillas» —que existía dibujado desde el mockup de Cadence y nunca hizo
 * nada— pasa a ser su casa. Vivir en un menú además las hace alcanzables
 * DENTRO de una conversación, que era lo imposible: una vez que escribías,
 * las tarjetas desaparecían y no había forma de volver a ellas.
 */
export interface ChatTemplate {
  id: string;
  titleKey: string;
  descKey: string;
  icon: Icon;
}

/**
 * Icono de dominio, no monograma de colores.
 *
 * Iban con una baldosa en degradado y la inicial del título (Nico,
 * 2026-08-27: «eso azul con una M y una C tampoco es que me gusten, se ve
 * feo»). Tenía dos problemas de fondo: la inicial no informa —«Cobros» y
 * «Candidatos» y «Contratos» daban todas «C»— y seis degradados saturados
 * apilados en una lista compiten con el texto, que es lo que hay que leer.
 * Los iconos son los MISMOS que `AgentBadge` ya usa por dominio, así que el
 * mismo tema se ve igual en toda la app.
 */
export const CHAT_TEMPLATES: ChatTemplate[] = [
  { id: 'cobros',        titleKey: 'beta.welcome.prompts.cobros',        descKey: 'beta.welcome.prompts.cobros_desc',        icon: CurrencyDollar },
  { id: 'propiedades',   titleKey: 'beta.welcome.prompts.propiedades',   descKey: 'beta.welcome.prompts.propiedades_desc',   icon: Buildings },
  { id: 'contratos',     titleKey: 'beta.welcome.prompts.contratos',     descKey: 'beta.welcome.prompts.contratos_desc',     icon: FileText },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', icon: Wrench },
  { id: 'candidatos',    titleKey: 'beta.welcome.prompts.candidatos',    descKey: 'beta.welcome.prompts.candidatos_desc',    icon: UsersThree },
  { id: 'reportes',      titleKey: 'beta.welcome.prompts.reportes',      descKey: 'beta.welcome.prompts.reportes_desc',      icon: ChartBar },
];

/**
 * 🔴 CF-01 (decisión 12 de Nico, 05-10-2026): el auxiliar de cartera tiene
 * chat, SÓLO de cartera. Sus preguntas predeterminadas son de cartera y cada
 * una tiene su consulta fija en el micro (`ai-hub/en-el-chat/chat-del-auxiliar.ts`):
 * ofrecerle «Resume el estado de mis propiedades» sería ofrecerle un «no te
 * corresponde».
 */
export const CHAT_TEMPLATES_DEL_AUXILIAR: ChatTemplate[] = [
  { id: 'no_han_pagado', titleKey: 'beta.welcome.promptsAuxiliar.noHanPagado', descKey: 'beta.welcome.promptsAuxiliar.noHanPagado_desc', icon: CurrencyDollar },
  { id: 'me_deben',      titleKey: 'beta.welcome.promptsAuxiliar.meDeben',     descKey: 'beta.welcome.promptsAuxiliar.meDeben_desc',     icon: Coins },
  { id: 'mas_deben',     titleKey: 'beta.welcome.promptsAuxiliar.masDeben',    descKey: 'beta.welcome.promptsAuxiliar.masDeben_desc',    icon: ListNumbers },
  { id: 'acuerdos',      titleKey: 'beta.welcome.promptsAuxiliar.acuerdos',    descKey: 'beta.welcome.promptsAuxiliar.acuerdos_desc',    icon: Handshake },
  { id: 'promesas',      titleKey: 'beta.welcome.promptsAuxiliar.promesas',    descKey: 'beta.welcome.promptsAuxiliar.promesas_desc',    icon: CalendarCheck },
];

/** ¿Quien mira es el auxiliar de cartera? (su chat es sólo de cartera). */
export function esAuxiliarDeCartera(rol: string | null | undefined): boolean {
  return rol === AGENCY_ROLES.AUXILIAR_CARTERA;
}

/** Las preguntas predeterminadas que le sirven a ese rol. */
export function plantillasDelRol(rol: string | null | undefined): ChatTemplate[] {
  return esAuxiliarDeCartera(rol) ? CHAT_TEMPLATES_DEL_AUXILIAR : CHAT_TEMPLATES;
}

// ============================================================================
// Menú
// ============================================================================

/** Hasta dónde llegan, desde arriba, los elementos fijos o pegados que tapan la ventana. */
function bordeDeArriba(): number {
  let borde = 0;
  for (const el of document.querySelectorAll<HTMLElement>('header, [data-tapa-arriba]')) {
    const posicion = getComputedStyle(el).position;
    if (posicion !== 'fixed' && posicion !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight / 3 && r.bottom > borde) borde = r.bottom;
  }
  return borde;
}

interface ChatTemplatesMenuProps {
  open: boolean;
  onClose: () => void;
  /** Se llama con el TEXTO del prompt (la descripción), que es lo que se envía. */
  onSelect: (prompt: string) => void;
  /** `up` abre hacia arriba — para la barra de la conversación activa. */
  direction?: 'down' | 'up';
  /**
   * Otras opciones en vez de las plantillas del panel (el marketplace público
   * usa el MISMO menú con búsquedas de ejemplo). `texto` es lo que se envía.
   */
  opciones?: readonly { id: string; titulo: string; texto: string; icono: Icon }[];
  /** El título del menú cuando trae otras opciones. */
  titulo?: string;
  className?: string;
}


/**
 * Menú accionable de plantillas.
 *
 * Sale DESDE su botón (Nico, 02-10-2026: «más lindo y pegado a su botón; hoy
 * sale corrido, debajo de la bandeja y lejos de Plantillas»): se ancla al
 * contenedor `relative` que envuelve al botón —en la llegada y en la barra de
 * la conversación— y abre hacia abajo o hacia arriba según el hueco que haya.
 * Entra con un fundido corto que crece desde el borde del botón.
 *
 * Se cierra con Escape, con un clic afuera y al elegir. Un clic en el propio
 * botón NO cuenta como «afuera»: antes el `mousedown` lo cerraba y el `click`
 * del mismo botón lo volvía a abrir.
 */
/** «Hasta $2,5 millones» y «hasta 2.5 millones» dicen lo mismo: sólo letras y números, sin mayúsculas. */
function mismoTexto(a: string, b: string): boolean {
  const limpio = (x: string) => x.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}]/gu, '');
  return limpio(a) === limpio(b);
}

export function ChatTemplatesMenu({
  open,
  onClose,
  onSelect,
  direction = 'down',
  opciones,
  titulo,
  className,
}: ChatTemplatesMenuProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  // `AuthContext` directo (no `useAuth`): fuera del proveedor, las de siempre.
  const delRol = plantillasDelRol(useContext(AuthContext)?.agencyRole);
  const plantillas = opciones
    ? opciones.map((o) => ({ id: o.id, title: o.titulo, desc: o.texto, icon: o.icono }))
    : delRol.map((tpl) => ({ id: tpl.id, title: t(tpl.titleKey), desc: t(tpl.descKey), icon: tpl.icon }));
  const tituloDelMenu = titulo ?? t('beta.templates.title');

  /**
   * Alto y dirección medidos contra la ventana, no fijos (Nico, 2026-08-27:
   * «acá se sale de la altura y eso se ve feo»). Si abajo no cabe pero arriba
   * sí, se abre hacia arriba; en cualquier caso el alto se recorta a lo que
   * hay y el resto se desplaza adentro.
   */
  const [caja, setCaja] = useState<{ dir: 'down' | 'up'; maxH: number }>({
    dir: direction,
    maxH: 420,
  });

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    const medir = () => {
      const anclaje = ref.current?.parentElement;
      if (!anclaje) return;
      const r = anclaje.getBoundingClientRect();
      const MARGEN = 16;
      const abajo = window.innerHeight - r.bottom - MARGEN;
      // Lo que tapa arriba (el header fijo, una barra pegada) no es espacio: el
      // menú quedaba debajo de «Conversación · Galería» (Nico, 09-10-2026).
      const arriba = r.top - bordeDeArriba() - MARGEN;

      // Se conserva la dirección pedida salvo que del otro lado quepa
      // claramente más: cambiar de lado desorienta.
      const preferida = direction;
      const espacioPreferido = preferida === 'down' ? abajo : arriba;
      const espacioOpuesto = preferida === 'down' ? arriba : abajo;
      const cambia = espacioPreferido < 260 && espacioOpuesto > espacioPreferido;
      const dir = cambia ? (preferida === 'down' ? 'up' : 'down') : preferida;

      const disponible = dir === 'down' ? abajo : arriba;
      setCaja({ dir, maxH: Math.max(180, Math.min(420, disponible)) });
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [open, direction]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      // El anclaje (el botón y el menú) no es «afuera».
      const anclaje = ref.current?.parentElement;
      if (anclaje && anclaje.contains(e.target as Node)) return;
      onClose();
    };

    document.addEventListener('keydown', onKey);
    // `mousedown` y no `click`: con `click` el mismo evento que abre el menú
    // lo cerraría en el mismo tick.
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose]);

  const abajo = caja.dir === 'down';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="menu"
          aria-label={tituloDelMenu}
          data-testid="menu-de-plantillas"
          initial={{ opacity: 0, y: abajo ? -6 : 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: abajo ? -4 : 4, scale: 0.98, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
          transition={{ duration: motionDuration.base, ease: motionEase.enter }}
          style={{ transformOrigin: abajo ? 'top left' : 'bottom left' }}
          className={cn(
            // Ancho: el botón arranca ~2,25rem adentro de la pantalla (margen
            // de la página + marco + caja): con 100vw-2rem el menú se salía por
            // la derecha en el celular (390, 02-10).
            'absolute left-0 z-50 w-[min(400px,calc(100vw-4.5rem))]',
            abajo ? 'top-full mt-2' : 'bottom-full mb-2',
            'overflow-hidden rounded-[20px] border border-border bg-surface p-1.5',
            'shadow-[0_18px_48px_-12px_rgba(20,19,15,0.22)] dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.85)]',
            className
          )}
        >
          <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
              {tituloDelMenu}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{plantillas.length}</span>
          </div>

          <div
            className="overflow-y-auto overscroll-contain"
            data-lenis-prevent
            style={{ maxHeight: Math.max(140, caja.maxH - 44) }}
          >
            {plantillas.map((tpl, i) => {
              const { title, desc } = tpl;
              const TplIcon = tpl.icon;
              return (
                <motion.button
                  key={tpl.id}
                  type="button"
                  role="menuitem"
                  initial={{ opacity: 0, y: abajo ? -4 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDuration.base, ease: motionEase.enter, delay: Math.min(i * motionStagger.step, motionStagger.max) }}
                  onClick={() => {
                    onSelect(desc);
                    onClose();
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left',
                    'transition-colors duration-fast hover:bg-surface-hover focus-visible:bg-surface-hover'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      'bg-surface-muted text-fg-muted transition-colors duration-fast',
                      'group-hover:bg-primary-soft group-hover:text-primary'
                    )}
                  >
                    <TplIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[13.5px] font-medium text-fg">{title}</span>
                    {/* Si lo que se envía es el mismo título, no se repite debajo
                        («Que tenga balcón / que tenga balcón»; QA del marketplace, 10-10-2026). */}
                    {mismoTexto(title, desc) ? null : (
                      <span className="block truncate font-body text-[12.5px] leading-snug text-fg-muted">{desc}</span>
                    )}
                  </span>
                  <ArrowUpRight
                    size={14}
                    aria-hidden
                    className="shrink-0 text-fg-subtle opacity-0 transition-[opacity,color] duration-fast group-hover:opacity-100 group-hover:text-primary"
                  />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
