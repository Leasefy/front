'use client';

/**
 * La pantalla del estado de cuenta: cabecera de página, filtros y el
 * documento.
 *
 * La usan CUATRO entradas —la ficha del inquilino, la del propietario, el
 * enlace público y los dos portales— y todas ven exactamente el mismo
 * documento. Lo que cambia entre ellas es qué se puede HACER con él, y eso
 * entra por `acciones`.
 *
 * ── La cabecera (Nico, 2026-09-13: «esa navegación quedó horrible») ─────────
 * La primera versión tenía un «Volver» mudo flotando a la izquierda y dos
 * botones sueltos a la derecha, sin título: no se sabía dónde estaba uno. Acá
 * es una cabecera de página como la de la ficha del contrato: el enlace de
 * regreso DICE a dónde vuelve («Volver al contrato», leído de la ruta con
 * `lugarDeRegreso`), debajo el título de la pantalla con el cliente en una
 * línea, y a la derecha las acciones, con «Compartir» como la primaria porque
 * distribuir el documento es la mitad del pedido del CEO.
 */

import * as React from 'react';
import Link from 'next/link';
import { CaretLeft, Printer } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { lugarDeRegreso } from '@/lib/nav/ruta-de-regreso';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { FiltrosDelEstado } from './FiltrosDelEstado';
import {
  comoSeLlamaElRol,
  cuantasFilasDelDocumento,
  hayFiltros,
  hoyLocal,
  SIN_FILTROS,
  type FiltrosDelEstadoDeCuenta,
} from './filas';
import { useTextoDelEstado } from './textos';

/**
 * ¿El fallo es «este cliente todavía no tiene contratos»?
 *
 * Se lee el `code` del back (`SIN_CONTRATOS`), NUNCA el texto del mensaje:
 * un `includes('no tiene contratos')` se rompe el día que alguien reescribe
 * la frase, y se rompe en silencio — la pantalla volvería a decir «no existe»
 * sin que ningún test lo note.
 */
function sinContratos(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'SIN_CONTRATOS'
  );
}

export interface PantallaProps {
  /**
   * Cómo se pide el documento. Cambia entre el panel, el enlace y los portales.
   *
   * 🔴 Recibe el FILTRO porque el recorte lo hace el back (auditoría 13-09,
   * E4): esta pantalla ya no corta filas. Pide el documento con el filtro
   * puesto y pinta lo que vuelve, que es exactamente lo mismo que va a ver
   * quien abra el enlace compartido — con la regla duplicada acá, el día que
   * una de las dos cambiara, pantalla y enlace dirían cosas distintas.
   */
  cargar: (filtro?: FiltrosDelEstadoDeCuenta | null) => Promise<EstadoDeCuenta>;
  /**
   * Lo que se puede hacer con el documento, ya montado: «Compartir» en el
   * panel, «Descargar PDF» en el enlace público. Recibe el documento tal como
   * el back lo devolvió (recortado, si hay filtro), la nota, y el filtro
   * puesto — porque lo que se comparte es lo que se está viendo.
   */
  acciones?: (
    doc: EstadoDeCuenta,
    nota?: string,
    filtros?: FiltrosDelEstadoDeCuenta,
  ) => React.ReactNode;
  /**
   * A dónde vuelve el enlace de regreso. Sin `label`, la etiqueta se lee de la
   * ruta («Volver al contrato», «Volver al propietario»…).
   */
  volverA?: { href: string; label?: string };
  /** `YYYY-MM-DD`. Inyectable para que las pruebas no dependan del reloj. */
  hoy?: string;
  /** Apaga la barra de filtros (el enlace público muestra el documento entero). */
  sinFiltros?: boolean;
  /**
   * A dónde se configuran las reglas de mora. Sólo el PANEL lo pasa: con él,
   * las cuotas en mora sin intereses dicen por qué y llevan a configurarlas.
   * El portal y el enlace público no lo pasan: ese motivo es interno.
   */
  reglasDeMoraHref?: string;
  className?: string;
}

