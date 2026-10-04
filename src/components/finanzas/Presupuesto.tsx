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
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, SinLaMigracion } from '@/components/finanzas/piezas';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  LARGO_MAXIMO_DEL_RUBRO,
  problemaDelPresupuesto,
} from '@/lib/finanzas/limites-de-finanzas';
import { SIN_MEDIR } from '@/lib/tasas';
import { plata, textoDelBack } from '@/lib/contabilidad/plata';
import { presupuestoContraElLibro } from '@/lib/contabilidad/presupuesto-contra-el-libro';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';

/** La opción «Otro rubro…» del `Select` de «Cargar un rubro» (CB-30). */
const OTRO_RUBRO = '__otro__';

/** «Octubre de 2025» (CB-09: el encabezado decía «2025-10»). */
function mesConMayuscula(mes: string): string {
  const nombre = nombreDelMes(mes);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function PresupuestoPanel() {
  const [mes, setMes] = useState(mesActual);
  const [comparacion, setComparacion] = useState<ComparacionDelPresupuesto | null>(null);
  const [cargado, setCargado] = useState<PresupuestoDelMes | null>(null);
  const [rubros, setRubros] = useState<RubroDelPresupuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [borrando, setBorrando] = useState<PresupuestoCargado | null>(null);
  const [quitando, setQuitando] = useState(false);

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
    setQuitando(true);
    try {
      await finanzasApi.borrarPresupuesto(borrando.id);
      toast.success('Se quitó el presupuesto de ese rubro.');
      setBorrando(null);
      await cargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo quitar el presupuesto.'));
    } finally {
      setQuitando(false);
    }
  }, [borrando, cargar]);

  return (
    <div className="space-y-6" data-testid="presupuesto">
      {cargado && cargado.disponible === false ? (
        <SinLaMigracion motivo={cargado.motivo} queSeEspera="cargar el presupuesto" />
      ) : null}

      {/* 🔴 UNA SOLA COSA (Nico, 21-09): «así hay muchas tablas que tienen mes
          afuera, switch tab afuera y deberían estar junto a la tabla».
          El mes y «Cargar un rubro» flotaban arriba sin borde ni título, la
          tabla tenía el suyo, y entre los dos había un bloque de título más un
          bloque de avisos. Ahora es UNA tarjeta: el mes y el CTA en la cabecera
          —junto al nombre de la tabla que gobiernan— y la tabla debajo. */}
      <section className="overflow-x-clip rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-fg">
              {comparacion
                ? `Presupuesto vs. real vs. ${nombreDelMes(comparacion.mesDelAnioAnterior)}`
                : 'Presupuesto vs. real'}
            </h2>
            <p className="max-w-2xl text-caption leading-relaxed text-fg-muted">
              Lo que se planeó, lo que pasó y lo que pasó el mismo mes del año
              pasado. Un rubro cuyo real no se puede calcular sale con guion y
              dice por qué: un cero ahí se leería como «no gastaste nada».
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <SelectorDeMes mes={mes} onCambiar={setMes} />
            {puedeCargar ? (
              /* CB-30: sin la ↗ — el botón abre un diálogo acá, no otra página. */
              <Button hideArrow onClick={() => setAbriendo(true)} data-testid="cargar-presupuesto">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Cargar un rubro
              </Button>
            ) : null}
          </div>
        </div>

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
              rubros={rubros}
              onBorrar={setBorrando}
            />
          ) : null}
        </EstadoDeDatos>
      </section>

      <DialogoDeCarga
        abierto={abriendo}
        mes={mes}
        rubros={rubros}
        onCerrar={() => setAbriendo(false)}
        onGuardado={cargar}
      />

      <AlertDialog open={borrando !== null} onOpenChange={(v) => !v && !quitando && setBorrando(null)}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el presupuesto de este rubro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran los{' '}
              <span className="font-mono tabular-nums">
                {plata(borrando?.valorCop ?? 0)}
              </span>{' '}
              presupuestados para {borrando?.rubro.replace(/_/g, ' ')} en{' '}
              {borrando?.mes ? nombreDelMes(borrando.mes) : ''}, y la
              comparación de ese rubro deja de tener con qué medirse. El real no cambia: sólo se
              borra lo que se había planeado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quitando}>Dejarlo</AlertDialogCancel>
            <AlertDialogAction
              // Abierto hasta que el back conteste: se cierra sólo si salió bien.
              onClick={(e) => {
                e.preventDefault();
                void confirmarBorrado();
              }}
              loading={quitando}
            >
              Quitarlo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Comparacion({
  comparacion,
  cargado,
  rubros,
  onBorrar,
}: {
  comparacion: ComparacionDelPresupuesto;
  cargado: readonly PresupuestoCargado[];
  rubros: readonly RubroDelPresupuesto[];
  onBorrar: (fila: PresupuestoCargado) => void;
}) {
  const porRubro = useMemo(
    () => new Map(cargado.map((f) => [f.rubro, f])),
    [cargado],
  );
  // 🔴 CB-09 (Nico): «Real» es el LIBRO; la operación va al lado como referencia.
  const tabla = useMemo(
    () =>
      presupuestoContraElLibro(
        comparacion,
        new Map(rubros.map((r) => [r.rubro, r.fuenteDelReal])),
      ),
    [comparacion, rubros],
  );
  // Las frases del back sin emojis (el cartel ya trae su ícono) y con la plata de la casa.
  const avisos = useMemo(() => comparacion.avisos.map(textoDelBack), [comparacion.avisos]);

  return (
    <div>
      {/* El título ya lo dice la cabecera de la tarjeta: repetirlo acá era la
          misma frase dicha dos veces. */}
      {avisos.length > 0 ? (
        <div className="border-b border-border p-4">
          <Avisos avisos={avisos} testId="presupuesto-avisos" />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rubro</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Real</TableHead>
              {tabla.hayOperacion ? (
                <TableHead
                  className="whitespace-nowrap text-right"
                  title="Lo que dice la operación (la comisión causada, los recargos recaudados, los costos de la plata). Es una referencia: el real es el del libro."
                >
                  En la operación
                </TableHead>
              ) : null}
              <TableHead className="text-right">Contra el presupuesto</TableHead>
              <TableHead className="whitespace-nowrap text-right">{mesConMayuscula(comparacion.mesDelAnioAnterior)}</TableHead>
              <TableHead className="text-right">Variación anual</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBodyAnimado>
            {tabla.filas.map((fila) => {
              const suFila = porRubro.get(fila.rubro);
              return (
                <TableRowAnimada key={fila.rubro} data-testid={`rubro-${fila.rubro}`}>
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
                  {tabla.hayOperacion ? (
                    <Monto id={`operacion-${fila.rubro}`} valor={fila.operacionCop} apagado />
                  ) : null}
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
                </TableRowAnimada>
              );
            })}
            <TableRow key="total" className="border-t-2 border-border font-medium">
              <TableCell>Total</TableCell>
              <Monto id="total-presupuesto" valor={tabla.totales.presupuestoCop} />
              <Monto id="total-real" valor={tabla.totales.realCop} />
              {tabla.hayOperacion ? (
                <Monto id="total-operacion" valor={tabla.totales.operacionCop} apagado />
              ) : null}
              <TableCell colSpan={3} className="text-right text-caption text-fg-muted">
                {tabla.totales.rubrosSinReal > 0
                  ? `El total del real NO incluye ${tabla.totales.rubrosSinReal} ${tabla.totales.rubrosSinReal === 1 ? 'rubro' : 'rubros'} que todavía no se ${tabla.totales.rubrosSinReal === 1 ? 'puede' : 'pueden'} medir.`
                  : 'Todos los rubros se pudieron medir.'}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBodyAnimado>
        </Table>
      </div>
    </div>
  );
}

/**
 * Una celda de plata. `null` = `—`, nunca `$0`. Con el formato de la casa
 * (CB-09 / CB-17): «$ 8.757.000» y «−$ 119.100», no «$-119.100».
 * `apagado`: una cifra de referencia (la operación), en gris.
 */
function Monto({
  id,
  valor,
  tono,
  apagado = false,
}: {
  id: string;
  valor: number | null;
  tono?: 'danger' | 'success';
  apagado?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        'whitespace-nowrap text-right font-mono tabular-nums',
        apagado && 'text-fg-muted',
        valor !== null && tono === 'danger' && 'text-danger',
        valor !== null && tono === 'success' && 'text-success',
      )}
      data-testid={id}
    >
      {valor === null ? SIN_MEDIR : plata(valor)}
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
  /**
   * 🔴 CB-30 (QA de Contabilidad, 03-10-2026): el rubro era un texto libre con
   * las claves internas sugeridas («comisiones»), y escribir otra cosa creaba
   * un rubro basura. Ahora se ELIGE por su nombre, y «Otro rubro…» pide el
   * nombre tal cual lo escriben (el back lo guarda así).
   */
  const [eleccion, setEleccion] = useState('');
  const [otro, setOtro] = useState('');
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Lo que el back dijo de un campo (un 400 con `campos`). */
  const [delServidor, setDelServidor] = useState<{ rubro?: string; valorCop?: string }>({});

  const rubro = eleccion === OTRO_RUBRO ? otro : eleccion;
  const elegido = rubros.find((r) => r.rubro === eleccion);
  // 🔁 El tope del back (±$2.000.000.000, puede ser negativo), con su frase.
  const numero = valor === '' || valor === '-' ? null : Number(valor);
  const problemaDelValor = numero === null ? null : problemaDelPresupuesto(numero);
  const errorDelValor = problemaDelValor ?? delServidor.valorCop;
  const idDelRubro = eleccion === OTRO_RUBRO ? 'presupuesto-rubro-otro' : 'presupuesto-rubro';

  const guardar = useCallback(async () => {
    const valorCop = Number(valor);
    if (!rubro.trim() || valor === '' || !Number.isFinite(valorCop)) return;
    if (problemaDelPresupuesto(valorCop)) {
      document.getElementById('presupuesto-valor')?.focus();
      return;
    }
    setGuardando(true);
    setDelServidor({});
    try {
      await finanzasApi.guardarPresupuesto({
        mes,
        // CB-30 (back 26beefbc): «Otro rubro…» viaja como `rubro: 'otro'` con su
        // nombre tal cual; un rubro de la lista, por su clave.
        ...(eleccion === OTRO_RUBRO
          ? { rubro: 'otro', nombre: otro.trim() }
          : { rubro: rubro.trim() }),
        valorCop: Math.round(valorCop),
      });
      toast.success('Presupuesto cargado.');
      setEleccion('');
      setOtro('');
      setValor('');
      onCerrar();
      await onGuardado();
    } catch (error) {
      const codigo = codigoSinMigrar(error);
      if (codigo) {
        toast.error(
          'Todavía no se puede cargar el presupuesto: esta función aún no está disponible. Nuestro equipo la está habilitando.',
        );
        return;
      }
      // Lo que es de un campo va bajo ese campo; lo demás, al toast con la
      // regla de oro.
      // `RUBRO_DESCONOCIDO` viene en `rubro`; `RUBRO_OTRO_SIN_NOMBRE`, en `nombre`
      // (el campo «Nombre del rubro»): los dos van bajo el rubro.
      const reparto = repartirErroresDelServidor<'rubro' | 'valorCop'>(error, {
        mapa: { nombre: 'rubro' },
        campos: ['rubro', 'valorCop'],
        porDefecto: 'No se pudo cargar el presupuesto.',
        accion: 'cargar el presupuesto',
      });
      setDelServidor(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) {
        document.getElementById(primero === 'rubro' ? idDelRubro : 'presupuesto-valor')?.focus();
      }
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setGuardando(false);
    }
  }, [mes, onCerrar, onGuardado, rubro, valor, idDelRubro, eleccion, otro]);

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar el presupuesto de un rubro</DialogTitle>
          <DialogDescription>
            Para {nombreDelMes(mes)}. Cargar dos veces el mismo rubro lo corrige, no lo suma.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label id="presupuesto-rubro-rotulo" htmlFor="presupuesto-rubro">Rubro</Label>
            <Select
              value={eleccion || undefined}
              onValueChange={(v) => {
                setDelServidor((d) => ({ ...d, rubro: undefined }));
                setEleccion(v);
              }}
            >
              <SelectTrigger
                id="presupuesto-rubro"
                aria-labelledby="presupuesto-rubro-rotulo"
                aria-invalid={(eleccion !== OTRO_RUBRO && Boolean(delServidor.rubro)) || undefined}
                aria-describedby={
                  eleccion !== OTRO_RUBRO && delServidor.rubro ? 'presupuesto-rubro-error' : undefined
                }
                data-testid="presupuesto-rubro"
              >
                <SelectValue placeholder="Elige el rubro" />
              </SelectTrigger>
              <SelectContent>
                {rubros.map((r) => (
                  <SelectItem key={r.rubro} value={r.rubro}>
                    {r.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={OTRO_RUBRO}>Otro rubro…</SelectItem>
              </SelectContent>
            </Select>
            {eleccion === OTRO_RUBRO ? (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="presupuesto-rubro-otro">Nombre del rubro</Label>
                <Input
                  id="presupuesto-rubro-otro"
                  value={otro}
                  maxLength={LARGO_MAXIMO_DEL_RUBRO}
                  onChange={(e) => {
                    setDelServidor((d) => ({ ...d, rubro: undefined }));
                    setOtro(e.target.value);
                  }}
                  placeholder="Publicidad"
                  aria-invalid={Boolean(delServidor.rubro) || undefined}
                  aria-describedby={delServidor.rubro ? 'presupuesto-rubro-error' : undefined}
                  data-testid="presupuesto-rubro-otro"
                />
              </div>
            ) : null}
            <ErrorDelCampo id="presupuesto-rubro-error" mensaje={delServidor.rubro} />
            {elegido?.motivoSinReal ? (
              <p className="text-caption leading-relaxed text-fg-muted" data-testid="aviso-sin-real">
                {elegido.motivoSinReal}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="presupuesto-valor">Valor del mes</Label>
            {/* CB-30: el campo de plata de la casa (agrupa mientras se escribe),
                no `type="number"`. Admite negativo. */}
            <MoneyInput
              id="presupuesto-valor"
              conSigno
              value={valor}
              onChange={(crudo) => {
                setDelServidor((d) => ({ ...d, valorCop: undefined }));
                setValor(crudo);
              }}
              aria-invalid={Boolean(errorDelValor) || undefined}
              aria-describedby={errorDelValor ? 'presupuesto-valor-error' : undefined}
              data-testid="presupuesto-valor"
            />
            <ErrorDelCampo id="presupuesto-valor-error" mensaje={errorDelValor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            disabled={!rubro.trim() || valor === '' || valor === '-'}
            isLoading={guardando}
            data-testid="guardar-presupuesto"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
