'use client';

/**
 * El tablero financiero: lo que finanzas mira TODOS los días.
 *
 * Cuatro bloques, que son las cuatro preguntas de la mañana:
 *
 *   1. ¿Cuánto entró hoy y cuánto va del mes contra lo que el mes hizo deber?
 *   2. ¿Cuánto nos deben, de qué edad, y quiénes son los que pesan?
 *   3. ¿Cuánto hay que girarle a los propietarios y cuánto está trabado?
 *   4. ¿Cuánto ganó la inmobiliaria con su propia plata, después de costos?
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Pintar un `null` como un cero.** La tasa de recaudo, la variación
 *    contra el mes anterior y el margen % vienen `number | null`: el `null`
 *    es «no había contra qué medir», no «dio cero». Se pinta `—` y la
 *    definición dice por qué (`@/lib/tasas`).
 * 2. **Esconder los `avisos`.** Van arriba, antes de las cifras. Un número que
 *    calla lo que NO cuenta —contratos sin tabla de amortización, cuotas sin
 *    sede— miente por omisión, y quien lo lee toma decisiones con él.
 * 3. **Sumar la deuda con la cartera.** El back manda `cartera.totalCop` y sus
 *    tramos: son la cartera, lo que ya pasó el plazo. La deuda del contrato
 *    —que es 12,9 veces más grande— vive en `/pagos/cartera` y no se mezcla.
 * 4. **Callar qué parte de la cartera está en siniestro.** Está adentro del
 *    total y se dice aparte: ya no la persigue la cobranza, la reclama la
 *    aseguradora.
 * 5. **Dejar una cifra sin definición.** Cada una dice qué mide, debajo.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, Cifra, CifraDeTexto, TituloDeBloque } from '@/components/finanzas/piezas';
import { SelectorDeMes, conMayusculaInicial } from '@/components/finanzas/SelectorDeMes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { TableroFinanciero as Tablero, TramoDeCartera } from '@/lib/api/finanzas.types';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';
import { SIN_MEDIR, textoDeTasa } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';

const NUMERO = new Intl.NumberFormat('es-CO');

/** Cómo se lee cada etapa de cobranza. Lo que no esté, se muestra tal cual. */
const NOMBRE_DE_LA_ETAPA: Record<string, string> = {
  TEMPRANA: 'Temprana',
  ADMINISTRATIVA: 'Administrativa',
  PREJURIDICA: 'Prejurídica',
  JURIDICA: 'Jurídica',
};

/** Qué significa cada etapa, para el encabezado de la columna. */
const QUE_ES_LA_ETAPA =
  'Temprana: recién pasó el plazo · Administrativa: la persigue la cobranza · ' +
  'Prejurídica: última instancia antes del abogado · Jurídica: ya está en manos del abogado.';

/**
 * Qué dice la tarjeta de un tramo debajo del monto.
 *
 * 🔴 Antes armaba el rango con `desdeDias`/`hastaDias`, que EL BACK NO MANDA:
 * en pantalla salía «undefined-undefined días de mora» en las cuatro tarjetas
 * de «Cartera por edades». El rango ya viene escrito en `tramo.nombre` («0-30
 * días»), que es el rótulo de la tarjeta, así que repetirlo abajo tampoco
 * aportaba nada: lo que falta decir es cuántas cuotas son y desde dónde se
 * cuentan los días, que no es obvio.
 */
export function definicionDelTramo(
  tramo: Pick<TramoDeCartera, 'cuotas'>,
): string {
  const cuotas = `${NUMERO.format(tramo.cuotas)} ${tramo.cuotas === 1 ? 'cuota' : 'cuotas'}`;
  return `${cuotas} en mora. Los días se cuentan DESPUÉS del plazo del contrato.`;
}

/**
 * La variación del recaudo contra el mes anterior, en palabras.
 *
 * `null` → `—`: sin recaudo el mes pasado no hay contra qué comparar, y un
 * «0 %» ahí diría que el mes viene igual.
 */
