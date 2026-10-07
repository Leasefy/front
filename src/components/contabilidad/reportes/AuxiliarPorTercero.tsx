'use client';

/**
 * El auxiliar por tercero, como LISTA (contrato del 18-09, §7).
 *
 * ── Qué problema resuelve ──────────────────────────────────────────────────
 *
 * `GET /reportes/estado-de-cuenta` ya existía, pero exige saber el ID del
 * tercero: sirve cuando se llega desde la ficha de alguien, y no sirve para
 * encontrar a nadie. Esto los enumera, con su saldo, ordenados por lo que el back
 * devuelva, y desde cada fila se salta a su estado de cuenta.
 *
 * ── 🔴 `sinTercero` se muestra SIEMPRE, aunque sea cero ────────────────────
 *
 * Un movimiento a 2815 sin tercero es un asiento que NO cumple el régimen de
 * mandato: la plata del propietario está en el pasivo pero sin decir de quién es.
 * Y es exactamente lo que bloquea la exógena. Un bloque que aparece sólo cuando
 * hay problema enseña a no buscarlo; en cero dice «revisado, está limpio», que es
 * información distinta de «no hay nada acá».
 *
 * ── `cuadraConElLibro` ─────────────────────────────────────────────────────
 *
 * El back compara la suma de los terceros más los movimientos sin tercero contra
 * el libro. Que no cuadre significa que este informe está dejando algo afuera, y
 * entonces los saldos de abajo no se pueden usar para cobrar ni para girar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  LIMITE_POR_DEFECTO_DE_TERCEROS,
  MAX_LIMITE_DE_TERCEROS,
  estadosFinancierosApi,
  type AuxiliarPorTercero as Auxiliar,
} from '@/lib/api/estados-financieros.service';
import { rangoDelMesAnterior } from '@/lib/contabilidad/fechas';
import { loQueLeFaltaAlAuxiliar } from '@/lib/contabilidad/estados-financieros';
import { useI18n } from '@/lib/i18n';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { DescargarElInforme } from './DescargarElInforme';
import { tablasDelAuxiliarPorTercero } from '@/lib/contabilidad/tablas-de-los-informes';
import { Bloqueos, Nota, TarjetaDeInforme } from '../piezas';

/** Los tipos de tercero que el libro usa, tal como se asientan. */
const TIPOS = [
  { valor: '', nombre: 'Todos los terceros' },
  { valor: 'PROPIETARIO', nombre: 'Propietarios' },
  { valor: 'ARRENDATARIO', nombre: 'Arrendatarios' },
  { valor: 'PROVEEDOR', nombre: 'Proveedores' },
] as const;

