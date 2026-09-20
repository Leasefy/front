'use client';

/**
 * 🔴 PROVEEDORES ES UNA TABLA (Nico, 19-09-2026).
 *
 * «Esto parece ser una tabla; si es una tabla, por favor organízala y colócale
 * siempre todo lo que tienen nuestras tablas, que queden juntas, se vean bien.»
 *
 * Tenía razón, y el defecto era el mismo de Pagos esa misma mañana: **los
 * controles de la tabla vivían fuera de la tabla**. Un `Input` suelto y una
 * casilla pelada («Ver también los inactivos») flotaban sobre el fondo de la
 * página, y debajo venía una pila de `<li>` con tarjeta propia. Cada fila
 * repetía los mismos seis datos en seis posiciones distintas, así que no se
 * podían comparar dos proveedores: para saber cuál tiene mejor calificación
 * había que leer las dos tarjetas enteras. Eso es exactamente lo que una tabla
 * resuelve —una columna por dato, un renglón por proveedor— y era lo único
 * que esta pantalla no tenía.
 *
 * Acá queda con el chasis de la casa, el mismo de Renovaciones y Contratos:
 *  · UNA tarjeta con encabezado, y todo lo demás adentro;
 *  · UNA franja de filtros pegada a la tabla: cajones, oficio y buscador;
 *  · el alcance («3 de 41») con su «Quitar los filtros», sólo si hay algo puesto;
 *  · encabezados que ordenan;
 *  · el vacío y el fallo DENTRO de la tabla (fila con `colSpan`), nunca un
 *    cartel suelto debajo de un encabezado flotante;
 *  · paginado al pie cuando hay más de una página.
 *
 * 🔴 «Ver también los inactivos» dejó de ser una casilla. Es un filtro de la
 * tabla —achica la lista, como el buscador— y una casilla suelta no se lee
 * como filtro: se lee como una preferencia. Son tres cajones con su conteo
 * (Activos · Inactivos · Todos), la misma forma que la deuda del mes.
 *
 * 🔴 El orden por defecto es POR PAPELES, no alfabético. A un proveedor sin
 * RUT no se le puede facturar y a uno sin seguridad social no se le debería
 * abrir la puerta de un inmueble: son los que piden una acción hoy, y por eso
 * entran arriba. Con papeles iguales, manda el nombre.
 *
 * 🔴 Los AVISOS se pintan palabra por palabra como los manda el back. Que falte
 * el RUT o esté vencida la seguridad social es la misma regla que decide si a
 * ese proveedor se le puede pagar: vive en `proveedores.service.ts` y acá sólo
 * se muestra. Ni se resume, ni se reordena, ni se convierte en un icono con
 * globito —un globito esconde justo el renglón por el que existe la pantalla.
 */

import { useMemo, useState } from 'react';
import {
  CheckCircle,
  MagnifyingGlass,
  SortAscending,
  SortDescending,
  Star,
  WarningCircle,
  Wrench,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { SinDatos } from '@/components/estado/SinDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Chip } from '@leasefy/cadence';
import { ESPECIALIDADES, EN_PALABRAS } from './especialidades';
import type { ProveedorDeMantenimiento } from '@/lib/api/proveedores-de-mantenimiento.service';

type Cajon = 'activos' | 'inactivos' | 'todos';
type CampoDeOrden = 'nombre' | 'calificacion' | 'papeles';
type Direccion = 'asc' | 'desc';

const COLUMNAS = 6;

export interface TablaDeProveedoresProps {
  proveedores: ProveedorDeMantenimiento[];
  cargando?: boolean;
  /**
   * Lo que tiró la carga, si falló. Sin esto la tabla afirmaría «todavía no hay
   * proveedores» sobre una petición muerta, que es lo contrario de lo que pasó.
   */
  error?: unknown;
  onReintentar?: () => void;
  puedeEditar: boolean;
  /** El vacío de verdad ofrece registrar al primero; el vacío por filtro, no. */
  onRegistrar?: () => void;
  onEditar: (p: ProveedorDeMantenimiento) => void;
  onDesactivar: (p: ProveedorDeMantenimiento) => void;
  onReactivar: (p: ProveedorDeMantenimiento) => void;
  onVerHistorial: (p: ProveedorDeMantenimiento) => void;
}

/** Sin tildes y en minúsculas: nadie escribe «Plomería» con tilde en un buscador. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Lo que el buscador mira de un proveedor: como uno lo nombra por teléfono. */
function textoBuscableDe(p: ProveedorDeMantenimiento): string {
  return [
    p.nombre,
    p.documento,
    p.telefono,
    p.correo,
    ...p.especialidades.map((e) => EN_PALABRAS.get(e) ?? e),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * «31 dic 2026», leyendo la parte `YYYY-MM-DD`: la vigencia es un DATE que
 * viaja como medianoche UTC, y en Bogotá `new Date(iso)` cae al día anterior.
 */
function fechaCorta(iso: string | null | undefined): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!partes) return null;
  const d = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return d
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ de /g, ' ')
    .replace(/\.$/, '');
}

