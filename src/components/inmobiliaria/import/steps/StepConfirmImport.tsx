'use client';

import { useState, useContext, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  FileArrowUp,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pagination } from '@/components/ui/pagination';
import { MonoLabel } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { faltantesParaElBack } from '../lib/requisitosDelBack';
import { toImportarInmuebleDto } from '../lib/toImportarInmuebleDto';
import { geocodeImportRow, GEOCODE_ROW_DELAY_MS } from '../lib/geocodeImportRow';
import { generarIdempotencyKey } from '../lib/idempotencia';
import { activarLoteCompleto } from '../lib/activarLoteCompleto';
import { RanuraDelPie, type ImportStepProps } from '../ImportWizard';
import { FilaImportacionRow } from '../FilaImportacionRow';
import { ProgresoDeLoteInmuebles } from '../ProgresoDeLoteInmuebles';
import { useEstadoDeLoteInmuebles } from '@/lib/hooks/use-estado-de-lote-inmuebles';
import {
  inmueblesImportacionApi,
  type FilaDeImportacion,
  type ResolverInmuebleDto,
  type ResumenLoteInmuebles,
  type FilaOmitida,
  type ImportarInmuebleDto,
} from '@/lib/api/inmuebles-importacion.service';

/**
 * StepConfirmImport — WU-6: wires the durable backend (WU-4,
 * wu-4-report.md §6) instead of fanning out client-side to
 * `POST /properties`, one call per row. Closing the tab now loses nothing:
 * the batch is staged server-side from the moment `preparar()` returns, and
 * `PROPERTY_IMPORT_COMPLETED` — not this component — is the completion
 * mechanism. Polling (`useEstadoDeLoteInmuebles`) is only a bounded
 * convenience while the tab stays open.
 *
 * Scope cuts made explicitly, not silently (see wu-6-report.md §8 for the
 * full reasoning):
 *  - The end-of-import mandate dialog (R1, `CompletarMandatosLoteDialog`)
 *    is NOT offered here any more. Properties do not exist until
 *    `activar()` succeeds — asynchronously, at a time the agency chooses —
 *    so there is no `Property[]` to hand the dialog at the point this
 *    component used to call it. Imported properties stay mandate-less by
 *    design (C5/C13) and are surfaced by the grid-view fix (W4-b).
 *  - Photo upload from the "enlaces" import method is deferred: the old
 *    flow uploaded to a property id it had just created; the new flow does
 *    not have one until activation. Not wired in this pass — flagged as a
 *    real, known gap, not silently dropped.
 */

const POR_PAGINA = 25;

