'use client';

import { useState, useCallback, useMemo, useEffect, useRef, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CrossFade, motionDuration, motionEase } from '@leasefy/cadence';
import {
  UploadSimple,
  MapPin,
  ListChecks,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Check,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StepChooseMethod } from './steps/StepChooseMethod';
import { StepUploadFile } from './steps/StepUploadFile';
import { StepColumnMapping } from './steps/StepColumnMapping';
import { StepConfirmImport } from './steps/StepConfirmImport';
import { RanuraVivaContext } from '@/components/migracion/ranura-viva';
import { StepSoftwareMigration } from './steps/StepSoftwareMigration';
import { StepPortalImport } from './steps/StepPortalImport';
import { StepPasteLinks } from './steps/StepPasteLinks';
import { TARGET_FIELDS } from './lib/importTypes';
import type { ImportWizardState } from './lib/importTypes';
import { destinosDe } from './lib/columnaCompuesta';
import { ponerTitulosATodas } from './lib/ponerTitulos';
import { analyzeProperties, mapRowsToProperties } from './lib/gapFiller';
import { recalcularEstado } from './lib/requisitosDelBack';
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir';
import { etapaDeLaCarga, type PasoVisible } from './lib/describirCargaAbierta';
import { CargasAMedias } from './CargasAMedias';
import { useCargasAbiertasDeInmuebles } from '@/lib/hooks/use-cargas-abiertas-de-inmuebles';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

/*
 * T-0131 — lo que la persona ve: SIEMPRE cuatro pasos. Los tres primeros
 * pasos internos (elegir cómo, subir el archivo, mapear columnas) son «Subir y
 * mapear columnas»; los otros tres los gobierna el estado del lote en el
 * servidor (`fase`): ubicar direcciones, revisar lo que falta y «Crear todas».
 */
const PASOS_VISIBLES: { id: PasoVisible; label: string; icon: typeof UploadSimple }[] = [
  { id: 1, label: 'Subir y mapear columnas', icon: UploadSimple },
  { id: 2, label: 'Ubicar direcciones', icon: MapPin },
  { id: 3, label: 'Revisar lo que falta', icon: ListChecks },
  { id: 4, label: 'Crear todas', icon: CheckCircle },
];

/*
 * Las pantallas internas del asistente. La revisión «con IA» (que sólo
 * esperaba 2 s inventadas y dejaba aceptar sugerencias a mano) ya no existe: el
 * análisis local corre al salir del mapeo, sin espera (`prepararFilas`).
 * `id` 5 es el último: sube, ubica, revisa y crea (`StepConfirmImport`).
 */
const STEPS = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }];


const INITIAL_STATE: ImportWizardState = {
  method: null,
  file: null,
  fileName: '',
  enlacesPegados: '',
  rawRows: [],
  headers: [],
  sheetNames: [],
  selectedSheet: '',
  columnMappings: [],
  properties: [],
  aiAnalyzed: false,
  importProgress: 0,
  importedCount: 0,
  loteRetomado: null,
  subidaRetomada: null,
};

export interface ImportStepProps {
  state: ImportWizardState;
  updateState: (partial: Partial<ImportWizardState>) => void;
  /** Adentro del muro de migración: qué hacer en vez de navegar al portafolio. */
  onSalir?: () => void;
  /**
   * Adentro del muro: pasar al paso de Contratos.
   *
   * 🔴 Nico, 2026-09-11, con el lote entero activado en pantalla: «no hay nada
   * de cómo continuar, cómo pasar de ahí a contratos, no se muestra un cta».
   * El asistente terminaba su trabajo y no tenía forma de decirlo hacia
   * afuera: el único callback del muro era `onSalir`, que reinicia. Sin esto,
   * la única salida era el pie del muro — que no ofrece nada mientras el paso
   * siga «pendiente» por filas de OTRAS cargas.
   */
  onContinuar?: () => void;
  /**
   * Aviso hacia el muro: `true` mientras corre una operación larga
   * (geocodificar, preparar, activar). Sin esto, el pie del muro ofrecía
   * «Seguir con Contratos» con el «Activando…» todavía girando.
   */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
  /**
   * El último paso avisa en cuál de los 4 pasos visibles va el lote (sale de su
   * `fase`): el indicador del asistente lo dibuja.
   */
  onPasoVisible?: (paso: PasoVisible) => void;
}

