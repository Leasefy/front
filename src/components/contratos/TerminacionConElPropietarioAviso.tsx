'use client';

/**
 * La terminación que espera (o ya respondió) el propietario, en la ficha del
 * contrato (reunión con Portofino, 22-10-2026). Pendiente: desde cuándo y
 * «Retirar». Respondida que no: su motivo. Aprobada: ya quedó terminado (la
 * ficha lo dice por su lado). Sin nada, no se pinta.
 */
import { useCallback, useEffect, useState } from 'react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cicloDeVidaApi, type TerminacionConElPropietario } from '@/lib/api/ciclo-de-vida.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaLegible } from '@/lib/mandato/textos';

export function TerminacionConElPropietarioAviso({
  contractId,
  puedeEditar,
  version = 0,
}: {
  contractId: string;
  puedeEditar: boolean;
  /** Súbelo para volver a leer (después de pedirla). */
  version?: number;
}) {
  const [t, setT] = useState<TerminacionConElPropietario | null>(null);
  const [retirando, setRetirando] = useState(false);

  const leer = useCallback(() => {
    cicloDeVidaApi
      .terminacionConElPropietario(contractId)
      .then(setT)
      .catch(() => setT(null));
  }, [contractId]);

  useEffect(() => {
    leer();
  }, [leer, version]);

  const retirar = async () => {
    setRetirando(true);
    try {
      await cicloDeVidaApi.retirarTerminacionConElPropietario(contractId);
      toast.success('Retiraste la terminación: el propietario ya no la ve.');
      setT(null);
    } catch (e) {
      toast.error('No se pudo retirar', { description: mensajeParaLaPersona(e, { accion: 'retirar la terminación' }) });
    } finally {
      setRetirando(false);
    }
  };

  const visible = t && (t.estado === 'PENDIENTE' || t.estado === 'RECHAZADA');
  return (
    <Presence show={!!visible} direction="down">
      {t?.estado === 'PENDIENTE' ? (
        // Glow up 23-10: el estado por el punto y la palabra (StatusBadge), no por un bloque ámbar con su ícono.
        <div
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="terminacion-pendiente-del-propietario"
        >
          <div className="min-w-0 space-y-1.5">
            <StatusBadge tone="warning">Esperando al propietario</StatusBadge>
            <p className="text-body-sm text-fg">
              Esperando el sí del propietario para terminar el {diaLegible(t.terminadoEn)} por «{t.nombreDelMotivo}».
              <span className="block text-caption text-fg-muted">Se lo pedimos el {diaLegible(t.pedidaAt.slice(0, 10))}. El contrato sigue igual hasta que responda.</span>
            </p>
          </div>
          {puedeEditar ? (
            <Button variant="secondary" size="sm" hideArrow className="shrink-0" isLoading={retirando} onClick={() => void retirar()}>
              Retirar
            </Button>
          ) : null}
        </div>
      ) : t?.estado === 'RECHAZADA' ? (
        <div className="space-y-1.5 rounded-lg border border-border bg-card p-4" data-testid="terminacion-rechazada-por-el-propietario">
          <StatusBadge tone="critical">El propietario no aceptó</StatusBadge>
          <p className="text-body-sm text-fg">
            El propietario no aceptó terminar el {diaLegible(t.terminadoEn)}: «{t.motivoDeLaRespuesta}».
            <span className="block text-caption text-fg-muted">El contrato sigue igual. Si hablan otra cosa, puedes volver a pedírselo.</span>
          </p>
        </div>
      ) : null}
    </Presence>
  );
}
