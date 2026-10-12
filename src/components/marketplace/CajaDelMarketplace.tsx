'use client';

import { useState } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { CajaDeLlegada } from '@/components/beta/llegada/CajaDeLlegada';
import { ChatTemplatesMenu } from '@/components/beta/ChatTemplates';

/**
 * La caja de escribir del marketplace: la MISMA del chat de la plataforma
 * (`CajaDeLlegada`, con su marco, el aro de foco, la voz y «Enviar»), como
 * pidió Nico (09-10-2026: «quiero que uses la forma UI del chat que tenemos
 * dentro de la plataforma»). En vez de «Preguntas predeterminadas», búsquedas
 * de ejemplo que salen del catálogo.
 *
 * Grande en la entrada; `compacta` abajo de la conversación, para afinar.
 */
export function CajaDelMarketplace({
  onEnviar,
  compacta = false,
  ocupado = false,
  ejemplos = [],
  placeholder,
  opciones,
  className,
}: {
  onEnviar: (texto: string) => void;
  compacta?: boolean;
  ocupado?: boolean;
  /** Se escriben solos en la caja vacía (sólo en la entrada). */
  ejemplos?: readonly string[];
  placeholder?: string;
  /** El menú «Búsquedas de ejemplo»: lo que se elige se envía tal cual. */
  opciones: readonly { id: string; titulo: string; texto: string; icono: Icon }[];
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <CajaDeLlegada
      compacta={compacta}
      ocupado={ocupado}
      ejemplos={ejemplos}
      placeholder={placeholder}
      onEnviar={onEnviar}
      onPlantillas={() => setAbierto((v) => !v)}
      plantillasAbiertas={abierto}
      textos={{
        boton: compacta ? 'Ideas para afinar' : 'Búsquedas de ejemplo',
        botonCorto: 'Ideas',
        etiqueta: compacta ? 'Afina tu búsqueda' : '¿Qué estás buscando?',
      }}
      menuDePlantillas={
        <ChatTemplatesMenu
          open={abierto}
          onClose={() => setAbierto(false)}
          onSelect={(texto) => {
            if (!ocupado) onEnviar(texto);
          }}
          opciones={opciones}
          titulo={compacta ? 'Ideas para afinar' : 'Búsquedas de ejemplo'}
          direction={compacta ? 'up' : 'down'}
        />
      }
      className={className}
    />
  );
}
