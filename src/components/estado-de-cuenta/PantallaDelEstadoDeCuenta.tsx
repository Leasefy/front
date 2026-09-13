'use client';

/**
 * La pantalla del estado de cuenta: carga, barra de acciones, filtros y el
 * documento.
 *
 * La usan CUATRO entradas —la ficha del inquilino, la del propietario, el
 * enlace público y los dos portales— y todas ven exactamente el mismo
 * documento. Lo que cambia entre ellas es qué se puede HACER con él, y eso
 * entra por `acciones`.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { ArrowLeft, Printer } from '@phosphor-icons/react';
import Link from 'next/link';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import {
  aplicarFiltros,
  hayFiltros,
  hoyLocal,
  SIN_FILTROS,
  type FiltrosDelEstadoDeCuenta,
} from './filas';
import { useTextoDelEstado } from './textos';

export interface PantallaProps {
  /** Cómo se pide el documento. Cambia entre el panel, el enlace y los portales. */
  cargar: () => Promise<EstadoDeCuenta>;
  /**
   * Lo que se puede hacer con el documento, ya montado: «Compartir» en el
   * panel, «Descargar PDF» en el enlace público. Recibe el documento FILTRADO
   * y la nota, porque lo que se comparte es lo que se está viendo.
   */
  acciones?: (doc: EstadoDeCuenta, nota?: string) => React.ReactNode;
  volverA?: { label: string; href: string };
  /** `YYYY-MM-DD`. Inyectable para que las pruebas no dependan del reloj. */
  hoy?: string;
  /** Apaga la barra de filtros (el enlace público muestra el documento entero). */
  sinFiltros?: boolean;
  className?: string;
}

export function PantallaDelEstadoDeCuenta({
  cargar,
  acciones,
  volverA,
  hoy: hoyProp,
  sinFiltros = false,
  className,
}: PantallaProps) {
  const t = useTextoDelEstado();
  const hoy = hoyProp ?? hoyLocal();

  const [doc, setDoc] = React.useState<EstadoDeCuenta | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [cargando, setCargando] = React.useState(true);
  const [filtros, setFiltros] = React.useState<FiltrosDelEstadoDeCuenta>(SIN_FILTROS);
  /**
   * Al imprimir se apaga la paginación de las tablas. Sin esto la hoja sale con
   * las 25 filas de la página en la que quedó la pantalla y el total del
   * contrato no cuadra con lo impreso.
   */
  const [imprimiendo, setImprimiendo] = React.useState(false);

  const pedir = React.useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDoc(await cargar());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cargar]);

  React.useEffect(() => {
    void pedir();
  }, [pedir]);

  const filtrado = React.useMemo(
    () => (doc ? aplicarFiltros(doc, filtros) : null),
    [doc, filtros],
  );
  const conFiltros = hayFiltros(filtros);
  const nota = conFiltros ? t('estadoDeCuenta.filtrado') : undefined;

  const imprimir = React.useCallback(() => {
    setImprimiendo(true);
    // Dos cuadros: el primero deja que React pinte las filas que la paginación
    // escondía; el segundo, que el navegador las mida antes de congelar el hilo
    // con el diálogo de impresión.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setImprimiendo(false);
      });
    });
  }, []);

  return (
    <div className={cn('space-y-6 p-4 sm:p-6 lg:p-8', className)} data-estado-pagina>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-estado-barra
      >
        {volverA ? (
          <Button asChild variant="ghost" hideArrow className="w-fit">
            <Link href={volverA.href}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {volverA.label}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            hideArrow
            onClick={imprimir}
            disabled={!filtrado}
            data-testid="imprimir-estado"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t('estadoDeCuenta.imprimir')}
          </Button>
          {filtrado && acciones ? acciones(filtrado, nota) : null}
        </div>
      </div>

      {!sinFiltros && doc && doc.contratos.length > 0 && (
        <Filtros
          filtros={filtros}
          onCambiar={setFiltros}
          contratos={doc.contratos.map((c) => c.numero)}
        />
      )}

      {cargando ? (
        <div className="mx-auto w-full max-w-[1200px] space-y-4 rounded-lg border border-border bg-surface p-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-14 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="el estado de cuenta"
          onReintentar={pedir}
          volverA={volverA}
        />
      ) : filtrado ? (
        filtrado.contratos.length === 0 && conFiltros ? (
          /* Filtrado a cero NO es «este cliente no tiene contratos»: decirlo
             así sería afirmar algo falso sobre el cliente. */
          <div
            data-testid="estado-sin-resultados"
            className="mx-auto w-full max-w-[1200px] rounded-lg border border-border bg-surface px-6 py-16 text-center"
          >
            <p className="text-body font-medium text-fg">
              {t('estadoDeCuenta.sinResultados')}
            </p>
            <p className="mt-1 text-body-sm text-fg-muted">
              {t('estadoDeCuenta.sinResultadosDetalle')}
            </p>
            <Button
              variant="secondary"
              hideArrow
              className="mt-4"
              onClick={() => setFiltros(SIN_FILTROS)}
            >
              {t('estadoDeCuenta.limpiar')}
            </Button>
          </div>
        ) : (
          <EstadoDeCuentaDocumento
            doc={filtrado}
            hoy={hoy}
            sinPaginar={imprimiendo}
            nota={nota}
          />
        )
      ) : null}
    </div>
  );
}

