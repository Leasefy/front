'use client';

import { useContext, useMemo, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowsLeftRight,
  Bank,
  Buildings,
  ChartBar,
  ChatsCircle,
  Check,
  CurrencyDollar,
  Trash,
  X,
} from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';
import { toast } from '@/components/ui';
import { EmptyState } from '@/components/ui/empty-state';
import { useMigracion } from '@/components/migracion/migracion-context';
import { migracionSinTerminar, progresoDeMigracion } from '@/components/migracion/muro-reglas';
import { AuthContext } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { LeasefyMark } from './LeasefyMark';
import { CHAT_TEMPLATES, ChatTemplatesMenu } from './ChatTemplates';
import { CajaDeLlegada } from './llegada/CajaDeLlegada';

// ============================================================================
// Types
// ============================================================================

interface BetaWelcomeProps {
  onPromptClick?: (prompt: string) => void;
  /** @deprecated la llegada dibuja su propia caja (`CajaDeLlegada`); se conserva por compatibilidad. */
  inputSlot?: React.ReactNode;
  className?: string;
}

/** «hace 3 h», «ayer», «12 ago» — sin traer una librería de fechas. */
function haceCuanto(fecha: Date, ahora: Date): string {
  const min = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/**
 * Los atajos de la llegada: tres de las plantillas que ya existen (no hay datos
 * de uso para elegir las «más usadas»). Al tocarlos se manda el MISMO texto que
 * manda el menú de plantillas.
 */
export const ATAJOS_DE_LLEGADA = ['cobros', 'contratos', 'propiedades'] as const;

/** Los ejemplos que se escriben solos en la caja: cosas que el chat SÍ contesta o hace. */
const CLAVES_DE_EJEMPLOS = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] as const;

/**
 * Especialistas del chat que se nombran en la línea de abajo. Salen de los que
 * el micro despacha desde el chat (`BackendDispatchAgent` en
 * `lib/api/ai-hub-chat.ts`; el orquestador tiene más —por eso «y más»—).
 */
const ESPECIALISTAS = [
  { id: 'reportes', Icono: ChartBar },
  { id: 'cobranza', Icono: CurrencyDollar },
  { id: 'pagos', Icono: Bank },
  { id: 'conciliacion', Icono: ArrowsLeftRight },
] as const;

/** La curva de la referencia (`sa-hero`): sale rápido y se posa despacio. */
const CURVA = [0.22, 1, 0.36, 1] as const;

