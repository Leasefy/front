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
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Cards, Microphone } from '@phosphor-icons/react';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BarrasDeVoz, useDictadoPorVoz } from '../dictado-por-voz';
import { useEjemploQueSeEscribe } from './use-ejemplo-que-se-escribe';

/**
 * CajaDeLlegada — la caja grande de la llegada del chat (Nico, 02-10-2026:
 * «quiero así de hermoso el chat», con la llegada del sistema de diseño de
 * SaleAds como referencia del lenguaje visual, no de la marca).
 *
 * Anatomía, de afuera hacia adentro:
 * - **Marco** (`bg-surface-muted`, 40px): el halo suave alrededor.
 * - **Aro + resplandor** (`.llegada-aro` / `.llegada-halo`, en `globals.css`):
 *   un arco de color que da la vuelta al borde mientras la caja está
 *   encendida (enfocada o con texto). Es la única excepción decorativa al
 *   «sin gradientes en el chat»: vive en el borde, nunca detrás de un texto
 *   que haya que leer, y se apaga en 0,8 s.
 * - **Caja** (`bg-surface`, 30px): adentro, un lavado iridiscente MUY suave
 *   (`.llegada-lavado`) que también se enciende con el foco.
 * - **Bandeja** (opcional): la franja de estado que asoma debajo del marco.
 *   Sólo se dibuja con un dato real (la pasa `BetaWelcome`).
 *
 * Qué NO tiene, a propósito: «+» (el chat no recibe adjuntos: el back sólo
 * recibe mensaje e historial) ni selector de modelo. «Voz» sólo donde el
 * navegador sabe dictar (`useDictadoPorVoz`).
 */

interface CajaDeLlegadaProps {
  onEnviar: (texto: string) => void;
  /** Abre o cierra el menú de plantillas (el menú lo monta quien llama). */
  onPlantillas: () => void;
  plantillasAbiertas: boolean;
  /** Ejemplos reales de lo que el chat sabe hacer; se escriben solos. */
  ejemplos: readonly string[];
  /** La franja de estado debajo del marco. `null` = sin bandeja. */
  bandeja?: ReactNode;
  className?: string;
}

const ALTO_MAXIMO = 200;
const CURVA = [0.22, 1, 0.36, 1] as const;

