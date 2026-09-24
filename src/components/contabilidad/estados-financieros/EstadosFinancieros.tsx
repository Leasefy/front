'use client';

/**
 * P&G y balance general (contrato del 18-09, §5).
 *
 * ── 🔴 El canon NO es ingreso, y esta pantalla lo dice siempre ──────────────
 *
 * Es la decisión de producto más importante de acá. Una inmobiliaria que
 * administra $1.200 millones de canon al mes factura $120 de comisión. El canon
 * vive en 2815, que es PASIVO —plata del propietario— así que no aparece en el
 * P&G. La frase va arriba y **también cuando los números están bien**: es
 * justamente entonces cuando alguien pregunta «¿y el canon dónde está?» y, sin
 * respuesta, concluye que el informe está roto.
 *
 * La manda el back en `elCanonNoEsIngreso`; si no llega, se usa la nuestra. Lo
 * que nunca pasa es que la pantalla se quede sin decirlo.
 *
 * ── 🔴 El presupuesto es OTRA tabla, no una columna del árbol ───────────────
 *
 * Un presupuesto pertenece a un rubro («nómina»), no a la subcuenta 510506.
 * Poner una columna de presupuesto en cada cuenta habría obligado a repartir el
 * presupuesto del rubro entre sus cuentas: un número inventado, y de los
 * peligrosos porque se ve razonable. Por eso son dos tablas — el ÁRBOL con
 * `clases` y la COMPARACIÓN con `porRubro`.
 *
 * ── 🔴 Un balance que no cuadra es la noticia, no un detalle ────────────────
 *
 * Va en rojo y ARRIBA, antes de las cifras, con los dos totales y la diferencia.
 * Un balance descuadrado invalida todo lo que está debajo, así que leerlo
 * primero es leerlo en el orden correcto.
 *
 * Y una inmobiliaria nueva SIEMPRE lo va a ver: el PUC semilla no trae cuentas
 * de patrimonio (clase 3) porque el capital lo define la escritura de cada una.
 * Ese caso se reconoce y se explica al lado — que no cuadre sigue siendo cierto,
 * pero buscar el error en el libro sería buscarlo donde no está.
 *
 * ── Lo que no está asentado no aparece, y se dice con el número ─────────────
 *
 * `sinAsentar` sale como aviso arriba. Un P&G que calla tres recibos sin asiento
 * no está incompleto: está mal, y nadie lo sabe.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Avisos, Cifra, CifraDeTexto, TituloDeBloque } from '@/components/finanzas/piezas';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import {
  estadosFinancierosApi,
  type BalanceGeneral,
  type ComparacionDelPyg,
  type EstadoDeResultados,
} from '@/lib/api/estados-financieros.service';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { Sede } from '@/lib/api/finanzas.types';
import {
  PATRIMONIO_LO_CREA_EL_CONTADOR,
  POR_QUE_EL_RESULTADO_VA_APARTE,
  avisoDeLoQueFalta,
  columnasDelPyg,
  descripcionDelDescuadre,
  esElBalanceDeUnaInmobiliariaNueva,
  filasDelPyg,
  ladosDelBalance,
  leyendaDelCanon,
  margenLegible,
  motivoSinComparacionPorRubro,
  totalDelOtroLado,
} from '@/lib/contabilidad/estados-financieros';
import { mesActual } from '@/lib/recaudo/meses';
import { SIN_MEDIR } from '@/lib/tasas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { Bloqueos, Nota } from '../piezas';

export type Informe = 'pyg' | 'balance';

export const INFORMES_FINANCIEROS: readonly Informe[] = ['pyg', 'balance'];

/** `?informe=balance` abre esa pestaña; lo que no existe cae al P&G. */
export function informeFinancieroDe(valor: string | null | undefined): Informe {
  return INFORMES_FINANCIEROS.find((i) => i === valor) ?? 'pyg';
}

/** El último día del mes `AAAA-MM`, que es lo que el balance pide. */
export function ultimoDiaDelMes(mes: string): string {
  const [anio, m] = mes.split('-').map(Number);
  if (!anio || !m) return mes;
  const ultimo = new Date(anio, m, 0);
  const dd = String(ultimo.getDate()).padStart(2, '0');
  return `${mes}-${dd}`;
}

