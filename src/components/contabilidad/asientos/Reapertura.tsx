'use client';

/**
 * Reabrir un mes cerrado, y la bitácora de quién lo hizo (contrato del 19-09, §1).
 *
 * ── 🔴 El diálogo muestra el RESULTADO antes de confirmar ──────────────────
 *
 * `hasta` es el primer día que se vuelve a poder escribir, NO hasta dónde
 * queda cerrado: con la contabilidad cerrada al 31-dic, «reabrir diciembre» es
 * `2025-12-01` y la frontera queda en el 30-nov. Es exactamente el mismo
 * nombre de campo que el cierre, con el sentido invertido, en la misma
 * tarjeta. Por eso el diálogo no repite la fecha que se escribió: dice «la
 * contabilidad quedará cerrada hasta el 30 de noviembre», calculado con
 * `frasesDeLaReapertura`, que se prueba sola.
 *
 * ── 🔴 El botón es sólo del ADMIN, y a los demás se les dice por qué ───────
 *
 * `SoloAdministradorGuard` responde 403 con «el contador cierra; deshacer el
 * cierre es otra decisión». Un botón que desaparece sin explicación manda a
 * adivinar; acá el botón se ve apagado con ese mismo texto al lado, para que
 * el contador sepa a quién pedírselo en vez de creer que la pantalla está
 * rota.
 *
 * ── El aviso que devuelve el back se muestra y se queda ────────────────────
 *
 * Reabrir NO desmarca los asientos que ya estaban cerrados, y corregir sigue
 * siendo por reversa. Eso no cabe en un toast que se va a los cinco segundos:
 * queda en un cartel dentro de la tarjeta hasta que se recargue la pantalla.
 *
 * ── La bitácora la ve cualquier miembro ────────────────────────────────────
 *
 * `GET /asientos/reaperturas` es de lectura para todos a propósito: que se
 * pueda ver quién deshizo un cierre es justamente el punto de tener bitácora.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { ArrowUUpLeft, ClockCounterClockwise, Info } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import {
  contabilidadApi,
  LARGO_MAXIMO_DEL_MOTIVO_DE_REAPERTURA,
  type BitacoraDeReaperturas,
  type ResultadoDeReapertura,
} from '@/lib/api/contabilidad.service';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { diaLegible } from '@/lib/contabilidad/fechas';
import {
  frasesDeLaReapertura,
  movimientoDeLaFrontera,
  primerDiaDelMesDe,
  problemaDeReapertura,
} from '@/lib/contabilidad/reapertura';
import { FaltaLaMigracion, Nota } from '../piezas';
import { MOTIVO_SIN_REAPERTURA, usePuedeReabrir } from '../use-puede-escribir';

export interface ReaperturaProps {
  /** La frontera vigente, en `AAAA-MM-DD`. `null` = nada cerrado. */
  cerradaHasta: string | null;
  /** Para que el libro y la portada se refresquen con la frontera nueva. */
  onReabierto?: (r: ResultadoDeReapertura) => void;
  /**
   * La frontera todavía no llegó. 🔴 Sin esto, mientras la tarjeta cargaba,
   * `cerradaHasta: null` se leía como «nada cerrado» y el botón explicaba
   * «Con todo abierto no hay nada que reabrir» sobre un dato que nadie había
   * leído todavía — lo encontró la prueba del esqueleto de carga (22-09).
   */
  cargando?: boolean;
  /** La consulta de la frontera falló: `null` NO es «nada cerrado». */
  fallo?: boolean;
}

/**
 * El 403 de la reapertura NO dice lo mismo que el de la escritura contable.
 * `mensajeDeContabilidad` traduce todo 403 a «el administrador o el contador»,
 * y acá el contador es justamente quien no puede.
 */
function mensajeDeReapertura(e: unknown): string {
  if (e instanceof ApiError && e.status === 403) return MOTIVO_SIN_REAPERTURA;
  return mensajeDeContabilidad(e, 'No se pudo reabrir el período.');
}

