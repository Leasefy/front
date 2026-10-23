'use client';

/**
 * LAS COPROPIEDADES — el tercero dueño de la cuota de administración.
 *
 * ── Por qué esta pantalla existe (20-09-2026) ──────────────────────────────
 *
 * En «Reportes → Terceros» la cuenta 2815 —la del régimen de mandato— no tenía
 * un solo movimiento a nombre de su dueño: 0 líneas de un propietario, 41 a
 * nombre del inquilino equivocado y 1.241 sin tercero, sobre $1.051.300.000.
 * El canon ya se arregló en el asiento (va al propietario, repartido por su
 * participación). La cuota de administración necesitaba un tercero que no
 * existía: la copropiedad.
 *
 * ── Lo que esta pantalla NO hace ───────────────────────────────────────────
 *
 * No borra. Un movimiento contable que nombra a una copropiedad tiene que
 * poder resolverla siempre, también dentro de cinco años cuando un contador
 * abra el libro de hoy. Para sacarla de circulación está «activa».
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Buildings, Plus } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { SinDatos } from '@/components/estado/SinDatos';
import { Skeleton } from '@/components/ui/skeleton';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { toast } from '@/components/ui/toast';
import {
  copropiedadesApi,
  nitLegible,
  type Copropiedad,
} from '@/lib/api/copropiedades.service';
import { clasificarFallo } from '@/lib/errores/clasificar';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { cn } from '@/lib/utils';
import { FaltaLaMigracion, Nota, TarjetaDeInforme } from '../piezas';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

const COLUMNAS = 4;

export function Copropiedades() {
  const [filas, setFilas] = useState<Copropiedad[] | null>(null);
  const [falta, setFalta] = useState<{ migracion: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [vista, setVista] = useState<'activas' | 'inactivas' | 'todas'>('activas');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await copropiedadesApi.listar();
      setFilas(r.copropiedades);
      setFalta(r.faltaLaMigracion ? { migracion: r.migracion } : null);
    } catch (e) {
      setError(e);
      setFilas(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const texto = busqueda.trim().toLowerCase();
  const activas = (filas ?? []).filter((c) => c.activa);
  const inactivas = (filas ?? []).filter((c) => !c.activa);
  // Con todas activas no hay nada que separar: la pestaña «Activas» sería la lista entera.
  const vistaReal = inactivas.length === 0 ? 'todas' : vista;
  const deLaVista = vistaReal === 'activas' ? activas : vistaReal === 'inactivas' ? inactivas : (filas ?? []);
  const visibles = deLaVista.filter(
    (c) =>
      texto === '' ||
      c.nombre.toLowerCase().includes(texto) ||
      c.nit.includes(texto.replace(/\D/g, '')),
  );
  const inmueblesAsignados = activas.reduce((t, c) => t + c.inmuebles, 0);
  const cifras = localeDeLasCifras();

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${texto}|${visibles.length}` });

  return (
    <div className="space-y-6">
      {/* LA RESPUESTA: cuántas copropiedades hay y a cuántos inmuebles cubren. */}
      {filas && filas.length > 0 && !error ? (
        <CifraHeroe
          tamano="mediana"
          rotulo="Copropiedades activas"
          cifra={activas.length.toLocaleString(cifras)}
          contexto={`con ${inmueblesAsignados.toLocaleString(cifras)} ${inmueblesAsignados === 1 ? 'inmueble asignado' : 'inmuebles asignados'}`}
          data-testid="cifra-de-copropiedades"
        />
      ) : null}
      <TarjetaDeInforme
        testId="copropiedades"
        filtrosClassName="flex flex-wrap items-center gap-3"
        filtros={
          <>
            {inactivas.length > 0 ? (
              <PestanasDeEstado
                etiqueta="Estado de las copropiedades"
                valor={vistaReal}
                onCambio={setVista}
                pestanas={[
                  { valor: 'activas', etiqueta: 'Activas', cuantos: activas.length, fija: true },
                  { valor: 'inactivas', etiqueta: 'Inactivas', cuantos: inactivas.length },
                  { valor: 'todas', etiqueta: 'Todas', cuantos: (filas ?? []).length, fija: true },
                ]}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <Label htmlFor="buscar-copropiedad" className="sr-only">Buscar</Label>
              <Input
                id="buscar-copropiedad"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o NIT"
                className="w-full sm:max-w-xs"
              />
            </div>
            {falta ? null : (
              <Button
                size="sm"
                variant={creando ? 'outline' : 'default'}
                hideArrow
                onClick={() => setCreando((v) => !v)}
                data-testid="abrir-nueva-copropiedad"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Registrar una copropiedad
              </Button>
            )}
          </>
        }
      >
        {creando ? (
          <FormularioDeCopropiedad
            onListo={() => {
              setCreando(false);
              void cargar();
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : null}

        {cargando && filas === null ? (
          <div className="divide-y divide-border" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 flex-1 rounded-sm bg-surface-muted" />
                <Skeleton className="h-4 w-24 rounded-sm bg-surface-muted" />
                <Skeleton className="h-4 w-10 rounded-sm bg-surface-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow>
                  <TableHead>Copropiedad</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead numeric>Inmuebles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBodyAnimado className="max-md:block">
                {error ? (
                  <TableRow key="fallo" className="hover:bg-transparent max-md:block">
                    <TableCell colSpan={COLUMNAS} className="p-0 max-md:block">
                      <SinDatos
                        queSon="copropiedades"
                        icono={Buildings}
                        titulo="No se pudo leer la lista"
                        descripcion={clasificarFallo(error).descripcion}
                        accion={
                          <Button variant="outline" hideArrow onClick={() => void cargar()}>
                            Reintentar
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow key="vacio" className="hover:bg-transparent max-md:block">
                    <TableCell colSpan={COLUMNAS} className="p-0 max-md:block">
                      {texto !== '' ? (
                        <SinDatos
                          queSon="copropiedades"
                          icono={Buildings}
                          titulo="Ninguna con ese nombre ni ese NIT"
                          descripcion="Prueba con parte del nombre, o con el NIT sin puntos."
                          accion={
                            <Button variant="outline" hideArrow onClick={() => setBusqueda('')}>
                              Ver todas
                            </Button>
                          }
                        />
                      ) : (
                        <SinDatos
                          queSon="copropiedades"
                          icono={Buildings}
                          titulo={
                            falta
                              ? 'Todavía no se pueden guardar copropiedades'
                              : 'Todavía no hay ninguna copropiedad'
                          }
                          descripcion={
                            'Es el conjunto o el edificio donde está el inmueble, y el dueño de la cuota de administración. ' +
                            'Sin ella, esa plata queda en el libro sin decir de quién es, y eso es lo que traba la exógena.'
                          }
                          /* 🔴 Sin la migración NO se ofrece «Registrar la
                             primera»: ese botón llevaría derecho a un 503, y
                             el aviso de abajo ya dice qué falta y quién lo
                             aplica. Una pantalla no ofrece una acción que sabe
                             que va a fallar. */
                          accion={
                            falta ? undefined : (
                              <Button variant="outline" hideArrow onClick={() => setCreando(true)}>
                                Registrar la primera
                              </Button>
                            )
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((c) => (
                    // Sin hover: la fila no abre nada (CB-29), no debe parecer un botón.
                    <TableRowAnimada
                      key={c.id}
                      data-testid="fila-de-copropiedad"
                      className="hover:bg-transparent max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3.5 max-md:last:border-0"
                    >
                      <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                        <span className={cn('text-fg', !c.activa && 'text-fg-muted line-through')}>
                          {c.nombre}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono tabular-nums max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                        {nitLegible(c)}
                      </TableCell>
                      <TableCell className="max-w-[320px] max-md:col-span-2 max-md:row-start-3 max-md:block max-md:max-w-none max-md:p-0 max-md:text-caption">
                        <span className="block truncate text-fg-muted" title={c.direccion ?? ''}>
                          {c.direccion ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell numeric className="tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                        {c.inmuebles.toLocaleString(localeDeLasCifras())}
                        <span className="text-caption text-fg-muted md:hidden"> {c.inmuebles === 1 ? 'inmueble' : 'inmuebles'}</span>
                      </TableCell>
                    </TableRowAnimada>
                  ))
                )}
              </TableBodyAnimado>
            </Table>

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
          </div>
        )}
      </TarjetaDeInforme>

        {/* 🔴 CB-29 (QA de Contabilidad, 03-10-2026): la fila no abre nada, y no
            decía dónde se le asignan los inmuebles. Se asignan desde el
            CONTRATO (Condiciones → «¿A qué copropiedad pertenece el
            inmueble?»): la pantalla lo dice, con el enlace, y no inventa otra
            forma de asignarlos. */}
      {falta ? null : (
        <MasDetalles etiqueta="Dónde se le asigna su copropiedad a un inmueble" etiquetaAbierto="Ocultar" montadoSiempre>
            <Nota testId="donde-se-asignan-los-inmuebles">
              <p>
                Cada inmueble se asigna a su copropiedad desde la ficha de su contrato: Condiciones →
                «¿A qué copropiedad pertenece el inmueble?». La columna «Inmuebles» cuenta los que ya
                están asignados.{' '}
                <Link
                  href="/panel/inmobiliaria/contratos"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Ir a Contratos
                </Link>
              </p>
            </Nota>
        </MasDetalles>
      )}

      {/* Sin la migración la lista llega vacía y no hay nada que decir salvo
          la verdad: lo que falta, quién lo aplica, y qué pasa mientras tanto. */}
      {falta ? (
        <FaltaLaMigracion
          queSeEspera="registrar copropiedades ni decir a cuál pertenece cada inmueble"
          motivo={`Falta la migración ${falta.migracion}, la que crea la tabla de copropiedades y la columna del mandato.`}
          mientrasTanto="La cuota de administración se sigue asentando SIN tercero, como hoy: el libro no cambia, pero «Reportes → Terceros» la va a seguir contando entre los movimientos sin tercero, y la exógena sigue trabada por ella. El canon sí quedó arreglado y no necesita esta migración: ya se acredita a nombre del dueño."
        />
      ) : null}
    </div>
  );
}

type CampoDeLaCopropiedad = 'nombre' | 'nit' | 'direccion';

function FormularioDeCopropiedad({
  onListo,
  onCancelar,
}: {
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Lo que el back dijo de un campo (un 400 con `campos`). */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDeLaCopropiedad, string>>>({});
  const olvidar = (campo: CampoDeLaCopropiedad) =>
    setDelServidor((d) => (d[campo] ? { ...d, [campo]: undefined } : d));
  const describir = (campo: CampoDeLaCopropiedad) =>
    delServidor[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `copro-${campo}-error` }
      : {};

  const soloDigitos = nit.replace(/\D/g, '');
  const puede = nombre.trim().length >= 3 && soloDigitos.length >= 5;

  async function guardar() {
    setGuardando(true);
    try {
      const creada = await copropiedadesApi.crear({
        nombre: nombre.trim(),
        nit: soloDigitos,
        direccion: direccion.trim() || undefined,
      });
      toast.success(
        `«${creada.nombre}» quedó registrada con el NIT ${creada.nit}-${creada.digitoVerificacion ?? ''}.`,
      );
      onListo();
    } catch (e) {
      /*
       * Lo que es de un campo va bajo ese campo (y se enfoca); lo demás al
       * toast, con la regla de oro (un 5xx «de nuestro lado» con la referencia).
       * `clasificarFallo` es para un fallo de CARGA, con su título: acá es una
       * acción.
       */
      const reparto = repartirErroresDelServidor<CampoDeLaCopropiedad>(e, {
        campos: ['nombre', 'nit', 'direccion'],
        porDefecto: 'No se pudo registrar la copropiedad.',
        accion: 'registrar la copropiedad',
      });
      setDelServidor(reparto.porCampo);
      if (reparto.orden[0]) document.getElementById(`copro-${reparto.orden[0]}`)?.focus();
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="grid gap-4 border-b border-border bg-surface-muted p-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="copro-nombre">Nombre</Label>
        <Input
          id="copro-nombre"
          value={nombre}
          onChange={(e) => {
            olvidar('nombre');
            setNombre(e.target.value);
          }}
          placeholder="Conjunto Residencial Altos del Poblado"
          {...describir('nombre')}
        />
        <ErrorDelCampo id="copro-nombre-error" mensaje={delServidor.nombre} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="copro-nit">NIT</Label>
        <Input
          id="copro-nit"
          value={nit}
          onChange={(e) => {
            olvidar('nit');
            setNit(e.target.value);
          }}
          placeholder="900123456"
          inputMode="numeric"
          className="tabular-nums"
          {...describir('nit')}
        />
        {/* El DV se calcula, no se pide: quien lo teclea se equivoca y el
            error sólo aparece cuando la DIAN rechaza el archivo. */}
        <ErrorDelCampo
          id="copro-nit-error"
          mensaje={delServidor.nit}
          pista="Sin puntos ni dígito de verificación: ese lo calcula el sistema."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="copro-direccion">Dirección (opcional)</Label>
        <Input
          id="copro-direccion"
          value={direccion}
          onChange={(e) => {
            olvidar('direccion');
            setDireccion(e.target.value);
          }}
          placeholder="Cra. 43A #7-50"
          {...describir('direccion')}
        />
        <ErrorDelCampo id="copro-direccion-error" mensaje={delServidor.direccion} />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <Button
          onClick={() => void guardar()}
          disabled={!puede || guardando}
          hideArrow
          data-testid="guardar-copropiedad"
        >
          {guardando ? 'Guardando…' : 'Registrar'}
        </Button>
        <Button variant="ghost" hideArrow onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        {!puede ? (
          <span className="text-caption text-fg-muted">
            Hace falta el nombre y un NIT de al menos 5 dígitos.
          </span>
        ) : null}
      </div>
    </div>
  );
}
