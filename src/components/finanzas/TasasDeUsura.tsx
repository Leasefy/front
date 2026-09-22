'use client';

/**
 * Las tasas de usura, mes por mes: el techo legal del interés de mora.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * El art. 884 del Código de Comercio topea el interés moratorio en 1,5 veces
 * el bancario corriente, y la Superfinanciera lo certifica MES A MES. Hasta el
 * 17-09 el producto liquidaba el interés sin techo: no había dónde guardar esa
 * serie. Ahora la hay, y esta pantalla es donde el contador la carga.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Callar los meses que faltan.** Un mes sin tasa NO frena el cálculo: el
 *    interés de ese mes sale SIN topear. Eso es plata cobrada por encima de lo
 *    que permite la ley, así que el aviso va arriba, en rojo, con los meses
 *    nombrados — no un contador «faltan 14» que no dice cuáles.
 * 2. **Dejar borrar la serie de Colombia.** La comparten todas las
 *    inmobiliarias: una la dejaría sin tope a las demás. El back lo rechaza y
 *    acá ni se ofrece el botón.
 * 3. **Inventar la tasa diaria.** La equivalencia efectiva anual → diaria la
 *    calcula el back (`diariaDesdeEfectivaAnual`) y viaja en la respuesta.
 *    Recalcularla acá sería una segunda fórmula para el mismo número.
 * 4. **Preguntar con el diálogo del navegador.** Borrar una tasa mueve el
 *    interés de todo un mes: se confirma con `AlertDialog`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash, WarningOctagon } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { codigoSinMigrar, finanzasApi } from '@/lib/api/finanzas.service';
import type { TasaDeUsura, TasasDeUsura as Respuesta } from '@/lib/api/finanzas.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { avisoDeMesesQueFaltan, esMesValido, mesesAtras, mesesQueFaltan } from '@/lib/finanzas/usura';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';

/** Cuántos meses se miran por defecto. Dos años: lo que tarda un juicio. */
const MESES_POR_DEFECTO = 23;

/** «24,86 %» — el porcentaje como lo certifica la Superfinanciera. */
export function porcentaje(valor: number, decimales = 2): string {
  return `${valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} %`;
}