export function Reapertura({
  cerradaHasta,
  onReabierto,
  cargando = false,
  fallo = false,
}: ReaperturaProps) {
  const id = useId();
  const permiso = usePuedeReabrir();

  const [bitacora, setBitacora] = useState<BitacoraDeReaperturas | null>(null);
  const [cargandoBitacora, setCargandoBitacora] = useState(true);
  const [bitacoraAbierta, setBitacoraAbierta] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [todo, setTodo] = useState(false);
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarBitacora = useCallback(async () => {
    try {
      setBitacora(await contabilidadApi.asientos.reaperturas());
      setCargandoBitacora(false);
    } catch {
      setCargandoBitacora(false);
      /*
       * Sin bitácora la tarjeta sigue sirviendo: reabrir es lo que importa y
       * el back guarda la fila igual. No se pinta una lista vacía —eso diría
       * «nunca se reabrió nada», que es otra cosa—: simplemente no se dibuja
       * el bloque.
       */
      setBitacora(null);
    }
  }, []);

  useEffect(() => {
    void cargarBitacora();
  }, [cargarBitacora]);

  const abrirDialogo = useCallback(() => {
    setTodo(false);
    setHasta(primerDiaDelMesDe(cerradaHasta));
    setMotivo('');
    setError(null);
    setAbierto(true);
  }, [cerradaHasta]);

  const fechaPedida = todo ? '' : hasta;
  const problema = problemaDeReapertura({ cerradaHasta, hasta: fechaPedida, motivo });
  const frases = frasesDeLaReapertura(fechaPedida, cerradaHasta);

  const confirmar = useCallback(async () => {
    if (problema) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await contabilidadApi.asientos.reabrir(fechaPedida || null, motivo.trim());
      setAviso(r.aviso);
      toast.success(
        r.fronteraNueva
          ? `La contabilidad quedó cerrada hasta el ${diaLegible(r.fronteraNueva)}.`
          : 'La contabilidad quedó sin ninguna fecha cerrada.',
      );
      setAbierto(false);
      setMotivo('');
      await cargarBitacora();
      onReabierto?.(r);
    } catch (e) {
      setError(mensajeDeReapertura(e));
    } finally {
      setEnviando(false);
    }
  }, [problema, fechaPedida, motivo, cargarBitacora, onReabierto]);

  const sinMigracion = bitacora !== null && !bitacora.disponible;

  const puede = !cargando && !fallo && permiso.puede && cerradaHasta !== null;
  /*
   * «Con todo abierto…» y no «La contabilidad no tiene ninguna fecha cerrada»:
   * la tarjeta ya lo dice arriba, en su frase. Acá sólo va la consecuencia.
   */
  const porQueNo =
    permiso.motivo ??
    (fallo
      ? 'Sin saber hasta dónde está cerrado no se puede elegir qué reabrir.'
      : 'Con todo abierto no hay nada que reabrir.');

  return (
    <section
      className="space-y-3 border-t border-border pt-4"
      aria-labelledby={`${id}-titulo`}
      data-testid="reapertura"
    >
      {sinMigracion ? (
        <FaltaLaMigracion
          motivo={bitacora?.motivo ?? null}
          queSeEspera="reabrir un mes cerrado"
          mientrasTanto="El cierre sigue funcionando y sigue siendo de una sola vía, que es lo de hoy."
          testId="reapertura-sin-migracion"
        />
      ) : (
        <div className="space-y-1.5">
          {/* 🔴 22-09 · Una fila: qué es a la izquierda, el botón a la derecha.
              Antes eran un título, un párrafo de tres renglones con la
              explicación entera y un botón gris suelto debajo. La explicación
              se fue a «Cómo funciona» de la tarjeta; el porqué del botón
              apagado se queda, visible, pegado a él. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 space-y-0.5">
              <h3
                id={`${id}-titulo`}
                className="flex items-center gap-2 text-sm font-medium text-fg"
              >
                <ArrowUUpLeft className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                Reabrir un mes cerrado
              </h3>
              <p className="text-caption text-fg-muted">
                Sólo el administrador, con motivo y bitácora.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={abrirDialogo}
              disabled={!puede}
              title={puede || cargando ? undefined : porQueNo}
              aria-describedby={puede || cargando ? undefined : `${id}-por-que-no`}
              data-testid="abrir-reapertura"
            >
              Reabrir…
            </Button>
          </div>
          {!puede && !cargando ? (
            <p
              id={`${id}-por-que-no`}
              className="flex items-start gap-1.5 text-caption text-fg-muted"
              data-testid="abrir-reapertura-motivo"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{porQueNo}</span>
            </p>
          ) : null}
        </div>
      )}

      {aviso ? (
        <Nota testId="aviso-de-la-reapertura">
          <p>{aviso}</p>
        </Nota>
      ) : null}

      {/* ── La bitácora ───────────────────────────────────────────────── */}
      {/* 🔴 22-09 · VACÍA, ES UNA LÍNEA. Era un subtítulo con icono y abajo
          «Nadie reabrió un período todavía»: dos renglones y un encabezado
          para decir «nada». Con filas, se ve la última entera (el motivo
          completo es lo que hace que la bitácora sirva) y el resto se abre. */}
      {bitacora === null && cargandoBitacora ? (
        <Skeleton
          className="h-4 w-64 max-w-full rounded-sm bg-surface-muted"
          data-testid="bitacora-cargando"
        />
      ) : null}
      {bitacora?.disponible ? (
        bitacora.reaperturas.length === 0 ? (
          <p
            className="flex items-center gap-1.5 text-caption text-fg-muted"
            data-testid="bitacora-vacia"
          >
            <ClockCounterClockwise className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="text-fg">Bitácora de reaperturas:</span> nadie reabrió un período
              todavía.
            </span>
          </p>
        ) : (
          <div className="space-y-2" data-testid="bitacora-de-reaperturas">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-caption font-medium text-fg">
                <ClockCounterClockwise className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
                Bitácora de reaperturas
                <span className="font-mono tabular-nums text-fg-muted">
                  · {bitacora.reaperturas.length.toLocaleString('es-CO')}
                </span>
              </p>
              {bitacora.reaperturas.length > 1 ? (
                <Button
                  variant="link"
                  size="sm"
                  hideArrow
                  className="h-auto p-0 text-caption"
                  onClick={() => setBitacoraAbierta((a) => !a)}
                  aria-expanded={bitacoraAbierta}
                  data-testid="bitacora-ver-todas"
                >
                  {bitacoraAbierta ? 'Ver sólo la última' : 'Ver todas'}
                </Button>
              ) : null}
            </div>
            <ul className="space-y-2">
              {(bitacoraAbierta ? bitacora.reaperturas : bitacora.reaperturas.slice(0, 1)).map(
                (r) => (
                  <li
                    key={r.id}
                    className="space-y-0.5 rounded-md border border-border-faint bg-surface-muted px-3 py-2.5 text-caption text-fg-muted"
                    data-testid="fila-de-reapertura"
                  >
                    <p className="text-fg">
                      {movimientoDeLaFrontera(r.fronteraAnterior, r.fronteraNueva)}
                    </p>
                    {/* El motivo COMPLETO: es lo que hace que la bitácora sirva. */}
                    <p className="whitespace-pre-wrap text-fg">{r.motivo}</p>
                    <p>
                      <span className="font-mono tabular-nums">
                        {new Date(r.reabiertoAt).toLocaleString('es-CO')}
                      </span>{' '}
                      ·{' '}
                      {r.reabiertoPorUserId === null ? (
                        'sin usuario registrado'
                      ) : r.reabiertoPorUserId === permiso.usuarioId ? (
                        'tú'
                      ) : (
                        <span className="font-mono">{r.reabiertoPorUserId}</span>
                      )}
                    </p>
                  </li>
                ),
              )}
            </ul>
          </div>
        )
      ) : null}

      {/* ── El diálogo ────────────────────────────────────────────────── */}
      <AlertDialog
        open={abierto}
        onOpenChange={(a) => {
          if (!a && !enviando) setAbierto(false);
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-reapertura">
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir la contabilidad</AlertDialogTitle>
            <AlertDialogDescription>
              La fecha que se pide es el PRIMER día que vas a poder volver a escribir, no hasta
              dónde queda cerrado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-hasta`}>Volver a poder escribir desde</Label>
              <Input
                id={`${id}-hasta`}
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                disabled={enviando || todo}
                className="w-48"
                data-testid="reapertura-hasta"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-fg">
              <Checkbox
                checked={todo}
                onCheckedChange={(c) => setTodo(c === true)}
                disabled={enviando}
                data-testid="reapertura-todo"
              />
              <span>
                Reabrir todo
                <span className="block text-caption text-fg-subtle">
                  Sin ninguna fecha cerrada: cualquier día vuelve a admitir asientos.
                </span>
              </span>
            </label>

            {/* 🔴 El resultado, ANTES de confirmar. */}
            <div
              className="space-y-1 rounded-lg border border-border bg-surface-muted p-3 text-sm"
              data-testid="resultado-de-la-reapertura"
            >
              <p className="text-fg-muted">{frases.desde}</p>
              <p className="font-medium text-fg">{frases.resultado}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-motivo`}>Motivo (obligatorio)</Label>
              <Textarea
                id={`${id}-motivo`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={LARGO_MAXIMO_DEL_MOTIVO_DE_REAPERTURA}
                rows={3}
                placeholder="Faltó causar la factura de diciembre del proveedor de aseo"
                disabled={enviando}
                data-testid="reapertura-motivo"
              />
              <p className="text-caption text-fg-muted">
                Queda en la bitácora, con tu nombre y la fecha. Es lo que hace que un cierre se
                pueda deshacer sin perder el rastro.
              </p>
            </div>

            {problema ? (
              <p className="text-caption text-danger" role="alert" data-testid="problema-de-reapertura">
                {problema}
              </p>
            ) : null}
            {error ? (
              <Banner variant="danger" role="alert">
                {error}
              </Banner>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            {/*
              Un `Button` y no `AlertDialogAction`: la acción se queda abierta
              cuando el back rechaza, para que el error se lea al lado del
              formulario en vez de cerrarse con la fecha y el motivo perdidos.
            */}
            <Button
              variant="destructive"
              hideArrow
              onClick={() => void confirmar()}
              isLoading={enviando}
              disabled={enviando || problema !== null}
              data-testid="confirmar-reapertura"
            >
              Reabrir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