function Filtros({
  filtros,
  onCambiar,
  contratos,
}: {
  filtros: FiltrosDelEstadoDeCuenta;
  onCambiar: (f: FiltrosDelEstadoDeCuenta) => void;
  contratos: string[];
}) {
  const t = useTextoDelEstado();
  const activos = hayFiltros(filtros);

  return (
    <div
      data-estado-barra
      data-testid="estado-filtros"
      className="mx-auto flex w-full max-w-[1200px] flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-border bg-surface px-4 py-3"
    >
      <label className="flex items-center gap-2 text-body-sm text-fg">
        <Checkbox
          checked={filtros.soloPendientes}
          onCheckedChange={(v) =>
            onCambiar({ ...filtros, soloPendientes: v === true })
          }
          data-testid="filtro-pendientes"
        />
        {t('estadoDeCuenta.soloPendientes')}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label uppercase tracking-wide text-fg-subtle">
          {t('estadoDeCuenta.desde')}
        </span>
        <Input
          type="date"
          value={filtros.desde}
          onChange={(e) => onCambiar({ ...filtros, desde: e.target.value })}
          className="h-9 w-[11rem]"
          data-testid="filtro-desde"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label uppercase tracking-wide text-fg-subtle">
          {t('estadoDeCuenta.hasta')}
        </span>
        <Input
          type="date"
          value={filtros.hasta}
          onChange={(e) => onCambiar({ ...filtros, hasta: e.target.value })}
          className="h-9 w-[11rem]"
          data-testid="filtro-hasta"
        />
      </label>

      {contratos.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.contrato', { numero: '' }).trim()}
          </span>
          {/* Un `<select>` nativo y no el del DS: acá hay un contrato por
              opción y la lista puede tener quince; el nativo ya sabe buscar
              escribiendo y no se pelea con la impresión. */}
          <select
            value={filtros.contrato}
            onChange={(e) => onCambiar({ ...filtros, contrato: e.target.value })}
            className="h-9 rounded-md border border-border bg-surface px-3 font-mono text-body-sm tabular-nums text-fg"
            data-testid="filtro-contrato"
          >
            <option value="">{t('estadoDeCuenta.todosLosContratos')}</option>
            {contratos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {activos && (
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onCambiar(SIN_FILTROS)}
          data-testid="filtro-limpiar"
        >
          {t('estadoDeCuenta.limpiar')}
        </Button>
      )}
    </div>
  );
}
