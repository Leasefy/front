'use client';

/**
 * La penalidad por defecto por terminación anticipada del inquilino (Nico,
 * 17-09): «valor por defecto por inmobiliaria (ej. 3 cánones), editable por
 * contrato». Normalmente es del propietario —le llega menos la comisión— y al
 * terminar se puede negociar un reparto con la inmobiliaria.
 *
 * 🔴 02-10-2026 · Es también el TOPE: «el tope LO DEFINE CADA INMOBILIARIA»
 * (Nico). Al terminar un contrato se puede cobrar menos (lo negociado), nunca
 * más que estos cánones por el canon (o los que el contrato tenga propios). El
 * back lo hace cumplir (`tope-de-la-penalidad.ts`, 400
 * `PENALIDAD_SOBRE_EL_TOPE`); acá se dice para que nadie se sorprenda. Sin
 * cánones no hay tope de negocio, sólo el de la columna.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

export function ConfigPenalidadDeTerminacion({
  agency,
  onSave,
  canEdit = true,
}: {
  agency: AgencyProfile;
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  canEdit?: boolean;
}) {
  const guardada = agency.penalidadTerminacionCanones ?? null;
  const [valor, setValor] = useState(guardada != null ? String(guardada) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValor(guardada != null ? String(guardada) : ''), [guardada]);

  const guardar = async () => {
    const canones = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
    if (canones !== null && (!Number.isFinite(canones) || canones < 0 || canones > 99)) {
      setError('La penalidad va en cánones, entre 0 y 99.');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onSave?.({ penalidadTerminacionCanones: canones });
    } catch {
      // El padre ya lo dijo en un toast, por el traductor. Sin este `catch`
      // el rechazo quedaba sin atrapar (tanda 2 de errores, 02-10-2026).
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-card p-5"
      data-testid="config-penalidad-de-terminacion"
    >
      <div>
        <h3 className="text-sm font-medium">Penalidad por terminación anticipada</h3>
        <p className="text-xs text-muted-foreground">
          Cuántos cánones se le cobran al inquilino que termina antes, y el máximo que se le puede cobrar: al
          terminar se puede cobrar menos, nunca más. Cada contrato la puede cambiar. Le llega al propietario
          menos la comisión; al terminar se puede negociar un reparto con la inmobiliaria.{' '}
          {/* Va en el mismo párrafo: la línea base de `text-xs` (doce-pixeles) no sube. */}
          <span data-testid="penalidad-es-el-maximo">
            {guardada == null
              ? 'Sin cánones no hay máximo: al terminar se puede escribir cualquier valor.'
              : Number(guardada) === 0
                ? 'Con 0 cánones no se cobra penalidad al terminar un contrato.'
                : `Al terminar un contrato no se podrá cobrar más de ${String(guardada).replace('.', ',')} ${
                    Number(guardada) === 1 ? 'canon' : 'cánones'
                  }.`}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs" htmlFor="penalidad-por-defecto">
          Cánones
          <Input
            id="penalidad-por-defecto"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Sin penalidad"
            disabled={!canEdit || guardando}
            className="mt-1 w-28"
            data-testid="penalidad-por-defecto"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="penalidad-por-defecto-error"
          />
        </label>
        <Button size="sm" variant="outline" disabled={!canEdit || guardando} onClick={() => void guardar()}>
          Guardar
        </Button>
      </div>
      <ErrorDelCampo id="penalidad-por-defecto-error" mensaje={error} className="mt-0" />
    </section>
  );
}