export function PantallaDelEstadoDeCuenta({
  cargar,
  acciones,
  volverA,
  hoy: hoyProp,
  sinFiltros = false,
  reglasDeMoraHref,
  className,
}: PantallaProps) {
  const t = useTextoDelEstado();
  const hoy = hoyProp ?? hoyLocal();

  /*
   * DOS documentos, a propósito:
   *
   *  · `entero` es el que vino sin filtro. Se pide UNA vez y se queda: de ahí
   *    salen la lista de contratos del desplegable y el «N de M» — con sólo el
   *    recortado, el desplegable perdería las opciones que uno acaba de filtrar
   *    y el «de M» diría el total de lo que ya está filtrado, que no es un
   *    total de nada.
   *  · `vista` es lo que se pinta: el recortado que devolvió el back, o el
   *    entero cuando no hay filtro.
   */
  const [entero, setEntero] = React.useState<EstadoDeCuenta | null>(null);
  const [vista, setVista] = React.useState<EstadoDeCuenta | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [cargando, setCargando] = React.useState(true);
  /** Hay un filtro en camino. La tabla anterior se queda: no se parpadea. */
  const [recargando, setRecargando] = React.useState(false);
  const [filtros, setFiltros] = React.useState<FiltrosDelEstadoDeCuenta>(SIN_FILTROS);
  /**
   * Al imprimir se apaga la paginación de las tablas. Sin esto la hoja sale con
   * las doce filas de la página en la que quedó la pantalla y el total del
   * contrato no cuadra con lo impreso.
   */
  const [imprimiendo, setImprimiendo] = React.useState(false);

  /** El documento entero. Es lo primero que se pide, y lo que reintenta el fallo. */
  const pedir = React.useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await cargar();
      setEntero(d);
      setVista(d);
      setFiltros(SIN_FILTROS);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cargar]);

  React.useEffect(() => {
    void pedir();
  }, [pedir]);

  const conFiltros = hayFiltros(filtros);

  /*
   * El recorte se le PIDE al back. Con una espera corta: cambiar el período y
   * después el contrato son dos toques seguidos, y no hacen falta dos viajes.
   * `vivo` descarta la respuesta de un filtro que ya se cambió — sin eso, la
   * respuesta lenta del filtro viejo pisa a la del nuevo y la tabla termina
   * mostrando algo que nadie pidió.
   */
  React.useEffect(() => {
    if (!entero) return;
    if (!conFiltros) {
      setVista(entero);
      setRecargando(false);
      return;
    }
    let vivo = true;
    const espera = setTimeout(() => {
      setRecargando(true);
      cargar(filtros)
        .then((d) => {
          if (vivo) setVista(d);
        })
        .catch((e: unknown) => {
          if (vivo) setError(e);
        })
        .finally(() => {
          if (vivo) setRecargando(false);
        });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [cargar, entero, filtros, conFiltros]);

  /*
   * 🔴 La nota sale de lo que el BACK dice que recortó (`vista.filtro`), no de
   * lo que hay en los controles. Es lo que hace que la pantalla, el PDF y el
   * enlace público digan exactamente lo mismo: en el enlace no hay controles y
   * el documento igual llega recortado, y en el panel un filtro que todavía no
   * viajó no puede anunciarse como aplicado.
   */
  const nota = vista?.filtro ? t('estadoDeCuenta.filtrado') : undefined;

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

  const regreso = volverA
    ? {
        href: volverA.href,
        label: volverA.label ?? t(`estadoDeCuenta.volver.${lugarDeRegreso(volverA.href)}`),
      }
    : undefined;

  const lineaDelCliente = entero
    ? [
        entero.cliente.nombre,
        comoSeLlamaElRol(entero.cliente.tipo),
        entero.contratos.length === 1
          ? '1 contrato'
          : `${entero.contratos.length} contratos`,
      ].join(' · ')
    : null;

  return (
    <div
      className={cn('mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:p-6 lg:p-8', className)}
      data-estado-pagina
    >
      <div data-estado-barra className="space-y-3">
        {regreso && (
          <Link
            href={regreso.href}
            data-testid="estado-volver"
            className="inline-flex items-center gap-1 text-body-sm text-fg-muted transition-colors hover:text-fg"
          >
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
            {regreso.label}
          </Link>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-h2 text-fg">{t('estadoDeCuenta.titulo')}</h1>
            {lineaDelCliente ? (
              <p className="mt-1 text-body-sm text-fg-muted" data-testid="estado-subtitulo">
                {lineaDelCliente}
              </p>
            ) : cargando ? (
              <Skeleton className="mt-2 h-4 w-72" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              hideArrow
              onClick={imprimir}
              disabled={!vista}
              data-testid="imprimir-estado"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t('estadoDeCuenta.imprimir')}
            </Button>
            {vista && acciones ? acciones(vista, nota, filtros) : null}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="space-y-4 rounded-lg border border-border bg-surface p-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-14 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : sinContratos(error) ? (
        /* 🔴 E6 — «no tiene contratos» NO se pinta como «no existe».
           El back devuelve 404 porque al inquilino lo identifican sus
           contratos y no una ficha propia, pero manda `code: SIN_CONTRATOS`.
           Un «no existe» sobre un inquilino que la inmobiliaria acaba de
           cargar la manda a buscar por qué se borró algo que nunca se borró.
           Es un estado VACÍO, no un fallo: sin «Reintentar», que no arregla
           nada, y con el camino de vuelta intacto. */
        <div
          data-testid="estado-sin-contratos-pantalla"
          className="rounded-lg border border-border bg-surface p-10 text-center"
        >
          <p className="text-body text-fg">{t('estadoDeCuenta.sinContratos')}</p>
          <p className="mt-1 text-body-sm text-fg-muted">
            {t('estadoDeCuenta.sinContratosDetalle')}
          </p>
        </div>
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="el estado de cuenta"
          onReintentar={pedir}
          volverA={regreso}
        />
      ) : entero && vista ? (
        /* La misma tarjeta que las demás tablas del panel: la barra de filtros
           arriba, con su borde, y el contenido debajo. El documento pierde su
           propio marco para no quedar como una tarjeta dentro de otra. */
        <section
          data-estado-marco
          className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
        >
          {!sinFiltros && entero.contratos.length > 0 && (
            <FiltrosDelEstado
              filtros={filtros}
              onCambiar={setFiltros}
              /* Del documento ENTERO: filtrar por un contrato no puede hacer
                 desaparecer del desplegable a los demás. */
              contratos={entero.contratos.map((c) => c.numero)}
              hoy={hoy}
              visibles={cuantasFilasDelDocumento(vista)}
              total={cuantasFilasDelDocumento(entero)}
            />
          )}

          {vista.contratos.length === 0 && conFiltros ? (
            /* Filtrado a cero NO es «este cliente no tiene contratos»: decirlo
               así sería afirmar algo falso sobre el cliente. */
            <div data-testid="estado-sin-resultados" className="px-6 py-16 text-center">
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
              doc={vista}
              hoy={hoy}
              sinPaginar={imprimiendo}
              nota={nota}
              reglasDeMoraHref={reglasDeMoraHref}
              className={cn(
                'rounded-none border-0 shadow-none',
                // El recorte lo trae el back: mientras viaja, la tabla anterior
                // se queda pero se atenúa. Vaciarla haría parpadear el
                // documento en cada toque del filtro.
                recargando && 'opacity-60 transition-opacity',
              )}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
