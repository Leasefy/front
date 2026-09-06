'use client';

/**
 * Pedir el motivo antes de cancelar o rechazar una visita.
 *
 * 🔴 El back guarda el motivo desde siempre (`PropertyVisit.cancellationReason`
 * + `cancelledBy`) y la pantalla nunca lo pedía: el controller de la agencia
 * rellenaba con la frase enlatada «Gestionada por la inmobiliaria», así que en
 * la base TODAS las cancelaciones de una inmobiliaria decían exactamente lo
 * mismo — un dato que existe y no explica nada (Nico, 2026-09-04: «que se
 * puedan cancelar y dejar nota de por qué»).
 *
 * El motivo es OBLIGATORIO y con mínimo, igual que en el DTO público de visitas
 * (`CancelVisitDto`/`RejectVisitDto`, `@MinLength(10)`): del lado del inquilino
 * ya se exige, y no tiene sentido que la inmobiliaria —que es quien deja al
 * otro esperando— pueda cancelar sin decir por qué.
 */

import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

/** El mismo mínimo que exige el back en el flujo del inquilino. */
export const MINIMO_DEL_MOTIVO = 10;

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  /** Qué dice el botón que confirma («Cancelar la visita», «Rechazarla»). */
  etiquetaConfirmar: string;
  enviando?: boolean;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}

export function MotivoDialog({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar,
  enviando = false,
  onCerrar,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('');

  // Que no arrastre el texto de la vez anterior: si alguien cancela dos visitas
  // seguidas, el motivo de la primera no es el de la segunda.
  useEffect(() => {
    if (abierto) setMotivo('');
  }, [abierto]);

  const falta = MINIMO_DEL_MOTIVO - motivo.trim().length;
  const sirve = falta <= 0;

  return (
    <AlertDialog open={abierto} onOpenChange={(a) => !a && !enviando && onCerrar()}>
      <AlertDialogContent data-testid="motivo-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="motivo-de-la-agenda" className="text-sm font-medium text-fg">
            Motivo
          </label>
          <Textarea
            id="motivo-de-la-agenda"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            disabled={enviando}
            placeholder="Contá qué pasó. Lo va a leer quien esperaba la visita."
            data-testid="motivo-texto"
          />
          {/* Un contador que dice cuánto FALTA, no cuánto va: el botón apagado
              sin explicación es un callejón. */}
          <p className="text-xs text-fg-muted">
            {sirve
              ? 'Se guarda con la cancelación y queda en el historial de la visita.'
              : `Escribí ${falta} ${falta === 1 ? 'carácter' : 'caracteres'} más.`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={!sirve || enviando}
            onClick={(e) => {
              // El motivo se manda acá; sin `preventDefault` el diálogo se
              // cierra antes de que la llamada termine y el error no se ve.
              e.preventDefault();
              onConfirmar(motivo.trim());
            }}
            data-testid="motivo-confirmar"
          >
            {etiquetaConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
