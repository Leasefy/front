'use client';

/**
 * La bitácora del contrato: lo que se decidió sobre el mandato y la plata del
 * propietario, con su anexo cuando lo tiene (la certificación bancaria, el
 * soporte de la aprobación).
 *
 * Es la regla del 17-09 para el cambio de cuenta: «todo queda en la bitácora
 * del contrato, con el archivo de la aprobación anexo». Acá se lee; nadie
 * escribe a mano.
 */

import { useCallback, useEffect, useState } from 'react';
import { ClockCounterClockwise, Paperclip } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { mandatoApi, type EntradaDeLaBitacora } from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

export function BitacoraDelContrato({ contractId }: { contractId: string }) {
  const [entradas, setEntradas] = useState<EntradaDeLaBitacora[] | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const b = await mandatoApi.bitacora(contractId);
      setEntradas(b.entradas);
      setMotivo(b.disponible ? null : b.motivo);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function abrirAnexo(entrada: EntradaDeLaBitacora) {
    try {
      const { url } = await mandatoApi.anexoDeLaBitacora(contractId, entrada.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No se pudo abrir el anexo.', { description: mensajeDelFallo(e, '') });
    }
  }

  // Sin bitácora (o sin la migración) la ficha no cambia: nada que contar.
  if (!cargando && !error && (entradas?.length ?? 0) === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden" data-testid="bitacora-del-contrato">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ClockCounterClockwise className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Bitácora del mandato</h3>
      </div>
      <div className="p-5">
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!entradas}
          queEs="la bitácora del contrato"
          onReintentar={cargar}
        >
          {motivo ? <p className="mb-3 text-sm text-warning">{motivo}</p> : null}
          <ol className="space-y-3">
            {(entradas ?? []).map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3">
                <p className="text-sm font-medium text-foreground">{e.titulo}</p>
                {e.detalle ? (
                  <p className="text-xs text-muted-foreground">{e.detalle}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {e.actorNombre ? ` · ${e.actorNombre}` : ''}
                </p>
                {e.tieneAnexo ? (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => void abrirAnexo(e)}
                  >
                    <Paperclip className="w-3 h-3" aria-hidden="true" />
                    {e.anexoNombre ?? 'Ver el anexo'}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </EstadoDeDatos>
      </div>
    </section>
  );
}