export function StepConfirmImport({ state, updateState }: ImportStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const ranuraDelPie = useContext(RanuraDelPie);

  const properties = state.properties;
  const selectedProperties = properties.filter((p) => p.selected && !p.hasErrors);
  const excludedCount = properties.filter((p) => !p.selected).length;
  const acceptedSuggestionsCount = properties.reduce(
    (sum, p) => sum + p.suggestions.filter((s) => s.accepted === true).length,
    0,
  );
  const remainingErrorsCount = properties.filter((p) => p.selected && p.hasErrors).length;

  // Las que el back va a rechazar, separadas ANTES de empezar.
  const bloqueadas = selectedProperties
    .map((p) => ({ p, faltan: faltantesParaElBack(p) }))
    .filter((x) => x.faltan.length > 0);
  const importables = selectedProperties.filter((p) => faltantesParaElBack(p).length === 0);
  const motivosBloqueo = [
    ...new Set(bloqueadas.flatMap((x) => x.faltan.map((f) => f.etiqueta.toLowerCase()))),
  ];
  const importCount = importables.length;

  // ── Phase 1: geocode (client-side, unchanged from before) + preparar() ──
  const [geocodificando, setGeocodificando] = useState(false);
  const [geoProgress, setGeoProgress] = useState(0);
  const [geoCurrent, setGeoCurrent] = useState(0);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lote, setLote] = useState<string | null>(
    () => searchParams?.get('lote') ?? null,
  );
  const [idempotencyKey] = useState(() => generarIdempotencyKey());

  const { estado: estadoLote, agotado } = useEstadoDeLoteInmuebles(lote);

  // ── Phase 2: review ──────────────────────────────────────────────────
  const [resumenLote, setResumenLote] = useState<ResumenLoteInmuebles | null>(null);
  const [pendientes, setPendientes] = useState<FilaDeImportacion[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filaBusy, setFilaBusy] = useState<string | null>(null);
  const [descartandoLote, setDescartandoLote] = useState(false);

  // ── Phase 3: activation ──────────────────────────────────────────────
  const [activando, setActivando] = useState(false);
  const [resultadoActivacion, setResultadoActivacion] = useState<{
    activados: number;
    omitidas: FilaOmitida[];
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const refrescarRevision = useCallback(async (elLote: string, pag = 1) => {
    try {
      const [r, p] = await Promise.all([
        inmueblesImportacionApi.resumen(elLote),
        inmueblesImportacionApi.filas(elLote, {
          pagina: pag,
          porPagina: POR_PAGINA,
          estado: 'PENDIENTE',
        }),
      ]);
      setResumenLote(r);
      setPendientes(p.filas);
      setTotalPendientes(p.total);
      setPagina(p.pagina);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir ese lote.');
    }
  }, []);

  // El lote pasó a LISTO (por el sondeo, o porque llegamos por el ?lote= de
  // la notificación con el batch ya terminado): recién ahí tiene sentido
  // cargar la lista de trabajo real.
  useEffect(() => {
    if (!lote) return;
    if (estadoLote?.estado === 'LISTO') {
      refrescarRevision(lote);
    }
  }, [lote, estadoLote?.estado, refrescarRevision]);

  const handlePreparar = async () => {
    if (importCount === 0) return;
    setError(null);
    setGeocodificando(true);
    setGeoProgress(0);
    setGeoCurrent(0);

    // Geocodificación secuencial — respeta el límite de LocationIQ. Va antes
    // de `preparar()` porque el back de importación (WU-4) no geocodifica;
    // sin esto, todo inmueble importado caería al centro de la ciudad.
    const dtos: ImportarInmuebleDto[] = [];
    for (let i = 0; i < importables.length; i++) {
      const p = importables[i];
      setGeoCurrent(i + 1);
      const coords = await geocodeImportRow(p);
      dtos.push({
        ...toImportarInmuebleDto(p),
        ...(coords.lat != null && coords.lng != null
          ? { latitude: coords.lat, longitude: coords.lng }
          : {}),
      });
      setGeoProgress(Math.round(((i + 1) / importables.length) * 100));
      if (i < importables.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, GEOCODE_ROW_DELAY_MS));
      }
    }

    setGeocodificando(false);
    setPreparando(true);
    try {
      const r = await inmueblesImportacionApi.preparar(dtos, idempotencyKey);
      // El lote es SIEMPRE del servidor — nunca uno generado acá.
      setLote(r.lote);
    } catch (e) {
      setError(
        e instanceof ApiError && e.messages
          ? e.messages.join(' · ')
          : e instanceof Error
            ? e.message
            : 'No pudimos preparar la importación.',
      );
    } finally {
      setPreparando(false);
    }
  };

  const handleResolver = async (id: string, cambios: ResolverInmuebleDto) => {
    if (!lote) return;
    setFilaBusy(id);
    try {
      await inmueblesImportacionApi.resolver(id, cambios);
      await refrescarRevision(lote, pagina);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.code === 'FILA_YA_ACTIVADA'
          ? 'Esta fila ya se activó — no se puede editar.'
          : e instanceof Error
            ? e.message
            : 'No pudimos guardar los cambios.';
      toast.error(msg);
    } finally {
      setFilaBusy(null);
    }
  };

  const handleDescartarFila = async (id: string) => {
    if (!lote) return;
    setFilaBusy(id);
    try {
      await inmueblesImportacionApi.descartarFila(id);
      await refrescarRevision(lote, pagina);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos descartar la fila.');
    } finally {
      setFilaBusy(null);
    }
  };

  /**
   * Nunca reintenta ni se traga un error — un 409 (`LOTE_EN_PROCESO`, el
   * job todavía está corriendo) o un 404 (lote desconocido) se muestran tal
   * cual. El 409 NO es un fallo del usuario: es la señal de "esperá a que
   * termine", nunca se reintenta silenciosamente (wu-4-report.md §6).
   */
  const handleDescartarLote = async () => {
    if (!lote) return;
    setDescartandoLote(true);
    setError(null);
    try {
      await inmueblesImportacionApi.descartarLote(lote);
      router.push('/panel/inmobiliaria/inmuebles');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LOTE_EN_PROCESO') {
        setError('El lote todavía se está procesando — esperá a que termine antes de descartarlo.');
      } else {
        setError(e instanceof Error ? e.message : 'No pudimos descartar el lote.');
      }
    } finally {
      setDescartandoLote(false);
    }
  };

  /**
   * `POST .../activar` es resumible — 500 filas por llamada. El loop vive
   * en `activarLoteCompleto` (testeable aparte); acá sólo se orquesta el
   * estado de pantalla mientras corre.
   */
  const handleActivar = async () => {
    if (!lote) return;
    setActivando(true);
    setError(null);
    try {
      const resultado = await activarLoteCompleto(lote, inmueblesImportacionApi.activar);
      setResultadoActivacion(resultado);
      updateState({ importedCount: resultado.activados, importProgress: 100 });
      setIsComplete(true);
      if (resultado.omitidas.length > 0) {
        toast.warning('Importación parcial', {
          description: `${resultado.activados} activadas, ${resultado.omitidas.length} todavía con datos pendientes.`,
        });
      } else {
        toast.success('Importación exitosa', {
          description: `${resultado.activados} propiedades importadas correctamente`,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos activar el lote.');
    } finally {
      setActivando(false);
    }
  };

  const botonImportar = (
    <Button
      type="button"
      hideArrow
      onClick={handlePreparar}
      disabled={importCount === 0 || geocodificando || preparando}
      className="gap-2"
    >
      <FileArrowUp className="w-4 h-4" />
      {geocodificando || preparando
        ? 'Preparando...'
        : t('inmobiliaria.import.confirm.importButton', { count: importCount })}
    </Button>
  );

  // ── Success state ────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-success" weight="fill" />
          </div>
        </div>

        <div className="animate-fade-in-up space-y-2">
          <h2 className="text-2xl font-semibold text-fg dark:text-white">
            ¡Importación completada!
          </h2>
          <p className="text-fg-muted dark:text-fg-subtle">
            Se importaron{' '}
            <span className="font-semibold text-fg dark:text-white">
              {state.importedCount} propiedades
            </span>{' '}
            a tu portafolio
          </p>
          {resultadoActivacion && resultadoActivacion.omitidas.length > 0 && (
            <p className="text-sm text-warning">
              {resultadoActivacion.omitidas.length} filas quedaron pendientes de datos — volvé a
              «Revisión» para completarlas.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 animate-fade-in-up">
          <Button
            type="button"
            size="lg"
            hideArrow
            onClick={() => router.push('/panel/inmobiliaria/inmuebles')}
          >
            Ver portafolio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            hideArrow
            onClick={() => {
              updateState({
                method: null,
                file: null,
                fileName: '',
                rawRows: [],
                headers: [],
                sheetNames: [],
                selectedSheet: '',
                columnMappings: [],
                properties: [],
                aiAnalyzed: false,
                importProgress: 0,
                importedCount: 0,
              });
              router.push('/panel/inmobiliaria/inmuebles/importar');
            }}
          >
            Importar más
          </Button>
        </div>
      </div>
    );
  }

  // ── Batch staged, still ENCOLADO/PROCESANDO ─────────────────────────
  if (lote && estadoLote?.estado !== 'LISTO' && estadoLote?.estado !== 'FALLIDO') {
    return (
      <div className="space-y-6">
        <ProgresoDeLoteInmuebles estado={estadoLote} agotado={agotado} />
        {error && (
          <div className="rounded-md bg-danger-soft border border-border p-3" role="alert">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Batch FALLIDO ─────────────────────────────────────────────────────
  if (lote && estadoLote?.estado === 'FALLIDO') {
    return <ProgresoDeLoteInmuebles estado={estadoLote} agotado={agotado} />;
  }

  // ── Batch LISTO — review + activate ─────────────────────────────────
  if (lote) {
    const puedeActivar = (resumenLote?.listos ?? 0) > 0;
    const totalPaginas = Math.max(1, Math.ceil(totalPendientes / POR_PAGINA));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
            Revisá lo que falta antes de activar
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Las filas listas se activan cuando quieras — cerrar esta pestaña no pierde nada.
          </p>
        </div>

        {resumenLote && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
              <MonoLabel className="block text-xs text-fg-muted mb-1">Total</MonoLabel>
              <p className="text-2xl font-bold text-fg">{resumenLote.total}</p>
            </div>
            <div className="rounded-md bg-warning-soft p-4">
              <MonoLabel className="block text-xs text-warning mb-1">Pendientes</MonoLabel>
              <p className="text-2xl font-bold text-warning">{resumenLote.pendientes}</p>
            </div>
            <div className="rounded-md bg-success-soft p-4">
              <MonoLabel className="block text-xs text-success mb-1">Listas</MonoLabel>
              <p className="text-2xl font-bold text-success">{resumenLote.listos}</p>
            </div>
            <div className="rounded-md bg-primary-soft p-4">
              <MonoLabel className="block text-xs text-primary mb-1">Activadas</MonoLabel>
              <p className="text-2xl font-bold text-primary">{resumenLote.activados}</p>
            </div>
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="space-y-3">
            {pendientes.map((fila) => (
              <FilaImportacionRow
                key={fila.id}
                fila={fila}
                onResolver={handleResolver}
                onDescartar={handleDescartarFila}
                isBusy={filaBusy === fila.id}
              />
            ))}
            {totalPaginas > 1 && (
              <Pagination
                currentPage={pagina}
                totalPages={totalPaginas}
                onPageChange={(p) => refrescarRevision(lote, p)}
              />
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-danger-soft border border-border p-3" role="alert">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            hideArrow
            disabled={descartandoLote}
            isLoading={descartandoLote}
            onClick={handleDescartarLote}
          >
            Descartar lote completo
          </Button>
          <Button
            type="button"
            hideArrow
            disabled={!puedeActivar || activando}
            isLoading={activando}
            onClick={handleActivar}
          >
            {activando
              ? 'Activando...'
              : `Activar ${resumenLote?.listos ?? 0} ${resumenLote?.listos === 1 ? 'inmueble' : 'inmuebles'}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Pre-import summary (no lote yet) ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Resumen de importación
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Revisa el resumen antes de ejecutar la importación.
        </p>
      </div>

      <div className="rounded-xl border border-border dark:border-border-strong p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <FileArrowUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.import.confirm.title')}
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">{state.fileName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-md bg-primary-soft p-4">
            <MonoLabel className="block text-xs text-primary mb-1">
              {t('inmobiliaria.import.confirm.propertiesToImport')}
            </MonoLabel>
            <p className="text-3xl font-bold text-primary">{importCount}</p>
          </div>

          <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
            <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.import.confirm.propertiesExcluded')}
            </MonoLabel>
            <p className="text-3xl font-bold text-fg-muted dark:text-fg-subtle">{excludedCount}</p>
          </div>

          <div className="rounded-md bg-success-soft p-4">
            <MonoLabel className="block text-xs text-success mb-1">
              {t('inmobiliaria.import.confirm.suggestionsAccepted')}
            </MonoLabel>
            <p className="text-3xl font-bold text-success">{acceptedSuggestionsCount}</p>
          </div>

          <div
            className={cn('rounded-md p-4', remainingErrorsCount > 0 ? 'bg-danger-soft' : 'bg-success-soft')}
          >
            <MonoLabel
              className={cn('block text-xs mb-1', remainingErrorsCount > 0 ? 'text-danger' : 'text-success')}
            >
              {t('inmobiliaria.import.confirm.remainingErrors')}
            </MonoLabel>
            <p className={cn('text-3xl font-bold', remainingErrorsCount > 0 ? 'text-danger' : 'text-success')}>
              {remainingErrorsCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border dark:border-border-strong bg-surface-muted dark:bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-fg-subtle dark:text-fg-muted mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-fg dark:text-white text-sm">Asignación de agentes</h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
              Las propiedades se importarán sin agente asignado. Podrás asignar agentes
              individualmente o en lote desde el portafolio después de importar.
            </p>
          </div>
        </div>
      </div>

      {geocodificando && (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Buscando las direcciones en el mapa — {geoCurrent} de {importCount}
          </p>
          <Progress value={geoProgress} size="xs" />
          <p className="text-xs text-right font-mono text-fg-subtle dark:text-fg-muted">{geoProgress}%</p>
        </div>
      )}

      {bloqueadas.length > 0 && !geocodificando && (
        <div
          className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
          data-testid="import-bloqueadas"
        >
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-warning">
              {bloqueadas.length === 1
                ? '1 inmueble no se puede importar'
                : `${bloqueadas.length} inmuebles no se pueden importar`}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Les falta {motivosBloqueo.join(', ')}. Volvé a{' '}
              <span className="font-medium text-fg">Revisión</span> con «Anterior» y completalos ahí
              en cada inmueble; el resto se importa igual.
            </p>
          </div>
        </div>
      )}

      {error && !geocodificando && (
        <div
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
          role="alert"
          data-testid="import-error"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-danger">No se pudo preparar la importación</p>
            <p className="text-body-sm text-fg-muted mt-0.5 break-words">El servidor respondió: {error}</p>
          </div>
        </div>
      )}

      {ranuraDelPie ? createPortal(botonImportar, ranuraDelPie) : <div className="flex justify-end">{botonImportar}</div>}
    </div>
  );
}
