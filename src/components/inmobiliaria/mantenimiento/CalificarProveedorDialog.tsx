'use client';

/**
 * 🔴 SO-14 (QA 04-10): «Calificar al proveedor» desde el cajón de la
 * solicitud cerrada. El back (`POST proveedores/:id/calificar`) ya existía y
 * ninguna pantalla lo llamaba al cerrar: la calificación del registro nunca
 * se llenaba.
 */

import { useEffect, useState } from 'react';
import { Star } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { toast } from '@/components/ui/toast';
import { proveedoresDeMantenimientoApi } from '@/lib/api/proveedores-de-mantenimiento.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';

export interface CalificarProveedorDialogProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  proveedorId: string;
  proveedorNombre: string;
  solicitudId: string;
  onCalificado?: () => void | Promise<void>;
}

const FRASE_DE_LAS_ESTRELLAS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

export function CalificarProveedorDialog({
  abierto,
  onOpenChange,
  proveedorId,
  proveedorNombre,
  solicitudId,
  onCalificado,
}: CalificarProveedorDialogProps) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setEstrellas(0);
      setComentario('');
      setError(null);
      setGuardando(false);
    }
  }, [abierto]);

  const guardar = async () => {
    if (estrellas < 1) {
      setError('Escoge de 1 a 5 estrellas.');
      return;
    }
    setGuardando(true);
    try {
      await proveedoresDeMantenimientoApi.calificar(proveedorId, {
        solicitudId,
        estrellas,
        ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
      });
      toast.success(`Calificaste a ${proveedorNombre}`, {
        description: `${estrellas} de 5 · queda en su ficha de Proveedores.`,
      });
      onOpenChange(false);
      await onCalificado?.();
    } catch (e) {
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar la calificación. Prueba de nuevo en un momento.',
          accion: 'calificar al proveedor',
        }),
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-testid="calificar-proveedor-dialogo">
        <DialogHeader>
          <DialogTitle>Calificar a {proveedorNombre}</DialogTitle>
          <DialogDescription>¿Cómo quedó el trabajo? Se suma a su promedio en Proveedores.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Estrellas" className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={estrellas === n}
                aria-label={`${n} de 5: ${FRASE_DE_LAS_ESTRELLAS[n]}`}
                data-testid={`calificar-estrella-${n}`}
                onClick={() => {
                  setEstrellas(n);
                  setError(null);
                }}
                className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Star
                  className={cn('h-7 w-7', n <= estrellas ? 'text-warning' : 'text-fg-subtle')}
                  weight={n <= estrellas ? 'fill' : 'regular'}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-fg-muted">{FRASE_DE_LAS_ESTRELLAS[estrellas]}</span>
          </div>
          <Textarea
            id="calificar-comentario"
            value={comentario}
            maxLength={1000}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario (opcional): puntualidad, limpieza, garantía…"
            className="min-h-[80px] resize-none"
          />
          <ErrorDelCampo id="calificar-error" mensaje={error ?? undefined} />
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button hideArrow onClick={guardar} disabled={guardando} data-testid="calificar-guardar">
            {guardando ? 'Guardando…' : 'Guardar calificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