export function AuxiliarPorTercero() {
  const inicial = useMemo(() => {
    const mes = rangoDelMesAnterior();
    return { desde: `${mes.mes.slice(0, 4)}-01-01`, hasta: mes.hasta };
  }, []);
  const [rango, setRango] = useState(inicial);
  const [terceroTipo, setTerceroTipo] = useState('');
  const [conSaldo, setConSaldo] = useState(true);
  const { formatCurrency } = useI18n();
  const [desplazamiento, setDesplazamiento] = useState(0);

  const [auxiliar, setAuxiliar] = useState<Auxiliar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setAuxiliar(
        await estadosFinancierosApi.terceros({
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
          terceroTipo: terceroTipo || undefined,
          conSaldo,
          limite: LIMITE_POR_DEFECTO_DE_TERCEROS,
          desplazamiento,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [rango.desde, rango.hasta, terceroTipo, conSaldo, desplazamiento]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayMas = auxiliar
    ? auxiliar.desplazamiento + auxiliar.terceros.length < auxiliar.total
    : false;

  return (
    /* 🔴 20-09 · UNA tarjeta. Los filtros dejan de ser una tarjeta aparte de
       la tabla que filtran, y los avisos y el paginador dejan de flotar. */
    <TarjetaDeInforme
      testId="auxiliar-por-tercero"
      filtrosClassName="grid gap-3 sm:grid-cols-4"
      filtros={
        <>
        <div className="sm:col-span-2">
          <RangoDeFechas
            desde={rango.desde}
            hasta={rango.hasta}
            onChange={(r) => {
              setRango(r);
              setDesplazamiento(0);
            }}
            disabled={cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo-de-tercero">Tipo</Label>
          <select
            id="tipo-de-tercero"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={terceroTipo}
            onChange={(e) => {
              setTerceroTipo(e.target.value);
              setDesplazamiento(0);
            }}
            data-testid="tipo-de-tercero"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-fg-muted">
          <Checkbox
            checked={conSaldo}
            onCheckedChange={(v) => {
              setConSaldo(v === true);
              setDesplazamiento(0);
            }}
            data-testid="solo-con-saldo"
          />
          Sólo los que tienen saldo
        </label>
        {/* CB-C-13 (QA-FACT-CONTA-95 r2): el archivo trae TODOS los terceros, no sólo la página: los pide de 200 en 200. */}
        <div className="sm:col-span-4">
          <DescargarElInforme
            informe="Auxiliar por tercero"
            periodo={rango}
            tablas={async () => {
              const filtros = {
                desde: rango.desde || undefined,
                hasta: rango.hasta || undefined,
                terceroTipo: terceroTipo || undefined,
                conSaldo,
              };
              let todo = null as Auxiliar | null;
              for (let desde = 0; ; desde += MAX_LIMITE_DE_TERCEROS) {
                const pagina = await estadosFinancierosApi.terceros({ ...filtros, limite: MAX_LIMITE_DE_TERCEROS, desplazamiento: desde });
                todo = todo ? { ...todo, terceros: [...todo.terceros, ...pagina.terceros] } : pagina;
                if (pagina.terceros.length === 0 || desde + pagina.terceros.length >= pagina.total) break;
              }
              return todo ? tablasDelAuxiliarPorTercero(todo) : [];
            }}
            disabled={!auxiliar || auxiliar.terceros.length === 0}
          />
        </div>
        </>
      }
    >
      {cargando && !auxiliar ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Spinner size="lg" />
          <p className="text-sm text-fg-muted">Buscando los terceros…</p>
        </div>
      ) : error && !auxiliar ? (
        <div className="p-4">
          <FalloDeCarga error={error} queEs="el auxiliar por tercero" onReintentar={cargar} />
        </div>
      ) : auxiliar ? (
        <>
          {/* Que este informe no cuadre contra el libro invalida los saldos.
              🔴 CB-18: con `libro` del back se dice contra qué cuadra o, si se
              puede saber desde acá (todos los terceros a la vista), cuánto falta. */}
          {auxiliar.cuadraConElLibro ? (
            auxiliar.libro ? (
              <p
                className="border-b border-border px-4 py-2 text-caption text-fg-muted"
                data-testid="auxiliar-cuadra"
              >
                Cuadra con el libro: débitos{' '}
                <Monto valor={auxiliar.libro.debitosCop} className="text-caption" /> y créditos{' '}
                <Monto valor={auxiliar.libro.creditosCop} className="text-caption" />.
              </p>
            ) : null
          ) : (
            <div className="border-b border-border p-4">
              <Bloqueos
                bloqueos={[
                  'La suma de los terceros más los movimientos sin tercero NO coincide con el libro: este informe está dejando algo afuera, así que sus saldos no se pueden usar para cobrar ni para girar.',
                  ...(auxiliar.libro ? [fraseDeLoQueFalta(auxiliar, conSaldo, formatCurrency)] : []),
                ]}
                titulo="El auxiliar no cuadra con el libro"
                testId="auxiliar-no-cuadra"
              />
            </div>
          )}

          {/* 🔴 SIEMPRE, aunque sea cero. */}
          <div
            className={
              auxiliar.sinTercero.movimientos > 0
                ? 'space-y-1 border-b border-border bg-danger-soft p-4 text-sm text-fg'
                : 'space-y-1 border-b border-border bg-surface-muted p-4 text-sm text-fg-muted'
            }
            role={auxiliar.sinTercero.movimientos > 0 ? 'alert' : 'status'}
            data-testid="movimientos-sin-tercero"
          >
            {auxiliar.sinTercero.movimientos > 0 ? (
              <>
                <p className="font-medium">
                  {auxiliar.sinTercero.movimientos.toLocaleString('es-CO')} movimientos sin tercero
                </p>
                <p>
                  Un movimiento a la 2815 sin tercero es un asiento que no cumple el régimen de
                  mandato: la plata del propietario está en el pasivo pero sin decir de quién es. Y
                  es lo que bloquea la exógena.
                </p>
                <p className="text-caption">
                  Débitos <Monto valor={auxiliar.sinTercero.debitosCop} className="text-caption" /> ·
                  créditos{' '}
                  <Monto valor={auxiliar.sinTercero.creditosCop} className="text-caption" />
                </p>
              </>
            ) : (
              <p>
                Ningún movimiento quedó sin tercero. Eso es lo que la exógena necesita, y por eso se
                revisa siempre — también cuando está en cero.
              </p>
            )}
          </div>

          <div>
            {auxiliar.terceros.length === 0 ? (
              <p className="p-8 text-center text-sm text-fg-muted">
                Ningún tercero con movimiento en este rango{conSaldo ? ' y con saldo' : ''}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tercero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Débitos</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Cuentas</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auxiliar.terceros.map((t) => (
                      <TableRow
                        key={`${t.terceroTipo}-${t.terceroId}`}
                        data-testid={`tercero-${t.terceroId}`}
                      >
                        <TableCell className="max-w-[16rem]">
                          <p className="truncate text-sm text-fg">
                            {t.nombre ?? 'Sin nombre en el sistema'}
                          </p>
                          <p className="text-caption text-fg-muted">
                            {t.documento ?? 'sin documento'}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-caption text-fg-muted">
                          {t.terceroTipo}
                        </TableCell>
                        <TableCell className="text-right">
                          <Monto valor={t.debitosCop} vacioSiCero className="text-sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Monto valor={t.creditosCop} vacioSiCero className="text-sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          {/* El signo importa y se dice: positivo = nos debe. */}
                          <Monto valor={t.saldoCop} className="text-sm font-medium" />
                        </TableCell>
                        <TableCell className="text-caption text-fg-muted">
                          {t.cuentas.map((c) => c.codigo).join(', ')}
                        </TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" hideArrow asChild>
                            <Link
                              href={`/panel/inmobiliaria/contabilidad/reportes?informe=tercero&terceroTipo=${encodeURIComponent(t.terceroTipo)}&terceroId=${encodeURIComponent(t.terceroId)}`}
                            >
                              Estado de cuenta
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <Nota testId="que-dice-el-saldo">
              <p>
                El saldo va en la convención del libro: <strong>positivo</strong> = el tercero le
                debe a la inmobiliaria; <strong>negativo</strong> = la inmobiliaria le debe a él (el
                caso normal de un propietario con canon recaudado y sin girar).
              </p>
            </Nota>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-caption text-fg-muted" data-testid="pagina-de-terceros">
              {auxiliar.terceros.length.toLocaleString('es-CO')} de{' '}
              {auxiliar.total.toLocaleString('es-CO')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={desplazamiento === 0 || cargando}
                onClick={() =>
                  setDesplazamiento((d) => Math.max(0, d - LIMITE_POR_DEFECTO_DE_TERCEROS))
                }
                data-testid="anterior"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={!hayMas || cargando}
                onClick={() => setDesplazamiento((d) => d + LIMITE_POR_DEFECTO_DE_TERCEROS)}
                data-testid="siguiente"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </TarjetaDeInforme>
  );
}

/**
 * 🔴 CB-18: contra qué no cuadra y, si se puede saber desde acá, cuánto falta.
 * Con terceros en otras páginas (o el filtro «con saldo») sólo se dice lo que
 * suma el libro: la diferencia exacta la sabe el back.
 */
export function fraseDeLoQueFalta(
  auxiliar: Auxiliar,
  conSaldo: boolean,
  formatCurrency: (n: number) => string,
): string {
  const libro = auxiliar.libro;
  if (!libro) return '';
  const delLibro = `El libro suma débitos ${formatCurrency(libro.debitosCop)} y créditos ${formatCurrency(libro.creditosCop)}`;
  const falta = loQueLeFaltaAlAuxiliar(auxiliar, conSaldo);
  if (!falta) {
    return `${delLibro}; para ver cuánto falta, quita «Sólo los que tienen saldo» y mira todos los terceros en una página.`;
  }
  const partes = [
    falta.debitosCop !== 0 ? `${formatCurrency(Math.abs(falta.debitosCop))} en débitos` : null,
    falta.creditosCop !== 0 ? `${formatCurrency(Math.abs(falta.creditosCop))} en créditos` : null,
  ].filter(Boolean);
  return `${delLibro}: la diferencia con los terceros es de ${partes.join(' y ')}.`;
}
