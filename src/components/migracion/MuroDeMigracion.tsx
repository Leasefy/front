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
 * ── Por qué el panel se ve, borroso, detrás ────────────────────────────────
 *
 * El mensaje no es «no existe nada»: es «esto te está esperando». Por eso el
 * contenido no se desmonta ni se reemplaza por una página en blanco. Se
 * desenfoca. Se parece al onboarding de creación de cuenta —la misma barra
 * de pasos numerada— pero ya adentro, con lo que se compró a la vista.
 *
 * ── Cómo está compuesto ───────────────────────────────────────────────────
 *
 * Tres bloques, y cada uno dice UNA cosa:
 *
 *   1. La barra: los cinco pasos en columnas iguales, con el círculo y el
 *      conector del onboarding de cuenta. Es el mapa — dónde estás y qué
 *      falta — y los pasos ya hechos son enlaces para volver a ellos.
 *   2. El paso en foco: una sola tarjeta con el paso que toca AHORA, su
 *      porqué y el único botón que hay que apretar. Nada compite con él.
 *   3. El pie: las dos salidas.
 *
 * La versión anterior listaba los cinco pasos como filas debajo de la barra
 * —cada una con su candado, su «en espera» y su «primero terminá…»—: cinco
 * veces la misma información, y el panel no entraba en la pantalla. El pie,
 * con las salidas, quedaba cortado.
 *
 * ── Lo que el muro NO hace ────────────────────────────────────────────────
 *
 * **No encierra a nadie.** Tiene dos salidas y las dos son de verdad: «entrar
 * al panel» cuando todo está listo, y «arranco de cero» siempre, con
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

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, Lock, Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  migracionEstadoApi,
  type EstadoDeMigracion,
  type PasoDeMigracion,
} from "@/lib/api/migracion-estado.service";
import {
  RUTA_DEL_PASO,
  esExigible,
  estaExentaDelMuro,
  normalizarEstado,
  pasoActual,
  pasoHabilitado,
  pasoQueFrena,
  todoListo,
} from "./muro-reglas";

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
  const inerte = puesto
    ? ({ inert: "" } as unknown as Record<string, string>)
    : {};

  return (
    <>
      <div
        {...inerte}
        aria-hidden={puesto || undefined}
        data-testid="panel-detras-del-muro"
        className={cn(
          puesto &&
            "min-h-screen select-none blur-[3px] saturate-[0.6] pointer-events-none",
        )}
      >
        {children}
      </div>
      {puesto ? (
        <PanelDeMigracion estado={estado} onResuelta={consultar} />
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
  const caja = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const pasos = estado.pasos;
  const actual = pasoActual(pasos);
  const listo = todoListo(pasos);
  const exigibles = pasos.filter(esExigible);
  const hechos = exigibles.filter((p) => p.estado === "listo").length;

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
        // Silencioso a propósito: no hay nada que cerrar.
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== "Tab") return;
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

    document.addEventListener("keydown", alTeclear, true);
    return () => document.removeEventListener("keydown", alTeclear, true);
  }, []);

  // El fondo no scrollea: si scrollea, el muro flota sobre un panel que se
  // mueve y deja de leerse como una barrera.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  async function resolver(via: "terminar" | "omitir") {
    setEnviando(true);
    setFallo(false);
    try {
      if (via === "terminar") await migracionEstadoApi.terminar();
      else await migracionEstadoApi.omitir();
      await onResuelta();
      // Si el back todavía dice que bloquea, el muro sigue puesto y los
      // botones tienen que volver a funcionar.
      setEnviando(false);
    } catch {
      // El muro se queda puesto y lo dice. Fingir que salió y volver a
      // levantarlo en la siguiente carga es peor que no salir.
      //
      // Se vuelve a los pasos a propósito: el aviso vive ahí, y dejar la
      // confirmación abierta con un error invisible detrás es la forma de
      // que la persona apriete «sí» tres veces sin entender nada.
      setConfirmando(false);
      setFallo(true);
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
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--plan-page-bg)_78%,transparent)] p-4 backdrop-blur-[2px] sm:p-8"
      data-testid="muro-migracion"
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="muro-migracion-titulo"
        className="my-auto w-full max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-lg outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 sm:p-10"
      >
        <header className="space-y-2">
          {/* El renglón del eyebrow lleva el conteo a la derecha: la barra lo
              dibuja, esto lo dice — en mono, como todo numeral. */}
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
          <h1
            id="muro-migracion-titulo"
            className="max-w-xl text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg"
          >
            {t("migracion.muro.titulo")}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            {t("migracion.muro.subtitulo")}
          </p>
        </header>

        {confirmando ? (
          <ConfirmarArranqueDeCero
            enviando={enviando}
            onCancelar={() => setConfirmando(false)}
            onAceptar={() => resolver("omitir")}
          />
        ) : (
          <div data-testid="muro-pasos">
            <BarraDePasos pasos={pasos} actual={actual} />

            <PasoEnFoco
              pasos={pasos}
              actual={actual}
              listo={listo}
              enviando={enviando}
              onTerminar={() => resolver("terminar")}
            />

            {fallo ? (
              <p
                className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger"
                data-testid="muro-fallo"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                {t("migracion.muro.fallo")}
              </p>
            ) : null}

            {/*
             * El pie desaparece cuando todo está listo: ahí la única salida
             * que tiene sentido es «Entrar al panel», que ya está en la
             * tarjeta. El back sólo rechaza «terminar» por pasos `pendiente`,
             * así que con todo listo nunca hace falta la otra puerta.
             */}
            {listo ? null : (
              <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-faint pt-5">
                {/*
                 * 🔴 La salida de la inmobiliaria nueva. Está SIEMPRE que falte
                 * algo, aunque no haya un solo paso listo: quien arranca de cero
                 * no tiene nada que migrar y sin esto no sale nunca. Discreta,
                 * no escondida.
                 */}
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={enviando}
                  data-testid="muro-arrancar-de-cero"
                  className="rounded-sm text-sm text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {t("migracion.muro.arrancarDeCero")}
                </button>

                <p className="text-sm text-fg-subtle" data-testid="muro-falta">
                  {t("migracion.muro.faltaTerminar")}
                </p>
              </footer>
            )}
          </div>
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
 * check al terminar, conector.
 *
 * Cambian dos cosas. Los pasos van en columnas iguales, con la etiqueta
 * DEBAJO del círculo y no al lado: con etiquetas al lado, «Terceros:
 * propietarios e inquilinos» empujaba a los demás y la barra se partía en
 * dos renglones. Y un paso puede estar `no_disponible`, que se dibuja
 * apagado y con candado en vez de número.
 *
 * Los pasos ya hechos son enlaces: quien cargó diez propietarios y quiere
 * cargar más no tiene que esperar a que el muro baje.
 */
function BarraDePasos({
  pasos,
  actual,
}: {
  pasos: PasoDeMigracion[];
  actual: number;
}) {
  const { t } = useI18n();

  return (
    <ol
      aria-label={t("migracion.muro.progreso")}
      className="mt-8 grid gap-x-2"
      style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
      data-testid="muro-barra"
    >
      {pasos.map((paso, idx) => {
        const hecho = paso.estado === "listo";
        const apagado = !esExigible(paso);
        // Un `no_disponible` al final de la lista es donde cae `pasoActual` cuando
        // todo lo exigible está listo: no es «ahora», es «no se pudo verificar».
        const esActual = idx === actual && !hecho && !apagado;
        const habilitado = pasoHabilitado(pasos, idx);
        const frena = pasoQueFrena(pasos, idx);
        const ultimo = idx === pasos.length - 1;
        const href = RUTA_DEL_PASO[paso.id];
        const titulo = t(`migracion.pasos.${paso.id}.titulo`);

        // Lo que se lee debajo del nombre. Un hecho muestra lo que cargó
        // («12 propietarios · 30 inquilinos»); nunca un cero inventado.
        const subLinea = hecho
          ? (paso.detalle ?? t("migracion.muro.hecho"))
          : esActual
            ? t("migracion.muro.ahora")
            : apagado
              ? t("migracion.muro.noDisponible")
              : t("migracion.muro.enEspera");

        const cuerpo = (
          <>
            <div className="flex items-center">
              <span
                data-testid={`muro-barra-${paso.id}`}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums transition-colors",
                  hecho
                    ? "border-2 border-primary bg-primary text-primary-fg"
                    : esActual
                      ? "border-2 border-primary bg-surface text-primary"
                      : "border border-border bg-surface text-fg-subtle",
                  apagado && "border-dashed",
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

            <div className="mt-2.5 hidden min-w-0 pr-3 sm:block">
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  esActual
                    ? "text-primary"
                    : hecho
                      ? "text-fg group-hover:underline group-hover:underline-offset-4"
                      : "text-fg-subtle",
                )}
                title={titulo}
              >
                {t(`migracion.pasos.${paso.id}.corto`)}
              </p>
              {/* Un conteo por renglón: «1 propietario · 2 inquilinos» no
                  entra en una columna de 130 px, y partirlo donde caiga
                  dejaba «· 2» colgando arriba de «inquilinos». */}
              <p
                className={cn(
                  "mt-0.5 font-mono text-[11px] leading-snug",
                  hecho ? "text-fg-muted" : "text-fg-subtle",
                )}
                title={hecho && paso.detalle ? paso.detalle : undefined}
              >
                {hecho && paso.detalle
                  ? paso.detalle
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
            aria-current={esActual ? "step" : undefined}
            className="min-w-0"
          >
            {hecho && href ? (
              <Link
                href={href}
                data-testid={`muro-volver-${paso.id}`}
                title={t("migracion.muro.volver", { paso: titulo })}
                className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {cuerpo}
              </Link>
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
 * La tarjeta del paso que toca ahora. Una sola: el resto está en la barra.
 *
 * Tres formas, según lo que dicen las reglas:
 *   - falta algo → el paso actual, con su porqué y el botón de ir;
 *   - todo listo → el resumen de lo cargado y «entrar al panel»;
 *   - nada exigible (el back no pudo verificar ninguno) → se dice, sin botón
 *     muerto; la salida de abajo sigue estando.
 */
function PasoEnFoco({
  pasos,
  actual,
  listo,
  enviando,
  onTerminar,
}: {
  pasos: PasoDeMigracion[];
  actual: number;
  listo: boolean;
  enviando: boolean;
  onTerminar: () => void;
}) {
  const { t } = useI18n();
  const paso = pasos[actual];

  if (listo) {
    // Cada conteo en su chip: una frase corrida se parte donde cae y deja un
    // «· 1 asiento» huérfano al principio del segundo renglón.
    const conteos = pasos
      .filter((p) => p.estado === "listo" && p.detalle)
      .flatMap((p) => (p.detalle as string).split(" · "));
    const resumen =
      conteos.length > 0 ? (
        <ul
          className="flex flex-wrap gap-1.5"
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
      ) : null;
    return (
      <Tarjeta
        id="todo-listo"
        marca={
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-fg">
            <Check className="h-5 w-5" weight="bold" />
          </span>
        }
        eyebrow={t("migracion.muro.todoListo.eyebrow")}
        titulo={t("migracion.muro.todoListo.titulo")}
        descripcion={t("migracion.muro.todoListo.detalle")}
        detalle={resumen}
      >
        <Button
          onClick={onTerminar}
          disabled={enviando}
          data-testid="muro-ya-termine"
          hideArrow
        >
          {t("migracion.muro.yaTermine")}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </Tarjeta>
    );
  }

  if (!paso || !esExigible(paso)) {
    return (
      <Tarjeta
        id="nada-disponible"
        marca={
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border text-fg-subtle">
            <Lock className="h-4 w-4" />
          </span>
        }
        eyebrow={t("migracion.muro.eyebrow")}
        titulo={t("migracion.muro.nadaDisponible.titulo")}
        descripcion={t("migracion.muro.nadaDisponible.detalle")}
        detalle={null}
      />
    );
  }

  const href = RUTA_DEL_PASO[paso.id];

  return (
    <Tarjeta
      id={paso.id}
      marca={
        // El numeral grande ES la secuencia: «02» dice dónde estás sin leer.
        <span
          aria-hidden
          className="font-mono text-[40px] font-medium leading-none tracking-tight text-primary tabular-nums"
        >
          {String(actual + 1).padStart(2, "0")}
        </span>
      }
      eyebrow={t("migracion.muro.pasoDe", {
        n: actual + 1,
        total: pasos.length,
      })}
      titulo={t(`migracion.pasos.${paso.id}.titulo`)}
      descripcion={t(`migracion.pasos.${paso.id}.descripcion`)}
      detalle={paso.detalle}
    >
      {href ? (
        <Button asChild hideArrow>
          <Link href={href} data-testid={`muro-ir-${paso.id}`}>
            {paso.conteo > 0 ? t("migracion.retomar") : t("migracion.empezar")}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </Tarjeta>
  );
}

function Tarjeta({
  id,
  marca,
  eyebrow,
  titulo,
  descripcion,
  detalle,
  children,
}: {
  id: string;
  marca: React.ReactNode;
  eyebrow: string;
  titulo: string;
  descripcion: string;
  detalle: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      data-testid="muro-en-foco"
      data-paso={id}
      aria-labelledby="muro-en-foco-titulo"
      className="mt-6 rounded-lg bg-surface-muted p-6 sm:p-7"
    >
      <div className="flex items-start gap-5 sm:gap-7">
        <div className="flex w-14 shrink-0 pt-0.5">{marca}</div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {eyebrow}
          </p>
          <h2
            id="muro-en-foco-titulo"
            className="mt-1 text-balance text-xl font-semibold tracking-tight text-fg"
          >
            {titulo}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            {descripcion}
          </p>
          {detalle ? (
            <div className="mt-3 font-mono text-xs tabular-nums text-fg-muted">
              {detalle}
            </div>
          ) : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
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
      className="mt-8 rounded-lg bg-warning-soft p-6 sm:p-7"
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
