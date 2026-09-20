'use client';

/**
 * «¿Seguro que sales?» antes de cerrar el recorrido de los tres pasos.
 *
 * Nico (2026-09-15): «cuando se cierre, que le saque un modal diciendo si está
 * seguro, porque puede perder la oportunidad de arrendarla». Vale para los dos
 * pasos —la celebración (`/arrendar/[id]`) y el formulario (`/aprobacion`)—, y
 * por eso vive acá: las palabras tienen que ser las mismas en los dos lados, y
 * antes el paso 1 cerraba de una sin preguntar nada.
 *
 * El texto cambia con lo que ya se sabe: con el inmueble en mano se le nombra
 * —perder ESE local pesa más que perder «una solicitud»—; sin él, se dice lo
 * que se pierde de verdad: sin la respuesta no se puede postular a ninguno.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmarSalidaDelArriendoProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  /** El título del inmueble en curso, si se sabe cuál es. */
  tituloDelInmueble?: string | null;
  onSalir: () => void;
}

export function ConfirmarSalidaDelArriendo({
  abierto,
  onAbiertoChange,
  tituloDelInmueble,
  onSalir,
}: ConfirmarSalidaDelArriendoProps) {
  return (
    <AlertDialog open={abierto} onOpenChange={onAbiertoChange}>
      <AlertDialogContent data-testid="confirmar-salida-aprobacion">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sales de tu solicitud?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {tituloDelInmueble
            ? `Todavía no sabemos si te podemos arrendar ${tituloDelInmueble}. Mientras tanto, otra persona puede tomarlo.`
            : 'Todavía no sabemos hasta cuánto te podemos arrendar, y sin eso no puedes postularte a ningún inmueble.'}{' '}
          Te toma un par de minutos terminar.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="seguir-en-aprobacion">
            Seguir con mi solicitud
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSalir} data-testid="salir-de-aprobacion">
            Salir de todos modos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
