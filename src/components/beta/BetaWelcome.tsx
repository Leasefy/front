'use client';

import { useContext, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { motionDuration, motionEase, motionStagger } from '@leasefy/cadence';
import { Buildings } from '@phosphor-icons/react';
import { useMigracion } from '@/components/migracion/migracion-context';
import { migracionSinTerminar, progresoDeMigracion } from '@/components/migracion/muro-reglas';
import { AuthContext } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { CHAT_TEMPLATES, ChatTemplatesMenu } from './ChatTemplates';
import { CajaDeLlegada } from './llegada/CajaDeLlegada';
import { ConversacionesRecientes } from './llegada/ConversacionesRecientes';
import { FranjaDeMigracion } from './llegada/FranjaDeMigracion';
import { migracionEstadoApi } from '@/lib/api/migracion-estado.service';
import { BotonDelEquipo } from '@/components/agentes/BotonDelEquipo';

// ============================================================================
// Types
// ============================================================================

interface BetaWelcomeProps {
  onPromptClick?: (prompt: string) => void;
  /** @deprecated la llegada dibuja su propia caja (`CajaDeLlegada`); se conserva por compatibilidad. */
  inputSlot?: React.ReactNode;
  className?: string;
}

/**
 * Los atajos de la llegada: tres de las plantillas que ya existen (no hay datos
 * de uso para elegir las «más usadas»). Al tocarlos se manda el MISMO texto que
 * manda el menú de plantillas.
 */
export const ATAJOS_DE_LLEGADA = ['cobros', 'contratos', 'propiedades'] as const;

/** Los ejemplos que se escriben solos en la caja: cosas que el chat SÍ contesta o hace. */
const CLAVES_DE_EJEMPLOS = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] as const;

/** La curva de la referencia (`sa-hero`): sale rápido y se posa despacio. */

