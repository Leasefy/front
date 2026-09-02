"use client";

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
 * ── 🔴 Todo pasa acá adentro ───────────────────────────────────────────────
 *
 * La primera versión del muro tenía un botón «Empezar» por paso que mandaba
 * a la pantalla del paso —y para que esa pantalla se viera, la declaraba
 * exenta del muro—. Era un agujero: un clic y la persona estaba en la
 * plataforma entera, con el sidebar y todo, sin haber migrado nada.
 *
 * Ahora el muro tapa TODAS las rutas del panel y el contenido completo de
 * cada paso —subir el archivo, bajar la plantilla, revisar, aplicar— vive
 * adentro del muro. Las pantallas sueltas de cada paso siguen existiendo
 * para después, cuando el muro ya bajó y la migración queda en el menú.
 *
 * ── Por qué el panel se ve, borroso, detrás ────────────────────────────────
 *
 * El mensaje no es «no existe nada»: es «esto te está esperando». Por eso el
 * contenido no se desmonta ni se reemplaza por una página en blanco. Se
 * desenfoca. Se parece al onboarding de creación de cuenta —la misma barra
 * de pasos numerada— pero ya adentro, con lo que se compró a la vista.
 *
 * ── Cómo está compuesto ───────────────────────────────────────────────────
 *
 * Un panel grande, casi toda la pantalla, en tres franjas:
 *
 *   1. Arriba, fija: eyebrow, título y la barra de pasos en columnas iguales.
 *      Es el mapa. Los pasos habilitados son botones: se cambia de paso sin
 *      salir de acá.
 *   2. El cuerpo, con scroll propio: el paso elegido, entero.
 *   3. Abajo, fija: las salidas — «seguir con el próximo», «entrar al panel»
 *      cuando todo está listo, y «arranco de cero» mientras falte algo.
 *
 * ── Cómo se entera de que un paso terminó ─────────────────────────────────
 *
 * Los componentes de paso ya existían y no avisan a nadie. El muro vuelve a
 * pedir el estado cada pocos segundos mientras está puesto (y al volver a
 * la pestaña). Ese refresco NUNCA mueve a la persona de paso ni baja el muro
 * por un fallo de red: sólo actualiza la barra y habilita «seguir».
 *
 * ── Lo que el muro NO hace ────────────────────────────────────────────────
 *
 * **No encierra a nadie.** Tiene dos salidas y las dos son de verdad: «entrar
 * al panel» cuando todo está listo, y «arranco de cero» siempre que falte
 * algo, con confirmación. 🔴 Sin la segunda, una inmobiliaria nueva —que no
 * tiene nada que migrar— no puede salir nunca.
 *
 * **No bloquea ante la duda.** Si el estado no llegó, tardó, falló o vino con
 * otra forma, el panel se ve normal. Está en `normalizarEstado()`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lock, Warning } from "@phosphor-icons/react";

import { ApiError } from "@/lib/api/client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useLenis } from "@/components/providers/SmoothScroll";
import {
  migracionEstadoApi,
  type EstadoDeMigracion,
  type IdDePasoDeMigracion,
  type PasoDeMigracion,
} from "@/lib/api/migracion-estado.service";
import {
  MODULO_DEL_PASO,
  esExigible,
  normalizarEstado,
  pasoActual,
  pasoHabilitado,
  pasoQueFrena,
  siguientePaso,
  todoListo,
} from "./muro-reglas";
import { MigrarTerceros } from "./MigrarTerceros";
import { PlanDeCuentas } from "./PlanDeCuentas";
import { RegistrosContables } from "./RegistrosContables";
import { ImportWizard } from "@/components/inmobiliaria/import/ImportWizard";
import { MigrarContratos } from "@/components/contratos/MigrarContratos";
import { BienvenidaALeasefy } from "./BienvenidaALeasefy";

/** Cada cuánto el muro vuelve a mirar el estado mientras está puesto. */
export const CADA_CUANTO_SE_REFRESCA_MS = 5_000;

// ══════════════════════════════════════════════════════════════════════════
// La compuerta: envuelve el panel entero y decide.
// ══════════════════════════════════════════════════════════════════════════

