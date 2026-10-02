'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Cards, Microphone, Stop, WarningCircle, X } from '@phosphor-icons/react';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { relojDeVoz, useDictadoPorVoz, useNivelDelMicrofono } from '../dictado-por-voz';
import { useEjemploQueSeEscribe } from './use-ejemplo-que-se-escribe';

/**
 * CajaDeLlegada — la caja grande de la llegada del chat (Nico, 02-10-2026:
 * «quiero así de hermoso el chat», con la llegada del sistema de diseño de
 * SaleAds como referencia del lenguaje visual, no de la marca).
 *
 * Anatomía, de afuera hacia adentro:
 * - **Marco** (`.llegada-marco`, 40px): el halo suave alrededor. En oscuro va
 *   apenas más claro que el fondo, no un gris pesado.
 * - **Aro + resplandor** (`.llegada-aro` / `.llegada-halo`, en `globals.css`):
 *   un arco de color que da la vuelta al borde mientras la caja está
 *   enfocada. Es la única excepción decorativa al «sin gradientes en el
 *   chat»: vive en el borde, nunca detrás de un texto que haya que leer.
 * - **Caja** (`bg-surface`, 30px): adentro, un lavado iridiscente MUY suave
 *   (`.llegada-lavado`) que también se enciende con el foco.
 * - **Voz** (`.llegada-voz`): mientras se dicta, un resplandor que sube desde
 *   el borde de abajo y respira con el micrófono (el `<voice-beam>` de la
 *   referencia), y la barra de abajo cambia a «Te escucho · español» con el
 *   reloj, el micrófono que late, «Cancelar» y «Listo».
 * - **Enviar**: un aro metálico que gira despacio alrededor del botón y se
 *   enciende al tener texto (el `<metal-ring>` de la referencia), y el botón
 *   «despierta» (.94 → 1.06 → 1).
 * - **Bandeja** (opcional): la franja de estado que asoma debajo del marco.
 * - **Aviso** (opcional): la franja de arriba, dentro de la caja.
 *
 * Qué NO tiene, a propósito: «+» (el chat no recibe adjuntos) ni selector de
 * modelo, ni «Pausa» en la voz (el dictado del navegador no se puede pausar:
 * sería un botón que finge). «Voz» sólo donde el navegador sabe dictar.
 */

interface CajaDeLlegadaProps {
  onEnviar: (texto: string) => void;
  /** Abre o cierra el menú de plantillas. */
  onPlantillas: () => void;
  plantillasAbiertas: boolean;
  /** El menú de plantillas: se ancla AL BOTÓN «Plantillas». */
  menuDePlantillas?: ReactNode;
  /** Ejemplos reales de lo que el chat sabe hacer; se escriben solos. */
  ejemplos: readonly string[];
  /** La franja de estado debajo del marco. `null` = sin bandeja. */
  bandeja?: ReactNode;
  /** Sube la bandeja de capa (su panel abre hacia arriba sin quedar tapado). */
  bandejaElevada?: boolean;
  /**
   * La franja de aviso arriba, DENTRO de la caja (`FranjaDeMigracion`).
   * `null` = sin aviso; al pasar a `null` sale con su animación.
   */
  aviso?: ReactNode;
  /**
   * La versión de la conversación (Nico, 02-10: «el compositor de abajo con
   * el MISMO lenguaje»): marco y caja más bajos, una línea de texto y botones
   * de 36 px. Misma familia: marco, aro de foco, Plantillas, Voz y Enviar.
   */
  compacta?: boolean;
  /** Hay un turno corriendo: se puede escribir, pero todavía no enviar. */
  ocupado?: boolean;
  /** Lo que va pegado ARRIBA dentro de la caja (el avance del turno). */
  encima?: ReactNode;
  /** El texto fijo cuando no hay ejemplos que se escriben solos. */
  placeholder?: string;
  className?: string;
}

const ALTO_MAXIMO = 200;
const CURVA = [0.22, 1, 0.36, 1] as const;

