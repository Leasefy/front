'use client';

import { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  FileArrowUp,
  UserCircle,
  WarningCircle,
  ImageSquare,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MonoLabel } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';
import { propertiesApi } from '@/lib/api/properties.service';
import { uploadPropertyPhotos } from '@/lib/api/property-photos';
import { traerFotoComoArchivo } from '@/lib/inmuebles/enlaces.service';
import { usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';
import type { Property } from '@/lib/types/property';
import { faltantesParaElBack } from '../lib/requisitosDelBack';
import { toCreatePayload } from '../lib/toCreatePayload';
import { geocodeImportRow, GEOCODE_ROW_DELAY_MS } from '../lib/geocodeImportRow';
import { inmuebleParaMandato } from '../lib/inmuebleParaMandato';
import { CompletarMandatosLoteDialog } from '../CompletarMandatosLoteDialog';
import { RanuraDelPie, type ImportStepProps } from '../ImportWizard';
import type { ImportProperty } from '../lib/importTypes';

/**
 * Lo que hace falta para cerrar la importación DESPUÉS de que el modal de
 * mandato (R1) se resuelva — se hizo o se saltó, da igual. Separado del
 * cierre porque el modal es opcional y asíncrono: el resumen final no puede
 * calcularse hasta que el usuario decide.
 */
interface ResumenPendiente {
  created: number;
  failed: number;
  geocodedCount: number;
  fotosSubidas: number;
  fotosFallidas: number;
}

/**
 * Los requisitos del back viven en `lib/requisitosDelBack.ts` y ahora se
 * evalúan en la REVISIÓN, que es donde cada inmueble se puede completar.
 *
 * Acá quedan sólo como red de seguridad: si algo llegó hasta este paso sin
 * cumplirlos, se aparta ANTES de geocodificar. Antes este era el único lugar
 * donde se comprobaban, y por eso el aviso salía en una pantalla sin un solo
 * campo editable: se veía «no se puede importar» y no había nada que hacer.
 */

export function StepConfirmImport({ state, updateState }: ImportStepProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [isImporting, setIsImporting] = useState(false);
  // Tres fases con tiempos muy distintos: geocodificar es medio segundo por
  // fila, crear es rápido, y bajar y subir fotos es lo más lento de todo.
  // Cada una cuenta aparte — una barra sola que se queda quieta en el 100 %
  // mientras suben 80 fotos parece colgada.
  const [fase, setFase] = useState<'geocodificando' | 'creando' | 'fotos' | null>(null);
  // Un toast se va solo. Si fallaron las 200, el motivo tiene que quedarse en
  // la pantalla para poder leerlo y copiarlo.
  const [errorDeImportacion, setErrorDeImportacion] = useState<string | null>(null);
  const ranuraDelPie = useContext(RanuraDelPie);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // R1 — el modal de mandato al terminar de importar. `mandateProperties`
  // no-nulo dispara el modal; `resumenPendiente` guarda lo que falta para
  // cerrar (toast + pantalla de éxito) hasta que el usuario decide algo.
  const [mandateProperties, setMandateProperties] = useState<Property[] | null>(null);
  const [resumenPendiente, setResumenPendiente] = useState<ResumenPendiente | null>(null);
  const { propietarios: propietariosDelLote } = usePropietarios();
  const { agentes: agentesDelLote } = useAgentes();

  const properties = state.properties;
  const selectedProperties = properties.filter((p) => p.selected && !p.hasErrors);
  const excludedCount = properties.filter((p) => !p.selected).length;
  const acceptedSuggestionsCount = properties.reduce(
    (sum, p) => sum + p.suggestions.filter((s) => s.accepted === true).length,
    0
  );
  const remainingErrorsCount = properties.filter((p) => p.selected && p.hasErrors).length;

  // Las que el back va a rechazar, separadas ANTES de empezar. Antes se
  // mandaban igual y volvían 400 una por una, después de geocodificarlas.
  const bloqueadas = selectedProperties
    .map((p) => ({ p, faltan: faltantesParaElBack(p) }))
    .filter((x) => x.faltan.length > 0);
  const importables = selectedProperties.filter((p) => faltantesParaElBack(p).length === 0);
  const motivosBloqueo = [
    ...new Set(bloqueadas.flatMap((x) => x.faltan.map((f) => f.etiqueta.toLowerCase()))),
  ];

  const importCount = importables.length;

  // Fotos que vienen del enlace de origen. Sólo existen en el método «Desde
  // enlaces»; en la importación por archivo las dos son cero y nada de esto
  // se dibuja.
  const fotosPendientes = importables.filter((p) => p.imagenes?.length).length;
  const totalDeFotos = importables.reduce((n, p) => n + (p.imagenes?.length ?? 0), 0);

  const handleImport = async () => {
    if (importCount === 0) return;
    setIsImporting(true);
    setFase('geocodificando');
    setProgress(0);
    setCurrentItem(0);

    const total = importCount;

    // Geocodificación secuencial — respeta el límite de LocationIQ, y una
    // dirección mala nunca frena la importación: cae al centro de la ciudad.
    //
    // Va a paso de tortuga por diseño (550 ms por fila), así que con 200
    // inmuebles son casi DOS MINUTOS. Antes eso era un texto fijo —
    // «Geocodificando direcciones…»— sin barra ni conteo: la pantalla parecía
    // colgada. Ahora cuenta.
    let geocodedCount = 0;
    let fallbackCount = 0;
    // El payload viaja junto a la propiedad de la que salió: sin eso, después
    // de crear no hay forma de saber a qué inmueble le tocaban qué fotos.
    const aCrear: Array<{
      payload: ReturnType<typeof toCreatePayload> & { latitude?: number; longitude?: number };
      origen: ImportProperty;
    }> = [];

    for (let i = 0; i < importables.length; i++) {
      const p = importables[i];
      // El contador dice EN CUÁL VA, y se pone antes de esperar. Cuando decía
      // cuántos habían terminado, la pantalla mostraba «0 de N» al 0% durante
      // todo el primer inmueble — medido acá: 4,7 s mirando una barra vacía.
      // Parecía que no estaba pasando nada.
      setCurrentItem(i + 1);
      const coords = await geocodeImportRow(p);
      if (coords.source === 'geocoded') geocodedCount += 1;
      else fallbackCount += 1;
      aCrear.push({
        origen: p,
        payload: {
          ...toCreatePayload(p),
          ...(coords.lat != null && coords.lng != null ? { latitude: coords.lat, longitude: coords.lng } : {}),
        },
      });
      // El porcentaje sí es trabajo TERMINADO: por eso va después.
      setProgress(Math.round(((i + 1) / total) * 100));
      if (i < importables.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, GEOCODE_ROW_DELAY_MS));
      }
    }

    setFase('creando');
    // Arranca en 1, no en 0: «voy por el primero», no «llevo ninguno».
    setCurrentItem(Math.min(1, total));
    setProgress(0);

    // No hay endpoint de importación masiva: se crea inmueble por inmueble.
    //
    // Antes salían TODAS de una (`payloads.map(...)` dentro de un solo
    // allSettled). Con 200 filas son 200 POST simultáneos contra el back —
    // pedir eso es pedir que fallen. Ahora van de a EN_PARALELO.
    const EN_PARALELO = 6;
    let done = 0;
    const results: PromiseSettledResult<Property>[] = [];
    // Los que quedaron creados Y traen fotos del enlace de origen.
    const conFotos: { id: string; imagenes: string[] }[] = [];

    for (let i = 0; i < aCrear.length; i += EN_PARALELO) {
      const tanda = aCrear.slice(i, i + EN_PARALELO);
      const parcial = await Promise.allSettled(
        tanda.map(({ payload, origen }) =>
          propertiesApi
            .create(payload)
            .then((creado) => {
              if (origen.imagenes?.length) {
                conFotos.push({ id: creado.id, imagenes: origen.imagenes });
              }
              return creado;
            })
            .finally(() => {
              done += 1;
              // Mientras quede alguno, el contador señala el siguiente en curso.
              setCurrentItem(Math.min(done + 1, total));
              setProgress(Math.round((done / total) * 100));
            })
        )
      );
      results.push(...parcial);
    }

    const created = results.filter((r) => r.status === 'fulfilled').length;
    const failed = total - created;

    // El motivo del primer rechazo. `allSettled` los guarda y antes se tiraban
    // todos: el aviso decía «no se pudo importar ninguna» sin decir por qué,
    // que es justo lo que no sirve cuando fallan las 200.
    const primerFallo = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    const motivo =
      primerFallo?.reason instanceof Error
        ? primerFallo.reason.message
        : primerFallo
          ? String(primerFallo.reason)
          : undefined;

    // ── Fase 3: las fotos ──────────────────────────────────────────────
    // Sólo existe cuando los inmuebles vinieron de un enlace. Van DESPUÉS de
    // crear porque el back las cuelga de un inmueble que ya tiene id, y van de
    // a uno por inmueble porque el orden de subida es el orden en que quedan
    // (la primera es la portada).
    //
    // Una foto que falla no toca el inmueble: ya está creado y guardado. Por
    // eso esto no puede tirar — se cuenta y se informa.
    let fotosSubidas = 0;
    let fotosFallidas = 0;

    if (conFotos.length > 0) {
      setFase('fotos');
      setProgress(0);
      const totalConFotos = conFotos.length;
      setCurrentItem(Math.min(1, totalConFotos));

      for (let i = 0; i < conFotos.length; i++) {
        setCurrentItem(i + 1);
        const { id, imagenes } = conFotos[i];

        // Bajarlas por el proxy (el navegador no puede leer otro dominio) y
        // convertirlas en archivos, que es lo que sube el back.
        const archivos = (
          await Promise.all(
            imagenes.map((url, n) => traerFotoComoArchivo(url, `foto-${n + 1}`)),
          )
        ).filter((f): f is File => f !== null);

        fotosFallidas += imagenes.length - archivos.length;

        if (archivos.length > 0) {
          const resultado = await uploadPropertyPhotos(id, archivos);
          fotosSubidas += resultado.uploaded;
          fotosFallidas += resultado.failed.length;
        }

        setProgress(Math.round(((i + 1) / totalConFotos) * 100));
      }
    }

    setIsImporting(false);
    setFase(null);

    // eslint-disable-next-line no-console -- geocoding coverage isn't surfaced anywhere else
    console.info(`[import] geocoding: ${geocodedCount} resolved, ${fallbackCount} fell back to city center`);

    if (created === 0) {
      // No se guardó nada — decir qué pasó y NO ir a la pantalla de éxito.
      setErrorDeImportacion(motivo ?? null);
      toast.error('No se importó ninguna propiedad', {
        description: motivo
          ? `Las ${failed} fallaron. El servidor respondió: ${motivo}`
          : `Las ${failed} fallaron y el servidor no dio un motivo.`,
        duration: 10000,
      });
      return;
    }

    const resumen: ResumenPendiente = { created, failed, geocodedCount, fotosSubidas, fotosFallidas };

    // R1 — antes de la pantalla de éxito, ofrecer el modal de mandato para
    // TODO lo que se creó. `results[i]` corresponde a `aCrear[i]` (mismo
    // orden — el batching en tandas de EN_PARALELO no lo revuelve).
    //
    // Nunca publica nada: contract.md T-0030 §3.4/§8 deja el auto-publish
    // fuera de alcance de esta tarea a propósito. El inmueble queda DRAFT,
    // con o sin mandato — CompletarMandatosLoteDialog sólo llama
    // POST /inmobiliaria/consignaciones (submitMandatosLote), nunca
    // PATCH /properties/:id.
    const creadas = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((p): p is Property => p !== null);

    // T-0038 §3.2.4/§3.5.1-B — a SALE listing gets no rental mandate: it has
    // no canon and `Consignacion.monthlyRent` is NOT NULL. Same reasoning
    // ConsignacionWizard.tsx applies to the manual-creation flow. A batch
    // that only produced sale listings skips the mandate dialog entirely.
    const paraMandato = creadas.filter((p) => p.listingType !== 'sale');

    if (paraMandato.length > 0) {
      setResumenPendiente(resumen);
      setMandateProperties(paraMandato);
      return;
    }

    finalizarImportacion(resumen);
  };

  /**
   * Cierra la importación: la pantalla de éxito y el toast de resumen. Se
   * llama directo cuando no hubo nada que crear, o después de que el modal
   * de mandato (R1) se resuelve — completado o salteado, da igual (R2: si
   * se saltea, no se crea nada más, y la fila ya sale en el portafolio con
   * la alerta de WU-2).
   */
  const finalizarImportacion = (resumen: ResumenPendiente) => {
    const { created, failed, geocodedCount, fotosSubidas, fotosFallidas } = resumen;
    setMandateProperties(null);
    setResumenPendiente(null);
    setErrorDeImportacion(null);

    updateState({ importedCount: created, importProgress: 100 });
    setIsComplete(true);

    const geocodeNote = geocodedCount > 0 ? ` (${geocodedCount} con dirección exacta geocodificada)` : '';
    const notaFotos =
      fotosSubidas > 0
        ? ` Se subieron ${fotosSubidas} ${fotosSubidas === 1 ? 'foto' : 'fotos'}${
            fotosFallidas > 0 ? ` y ${fotosFallidas} no se pudieron traer.` : '.'
          }`
        : fotosFallidas > 0
          ? ` Ninguna de las ${fotosFallidas} fotos se pudo traer.`
          : '';

    if (failed > 0) {
      toast.error('Importación parcial', {
        description: `${created} propiedades importadas, ${failed} con error.${geocodeNote}${notaFotos}`,
      });
    } else {
      toast.success('Importación exitosa', {
        description: `${created} propiedades importadas correctamente${geocodeNote}${notaFotos}`,
      });
    }
  };

  const botonImportar = (
    <Button
      type="button"
      hideArrow
      onClick={handleImport}
      disabled={importCount === 0 || isImporting}
      className="gap-2"
    >
      <FileArrowUp className="w-4 h-4" />
      {isImporting
        ? 'Importando...'
        : t('inmobiliaria.import.confirm.importButton', { count: importCount })}
    </Button>
  );

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="animate-scale-in">
          {/* allowlist: success hero icon-circle (wraps Phosphor glyph), no text-label pill */}
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
              // Reset wizard state
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
              // Redirect to step 1 — the wizard handles navigation
              router.push('/panel/inmobiliaria/inmuebles/importar');
            }}
          >
            Importar más
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Resumen de importación
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Revisa el resumen antes de ejecutar la importación.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border dark:border-border-strong p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <FileArrowUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">
              {t('inmobiliaria.import.confirm.title')}
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {state.fileName}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Properties to import */}
          <div className="rounded-md bg-primary-soft p-4">
            <MonoLabel className="block text-xs text-primary mb-1">
              {t('inmobiliaria.import.confirm.propertiesToImport')}
            </MonoLabel>
            <p className="text-3xl font-bold text-primary">
              {importCount}
            </p>
          </div>

          {/* Excluded */}
          <div className="rounded-md bg-surface-muted dark:bg-ink p-4">
            <MonoLabel className="block text-xs text-fg-muted dark:text-fg-subtle mb-1">
              {t('inmobiliaria.import.confirm.propertiesExcluded')}
            </MonoLabel>
            <p className="text-3xl font-bold text-fg-muted dark:text-fg-subtle">
              {excludedCount}
            </p>
          </div>

          {/* AI suggestions accepted */}
          <div className="rounded-md bg-success-soft p-4">
            <MonoLabel className="block text-xs text-success mb-1">
              {t('inmobiliaria.import.confirm.suggestionsAccepted')}
            </MonoLabel>
            <p className="text-3xl font-bold text-success">
              {acceptedSuggestionsCount}
            </p>
          </div>

          {/* Remaining errors */}
          <div
            className={cn(
              'rounded-md p-4',
              remainingErrorsCount > 0
                ? 'bg-danger-soft'
                : 'bg-success-soft'
            )}
          >
            <MonoLabel
              className={cn(
                'block text-xs mb-1',
                remainingErrorsCount > 0
                  ? 'text-danger'
                  : 'text-success'
              )}
            >
              {t('inmobiliaria.import.confirm.remainingErrors')}
            </MonoLabel>
            <p
              className={cn(
                'text-3xl font-bold',
                remainingErrorsCount > 0
                  ? 'text-danger'
                  : 'text-success'
              )}
            >
              {remainingErrorsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Lo que va a pasar con las fotos, dicho antes de empezar: son lo más
          lento de la importación y conviene que no sorprenda. */}
      {totalDeFotos > 0 && (
        <div
          className="rounded-xl border border-border dark:border-border-strong bg-surface-muted dark:bg-white/[0.02] p-5"
          data-testid="import-fotos"
        >
          <div className="flex items-start gap-3">
            <ImageSquare className="w-5 h-5 text-fg-subtle dark:text-fg-muted mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-fg dark:text-white text-sm">
                {totalDeFotos} {totalDeFotos === 1 ? 'foto' : 'fotos'} de {fotosPendientes}{' '}
                {fotosPendientes === 1 ? 'inmueble' : 'inmuebles'}
              </h3>
              <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
                Se traen desde el enlace después de crear cada inmueble, hasta 10 por inmueble.
                Es la parte más lenta. Si alguna no se puede bajar, el inmueble se guarda igual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agent assignment note */}
      <div className="rounded-xl border border-border dark:border-border-strong bg-surface-muted dark:bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-fg-subtle dark:text-fg-muted mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-fg dark:text-white text-sm">
              Asignación de agentes
            </h3>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
              Las propiedades se importarán sin agente asignado. Podrás asignar agentes individualmente o en lote desde el portafolio después de importar.
            </p>
          </div>
        </div>
      </div>

      {/* Progreso. Las dos fases cuentan: geocodificar 200 direcciones son casi
          dos minutos, y sin barra la pantalla parece colgada. */}
      {isImporting && (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {fase === 'geocodificando'
              ? `Buscando las direcciones en el mapa — ${currentItem} de ${importCount}`
              : fase === 'fotos'
                ? `Trayendo las fotos — inmueble ${currentItem} de ${fotosPendientes}`
                : t('inmobiliaria.import.confirm.importing', {
                    current: currentItem,
                    total: importCount,
                  })}
          </p>
          <Progress
            value={progress}
            size="xs"
            variant={fase === 'fotos' && progress >= 100 ? 'success' : 'default'}
          />
          <p className="text-xs text-right font-mono text-fg-subtle dark:text-fg-muted">
            {progress}%
          </p>
        </div>
      )}

      {/* Lo que el back va a rechazar, dicho ANTES de empezar. Antes se
          descubría al final: dos minutos geocodificando y después 200 errores
          400 iguales, con un aviso que no decía cuál era el problema. */}
      {bloqueadas.length > 0 && !isImporting && (
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
              <span className="font-medium text-fg">Revisión</span> con «Anterior» y
              completalos ahí en cada inmueble; el resto se importa igual.
            </p>
          </div>
        </div>
      )}

      {/* El motivo del fallo, en la pantalla: el toast se va solo. */}
      {errorDeImportacion && !isImporting && (
        <div
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
          role="alert"
          data-testid="import-error"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-danger">No se importó ninguna propiedad</p>
            <p className="text-body-sm text-fg-muted mt-0.5 break-words">
              El servidor respondió: {errorDeImportacion}
            </p>
          </div>
        </div>
      )}

      {/* La acción principal va al PIE, junto a «Anterior» — es donde estuvo
          el primario en los cuatro pasos anteriores. Si la ranura todavía no
          está montada se dibuja acá, para no quedarse sin botón. */}
      {ranuraDelPie ? createPortal(botonImportar, ranuraDelPie) : (
        <div className="flex justify-end">{botonImportar}</div>
      )}

      {/* R1 — el modal de mandato, al terminar de importar. Saltable: si se
          cierra sin completar, no se crea nada más (R2) y la fila ya sale en
          el portafolio con la alerta "Falta mandato" (WU-2). */}
      {mandateProperties && mandateProperties.length > 0 && resumenPendiente && (
        <CompletarMandatosLoteDialog
          inmuebles={mandateProperties.map(inmuebleParaMandato)}
          propietarios={propietariosDelLote}
          agentes={agentesDelLote}
          onClose={() => finalizarImportacion(resumenPendiente)}
          onDone={() => finalizarImportacion(resumenPendiente)}
        />
      )}
    </div>
  );
}
