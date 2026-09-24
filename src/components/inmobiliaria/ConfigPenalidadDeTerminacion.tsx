'use client';

/**
 * La penalidad por defecto por terminación anticipada del inquilino (Nico,
 * 17-09): «valor por defecto por inmobiliaria (ej. 3 cánones), editable por
 * contrato». Normalmente es del propietario —le llega menos la comisión— y al
 * terminar se puede negociar un reparto con la inmobiliaria.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          Cuántos cánones se le cobran al inquilino que termina antes. Cada contrato la puede cambiar. Le
          llega al propietario menos la comisión; al terminar se puede negociar un reparto con la inmobiliaria.
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
          />
        </label>
        <Button size="sm" variant="outline" disabled={!canEdit || guardando} onClick={() => void guardar()}>
          Guardar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
