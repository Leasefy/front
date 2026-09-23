'use client';

/**
 * «Quiero entender más» — la explicación se guarda detrás de un botón.
 *
 * ── Por qué existe (Nico, 21-09-2026) ──────────────────────────────────────
 *
 * Mirando Postulaciones, con el recorrido de once tarjetas ocupando la
 * pantalla entera: «eso ahí expuesto, para mí eso debería estar quizás en un
 * botón de "quiero entender más", y que cuando se dé clic se abra un modal con
 * toda la información. Y hay muchas pantallas que colocamos información ahí
 * dispuesta y eso llena las pantallas de carga cognitiva innecesaria.»
 *
 * ── La diferencia con un `<details>`, que es la que importa ────────────────
 *
 * Varias de estas explicaciones YA estaban detrás de un `<details>`. No
 * alcanza: un `<details>` abierto crece DENTRO de la pantalla y empuja hacia
 * abajo lo que la persona vino a hacer, así que leer la explicación cuesta
 * perder el lugar. Un modal la muestra encima y la devuelve intacta al
 * cerrarla.
 *
 * Y hay una segunda diferencia, invisible pero real: **el contenido no se monta
 * hasta que se abre**. Once tarjetas con sus iconos y sus enlaces no se
 * calculan para nadie que no las pidió.
 *
 * ── Cuándo NO usar esto ────────────────────────────────────────────────────
 *
 * Esto es para lo EXPLICATIVO —cómo funciona algo, qué pide un portal—, no
 * para lo que la pantalla tiene que decir sí o sí: un aviso de que algo falló,
 * un requisito que falta, el motivo por el que un botón está apagado. Esconder
 * eso detrás de un clic es lo contrario de lo que se está arreglando acá.
 */

import { useState, type ReactNode } from 'react';
import { Question } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface ParaEntenderMasProps {
  /** Lo que dice el botón. Concreto: «Cómo funciona una postulación». */
  etiqueta: string;
  /** El título del modal. Si no se da, el del botón. */
  titulo?: string;
  /** Una línea que enmarque lo que se va a leer. Opcional. */
  descripcion?: string;
  /** Más ancho para lo que de verdad lo necesita (un mapa de once pasos). */
  ancho?: 'normal' | 'ancho';
  /**
   * `fantasma` (por defecto) para cuando vive dentro de un bloque; `secundario`
   * para cuando va en el encabezado de la pantalla, donde iría su botón de
   * acción (Nico, 23-09: el fantasma suelto a la derecha dejaba una fila vacía).
   */
  variante?: 'fantasma' | 'secundario';
  children: ReactNode;
  className?: string;
}

export function ParaEntenderMas({
  etiqueta,
  titulo,
  descripcion,
  ancho = 'normal',
  variante = 'fantasma',
  children,
  className,
}: ParaEntenderMasProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variante === 'secundario' ? 'secondary' : 'ghost'}
        size="sm"
        hideArrow
        className={className}
        onClick={() => setAbierto(true)}
        data-testid="para-entender-mas"
      >
        <Question className="h-4 w-4" />
        {etiqueta}
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent
          className={ancho === 'ancho' ? 'sm:max-w-5xl' : 'sm:max-w-lg'}
          data-testid="para-entender-mas-contenido"
          /* Sin `descripcion`, se dice EXPLÍCITO que no hay: Radix avisaba en la
             consola «Missing `Description` or `aria-describedby={undefined}`»
             en cada apertura (QA 23-09). El contenido del modal ya es la
             explicación; una descripción de relleno repetiría el título. */
          {...(descripcion ? {} : { 'aria-describedby': undefined })}
        >
          <DialogHeader>
            <DialogTitle>{titulo ?? etiqueta}</DialogTitle>
            {descripcion ? <DialogDescription>{descripcion}</DialogDescription> : null}
          </DialogHeader>
          {/* `data-lenis-prevent`: el scroll suave de la casa se apropia de la
              rueda dentro de los modales si no se le dice que no. */}
          <div className="max-h-[70vh] overflow-y-auto" data-lenis-prevent>
            {/* Montado sólo mientras está abierto. */}
            {abierto ? children : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ParaEntenderMas;
