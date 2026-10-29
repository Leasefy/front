'use client';

/**
 * Nico, 29-10-2026: la fecha en que el inquilino entregó DE VERDAD el inmueble
 * (el contrato termina el 30 y lo entregó el 25). Es sólo el dato de la
 * desocupación: no termina el contrato ni cobra nada (eso es «Terminar»).
 * Sin la actualización del back, se dice y no se guarda.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { fechaLegible } from '@/components/estado-de-cuenta/filas';
import { contratoAlCrearApi } from '@/lib/api/contrato-al-crear.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export function FechaRealDeEntrega({ contractId, puedeEditar }: { contractId: string; puedeEditar: boolean }) {
  const [fecha, setFecha] = useState<string | null>(null);
  const [disponible, setDisponible] = useState(true);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.resolve()
      .then(() => contratoAlCrearApi.entregaReal(contractId))
      .then((r) => {
        if (!vivo) return;
        setFecha(r.fecha);
        setDisponible(r.disponible);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [contractId]);

  const guardar = async (nueva: string | null) => {
    setGuardando(true);
    try {
      const r = await contratoAlCrearApi.guardarEntregaReal(contractId, nueva);
      setFecha(r.fecha);
      setEditando(false);
      toast.success(nueva ? 'Fecha de entrega guardada.' : 'Fecha de entrega quitada.');
    } catch (err) {
      toast.error('No se pudo guardar la fecha de entrega.', { description: mensajeParaLaPersona(err) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-3" data-testid="fecha-real-de-entrega">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm text-fg">Entrega real del inmueble</p>
          <p className="text-sm text-muted-foreground">
            {!disponible
              ? 'Falta una actualización de Leasefy para guardar esta fecha.'
              : fecha
                ? `El inquilino lo entregó el ${fechaLegible(fecha)}.`
                : 'Todavía no se ha entregado. Anota el día en que el inquilino lo entregó de verdad.'}
          </p>
        </div>
        {puedeEditar && disponible && !editando && (
          <Button type="button" variant="secondary" hideArrow onClick={() => { setValor(fecha ?? ''); setEditando(true); }}>
            {fecha ? 'Cambiar fecha' : 'Anotar la entrega'}
          </Button>
        )}
      </div>
      {editando && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <CampoDeDia id={`entrega-real-${contractId}`} value={valor} onChange={setValor} />
          </div>
          <Button type="button" hideArrow disabled={!valor || guardando} onClick={() => void guardar(valor)}>
            Guardar
          </Button>
          {fecha && (
            <Button type="button" variant="ghost" hideArrow disabled={guardando} onClick={() => void guardar(null)}>
              Quitar la fecha
            </Button>
          )}
          <Button type="button" variant="ghost" hideArrow disabled={guardando} onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </section>
  );
}
