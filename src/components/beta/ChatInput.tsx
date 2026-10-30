'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { ChatTemplatesMenu } from './ChatTemplates';
import { CajaDeLlegada } from './llegada/CajaDeLlegada';
import { AvisoDePreguntas } from './AvisoDePreguntas';
import { PreguntasDelMes } from './PreguntasDelMes';
import { useAdjuntosDelCompositor } from '@/lib/chat/use-adjuntos-del-compositor';
import type { AdjuntoDelMensaje } from '@/lib/chat/adjuntos';

interface ChatInputProps {
  /** El texto y los archivos que ya subieron (29-10-2026: adjuntos en el chat). */
  onSend: (text: string, adjuntos?: AdjuntoDelMensaje[]) => void;
  /** Hay un turno corriendo: se puede escribir, pero todavía no enviar. */
  disabled?: boolean;
  className?: string;
  /**
   * Bloque que se apoya SOBRE la caja de texto, dentro de ella (mismo borde,
   * esquinas compartidas). Lo usa el progreso de la tarea: suelto encima del
   * compositor se veía «separado del chat» (Nico, 2026-08-27).
   */
  topSlot?: ReactNode;
}

/**
 * ChatInput — el compositor de la conversación (abajo del hilo).
 *
 * Nico, 02-10-2026: «si ya mejoramos el chat, ¿por qué sigo viendo un chat
 * viejo y feo?». Era una caja simple con la flecha; ahora es la MISMA caja de
 * la llegada (`CajaDeLlegada`, variante `compacta`): marco, aro de foco,
 * «Plantillas» con su menú pegado al botón (hacia arriba: está abajo de la
 * pantalla), «Voz» con su resplandor y «Enviar» con su aro. Más baja que en la
 * llegada, pero de la misma familia; no hay una segunda implementación.
 *
 * Enter envía, Shift+Enter hace un salto de línea. Mientras corre un turno se
 * puede seguir escribiendo; enviar espera a que termine.
 */
export function ChatInput({ onSend, disabled = false, className, topSlot }: ChatInputProps) {
  const { t } = useI18n();
  const [plantillas, setPlantillas] = useState(false);
  const cerrar = useCallback(() => setPlantillas(false), []);
  // Los archivos que van con el próximo mensaje (suben apenas se agregan).
  const adjuntos = useAdjuntosDelCompositor();

  return (
    // pb resolves to 1rem (= pb-4) on desktop; on devices with a home
    // indicator the safe-area inset wins so the input clears it.
    <div className={cn('px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2 sm:px-4', className)} data-testid="compositor-del-chat">
      <div className="mx-auto max-w-3xl">
        <CajaDeLlegada
          compacta
          ocupado={disabled}
          encima={topSlot}
          ejemplos={[]}
          placeholder={t('beta.chat.placeholder')}
          onEnviar={onSend}
          adjuntos={adjuntos}
          onPlantillas={() => setPlantillas((v) => !v)}
          plantillasAbiertas={plantillas}
          menuDePlantillas={
            <ChatTemplatesMenu
              open={plantillas}
              onClose={cerrar}
              onSelect={(prompt) => {
                if (!disabled) onSend(prompt);
              }}
              direction="up"
            />
          }
        />
        {/* La bolsa del mes (Nico, 27-10-2026): sólo con el freno prendido. */}
        <PreguntasDelMes ocupado={disabled} />
        {/* La cláusula se aprobó (Nico, 04-10-2026): política v4.0 §16. */}
        <AvisoDePreguntas />
      </div>
    </div>
  );
}
