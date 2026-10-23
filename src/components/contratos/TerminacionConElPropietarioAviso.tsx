'use client';

/**
 * La terminación que espera (o ya respondió) el propietario, en la ficha del
 * contrato (reunión con Portofino, 22-10-2026). Pendiente: desde cuándo y
 * «Retirar». Respondida que no: su motivo. Aprobada: ya quedó terminado (la
 * ficha lo dice por su lado). Sin nada, no se pinta.
 */
import { useCallback, useEffect, useState } from 'react';
import { HourglassMedium, XCircle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

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
        <div
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="terminacion-pendiente-del-propietario"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <HourglassMedium className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Esperando el sí del propietario para terminar el {diaLegible(t.terminadoEn)} por «{t.nombreDelMotivo}».
              <span className="block text-caption text-muted-foreground">Se lo pedimos el {diaLegible(t.pedidaAt.slice(0, 10))}. El contrato sigue igual hasta que responda.</span>
            </span>
          </p>
          {puedeEditar ? (
            <Button variant="secondary" size="sm" hideArrow className="shrink-0" isLoading={retirando} onClick={() => void retirar()}>
              Retirar
            </Button>
          ) : null}
        </div>
      ) : t?.estado === 'RECHAZADA' ? (
        <div className="rounded-lg border border-border bg-card p-4" data-testid="terminacion-rechazada-por-el-propietario">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              El propietario no aceptó terminar el {diaLegible(t.terminadoEn)}: «{t.motivoDeLaRespuesta}».
              <span className="block text-caption text-muted-foreground">El contrato sigue igual. Si hablan otra cosa, puedes volver a pedírselo.</span>
            </span>
          </p>
        </div>
      ) : null}
    </Presence>
  );
}