/**
 * Dónde va la acción principal del último paso: al pie, a la derecha de
 * «Anterior», que es donde estuvo el botón primario en todos los pasos
 * anteriores. `null` mientras el pie no está montado — el paso entonces
 * dibuja su botón donde caiga, para no quedarse sin acción.
 */
export const RanuraDelPie = createContext<HTMLElement | null>(null);

/**
 * Una SEGUNDA ranura, a la IZQUIERDA de la navegación, para una acción que
 * acompaña a «Siguiente» sin competir con ella.
 *
 * Existe por el título (Nico, 2026-09-10): quien sube 2.864 inmuebles no los
 * va a nombrar uno por uno, y el botón para ponerles título a todas tiene que
 * estar donde está mirando — «al lado del de siguiente y arriba también»—, no
 * escondido en el cuerpo del paso.
 *
 * A diferencia de `RanuraDelPie`, ésta vive en TODOS los pasos: el paso decide
 * si la usa.
 */
export const RanuraDelPieSecundaria = createContext<HTMLElement | null>(null);

/**
 * `onSalir`: adentro del muro de migración no hay portafolio al que volver —
 * el muro tapa todo hasta que la migración termine. El muro pasa un callback
 * que reinicia el asistente; sin él (la ruta suelta) se navega como siempre.
 */