export function CajaDeLlegada({
  onEnviar,
  onPlantillas,
  plantillasAbiertas,
  ejemplos,
  bandeja,
  className,
}: CajaDeLlegadaProps) {
  const { t } = useI18n();
  const reducido = useReducedMotion() ?? false;
  const [valor, setValor] = useState('');
  const [enfocada, setEnfocada] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const idCampo = useId();
  const idAyuda = useId();

  const dictado = useDictadoPorVoz(valor, setValor);
  const hayTexto = valor.trim().length > 0;
  const puedeEnviar = hayTexto && !dictado.escuchando;
  const encendida = enfocada || hayTexto || dictado.escuchando;

  const ejemplo = useEjemploQueSeEscribe(ejemplos, {
    activo: !enfocada && !hayTexto && !dictado.escuchando,
    reducido,
  });

  // Alto que sigue al texto, hasta ~7 líneas; después, scroll adentro.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, ALTO_MAXIMO)}px`;
  }, [valor]);

  const enviar = useCallback(() => {
    const texto = valor.trim();
    if (!texto || dictado.escuchando) return;
    onEnviar(texto);
    setValor('');
  }, [valor, dictado.escuchando, onEnviar]);

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
      <div className="relative z-[2] rounded-[40px] bg-surface-muted p-2 sm:p-2.5">
        {/* `data-enfocada` prende el aro (es el indicador de foco: tiene que
            verse con teclado); `data-encendida` prende el lavado de adentro. */}
        <div
          className="llegada-caja relative rounded-[30px]"
          data-encendida={encendida ? 'true' : 'false'}
          data-enfocada={enfocada || dictado.escuchando ? 'true' : 'false'}
        >
          <span aria-hidden className="llegada-halo">
            <span className="llegada-giro" />
          </span>
          <span aria-hidden className="llegada-aro">
            <span className="llegada-giro" />
          </span>

          {/* Caja */}
          <div
            className={cn(
              'relative z-[1] overflow-hidden rounded-[30px] border bg-surface',
              'shadow-[0_12px_40px_-18px_rgba(20,19,15,0.18)] dark:shadow-[0_12px_40px_-18px_rgba(0,0,0,0.7)]',
              'transition-[border-color,box-shadow] duration-500',
              encendida ? 'border-border-faint' : 'border-border'
            )}
          >
            <span aria-hidden className="llegada-lavado">
              <i />
              <i />
              <i />
              <i />
            </span>

            <div className="relative px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
              <label htmlFor={idCampo} className="sr-only">
                {t('beta.welcome.inputLabel')}
              </label>
              <span id={idAyuda} className="sr-only">
                {t('beta.welcome.inputHint')}
              </span>

              {dictado.escuchando ? (
                <div className="flex min-h-[56px] items-center gap-3.5 px-1.5" role="status">
                  <BarrasDeVoz />
                  <span
                    className={cn(
                      'flex-1 truncate text-[17px] leading-relaxed',
                      dictado.enVivo ? 'text-fg' : 'text-fg-subtle'
                    )}
                  >
                    {dictado.enVivo || t('beta.chat.listening')}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    ref={areaRef}
                    id={idCampo}
                    aria-describedby={idAyuda}
                    data-testid="caja-de-llegada"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onKeyDown={alTeclear}
                    onFocus={() => setEnfocada(true)}
                    onBlur={() => setEnfocada(false)}
                    rows={2}
                    spellCheck
                    className={cn(
                      'block w-full resize-none bg-transparent px-1.5',
                      'min-h-[56px] text-[17px] leading-[1.5] text-fg',
                      'outline-none [&::-webkit-scrollbar]:hidden'
                    )}
                    style={{ maxHeight: ALTO_MAXIMO }}
                  />
                  {/* El ejemplo que se escribe solo: decoración, por eso
                      `aria-hidden` — la etiqueta de arriba es la que dice qué
                      escribir. Se va apenas hay texto. */}
                  {!valor && (
                    <span
                      aria-hidden
                      data-testid="ejemplo-de-llegada"
                      className="pointer-events-none absolute inset-x-1.5 top-0 select-none text-[17px] leading-[1.5] text-fg-placeholder"
                    >
                      {ejemplo.texto}
                      {ejemplo.escribiendo && <span className="llegada-cursor" />}
                    </span>
                  )}
                </div>
              )}

              {/* Barra de abajo */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onPlantillas}
                  aria-haspopup="menu"
                  aria-expanded={plantillasAbiertas}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4',
                    'text-[14px] font-medium text-fg',
                    'transition-[background-color,border-color,transform] duration-150',
                    'hover:border-border-strong hover:bg-bg active:scale-[0.98]',
                    plantillasAbiertas && 'border-border-strong bg-bg'
                  )}
                >
                  <Cards size={16} aria-hidden />
                  {t('beta.templates.button')}
                </button>

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
                      aria-pressed={dictado.escuchando}
                      aria-label={dictado.escuchando ? t('beta.chat.voiceStop') : t('beta.chat.voiceButton')}
                      title={dictado.escuchando ? t('beta.chat.voiceStop') : t('beta.chat.voiceButton')}
                      className={cn(
                        'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium',
                        'transition-colors duration-150 active:scale-[0.98]',
                        dictado.escuchando
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-border bg-surface text-fg hover:border-border-strong hover:bg-bg'
                      )}
                    >
                      <Microphone size={16} weight={dictado.escuchando ? 'fill' : 'regular'} aria-hidden />
                      <span className="hidden sm:inline">{t('beta.welcome.voz')}</span>
                    </button>
                  )}

                  <motion.button
                    type="button"
                    onClick={enviar}
                    disabled={!puedeEnviar}
                    aria-label={t('beta.chat.sendButton')}
                    data-testid="enviar-llegada"
                    // Al tener algo que mandar, el botón «despierta» (la
                    // referencia: .94 → 1.06 → 1 en 0,55 s).
                    animate={puedeEnviar && !reducido ? { scale: [0.94, 1.06, 1] } : { scale: 1 }}
                    transition={{ duration: 0.55, ease: CURVA }}
                    className={cn(
                      'relative flex size-10 shrink-0 items-center justify-center rounded-full',
                      "before:absolute before:-inset-1 before:content-['']",
                      'transition-colors duration-300',
                      puedeEnviar
                        ? 'bg-primary text-primary-fg hover:bg-primary-600'
                        : 'cursor-not-allowed bg-surface-muted text-fg-subtle'
                    )}
                  >
                    <ArrowUp size={18} weight="bold" aria-hidden />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeja: asoma por debajo del marco. */}
      {bandeja ? (
        <div className="relative z-[1] mx-3 -mt-9 rounded-b-[26px] bg-surface-muted sm:mx-5">
          <div className="rounded-b-[26px] bg-surface-hover px-4 pb-2.5 pt-11 sm:px-5">{bandeja}</div>
        </div>
      ) : null}
    </div>
  );
}
