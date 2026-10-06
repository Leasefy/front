'use client';

/**
 * El cierre de período, y debajo su reverso.
 *
 * Cerrar hasta una fecha bloquea todo asiento con fecha igual o anterior: no
 * entra ninguno nuevo, y las reversas van con fecha posterior. Por eso la
 * confirmación pide escribir la fecha: un clic de más no puede cerrar un mes.
 *
 * ── Desde el 19-09 SÍ se deshace, y por eso están juntos ───────────────────
 *
 * `POST /asientos/reabrir` mueve la frontera hacia atrás — sólo el ADMIN, con
 * motivo y bitácora. Vive dentro de esta misma tarjeta (`<Reapertura>`) y no
 * en otra pantalla a propósito: cerrar y reabrir son la misma frontera, y
 * quien está mirando «cerrada hasta el 31 de diciembre» es quien necesita
 * poder deshacerlo. 🔴 Ojo con el vocabulario: el `hasta` del cierre es el
 * último día que queda CERRADO; el de la reapertura es el primero que se
 * vuelve a poder ESCRIBIR.
 */

import { useCallback, useId, useMemo, useState } from 'react';
import { plata } from '@/lib/contabilidad/plata';
import { toast } from '@/components/ui/toast';
import { LockKey, LockSimple, LockSimpleOpen } from '@phosphor-icons/react';
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
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  contabilidadApi,
  type Cierre,
  type ResultadoDeCierre,
  type SinAsentar,
} from '@/lib/api/contabilidad.service';
import { aTextoDeDia, diaDe, diaLegible } from '@/lib/contabilidad/fechas';
import { elPeriodoEnUnaFrase, estadoDelPeriodo } from '@/lib/contabilidad/el-periodo-en-una-frase';
import { CampoDeDia } from '../CampoDeDia';
import { Reapertura } from './Reapertura';

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
  /**
   * Se reabrió: la frontera se movió hacia ATRÁS. Quien monta esta tarjeta
   * tiene que volver a pedir el cierre y la lista, igual que con `onCerrado`.
   */
  onReabierto?: () => void;
}