export function TasasDeUsuraPanel() {
  const hasta0 = mesActual();
  const [desde, setDesde] = useState(() => mesesAtras(hasta0, MESES_POR_DEFECTO));
  const [hasta, setHasta] = useState(hasta0);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editando, setEditando] = useState<TasaDeUsura | 'nueva' | null>(null);
  const [borrando, setBorrando] = useState<TasaDeUsura | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await finanzasApi.usura(desde, hasta));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    finanzasApi
      .usura(desde, hasta)
      .then((r) => {
        if (vivo) setDatos(r);
      })
      .catch((e) => {
        if (vivo) setError(e);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [desde, hasta]);

  const tasas = datos?.tasas ?? [];
  const faltan = useMemo(
    () => datos?.mesesSinTasa ?? mesesQueFaltan(desde, hasta, tasas),
    [datos, desde, hasta, tasas],
  );
  const aviso = avisoDeMesesQueFaltan(faltan);
  const disponible = datos?.disponible !== false;

  return (
    <div className="space-y-5" data-testid="tasas-de-usura">
      {/* ── Rango y alta ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="usura-desde">Desde</Label>
            <Input
              id="usura-desde"
              type="month"
              className="w-40"
              value={desde}
              onChange={(e) => esMesValido(e.target.value) && setDesde(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usura-hasta">Hasta</Label>
            <Input
              id="usura-hasta"
              type="month"
              className="w-40"
              value={hasta}
              onChange={(e) => esMesValido(e.target.value) && setHasta(e.target.value)}
            />
          </div>
        </div>
        <Button hideArrow disabled={!disponible} onClick={() => setEditando('nueva')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Cargar una tasa
        </Button>
      </div>

      {/* ── 🔴 Los meses sin tope ──────────────────────────────────────── */}
      {aviso ? (
        <div
          className="flex gap-2 rounded-lg border border-danger/40 bg-danger-soft p-4 text-sm text-fg"
          data-testid="aviso-de-meses-sin-tasa"
          role="alert"
        >
          <WarningOctagon className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <p>{aviso}</p>
        </div>
      ) : null}

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        queEs="las tasas de usura"
        onReintentar={cargar}
        conservarContenido={Boolean(datos)}
      >
        {datos ? (
          <div className="space-y-4">
            {!datos.disponible ? (
              <SinLaMigracion motivo={datos.motivo} queSeEspera="cargar las tasas de usura" />
            ) : null}

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Efectiva anual</TableHead>
                      <TableHead className="text-right">Equivalente diaria</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead className="text-right">&nbsp;</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-fg-muted">
                          No hay ninguna tasa cargada en este rango. Mientras no la haya, el interés
                          de mora se liquida sin techo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasas.map((t) => (
                        <TableRow key={t.id} data-testid={`tasa-${t.mes}`}>
                          <TableCell className="font-medium text-fg">{nombreDelMes(t.mes)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {porcentaje(t.efectivaAnualPct)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {porcentaje(t.diariaPct, 4)}
                          </TableCell>
                          <TableCell className="text-fg-muted">{t.fuente || '—'}</TableCell>
                          <TableCell className="text-fg-muted">
                            {t.esDeLaAgencia ? 'Tuya (pisa a la general)' : 'General de Colombia'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                hideArrow
                                disabled={!disponible}
                                onClick={() => setEditando(t)}
                              >
                                Editar
                              </Button>
                              {t.esDeLaAgencia ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Borrar la tasa de ${nombreDelMes(t.mes)}`}
                                  disabled={!disponible}
                                  onClick={() => setBorrando(t)}
                                >
                                  <Trash className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-fg-muted">
              La <strong>efectiva anual</strong> es la que certifica la Superfinanciera cada mes; la{' '}
              <strong>equivalente diaria</strong> es la que el sistema aplica día por día sobre el
              capital en mora, y la calcula el back con la misma fórmula del tope. Tu tasa pisa a la
              general de Colombia en el mes en que la cargues.
            </p>
          </div>
        ) : null}
      </EstadoDeDatos>

      <EditorDeTasa
        abierto={editando !== null}
        tasa={editando === 'nueva' ? null : editando}
        onCerrar={() => setEditando(null)}
        onGuardada={() => {
          setEditando(null);
          void cargar();
        }}
      />

      <AlertDialog open={borrando !== null} onOpenChange={(o) => !o && setBorrando(null)}>
        <AlertDialogContent data-testid="confirmar-borrado-de-tasa">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Borrar tu tasa de {borrando ? nombreDelMes(borrando.mes) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ese mes vuelve a regirse por la tasa general de Colombia. Si no hay general para ese
              mes, el interés de mora de ese mes pasa a liquidarse SIN topear.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dejarla como está</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tasa = borrando;
                if (!tasa) return;
                setBorrando(null);
                void finanzasApi
                  .borrarUsura(tasa.id)
                  .then(() => {
                    toast.success('Tasa borrada.');
                    return cargar();
                  })
                  .catch((e) => {
                    toast.error('No se pudo borrar la tasa.', {
                      description: explicar(e, 'No se pudo borrar la tasa.'),
                    });
                  });
              }}
            >
              Borrarla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * El motivo del fallo, y —cuando es el 503 de la migración— quién lo destraba.
 * Un «Error 503» no le dice a nadie qué hacer.
 */
export function explicar(error: unknown, porDefecto: string): string {
  const mensaje = mensajeDelFallo(error, porDefecto);
  return codigoSinMigrar(error) ? `${mensaje} (nuestro equipo la está habilitando)` : mensaje;
}

function EditorDeTasa({
  abierto,
  tasa,
  onCerrar,
  onGuardada,
}: {
  abierto: boolean;
  tasa: TasaDeUsura | null;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [mes, setMes] = useState('');
  const [efectiva, setEfectiva] = useState('');
  const [fuente, setFuente] = useState('');
  const [general, setGeneral] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setMes(tasa?.mes ?? mesActual());
    setEfectiva(tasa ? String(tasa.efectivaAnualPct) : '');
    setFuente(tasa?.fuente ?? '');
    setGeneral(tasa ? !tasa.esDeLaAgencia : false);
  }, [abierto, tasa]);

  const numero = Number(efectiva.replace(',', '.'));
  const valida = esMesValido(mes) && Number.isFinite(numero) && numero > 0 && numero <= 500;

  async function guardar() {
    setGuardando(true);
    try {
      await finanzasApi.guardarUsura({
        mes,
        efectivaAnualPct: numero,
        fuente: fuente.trim() || undefined,
        general,
      });
      toast.success(`Tasa de ${nombreDelMes(mes)} guardada.`, {
        description: 'Rige para el interés de mora que corra en ese mes.',
      });
      onGuardada();
    } catch (e) {
      toast.error('No se pudo guardar la tasa.', {
        description: explicar(e, 'No se pudo guardar la tasa.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="editor-de-tasa">
        <DialogHeader>
          <DialogTitle>{tasa ? 'Editar la tasa' : 'Cargar una tasa de usura'}</DialogTitle>
          <DialogDescription>
            La efectiva anual certificada por la Superfinanciera para ese mes. La equivalente diaria
            la calcula el sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tasa-mes">Mes</Label>
            <Input
              id="tasa-mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tasa-efectiva">Efectiva anual (%)</Label>
            <Input
              id="tasa-efectiva"
              inputMode="decimal"
              className="font-mono"
              placeholder="24,86"
              value={efectiva}
              onChange={(e) => setEfectiva(e.target.value)}
            />
            <p className="text-xs text-fg-muted">
              En porcentaje, mayor que 0. Una tasa en cero apagaría el tope sin decirlo.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tasa-fuente">Fuente</Label>
            <Input
              id="tasa-fuente"
              placeholder="Resolución 1234 de la Superfinanciera"
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-fg">
            <Checkbox className="mt-1" checked={general} onCheckedChange={(marcada: boolean) => setGeneral(marcada)} data-testid="guardar-en-la-general" />
            <span>
              Guardarla en la serie general de Colombia
              <span className="block text-xs text-fg-muted">
                La comparten todas las inmobiliarias. Sin marcar, la tasa queda sólo para la tuya y
                pisa a la general en ese mes.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button hideArrow onClick={() => void guardar()} disabled={!valida} isLoading={guardando}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
