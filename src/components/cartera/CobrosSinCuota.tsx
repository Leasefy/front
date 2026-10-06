'use client';

/**
 * Los cobros SIN CUOTA («fantasma») y su plata, para el administrador
 * (PG-07 / ARREGLOS-9, QA de Pagos, 03-10-2026).
 *
 * Lo que Iván pagó a los cobros de junio y julio —meses que su contrato no
 * cobra: su cartera empieza en agosto— no aparecía en su estado de cuenta: la
 * plata quedó colgada de documentos que no corresponden a ninguna cuota. El
 * back ya no crea esos cobros y publicó cómo arreglar los que quedaron
 * (`/inmobiliaria/cobros-fantasma`): re-aplicar anula esos recibos y vuelve a
 * recibir la misma plata contra la deuda más vieja del contrato, con rastro.
 *
 * Esta pieza es mínima a propósito: sólo aparece si hay alguno, sólo para el
 * administrador (re-aplicar anula recibos: PG-R06) y pregunta antes de mover
 * plata. Un cobro fantasma SIN plata no se re-aplica: se anula desde su fila.
 */

import { useCallback, useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cobrosFantasmaApi, type CobroFantasma } from '@/lib/api/cobros-fantasma.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/recaudo/meses';

function numerosDeLosRecibos(c: CobroFantasma): string {
  return c.recibos.map((r) => `#${r.numero}`).join(', ');
}

export function CobrosSinCuota({ onReaplicado }: { onReaplicado?: () => void }) {
  const esAdmin = usePermissionsContextSafe()?.isAdmin ?? false;
  const [lista, setLista] = useState<CobroFantasma[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [abierto, setAbierto] = useState(false);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await cobrosFantasmaApi.listar());
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (esAdmin) void cargar();
  }, [esAdmin, cargar]);

  const reaplicar = useCallback(
    async (c: CobroFantasma) => {
      const si = await confirmar({
        titulo: `¿Re-aplicar la plata del cobro de ${nombreDelMes(c.month)}?`,
        descripcion: `Se anulan sus recibos (${numerosDeLosRecibos(c)}) y la misma plata —${formatCurrency(c.pagadoCop)}— se vuelve a recibir contra la deuda más vieja del contrato, con la misma fecha. Queda el rastro de lo que se hizo.`,
        accion: 'Re-aplicar la plata',
      });
      if (!si) return;
      setTrabajando(c.cobroId);
      try {
        const r = await cobrosFantasmaApi.reaplicar(c.cobroId);
        const nuevos = r.recibos.reduce((n, x) => n + x.nuevos.length, 0);
        toast.success('Plata re-aplicada a la deuda real', {
          description: `${r.recibos.length === 1 ? 'Se anuló 1 recibo' : `Se anularon ${r.recibos.length} recibos`} y ${nuevos === 1 ? 'salió 1 nuevo' : `salieron ${nuevos} nuevos`} contra las cuotas del contrato.`,
        });
        await cargar();
        onReaplicado?.();
      } catch (e) {
        toast.error('No se re-aplicó la plata', {
          description: mensajeParaLaPersona(e, { accion: 're-aplicar la plata del cobro' }),
        });
      } finally {
        setTrabajando(null);
      }
    },
    [cargar, onReaplicado],
  );

  if (!esAdmin) return null;
  if (error) {
    return (
      <p className="text-caption text-fg-muted" data-testid="cobros-sin-cuota-fallo">
        No pudimos revisar si hay cobros sin cuota: {mensajeParaLaPersona(error, { accion: 'revisar los cobros sin cuota' })}{' '}
        <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => void cargar()}>
          Reintentar
        </button>
      </p>
    );
  }
  if (!lista || lista.length === 0) return null;

  const conPlata = lista.filter((c) => c.accion === 'REAPLICAR');
  const plata = conPlata.reduce((s, c) => s + c.pagadoCop, 0);

  return (
    <>
      <Appear distance="xs">
        <div
          className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg sm:flex-row sm:items-center sm:justify-between"
          data-testid="cobros-sin-cuota"
        >
          <p className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              {lista.length === 1 ? 'Hay 1 cobro sin cuota' : `Hay ${lista.length} cobros sin cuota`}: de meses que su contrato
              no cobra.
              {conPlata.length > 0 && (
                <>
                  {' '}
                  {conPlata.length === 1 ? 'Uno se llevó' : `${conPlata.length} se llevaron`}{' '}
                  <span className="font-mono tabular-nums">{formatCurrency(plata)}</span> que no está en la deuda real.
                </>
              )}
            </span>
          </p>
          <Button variant="secondary" size="sm" hideArrow onClick={() => setAbierto(true)} data-testid="cobros-sin-cuota-revisar">
            Revisar
          </Button>
        </div>
      </Appear>

      <Cajon abierto={abierto} onOpenChange={setAbierto} tamano="md" data-testid="cajon-cobros-sin-cuota">
        <CajonCabecera
          titulo="Cobros sin cuota"
          descripcion="Cobros de meses que el contrato no cobra. La plata que recibieron no está en la deuda real: re-aplicarla la vuelve a recibir contra las cuotas del contrato."
        />
        <CajonCuerpo className="space-y-3">
          {lista.map((c) => (
            <section
              key={c.cobroId}
              className="space-y-2 rounded-lg border border-border-faint bg-surface-muted/40 p-4"
              data-testid="cobro-sin-cuota"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{c.tenantName ?? 'Sin nombre en el contrato'}</p>
                  <p className="text-caption text-fg-muted">
                    {c.contratoNumero !== null ? `Contrato #${c.contratoNumero} · ` : ''}
                    {nombreDelMes(c.month)}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-fg">{formatCurrency(c.totalCop)}</span>
              </div>
              {c.accion === 'REAPLICAR' ? (
                <>
                  <p className="text-caption text-fg-muted">
                    Recibió <span className="font-mono tabular-nums">{formatCurrency(c.pagadoCop)}</span> en{' '}
                    {c.recibos.length === 1 ? 'el recibo' : 'los recibos'} {numerosDeLosRecibos(c)}.
                  </p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      hideArrow
                      onClick={() => void reaplicar(c)}
                      isLoading={trabajando === c.cobroId}
                      disabled={trabajando !== null}
                      data-testid="reaplicar-cobro-sin-cuota"
                    >
                      Re-aplicar la plata
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-caption text-fg-muted">
                  No se llevó plata: anúlalo desde su fila en la tabla (⋮ › Anular cobro).
                </p>
              )}
            </section>
          ))}
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        </CajonPie>
      </Cajon>
    </>
  );
}
