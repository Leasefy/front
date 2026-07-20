'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CaretLeft, ShieldCheck, CheckCircle, Warning } from '@phosphor-icons/react';
import { Button, Card, Spinner } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ownerSeleccionApi } from '@/lib/api/owner-seleccion.service';
import type { EleccionComparacion } from '@/lib/api/owner-seleccion.types';

interface ComparacionViewProps {
  agencyId: string | null;
  processId: string;
  comparacion: EleccionComparacion;
  reload: () => void;
}

/**
 * Comparación de postulados asegurables + elección one-click (F2).
 *
 * Invariantes respetadas:
 * - **WYSIWYS**: `elegir` reenvía el `snapshotHash` de ESTA comparación. Si el back responde
 *   `terms_changed` → recargamos y avisamos (no forzamos).
 * - **CAS**: si otro click ganó (conflict) → avisamos; el estado lo fija el back, sin optimismo.
 * - **Anti-PII**: sólo se muestran los campos del shape mínimo (nombre, verdict, score, elegible).
 */
export function ComparacionView({ agencyId, processId, comparacion, reload }: ComparacionViewProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [chosenName, setChosenName] = useState<string | null>(null);

  async function confirmElegir(candidacyId: string, candidateName: string) {
    setSubmitting(true);
    try {
      const res = await ownerSeleccionApi.elegir(agencyId, processId, candidacyId, comparacion.snapshotHash);
      if (res.ok) {
        setChosenName(candidateName);
        setPendingId(null);
        return;
      }
      // WYSIWYS: el set mostrado cambió → recargar la comparación y avisar.
      if (res.status === 409 || res.error === 'terms_changed') {
        toast('La lista de postulados cambió', {
          description: 'La actualizamos para que elijas sobre la versión vigente.',
        });
        setPendingId(null);
        reload();
        return;
      }
      if (res.status === 0) {
        toast('Próximamente', {
          description: 'La elección se habilita cuando tu inmobiliaria active el Portal del Propietario.',
        });
        return;
      }
      toast('No pudimos registrar la elección', { description: res.error ?? 'Intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/panel/seleccion"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <CaretLeft className="w-4 h-4" /> Elegir inquilino
        </Link>

        <h1 className="text-2xl font-semibold">Compará y elegí</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Postulados asegurables de tu inmueble. Tu elección se auto-valida y habilita el contrato.
        </p>

        {chosenName && (
          <Card className="p-4 mt-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary shrink-0" weight="fill" />
            <p className="text-sm">
              Elegiste a <span className="font-medium">{chosenName}</span>. Tu inmobiliaria continúa con el contrato.
            </p>
          </Card>
        )}

        {comparacion.candidates.length === 0 ? (
          <Card className="p-6 mt-6">
            <p className="text-sm text-muted-foreground">
              Todavía no hay postulados para comparar en este proceso.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {comparacion.candidates.map((c) => {
              const isPending = pendingId === c.id;
              const canChoose = c.elegible && !chosenName;
              return (
                <Card key={c.id} className="p-4 flex flex-col gap-3">
                  <div>
                    <p className="font-medium truncate">{c.candidateName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.stage.replace(/_/g, ' ')}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        c.elegible ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-muted-foreground'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {c.insurabilityVerdict ?? (c.elegible ? 'Asegurable' : 'Sin verdicto')}
                    </span>
                    {c.score != null && (
                      <span className="text-xs text-muted-foreground">Score {c.score}</span>
                    )}
                  </div>

                  <div className="mt-auto pt-1">
                    {!canChoose ? (
                      <p className="text-xs text-muted-foreground">
                        {chosenName ? 'Proceso resuelto' : 'No elegible'}
                      </p>
                    ) : isPending ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <Warning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          Elegir a {c.candidateName} habilita el contrato. ¿Confirmás?
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => confirmElegir(c.id, c.candidateName)} disabled={submitting} hideArrow>
                            {submitting ? <Spinner size="sm" /> : 'Confirmar'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setPendingId(null)} disabled={submitting} hideArrow>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setPendingId(c.id)} hideArrow>
                        Elegir
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
