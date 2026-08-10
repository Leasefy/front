import { cn } from '@/lib/utils';
import {
  LEASEFY_SYMBOL_PATH,
  LEASEFY_WORDMARK_PATH,
  LEASEFY_SYMBOL_VIEWBOX,
  LEASEFY_LOCKUP_VIEWBOX,
} from './leasefy-logo-paths';

/**
 * Logo de Leasefy en monocromo — el MISMO trazo que usa la landing.
 *
 * Monocromo por diseño: pinta con `currentColor`, así hereda el color del
 * contenedor y sale **negro en claro y blanco en oscuro** sin una sola
 * condición de tema, sin `useTheme` y sin parpadeo de hidratación (leer el
 * tema en cliente para elegir entre dos assets siempre parpadea en el primer
 * frame; heredar el color no).
 *
 * No sustituye a `LeasefyMark`/`LeasefyLogo` de cadence (las firmas a color):
 * esas siguen valiendo en superficies de producto. Estas son las variantes de
 * chrome — sidebar, headers — donde el azul competiría con el color de marca
 * de la inmobiliaria.
 */

const SYMBOL_ASPECT = 250 / 140;
const LOCKUP_ASPECT = 947 / 235;

interface BaseProps {
  /** Alto en píxeles; el ancho sale del aspecto real del trazo. */
  size?: number;
  className?: string;
  /** Texto accesible. Omitido → decorativo (`aria-hidden`), para cuando el
   *  contenedor ya nombra el destino (p. ej. un link con aria-label). */
  title?: string;
}

export type LeasefySymbolProps = BaseProps;

/** Solo la ola. Para slots cuadrados o angostos (rail colapsado, favicons). */
export function LeasefySymbol({ size = 20, className, title }: LeasefySymbolProps) {
  return (
    <svg
      viewBox={LEASEFY_SYMBOL_VIEWBOX}
      height={size}
      width={Math.round(size * SYMBOL_ASPECT)}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
    >
      <path d={LEASEFY_SYMBOL_PATH} />
    </svg>
  );
}

export type LeasefyLogotypeProps = BaseProps;

/**
 * Lockup completo — ola + "Leasefy". Es la firma del producto: identifica la
 * plataforma, no a la inmobiliaria que la usa. Por eso va solo, sin nombre de
 * agencia al lado: el nombre de la agencia ya vive en su propio contexto.
 */
export function LeasefyLogotype({ size = 22, className, title }: LeasefyLogotypeProps) {
  return (
    <svg
      viewBox={LEASEFY_LOCKUP_VIEWBOX}
      height={size}
      width={Math.round(size * LOCKUP_ASPECT)}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
    >
      <path d={LEASEFY_SYMBOL_PATH} />
      <path d={LEASEFY_WORDMARK_PATH} />
    </svg>
  );
}