/** «Hay 3 movimientos sin asiento hasta el 30 sep 2026 (2 recibos, 1 cobro): …». */
export function fraseDeLoSinAsentar(
  s: { recibos: number; lotes: number; cobros: number; total: number; valorCop?: number | null },
  hasta: string | null,
): string {
  const partes = [
    s.recibos ? `${s.recibos} ${s.recibos === 1 ? 'recibo' : 'recibos'}` : null,
    s.lotes ? `${s.lotes} ${s.lotes === 1 ? 'lote' : 'lotes'}` : null,
    s.cobros ? `${s.cobros} ${s.cobros === 1 ? 'cobro' : 'cobros'}` : null,
  ].filter(Boolean);
  const cuantos = s.total === 1 ? 'Hay 1 movimiento sin asiento' : `Hay ${s.total.toLocaleString('es-CO')} movimientos sin asiento`;
  // CB-B-25 (QA-FACT-CONTA-95 r2): y cuánta plata es, si el back la sabe.
  const cuanto =
    typeof s.valorCop === 'number' && s.valorCop > 0 ? ` por ${plata(s.valorCop)}` : '';
  return `${cuantos}${hasta ? ` hasta el ${diaLegible(hasta)}` : ''}${partes.length ? ` (${partes.join(', ')})` : ''}${cuanto}: asiéntalos («Reprocesar» en el inicio de Contabilidad) antes de cerrar, o quedan por fuera del período.`;
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
  onReabierto,
}: CierreDePeriodoProps) {
  const id = useId();
  const cerradaHasta = cierre?.cerradaHasta ?? null;
  /** Back 26beefbc (CB-R06): sólo se cierran meses terminados, hasta este día. */
  const sePuedeCerrarHasta = cierre?.sePuedeCerrarHasta ?? null;
  const sinAsentar = cierre?.sinAsentar ?? null;
  const [hasta, setHasta] = useState(ultimoDiaDelMesAnterior);
  const [confirmando, setConfirmando] = useState(false);
  const [escrito, setEscrito] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * El error que el back puso en `hasta` (un 400 con `campos`). Va bajo la
   * fecha escrita en el diálogo, que es donde está la persona y es el mismo
   * dato.
   */
  const [errorDeLaFecha, setErrorDeLaFecha] = useState<string | null>(null);
  /**
   * 🔴 QA-FACT-CONTA-95 r2 (CB-B-25): lo que quedaría sin asiento si se cierra
   * hasta la fecha ELEGIDA, dicho DENTRO del diálogo y antes de confirmar
   * (cuántos y cuánta plata). Se pregunta al abrir; si falla, el diálogo sigue.
   */
  const [sinAsentarAlCerrar, setSinAsentarAlCerrar] = useState<SinAsentar | null>(null);

  const problema = useMemo(() => {
    if (!diaDe(hasta)) return 'Elige un día.';
    if (cerradaHasta && hasta <= cerradaHasta) {
      return `Ya está cerrada hasta el ${diaLegible(cerradaHasta)}: la nueva fecha tiene que ser posterior.`;
    }
    if (sePuedeCerrarHasta && hasta > sePuedeCerrarHasta) {
      return `Sólo se cierran meses terminados: hasta el ${diaLegible(sePuedeCerrarHasta)}.`;
    }
    return null;
  }, [hasta, cerradaHasta, sePuedeCerrarHasta]);

  const abrir = useCallback(() => {
    setEscrito('');
    setError(null);
    setErrorDeLaFecha(null);
    setSinAsentarAlCerrar(null);
    setConfirmando(true);
    void Promise.resolve()
      .then(() => contabilidadApi.asientos.cierre(hasta))
      .then((c) => setSinAsentarAlCerrar(c?.sinAsentar ?? null))
      .catch(() => setSinAsentarAlCerrar(null));
  }, [hasta]);

  const cerrarDialogo = useCallback(() => {
    if (enviando) return;
    setConfirmando(false);
  }, [enviando]);

  const confirmar = useCallback(async () => {
    if (escrito !== hasta) return;
    setEnviando(true);
    setError(null);
    setErrorDeLaFecha(null);
    try {
      const r = await contabilidadApi.asientos.cerrar(hasta);
      toast.success(`Contabilidad cerrada hasta el ${diaLegible(r.hasta)}`, {
        description:
          r.cerrados === 1
            ? '1 asiento quedó bloqueado.'
            : `${r.cerrados.toLocaleString('es-CO')} asientos quedaron bloqueados.`,
      });
      // Back 26beefbc: lo que quedó sin asiento adentro del período, se dice.
      if (r.sinAsentar && r.sinAsentar.total > 0) {
        toast.warning(fraseDeLoSinAsentar(r.sinAsentar, r.hasta));
      }
      setConfirmando(false);
      // La fecha del control avanza al fin del mes siguiente al cierre. Si se
      // quedara en la fecha recién cerrada, `problema` diría en rojo «Ya está
      // cerrada hasta X» sobre un cierre que acaba de salir bien (auditoría
      // 2026-09-01).
      setHasta(finDelMesSiguiente(r.hasta));
      onCerrado?.(r);
    } catch (e) {
      // Un 400 con `campos` en `hasta` va bajo la fecha; el resto (un código
      // de negocio, un 5xx, la red) al banner, con la regla de oro.
      const reparto = repartirErroresDelServidor(e, { campos: ['hasta'] });
      if (reparto.porCampo.hasta) setErrorDeLaFecha(reparto.porCampo.hasta);
      if (reparto.delServidor.length === 0) {
        setError(mensajeDeContabilidad(e, 'No se pudo cerrar el período.'));
      } else if (reparto.sueltos.length > 0) {
        setError(reparto.sueltos.join(' · '));
      }
    } finally {
      setEnviando(false);
    }
  }, [escrito, hasta, onCerrado]);

  const periodo = elPeriodoEnUnaFrase(estadoDelPeriodo(cierre, cargando, fallo));
  const Candado =
    periodo?.candado === 'abierto'
      ? LockSimpleOpen
      : periodo?.candado === 'cerrado'
        ? LockSimple
        : LockKey;

  return (
    <section
      className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm"
      aria-labelledby={`${id}-titulo`}
      aria-busy={cargando || undefined}
      data-testid="cierre-de-periodo"
    >
      {/* 🔴 22-09 · EL ESTADO VA PRIMERO, EN UNA FRASE (Nico: «eso se ve por
          ahí tirado todo»). Es lo que un contador busca en esta tarjeta —«¿puedo
          asentar en agosto?»— y antes era un párrafo gris debajo del título.
          La explicación larga (qué bloquea, cómo se deshace) va detrás de
          «Cómo funciona», no puesta sobre la pantalla. */}
      <header className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted"
          aria-hidden="true"
        >
          <Candado className="h-5 w-5 text-fg-muted" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 id={`${id}-titulo`} className="text-sm font-semibold text-fg">
              Período contable
            </h2>
            <ParaEntenderMas
              etiqueta="Cómo funciona"
              titulo="Cerrar y reabrir un período"
              className="-my-1 h-auto px-2 py-1"
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  Cerrar hasta una fecha bloquea todo asiento con esa fecha o anterior: no entra
                  ninguno nuevo, y lo que esté mal se corrige con una reversa fechada después.
                </p>
                <p>
                  Para confirmar se escribe la fecha tal cual: un clic de más no puede cerrar un mes.
                </p>
                <p>
                  Reabrir mueve la frontera hacia atrás. Lo hace sólo el administrador, con un motivo
                  que queda en la bitácora con su nombre y la fecha. Los asientos que ya estaban
                  marcados como cerrados no se desmarcan: corregir sigue siendo por reversa.
                </p>
              </div>
            </ParaEntenderMas>
          </div>
          {periodo ? (
            <>
              <p className="text-body font-medium text-fg" data-testid="estado-del-periodo">
                {periodo.frase}
              </p>
              {periodo.detalle ? (
                <p className="text-caption text-fg-muted">{periodo.detalle}</p>
              ) : null}
            </>
          ) : (
            // La FORMA de la frase que va a llegar, no una barra suelta.
            <div className="space-y-2 py-1" data-testid="estado-del-periodo-cargando">
              <Skeleton className="h-5 w-full max-w-xs rounded-sm bg-surface-muted" />
              <Skeleton className="h-3.5 w-2/3 max-w-[14rem] rounded-sm bg-surface-muted" />
            </div>
          )}
        </div>
      </header>

      {/* Cerrar: la acción de todos los meses, con forma de acción — un grupo
          con su nombre, el día y el botón, en un pozo que lo separa de lo que
          se lee. Durante la carga se ve igual pero apagado: la forma no salta
          cuando llega el dato. */}
      <div
        className="space-y-3 rounded-md border border-border-faint bg-surface-muted p-4"
        role="group"
        aria-labelledby={`${id}-cerrar`}
      >
        <p id={`${id}-cerrar`} className="text-sm font-medium text-fg">
          Cerrar el período
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-hasta`} className="text-caption text-fg-muted">
              Hasta el día
            </Label>
            {/* 🔴 CB-04: el selector de fecha del DS, no el `<input type="date">`
                del navegador (se cortaba y decía «30/09/2026» en el formato del
                sistema). */}
            <CampoDeDia
              id={`${id}-hasta`}
              value={hasta}
              min={cerradaHasta ?? undefined}
              max={sePuedeCerrarHasta ?? undefined}
              onChange={setHasta}
              disabled={cargando || enviando}
              invalido={Boolean(problema) && !cargando}
              describedBy={problema && !cargando ? `${id}-hasta-error` : undefined}
              className="w-48 bg-surface"
              testid="cierre-hasta"
            />
          </div>
          <Button
            variant="outline"
            hideArrow
            className="bg-surface"
            onClick={abrir}
            disabled={cargando || enviando || Boolean(problema)}
            data-testid="abrir-cierre"
          >
            <LockSimple className="h-4 w-4" aria-hidden="true" />
            Cerrar período…
          </Button>
        </div>
        <ErrorDelCampo id={`${id}-hasta-error`} mensaje={!cargando ? problema : null} />
        {/* Back 26beefbc: cerrar con movimientos sin asiento los deja afuera del período. */}
        {!cargando && sinAsentar && sinAsentar.total > 0 ? (
          <p className="text-caption text-warning" role="status" data-testid="sin-asentar-al-cerrar">
            {fraseDeLoSinAsentar(sinAsentar, sePuedeCerrarHasta)}
          </p>
        ) : null}
      </div>

      <Reapertura
        cerradaHasta={cerradaHasta}
        cargando={cargando}
        fallo={fallo}
        onReabierto={() => onReabierto?.()}
      />

      <Dialog open={confirmando} onOpenChange={(open) => !open && cerrarDialogo()}>
        <DialogContent variant="destructive" icon={<LockKey weight="bold" />} size="sm">
          <DialogHeader>
            <DialogTitle>Cerrar la contabilidad hasta el {diaLegible(hasta)}</DialogTitle>
            <DialogDescription>
              Sólo se deshace reabriendo, y queda en la bitácora con el motivo. Después del
              cierre no entra ningún asiento con fecha igual o anterior al {diaLegible(hasta)};
              lo que esté mal sólo se corrige con una reversa fechada después.
            </DialogDescription>
          </DialogHeader>

          {sinAsentarAlCerrar && sinAsentarAlCerrar.total > 0 ? (
            <Banner variant="warning" role="status" data-testid="sin-asentar-en-el-dialogo">
              {fraseDeLoSinAsentar(sinAsentarAlCerrar, hasta)}
            </Banner>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${id}-escribir`}>
              Para confirmar, escribe la fecha tal cual:{' '}
              <span className="font-mono tabular-nums text-fg">{hasta}</span>
            </Label>
            <Input
              id={`${id}-escribir`}
              value={escrito}
              onChange={(e) => {
                setErrorDeLaFecha(null);
                setEscrito(e.target.value.trim());
              }}
              placeholder="AAAA-MM-DD"
              autoComplete="off"
              disabled={enviando}
              aria-invalid={Boolean(errorDeLaFecha) || undefined}
              aria-describedby={errorDeLaFecha ? `${id}-escribir-error` : undefined}
              className="font-mono"
              data-testid="cierre-escribir"
            />
            <ErrorDelCampo id={`${id}-escribir-error`} mensaje={errorDeLaFecha} />
            {error ? (
              <Banner variant="danger" role="alert">
                {error}
              </Banner>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" hideArrow onClick={cerrarDialogo} disabled={enviando}>
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