export function ImportWizard({
  onSalir,
  onContinuar,
  onOcupado,
  congelado = false,
}: {
  onSalir?: () => void;
  onContinuar?: () => void;
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
  /**
   * El muro dice que hay una operación larga en vuelo y que hay que congelar.
   *
   * Lo aplica el asistente y NO el muro porque el `inert` tiene que dejar
   * afuera la barra de progreso, y sólo acá se sabe dónde está esa barra
   * dentro de la tarjeta. Ver el `inert` de abajo.
   */
  congelado?: boolean;
} = {}) {
  const router = useRouter();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  // ¿Se avanzó o se volvió? Lo lee el render en que `currentStep` cambió
  // (la ref todavía tiene el paso anterior) y se actualiza después.
  const pasoAnterior = useRef(currentStep);
  const direccionDelPaso = currentStep >= pasoAnterior.current ? 'forward' : 'backward';
  useEffect(() => {
    pasoAnterior.current = currentStep;
  }, [currentStep]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [ranuraDelPie, setRanuraDelPie] = useState<HTMLDivElement | null>(null);
  const [ranuraSecundaria, setRanuraSecundaria] =
    useState<HTMLDivElement | null>(null);
  /*
   * El nodo VIVO de la tarjeta: adentro, encima del pie, y fuera del `inert`.
   * Estado y no ref porque el paso sólo puede portalizar cuando ya existe.
   */
  const [ranuraViva, setRanuraViva] = useState<HTMLDivElement | null>(null);
  const [wizardState, setWizardState] = useState<ImportWizardState>(INITIAL_STATE);

  const updateState = useCallback((partial: Partial<ImportWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...partial }));
  }, []);

  /*
   * T-0125 · aviso nativo antes de cerrar la pestaña. T-0130 lo acota: sólo lo
   * que vive ÚNICAMENTE en el navegador. Un archivo leído que todavía no se
   * subió (`loteRetomado` se escribe con la primera tanda: desde ahí el lote vive
   * en el servidor y se retoma) — y, mientras corre, la subida por tandas y la
   * búsqueda de direcciones, de las que se ocupa `StepConfirmImport` (lo suyo es
   * reanudable: crear los inmuebles ya no pide quedarse). El asistente sólo le
   * sigue pasando al muro el «ocupado» tal cual.
   */
  const avisarOcupado = useCallback(
    (ocupado: boolean, cancelar?: () => void) => {
      onOcupado?.(ocupado, cancelar);
    },
    [onOcupado],
  );
  useAvisoAlSalir(wizardState.rawRows.length > 0 && !wizardState.loteRetomado);

  /*
   * La tarjeta de «tienes una carga a medias» — en CUALQUIER paso, con o sin
   * archivo leído (T-0130). El lote vive en el servidor desde la primera tanda:
   * una recarga o un corte no pierde nada, pero sin esta tarjeta la persona no
   * tenía cómo VOLVER a él — re-subía el archivo y duplicaba el lote. Se vuelve
   * a leer en cada cambio de paso. No poder listarlas jamás frena empezar de
   * cero: el hook calla el error.
   */
  const { lotes: cargasAbiertas, recargar: recargarCargas, quitar: quitarCarga } =
    useCargasAbiertasDeInmuebles(currentStep);

  // Cambiar de método vuelve al paso 1 — salvo cuando el cambio ES el atajo.
  //
  // Los dos pasos guiados —«Desde software» y «Desde portales»— terminan en
  // «ya tengo el archivo», que pone method='excel'. Eso no es cambiar de idea
  // sobre el método: es decir «saltemos las instrucciones». Mandarlo al paso 1
  // lo devuelve al principio, que es justo lo que esos botones prometen evitar.
  const prevMethodRef = useRef(wizardState.method);
  useEffect(() => {
    if (prevMethodRef.current !== wizardState.method && wizardState.method !== null) {
      const veniaDeUnaGuia =
        prevMethodRef.current === 'software' || prevMethodRef.current === 'portal';
      // Los dos destinos posibles de un atajo tienen pantalla propia en el
      // paso 2: subir el archivo, o pegar los enlaces. Antes sólo contemplaba
      // `excel`, así que «pegar enlaces» desde la guía de portales devolvía al
      // paso 1 — justo lo que el botón promete evitar.
      const elAtajoTienePantalla =
        wizardState.method === 'excel' || wizardState.method === 'enlaces';
      prevMethodRef.current = wizardState.method;
      setCurrentStep(veniaDeUnaGuia && elAtajoTienePantalla ? 2 : 1);
    }
  }, [wizardState.method]);

  // Visible steps based on method
  //
  // ⚠️ `currentStep` es la POSICIÓN dentro de esta lista, no el id del paso.
  // Mientras los métodos usaban 1-2-3-4-5 o 1-2 las dos cosas coincidían y no
  // se notaba; «Desde enlaces» usa los pasos 1-2-4-5 (no hay columnas que
  // mapear) y ahí la posición 3 es el paso 4. Todo lo que decide QUÉ se dibuja
  // pasa por `pasoActual`; lo que decide DÓNDE estamos usa la posición.
  const visibleSteps = useMemo(() => {
    if (wizardState.method === 'portal') return STEPS.slice(0, 2);
    // «Desde enlaces» no tiene columnas que mapear: método, enlaces, y el último.
    if (wizardState.method === 'enlaces') return [STEPS[0], STEPS[1], STEPS[3]];
    return STEPS;
  }, [wizardState.method]);

  /* En cuál de los 4 pasos visibles va el lote, mientras el último paso lo gobierna. */
  const [pasoVisibleDelLote, setPasoVisibleDelLote] = useState<PasoVisible>(1);

  const pasoActual = visibleSteps[currentStep - 1]?.id ?? 1;

  const retomarLote = useCallback(
    (l: EstadoDeLoteInmuebles) => {
      const etapa = etapaDeLaCarga(l);
      const aEnviar = wizardState.properties.filter((p) => p.hasErrors || p.selected).length;
      if (etapa === 'subiendo') {
        /*
         * Seguir SUBIENDO necesita las filas: el servidor guarda lo que llegó,
         * no el archivo. Con el mismo archivo ya leído (misma cuenta de filas)
         * se va derecho al último paso, que retoma desde `siguienteDesde`; si
         * no, se pide el archivo y se retoma cuando llegue al último paso.
         */
        const subida = { lote: l.lote, total: l.total, recibidas: l.recibidas ?? 0 };
        const filasListas = aEnviar === l.total && wizardState.aiAnalyzed;
        updateState({ subidaRetomada: subida, loteRetomado: l.lote });
        setCurrentStep(filasListas ? visibleSteps.length : wizardState.method === null ? 1 : 2);
        return;
      }
      // Ubicando o ya en revisión: el lote entero está en el servidor.
      // El portal de enlaces sólo tiene 2 pasos: sin método no hay último paso.
      updateState({
        loteRetomado: l.lote,
        subidaRetomada: null,
        ...(wizardState.method === 'portal' ? { method: null } : {}),
      });
      setCurrentStep(wizardState.method === 'portal' ? STEPS.length : visibleSteps.length);
    },
    [updateState, wizardState.properties, wizardState.aiAnalyzed, wizardState.method, visibleSteps.length],
  );

  const alDescartarCarga = useCallback(
    (lote: string) => {
      quitarCarga(lote);
      if (wizardState.loteRetomado === lote || wizardState.subidaRetomada?.lote === lote) {
        updateState({
          loteRetomado: wizardState.loteRetomado === lote ? null : wizardState.loteRetomado,
          subidaRetomada: wizardState.subidaRetomada?.lote === lote ? null : wizardState.subidaRetomada,
        });
      }
    },
    [quitarCarga, updateState, wizardState.loteRetomado, wizardState.subidaRetomada],
  );

  // La carga que el último paso ya está mostrando no se repite en la tarjeta.
  const cargasParaOfrecer = cargasAbiertas.filter(
    (l) => !(currentStep === visibleSteps.length && l.lote === wizardState.loteRetomado),
  );

  // Step validation
  const isStepValid = useMemo(() => {
    switch (pasoActual) {
      case 1:
        return wizardState.method !== null;
      case 2:
        // Software and portal steps are always "valid" for navigation purposes
        if (wizardState.method === 'software') return true;
        if (wizardState.method === 'portal') return true;
        // Los enlaces no dejan filas: lo que habilita seguir es que al menos
        // un enlace se haya podido leer.
        if (wizardState.method === 'enlaces') return wizardState.properties.length > 0;
        return wizardState.rawRows.length > 0;
      case 3: {
        // All required TARGET_FIELDS must be mapped.
        //
        // T-0038 §3.8/C13 — `monthlyRent` stays `required: true` in
        // TARGET_FIELDS (the overwhelming common case is a rent-only file,
        // and catching a forgotten "Canon" column here beats catching it
        // per-row at the final submit). But a SALE-only file has no canon
        // column at all — its price is `salePrice`. Treating the two as
        // alternatives (at least one mapped) is what makes a sale-only
        // import possible; every other required field stays mandatory.
        const mappings = wizardState.columnMappings;
        // Una columna partida en dos cuenta por sus dos partes.
        const isMapped = (key: string) => mappings.some((m) => destinosDe(m).includes(key));
        const requiredKeys = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
        // T-0129 — sin columna de precio las filas entran con el canon por confirmar.
        return (
          requiredKeys.every(isMapped)
        );
      }
      case 5:
        // Always valid — step manages its own submit
        return true;
      default:
        return false;
    }
  }, [pasoActual, wizardState]);

  /*
   * Lo que antes hacía el paso «Revisión AI» al montarse, sin la espera de 2 s
   * inventada: pasar las filas del archivo a inmuebles y correr la validación
   * local (huecos, tipo, canon…). Al salir del mapeo; recalcularla cada vez que
   * se vuelve a salir es lo que hace que un mapeo corregido llegue al lote.
   *
   * Los títulos se ponen solos: es obligatorio, es lo primero que se ve en el
   * marketplace y ninguna inmobiliaria lo guarda en su sistema (Nico,
   * 2026-09-10/11). Se pueden cambiar después en bloque o en cada inmueble.
   * Lo que antes eran «sugerencias» por aceptar a mano ya no existe: un canon
   * que falta entra con el canon por confirmar (T-0129), no inventado.
   */
  const prepararFilas = useCallback(() => {
    const mapeadas = mapRowsToProperties(wizardState.rawRows, wizardState.columnMappings);
    const analizadas = analyzeProperties(mapeadas).map(recalcularEstado);
    updateState({ properties: ponerTitulosATodas(analizadas), aiAnalyzed: true });
  }, [wizardState.rawRows, wizardState.columnMappings, updateState]);

  // Navigation handlers
  const avanzar = useCallback(() => {
    if (currentStep < visibleSteps.length && isStepValid) {
      if (pasoActual === 3) prepararFilas();
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid, visibleSteps.length, pasoActual, prepararFilas]);

  const goToNextStep = avanzar;

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    if (onSalir) {
      setShowCancelDialog(false);
      onSalir();
      return;
    }
    router.push('/panel/inmobiliaria/inmuebles');
  }, [router, onSalir]);

  /*
   * El paso visible (de 4). Mientras la persona está en las pantallas de armar
   * el archivo es SIEMPRE el 1; en el último, lo dice el lote (`fase`).
   */
  const enElUltimo = pasoActual === 5;
  const pasoMacro: PasoVisible = enElUltimo ? pasoVisibleDelLote : 1;
  const estadoDelPaso = (id: PasoVisible) =>
    id < pasoMacro ? 'completed' : id === pasoMacro ? 'current' : 'upcoming';

  // Render step content
  const renderStepContent = () => {
    const stepProps: ImportStepProps = {
      state: wizardState,
      updateState,
      onSalir,
      onContinuar,
      onOcupado: avisarOcupado,
      onPasoVisible: setPasoVisibleDelLote,
    };

    switch (pasoActual) {
      case 1:
        return <StepChooseMethod {...stepProps} />;
      case 2:
        if (wizardState.method === 'software') return <StepSoftwareMigration {...stepProps} />;
        if (wizardState.method === 'portal') return <StepPortalImport {...stepProps} />;
        if (wizardState.method === 'enlaces') return <StepPasteLinks {...stepProps} />;
        return <StepUploadFile {...stepProps} />;
      case 3:
        return <StepColumnMapping {...stepProps} />;
      case 5:
        return <StepConfirmImport {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <CargasAMedias
        lotes={cargasParaOfrecer}
        onRetomar={retomarLote}
        onDescartada={alDescartarCarga}
        onCambio={recargarCargas}
      />

      {/*
       * T-0130 — se retoma una subida cortada: el servidor guardó lo que llegó,
       * pero no el archivo. Hay que volver a elegirlo y pasarlo por los pasos
       * (las filas se arman igual); el último paso sigue desde donde quedó.
       */}
      {wizardState.subidaRetomada && currentStep < visibleSteps.length ? (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted p-4"
          data-testid="subida-retomada"
        >
          <p className="min-w-0 text-sm text-fg">
            Seguimos la carga que dejaste a medias: llegaron{' '}
            <span className="font-mono tabular-nums">
              {wizardState.subidaRetomada.recibidas.toLocaleString('es-CO')}
            </span>{' '}
            de{' '}
            <span className="font-mono tabular-nums">
              {wizardState.subidaRetomada.total.toLocaleString('es-CO')}
            </span>{' '}
            filas. Selecciona el MISMO archivo y avanza hasta el último paso: retomamos desde
            donde quedó.
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            hideArrow
            onClick={() => updateState({ subidaRetomada: null })}
          >
            Dejar esta carga para después
          </Button>
        </div>
      ) : null}

      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps — sólo informan: el lote avanza solo, no se navega por acá. */}
        <ol className="hidden md:flex items-center justify-between" aria-label="Pasos de la importación">
          {PASOS_VISIBLES.map((paso, index) => {
            const status = estadoDelPaso(paso.id);
            const StepIcon = paso.icon;

            return (
              <li
                key={paso.id}
                className="flex items-center flex-1"
                aria-current={status === 'current' ? 'step' : undefined}
                data-testid={`paso-visible-${paso.id}`}
                data-estado={status}
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-[color,background-color,box-shadow]',
                    status === 'completed'
                      ? 'bg-success text-white'
                      : status === 'current'
                        ? 'bg-primary text-primary-fg ring-4 ring-primary/30'
                        // Sin `dark:bg-ink`: ese override daba rgb(20,19,15) sobre
                        // un fondo de página rgb(17,17,19) — el círculo desaparecía.
                        // `bg-surface-muted` ya es sensible al tema y da
                        // rgb(36,34,28), más separado del fondo que en claro.
                        : 'bg-surface-muted text-fg-subtle'
                  )}>
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    status === 'current'
                      ? 'text-primary'
                      : status === 'completed'
                        ? 'text-fg dark:text-white'
                        : 'text-fg-subtle'
                  )}>
                    {paso.label}
                  </span>
                </div>

                {/* Connector Line — es un divisor de 2px, así que necesita más
                    contraste que una superficie grande: va con `bg-border`. */}
                {index < PASOS_VISIBLES.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    paso.id < pasoMacro
                      ? 'bg-success'
                      : 'bg-border'
                  )} />
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-fg dark:text-white">
              {t('inmobiliaria.import.wizard.mobileProgress', {
                current: pasoMacro,
                total: PASOS_VISIBLES.length,
                label: PASOS_VISIBLES[pasoMacro - 1].label,
              })}
            </span>
            <span className="text-sm text-fg-muted">{Math.round((pasoMacro / PASOS_VISIBLES.length) * 100)}%</span>
          </div>
          {/* Misma razón que los círculos: el riel se perdía contra el fondo. */}
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            {/* Avanza con `translateX` (sólo transform), no con el ancho. */}
            <motion.div
              className="h-full w-full bg-primary"
              initial={false}
              animate={{ x: `${(pasoMacro / PASOS_VISIBLES.length) * 100 - 100}%` }}
              transition={{ duration: motionDuration.slow, ease: motionEase.standard }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface dark:bg-bg rounded-lg border border-border dark:border-border-strong">
        <RanuraVivaContext.Provider value={ranuraViva}>
          <div className="p-6 space-y-6">
            {/*
             * 🔴 El `inert` va ACÁ, no en el muro.
             *
             * El muro lo ponía sobre TODO el paso, y como `inert` no se puede
             * desactivar en un descendiente, la barra de progreso de la
             * geocodificación se quedaba sin botón para parar —53 minutos sobre
             * 2.864 inmuebles—. La primera salida fue mandar el botón al pie
             * del muro; la segunda, sacar la barra entera a un nodo de afuera.
             * Las dos funcionaban y las dos se veían mal: el control lejos de
             * lo que controla, o la barra flotando fuera de la tarjeta (Nico,
             * 2026-09-10: «ahí afuera se ve horrible»).
             *
             * Acá adentro el asistente conoce su propia tarjeta, así que puede
             * congelar el cuerpo del paso y dejar viva —EN SU SITIO, encima del
             * pie— la ranura de abajo.
             */}
            <div
              data-testid="paso-congelado"
              inert={congelado}
              className={congelado ? "cursor-progress" : undefined}
            >
              {/* El paso nuevo entra por la derecha al avanzar y por la
                  izquierda al volver (`CrossFade` con dirección). */}
              <CrossFade swapKey={currentStep} direction={direccionDelPaso}>
                  <RanuraDelPieSecundaria.Provider value={ranuraSecundaria}>
                  <RanuraDelPie.Provider value={ranuraDelPie}>
                    {renderStepContent()}
                  </RanuraDelPie.Provider>
                  </RanuraDelPieSecundaria.Provider>
              </CrossFade>
            </div>

            {/*
             * La ranura viva: dentro de la tarjeta, encima del pie, y FUERA del
             * `inert` de arriba. Acá el paso portaliza lo que tiene que seguir
             * funcionando mientras todo lo demás está congelado — hoy, la barra
             * de la geocodificación con su botón de parar.
             */}
            <div ref={setRanuraViva} data-testid="ranura-viva" />
          </div>
        </RanuraVivaContext.Provider>

        {/* Footer Navigation — hidden when import is complete, y en el paso 4:
            «Crear todas» y el avance tienen sus propios botones dentro. */}
        {!(pasoActual === 5 && (wizardState.importedCount > 0 || pasoVisibleDelLote === 4)) && (
          // El pie tiene fondo propio, así que necesita el MISMO radio abajo
          // que la tarjeta (`rounded-lg`, línea 460). Estuvo en `rounded-b-xl`
          // —más redondo que la tarjeta— y en las dos esquinas de abajo asomaba
          // el fondo: dos medias lunas blancas. Si el radio de la tarjeta
          // cambia, éste cambia con ella.
          // A 390 px los tres botones no caben en fila con `px-6`: el pie
          // empujaba la página a 458 px (QA-MIG-A, MG-29). Se envuelve.
          <div className="px-4 py-4 sm:px-6 rounded-b-lg border-t border-border-faint dark:border-border-strong bg-surface-muted dark:bg-bg flex flex-wrap items-center justify-between gap-2" data-testid="pie-del-asistente">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="ghost"
              hideArrow
              onClick={handleCancel}
            >
              {t('inmobiliaria.import.wizard.cancel')}
            </Button>

            {/* Navigation Buttons */}
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              {/* Acción que acompaña a «Siguiente» — la llena el paso. */}
              <div ref={setRanuraSecundaria} className="flex items-center" />
              {/* Con el lote ya en el servidor pasada la subida, «Anterior» no
                  tiene a dónde volver: lo que sigue lo gobierna el lote. */}
              {currentStep > 1 && !(pasoActual === 5 && pasoVisibleDelLote > 1) && (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={goToPreviousStep}
                  className="gap-2"
                >
                  <CaretLeft className="w-4 h-4" />
                  {t('inmobiliaria.import.wizard.previous')}
                </Button>
              )}

              {/* Portal terminal step: show "Volver al portafolio" instead of "Siguiente" */}
              {wizardState.method === 'portal' && pasoActual === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.import.portal.backToPortfolio')}
                </Button>
              ) : currentStep < visibleSteps.length ? (
                <Button
                  type="button"
                  hideArrow
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className="gap-2"
                  data-testid="wizard-siguiente"
                >
                  {t('inmobiliaria.import.wizard.next')}
                  <CaretRight className="w-4 h-4" />
                </Button>
              ) : (
                // Ranura del último paso. El botón principal vivió al pie,
                // a la derecha de «Anterior», en los cuatro pasos anteriores;
                // en el último se caía adentro de la tarjeta y quedaba raro.
                // El paso pone su acción acá por portal.
                <div ref={setRanuraDelPie} className="flex items-center" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog — lo que se pierde depende de si el lote
          ya vive en el servidor (`loteRetomado` se escribe con la primera
          tanda): desde ahí lo subido queda y se retoma desde «Tienes una carga
          a medias»; antes, lo único que hay está en esta pantalla. */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent variant="destructive" icon={<X weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('inmobiliaria.import.wizard.cancelDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {wizardState.loteRetomado
                ? t('inmobiliaria.import.wizard.cancelDialog.descriptionLoteGuardado')
                : t('inmobiliaria.import.wizard.cancelDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('inmobiliaria.import.wizard.cancelDialog.continueEditing')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              {t('inmobiliaria.import.wizard.cancelDialog.yesCancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ImportWizard;
