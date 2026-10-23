'use client';

/**
 * 🔴 BITÁCORA DE PLATA: quién hizo qué en lo que mueve plata.
 *
 * Nico (17/18-09-2026): «bitácora de quién hizo qué en lo que mueve plata
 * (aprobar lotes, anular, condonar, cambiar cuentas), VISIBLE PARA EL DUEÑO de
 * la inmobiliaria».
 *
 * Es de SÓLO LECTURA, y eso es parte del diseño: las filas las escriben las
 * acciones cuando ocurren. Una pantalla que pudiera escribir en la bitácora la
 * volvería inútil.
 *
 * ⚠️ Sin la migración la lista sale VACÍA **diciendo por qué**. Una bitácora
 * vacía sin explicación se lee como «no pasó nada», que es lo contrario de la
 * verdad.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { bitacoraApi } from '@/lib/api/bitacora.service';
import type { BitacoraDePlata } from '@/lib/api/bitacora.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';
import { cuandoEnBogota } from '@/lib/movimientos/en-palabras';
import { MagnifyingGlass, Scroll } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SinDatos } from '@/components/estado/SinDatos';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';

/** Las acciones, en palabras. Un `APROBAR_LOTE` no se le muestra a nadie. */
const EN_PALABRAS: Record<string, string> = {
  APROBAR_LOTE: 'Aprobó un lote de giros',
  ANULAR_LOTE: 'Anuló un lote de giros',
  ANULAR_COBRO: 'Anuló un cobro',
  ANULAR_RECIBO: 'Anuló un recibo de caja',
  CONDONAR: 'Condonó',
  CAMBIAR_CUENTA: 'Cambió una cuenta bancaria',
  MARCAR_PAGADO: 'Marcó un lote como pagado',
  GIRO_DEVUELTO: 'Registró un giro devuelto',
  CASTIGAR_CARTERA: 'Castigó cartera',
  APROBAR_REPARACION: 'Aprobó una reparación',
  REPORTAR_SINIESTRO: 'Reportó un siniestro',
};

/**
 * Ronda 30: una acción que el front todavía no conoce no se muestra con su
 * código (`DEVOLVER_GARANTIA`): se lee en palabras («Devolver garantia»).
 */
function enPalabras(accion: string): string {
  const conocida = EN_PALABRAS[accion];
  if (conocida) return conocida;
  const texto = accion.replace(/_/g, ' ').toLocaleLowerCase('es');
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}

const TODAS = 'todas';

export function SeccionBitacora() {
  const [datos, setDatos] = useState<BitacoraDePlata | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await bitacoraApi.listar({ limite: 100 }));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Ronda 30 (regla de Nico: «las tablas siempre con buscador, filtros y paginación»):
     hasta 100 huellas en una lista sin buscar ni partir. Todo sale de lo que ya llegó. */
  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion] = useState(TODAS);
  const accionesPresentes = useMemo(
    () => Array.from(new Set((datos?.filas ?? []).map((f) => f.accion))),
    [datos],
  );
  const filas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return (datos?.filas ?? []).filter((f) => {
      if (accion !== TODAS && f.accion !== accion) return false;
      if (!q) return true;
      return [enPalabras(f.accion), f.resumen, f.motivo, f.actor.nombre, f.actor.email].some((x) =>
        (x ?? '').toLocaleLowerCase('es').includes(q),
      );
    });
  }, [datos, busqueda, accion]);
  const pag = useTablePagination(filas, { resetKey: `${busqueda}|${accion}` });
  const hayFiltros = busqueda.trim() !== '' || accion !== TODAS;

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !datos}
        esqueleto={<EsqueletoDeSeccion filas={6} />}
        onReintentar={cargar}
        queEs="la bitácora de plata"
        principal
      >
        <span />
      </EstadoDeDatos>
    );
  }

  return (
    <div className="space-y-4" data-testid="bitacora-de-plata">
      {/* Glow up 22-10: el para qué lo dice el marco de Configuración (antes se
          repetía aquí); queda lo que no dice: que nadie la edita ni la borra. */}
      {!datos.disponible && (
        <p
          className="rounded-md border border-border bg-warning-soft px-3 py-2 text-sm text-fg"
          data-testid="bitacora-sin-migrar"
          title={datos.motivo ?? undefined}
        >
          {/* Ronda 30: el número de la migración es para quien despliega (queda en el `title`), no para la inmobiliaria. */}
          La bitácora de plata todavía no guarda nada: falta un paso de la base de datos que nuestro equipo está
          habilitando.
        </p>
      )}

      {datos.disponible && datos.filas.length === 0 && (
        <div data-testid="bitacora-vacia">
          <VacioDeSeccion
            icono={Scroll}
            titulo="Todavía no se registró nada que mueva plata"
            ayuda="Cuando alguien apruebe un giro, anule un recibo, condone intereses o cambie una cuenta, queda aquí con su nombre y su motivo."
          />
        </div>
      )}

      {datos.filas.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Buscar persona, motivo o detalle"
                aria-label="Buscar en la bitácora de plata"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-en-la-bitacora"
              />
            </div>
            {accionesPresentes.length > 1 ? (
              <Select value={accion} onValueChange={setAccion}>
                <SelectTrigger
                  className="h-9 w-full gap-2 text-sm sm:w-auto sm:min-w-[12rem]"
                  aria-label="Filtrar por acción"
                  data-testid="filtro-accion-bitacora"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas las acciones</SelectItem>
                  {accionesPresentes.map((a) => (
                    <SelectItem key={a} value={a}>
                      {enPalabras(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <p className="text-caption text-fg-muted sm:ml-auto">Nadie la edita ni la borra.</p>
          </div>
          {filas.length === 0 ? (
            <SinDatos
              hayFiltros={hayFiltros}
              queSon="movimientos de plata"
              onLimpiarFiltros={() => {
                setBusqueda('');
                setAccion(TODAS);
              }}
            />
          ) : (
            <ul className="divide-y divide-border">
              {pag.pageItems.map((f) => (
                <li key={f.id} className="px-4 py-3.5" data-testid={`huella-${f.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">{enPalabras(f.accion)}</p>
                      <p className="mt-0.5 text-caption text-fg-muted">{f.resumen}</p>
                      {f.motivo && <p className="mt-0.5 text-caption text-fg-muted">Motivo: {f.motivo}</p>}
                    </div>
                    {f.valorCop !== null && (
                      <p className="shrink-0 font-mono text-sm tabular-nums text-fg">{formatCurrency(f.valorCop)}</p>
                    )}
                  </div>
                  <p className="mt-1.5 text-caption text-fg-subtle">
                    {/*
                      El actor sale del NOMBRE COPIADO en la fila, no de un join: la
                      bitácora tiene que decir quién fue aunque después borren al
                      usuario. Sin nombre se dice «el sistema», que es la verdad
                      cuando la acción la hizo un cron.
                    */}
                    {f.actor.nombre ?? f.actor.email ?? 'El sistema'} · {cuandoEnBogota(f.fecha)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {filas.length > 0 ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={pag.total}
                page={pag.page}
                pageSize={pag.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={pag.setPage}
                onPageSizeChange={pag.setPageSize}
              />
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
