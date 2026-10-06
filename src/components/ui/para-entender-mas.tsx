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
 * ── Un cajón, no un modal (Nico, 05-10-2026) ──────────────────────────────
 *
 * Mirando Avalúos: «llévalas al botón que al dar clic abre drawer y explica
 * mejor cada cosa y más bonito». Desde ese día el botón abre el CAJÓN de la
 * casa (`Cajon`: el Sheet flotante de Cadence, a la derecha; en el celular sube
 * como hoja desde abajo), no un modal centrado. La explicación se lee al lado
 * de la pantalla que explica, con su cabecera fija y un cuerpo que scrollea.
 * Para los pasos de un «¿Cómo funciona?» está `PasosExplicados`
 * (`ui/pasos-explicados.tsx`): quién hace cada paso y lo que te toca a ti.
 *
 * El contenido sigue sin montarse hasta que se abre (Radix no monta el cajón
 * cerrado) y se va cuando termina de salir. Al cerrar —Esc, clic afuera o la
 * ✕— el foco vuelve al botón: `Cajon` recuerda qué tenía el foco al abrir, y
 * el clic se lo da al botón ANTES de abrir (Safari no enfoca un botón al
 * hacerle clic, y sin eso el foco caía al principio de la página).
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
import { Cajon, CajonCabecera } from '@/components/ui/cajon';
import { SheetBody } from '@/components/ui/sheet';

export interface ParaEntenderMasProps {
  /** Lo que dice el botón. Concreto: «Cómo funciona una postulación». */
  etiqueta: string;
  /** El título del cajón. Si no se da, el del botón. */
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
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={(e) => {
          // El foco en el botón ANTES de abrir: es adonde `Cajon` lo devuelve.
          e.currentTarget.focus();
          setAbierto(true);
        }}
        data-testid="para-entender-mas"
      >
        <Question className="h-4 w-4" />
        {etiqueta}
      </Button>

      {/* «normal» = el cajón mediano (560 px), «ancho» = el grande (880 px):
          la misma traducción que `Cajon` hace de los anchos viejos del modal
          (`sm:max-w-lg` y `sm:max-w-5xl`). */}
      <Cajon
        abierto={abierto}
        onOpenChange={setAbierto}
        tamano={ancho === 'ancho' ? 'xl' : 'md'}
        data-testid="para-entender-mas-contenido"
      >
        <CajonCabecera titulo={titulo ?? etiqueta} descripcion={descripcion} />
        {/* El cuerpo es lo único que scrollea (`data-lenis-prevent` incluido).
            Montado sólo mientras el cajón está abierto o saliendo.

            Es `SheetBody` (lo mismo que `CajonCuerpo`) para poder darle
            `tabIndex`: una explicación es texto sin un solo control, y una
            región que scrollea sin nada enfocable no se puede leer con el
            teclado (axe, `scrollable-region-focusable`, «serious»; QA 05-10).
            Con foco propio, las flechas la recorren; el anillo sólo con
            teclado. */}
        <SheetBody
          tabIndex={0}
          role="region"
          aria-label={titulo ?? etiqueta}
          className="outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {children}
        </SheetBody>
      </Cajon>
    </>
  );
}

export default ParaEntenderMas;
