'use client';

/**
 * Pegar el enlace del aviso y traer sus fotos.
 *
 * 🔴 Nico, 2026-09-12: «además de que puedan arrastrar o subir las fotos,
 * deberíamos dar la opción de que pueda colocar el link de donde tienen esa
 * propiedad, donde podamos sacar las imágenes, y ya nosotros hacemos la tarea
 * de sacarlas y subirlas al inmueble».
 *
 * Quien acaba de migrar 2.800 inmuebles los tiene publicados con sus fotos en
 * Fincaraíz o Metrocuadrado. Pedirle que las consiga de nuevo es pedirle el
 * trabajo dos veces.
 *
 * Entrega `File`s por el MISMO camino que la zona de arrastre
 * (`onArchivos`), así que de acá para abajo —validación, cupo, subida,
 * galería— no cambia nada. Ver `fotos-desde-enlace.ts` para lo que se reusa.
 */

import { useCallback, useRef, useState } from 'react';
import { LinkSimple, Spinner as SpinnerIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { fotosDesdeEnlace } from '@/lib/inmuebles/fotos-desde-enlace';

export interface FotosDesdeEnlaceProps {
  /** Cuántas fotos más caben en el inmueble. */
  cupo: number;
  /** Los archivos ya bajados. Mismo contrato que `SubidaDeFotos`. */
  onArchivos: (archivos: File[]) => void;
  disabled?: boolean;
}

export function FotosDesdeEnlace({
  cupo,
  onArchivos,
  disabled = false,
}: FotosDesdeEnlaceProps) {
  const [url, setUrl] = useState('');
  const [trayendo, setTrayendo] = useState(false);
  const [avance, setAvance] = useState<{ listas: number; total: number } | null>(
    null,
  );
  // El aviso vive acá abajo y no en un toast: es la respuesta a lo que la
  // persona acaba de pedir, y un toast se va antes de que lo lea.
  const [error, setError] = useState<string | null>(null);
  const cancelado = useRef(false);

  const bloqueado = disabled || trayendo || cupo <= 0;

  const traer = useCallback(async () => {
    const limpia = url.trim();
    if (!limpia) return;
    if (!/^https?:\/\//i.test(limpia)) {
      setError('Pega la dirección completa del aviso, empezando por https://');
      return;
    }

    cancelado.current = false;
    setTrayendo(true);
    setError(null);
    setAvance(null);
    try {
      const r = await fotosDesdeEnlace(limpia, cupo, (listas, total) => {
        if (!cancelado.current) setAvance({ listas, total });
      });
      if (cancelado.current) return;

      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      if (r.archivos.length === 0) {
        setError(
          'El aviso se leyó, pero ninguna de sus fotos se pudo bajar. Puede que el portal las esté bloqueando.',
        );
        return;
      }

      onArchivos(r.archivos);
      setUrl('');
      // Lo que NO entró se dice, siempre. Un corte en silencio es cómo
      // alguien da por subidas unas fotos que no están.
      const notas = [
        r.fallidas > 0
          ? `${r.fallidas} no se pudieron bajar`
          : null,
        r.fueraDeCupo > 0
          ? `${r.fueraDeCupo} no caben (el inmueble guarda hasta 40)`
          : null,
      ].filter(Boolean);
      toast.success(
        r.archivos.length === 1
          ? '1 foto traída del aviso'
          : `${r.archivos.length} fotos traídas del aviso`,
        notas.length > 0 ? { description: notas.join(' · ') } : undefined,
      );
    } finally {
      if (!cancelado.current) {
        setTrayendo(false);
        setAvance(null);
      }
    }
  }, [url, cupo, onArchivos]);

  if (cupo <= 0) return null;

  return (
    <div className="space-y-2" data-testid="fotos-desde-enlace">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <LinkSimple
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !bloqueado) {
                e.preventDefault();
                void traer();
              }
            }}
            disabled={bloqueado}
            placeholder="https://www.fincaraiz.com.co/…"
            aria-label="Enlace del aviso donde está publicado el inmueble"
            className="pl-9"
            data-testid="enlace-del-aviso"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          hideArrow
          onClick={() => void traer()}
          disabled={bloqueado || url.trim().length === 0}
          data-testid="traer-fotos"
        >
          {trayendo ? (
            <>
              <SpinnerIcon className="mr-1.5 h-4 w-4 animate-spin" />
              Trayendo…
            </>
          ) : (
            'Traer las fotos'
          )}
        </Button>
      </div>

      {avance ? (
        <p
          className="font-mono text-xs tabular-nums text-fg-subtle"
          aria-live="polite"
          data-testid="avance-fotos-enlace"
        >
          {avance.listas} de {avance.total}
        </p>
      ) : error ? (
        <p className="text-sm text-danger" role="alert" data-testid="error-fotos-enlace">
          {error}
        </p>
      ) : (
        <p className="text-xs text-fg-subtle">
          Pega el enlace de Fincaraíz, Metrocuadrado o el portal donde ya
          publicaste este inmueble y traemos sus fotos.
        </p>
      )}
    </div>
  );
}