export function CajaDeLlegada({
  onEnviar,
  onPlantillas,
  plantillasAbiertas,
  menuDePlantillas,
  ejemplos,
  bandeja,
  bandejaElevada = false,
  aviso,
  compacta = false,
  ocupado = false,
  encima,
  placeholder,
  className,
}: CajaDeLlegadaProps) {
  const { t } = useI18n();
  const reducido = useReducedMotion() ?? false;
  const [valor, setValor] = useState('');
  const [enfocada, setEnfocada] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const idCampo = useId();
  const idAyuda = useId();

  const dictado = useDictadoPorVoz(valor, setValor);
  useNivelDelMicrofono(cajaRef, dictado.escuchando, reducido);
  const hayTexto = valor.trim().length > 0;
  const puedeEnviar = hayTexto && !dictado.escuchando && !ocupado;
  const encendida = enfocada || hayTexto;
  // Sin la franja de arriba la caja se veía chica (Nico, 02-10): más aire.
  const altoMinimo = compacta ? 'min-h-[28px]' : aviso ? 'min-h-[56px]' : 'min-h-[92px]';
  const boton = compacta ? 'h-9' : 'h-10';
  const redondo = compacta ? 'size-9' : 'size-10';

  // Sin ejemplos (la conversación), el texto fijo hace de ejemplo quieto.
  const conEjemplos = ejemplos.length > 0;
  const ejemplo = useEjemploQueSeEscribe(conEjemplos ? ejemplos : [placeholder ?? ''], {
    activo: conEjemplos && !enfocada && !hayTexto && !dictado.escuchando,
    reducido,
  });

  // Alto que sigue al texto, hasta ~7 líneas; después, scroll adentro.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, ALTO_MAXIMO)}px`;
  }, [valor, dictado.escuchando]);

  // Al terminar de dictar, el foco vuelve a la caja para revisar y enviar.
  const escuchabaRef = useRef(false);
  useEffect(() => {
    if (escuchabaRef.current && !dictado.escuchando) areaRef.current?.focus();
    escuchabaRef.current = dictado.escuchando;
  }, [dictado.escuchando]);

  const enviar = useCallback(() => {
    const texto = valor.trim();
    if (!texto || dictado.escuchando || ocupado) return;
    onEnviar(texto);
    setValor('');
  }, [valor, dictado.escuchando, ocupado, onEnviar]);

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Con un IME (tildes compuestas, teclados asiáticos) Enter confirma la
    // letra, no el mensaje.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Marco */}
      <div
        className={cn(
          'llegada-marco relative z-[2]',
          compacta ? 'rounded-[32px] p-1.5' : 'rounded-[40px] p-2 sm:p-2.5'
        )}
      >
        {/* `data-enfocada` prende el aro (es el indicador de foco: tiene que
            verse con teclado); `data-encendida` prende el lavado de adentro y
            `data-escuchando` el resplandor de la voz. */}
        <div
          className={cn('llegada-caja relative', compacta ? 'rounded-[26px]' : 'rounded-[30px]')}
          data-compacta={compacta ? 'true' : 'false'}
          data-encendida={encendida ? 'true' : 'false'}
          data-enfocada={enfocada ? 'true' : 'false'}
          data-escuchando={dictado.escuchando ? 'true' : 'false'}
        >
          <span aria-hidden className="llegada-halo">
            <span className="llegada-giro" />
          </span>
          <span aria-hidden className="llegada-aro">
            <span className="llegada-giro" />
          </span>

          {/* Caja — sin `overflow-hidden`: el menú de plantillas sale de su
              botón y tiene que poder salirse de la caja. Lo que sí se recorta
              (lavado, voz) se recorta solo, con el radio heredado. */}
          <div
            ref={cajaRef}
            className={cn(
              'relative z-[1] border bg-surface',
              compacta ? 'rounded-[26px]' : 'rounded-[30px]',
              'shadow-[0_12px_40px_-18px_rgba(20,19,15,0.18)] dark:shadow-[0_12px_40px_-18px_rgba(0,0,0,0.7)]',
              'transition-[border-color,box-shadow] duration-500',
              encendida || dictado.escuchando ? 'border-border-faint' : 'border-border'
            )}
          >
            <span aria-hidden className="llegada-lavado">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span aria-hidden className="llegada-voz">
              <i />
              <i />
              <i />
              <i />
              <i />
              <b />
            </span>

            <AnimatePresence initial={false}>{aviso ? <div key="aviso">{aviso}</div> : null}</AnimatePresence>
            {/* Lo de arriba (el avance del turno) se recorta con el radio de la
                caja: su fondo al pasar el cursor no se sale por las esquinas. */}
            {encima ? (
              <div className={cn('relative overflow-hidden', compacta ? 'rounded-t-[26px]' : 'rounded-t-[30px]')}>
                {encima}
              </div>
            ) : null}

            <div
              className={cn(
                'relative px-4 sm:px-5',
                compacta ? 'pb-2.5 pt-3.5' : aviso ? 'pb-3 pt-4 sm:pt-5' : 'pb-3 pt-5 sm:pt-6'
              )}
            >
              <label htmlFor={idCampo} className="sr-only">
                {t('beta.welcome.inputLabel')}
              </label>
              <span id={idAyuda} className="sr-only">
                {t('beta.welcome.inputHint')}
              </span>

              <AnimatePresence mode="wait" initial={false}>
                {dictado.escuchando ? (
                  /* ── Escuchando (la referencia: `sa-in` .25 s) ── */
                  <motion.div
                    key="voz"
                    data-testid="voz-escuchando"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.25, ease: CURVA }}
                  >
                    <p
                      role="status"
                      aria-live="polite"
                      className={cn('px-1.5 text-[17px] leading-[1.5] text-fg', altoMinimo)}
                    >
                      {dictado.enVivo}
                      <span aria-hidden className="llegada-cursor llegada-cursor-voz" />
                      {!dictado.enVivo && (
                        <span className="ml-2 text-fg-placeholder">{t('beta.welcome.vozHabla')}</span>
                      )}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span
                        aria-hidden
                        className="llegada-mic flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg"
                      >
                        <Microphone size={19} weight="fill" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[15px] font-medium text-fg">
                          {t('beta.welcome.vozTitulo')}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
                          <span className="font-mono tabular-nums">{relojDeVoz(dictado.segundos)}</span>
                          {' · '}
                          {t('beta.welcome.vozPista')}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={dictado.cancelar}
                        className="h-10 shrink-0 rounded-full px-3 text-[14px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
                      >
                        {t('beta.welcome.vozCancelar')}
                      </button>
                      <button
                        type="button"
                        onClick={dictado.alternar}
                        aria-label={t('beta.welcome.vozListo')}
                        title={t('beta.welcome.vozListo')}
                        data-testid="voz-listo"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition-transform duration-150 hover:scale-105 active:scale-95"
                      >
                        <Stop size={14} weight="fill" aria-hidden />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Escribiendo ── */
                  <motion.div
                    key="texto"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.25, ease: CURVA }}
                  >
                    <div className="relative">
                      <textarea
                        ref={areaRef}
                        id={idCampo}
                        aria-describedby={idAyuda}
                        data-testid="caja-de-llegada"
                        value={valor}
                        onChange={(e) => {
                          setValor(e.target.value);
                          if (dictado.error) dictado.limpiarError();
                        }}
                        onKeyDown={alTeclear}
                        onFocus={() => setEnfocada(true)}
                        onBlur={() => setEnfocada(false)}
                        rows={compacta ? 1 : 2}
                        spellCheck
                        className={cn(
                          'block w-full resize-none bg-transparent px-1.5',
                          compacta ? 'text-[16px]' : 'text-[17px]',
                          'leading-[1.5] text-fg transition-[min-height] duration-300',
                          altoMinimo,
                          'outline-none [&::-webkit-scrollbar]:hidden'
                        )}
                        style={{ maxHeight: ALTO_MAXIMO }}
                      />
                      {/* El ejemplo que se escribe solo: decoración, por eso
                          `aria-hidden` — la etiqueta de arriba es la que dice
                          qué escribir. Se va apenas hay texto. */}
                      {!valor && (
                        <span
                          aria-hidden
                          data-testid="ejemplo-de-llegada"
                          className={cn(
                            'pointer-events-none absolute inset-x-1.5 top-0 select-none truncate leading-[1.5] text-fg-placeholder',
                            compacta ? 'text-[16px]' : 'whitespace-normal text-[17px]'
                          )}
                        >
                          {ejemplo.texto}
                          {ejemplo.escribiendo && <span className="llegada-cursor" />}
                        </span>
                      )}
                    </div>

                    {/* Por qué no se pudo dictar — dentro de la caja, nunca en
                        silencio (Nico, 02-10: «le da clic a voz y se sale»). */}
                    {dictado.error && (
                      <div
                        role="alert"
                        data-testid="voz-error"
                        className="mt-2 flex items-start gap-2 rounded-[14px] bg-warning-soft px-3 py-2 text-[13px] leading-snug text-fg"
                      >
                        <WarningCircle size={16} aria-hidden className="mt-px shrink-0 text-warning" />
                        <span className="flex-1">{t(`beta.welcome.vozError.${dictado.error}`)}</span>
                        <button
                          type="button"
                          onClick={dictado.limpiarError}
                          aria-label={t('beta.welcome.vozError.cerrar')}
                          className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover hover:text-fg"
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    )}

                    {/* Barra de abajo */}
                    <div className={cn('flex items-center justify-between gap-2', compacta ? 'mt-2' : 'mt-3')}>
                      {/* El menú sale DESDE este botón. */}
                      <span className="relative">
                        <button
                          type="button"
                          onClick={onPlantillas}
                          aria-haspopup="menu"
                          aria-expanded={plantillasAbiertas}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4',
                            boton,
                            'text-[14px] font-medium text-fg',
                            'transition-[background-color,border-color,transform] duration-150',
                            'hover:border-border-strong hover:bg-bg active:scale-[0.98]',
                            plantillasAbiertas && 'border-border-strong bg-bg'
                          )}
                        >
                          <Cards size={16} aria-hidden />
                          {t('beta.templates.button')}
                        </button>
                        {menuDePlantillas}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* «Enter» aparece cuando ya hay algo que mandar. */}
                        <span
                          aria-hidden
                          className={cn(
                            'hidden items-center gap-1.5 text-[12px] text-fg-subtle transition-opacity duration-300 sm:inline-flex',
                            puedeEnviar ? 'opacity-100' : 'opacity-0'
                          )}
                        >
                          {t('beta.welcome.enviarCon')}
                          <Kbd>Enter</Kbd>
                        </span>

                        {dictado.soportado && (
                          <button
                            type="button"
                            onClick={dictado.alternar}
                            aria-label={t('beta.chat.voiceButton')}
                            title={t('beta.chat.voiceButton')}
                            data-testid="voz-llegada"
                            className={cn(
                              'group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[14px] font-medium text-fg',
                              boton,
                              'transition-colors duration-150 hover:border-border-strong hover:bg-bg active:scale-[0.98]'
                            )}
                          >
                            {/* La onda de la referencia: quieta, se mueve al pasar el mouse. */}
                            <span aria-hidden className="llegada-onda">
                              <i />
                              <i />
                              <i />
                              <i />
                            </span>
                            <span className="hidden sm:inline">{t('beta.welcome.voz')}</span>
                          </button>
                        )}

                        {/* Aro metálico + botón (la referencia: `<metal-ring>`). */}
                        <span
                          className="llegada-anillo relative inline-flex shrink-0 rounded-full"
                          data-fuerza={puedeEnviar ? 'llena' : 'baja'}
                        >
                          <span aria-hidden className="llegada-anillo-luz">
                            <span className="llegada-metal" />
                          </span>
                          <motion.button
                            type="button"
                            onClick={enviar}
                            disabled={!puedeEnviar}
                            aria-label={t('beta.chat.sendButton')}
                            data-testid="enviar-llegada"
                            // Al tener algo que mandar, el botón «despierta» (la
                            // referencia: .94 → 1.06 → 1 en 0,55 s).
                            animate={puedeEnviar && !reducido ? { scale: [0.94, 1.06, 1] } : { scale: 1 }}
                            whileTap={puedeEnviar && !reducido ? { scale: 0.9 } : undefined}
                            transition={{ duration: 0.55, ease: CURVA }}
                            className={cn(
                              'relative flex shrink-0 items-center justify-center rounded-full',
                              redondo,
                              "before:absolute before:-inset-1 before:content-['']",
                              'transition-colors duration-300 ease-out',
                              puedeEnviar
                                ? 'bg-primary text-primary-fg hover:bg-primary-600'
                                : 'cursor-not-allowed bg-surface-muted text-fg-subtle'
                            )}
                          >
                            <ArrowUp size={18} weight="bold" aria-hidden />
                          </motion.button>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeja: asoma por debajo del marco. */}
      {bandeja ? (
        <div className={cn('relative mx-3 -mt-9 sm:mx-5', bandejaElevada ? 'z-[3]' : 'z-[1]')}>
          <div className="llegada-bandeja rounded-b-[26px] px-4 pb-2.5 pt-11 sm:px-5">{bandeja}</div>
        </div>
      ) : null}
    </div>
  );
}