function entrada(paso: number) {
  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDuration.slow, ease: motionEase.enter, delay: Math.min(paso * motionStagger.step, motionStagger.max) },
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * BetaWelcome — la llegada del chat (estado 0).
 *
 * Rediseño del 02-10-2026 (Nico: «quiero así de hermoso el chat y pensado
 * claramente para Leasefy, con esas animaciones top»), con el lenguaje visual
 * de la llegada del sistema de diseño de SaleAds y nada de su marca:
 * título grande con tracking cerrado + línea de apoyo, la caja en un marco con
 * aro de luz al enfocarla (`CajaDeLlegada`), un ejemplo real que se escribe
 * solo, la bandeja de estado, tres atajos y una línea sobre los especialistas.
 *
 * Lo que se conserva tal cual: enviar (`onPromptClick` → `sendMessage`) y el
 * menú «Plantillas», que ahora sale desde su botón.
 *
 * Segunda vuelta de Nico (02-10-2026): «Conversaciones recientes» ya no va
 * abajo. Sin conversaciones no se muestra nada; con conversaciones queda un
 * acceso en la bandeja que abre la lista dentro del chat (abrir y borrar como
 * antes). La bandeja ya no lleva las cifras del briefing.
 *
 * Regla de la casa: nada de números inventados. La bandeja sólo dice con los
 * datos de qué inmobiliaria responde el chat y cuántas conversaciones hay
 * guardadas; la franja de arriba aparece sólo con la migración a medias.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  const { t } = useI18n();
  const { filteredSummaries, switchConversation, deleteConversation } = useBetaChatContext();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [recientesAbiertas, setRecientesAbiertas] = useState(false);

  const ejemplos = useMemo(() => CLAVES_DE_EJEMPLOS.map((k) => t(`beta.welcome.ejemplos.${k}`)), [t]);

  // ── La bandeja: sólo datos que el panel ya tiene ─────────────────────────
  // `AuthContext` directo (no `useAuth`): fuera del proveedor, sin bandeja.
  // «Agency» es el nombre de relleno de `readAgencyFromStorage` cuando lo
  // guardado no lo trae: no es el nombre de nadie.
  const nombre = useContext(AuthContext)?.agency?.name?.trim() ?? '';
  const agencia = nombre && nombre !== 'Agency' ? nombre : null;
  const migracion = useMigracion();
  const estadoMigracion = migracion?.estado ?? null;
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const progreso =
    estadoMigracion &&
    !estadoMigracion.bloquea &&
    !estadoMigracion.recordatorioDescartado &&
    migracionSinTerminar(estadoMigracion)
      ? progresoDeMigracion(estadoMigracion.pasos)
      : null;
  // Empezada y no terminada: «paso 3 de 6». Sin empezar no se dice nada (eso
  // es decisión de la inmobiliaria, y ya lo recuerda la barra lateral); quien
  // cerró el recordatorio (`recordatorioDescartado`) tampoco lo ve acá.
  const migrando = progreso && progreso.total > 0 && progreso.hechos > 0 ? progreso : null;

  // La ✕ de la franja usa el MISMO «descartado» del recordatorio de la
  // migración: es de la cuenta (`POST /inmobiliaria/migracion/recordatorio`),
  // no del navegador, así que no reaparece en otro equipo. Se oculta al
  // instante; si el back no lo guarda, vuelve a salir en la próxima visita
  // (molesta, no encierra).
  const cerrarAviso = () => {
    setAvisoCerrado(true);
    void migracionEstadoApi
      .recordatorio(true)
      .then(() => migracion?.recargar())
      .catch(() => {});
  };
  const aviso =
    migrando && migracion && !avisoCerrado ? (
      <FranjaDeMigracion
        paso={Math.min(migrando.hechos + 1, migrando.total)}
        total={migrando.total}
        siguiente={migrando.siguiente ? t(`migracion.pasos.${migrando.siguiente.id}.corto`) : null}
        // Abre la migración a pantalla completa (no navega): la única salida
        // del chat que hay acá, autorizada por Nico el 02-10-2026.
        onContinuar={migracion.abrir}
        onCerrar={cerrarAviso}
      />
    ) : null;

  // Sólo las que tienen algo adentro: la conversación vacía recién creada es
  // justamente esta pantalla, listarla sería ofrecerle volver a donde está.
  const historial = filteredSummaries.filter((c) => c.messageCount > 0).slice(0, 8);

  // La bandeja (Nico, 02-10, segunda vuelta): el acceso a las conversaciones
  // (si hay) y con los datos de qué inmobiliaria responde. Las cifras del
  // briefing se quitaron: «337 decisiones pendientes» ahí no ayudaba.
  const bandeja =
    agencia || historial.length > 0 ? (
      <div
        data-testid="bandeja-de-llegada"
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-fg-muted"
      >
        <ConversacionesRecientes
          historial={historial}
          onAbrir={switchConversation}
          onBorrar={deleteConversation}
          onAbierto={setRecientesAbiertas}
        />
        {agencia && (
          <span className="inline-flex min-w-0 items-center gap-2">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-fg-muted">
              <Buildings size={13} />
            </span>
            {/* Sin truncar: en el celular el nombre se partía en «Inmobiliaria Po…». */}
            <span className="min-w-0">
              {t('beta.welcome.bandeja.datosDe')} <strong className="font-medium text-fg">{agencia}</strong>
            </span>
          </span>
        )}
      </div>
    ) : null;

  const atajos = ATAJOS_DE_LLEGADA.map((id) => CHAT_TEMPLATES.find((tpl) => tpl.id === id)).filter(
    (tpl): tpl is (typeof CHAT_TEMPLATES)[number] => Boolean(tpl)
  );

  return (
    // Movimiento reducido: lo resuelve `MotionProvider reducedMotion="user"`
    // del layout raíz (framer apaga los desplazamientos y deja el fundido).
    // `llegada-grises`: en oscuro, grises neutros en vez de los cálidos de
    // Cadence (Nico, 02-10: «unos grises como amarillos súper feos»).
      <div
        className={cn(
          'llegada-grises flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16',
          className
        )}
      >
        <div className="flex w-full max-w-[800px] flex-col items-center">
          {/* Título + apoyo */}
          <motion.h1
            {...entrada(0)}
            className="text-center font-heading font-semibold leading-[1.02] tracking-[-0.04em] text-fg text-[clamp(2.1rem,6vw,3.75rem)] [text-wrap:balance]"
          >
            {t('beta.welcome.heroTitle')}
          </motion.h1>
          <motion.p
            {...entrada(1)}
            className="mt-4 max-w-[560px] text-center text-[16px] leading-[1.5] text-fg-muted sm:text-[17px] [text-wrap:balance]"
          >
            {t('beta.welcome.heroSubtitle')}
          </motion.p>

          {/* La caja — `z-10`: el menú y el panel de conversaciones pasan por encima de los atajos */}
          <motion.div {...entrada(2)} className="relative z-10 mt-9 w-full sm:mt-10">
            <CajaDeLlegada
              onEnviar={(texto) => onPromptClick?.(texto)}
              onPlantillas={() => setTemplatesOpen((v) => !v)}
              plantillasAbiertas={templatesOpen}
              menuDePlantillas={
                <ChatTemplatesMenu
                  open={templatesOpen}
                  onClose={() => setTemplatesOpen(false)}
                  onSelect={(prompt) => onPromptClick?.(prompt)}
                />
              }
              ejemplos={ejemplos}
              bandeja={bandeja}
              bandejaElevada={recientesAbiertas}
              aviso={aviso}
            />
          </motion.div>

          {/* Atajos */}
          <motion.ul
            aria-label={t('beta.welcome.atajosLabel')}
            initial="oculto"
            animate="visible"
            variants={{ visible: { transition: { delayChildren: 0.2, staggerChildren: 0.05 } } }}
            className="mt-6 flex flex-wrap justify-center gap-2.5"
          >
            {atajos.map((tpl) => {
              const Icono = tpl.icon;
              const texto = t(tpl.descKey);
              return (
                <motion.li
                  key={tpl.id}
                  variants={{
                    oculto: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: motionDuration.reveal, ease: motionEase.enter } },
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onPromptClick?.(texto)}
                    title={texto}
                    data-testid={`atajo-${tpl.id}`}
                    className={cn(
                      'group inline-flex h-11 items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1.5 pr-4',
                      'text-[14px] font-medium text-fg',
                      'transition-[transform,border-color,box-shadow] duration-base ease-enter',
                      'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98]',
                      'motion-reduce:hover:translate-y-0'
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-fg-muted transition-colors duration-base group-hover:bg-primary-soft group-hover:text-primary"
                    >
                      <Icono size={15} />
                    </span>
                    {t(tpl.titleKey)}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Quiénes trabajan detrás: los orbes del equipo abren «El equipo»
              (02-10, commit `27a3b2b8`). La frase es verdad: el chat llama a
              sus especialistas según lo que se pida. */}
          <motion.div
            {...entrada(5)}
            className="mt-6 flex max-w-[760px] flex-col items-center justify-center gap-2.5 text-center text-[13px] leading-snug text-fg-subtle sm:flex-row sm:gap-3"
            data-testid="fila-del-equipo"
          >
            <BotonDelEquipo className="shrink-0" />
            <span>{t('beta.welcome.especialistas')}</span>
          </motion.div>
        </div>
      </div>
  );
}
