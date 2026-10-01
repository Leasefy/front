'use client';

/**
 * El libro mayor: cada cuenta con su saldo anterior, sus débitos y créditos
 * partidos por mes y su saldo final (contrato del 18-09, §7).
 *
 * ── Por qué «por mes» y no un total ────────────────────────────────────────
 *
 * Un total de doce meses en una cuenta de gasto no dice nada: lo que el contador
 * busca es el mes en que se salió de la línea. Partirlo por mes es lo que hace
 * que un pico de noviembre se vea sin abrir el auxiliar.
 *
 * ── 🔴 No se dibujan meses que no llegaron ─────────────────────────────────
 *
 * El back manda `meses` con todo el rango pedido. Si el rango llega a diciembre y
 * hoy es septiembre, tres columnas en cero se leen como «no se movió nada en
 * octubre», cuando lo que pasa es que octubre no llegó. `mesesConDatos` las
 * recorta.
 *
 * ── El descuadre, arriba ───────────────────────────────────────────────────
 *
 * Con partida doble los débitos y los créditos del período tienen que ser
 * iguales. Que no lo sean es un defecto del libro, no de este informe, y se dice
 * en rojo antes de la tabla — igual que en el balance de prueba.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  NIVELES_DEL_MAYOR,
  NOMBRE_DEL_NIVEL,
  estadosFinancierosApi,
  type LibroMayor as Mayor,
  type NivelDelMayor,
} from '@/lib/api/estados-financieros.service';
import { descuadreDelMayor, mesesConDatos } from '@/lib/contabilidad/estados-financieros';
import { hoy, rangoDelMesAnterior } from '@/lib/contabilidad/fechas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { Bloqueos, Nota, TarjetaDeInforme } from '../piezas';

/** Las clases del PUC que se pueden pedir sueltas. */
const CLASES = [
  { valor: '', nombre: 'Todas las clases' },
  { valor: '1', nombre: '1 · Activo' },
  { valor: '2', nombre: '2 · Pasivo' },
  { valor: '3', nombre: '3 · Patrimonio' },
  { valor: '4', nombre: '4 · Ingresos' },
  { valor: '5', nombre: '5 · Gastos' },
  { valor: '6', nombre: '6 · Costo de ventas' },
  { valor: '7', nombre: '7 · Costos de producción' },
] as const;

