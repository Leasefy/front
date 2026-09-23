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
import { Buildings, Plus } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { SinDatos } from '@/components/estado/SinDatos';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import {
  copropiedadesApi,
  nitLegible,
  type Copropiedad,
} from '@/lib/api/copropiedades.service';
import { clasificarFallo } from '@/lib/errores/clasificar';
import { cn } from '@/lib/utils';
import { FaltaLaMigracion, TarjetaDeInforme } from '../piezas';

const COLUMNAS = 4;

export function Copropiedades() {
  const [filas, setFilas] = useState<Copropiedad[] | null>(null);
  const [falta, setFalta] = useState<{ migracion: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);

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
  const visibles = (filas ?? []).filter(
    (c) =>
      texto === '' ||
      c.nombre.toLowerCase().includes(texto) ||
      c.nit.includes(texto.replace(/\D/g, '')),
  );

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${texto}|${visibles.length}` });

  return (
    <div className="space-y-4">
      <TarjetaDeInforme
        testId="copropiedades"
        filtros={
          <>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="buscar-copropiedad">Buscar</Label>
              <Input
                id="buscar-copropiedad"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o NIT"
                className="w-full sm:max-w-xs"
              />
            </div>
            {falta ? null : (
              <Button
                variant="outline"
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
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Copropiedad</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead numeric>Inmuebles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNAS} className="p-0">
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
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNAS} className="p-0">
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
                    <TableRow key={c.id} data-testid="fila-de-copropiedad">
                      <TableCell>
                        <span className={cn('text-fg', !c.activa && 'text-fg-muted line-through')}>
                          {c.nombre}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono tabular-nums">
                        {nitLegible(c)}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <span className="block truncate text-fg-muted" title={c.direccion ?? ''}>
                          {c.direccion ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell numeric className="tabular-nums">
                        {c.inmuebles.toLocaleString('es-CO')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
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
      toast.error(clasificarFallo(e).descripcion);
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
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Conjunto Residencial Altos del Poblado"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="copro-nit">NIT</Label>
        <Input
          id="copro-nit"
          value={nit}
          onChange={(e) => setNit(e.target.value)}
          placeholder="900123456"
          inputMode="numeric"
          className="tabular-nums"
        />
        {/* El DV se calcula, no se pide: quien lo teclea se equivoca y el
            error sólo aparece cuando la DIAN rechaza el archivo. */}
        <p className="text-caption text-fg-subtle">
          Sin puntos ni dígito de verificación: ese lo calcula el sistema.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="copro-direccion">Dirección (opcional)</Label>
        <Input
          id="copro-direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Cra. 43A #7-50"
        />
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