export function MuroDeMigracion({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoDeMigracion | null>(null);
  /*
   * El muro estaba puesto y dejó de estarlo EN ESTA SESIÓN: ése es el momento
   * que se celebra (`BienvenidaALeasefy`). Se detecta en `refrescar`, nunca en
   * la consulta inicial — quien entra con el panel ya abierto no está
   * terminando nada. El espejo en ref es para leer el estado anterior sin
   * meter un efecto secundario adentro del updater de React.
   */
  const estadoAnterior = useRef<EstadoDeMigracion | null>(null);
  estadoAnterior.current = estado;
  const [bienvenida, setBienvenida] = useState<{
    pasos: PasoDeMigracion[];
    resuelta: "completada" | "omitida";
  } | null>(null);

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

  /*
   * El refresco es distinto de la consulta inicial en una sola cosa: un
   * fallo de red NO baja el muro. Bajarlo a mitad de una carga de terceros
   * desmontaría el paso y se perdería el archivo que la persona estaba
   * revisando. Con una respuesta válida sí se obedece — incluida una que
   * diga `bloquea: false`, que es como el muro baja al terminar.
   */
  const refrescar = useCallback(async () => {
    try {
      const bruto = await migracionEstadoApi.estado();
      const nuevo = normalizarEstado(bruto);
      const previo = estadoAnterior.current;
      if (previo !== null && nuevo === null) {
        // Se levantó. Los conteos salen de la respuesta que LEVANTA el muro,
        // no del último estado bloqueado: ése es de antes de terminar el
        // último paso, y el paso recién terminado saldría con 0.
        const pasos = Array.isArray(bruto.pasos) ? bruto.pasos : previo.pasos;
        setBienvenida({
          pasos,
          resuelta: bruto.resuelta === "omitida" ? "omitida" : "completada",
        });
      }
      setEstado(nuevo);
    } catch {
      // Se queda como estaba.
    }
  }, []);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  const puesto = estado !== null;

  useEffect(() => {
    if (!puesto) return;
    const cadaTanto = setInterval(() => {
      if (document.visibilityState === "visible") void refrescar();
    }, CADA_CUANTO_SE_REFRESCA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") void refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(cadaTanto);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [puesto, refrescar]);

  /*
   * `inert` como atributo crudo: React 18 no lo tipa como prop booleana (sí
   * lo hace React 19), y pasarlo como booleano imprime `inert="false"`, que
   * el navegador lee como PRESENTE. Un string vacío es la forma correcta, y
   * sólo cuando el muro está puesto.
   *
   * Es lo que vuelve inerte al sidebar y a toda la navegación: sin esto, la
   * persona se pasea por el panel con el muro dibujado encima.
   */
  const tapado = puesto || bienvenida !== null;
  const inerte = tapado
    ? ({ inert: "" } as unknown as Record<string, string>)
    : {};

  return (
    <>
      <div
        {...inerte}
        aria-hidden={tapado || undefined}
        data-testid="panel-detras-del-muro"
        className={cn(
          tapado &&
            "min-h-screen select-none blur-[3px] saturate-[0.6] pointer-events-none",
        )}
      >
        {children}
      </div>
      {puesto ? (
        <PanelDeMigracion estado={estado} onResuelta={refrescar} />
      ) : null}
      {bienvenida ? (
        <BienvenidaALeasefy
          pasos={bienvenida.pasos}
          resuelta={bienvenida.resuelta}
          onEntrar={() => setBienvenida(null)}
        />
      ) : null}
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
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;
  const caja = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  /*
   * `true` mientras el paso en foco está CREANDO (fichas, contratos). El
   * refresco de 5 s puede marcar el paso «listo» apenas las primeras filas
   * existen; ofrecer «Seguir con…» con la creación corriendo confunde — el
   * pie espera a que el paso diga que terminó.
   */
  const [ocupado, setOcupado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(false);
  /**
   * El detalle del back cuando lo hay. El 409 de «terminar» dice EXACTAMENTE
   * qué falta («Todavía falta cargar los inmuebles…») — tragárselo y mostrar
   * el genérico obliga a adivinar. Sin detalle (red caída), cae al genérico.
   */
  const [falloDetalle, setFalloDetalle] = useState<string | null>(null);

  const pasos = estado.pasos;
  const listo = todoListo(pasos);
  const exigibles = pasos.filter(esExigible);
  const hechos = exigibles.filter((p) => p.estado === "listo").length;

  /*
   * Dónde está parada la persona. Arranca en el primer paso sin terminar y
   * SÓLO cambia cuando ella lo cambia: el refresco del estado no la mueve.
   * Si terceros pasa a «listo» mientras revisa las últimas filas, la barra
   * lo marca y el pie ofrece seguir — pero nadie le cambia la pantalla.
   */
  const [seleccionado, setSeleccionado] = useState(() => pasoActual(pasos));
  const indice = Math.min(seleccionado, pasos.length - 1);
  const paso = pasos[indice];
  const siguiente = siguientePaso(pasos, indice);

  const irA = useCallback(
    (i: number) => {
      setOcupado(false);
      setSeleccionado(i);
      cuerpo.current?.scrollTo({ top: 0 });
      // Quien acaba de sembrar el PUC y aprieta «continuar» no debería ver
      // «primero terminá el PUC» hasta el próximo refresco de 5 s.
      void onResuelta();
    },
    [onResuelta],
  );

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
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    nodo.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Silencioso a propósito: no hay nada que cerrar. Salvo que un
        // diálogo de adentro (un select, una confirmación) esté abierto:
        // esos viven en portales fuera de la caja y Escape es de ellos.
        if (!nodo.contains(document.activeElement)) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== "Tab") return;
      // Un portal abierto (diálogo, select) maneja su propio Tab.
      if (document.activeElement && !nodo.contains(document.activeElement))
        return;
      const lista = enfocables();
      if (lista.length === 0) {
        e.preventDefault();
        nodo.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && activo === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, []);

  /*
   * El fondo no scrollea: si scrollea, el muro flota sobre un panel que se
   * mueve y deja de leerse como una barrera. Lenis se frena como en cualquier
   * modal (DESIGN.md); el cuerpo del muro scrollea solo, con
   * `data-lenis-prevent`.
   */
  useEffect(() => {
    const controles = lenisRef.current;
    controles.stop();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
      controles.start();
    };
  }, []);

  async function resolver(via: "terminar" | "omitir") {
    setEnviando(true);
    setFallo(false);
    setFalloDetalle(null);
    try {
      if (via === "terminar") await migracionEstadoApi.terminar();
      else await migracionEstadoApi.omitir();
      await onResuelta();
      // Si el back todavía dice que bloquea, el muro sigue puesto y los
      // botones tienen que volver a funcionar.
      setEnviando(false);
    } catch (e) {
      // El muro se queda puesto y lo dice. Fingir que salió y volver a
      // levantarlo en la siguiente carga es peor que no salir.
      setConfirmando(false);
      setFallo(true);
      // Un error CON mensaje del back (el 409 de «todavía falta…») se
      // muestra tal cual; cualquier otra cosa (un bug, un throw raro) cae al
      // texto genérico — nunca un stack en inglés en la cara del usuario.
      setFalloDetalle(e instanceof ApiError && e.message ? e.message : null);
      setEnviando(false);
    }
  }

  return (
    <div
      /*
       * El velo va con `color-mix` sobre la variable del shell: los tokens de
       * cadence resuelven a un color literal, así que el modificador de
       * opacidad de Tailwind (`bg-x/70`) no genera nada con ellos.
       */
      className="fixed inset-0 z-[120] flex justify-center bg-[color-mix(in_srgb,var(--plan-page-bg)_78%,transparent)] p-3 backdrop-blur-[2px] sm:p-5 lg:p-8"
      data-testid="muro-migracion"
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="muro-migracion-titulo"
        className="flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300"
      >
        {/* ── Arriba, fijo: el mapa ─────────────────────────────────────── */}
        <header className="shrink-0 border-b border-border-faint px-5 pb-5 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-baseline justify-between gap-x-6 font-mono text-[11px] text-fg-subtle">
            <p className="uppercase tracking-wider">
              {t("migracion.muro.eyebrow")}
            </p>
            <p className="shrink-0 tabular-nums" data-testid="muro-progreso">
              {t("migracion.muro.progresoDe", {
                n: hechos,
                total: exigibles.length,
              })}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1
              id="muro-migracion-titulo"
              className="text-xl font-semibold tracking-tight text-fg"
            >
              {t("migracion.muro.titulo")}
            </h1>
            <p className="text-sm text-fg-muted">
              {t("migracion.muro.subtitulo")}
            </p>
          </div>
          <BarraDePasos pasos={pasos} seleccionado={indice} onIr={irA} />
        </header>

        {confirmando ? (
          <div
            className="flex-1 overflow-y-auto px-5 py-6 sm:px-8"
            data-lenis-prevent
            style={{ overscrollBehavior: "contain" }}
          >
            <ConfirmarArranqueDeCero
              enviando={enviando}
              onCancelar={() => setConfirmando(false)}
              onAceptar={() => resolver("omitir")}
            />
          </div>
        ) : (
          <>
            {/* ── El cuerpo: el paso elegido, entero ──────────────────── */}
            <div
              ref={cuerpo}
              className="flex-1 overflow-y-auto px-5 py-6 sm:px-8"
              data-lenis-prevent
              style={{ overscrollBehavior: "contain" }}
              data-testid="muro-pasos"
            >
              {listo ? <TodoListo pasos={pasos} /> : null}

              {paso ? (
                <PasoEnFoco pasos={pasos} indice={indice} onIr={irA} onOcupado={setOcupado} />
              ) : null}

              {fallo ? (
                <p
                  className="mt-6 flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger"
                  data-testid="muro-fallo"
                >
                  <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                  {falloDetalle ?? t("migracion.muro.fallo")}
                </p>
              ) : null}
            </div>

            {/* ── Abajo, fijo: las salidas ─────────────────────────────── */}
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border-faint px-5 py-4 sm:px-8">
              {/*
               * 🔴 La salida de la inmobiliaria nueva. Está SIEMPRE que falte
               * algo, aunque no haya un solo paso listo: quien arranca de cero
               * no tiene nada que migrar y sin esto no sale nunca. Discreta,
               * no escondida. Con todo listo sobra: «entrar al panel» es la
               * puerta, y el back nunca la rechaza en ese estado.
               */}
              {listo ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={enviando}
                  data-testid="muro-arrancar-de-cero"
                  className="rounded-sm text-sm text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {t("migracion.muro.arrancarDeCero")}
                </button>
              )}

              {ocupado ? (
                <p className="text-sm text-fg-subtle" data-testid="muro-ocupado">
                  {t("migracion.muro.ocupado")}
                </p>
              ) : listo ? (
                <Button
                  onClick={() => resolver("terminar")}
                  disabled={enviando}
                  data-testid="muro-ya-termine"
                  hideArrow
                >
                  {t("migracion.muro.yaTermine")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : paso && paso.estado === "listo" && siguiente !== null ? (
                <Button
                  onClick={() => irA(siguiente)}
                  data-testid="muro-siguiente"
                  hideArrow
                >
                  {t("migracion.muro.siguiente", {
                    paso: t(`migracion.pasos.${pasos[siguiente].id}.corto`),
                  })}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <p className="text-sm text-fg-subtle" data-testid="muro-falta">
                  {t("migracion.muro.terminaEstePaso")}
                </p>
              )}
            </footer>
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
 * check al terminar, conector. En columnas iguales, con la etiqueta DEBAJO
 * del círculo — al lado, «Terceros: propietarios e inquilinos» partía la
 * barra en dos renglones.
 *
 * Los pasos habilitados son botones: cambian el paso que se ve, sin salir
 * del muro. Los frenados dicen por qué (para el lector de pantalla; en
 * pantalla lo dice el orden). Un `no_disponible` va apagado y con candado.
 */
function BarraDePasos({
  pasos,
  seleccionado,
  onIr,
}: {
  pasos: PasoDeMigracion[];
  seleccionado: number;
  onIr: (i: number) => void;
}) {
  const { t } = useI18n();
  const ahora = pasoActual(pasos);

  return (
    <ol
      aria-label={t("migracion.muro.progreso")}
      className="mt-5 grid gap-x-2"
      style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
      data-testid="muro-barra"
    >
      {pasos.map((paso, idx) => {
        const hecho = paso.estado === "listo";
        const apagado = !esExigible(paso);
        const habilitado = pasoHabilitado(pasos, idx);
        const frena = pasoQueFrena(pasos, idx);
        const esAhora = idx === ahora && !hecho && !apagado;
        const elegido = idx === seleccionado;
        const ultimo = idx === pasos.length - 1;
        const titulo = t(`migracion.pasos.${paso.id}.titulo`);

        // Lo que se lee debajo del nombre. Un hecho muestra lo que cargó
        // («12 propietarios · 30 inquilinos»); nunca un cero inventado.
        const subLinea = hecho
          ? null
          : esAhora
            ? t("migracion.muro.ahora")
            : apagado
              ? t("migracion.muro.noDisponible")
              : habilitado
                ? t("migracion.muro.pendiente")
                : t("migracion.muro.enEspera");

        const cuerpo = (
          <>
            <div className="flex items-center">
              <span
                data-testid={`muro-barra-${paso.id}`}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums transition-[color,background-color,border-color,box-shadow]",
                  hecho
                    ? "border-2 border-primary bg-primary text-primary-fg"
                    : habilitado
                      ? "border-2 border-primary bg-surface text-primary"
                      : "border border-border bg-surface text-fg-subtle",
                  apagado && "border-dashed",
                  // «Acá estás mirando»: un anillo, sea el paso que sea.
                  elegido &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-surface",
                )}
              >
                {hecho ? (
                  <Check className="h-3.5 w-3.5" weight="bold" />
                ) : apagado ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  idx + 1
                )}
              </span>
              {!ultimo ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-0.5 min-w-0 flex-1 rounded-full transition-colors",
                    hecho ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </div>

            <div className="mt-2.5 hidden min-w-0 pr-3 text-left sm:block">
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  elegido
                    ? "text-primary"
                    : hecho || habilitado
                      ? "text-fg group-hover:underline group-hover:underline-offset-4"
                      : "text-fg-subtle",
                )}
                title={titulo}
              >
                {t(`migracion.pasos.${paso.id}.corto`)}
              </p>
              {/* Un conteo por renglón: «1 propietario · 2 inquilinos» no
                  entra en una columna de 180 px, y partirlo donde caiga
                  dejaba «· 2» colgando arriba de «inquilinos». */}
              <p
                className={cn(
                  "mt-0.5 font-mono text-[11px] leading-snug",
                  hecho ? "text-fg-muted" : "text-fg-subtle",
                )}
                title={hecho && paso.detalle ? paso.detalle : undefined}
              >
                {hecho
                  ? (paso.detalle ?? t("migracion.muro.hecho"))
                      .split(" · ")
                      .slice(0, 2)
                      .map((parte) => (
                        <span key={parte} className="block truncate">
                          {parte}
                        </span>
                      ))
                  : subLinea}
              </p>
            </div>

            {/* El porqué del candado, para quien lee con lector de pantalla:
                «Primero terminá “Propiedades”». En pantalla lo dice el orden. */}
            {!hecho && !apagado && !habilitado && frena ? (
              <span className="sr-only" data-testid={`muro-porque-${paso.id}`}>
                {t("migracion.muro.primero", {
                  paso: t(`migracion.pasos.${frena.id}.titulo`),
                })}
              </span>
            ) : null}
          </>
        );

        return (
          <li
            key={paso.id}
            data-testid={`muro-paso-${paso.id}`}
            data-estado={paso.estado}
            data-habilitado={habilitado}
            aria-current={elegido ? "step" : undefined}
            className="min-w-0"
          >
            {habilitado ? (
              <button
                type="button"
                onClick={() => onIr(idx)}
                data-testid={`muro-ir-${paso.id}`}
                aria-label={t("migracion.muro.irAlPaso", { paso: titulo })}
                className="group block w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cuerpo}
              </button>
            ) : (
              <div>{cuerpo}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * El paso elegido, entero: su cabecera y, debajo, el componente que ya
 * existía como pantalla suelta (`MigrarTerceros`, `ImportWizard`,
 * `MigrarContratos`, `PlanDeCuentas`, `RegistrosContables`).
 *
 * Antes de montar el componente se mira si tiene sentido: un paso
 * `no_disponible` no se puede hacer; uno frenado tampoco (y se ofrece ir
 * al que frena); y un paso que el permiso del usuario no cubre se dice,
 * en vez de dejar que el componente falle con un 403 en cada clic.
 */
function PasoEnFoco({
  pasos,
  indice,
  onIr,
  onOcupado,
}: {
  pasos: PasoDeMigracion[];
  indice: number;
  onIr: (i: number) => void;
  onOcupado: (ocupado: boolean) => void;
}) {
  const { t } = useI18n();
  const { canAccess, isLoading } = usePermissions();
  const paso = pasos[indice];
  const hecho = paso.estado === "listo";
  const disponible = esExigible(paso);
  const habilitado = pasoHabilitado(pasos, indice);
  const frena = pasoQueFrena(pasos, indice);
  // Mientras los permisos no contestaron no se afirma nada: se muestra.
  // Quien no puede, lo va a saber en cuanto el servicio conteste.
  const permitido = isLoading || canAccess(MODULO_DEL_PASO[paso.id], "view");

  return (
    <section
      data-testid="muro-en-foco"
      data-paso={paso.id}
      aria-labelledby="muro-en-foco-titulo"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t("migracion.muro.pasoDe", { n: indice + 1, total: pasos.length })}
          </p>
          <h2
            id="muro-en-foco-titulo"
            className="mt-1 text-balance text-2xl font-semibold tracking-tight text-fg"
          >
            {t(`migracion.pasos.${paso.id}.titulo`)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {t(`migracion.pasos.${paso.id}.descripcion`)}
          </p>
        </div>
        {hecho ? (
          <p
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 font-mono text-xs tabular-nums text-success"
            data-testid="muro-paso-listo"
          >
            <Check className="h-3.5 w-3.5" weight="bold" />
            {paso.detalle ?? t("migracion.muro.hecho")}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        {!disponible ? (
          <Aviso testid="muro-aviso-no-disponible">
            {t("migracion.muro.noDisponibleDetalle")}
          </Aviso>
        ) : !habilitado && frena ? (
          <Aviso testid="muro-aviso-frenado">
            {t("migracion.muro.primero", {
              paso: t(`migracion.pasos.${frena.id}.titulo`),
            })}
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              hideArrow
              onClick={() => onIr(pasos.indexOf(frena))}
              data-testid="muro-ir-al-que-frena"
            >
              {t("migracion.muro.irAlPaso", {
                paso: t(`migracion.pasos.${frena.id}.corto`),
              })}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Aviso>
        ) : !permitido ? (
          <Aviso testid="muro-sin-permiso">
            {t("migracion.muro.sinPermiso")}
          </Aviso>
        ) : (
          <div data-testid="muro-contenido" data-paso={paso.id}>
            <ContenidoDelPaso id={paso.id} pasos={pasos} onIr={onIr} onOcupado={onOcupado} />
          </div>
        )}
      </div>
    </section>
  );
}

/** El componente de cada paso. Los saltos entre pasos se quedan en el muro. */
function ContenidoDelPaso({
  id,
  pasos,
  onIr,
  onOcupado,
}: {
  id: IdDePasoDeMigracion;
  pasos: PasoDeMigracion[];
  onIr: (i: number) => void;
  onOcupado: (ocupado: boolean) => void;
}) {
  // Para reiniciar el asistente de inmuebles cuando la persona «cancela»:
  // adentro del muro no hay portafolio al que volver.
  const [vueltaDeInmuebles, setVueltaDeInmuebles] = useState(0);
  const indiceDe = (otro: IdDePasoDeMigracion) =>
    pasos.findIndex((p) => p.id === otro);
  const irAOtro = (otro: IdDePasoDeMigracion) => {
    const i = indiceDe(otro);
    return i === -1 ? undefined : () => onIr(i);
  };

  switch (id) {
    case "propietarios":
      /*
       * Un paso por tipo: adentro del muro no hay switch que entender.
       * 🔴 El `key` NO es decorativo: sin él, React reutiliza la MISMA
       * instancia al saltar entre propietarios e inquilinos (mismo componente,
       * misma posición) y todo el estado interno —el archivo subido, la
       * plantilla, el nombre de la carga, el tipo— se queda del paso anterior.
       * Nico subió propietarios, pasó a inquilinos y el paso le mostró la
       * carga de propietarios y «Revisar 110 propietarios» con el archivo de
       * inquilinos (2026-09-01).
       */
      return <MigrarTerceros key="propietarios" tipoFijo="PROPIETARIO" onOcupado={onOcupado} />;
    case "inquilinos":
      return <MigrarTerceros key="inquilinos" tipoFijo="INQUILINO" onOcupado={onOcupado} />;
    case "propiedades":
      // `onOcupado` acá también: la activación del lote corre por tandas y el
      // pie ofrecía «Seguir con Contratos» con el «Activando…» girando
      // (Nico lo vio, 2026-09-01).
      return (
        <ImportWizard
          key={vueltaDeInmuebles}
          onSalir={() => setVueltaDeInmuebles((n) => n + 1)}
          onOcupado={onOcupado}
        />
      );
    case "contratos":
      return <MigrarContratos onOcupado={onOcupado} />;
    case "puc":
      return <PlanDeCuentas onContinuar={irAOtro("contables")} onOcupado={onOcupado} />;
    case "contables":
      return <RegistrosContables onIrAlPuc={irAOtro("puc")} onOcupado={onOcupado} />;
  }
}

function Aviso({
  testid,
  children,
}: {
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-surface-muted p-5 text-sm text-fg-muted"
      data-testid={testid}
    >
      {children}
    </div>
  );
}

/**
 * La franja de «todo listo», arriba del paso elegido. Resume lo cargado en
 * chips —una frase corrida se partía dejando «· 1 asiento» huérfano— y
 * deja seguir cargando: la puerta está en el pie.
 */
function TodoListo({ pasos }: { pasos: PasoDeMigracion[] }) {
  const { t } = useI18n();
  const conteos = pasos
    .filter((p) => p.estado === "listo" && p.detalle)
    .flatMap((p) => (p.detalle as string).split(" · "));

  return (
    <section
      className="mb-6 flex items-start gap-4 rounded-lg bg-surface-muted p-5 sm:gap-5 sm:p-6"
      data-testid="muro-todo-listo"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
        <Check className="h-5 w-5" weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("migracion.muro.todoListo.eyebrow")}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-fg">
          {t("migracion.muro.todoListo.titulo")}
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-muted">
          {t("migracion.muro.todoListo.detalle")}
        </p>
        {conteos.length > 0 ? (
          <ul
            className="mt-3 flex flex-wrap gap-1.5"
            aria-label={t("migracion.muro.todoListo.eyebrow")}
          >
            {conteos.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-fg-muted"
              >
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
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
    <section
      className="rounded-lg bg-warning-soft p-6 sm:p-7"
      data-testid="muro-confirmar-cero"
    >
      <div className="flex items-start gap-5 sm:gap-7">
        <div className="flex w-14 shrink-0 pt-0.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-warning">
            <Warning className="h-5 w-5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            {t("migracion.muro.confirmar.titulo")}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            {t("migracion.muro.confirmar.detalle")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={onAceptar}
              disabled={enviando}
              data-testid="muro-confirmar-si"
              hideArrow
            >
              {t("migracion.muro.confirmar.aceptar")}
            </Button>
            <Button
              variant="outline"
              onClick={onCancelar}
              disabled={enviando}
              data-testid="muro-confirmar-no"
              hideArrow
            >
              {t("migracion.muro.confirmar.cancelar")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