/** La vigencia que se vence primero: es la que dice hasta cuándo está al día. */
function venceProximo(p: ProveedorDeMantenimiento): string | null {
  const fechas = [p.rut?.vigenteHasta, p.seguridadSocial?.vigenteHasta].filter(
    (f): f is string => Boolean(f),
  );
  if (fechas.length === 0) return null;
  return fechas.sort()[0];
}

export function TablaDeProveedores({
  proveedores,
  cargando = false,
  error,
  onReintentar,
  puedeEditar,
  onRegistrar,
  onEditar,
  onDesactivar,
  onReactivar,
  onVerHistorial,
}: TablaDeProveedoresProps) {
  const [cajon, setCajon] = useState<Cajon>('activos');
  const [especialidad, setEspecialidad] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [campo, setCampo] = useState<CampoDeOrden>('papeles');
  const [direccion, setDireccion] = useState<Direccion>('desc');

  const conteos = useMemo(
    () => ({
      activos: proveedores.filter((p) => p.activo).length,
      inactivos: proveedores.filter((p) => !p.activo).length,
      todos: proveedores.length,
    }),
    [proveedores],
  );

  const filtrados = useMemo(() => {
    let filas = proveedores.filter((p) =>
      cajon === 'todos' ? true : cajon === 'activos' ? p.activo : !p.activo,
    );
    if (especialidad !== 'todas') {
      filas = filas.filter((p) => p.especialidades.includes(especialidad));
    }
    const q = normalizar(busqueda);
    if (q !== '') {
      filas = filas.filter((p) => normalizar(textoBuscableDe(p)).includes(q));
    }
    // El nombre es el desempate de todos los órdenes: sin él, dos proveedores
    // con los mismos papeles quedan en el orden en que los devolvió la base,
    // que cambia entre recargas y se lee como si la tabla se moviera sola.
    const porNombre = (a: ProveedorDeMantenimiento, b: ProveedorDeMantenimiento) =>
      a.nombre.localeCompare(b.nombre, 'es');
    const signo = direccion === 'asc' ? 1 : -1;
    return [...filas].sort((a, b) => {
      if (campo === 'nombre') return porNombre(a, b) * signo;
      if (campo === 'calificacion') {
        // Sin calificar no es «cero estrellas»: es que todavía nadie lo
        // calificó. Va al final en los dos sentidos, no al fondo del ranking.
        if (a.calificacion === null && b.calificacion === null) return porNombre(a, b);
        if (a.calificacion === null) return 1;
        if (b.calificacion === null) return -1;
        const d = (a.calificacion - b.calificacion) * signo;
        return d !== 0 ? d : porNombre(a, b);
      }
      const d = (a.avisos.length - b.avisos.length) * signo;
      return d !== 0 ? d : porNombre(a, b);
    });
  }, [proveedores, cajon, especialidad, busqueda, campo, direccion]);

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filtrados, { resetKey: `${cajon}|${especialidad}|${busqueda}` });

  /*
   * «Activos» es el estado en que abre la tabla, así que NO cuenta como filtro
   * puesto: si contara, el alcance saldría siempre y diría «41 de 41» sobre una
   * tabla que nadie tocó.
   */
  const hayFiltros = cajon !== 'activos' || especialidad !== 'todas' || busqueda.trim() !== '';
  const limpiarFiltros = () => {
    setCajon('activos');
    setEspecialidad('todas');
    setBusqueda('');
  };

  const ordenarPor = (siguiente: CampoDeOrden) => {
    if (campo === siguiente) {
      setDireccion(direccion === 'asc' ? 'desc' : 'asc');
      return;
    }
    setCampo(siguiente);
    // Al cambiar de columna manda lo que esa columna considera «primero»: el
    // nombre arranca de la A, y las estrellas y los papeles, de lo más alto.
    setDireccion(siguiente === 'nombre' ? 'asc' : 'desc');
  };

  const IconoDeOrden = direccion === 'asc' ? SortAscending : SortDescending;

  const EncabezadoOrdenable = ({
    valor,
    children,
    className,
  }: {
    valor: CampoDeOrden;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={cn('whitespace-nowrap', className)}>
      {/*
        allowlist: disparador de orden — no hay primitiva en Cadence. El
        `<button>` no hereda las mayúsculas del `TH` (el navegador fuerza
        `text-transform: none` en los controles), así que las repite y toma el
        resto de la tipografía con `inherit`. Canónico: DispersionTable.
      */}
      <button
        type="button"
        onClick={() => ordenarPor(valor)}
        data-testid={`ordenar-por-${valor}`}
        className="flex items-center gap-2 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-fg-subtle transition-colors hover:text-fg"
      >
        {children}
        {campo === valor && <IconoDeOrden className="h-3.5 w-3.5" />}
      </button>
    </TableHead>
  );

  const cajonChip = (valor: Cajon, etiqueta: string) => (
    <Chip selected={cajon === valor} onClick={() => setCajon(valor)} data-testid={`cajon-${valor}`}>
      {etiqueta}
      <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
        {conteos[valor]}
      </span>
    </Chip>
  );

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-testid="proveedores-tabla"
    >
      {/* Encabezado de la tarjeta — el mismo de Contratos y Renovaciones. */}
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <Wrench className="h-[18px] w-[18px] text-fg-muted" weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">A quién llamas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Arriba quedan los que tienen algo pendiente en sus papeles: a esos
              no se les puede facturar ni mandar a un inmueble todavía.
            </p>
          </div>
        </div>
      </div>

      {/* UNA franja de filtros, pegada a la tabla. */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {cajonChip('activos', 'Activos')}
          {cajonChip('inactivos', 'Inactivos')}
          {cajonChip('todos', 'Todos')}
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border lg:block" />
          <Select value={especialidad} onValueChange={setEspecialidad}>
            <SelectTrigger
              className="h-9 w-auto gap-2 text-sm font-medium"
              aria-label="Filtrar por oficio"
              data-testid="filtro-especialidad"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos los oficios</SelectItem>
              {ESPECIALIDADES.map((e) => (
                <SelectItem key={e.valor} value={e.valor}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full lg:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            type="search"
            placeholder="Nombre, documento, teléfono u oficio"
            aria-label="Buscar proveedor"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="buscar-proveedores"
          />
        </div>
      </div>

      {/* El alcance, sólo con algo puesto: el encabezado habla de TODOS los
          proveedores y la tabla de los que quedaron, y los dos números tienen
          que poder conciliarse. */}
      {hayFiltros && (
        <p
          className="border-b border-border px-5 py-2 text-xs text-fg-muted"
          data-testid="alcance-de-proveedores"
        >
          {filtrados.length} de {proveedores.length}{' '}
          {proveedores.length === 1 ? 'proveedor' : 'proveedores'}.{' '}
          <button
            type="button"
            onClick={limpiarFiltros}
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="limpiar-filtros-proveedores"
          >
            Quitar los filtros
          </button>
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <EncabezadoOrdenable valor="nombre">Proveedor</EncabezadoOrdenable>
            <TableHead className="whitespace-nowrap">Contacto</TableHead>
            <TableHead className="whitespace-nowrap">Qué hace</TableHead>
            <EncabezadoOrdenable valor="calificacion">Calificación</EncabezadoOrdenable>
            <EncabezadoOrdenable valor="papeles">Papeles</EncabezadoOrdenable>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cargando && proveedores.length === 0 && <FilasDeCarga />}

          {/* Falló → vacío, en ese orden: con la petición muerta la lista llega
              vacía, y decir «todavía no hay proveedores» sería afirmar algo que
              nadie pudo verificar. */}
          {!cargando && Boolean(error) && (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                <FalloDeCarga error={error} queEs="los proveedores" onReintentar={onReintentar} />
              </TableCell>
            </TableRow>
          )}

          {!cargando && !error && filtrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNAS} className="p-0">
                <SinDatos
                  queSon="proveedores"
                  icono={Wrench}
                  hayFiltros={hayFiltros}
                  onLimpiarFiltros={limpiarFiltros}
                  titulo="Todavía no hay proveedores registrados"
                  descripcion="Registrar a quién llamas te deja exigirle el RUT y la seguridad social antes de mandarlo a un inmueble."
                  crear={
                    puedeEditar && onRegistrar
                      ? { label: 'Registrar proveedor', onClick: onRegistrar }
                      : undefined
                  }
                />
              </TableCell>
            </TableRow>
          )}

          {pageItems.map((p) => (
            <TableRow
              key={p.id}
              data-testid="proveedor"
              className={cn('border-b border-border last:border-0', !p.activo && 'opacity-70')}
            >
              <TableCell className="max-w-[280px] px-5 py-4 align-top">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{p.nombre}</span>
                  {/* `secondary` en oscuro es casi blanco: el proveedor APAGADO
                      quedaba con el elemento más brillante de su fila. */}
                  {!p.activo && <Badge variant="outline">Inactivo</Badge>}
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{p.documento}</p>
              </TableCell>

              <TableCell className="max-w-[200px] px-5 py-4 align-top text-muted-foreground">
                {p.telefono || p.correo ? (
                  <>
                    {p.telefono ? (
                      <p className="tabular-nums text-foreground">{p.telefono}</p>
                    ) : null}
                    {p.correo ? <p className="truncate text-xs">{p.correo}</p> : null}
                  </>
                ) : (
                  <span>—</span>
                )}
              </TableCell>

              {/*
                🔴 19-09 (visto en el navegador, en TEMA OSCURO): los oficios
                eran `Badge variant="secondary"`, y en oscuro esa pastilla es
                casi blanca. Con una o dos por fila, lo más brillante de la
                tabla terminaba siendo «Plomería» —un atributo— y no el nombre
                del proveedor, que es por lo que uno busca. Una pastilla gasta
                borde, fondo y radio para decir «objeto aparte»; un oficio no
                es un objeto aparte, es un dato de la fila. Va como texto.
              */}
              <TableCell className="max-w-[180px] px-5 py-4 align-top text-muted-foreground">
                {p.especialidades.length > 0
                  ? p.especialidades.map((e) => EN_PALABRAS.get(e) ?? e).join(' · ')
                  : '—'}
              </TableCell>

              <TableCell className="px-5 py-4 align-top">
                <Estrellas calificacion={p.calificacion} trabajos={p.trabajosCalificados} />
                {p.reaperturasPorGarantia > 0 && (
                  <p className="mt-1 text-xs text-warning">
                    {p.reaperturasPorGarantia === 1
                      ? 'Un trabajo hubo que rehacerlo en garantía'
                      : `${p.reaperturasPorGarantia} trabajos hubo que rehacerlos en garantía`}
                  </p>
                )}
              </TableCell>

              {/*
                🔴 Los avisos vienen del back ya redactados y se pintan enteros.
                Meterlos en un icono con globito ahorraría dos renglones y
                escondería justo el dato por el que existe esta pantalla.
              */}
              <TableCell className="max-w-[340px] px-5 py-4 align-top">
                {p.avisos.length > 0 ? (
                  <ul className="space-y-1" data-testid="avisos-del-proveedor">
                    {p.avisos.map((a) => (
                      <li key={a} className="flex items-start gap-1.5 text-xs text-warning">
                        <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs">
                    {/* «Al día» no grita: en una tabla sana es lo que dicen casi
                        todas las filas, y el único color de la columna tiene
                        que quedar para lo que sí pide una acción hoy. */}
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Al día
                    </span>
                    {fechaCorta(venceProximo(p)) ? (
                      <p className="mt-0.5 text-muted-foreground tabular-nums">
                        Vence el {fechaCorta(venceProximo(p))}
                      </p>
                    ) : null}
                  </div>
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap px-3 py-4 align-top text-right">
                <div className="flex justify-end gap-1">
                  {p.trabajosCalificados > 0 && (
                    <Button variant="ghost" size="sm" hideArrow onClick={() => onVerHistorial(p)}>
                      Historial
                    </Button>
                  )}
                  {puedeEditar && (
                    <>
                      <Button variant="secondary" size="sm" hideArrow onClick={() => onEditar(p)}>
                        Editar
                      </Button>
                      {p.activo ? (
                        <Button variant="ghost" size="sm" hideArrow onClick={() => onDesactivar(p)}>
                          Desactivar
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" hideArrow onClick={() => onReactivar(p)}>
                          <ArrowCounterClockwise className="mr-1 h-4 w-4" />
                          Reactivar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {shouldPaginate && (
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
      )}
    </section>
  );
}

function FilasDeCarga() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-border last:border-0">
          {Array.from({ length: COLUMNAS }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 w-20 rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Estrellas({
  calificacion,
  trabajos,
}: {
  calificacion: number | null;
  trabajos: number;
}) {
  if (calificacion === null) {
    return <span className="text-xs text-muted-foreground">Sin calificar todavía</span>;
  }
  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
      <Star className="h-3.5 w-3.5 text-warning" weight="fill" />
      <span className="font-medium tabular-nums text-foreground">{calificacion.toFixed(1)}</span>
      <span>
        ({trabajos} {trabajos === 1 ? 'trabajo' : 'trabajos'})
      </span>
    </span>
  );
}

export default TablaDeProveedores;
