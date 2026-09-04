'use client';

/**
 * El cierre de período.
 *
 * Cerrar hasta una fecha bloquea todo asiento con fecha igual o anterior: no
 * entra ninguno nuevo, y las reversas van con fecha posterior. No se deshace
 * (el back no tiene «reabrir»). Por eso la confirmación pide escribir la
 * fecha: un clic de más no puede cerrar un mes.
 */

import { useCallback, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LockSimple } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type Cierre,
  type ResultadoDeCierre,
} from '@/lib/api/contabilidad.service';
import { aTextoDeDia, diaDe, diaLegible } from '@/lib/contabilidad/fechas';

export interface CierreDePeriodoProps {
  cierre: Cierre | null;
  cargando?: boolean;
  /**
   * ¿La consulta de la frontera falló?
   *
   * 🔴 Sin esto, `cierre: null` significaba dos cosas opuestas: «nunca se
   * cerró nada» y «no pudimos preguntar». La pantalla afirmaba la primera
   * («cualquier fecha admite asientos») sobre un 500, que es una mentira
   * peligrosa: quien la lee cree que puede asentar en un mes cerrado. Un
   * `catch` que devuelve `null` no es evidencia de nada.
   */
  fallo?: boolean;
  onCerrado?: (r: ResultadoDeCierre) => void;
}

/** El último día del mes anterior: lo que normalmente se cierra. */
function ultimoDiaDelMesAnterior(ahora: Date = new Date()): string {
  return aTextoDeDia(new Date(ahora.getFullYear(), ahora.getMonth(), 0));
}

/** «2025-12-31» → «2026-01-31»: el último día del mes que sigue. */
function finDelMesSiguiente(dia: string): string {
  const [y, m] = dia.split('-').map(Number);
  // Día 0 del mes m+2 (1-based) = último día del mes m+1.
  return aTextoDeDia(new Date(y, m + 1, 0));
}

export function CierreDePeriodo({
  cierre,
  cargando = false,
  fallo = false,
  onCerrado,
}: CierreDePeriodoProps) {
  const id = useId();
  const cerradaHasta = cierre?.cerradaHasta ?? null;
  const [hasta, setHasta] = useState(ultimoDiaDelMesAnterior);
  const [confirmando, setConfirmando] = useState(false);
  const [escrito, setEscrito] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problema = useMemo(() => {
    if (!diaDe(hasta)) return 'Elegí un día.';
    if (cerradaHasta && hasta <= cerradaHasta) {
      return `Ya está cerrada hasta el ${diaLegible(cerradaHasta)}: la nueva fecha tiene que ser posterior.`;
    }
    return null;
  }, [hasta, cerradaHasta]);

  const abrir = useCallback(() => {
    setEscrito('');
    setError(null);
    setConfirmando(true);
  }, []);

  const cerrarDialogo = useCallback(() => {
    if (enviando) return;
    setConfirmando(false);
  }, [enviando]);

  const confirmar = useCallback(async () => {
    if (escrito !== hasta) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await contabilidadApi.asientos.cerrar(hasta);
      toast.success(`Contabilidad cerrada hasta el ${diaLegible(r.hasta)}`, {
        description:
          r.cerrados === 1
            ? '1 asiento quedó bloqueado.'
            : `${r.cerrados.toLocaleString('es-CO')} asientos quedaron bloqueados.`,
      });
      setConfirmando(false);
      // La fecha del control avanza al fin del mes siguiente al cierre. Si se
      // quedara en la fecha recién cerrada, `problema` diría en rojo «Ya está
      // cerrada hasta X» sobre un cierre que acaba de salir bien (auditoría
      // 2026-09-01).
      setHasta(finDelMesSiguiente(r.hasta));
      onCerrado?.(r);
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No se pudo cerrar el período.'));
    } finally {
      setEnviando(false);
    }
  }, [escrito, hasta, onCerrado]);

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm"
      aria-labelledby={`${id}-titulo`}
      data-testid="cierre-de-periodo"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-base font-semibold text-fg">
            <LockSimple className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            Cierre de período
          </h2>
          <p className="max-w-xl text-sm text-fg-muted">
            {cargando
              ? 'Consultando hasta dónde está cerrada…'
              : fallo
                ? 'No se pudo consultar hasta dónde está cerrada. Cerrar sigue disponible: el back valida la frontera al recibir la fecha.'
                : cerradaHasta
                ? (
                    <>
                      Cerrada hasta el{' '}
                      <span className="font-mono tabular-nums text-fg" data-testid="cerrada-hasta">
                        {diaLegible(cerradaHasta)}
                      </span>
                      . Nada con fecha igual o anterior se puede asentar ni reversar en esa fecha.
                    </>
                  )
                : 'Todavía no se cerró ningún período: cualquier fecha admite asientos.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-hasta`}>Cerrar hasta</Label>
          <Input
            id={`${id}-hasta`}
            type="date"
            value={hasta}
            min={cerradaHasta ?? undefined}
            onChange={(e) => setHasta(e.target.value)}
            disabled={cargando || enviando}
            aria-invalid={Boolean(problema) || undefined}
            className="w-48"
            data-testid="cierre-hasta"
          />
        </div>
        <Button
          variant="outline"
          hideArrow
          onClick={abrir}
          disabled={cargando || enviando || Boolean(problema)}
          data-testid="abrir-cierre"
        >
          Cerrar período…
        </Button>
        {problema && !cargando ? (
          <p className="basis-full text-xs text-danger" role="alert">
            {problema}
          </p>
        ) : null}
      </div>

      <Dialog open={confirmando} onOpenChange={(open) => !open && cerrarDialogo()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar la contabilidad hasta el {diaLegible(hasta)}</DialogTitle>
            <DialogDescription>
              Esto no se deshace. Después del cierre no entra ningún asiento con fecha igual o
              anterior al {diaLegible(hasta)}; lo que esté mal sólo se corrige con una reversa
              fechada después.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`${id}-escribir`}>
              Para confirmar, escribí la fecha tal cual:{' '}
              <span className="font-mono tabular-nums text-fg">{hasta}</span>
            </Label>
            <Input
              id={`${id}-escribir`}
              value={escrito}
              onChange={(e) => setEscrito(e.target.value.trim())}
              placeholder="AAAA-MM-DD"
              autoComplete="off"
              disabled={enviando}
              className="font-mono"
              data-testid="cierre-escribir"
            />
            {error ? (
              <Banner variant="danger" role="alert">
                {error}
              </Banner>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" hideArrow onClick={cerrarDialogo} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              hideArrow
              onClick={() => void confirmar()}
              isLoading={enviando}
              disabled={enviando || escrito !== hasta}
              data-testid="confirmar-cierre"
            >
              Cerrar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