export function EstadosFinancieros({ inicial = 'pyg' }: { inicial?: Informe } = {}) {
  const [informe, setInforme] = useState<Informe>(inicial);
  const [mes, setMes] = useState(() => mesActual());
  const [sedeId, setSedeId] = useState('');
  const [comparar, setComparar] = useState<ComparacionDelPyg[]>(['presupuesto', 'anioAnterior']);
  const [conAcumulado, setConAcumulado] = useState(true);
  const [comparativo, setComparativo] = useState(false);

  const [pyg, setPyg] = useState<EstadoDeResultados | null>(null);
  const [balance, setBalance] = useState<BalanceGeneral | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const hasta = ultimoDiaDelMes(mes);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      if (informe === 'pyg') {
        setPyg(
          await estadosFinancierosApi.pyg({
            mes,
            sedeId: sedeId || undefined,
            acumulado: conAcumulado,
            comparar,
          }),
        );
      } else {
        setBalance(
          await estadosFinancierosApi.balanceGeneral({
            hasta,
            sedeId: sedeId || undefined,
            comparativo,
          }),
        );
      }
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
    // `comparar` es un arreglo nuevo en cada render si se construyera inline;
    // acá vive en el estado, así que su identidad sólo cambia al tocarlo.
  }, [informe, mes, sedeId, conAcumulado, comparar, hasta, comparativo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Las sedes, una vez. Que fallen no tumba el informe: sale consolidado.
  useEffect(() => {
    let vivo = true;
    void finanzasApi
      .sedes()
      .then((s) => {
        if (vivo) setSedes(s.sedes);
      })
      .catch(() => {
        if (vivo) setSedes([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filas = useMemo(() => (pyg ? filasDelPyg(pyg) : []), [pyg]);
  const columnas = useMemo(
    () => columnasDelPyg(comparar, conAcumulado),
    [comparar, conAcumulado],
  );

  const alternarComparacion = (cual: ComparacionDelPyg) =>
    setComparar((previo) =>
      previo.includes(cual) ? previo.filter((c) => c !== cual) : [...previo, cual],
    );

  const informeActual = informe === 'pyg' ? pyg : balance;

  return (
    <div className="space-y-6" data-testid="estados-financieros">
      {/* 🔴 UNA SOLA COSA (Nico, 21-09): «eso del mes, switch tab y la tabla
          deberían ser una sola cosa… y así hay muchas tablas que tienen mes
          afuera, switch tab afuera».
          Acá eran DOS bloques flotando: una tarjeta con el mes, la sede y las
          casillas de comparación, y debajo las pestañas sueltas en el aire. Y
          las casillas estaban en el peor lugar posible: agregan COLUMNAS al
          árbol de cuentas, que vive 600 px más abajo, y se leían como un filtro
          general de la pantalla.
          Ahora: qué informe + de qué mes + de qué sede son una sola fila —las
          tres preguntas son «qué estoy mirando»— y las casillas bajaron a la
          cabecera de la tabla cuyas columnas cambian. */}
      <Tabs value={informe} onValueChange={(v) => setInforme(v as Informe)}>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList variant="segmented" className="justify-start">
            <TabsTrigger value="pyg" data-testid="pestana-pyg" className="whitespace-nowrap">
              Estado de resultados (P&G)
            </TabsTrigger>
            <TabsTrigger value="balance" data-testid="pestana-balance" className="whitespace-nowrap">
              Balance general
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-4">
            <SelectorDeMes mes={mes} onCambiar={setMes} />
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <span>Sede</span>
              <select
                aria-label="Sede"
                className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                data-testid="selector-de-sede"
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
        </div>

        {/* ══ P&G ═══════════════════════════════════════════════════════ */}
        <TabsContent value="pyg" className="space-y-5 pt-5">
          {cargando && !pyg ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Spinner size="lg" />
              <p className="text-sm text-fg-muted">Armando el P&G…</p>
            </div>
          ) : error && !pyg ? (
            <FalloDeCarga error={error} queEs="el estado de resultados" onReintentar={cargar} />
          ) : pyg ? (
            <>
              {/* 🔴 La frase del canon, siempre — también cuando todo está bien. */}
              <Nota testId="el-canon-no-es-ingreso">
                <p>{leyendaDelCanon(pyg)}</p>
              </Nota>

              <Avisos
                avisos={[
                  ...(avisoDeLoQueFalta(pyg.sinAsentar) ? [avisoDeLoQueFalta(pyg.sinAsentar)!] : []),
                  ...pyg.avisos,
                ]}
                testId="avisos-del-pyg"
                titulo="Lo que este informe no cuenta"
              />

              <dl className="grid gap-4 sm:grid-cols-4">
                <Cifra
                  id="ingresos"
                  etiqueta="Ingresos del mes"
                  valor={pyg.resultado.ingresosMesCop}
                  definicion="Las cuentas de la clase 4 asentadas en el mes. No incluye el canon: ése es del propietario."
                />
                <Cifra
                  id="gastos"
                  etiqueta="Gastos del mes"
                  valor={pyg.resultado.gastosMesCop}
                  definicion="Las cuentas de las clases 5, 6 y 7 asentadas en el mes."
                />
                <Cifra
                  id="utilidad"
                  etiqueta="Utilidad del mes"
                  valor={pyg.resultado.utilidadMesCop}
                  definicion="Ingresos menos gastos del mes, antes del cierre anual."
                  tono={pyg.resultado.utilidadMesCop < 0 ? 'danger' : 'success'}
                />
                <CifraDeTexto
                  id="margen"
                  etiqueta="Margen del mes"
                  texto={margenLegible(pyg.resultado.margenMesPct, SIN_MEDIR)}
                  definicion="Utilidad sobre ingresos. Con «—» no hubo ingresos: «vendiste y no ganaste» y «no vendiste» no son lo mismo."
                />
              </dl>

              {/* ── El árbol ──────────────────────────────────────────── */}
              <section
                className="overflow-hidden rounded-lg border border-border bg-surface"
                data-testid="arbol-del-pyg"
              >
                {/* 🔴 Las casillas viven ACÁ y no en la barra de arriba: cada
                    una agrega una COLUMNA a esta tabla. Arriba se leían como un
                    filtro de la pantalla entera y lo que cambiaban quedaba
                    fuera de la vista. */}
                <fieldset className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <legend className="sr-only">Qué columnas agregar al árbol</legend>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-caption font-medium uppercase tracking-wide text-fg-muted">
                      Columnas que se agregan
                    </span>
                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                      <Checkbox
                        checked={conAcumulado}
                        onCheckedChange={(v) => setConAcumulado(v === true)}
                        data-testid="ver-acumulado"
                      />
                      Acumulado del año
                    </label>
                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                      <Checkbox
                        checked={comparar.includes('presupuesto')}
                        onCheckedChange={() => alternarComparacion('presupuesto')}
                        data-testid="ver-presupuesto"
                      />
                      Presupuesto
                    </label>
                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                      <Checkbox
                        checked={comparar.includes('anioAnterior')}
                        onCheckedChange={() => alternarComparacion('anioAnterior')}
                        data-testid="ver-anio-anterior"
                      />
                      Año anterior
                    </label>
                  </div>
                  <p className="text-caption text-fg-muted" data-testid="cuantas-columnas">
                    {columnas.length}{' '}
                    {columnas.length === 1 ? 'columna' : 'columnas'} de cifras
                  </p>
                </fieldset>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cuenta</TableHead>
                        {columnas.map((c) => (
                          <TableHead key={c.clave} className="text-right" title={c.definicion}>
                            {c.titulo}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columnas.length + 1} className="py-8 text-center">
                            <p className="text-sm text-fg-muted">
                              No hay movimientos de ingreso ni de gasto asentados en este mes.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filas.map((f) => (
                          <TableRow key={f.clave} data-testid={`fila-${f.clave}`}>
                            <TableCell
                              className={cn(
                                f.nivel === 'clase' && 'font-semibold text-fg',
                                f.nivel === 'grupo' && 'pl-6 font-medium text-fg',
                                f.nivel === 'cuenta' && 'pl-12 text-fg-muted',
                              )}
                            >
                              <span className="font-mono text-caption">{f.codigo}</span> {f.nombre}
                            </TableCell>
                            {columnas.map((c) => {
                              const valor =
                                c.clave === 'mes'
                                  ? f.mesCop
                                  : c.clave === 'acumulado'
                                    ? f.acumuladoCop
                                    : c.clave === 'anioAnterior'
                                      ? f.anioAnteriorMesCop
                                      : f.anioAnteriorAcumuladoCop;
                              return (
                                <TableCell key={c.clave} className="text-right">
                                  {/* 🔴 `null` es «—», nunca `0`. */}
                                  {valor === null ? (
                                    <span className="text-fg-subtle">—</span>
                                  ) : (
                                    <Monto
                                      valor={valor}
                                      className={cn('text-sm', f.nivel === 'clase' && 'font-medium')}
                                    />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* ── La comparación por rubro, que es OTRA tabla ────────── */}
              {comparar.includes('presupuesto') ? (
                <section className="space-y-3" data-testid="comparacion-por-rubro">
                  <TituloDeBloque
                    titulo="Contra el presupuesto, por rubro"
                    explicacion="El presupuesto se carga por rubro («nómina»), no por subcuenta. Repartirlo entre las cuentas de cada rubro daría un número inventado, así que la comparación va acá y no como una columna del árbol de arriba."
                  />
                  {motivoSinComparacionPorRubro(pyg) ? (
                    <Nota testId="sin-comparacion-por-rubro">
                      <p>{motivoSinComparacionPorRubro(pyg)}</p>
                    </Nota>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border bg-surface">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rubro</TableHead>
                              <TableHead className="text-right">Real del libro</TableHead>
                              <TableHead className="text-right">Presupuesto</TableHead>
                              <TableHead className="text-right">Diferencia</TableHead>
                              <TableHead className="text-right">Año anterior</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pyg.porRubro!.filas.map((f) => (
                              <TableRow key={f.rubro} data-testid={`rubro-${f.rubro}`}>
                                <TableCell>
                                  <p className="text-sm text-fg">{f.nombre}</p>
                                  <p className="text-caption text-fg-muted">
                                    {f.naturaleza === 'INGRESO'
                                      ? 'Ingreso'
                                      : f.naturaleza === 'COSTO'
                                        ? 'Gasto'
                                        : 'Mixto'}
                                  </p>
                                </TableCell>
                                {[f.realCop, f.presupuestoCop, f.contraPresupuestoCop, f.anioAnteriorCop].map(
                                  (valor, i) => (
                                    <TableCell key={i} className="text-right">
                                      {valor === null ? (
                                        <span className="text-fg-subtle" title="No se pudo medir">
                                          —
                                        </span>
                                      ) : (
                                        <Monto valor={valor} className="text-sm" />
                                      )}
                                    </TableCell>
                                  ),
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {pyg.movimientosSinSede > 0 && sedeId ? (
                <Nota testId="movimientos-sin-sede">
                  <p>
                    {pyg.movimientosSinSede.toLocaleString('es-CO')} movimientos no tienen sede, así
                    que no están en este informe filtrado. Aparecen sólo en el consolidado.
                  </p>
                </Nota>
              ) : null}
            </>
          ) : null}
        </TabsContent>

        {/* ══ Balance general ═══════════════════════════════════════════ */}
        <TabsContent value="balance" className="space-y-5 pt-5">
          {cargando && !balance ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Spinner size="lg" />
              <p className="text-sm text-fg-muted">Armando el balance…</p>
            </div>
          ) : error && !balance ? (
            <FalloDeCarga error={error} queEs="el balance general" onReintentar={cargar} />
          ) : balance ? (
            <>
              {/* 🔴 EL DESCUADRE, ARRIBA Y EN ROJO. Todo lo de abajo depende
                  de esto: leerlo primero es leerlo en el orden correcto. */}
              <Bloqueos
                bloqueos={
                  descripcionDelDescuadre(balance, (n) => `$${n.toLocaleString('es-CO')}`)
                    ? [descripcionDelDescuadre(balance, (n) => `$${n.toLocaleString('es-CO')}`)!]
                    : []
                }
                titulo="El balance no cuadra"
                testId="balance-no-cuadra"
              />

              {esElBalanceDeUnaInmobiliariaNueva(balance) ? (
                <Nota testId="falta-el-patrimonio">
                  <p>{PATRIMONIO_LO_CREA_EL_CONTADOR}</p>
                </Nota>
              ) : null}

              <Nota testId="el-canon-no-es-ingreso-balance">
                <p>{leyendaDelCanon(balance)}</p>
              </Nota>

              <Avisos
                avisos={balance.avisos}
                testId="avisos-del-balance"
                titulo="Lo que este balance no cuenta"
              />

              <dl className="grid gap-4 sm:grid-cols-4">
                <Cifra
                  id="activo"
                  etiqueta="Activo"
                  valor={balance.activo.totalCop}
                  definicion="Lo que la inmobiliaria tiene y le deben, al último día del mes."
                />
                <Cifra
                  id="pasivo"
                  etiqueta="Pasivo"
                  valor={balance.pasivo.totalCop}
                  definicion="Lo que debe, incluida la plata de los propietarios que todavía no se giró (2815)."
                />
                <Cifra
                  id="patrimonio"
                  etiqueta="Patrimonio"
                  valor={balance.patrimonio.totalCop}
                  definicion="El capital y las reservas. Lo crea el contador: el plan de cuentas que trae Leasefy no incluye la clase 3."
                />
                <Cifra
                  id="resultado-del-ejercicio"
                  etiqueta="Resultado del ejercicio"
                  valor={balance.resultadoDelEjercicioCop}
                  definicion={POR_QUE_EL_RESULTADO_VA_APARTE}
                  tono={balance.resultadoDelEjercicioCop < 0 ? 'danger' : 'success'}
                />
              </dl>

              <p className="text-caption text-fg-muted" data-testid="ecuacion-del-balance">
                Activo <Monto valor={balance.activo.totalCop} className="text-caption" /> = pasivo +
                patrimonio + resultado{' '}
                <Monto valor={totalDelOtroLado(balance)} className="text-caption" />
                {balance.cuadra ? ' · cuadra.' : ' · NO cuadra.'}
              </p>

              {/* 🔴 La casilla del comparativo vive con las tres listas que
                  cambia, no en una barra de filtros arriba: lo que hace es
                  agregarle a cada cuenta la cifra del año anterior. */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                <label className="flex items-center gap-2 text-sm text-fg-muted">
                  <Checkbox
                    checked={comparativo}
                    onCheckedChange={(v) => setComparativo(v === true)}
                    data-testid="ver-comparativo"
                  />
                  Mostrar al lado la cifra del año anterior
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {ladosDelBalance(balance).map((lado) => (
                  <section
                    key={lado.clave}
                    className="overflow-hidden rounded-lg border border-border bg-surface"
                    data-testid={`lado-${lado.clave}`}
                  >
                    <div className="flex items-baseline justify-between gap-2 border-b border-border p-3">
                      <h3 className="text-sm font-semibold text-fg">{lado.titulo}</h3>
                      <Monto valor={lado.totalCop} className="text-sm font-medium" />
                    </div>
                    {lado.grupos.length === 0 ? (
                      <p className="p-4 text-caption text-fg-muted">
                        Sin cuentas con saldo en este lado.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border-faint">
                        {lado.grupos.map((g) => (
                          <li key={g.codigo} className="p-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-fg">
                                <span className="font-mono text-caption">{g.codigo}</span> {g.nombre}
                              </p>
                              <Monto valor={g.totalCop} className="text-sm" />
                            </div>
                            <ul className="mt-1 space-y-0.5">
                              {g.cuentas.map((c) => (
                                <li
                                  key={c.codigo}
                                  className="flex items-baseline justify-between gap-2 text-caption text-fg-muted"
                                >
                                  <span>
                                    <span className="font-mono">{c.codigo}</span> {c.nombre}
                                  </span>
                                  <span className="flex items-baseline gap-2">
                                    <Monto valor={c.totalCop} className="text-caption" />
                                    {comparativo ? (
                                      c.anioAnteriorTotalCop === null ||
                                      c.anioAnteriorTotalCop === undefined ? (
                                        <span className="text-fg-subtle">—</span>
                                      ) : (
                                        <Monto
                                          valor={c.anioAnteriorTotalCop}
                                          className="text-caption text-fg-subtle"
                                        />
                                      )
                                    ) : null}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {informeActual && cargando ? (
        <p className="text-caption text-fg-muted" role="status">
          Actualizando…
        </p>
      ) : null}

      {!cargando && informeActual ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={cargar}
            data-testid="recargar-informe"
          >
            Volver a calcular
          </Button>
        </div>
      ) : null}
    </div>
  );
}
