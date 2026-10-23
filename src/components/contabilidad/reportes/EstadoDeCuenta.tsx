'use client';

/**
 * El estado de cuenta de un tercero: todo lo que se movió a su nombre, en
 * todas las cuentas.
 *
 * El back lo pide por `terceroTipo` + `terceroId` **tal como se asentó**.
 * Para propietarios e inquilinos hay buscador (son los dos terceros que el
 * panel conoce); para cualquier otro tipo se pega el id a mano. El signo es
 * convención fija del informe: positivo = le debe a la inmobiliaria,
 * negativo = la inmobiliaria le debe.
 *
 * Una fila por movimiento y en una línea (Nico, 2026-09-03): la cuenta y la
 * descripción iban en dos renglones cada una y una cuenta de un año era una
 * pantalla por mes. El recorte lo hace la paginación —el back devuelve el
 * estado entero en un pedido—, y el saldo inicial sólo se pinta en la primera
 * página.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, UserList } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { contabilidadApi, type EstadoDeCuenta as Estado } from '@/lib/api/contabilidad.service';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { inquilinosApi } from '@/lib/api/inquilinos.service';
import { diaLegible, rangoInvertido } from '@/lib/contabilidad/fechas';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { TarjetaDeInforme, EsqueletoDeTabla } from '../piezas';
import { RangoDeFechas } from '../RangoDeFechas';
import { DescargarElInforme } from './DescargarElInforme';
import { tablasDelEstadoDeCuenta } from '@/lib/contabilidad/tablas-de-los-informes';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';

const TIPOS = ['PROPIETARIO', 'ARRENDATARIO', 'PROVEEDOR', 'OTRO'] as const;
type Tipo = (typeof TIPOS)[number];

const NOMBRE_DE_TIPO: Record<Tipo, string> = {
  PROPIETARIO: 'Propietario',
  ARRENDATARIO: 'Arrendatario',
  PROVEEDOR: 'Proveedor',
  OTRO: 'Otro',
};

const COLUMNAS = 7;

interface Candidato {
  id: string;
  nombre: string;
  detalle: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EstadoDeCuenta() {
  const [tipo, setTipo] = useState<Tipo>('PROPIETARIO');
  const [tipoLibre, setTipoLibre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<Candidato | null>(null);
  const [idManual, setIdManual] = useState('');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const conBuscador = tipo === 'PROPIETARIO' || tipo === 'ARRENDATARIO';
  const terceroTipo = tipo === 'OTRO' ? tipoLibre.trim().toUpperCase() : tipo;
  const terceroId = conBuscador ? (elegido?.id ?? '') : idManual.trim();
  const invertido = rangoInvertido(rango.desde, rango.hasta);
  const listo = Boolean(terceroTipo) && UUID.test(terceroId) && !invertido;

  const renglones = listo && estado ? estado.renglones : [];
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(renglones, {
      resetKey: `${terceroTipo}|${terceroId}|${rango.desde}|${rango.hasta}`,
    });

  // Cambiar de tipo descarta lo elegido: un id de propietario no es de inquilino.
  useEffect(() => {
    setElegido(null);
    setCandidatos([]);
    setBusqueda('');
    setEstado(null);
  }, [tipo]);

  useEffect(() => {
    if (!conBuscador) return;
    const q = busqueda.trim();
    if (q.length < 2) {
      setCandidatos([]);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const lista: Candidato[] =
          tipo === 'PROPIETARIO'
            ? (await propietariosApi.getAll({ search: q, limit: 8 })).map((p) => ({
                id: p.id,
                nombre: p.name,
                detalle: p.documentNumber ? documentoConTipo(p.documentType, p.documentNumber, ' ') : (p.email ?? ''),
              }))
            : (await inquilinosApi.listar({ buscar: q })).slice(0, 8).map((i) => ({
                id: i.tenantId,
                nombre: i.nombre,
                detalle: i.email ?? i.telefono ?? '',
              }));
        if (vivo) setCandidatos(lista);
      } catch {
        if (vivo) setCandidatos([]);
      } finally {
        if (vivo) setBuscando(false);
      }
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busqueda, tipo, conBuscador]);

  const cargar = useCallback(async () => {
    if (!listo) return;
    setCargando(true);
    setError(null);
    try {
      setEstado(
        await contabilidadApi.reportes.estadoDeCuenta({
          terceroTipo,
          terceroId,
          desde: rango.desde || undefined,
          hasta: rango.hasta || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [listo, terceroTipo, terceroId, rango.desde, rango.hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const saldoFinal = estado?.saldoFinalCop ?? 0;
  const lectura = useMemo(() => {
    if (!estado) return null;
    if (saldoFinal > 0) return 'Le debe a la inmobiliaria.';
    if (saldoFinal < 0) return 'La inmobiliaria le debe.';
    return 'A paz y salvo.';
  }, [estado, saldoFinal]);

  const vacio = listo && estado !== null && estado.renglones.length === 0;

  return (
    /* 🔴 20-09 · UNA tarjeta: elegir el tercero, el saldo final y los
       movimientos son el mismo objeto. Antes eran tres tarjetas apiladas. */
    <TarjetaDeInforme
      testId="estado-de-cuenta-de-un-tercero"
      filtrosClassName="grid gap-4 lg:grid-cols-[200px_minmax(280px,1fr)_minmax(280px,420px)]"
      filtros={
        <>
        <div className="space-y-1.5">
          <Label id="tercero-tipo">Tipo de tercero</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger aria-labelledby="tercero-tipo" data-testid="tercero-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {NOMBRE_DE_TIPO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipo === 'OTRO' ? (
            <Input
              aria-label="Tipo tal como se asentó"
              value={tipoLibre}
              onChange={(e) => setTipoLibre(e.target.value)}
              placeholder="ASEGURADORA"
              maxLength={20}
              className="font-mono uppercase"
            />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tercero-busqueda">{conBuscador ? 'Tercero' : 'Id del tercero'}</Label>
          {conBuscador ? (
            elegido ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{elegido.nombre}</p>
                  <p className="truncate font-mono text-caption text-fg-muted">{elegido.detalle}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-fg-muted underline hover:text-fg"
                  onClick={() => setElegido(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  id="tercero-busqueda"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={tipo === 'PROPIETARIO' ? 'Nombre o documento' : 'Nombre, correo o teléfono'}
                  className="pl-9"
                  autoComplete="off"
                  data-testid="tercero-busqueda"
                />
                {busqueda.trim().length >= 2 ? (
                  <ul
                    className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-md"
                    role="listbox"
                    data-testid="tercero-candidatos"
                  >
                    {buscando ? (
                      <li className="px-3 py-2 text-sm text-fg-muted">Buscando…</li>
                    ) : candidatos.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-fg-muted">Nadie con ese dato.</li>
                    ) : (
                      candidatos.map((c) => (
                        <li key={c.id} role="option" aria-selected={false}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-muted"
                            onClick={() => {
                              setElegido(c);
                              setBusqueda('');
                            }}
                          >
                            <span className="text-sm text-fg">{c.nombre}</span>
                            <span className="font-mono text-caption text-fg-muted">{c.detalle}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>
            )
          ) : (
            <>
              <Input
                id="tercero-busqueda"
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                placeholder="El id con el que se asentó"
                className="font-mono"
                autoComplete="off"
                aria-invalid={(idManual.trim() !== '' && !UUID.test(idManual.trim())) || undefined}
                aria-describedby={
                  idManual.trim() !== '' && !UUID.test(idManual.trim())
                    ? 'tercero-busqueda-error'
                    : undefined
                }
              />
              <ErrorDelCampo
                id="tercero-busqueda-error"
                mensaje={
                  idManual.trim() !== '' && !UUID.test(idManual.trim())
                    ? 'Tiene que ser un id (uuid).'
                    : null
                }
              />
            </>
          )}
        </div>

        <RangoDeFechas desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
        {/* CB-C-13 (QA-FACT-CONTA-95 r2): lo que el contador firma se baja, con TODAS las filas. */}
        <DescargarElInforme
          informe="Estado de cuenta del tercero"
          periodo={rango}
          tablas={() =>
            estado
              ? tablasDelEstadoDeCuenta(estado, elegido ? `${elegido.nombre} · ${elegido.detalle}` : `${terceroTipo} ${terceroId}`)
              : []
          }
          disabled={!estado || !listo}
        />
        </>
      }
    >
      {listo && estado ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
          <div>
            <p className="text-sm text-fg-muted">Saldo final</p>
            <p className="text-2xl">
              <Monto valor={estado.saldoFinalCop} className="font-medium" />
            </p>
          </div>
          <p className="text-sm text-fg-muted">
            {lectura} Convención: débitos − créditos; en negativo, la inmobiliaria debe.
          </p>
        </div>
      ) : null}

        <EstadoDeDatos
          cargando={cargando && estado === null}
          error={error}
          queEs="el estado de cuenta"
          onReintentar={cargar}
          esqueleto={
            <EsqueletoDeTabla />
          }
        >
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead numeric>Asiento</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead numeric>Débito</TableHead>
                  <TableHead numeric>Crédito</TableHead>
                  <TableHead numeric>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {!listo || vacio ? (
                  <TableRow className="hover:bg-transparent max-md:block">
                    <TableCell colSpan={COLUMNAS} className="p-0 max-md:block">
                      <SinDatos
                        queSon="movimientos"
                        icono={UserList}
                        titulo={!listo ? 'Elige un tercero' : 'Sin movimientos en este rango'}
                        descripcion={
                          !listo
                            ? 'El estado de cuenta junta todo lo que se asentó a su nombre, en todas las cuentas, con saldo corrido.'
                            : 'Nada se asentó a nombre de este tercero entre esas fechas.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {page === 1 && estado ? (
                      <TableRow className="hover:bg-transparent max-md:flex max-md:items-baseline max-md:justify-between max-md:border-b max-md:border-border max-md:px-4 max-md:py-3">
                        <TableCell colSpan={6} muted className="whitespace-nowrap max-md:block max-md:p-0">
                          Saldo inicial
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap max-md:block max-md:p-0">
                          <Monto valor={estado.saldoInicialCop} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {pageItems.map((r, i) => (
                      <TableRow
                        key={`${r.asientoId}-${i}`}
                        className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3 max-md:last:border-0"
                      >
                        <TableCell className="whitespace-nowrap tabular-nums text-fg-muted max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption">
                          {diaLegible(r.fecha)}
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap font-mono max-md:col-start-1 max-md:row-start-4 max-md:block max-md:p-0 max-md:text-left max-md:text-caption max-md:text-fg-muted max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Asiento N.º">
                          {r.numero}
                        </TableCell>
                        <TableCell className="max-w-[260px] max-md:col-start-1 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0 max-md:text-caption">
                          <span className="flex items-baseline gap-1.5">
                            <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">
                              {r.codigo}
                            </span>
                            <span className="truncate text-fg" title={r.cuenta}>
                              {r.cuenta}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[300px] max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0">
                          <span className="flex items-baseline gap-1.5">
                            <span className="truncate text-fg" title={r.descripcionAsiento}>
                              {r.descripcionAsiento}
                            </span>
                            {r.descripcion ? (
                              <span
                                className="max-w-[40%] shrink-0 truncate text-caption text-fg-muted"
                                title={r.descripcion}
                              >
                                · {r.descripcion}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Débito">
                          <Monto valor={r.debitoCop} vacioSiCero />
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Crédito">
                          <Monto valor={r.creditoCop} vacioSiCero />
                        </TableCell>
                        <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                          <Monto valor={r.saldoCop} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
              {listo && estado && !vacio ? (
                <TableFooter className="max-md:block">
                  <TableRow className="hover:bg-transparent max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:px-4 max-md:py-3">
                    <TableCell colSpan={4} className="whitespace-nowrap text-sm font-medium text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                      Totales del período
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Débitos">
                      <Monto valor={estado.debitosCop} className="text-fg" />
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Créditos">
                      <Monto valor={estado.creditosCop} className="text-fg" />
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:before:mr-1.5 max-md:before:font-sans max-md:before:text-caption max-md:before:text-fg-subtle max-md:before:content-[attr(data-etiqueta)]" data-etiqueta="Saldo final">
                      <Monto valor={estado.saldoFinalCop} className="text-fg" />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>

          {shouldPaginate ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          ) : null}
        </EstadoDeDatos>
    </TarjetaDeInforme>
  );
}