function entrada(paso: number) {
  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: CURVA, delay: paso * 0.06 },
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
 * Lo que se conserva tal cual: enviar (`onPromptClick` → `sendMessage`), el
 * menú «Plantillas», y el HISTORIAL de conversaciones (Nico, 2026-08-27) con
 * abrir y borrar con confirmación en línea; el vacío sigue llevando a las
 * plantillas.
 *
 * Regla de la casa: nada de números inventados. La bandeja sólo dice el nombre
 * de la inmobiliaria (los datos con los que responde el chat) y, si la
 * migración está a medias, en qué paso va — las dos cosas salen del panel.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  const { t } = useI18n();
  const { filteredSummaries, switchConversation, deleteConversation } = useBetaChatContext();
  const [borrando, setBorrando] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const ahora = new Date();

  const ejemplos = useMemo(() => CLAVES_DE_EJEMPLOS.map((k) => t(`beta.welcome.ejemplos.${k}`)), [t]);

  // ── La bandeja: sólo datos que el panel ya tiene ─────────────────────────
  // `AuthContext` directo (no `useAuth`): fuera del proveedor, sin bandeja.
  // «Agency» es el nombre de relleno de `readAgencyFromStorage` cuando lo
  // guardado no lo trae: no es el nombre de nadie.
  const nombre = useContext(AuthContext)?.agency?.name?.trim() ?? '';
  const agencia = nombre && nombre !== 'Agency' ? nombre : null;
  const estadoMigracion = useMigracion()?.estado ?? null;
  const progreso =
    estadoMigracion &&
    !estadoMigracion.bloquea &&
    !estadoMigracion.recordatorioDescartado &&
    migracionSinTerminar(estadoMigracion)
      ? progresoDeMigracion(estadoMigracion.pasos)
      : null;
  // Empezada y no terminada: «paso 3 de 6». Sin empezar no se dice nada (eso
  // es decisión de la inmobiliaria, y ya lo recuerda la barra lateral); quien
  // cerró ese recordatorio (`recordatorioDescartado`) tampoco lo ve acá.
  const migrando = progreso && progreso.total > 0 && progreso.hechos > 0 ? progreso : null;

  const bandeja =
    agencia || migrando ? (
      <div
        data-testid="bandeja-de-llegada"
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-fg-muted"
      >
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
        {migrando && (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-fg-muted">
              <ArrowsClockwise size={13} />
            </span>
            {t('beta.welcome.bandeja.migracion', {
              n: Math.min(migrando.hechos + 1, migrando.total),
              total: migrando.total,
            })}
          </span>
        )}
      </div>
    ) : null;

  // Sólo las que tienen algo adentro: la conversación vacía recién creada es
  // justamente esta pantalla, listarla sería ofrecerle volver a donde está.
  const historial = filteredSummaries.filter((c) => c.messageCount > 0).slice(0, 6);

  const atajos = ATAJOS_DE_LLEGADA.map((id) => CHAT_TEMPLATES.find((tpl) => tpl.id === id)).filter(
    (tpl): tpl is (typeof CHAT_TEMPLATES)[number] => Boolean(tpl)
  );

  return (
    // `reducedMotion="user"`: con «reducir movimiento» framer apaga los
    // desplazamientos y deja sólo el fundido (y el marcado del servidor es el
    // mismo en los dos casos).
    <MotionConfig reducedMotion="user">
      <div className={cn('flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16', className)}>
        <div className="flex w-full max-w-[800px] flex-col items-center">
          {/* Título + apoyo */}
          <motion.h1
            {...entrada(0)}
            className="text-center font-heading font-semibold leading-[1.02] tracking-[-0.04em] text-fg text-[clamp(2.4rem,6vw,3.75rem)] [text-wrap:balance]"
          >
            {t('beta.welcome.heroTitle')}
          </motion.h1>
          <motion.p
            {...entrada(1)}
            className="mt-4 max-w-[560px] text-center text-[16px] leading-[1.5] text-fg-muted sm:text-[17px] [text-wrap:balance]"
          >
            {t('beta.welcome.heroSubtitle')}
          </motion.p>

          {/* La caja — el menú de plantillas se ancla a este contenedor */}
          <motion.div {...entrada(2)} className="relative mt-9 w-full sm:mt-10">
            <CajaDeLlegada
              onEnviar={(texto) => onPromptClick?.(texto)}
              onPlantillas={() => setTemplatesOpen((v) => !v)}
              plantillasAbiertas={templatesOpen}
              ejemplos={ejemplos}
              bandeja={bandeja}
            />
            <ChatTemplatesMenu
              open={templatesOpen}
              onClose={() => setTemplatesOpen(false)}
              onSelect={(prompt) => onPromptClick?.(prompt)}
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
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: CURVA } },
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
                      'transition-[transform,border-color,box-shadow] duration-200 ease-out',
                      'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98]',
                      'motion-reduce:hover:translate-y-0'
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-fg-muted transition-colors duration-200 group-hover:bg-primary-soft group-hover:text-primary"
                    >
                      <Icono size={15} />
                    </span>
                    {t(tpl.titleKey)}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Quiénes trabajan detrás */}
          <motion.p
            {...entrada(5)}
            className="mt-6 flex max-w-[760px] flex-col items-center justify-center gap-2 text-center text-[13px] leading-snug text-fg-subtle sm:flex-row sm:gap-3"
          >
            <span aria-hidden className="flex shrink-0 -space-x-2">
              {ESPECIALISTAS.map(({ id, Icono }) => (
                <span
                  key={id}
                  className="flex size-7 items-center justify-center rounded-full bg-surface-muted text-fg-muted ring-2 ring-bg"
                >
                  <Icono size={14} />
                </span>
              ))}
            </span>
            <span>{t('beta.welcome.especialistas')}</span>
          </motion.p>

          {/* Historial de conversaciones */}
          <motion.div {...entrada(6)} className="mt-12 w-full">
            <div className="mb-3.5 flex items-baseline justify-between gap-3 px-1">
              <Eyebrow>{t('beta.welcome.historyLabel')}</Eyebrow>
              <span className="text-[12px] text-fg-subtle">{t('beta.welcome.historyLocal')}</span>
            </div>

            {historial.length === 0 ? (
              <EmptyState
                icon={ChatsCircle}
                title={t('beta.welcome.historyEmptyTitle')}
                description={t('beta.welcome.historyEmpty')}
                action={{ label: t('beta.welcome.historyEmptyCta'), onClick: () => setTemplatesOpen(true) }}
                className="rounded-lg border border-border bg-surface py-9"
              />
            ) : (
              /* Una sola columna, de lado a lado (Nico, 2026-08-27: «que vaya
                 de lado a lado para que no quede tan pequeña»). En dos columnas
                 cada tarjeta quedaba angosta y el preview —que es lo que te dice
                 si es LA conversación que buscabas— se cortaba a media frase. */
              <div className="flex flex-col gap-2.5">
                {historial.map((conv) => {
                  const confirmando = borrando === conv.id;
                  return (
                    /* La tarjeta es un <div> con DOS botones hermanos — abrir y
                       borrar — porque un botón dentro de otro es HTML inválido
                       y el clic en la papelera abriría la conversación. */
                    <div
                      key={conv.id}
                      className={cn(
                        'group relative flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-4 py-3.5',
                        'transition-all duration-200 hover:border-border-strong hover:shadow-[0_6px_20px_-12px_rgba(20,19,15,0.18)] hover:-translate-y-px',
                        confirmando && 'border-border-strong'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => switchConversation(conv.id)}
                        disabled={confirmando}
                        className={cn(
                          'flex min-w-0 flex-1 items-start gap-3 text-left',
                          'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[12px]'
                        )}
                      >
                        {/* La marca en vez de un icono genérico de chat: al
                            pasar el mouse el tile se enciende al azul de marca —
                            el mismo avatar que firma cada respuesta. */}
                        <span
                          aria-hidden
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                            'bg-primary/10 text-primary transition-colors duration-200',
                            'group-hover:bg-[#1A40FF] group-hover:text-white'
                          )}
                        >
                          <LeasefyMark className="w-[18px] h-auto" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate font-body text-[14.5px] font-semibold text-fg">
                              {conv.title}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                              {haceCuanto(conv.updatedAt, ahora)}
                              {' · '}
                              {conv.messageCount} {t(conv.messageCount === 1 ? 'beta.conversations.message' : 'beta.conversations.messages')}
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-1 block font-body text-[13px] leading-snug text-fg-muted">
                            {conv.preview}
                          </span>
                        </span>
                      </button>

                      {/* Borrar (Nico, 2026-08-27). Papelera que aparece al
                          pasar el mouse o con el teclado; confirma EN LÍNEA
                          porque borrar un hilo no se deshace. */}
                      {confirmando ? (
                        <span className="flex shrink-0 items-center gap-1 self-center">
                          <span className="hidden font-body text-[12px] text-fg-muted sm:inline">
                            {t('beta.conversations.confirmDelete')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              deleteConversation(conv.id);
                              setBorrando(null);
                              toast.success(t('beta.conversations.deleted'));
                            }}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-[4px]',
                              'font-body text-[12px] font-medium text-white',
                              'transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                          >
                            <Check size={12} weight="bold" />
                            {t('beta.conversations.deleteConfirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBorrando(null)}
                            aria-label={t('beta.conversation.endCancel')}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 self-center">
                          <button
                            type="button"
                            onClick={() => setBorrando(conv.id)}
                            aria-label={t('beta.conversations.deleteConversation')}
                            title={t('beta.conversations.deleteConversation')}
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle',
                              'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
                              'hover:bg-surface-muted hover:text-danger outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                          >
                            <Trash size={14} />
                          </button>
                          <ArrowRight
                            size={16}
                            aria-hidden
                            className="text-fg-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                          />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
