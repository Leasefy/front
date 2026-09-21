'use client';

/**
 * El presupuesto por mes y rubro, contra el real y contra el año anterior.
 *
 * Nico (17-09): «se carga por mes y rubro (comisiones, gastos, nómina) y el
 * tablero y el P&G muestran presupuesto vs. real vs. año anterior».
 *
 * ── 🔴 La parte incómoda, que esta pantalla NO esconde ──────────────────────
 *
 * De los tres rubros que nombró Nico, el producto hoy sólo sabe calcular el
 * REAL de uno: no existe un P&G, y el real de «gastos» y «nómina» saldría de
 * los asientos contables agrupados por cuenta del PUC — mapeo que define el
 * contador de cada inmobiliaria.
 *
 * Esos rubros se presupuestan igual (saber cuánto se pensaba gastar ya es la
 * mitad del valor) y salen con el real en `—` y el motivo escrito. **Un cero
 * ahí se leería como «no gastaste nada» y haría planificar sobre una mentira.**
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. Pintar `0` donde el back manda `null`.
 * 2. Sumar los desconocidos en el total: el total del real es sólo de los
 *    rubros que se pudieron medir, y el aviso dice cuántos quedaron afuera.
 * 3. Preguntar con el diálogo del navegador.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';

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
import { Avisos, SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
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
import type {
  ComparacionDelPresupuesto,
  PresupuestoCargado,
  PresupuestoDelMes,
  RubroDelPresupuesto,
} from '@/lib/api/finanzas.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { SIN_MEDIR } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { mesActual } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';

export function PresupuestoPanel() {
  const [mes, setMes] = useState(mesActual);
  const [comparacion, setComparacion] = useState<ComparacionDelPresupuesto | null>(null);
  const [cargado, setCargado] = useState<PresupuestoDelMes | null>(null);
  const [rubros, setRubros] = useState<RubroDelPresupuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [borrando, setBorrando] = useState<PresupuestoCargado | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const [c, l, r] = await Promise.all([
        finanzasApi.comparacionDelPresupuesto(mes),
        finanzasApi.presupuesto(mes),
        finanzasApi.rubros(),
      ]);
      setComparacion(c);
      setCargado(l);
      setRubros(r.rubros);
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const puedeCargar = cargado?.disponible !== false;

  const confirmarBorrado = useCallback(async () => {
    if (!borrando) return;
    try {
      await finanzasApi.borrarPresupuesto(borrando.id);
      toast.success('Se quitó el presupuesto de ese rubro.');
      setBorrando(null);
      await cargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo quitar el presupuesto.'));
    }
  }, [borrando, cargar]);

  return (
    <div className="space-y-6" data-testid="presupuesto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectorDeMes mes={mes} onCambiar={setMes} />
        {puedeCargar ? (
          <Button onClick={() => setAbriendo(true)} data-testid="cargar-presupuesto">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Cargar un rubro
          </Button>
        ) : null}
      </div>

      {cargado && cargado.disponible === false ? (
        <SinLaMigracion motivo={cargado.motivo} queSeEspera="cargar el presupuesto" />
      ) : null}

      <EstadoDeDatos
        cargando={cargando && !comparacion}
        error={fallo}
        vacio={!cargando && !comparacion}
        onReintentar={cargar}
        queEs="el presupuesto del mes"
      >
        {comparacion ? (
          <Comparacion
            comparacion={comparacion}
            cargado={cargado?.filas ?? []}
            onBorrar={setBorrando}
          />
        ) : null}
      </EstadoDeDatos>

      <DialogoDeCarga
        abierto={abriendo}
        mes={mes}
        rubros={rubros}
        onCerrar={() => setAbriendo(false)}
        onGuardado={cargar}
      />

      <AlertDialog open={borrando !== null} onOpenChange={(v) => !v && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el presupuesto de este rubro?</AlertDialogTitle>
            <AlertDialogDescription>
              La comparación de {borrando?.rubro.replace(/_/g, ' ')} de {borrando?.mes} deja de
              tener con qué medirse. El real no cambia: sólo se borra lo que se había planeado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Dejarlo</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarBorrado()}>Quitarlo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Comparacion({
  comparacion,
  cargado,
  onBorrar,
}: {
  comparacion: ComparacionDelPresupuesto;
  cargado: readonly PresupuestoCargado[];
  onBorrar: (fila: PresupuestoCargado) => void;
}) {
  const porRubro = useMemo(
    () => new Map(cargado.map((f) => [f.rubro, f])),
    [cargado],
  );

  return (
    <div className="space-y-4">
      <TituloDeBloque
        titulo={`Presupuesto vs. real vs. ${comparacion.mesDelAnioAnterior}`}
        explicacion="Lo que se planeó, lo que pasó y lo que pasó el mismo mes del año pasado. Un rubro cuyo real no se puede calcular sale con guion y dice por qué: un cero ahí se leería como «no gastaste nada»."
      />

      <Avisos avisos={comparacion.avisos} testId="presupuesto-avisos" />

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rubro</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Real</TableHead>
              <TableHead className="text-right">Contra el presupuesto</TableHead>
              <TableHead className="text-right">{comparacion.mesDelAnioAnterior}</TableHead>
              <TableHead className="text-right">Variación anual</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparacion.filas.map((fila) => {
              const suFila = porRubro.get(fila.rubro);
              return (
                <TableRow key={fila.rubro} data-testid={`rubro-${fila.rubro}`}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-fg">{fila.nombre}</p>
                      {/* 🔴 20-09 · Acá se pintaba el motivo ENTERO —cuatro
                          renglones— en cada fila que no se puede medir. Con
                          once rubros así, el mismo párrafo salía ocho veces
                          palabra por palabra y ocupaba el 70 % de la altura de
                          la tabla; y el aviso de arriba YA lo dice una vez,
                          con la lista de los once. Repetir una explicación no
                          la hace más clara: enseña a saltársela, y el día que
                          una fila diga algo distinto tampoco se va a leer.

                          Queda la marca, que es lo que la fila tiene que
                          decir, y el motivo completo en el `title` y en el
                          detalle del rubro, donde se va a leer de verdad. */}
                      {fila.motivoSinReal ? (
                        <p
                          className="text-caption text-fg-subtle"
                          title={fila.motivoSinReal}
                          data-testid={`sin-real-${fila.rubro}`}
                        >
                          Sin cuentas del PUC: no se puede medir
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <Monto id={`presupuesto-${fila.rubro}`} valor={fila.presupuestoCop} />
                  <Monto id={`real-${fila.rubro}`} valor={fila.realCop} />
                  <Monto
                    id={`contra-${fila.rubro}`}
                    valor={fila.contraPresupuestoCop}
                    tono={
                      fila.contraPresupuestoCop === null
                        ? undefined
                        : fila.naturaleza === 'COSTO'
                          ? fila.contraPresupuestoCop > 0
                            ? 'danger'
                            : 'success'
                          : fila.contraPresupuestoCop < 0
                            ? 'danger'
                            : 'success'
                    }
                  />
                  <Monto id={`anterior-${fila.rubro}`} valor={fila.anioAnteriorCop} />
                  <TableCell
                    className="text-right font-mono tabular-nums"
                    data-testid={`variacion-${fila.rubro}`}
                  >
                    {fila.variacionAnualPct === null
                      ? SIN_MEDIR
                      : `${fila.variacionAnualPct > 0 ? '+' : ''}${fila.variacionAnualPct} %`}
                  </TableCell>
                  <TableCell>
                    {suFila ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar el presupuesto de ${fila.nombre}`}
                        onClick={() => onBorrar(suFila)}
                        data-testid={`quitar-${fila.rubro}`}
                      >
                        <Trash className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="border-t-2 border-border font-medium">
              <TableCell>Total</TableCell>
              <Monto id="total-presupuesto" valor={comparacion.totales.presupuestoCop} />
              <Monto id="total-real" valor={comparacion.totales.realCop} />
              <TableCell colSpan={3} className="text-right text-xs text-fg-muted">
                {comparacion.totales.rubrosSinReal > 0
                  ? `El total del real NO incluye ${comparacion.totales.rubrosSinReal} ${comparacion.totales.rubrosSinReal === 1 ? 'rubro' : 'rubros'} que todavía no se ${comparacion.totales.rubrosSinReal === 1 ? 'puede' : 'pueden'} medir.`
                  : 'Todos los rubros se pudieron medir.'}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Una celda de plata. `null` = `—`, nunca `$0`. */
function Monto({
  id,
  valor,
  tono,
}: {
  id: string;
  valor: number | null;
  tono?: 'danger' | 'success';
}) {
  return (
    <TableCell
      className={cn(
        'text-right font-mono tabular-nums',
        valor !== null && tono === 'danger' && 'text-danger',
        valor !== null && tono === 'success' && 'text-success',
      )}
      data-testid={id}
    >
      {valor === null ? SIN_MEDIR : formatCurrency(valor)}
    </TableCell>
  );
}

function DialogoDeCarga({
  abierto,
  mes,
  rubros,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  mes: string;
  rubros: readonly RubroDelPresupuesto[];
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [rubro, setRubro] = useState('');
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const elegido = rubros.find((r) => r.rubro === rubro);

  const guardar = useCallback(async () => {
    const valorCop = Number(valor);
    if (!rubro.trim() || !Number.isFinite(valorCop)) return;
    setGuardando(true);
    try {
      await finanzasApi.guardarPresupuesto({
        mes,
        rubro: rubro.trim(),
        valorCop: Math.round(valorCop),
      });
      toast.success('Presupuesto cargado.');
      setRubro('');
      setValor('');
      onCerrar();
      await onGuardado();
    } catch (error) {
      const codigo = codigoSinMigrar(error);
      toast.error(
        codigo
          ? 'Todavía no se puede cargar el presupuesto: esta función aún no está disponible. Nuestro equipo la está habilitando.'
          : mensajeDelFallo(error, 'No se pudo cargar el presupuesto.'),
      );
    } finally {
      setGuardando(false);
    }
  }, [mes, onCerrar, onGuardado, rubro, valor]);

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar el presupuesto de un rubro</DialogTitle>
          <DialogDescription>
            Para {mes}. Cargar dos veces el mismo rubro lo corrige, no lo suma.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="presupuesto-rubro">Rubro</Label>
            <Input
              id="presupuesto-rubro"
              list="rubros-sugeridos"
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="comisiones"
              data-testid="presupuesto-rubro"
            />
            <datalist id="rubros-sugeridos">
              {rubros.map((r) => (
                <option key={r.rubro} value={r.rubro}>
                  {r.nombre}
                </option>
              ))}
            </datalist>
            {elegido?.motivoSinReal ? (
              <p className="text-xs leading-relaxed text-fg-muted" data-testid="aviso-sin-real">
                {elegido.motivoSinReal}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="presupuesto-valor">Valor del mes (COP)</Label>
            <Input
              id="presupuesto-valor"
              type="number"
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              data-testid="presupuesto-valor"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            disabled={guardando || !rubro.trim() || valor === ''}
            data-testid="guardar-presupuesto"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
