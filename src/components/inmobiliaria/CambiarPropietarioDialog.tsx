'use client';

/**
 * CambiarPropietarioDialog — cambiar el dueño de un inmueble que YA tiene
 * propietario (se vendió, heredó, lo puso a nombre de la sociedad).
 *
 * Nico, 2026-09-02: «que tome el que viene desde la migración y que permita
 * editarlo si es necesario por si cambia de propietario». Hasta hoy la ficha
 * mostraba al propietario y no había cómo cambiarlo sin tumbar la
 * consignación. Esto reapunta la consignación con `PUT /consignaciones/:id`
 * (`propietarioId`), que es lo mismo que hace la corrección de propietario
 * en la migración de contratos.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { PropietarioSelector } from '@/components/inmobiliaria/PropietarioSelector';
import { consignacionesApi, propietariosApi } from '@/lib/api/inmobiliaria.service';
import type { Consignacion, Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

interface CambiarPropietarioDialogProps {
  open: boolean;
  consignacion: Consignacion;
  onClose: () => void;
  /** La consignación ya actualizada; quien la muestra la reemplaza en su estado. */
  onCambiado: (consignacion: Consignacion) => void;
}

export function CambiarPropietarioDialog({
  open,
  consignacion,
  onClose,
  onCambiado,
}: CambiarPropietarioDialogProps) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [elegido, setElegido] = useState<string | null>(consignacion.propietarioId);
  const [nuevo, setNuevo] = useState<PropietarioFormData | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setElegido(consignacion.propietarioId);
    setNuevo(undefined);
    setCargando(true);
    propietariosApi
      .getAll()
      .then(setPropietarios)
      .catch(() => toast.error('No pudimos cargar los propietarios. Prueba de nuevo.'))
      .finally(() => setCargando(false));
  }, [open, consignacion.propietarioId]);

  const sinCambio = elegido === consignacion.propietarioId && !nuevo;

  const guardar = async () => {
    if (sinCambio || guardando) return;
    setGuardando(true);
    try {
      // Un propietario nuevo se crea primero; la consignación apunta a su ficha.
      const propietarioId = nuevo ? (await propietariosApi.create(nuevo)).id : elegido;
      if (!propietarioId) return;
      const actualizada = await consignacionesApi.update(consignacion.id, { propietarioId });
      onCambiado(actualizada);
      toast.success('Propietario cambiado');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'No pudimos cambiar el propietario. Prueba de nuevo en un momento.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="cambiar-propietario-dialog">
        <DialogHeader>
          <DialogTitle>¿De quién es ahora este inmueble?</DialogTitle>
          <DialogDescription>
            Elige al nuevo propietario de «{consignacion.propertyTitle}». La comisión y las
            fechas de la consignación no cambian; los cobros y las dispersiones futuras van a
            nombre del nuevo dueño.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <p className="py-6 text-center text-sm text-fg-muted">Cargando propietarios…</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <PropietarioSelector
              propietarios={propietarios}
              value={elegido}
              newPropietarioData={nuevo}
              onChange={(id, data) => {
                setElegido(id || null);
                setNuevo(data);
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            disabled={sinCambio || guardando || cargando}
            isLoading={guardando}
            data-testid="cambiar-propietario-guardar"
          >
            Guardar propietario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
