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
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
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
      toast.success(nueva ? `Listo: entregó el inmueble el ${fechaLarga(nueva)}.` : 'Fecha de entrega quitada.');
    } catch (err) {
      toast.error('No se pudo guardar la fecha de entrega.', { description: mensajeParaLaPersona(err) });
    } finally {
      setGuardando(false);
    }
  };

  /*
   * Revisión con datos de Portofino (29-10, tarde): en un contrato recién
   * creado «Todavía no se ha entregado» se leía como la entrega AL inquilino.
   * Ahora dice que es la devolución, va en una línea (es un dato de consulta,
   * no la tarea de la pantalla), la fecha en frase y los botones pequeños.
   */
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card px-4 py-3" data-testid="fecha-real-de-entrega">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 text-sm text-fg-muted">
          <span className="text-fg">Entrega real del inmueble</span>
          {' · '}
          {!disponible
            ? 'Falta una actualización de Leasefy para guardar esta fecha.'
            : fecha
              ? `El inquilino lo entregó el ${fechaLarga(fecha)}.`
              : 'Cuando el inquilino lo devuelva, anota el día real (aunque el contrato termine otro día).'}
        </p>
        {puedeEditar && disponible && !editando && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => {
              setValor(fecha ?? '');
              setEditando(true);
            }}
            data-testid="anotar-la-entrega"
          >
            {fecha ? 'Cambiar la fecha' : 'Anotar la entrega'}
          </Button>
        )}
      </div>
      {editando && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <CampoDeDia id={`entrega-real-${contractId}`} value={valor} onChange={setValor} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" hideArrow isLoading={guardando} disabled={!valor || guardando} onClick={() => void guardar(valor)}>
              Guardar la fecha
            </Button>
            {fecha && (
              <Button type="button" variant="ghost" size="sm" hideArrow disabled={guardando} onClick={() => void guardar(null)}>
                Quitar la fecha
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" hideArrow disabled={guardando} onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