export function LibroMayor() {
  const inicial = useMemo(() => {
    const mes = rangoDelMesAnterior();
    return { desde: `${mes.mes.slice(0, 4)}-01-01`, hasta: mes.hasta };
  }, []);
  const [rango, setRango] = useState(inicial);
  const [nivel, setNivel] = useState<NivelDelMayor>('4');
  const [clase, setClase] = useState('');

  const [mayor, setMayor] = useState<Mayor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMayor(
        await estadosFinancierosApi.mayor({
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
          nivel,
          clase: clase || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [rango.desde, rango.hasta, nivel, clase]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const meses = useMemo(
    () => (mayor ? mesesConDatos(mayor, hoy().slice(0, 7)) : []),
    [mayor],
  );
  const recortados = mayor ? mayor.meses.length - meses.length : 0;
  const descuadre = mayor ? descuadreDelMayor(mayor, formatCurrency) : null;

  return (
    /* 🔴 20-09 · Eran cuatro bloques sueltos —filtros, avisos, tabla y
       totales—, cada uno con su borde o flotando en el aire. Ahora es UNA
       tarjeta: los filtros pegados a la tabla que filtran, los avisos entre
       medio y los totales en el pie, separados por bordes y no por 20 px de
       vacío. */
    <TarjetaDeInforme
      testId="libro-mayor"
      filtrosClassName="grid gap-3 sm:grid-cols-4"
      filtros={
        <>
        <div className="sm:col-span-2">
          <RangoDeFechas
            desde={rango.desde}
            hasta={rango.hasta}
            onChange={setRango}
            disabled={cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nivel-del-mayor">Agrupar por</Label>
          <select
            id="nivel-del-mayor"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as NivelDelMayor)}
            data-testid="nivel-del-mayor"
          >
            {NIVELES_DEL_MAYOR.map((n) => (
              <option key={n} value={n}>
                {NOMBRE_DEL_NIVEL[n]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clase-del-mayor">Clase</Label>
          <select
            id="clase-del-mayor"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={clase}
            onChange={(e) => setClase(e.target.value)}
            data-testid="clase-del-mayor"
          >
            {CLASES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        </>
      }
    >
      {cargando && !mayor ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Spinner size="lg" />
          <p className="text-sm text-fg-muted">Armando el mayor…</p>
        </div>
      ) : error && !mayor ? (
        <div className="p-4">
          <FalloDeCarga error={error} queEs="el libro mayor" onReintentar={cargar} />
        </div>
      ) : mayor ? (
        <>
          {/* 🔴 Con partida doble esto no puede pasar: es un defecto del libro. */}
          {descuadre ? (
            <div className="border-b border-border p-4">
              <Bloqueos
                bloqueos={[descuadre]}
                titulo="El mayor no cuadra"
                testId="mayor-no-cuadra"
              />
            </div>
          ) : null}

          {recortados > 0 ? (
            <div className="border-b border-border p-4">
            <Nota testId="meses-recortados">
              <p>
                {recortados === 1
                  ? 'Se sacó 1 mes del rango que todavía no llegó'
                  : `Se sacaron ${recortados} meses del rango que todavía no llegaron`}
                : una columna en cero se leería como «no se movió nada», y lo que pasa es que ese mes
                no empezó.
              </p>
            </Nota>
            </div>
          ) : null}

          <div>
            {mayor.filas.length === 0 ? (
              <p className="p-8 text-center text-sm text-fg-muted">
                No hay movimientos en este rango con estos filtros.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-surface">Cuenta</TableHead>
                      <TableHead className="text-right">Saldo anterior</TableHead>
                      {meses.map((m) => (
                        <TableHead key={m} colSpan={2} className="text-center">
                          {m}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Débitos</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                      <TableHead className="text-right">Saldo final</TableHead>
                    </TableRow>
                    {meses.length > 0 ? (
                      <TableRow>
                        <TableHead className="sticky left-0 bg-surface" />
                        <TableHead />
                        {/* `Fragment` con `key` y no `<>`: un fragmento corto no
                            acepta key, y sin key React avisa por cada mes. */}
                        {meses.map((m) => (
                          <Fragment key={m}>
                            <TableHead className="text-right text-caption">Débito</TableHead>
                            <TableHead className="text-right text-caption">Crédito</TableHead>
                          </Fragment>
                        ))}
                        <TableHead />
                        <TableHead />
                        <TableHead />
                      </TableRow>
                    ) : null}
                  </TableHeader>
                  <TableBody>
                    {mayor.filas.map((f) => (
                      <TableRow key={f.codigo} data-testid={`mayor-${f.codigo}`}>
                        <TableCell className="sticky left-0 whitespace-nowrap bg-surface">
                          <span className="font-mono text-caption">{f.codigo}</span> {f.nombre}
                        </TableCell>
                        <TableCell className="text-right">
                          <Monto valor={f.saldoAnteriorCop} vacioSiCero className="text-sm" />
                        </TableCell>
                        {meses.map((m) => {
                          const delMes = f.porMes.find((p) => p.mes === m);
                          return (
                            <Fragment key={m}>
                              <TableCell className="text-right">
                                <Monto
                                  valor={delMes?.debitosCop ?? 0}
                                  vacioSiCero
                                  className="text-sm"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Monto
                                  valor={delMes?.creditosCop ?? 0}
                                  vacioSiCero
                                  className="text-sm"
                                />
                              </TableCell>
                            </Fragment>
                          );
                        })}
                        <TableCell className="text-right">
                          <Monto valor={f.debitosCop} vacioSiCero className="text-sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Monto valor={f.creditosCop} vacioSiCero className="text-sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Monto valor={f.saldoFinalCop} className="text-sm font-medium" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-caption text-fg-muted" data-testid="totales-del-mayor">
              Débitos <Monto valor={mayor.totalDebitosCop} className="text-caption" /> · créditos{' '}
              <Monto valor={mayor.totalCreditosCop} className="text-caption" />
              {mayor.cuadra ? ' · cuadra.' : ' · NO cuadra.'}
              {/* 🔴 20-09 · Con más de dos meses la tabla no cabe en 1440 px y
                  se corta a la derecha sin decirlo: en la captura se leía
                  «$ 317.» y ahí terminaba. La columna de la cuenta queda
                  anclada, así que desplazarse funciona — lo que faltaba era
                  avisar que hay algo más allá del borde. */}
              {meses.length > 2 ? (
                <span data-testid="el-mayor-se-desplaza">
                  {' '}· {meses.length} meses: la tabla se desplaza de lado, con la cuenta fija.
                </span>
              ) : null}
            </p>
            <Button variant="ghost" size="sm" hideArrow onClick={cargar} data-testid="recargar-mayor">
              Volver a calcular
            </Button>
          </div>
        </>
      ) : null}
    </TarjetaDeInforme>
  );
}
