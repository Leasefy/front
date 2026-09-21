'use client';

/**
 * El mapeo cuenta del PUC → concepto del formato, por año (contrato del 18-09,
 * §6).
 *
 * ── 🔴 El preset NO es la resolución ───────────────────────────────────────
 *
 * Los códigos de concepto los fija la resolución de la DIAN de cada año (para
 * 2025, la Resolución 000162 de 2023 y sus modificaciones) y cambian. Lo que
 * Leasefy propone viene marcado `PRESET` y se muestra con el mismo tratamiento
 * que el PUC le da a `PENDIENTE_DE_CONFIRMAR`: un aviso con el texto exacto del
 * back, arriba, y una marca en cada fila. **Nunca un asterisco**: un asterisco al
 * pie de una tabla de cien cuentas no lo lee nadie, y lo que hay debajo es
 * responsabilidad tributaria.
 *
 * ── Las cuentas sin concepto se ordenan por plata ──────────────────────────
 *
 * Una cuenta sin concepto que no movió nada en el año no bloquea nada —no va a
 * salir en ningún formato— y listarla entre las pendientes enterraría las que sí
 * bloquean bajo cincuenta que no. Se dejan afuera y las que quedan se ordenan de
 * mayor a menor: la primera es la que hay que resolver
 * (`lib/contabilidad/exogena.ts#cuentasSinConceptoQueImportan`).
 *
 * ── Es por año, y eso importa ──────────────────────────────────────────────
 *
 * El mismo PUC tiene conceptos distintos en 2025 y en 2026. Guardar sin el año
 * sobreescribiría el mapeo del año equivocado, y el formato ya presentado
 * quedaría diciendo otra cosa que lo que se presentó.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { TituloDeBloque } from '@/components/finanzas/piezas';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  FORMATOS_DE_EXOGENA,
  exogenaApi,
  type ConceptoNuevo,
  type ConceptosDeExogena as Conceptos,
  type FormatoDeExogena,
} from '@/lib/api/exogena.service';
import { avisoDelPreset, cuentasSinConceptoQueImportan } from '@/lib/contabilidad/exogena';
import { Monto } from '../Monto';
import { AccionConMotivo, FaltaLaMigracion, Nota, VistoBuenoDelContador } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';

export function ConceptosDeExogena({
  anio,
  onGuardado,
}: {
  anio: number;
  /** Para que el resumen de arriba vuelva a contar los bloqueos. */
  onGuardado?: () => void | Promise<void>;
}) {
  const [conceptos, setConceptos] = useState<Conceptos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState(false);
  /** Lo editado y sin guardar, por `cuentaId`. */
  const [cambios, setCambios] = useState<Record<string, { formato: FormatoDeExogena; concepto: string }>>(
    {},
  );

  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setCambios({});
    try {
      setConceptos(await exogenaApi.conceptos(anio));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sinConcepto = useMemo(
    () => (conceptos ? cuentasSinConceptoQueImportan(conceptos) : []),
    [conceptos],
  );
  const aviso = useMemo(() => (conceptos ? avisoDelPreset(conceptos) : null), [conceptos]);
  const hayCambios = Object.keys(cambios).length > 0;

  /* Buscar por código, nombre o concepto: son 49 cuentas y el contador va a
     una en particular, no las recorre de arriba abajo. */
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto === '') return conceptos?.conceptos ?? [];
    return (conceptos?.conceptos ?? []).filter(
      (c) =>
        c.codigo.toLowerCase().includes(texto) ||
        (c.nombre ?? '').toLowerCase().includes(texto) ||
        (c.concepto ?? '').toLowerCase().includes(texto) ||
        String(c.formato).toLowerCase().includes(texto),
    );
  }, [busqueda, conceptos]);

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${anio}|${busqueda}` });

  const guardar = async () => {
    if (!conceptos) return;
    setGuardando(true);
    try {
      const entradas: ConceptoNuevo[] = Object.entries(cambios)
        .filter(([, v]) => v.concepto.trim().length > 0)
        .map(([cuentaId, v]) => ({
          cuentaId,
          formato: v.formato,
          concepto: v.concepto.trim(),
        }));
      setConceptos(await exogenaApi.guardarConceptos(anio, entradas));
      setCambios({});
      toast.success(
        entradas.length === 1
          ? `1 concepto guardado para ${anio}.`
          : `${entradas.length} conceptos guardados para ${anio}.`,
      );
      await onGuardado?.();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudieron guardar los conceptos.'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && !conceptos) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface py-10">
        <Spinner />
        <p className="text-sm text-fg-muted">Cargando los conceptos de {anio}…</p>
      </section>
    );
  }
  if (error || !conceptos) {
    return (
      <FalloDeCarga error={error} queEs="el mapeo de conceptos de la exógena" onReintentar={cargar} />
    );
  }

  return (
    <section className="space-y-4" data-testid="conceptos-de-exogena">
      <TituloDeBloque
        titulo={`Conceptos de exógena ${anio}`}
        explicacion="Qué concepto de la DIAN le corresponde a cada cuenta del PUC, en cada formato. Es por año: el mismo PUC tiene conceptos distintos en 2025 y en 2026, y guardarlos sin el año sobreescribiría el mapeo del año equivocado."
      />

      {!conceptos.disponible ? (
        <FaltaLaMigracion
          motivo="Falta la migración que guarda el mapeo de conceptos y el visto bueno (20260918103000_exogena_conceptos_y_revisiones)."
          queSeEspera="guardar el mapeo de conceptos"
          mientrasTanto="Los formatos se calculan y se descargan igual, con el preset que Leasefy propone. Lo que no se puede todavía es dejar guardado el concepto que el contador eligió."
          testId="conceptos-sin-migracion"
        />
      ) : null}

      {/* 🔴 El aviso legal del back, entero y arriba. */}
      {aviso ? (
        <VistoBuenoDelContador
          titulo="Los conceptos que propone Leasefy no son la resolución"
          introduccion={aviso}
          puntos={[]}
          testId="aviso-del-preset"
        />
      ) : null}

      {sinConcepto.length > 0 ? (
        <div
          className="space-y-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-fg"
          role="alert"
          data-testid="cuentas-sin-concepto"
        >
          <p className="font-medium">
            {sinConcepto.length === 1
              ? '1 cuenta con movimiento no tiene concepto asignado'
              : `${sinConcepto.length} cuentas con movimiento no tienen concepto asignado`}
          </p>
          <p className="text-fg-muted">
            Mientras falte alguna, el formato que las usa no se puede aprobar. Van ordenadas por
            plata: la primera es la que más pesa.
          </p>
          <ul className="space-y-0.5">
            {sinConcepto.slice(0, 10).map((c) => (
              <li key={c.cuentaId} className="flex flex-wrap items-baseline gap-2 text-caption">
                <span className="font-mono">{c.codigo}</span>
                <Monto valor={c.movimientosCop} className="text-caption" />
              </li>
            ))}
          </ul>
          {sinConcepto.length > 10 ? (
            <p className="text-caption text-fg-muted">
              Y {sinConcepto.length - 10} más.
            </p>
          ) : null}
        </div>
      ) : (
        <Nota testId="conceptos-completos">
          <p>
            Todas las cuentas con movimiento en {anio} tienen concepto asignado. Eso no quiere decir
            que el concepto sea el correcto: los que dicen «propuesto» siguen esperando al contador.
          </p>
        </Nota>
      )}

      {/* 🔴 20-09 · Esta tabla tenía 49 filas sin buscador y sin paginador, en
          una página de 8.186 px. El contador tiene que recorrerla código por
          código para revisar qué concepto le puso Leasefy a cada cuenta, y sin
          forma de buscar «2408» hay que bajar con la rueda hasta encontrarlo.
          Paginar una tabla que hay que llenar ENTERA sería peligroso si no
          fuera porque el aviso de arriba ya lista, ordenadas por plata, las
          que siguen sin concepto: ése es el que dice cuándo falta algo, no el
          scroll. */}
      <div className="overflow-x-clip rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="buscar-concepto">Buscar</Label>
            <Input
              id="buscar-concepto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Código de la cuenta, nombre o concepto"
              className="w-full sm:max-w-sm"
              data-testid="buscar-concepto"
            />
          </div>
          <p className="pb-2 text-caption text-fg-muted" data-testid="cuantos-conceptos">
            {/* «1 cuentas» no: el plural se decide con el número, igual que en
                el back. Y buscando se dice «de cuántas», para que no parezca
                que desaparecieron. */}
            {busqueda.trim() === ''
              ? `${conceptos.conceptos.length} ${conceptos.conceptos.length === 1 ? 'cuenta' : 'cuentas'}`
              : `${visibles.length} de ${conceptos.conceptos.length} ${conceptos.conceptos.length === 1 ? 'cuenta' : 'cuentas'}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta del PUC</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>De dónde sale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-fg-muted">
                    {conceptos.conceptos.length === 0
                      ? `Todavía no hay conceptos asignados para ${anio}.`
                      : 'Ninguna cuenta con ese código, nombre ni concepto.'}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((c) => {
                  const cambio = cambios[c.cuentaId];
                  return (
                    <TableRow key={`${c.cuentaId}-${c.formato}`} data-testid={`concepto-${c.codigo}`}>
                      <TableCell>
                        <p className="font-mono text-xs text-fg">{c.codigo}</p>
                        <p className="text-caption text-fg-muted">{c.nombre}</p>
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Formato de la cuenta ${c.codigo}`}
                          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg"
                          value={cambio?.formato ?? c.formato}
                          disabled={!escritura.puede || !conceptos.disponible}
                          onChange={(e) =>
                            setCambios((previo) => ({
                              ...previo,
                              [c.cuentaId]: {
                                formato: e.target.value as FormatoDeExogena,
                                concepto: previo[c.cuentaId]?.concepto ?? c.concepto,
                              },
                            }))
                          }
                          data-testid={`formato-de-${c.codigo}`}
                        >
                          {FORMATOS_DE_EXOGENA.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Concepto de la cuenta ${c.codigo}`}
                          className="w-28"
                          value={cambio?.concepto ?? c.concepto}
                          disabled={!escritura.puede || !conceptos.disponible}
                          onChange={(e) =>
                            setCambios((previo) => ({
                              ...previo,
                              [c.cuentaId]: {
                                formato: previo[c.cuentaId]?.formato ?? c.formato,
                                concepto: e.target.value,
                              },
                            }))
                          }
                          data-testid={`concepto-de-${c.codigo}`}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {/* 🔴 La marca por fila, no un asterisco al pie. */}
                        <Badge variant={c.fuente === 'AGENCIA' ? 'secondary' : 'outline'}>
                          {c.fuente === 'AGENCIA' ? 'Lo fijó el contador' : 'Propuesto por Leasefy'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
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

        {/* El guardar va en el PIE de la tabla que edita, no flotando debajo. */}
        <div className="border-t border-border px-4 py-3">
          <AccionConMotivo
        puede={escritura.puede && conceptos.disponible && hayCambios}
        motivo={
          escritura.motivo ??
          (!conceptos.disponible
            ? 'Falta la migración que guarda el mapeo: los cambios no se pueden escribir todavía.'
            : 'No hay cambios que guardar.')
        }
        ocupado={guardando}
        textoOcupado="Guardando…"
        onClick={() => void guardar()}
        variant="default"
        testId="guardar-conceptos"
        enLinea
      >
        <FloppyDisk className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Guardar los conceptos de {anio}
          </AccionConMotivo>
        </div>
      </div>
    </section>
  );
}