export function textoDeLaVariacion(variacionPct: number | null): string {
  if (variacionPct === null || !Number.isFinite(variacionPct)) return SIN_MEDIR;
  const signo = variacionPct > 0 ? '+' : '';
  return `${signo}${variacionPct.toFixed(1)}%`;
}

export function TableroFinancieroPanel() {
  const [mes, setMes] = useState(() => mesActual());
  const [sedeId, setSedeId] = useState('');
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setTablero(await finanzasApi.tablero(mes, sedeId || null));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [mes, sedeId]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    finanzasApi
      .tablero(mes, sedeId || null)
      .then((t) => {
        if (vivo) setTablero(t);
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
  }, [mes, sedeId]);

  const sedes = tablero?.sedes ?? [];

  return (
    <div className="space-y-6" data-testid="tablero-financiero">
      {/* 🔴 El alcance DICE qué gobierna (Nico, 21-09: «todo súper separado»).
          Eran dos controles flotando en el aire, sin borde y sin decir sobre
          qué mandan: en una pantalla de cuatro bloques de cifras, un mes suelto
          arriba se lee como si fuera del primer bloque. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-caption font-medium uppercase tracking-wide text-fg-muted">
            Todo el tablero, de
          </span>
          <SelectorDeMes mes={mes} onCambiar={setMes} />
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <span>Sede</span>
          <select
            aria-label="Sede"
            data-testid="selector-de-sede"
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
          >
            <option value="">Consolidado (todas)</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.codigo})
              </option>
            ))}
          </select>
        </label>
      </div>

      <EstadoDeDatos
        cargando={cargando && !tablero}
        error={error}
        queEs="el tablero financiero"
        onReintentar={cargar}
        conservarContenido={Boolean(tablero)}
      >
        {tablero ? (
          <div className="space-y-8">
            <Avisos
              avisos={tablero.avisos}
              testId="avisos-del-tablero"
              titulo="Lo que estos números no cuentan"
            />

            <BloqueDeRecaudo tablero={tablero} />
            <BloqueDeCartera tablero={tablero} />
            <BloqueDePropietarios tablero={tablero} />
            <BloqueDeMargen tablero={tablero} />

            <p className="text-caption text-fg-muted">
              Datos al {tablero.hoy} (hora de Bogotá).{' '}
              {tablero.sedeId === null
                ? 'Consolidado de todas las sedes.'
                : `Sólo la sede ${sedes.find((s) => s.id === tablero.sedeId)?.nombre ?? tablero.sedeId}.`}
            </p>
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}

// ══ (a) Recaudo ═════════════════════════════════════════════════════════════

function BloqueDeRecaudo({ tablero }: { tablero: Tablero }) {
  const { recaudo } = tablero;
  const base =
    recaudo.base === 'EMITIDO'
      ? 'lo que se emitió en cobros'
      : 'lo que el mes hizo deber (lo causado)';

  return (
    <section className="space-y-3" data-testid="bloque-recaudo">
      <TituloDeBloque
        titulo="Recaudo"
        explicacion={`Cuánto entró por caja hoy y en el mes, contra ${base}. Así lo mide esta inmobiliaria: ${recaudo.rotulo}`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          id="recaudo-del-dia"
          etiqueta="Entró hoy"
          valor={recaudo.delDiaCop}
          definicion={`Los recibos de caja con fecha ${tablero.hoy}, de cualquier período.`}
        />
        <Cifra
          id="recaudo-del-mes"
          etiqueta="Entró en el mes"
          valor={recaudo.delMesCop}
          definicion="Todo lo que entró por caja en el mes seleccionado, sin importar de qué mes era la deuda."
        />
        <Cifra
          id="causado-del-mes"
          etiqueta="Se debe del mes"
          valor={recaudo.causadoDelMesCop}
          definicion={`${conMayusculaInicial(base)} en el mes. Es el denominador del porcentaje de al lado.`}
        />
        <CifraDeTexto
          id="tasa-de-recaudo"
          etiqueta="% recaudado"
          texto={textoDeTasa(recaudo.tasaPct)}
          definicion={`Qué parte de ${base} llegó. ${recaudo.rotulo}`}
          pie={
            <span data-testid="comparacion-mes-anterior">
              {conMayusculaInicial(nombreDelMes(recaudo.mesAnterior.mes))}:{' '}
              {formatCurrency(recaudo.mesAnterior.recaudadoCop)} de{' '}
              {formatCurrency(recaudo.mesAnterior.causadoCop)} ({textoDeTasa(recaudo.mesAnterior.tasaPct)}
              ). Variación del recaudo:{' '}
              <span data-testid="variacion-del-recaudo">{textoDeLaVariacion(recaudo.variacionPct)}</span>
              {recaudo.variacionPct === null
                ? ' — el mes anterior no recaudó nada, así que no hay contra qué comparar.'
                : '.'}
            </span>
          }
        />
      </div>
    </section>
  );
}

// ══ (b) Cartera por edades ══════════════════════════════════════════════════

function BloqueDeCartera({ tablero }: { tablero: Tablero }) {
  const { cartera } = tablero;
  return (
    <section className="space-y-3" data-testid="bloque-cartera">
      <TituloDeBloque
        titulo="Cartera por edades"
        explicacion="Lo que ya pasó el plazo del contrato, partido por los días DESPUÉS del plazo. No es la deuda total: lo que todavía no vence y lo vencido dentro del plazo no se persiguen."
        accion={
          <Link
            href="/panel/inmobiliaria/pagos/cartera"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver la cartera entera
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Cifra
          id="cartera-total"
          etiqueta="Cartera"
          valor={cartera.totalCop}
          definicion="Todo el capital que pasó el plazo, siniestros incluidos. La suma de los tramos de al lado."
          tono="warning"
          pie={
            <span data-testid="cartera-en-siniestro">
              De eso, {formatCurrency(cartera.enSiniestroCop)} está en siniestro: lo reclama la
              aseguradora, no la cobranza.
            </span>
          }
        />
        {cartera.tramos.map((tramo) => (
          <Cifra
            key={tramo.tramo}
            id={`tramo-${tramo.tramo}`}
            etiqueta={tramo.nombre}
            valor={tramo.carteraCop}
            definicion={definicionDelTramo(tramo)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-fg">Los 20 deudores más grandes</h3>
          <p className="text-caption text-fg-muted">{QUE_ES_LA_ETAPA}</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Días de mora</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Contratos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartera.deudores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-fg-muted">
                    Nadie tiene cartera vencida en este corte. No es un error: es una cartera en cero.
                  </TableCell>
                </TableRow>
              ) : (
                cartera.deudores.map((d, i) => (
                  <TableRow key={d.clienteId ?? `${d.nombre}-${i}`} data-testid="fila-deudor">
                    <TableCell className="font-medium text-fg">{d.nombre}</TableCell>
                    <TableCell className="font-mono text-caption">{d.documento || '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(d.saldoCop)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {NUMERO.format(d.diasDeMora)}
                    </TableCell>
                    <TableCell>{NOMBRE_DE_LA_ETAPA[d.etapa] ?? d.etapa}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{d.contratos}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

// ══ (c) Propietarios ════════════════════════════════════════════════════════

function BloqueDePropietarios({ tablero }: { tablero: Tablero }) {
  const { propietarios } = tablero;
  return (
    <section className="space-y-3" data-testid="bloque-propietarios">
      <TituloDeBloque
        titulo="Plata de los propietarios"
        explicacion="Lo que les toca, en qué estado está y qué está trabado. Lo retenido no es plata nuestra: es de ellos y no les llegó."
        accion={
          <Link
            href="/panel/inmobiliaria/pagos/dispersiones"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ir a dispersiones
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          id="por-girar"
          etiqueta="Por girar"
          valor={propietarios.porGirarCop}
          definicion="Neto liquidado que todavía no entró a ningún lote: se le debe al propietario y no ha salido."
        />
        <Cifra
          id="retenido"
          etiqueta="Retenido"
          valor={propietarios.retenidoCop}
          definicion="Giros frenados por un cambio de cuenta bancaria sin aprobar o por una devolución del banco."
          tono="warning"
        />
        <Cifra
          id="en-lotes-por-aprobar"
          etiqueta="En lotes por aprobar"
          valor={propietarios.enLotesPorAprobarCop}
          definicion={`Ya está armado en ${propietarios.lotesPorAprobar} ${propietarios.lotesPorAprobar === 1 ? 'lote' : 'lotes'} esperando aprobación: nadie lo ha autorizado todavía.`}
        />
        <Cifra
          id="girado-del-mes"
          etiqueta="Girado en el mes"
          valor={propietarios.giradoDelMesCop}
          definicion="Lo que salió al banco en lotes marcados como pagados dentro del mes."
          tono="success"
        />
      </div>
    </section>
  );
}

// ══ (d) Margen ══════════════════════════════════════════════════════════════

function BloqueDeMargen({ tablero }: { tablero: Tablero }) {
  const { margen } = tablero;
  return (
    <section className="space-y-3" data-testid="bloque-margen">
      <TituloDeBloque
        titulo="Lo que gana la inmobiliaria"
        explicacion="Ingresos propios del mes menos los costos de mover la plata que la inmobiliaria asume. Lo que se le traslada al propietario o al inquilino NO entra acá: no es costo suyo."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          id="comisiones"
          etiqueta="Comisiones"
          valor={margen.comisionesCop}
          definicion="Comisión de administración CAUSADA en el mes, se haya cobrado o no."
        />
        <Cifra
          id="intereses"
          etiqueta="Intereses de mora"
          valor={margen.interesesCop}
          definicion="Interés de mora RECAUDADO en el mes. Sólo el que le queda a la inmobiliaria según el mandato."
        />
        <Cifra
          id="gastos-de-cobranza"
          etiqueta="Gastos de cobranza"
          valor={margen.gastosDeCobranzaCop}
          definicion="Lo que se le cobró al inquilino por la gestión de cobro y entró por caja en el mes."
        />
        <Cifra
          id="ingresos-propios"
          etiqueta="Ingresos propios"
          valor={margen.ingresosPropiosCop}
          definicion="La suma de los tres de al lado. No incluye el canon: ese es del propietario."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra
          id="gmf"
          etiqueta="4x1000 (GMF)"
          valor={margen.gmfCop}
          definicion="Sólo la parte que asume la inmobiliaria. Lo que se traslada al propietario sale en su liquidación y no es costo nuestro."
          tono="danger"
        />
        <Cifra
          id="pasarela"
          etiqueta="Pasarela de pago"
          valor={margen.pasarelaCop}
          definicion="Sólo la parte que asume la inmobiliaria. Lo que se traslada al inquilino va como línea aparte de su recibo."
          tono="danger"
        />
        <Cifra
          id="costos"
          etiqueta="Costos de la plata"
          valor={margen.costosCop}
          definicion="4x1000 más pasarela, de lo que asume la inmobiliaria."
          tono="danger"
        />
        <Cifra
          id="margen"
          etiqueta="Margen"
          valor={margen.margenCop}
          definicion="Ingresos propios menos costos de la plata."
          tono={margen.margenCop < 0 ? 'danger' : 'success'}
          pie={
            <span data-testid="margen-pct">
              {margen.margenPct === null
                ? `${SIN_MEDIR} sobre ingresos: no hubo ingresos propios contra los cuales medirlo.`
                : `${textoDeTasa(margen.margenPct)} de los ingresos propios.`}
            </span>
          }
        />
      </div>
    </section>
  );
}
