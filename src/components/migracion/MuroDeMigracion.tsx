'use client';

/**
 * El muro de migración — la puesta en marcha, dentro del panel.
 *
 * ── Por qué un muro y no una pantalla más ──────────────────────────────────
 *
 * `/panel/inmobiliaria/migracion` era una lista de cinco tarjetas con cinco
 * botones «Empezar», todos habilitados, en una ruta del menú entre otras
 * quince. Se podía mirar y seguir de largo — y eso es exactamente lo que
 * pasa: la inmobiliaria entra al panel, ve un producto vacío, no entiende
 * por qué, y se va. Migrar no es una utilidad del menú: es la condición para
 * que el producto signifique algo.
 *
 * ── Por qué el panel se ve, borroso, detrás ────────────────────────────────
 *
 * El mensaje no es «no existe nada»: es «esto te está esperando». Por eso el
 * contenido no se desmonta ni se reemplaza por una página en blanco. Se
 * desenfoca. Se parece al onboarding de creación de cuenta —la misma barra
 * de pasos numerada— pero ya adentro, con lo que se compró a la vista.
 *
 * ── Lo que el muro NO hace ────────────────────────────────────────────────
 *
 * **No encierra a nadie.** Tiene dos salidas y las dos son de verdad: «ya
 * terminé» cuando todo está listo, y «arranco de cero» siempre, con
 * confirmación. 🔴 Sin la segunda, una inmobiliaria nueva —que no tiene nada
 * que migrar— no puede salir nunca.
 *
 * **No tapa los pasos.** Las pantallas a las que el propio muro manda están
 * exentas (`RUTAS_EXENTAS_DEL_MURO`). Taparlas dejaría a la persona mirando
 * el muro que la mandó ahí.
 *
 * **No bloquea ante la duda.** Si el estado no llegó, tardó, falló o vino con
 * otra forma, el panel se ve normal. Está en `normalizarEstado()`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Lock, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  migracionEstadoApi,
  type EstadoDeMigracion,
  type PasoDeMigracion,
} from '@/lib/api/migracion-estado.service';
import {
  RUTA_DEL_PASO,
  esExigible,
  estaExentaDelMuro,
  normalizarEstado,
  pasoActual,
  pasoHabilitado,
  pasoQueFrena,
  todoListo,
} from './muro-reglas';

// ══════════════════════════════════════════════════════════════════════════
// La compuerta: envuelve el panel entero y decide.
// ══════════════════════════════════════════════════════════════════════════

export function MuroDeMigracion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [estado, setEstado] = useState<EstadoDeMigracion | null>(null);

  const consultar = useCallback(async () => {
    try {
      const bruto = await migracionEstadoApi.estado();
      // Ojo: `normalizarEstado` devuelve null ante CUALQUIER duda. Ese null
      // es «panel abierto», no «error» — no hay cartel que mostrar.
      setEstado(normalizarEstado(bruto));
    } catch {
      setEstado(null);
    }
  }, []);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  const puesto = estado !== null && !estaExentaDelMuro(pathname);

  /*
   * `inert` como atributo crudo: React 18 no lo tipa como prop booleana (sí
   * lo hace React 19), y pasarlo como booleano imprime `inert="false"`, que
   * el navegador lee como PRESENTE. Un string vacío es la forma correcta, y
   * sólo cuando el muro está puesto.
   *
   * Es lo que vuelve inerte al sidebar y a toda la navegación: sin esto, la
   * persona se pasea por el panel con el muro dibujado encima.
   */
  const inerte = puesto ? ({ inert: '' } as unknown as Record<string, string>) : {};

  return (
    <>
      <div
        {...inerte}
        aria-hidden={puesto || undefined}
        data-testid="panel-detras-del-muro"
        className={cn(
          puesto && 'min-h-screen select-none blur-[3px] saturate-[0.6] pointer-events-none',
        )}
      >
        {children}
      </div>
      {puesto ? <PanelDeMigracion estado={estado} onResuelta={consultar} /> : null}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// El muro en sí.
// ══════════════════════════════════════════════════════════════════════════

export function PanelDeMigracion({
  estado,
  onResuelta,
}: {
  estado: EstadoDeMigracion;
  onResuelta: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const caja = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const pasos = estado.pasos;
  const actual = pasoActual(pasos);
  const listo = todoListo(pasos);

  /*
   * Trampa de foco. No es un modal con «cerrar»: es un muro, así que Escape
   * no hace nada y el Tab da la vuelta adentro. Sin esto, tabular te lleva al
   * sidebar borroso —invisible pero enfocable— y la persona termina navegando
   * a ciegas por un panel que no puede ver.
   */
  useEffect(() => {
    const nodo = caja.current;
    if (!nodo) return;

    const enfocables = () =>
      Array.from(
        nodo.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    nodo.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Silencioso a propósito: no hay nada que cerrar.
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = enfocables();
      if (lista.length === 0) {
        e.preventDefault();
        nodo.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      if (!nodo.contains(activo)) {
        e.preventDefault();
        primero.focus();
        return;
      }
      if (e.shiftKey && activo === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear, true);
    return () => document.removeEventListener('keydown', alTeclear, true);
  }, []);

  // El fondo no scrollea: si scrollea, el muro flota sobre un panel que se
  // mueve y deja de leerse como una barrera.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  async function resolver(via: 'terminar' | 'omitir') {
    setEnviando(true);
    setFallo(false);
    try {
      if (via === 'terminar') await migracionEstadoApi.terminar();
      else await migracionEstadoApi.omitir();
      await onResuelta();
      // Si el back todavía dice que bloquea, el muro sigue puesto y los
      // botones tienen que volver a funcionar.
      setEnviando(false);
    } catch {
      // El muro se queda puesto y lo dice. Fingir que salió y volver a
      // levantarlo en la siguiente carga es peor que no salir.
      //
      // Se vuelve a la lista de pasos a propósito: el aviso vive ahí, y
      // dejar la confirmación abierta con un error invisible detrás es la
      // forma de que la persona apriete «sí» tres veces sin entender nada.
      setConfirmando(false);
      setFallo(true);
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-plan-page/70 p-4 backdrop-blur-[2px] sm:p-8"
      data-testid="muro-migracion"
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="muro-migracion-titulo"
        className="my-auto w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-xl outline-none sm:p-8"
      >
        <BarraDePasos pasos={pasos} actual={actual} />

        <div className="mt-6 space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
            {t('migracion.muro.eyebrow')}
          </p>
          <h1 id="muro-migracion-titulo" className="text-2xl font-semibold text-fg">
            {t('migracion.muro.titulo')}
          </h1>
          <p className="max-w-2xl text-sm text-fg-muted">{t('migracion.muro.subtitulo')}</p>
        </div>

        {confirmando ? (
          <ConfirmarArranqueDeCero
            enviando={enviando}
            onCancelar={() => setConfirmando(false)}
            onAceptar={() => resolver('omitir')}
          />
        ) : (
          <>
            <ol className="mt-6 space-y-2" data-testid="muro-pasos">
              {pasos.map((paso, i) => (
                <li key={paso.id}>
                  <FilaDePaso
                    paso={paso}
                    numero={i + 1}
                    habilitado={pasoHabilitado(pasos, i)}
                    esActual={i === actual}
                    anterior={pasoQueFrena(pasos, i)}
                  />
                </li>
              ))}
            </ol>

            {fallo ? (
              <p
                className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3 text-sm text-danger"
                data-testid="muro-fallo"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                {t('migracion.muro.fallo')}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-faint pt-5">
              {/*
               * 🔴 La salida de la inmobiliaria nueva. Está SIEMPRE, aunque no
               * haya un solo paso listo: quien arranca de cero no tiene nada
               * que migrar y sin esto no sale nunca. Discreta, no escondida.
               */}
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={enviando}
                data-testid="muro-arrancar-de-cero"
                className="text-sm text-fg-muted underline underline-offset-4 hover:text-fg disabled:opacity-50"
              >
                {t('migracion.muro.arrancarDeCero')}
              </button>

              {listo ? (
                <Button
                  onClick={() => resolver('terminar')}
                  disabled={enviando}
                  data-testid="muro-ya-termine"
                  hideArrow
                >
                  {t('migracion.muro.yaTermine')}
                </Button>
              ) : (
                <p className="text-sm text-fg-subtle" data-testid="muro-falta">
                  {t('migracion.muro.faltaTerminar')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Piezas
// ══════════════════════════════════════════════════════════════════════════

/**
 * La barra numerada del onboarding de creación de cuenta
 * (`OnboardingWizardStepper`), con el mismo lenguaje visual: círculo, número,
 * check al terminar, conector. Cambia una sola cosa — un paso puede estar
 * `no_disponible`, y ese se dibuja apagado y con candado en vez de número.
 */
function BarraDePasos({ pasos, actual }: { pasos: PasoDeMigracion[]; actual: number }) {
  const { t } = useI18n();

  return (
    <ol
      aria-label={t('migracion.muro.progreso')}
      className="flex items-center gap-1.5 sm:gap-2"
      data-testid="muro-barra"
    >
      {pasos.map((paso, idx, arr) => {
        const hecho = paso.estado === 'listo';
        const esActual = idx === actual && !hecho;
        const apagado = !esExigible(paso);

        return (
          <li key={paso.id} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <div
                data-testid={`muro-barra-${paso.id}`}
                data-estado={paso.estado}
                aria-current={esActual ? 'step' : undefined}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums transition-colors',
                  hecho
                    ? 'border-2 border-primary bg-primary text-primary-fg'
                    : esActual
                      ? 'border-2 border-primary bg-surface text-primary'
                      : 'border border-border bg-surface text-fg-subtle',
                  apagado && 'border-border-faint text-fg-subtle',
                )}
              >
                {hecho ? (
                  <Check className="h-3.5 w-3.5" weight="bold" />
                ) : apagado ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium md:inline',
                  esActual ? 'text-primary' : hecho ? 'text-fg' : 'text-fg-subtle',
                )}
              >
                {t(`migracion.pasos.${paso.id}.titulo`)}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div
                className={cn('h-0.5 w-3 transition-colors sm:w-6', hecho ? 'bg-primary' : 'bg-border')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FilaDePaso({
  paso,
  numero,
  habilitado,
  esActual,
  anterior,
}: {
  paso: PasoDeMigracion;
  numero: number;
  habilitado: boolean;
  esActual: boolean;
  /** El paso exigible sin terminar que lo está frenando, si hay uno. */
  anterior: PasoDeMigracion | null;
}) {
  const { t } = useI18n();
  const hecho = paso.estado === 'listo';
  const disponible = esExigible(paso);
  const href = RUTA_DEL_PASO[paso.id];

  return (
    <div
      data-testid={`muro-paso-${paso.id}`}
      data-habilitado={habilitado}
      data-estado={paso.estado}
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 transition-colors',
        esActual
          ? 'border-primary bg-primary-soft/40'
          : hecho
            ? 'border-border bg-surface'
            : 'border-border-faint bg-surface',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs tabular-nums',
            hecho
              ? 'bg-primary text-primary-fg'
              : habilitado
                ? 'bg-primary-soft text-primary'
                : 'bg-surface-muted text-fg-subtle',
          )}
        >
          {hecho ? <Check className="h-3.5 w-3.5" weight="bold" /> : numero}
        </span>
        <div className="min-w-0 space-y-1">
          <p className={cn('font-medium', disponible ? 'text-fg' : 'text-fg-muted')}>
            {t(`migracion.pasos.${paso.id}.titulo`)}
          </p>
          {/* El detalle lo arma el back («12 propietarios · 30 inquilinos»).
              Cuando no hay, no se inventa un cero. */}
          {paso.detalle ? (
            <p className={cn('text-sm', hecho ? 'text-success' : 'text-fg-muted')}>
              {paso.detalle}
            </p>
          ) : null}
          {!disponible ? (
            <p className="text-sm text-fg-subtle">{t('migracion.muro.noDisponible')}</p>
          ) : !habilitado && anterior ? (
            /* El porqué, no sólo el candado: «Primero cargá los propietarios». */
            <p className="text-sm text-fg-subtle" data-testid={`muro-porque-${paso.id}`}>
              {t('migracion.muro.primero', {
                paso: t(`migracion.pasos.${anterior.id}.titulo`),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0">
        {hecho ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5" weight="bold" />
            {t('migracion.muro.hecho')}
          </span>
        ) : habilitado && href ? (
          <Button asChild size="sm" variant={esActual ? 'default' : 'outline'} hideArrow>
            <Link href={href} data-testid={`muro-ir-${paso.id}`}>
              {paso.conteo > 0 ? t('migracion.retomar') : t('migracion.empezar')}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          /* Sin botón muerto: un `<button disabled>` invita a clickearlo y no
             explica nada. El candado más la frase de arriba sí. */
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-fg-muted">
            <Lock className="h-3.5 w-3.5" />
            {disponible ? t('migracion.muro.enEspera') : t('migracion.estados.enConstruccion')}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * La confirmación de «arranco de cero».
 *
 * No es un «¿estás seguro?»: dice qué pasa después —vas a tener que cargar
 * todo a mano— porque esa es la consecuencia que la persona todavía no
 * conoce cuando aprieta el enlace.
 */
function ConfirmarArranqueDeCero({
  enviando,
  onCancelar,
  onAceptar,
}: {
  enviando: boolean;
  onCancelar: () => void;
  onAceptar: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className="mt-6 rounded-lg border border-border bg-warning-soft p-5"
      data-testid="muro-confirmar-cero"
    >
      <p className="font-medium text-fg">{t('migracion.muro.confirmar.titulo')}</p>
      <p className="mt-1.5 text-sm text-fg-muted">{t('migracion.muro.confirmar.detalle')}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={onAceptar}
          disabled={enviando}
          data-testid="muro-confirmar-si"
          hideArrow
        >
          {t('migracion.muro.confirmar.aceptar')}
        </Button>
        <Button
          variant="outline"
          onClick={onCancelar}
          disabled={enviando}
          data-testid="muro-confirmar-no"
          hideArrow
        >
          {t('migracion.muro.confirmar.cancelar')}
        </Button>
      </div>
    </div>
  );
}
