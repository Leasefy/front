'use client';

/**
 * «¿A cargo de quién queda la reparación?», al aprobar una cotización.
 *
 * Nico y Juan Camilo (2026-09-16): al aprobar la cotización, la inmobiliaria
 * marca a cargo de quién es.
 *
 * · Del PROPIETARIO: el back le registra la deducción por el valor aprobado,
 *   repartida entre los dueños del inmueble, en la misma operación.
 * · Del INQUILINO: no se le descuenta nada al propietario. 🔴 El cobro al
 *   inquilino todavía NO entra solo a su estado de cuenta, y el diálogo lo dice
 *   antes de aprobar: callarlo sería dejar una reparación sin cobrar a nadie.
 *
 * No hay opción preseleccionada: la decisión se toma a propósito.
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
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';
import type { ACargoDe } from '@/lib/types/deducciones';

export interface CotizacionPorAprobar {
  proveedor: string;
  valorCop: number;
}

export function ACargoDeDialog({
  abierto,
  onOpenChange,
  cotizacion,
  onConfirmar,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  cotizacion: CotizacionPorAprobar | null;
  /** Se espera: si el back rechaza, el diálogo queda abierto. */
  onConfirmar: (aCargoDe: ACargoDe) => Promise<void>;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.aCargoDe.${s}`;
  const [eleccion, setEleccion] = useState<ACargoDe | null>(null);
  const [aprobando, setAprobando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setEleccion(null);
      setAprobando(false);
    }
  }, [abierto]);

  const confirmar = async () => {
    if (!eleccion || aprobando) return;
    setAprobando(true);
    try {
      await onConfirmar(eleccion);
      onOpenChange(false);
    } catch {
      setAprobando(false);
    }
  };

  const opciones: { valor: ACargoDe; titulo: string; ayuda: string }[] = [
    { valor: 'PROPIETARIO', titulo: t(k('propietario')), ayuda: t(k('propietarioAyuda')) },
    { valor: 'INQUILINO', titulo: t(k('inquilino')), ayuda: t(k('inquilinoAyuda')) },
  ];

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="a-cargo-de">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          {cotizacion && (
            <DialogDescription>
              {t(k('descripcion'), {
                proveedor: cotizacion.proveedor,
                valor: formatCurrency(cotizacion.valorCop),
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        <div role="radiogroup" aria-label={t(k('titulo'))} className="space-y-3">
          {opciones.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={eleccion === o.valor}
              onClick={() => setEleccion(o.valor)}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors',
                eleccion === o.valor
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface hover:bg-surface-muted',
              )}
              data-testid={`a-cargo-de-${o.valor}`}
            >
              <p className="text-sm font-medium text-fg">{o.titulo}</p>
              <p className="mt-1 text-xs text-fg-muted">{o.ayuda}</p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={aprobando}>
            {t(k('cancelar'))}
          </Button>
          <Button
            hideArrow
            onClick={() => void confirmar()}
            disabled={!eleccion || aprobando}
            data-testid="a-cargo-de-confirmar"
          >
            {aprobando ? t(k('aprobando')) : t(k('confirmar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
