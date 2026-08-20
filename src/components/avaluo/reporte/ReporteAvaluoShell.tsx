/**
 * ReporteAvaluoShell.tsx — la página del informe («Panel de producto», v2).
 *
 * **Server Component a propósito.** Recibe la vista ya armada por
 * `buildLandingView()` y la compone; lo que se hidrata son islas: la barra
 * (`ReportTopbar`), el índice (`ReportRail`), el héroe (`ReportHero`), los
 * gráficos y la tabla expandible. Lo que importa de `@leasefy/cadence` cruza a
 * cliente por su cuenta (su bundle declara `"use client"`), pero como sólo
 * recibe datos serializables, eso no obliga a hacer cliente al resto del árbol.
 *
 * Anatomía (spec §2): banda de muestra / de enlace compartido / de pago
 * pendiente → barra sticky → rejilla `[264px | 1fr]` con el índice a la
 * izquierda y el `<article>` a la derecha → seis capítulos con su bento. En la
 * muestra, la marca de agua del DS (`SampleDataWatermark`) tapiza el lienzo
 * DETRÁS de las tarjetas.
 *
 * Tema: la página **no** usa `ForceLightMode`. Todos los tokens que usa tienen
 * pareja oscura (`bg`, `surface`, `fg`, `border`, `*-soft`, `ink`), así que se
 * ve bien en claro y en oscuro sin pelearse con `next-themes` en el navegador
 * de un tercero. Lo que gobierna el documento impreso es `report-print.css`.
 *
 * `downloadHref` viene de la página (que es quien tiene el token de la
 * query): el Shell y sus hijos NUNCA leen el token en cliente.
 */

import Link from "next/link";
import { SealWarning } from "@phosphor-icons/react/dist/ssr";
import { SampleDataWatermark } from "@leasefy/cadence";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { DeliveryCapabilitiesView } from "@/lib/avaluo/reporte/delivery";
import type { LandingView } from "@/lib/avaluo/reporte/landing-layout";
import { ReportMotionConfig } from "./motion/ReportMotionConfig";
import { ReportChapter } from "./ReportChapter";
import { ReportRail, type RailChapter } from "./ReportRail";
import { ReportTopbar } from "./ReportTopbar";
import { ReportPrintOpener } from "./ReportPrintOpener";
import type { BlockContext } from "./ReportBlockView";

// ---------------------------------------------------------------------------
// Bandas superiores
// ---------------------------------------------------------------------------

/**
 * La marca de datos de muestra. Ancho completo, no descartable y **fuera** del
 * `<article>`, para que ninguna captura ni ningún export la pierda. Es la
 * primera de tres capas; las otras dos son la nota del sello y los propios
 * datos, que son imposibles por construcción.
 */
function SampleBanner() {
  return (
    <div
      role="status"
      className="border-b border-warning bg-warning-soft px-4 py-2 text-center"
      data-sample-banner
    >
      <p className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-fg">
        <span className="inline-flex items-center rounded-full border border-warning px-2 py-px font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-warning">
          Datos de muestra
        </span>
        <span>
          <b className="font-semibold">
            Este documento no corresponde a ningún inmueble ni a ninguna persona
            reales.
          </b>{" "}
          No tiene validez.
        </span>
      </p>
    </div>
  );
}

function ShareBanner({
  notice,
}: {
  notice: NonNullable<LandingView["shareNotice"]>;
}) {
  return (
    <div
      role="status"
      className="border-b border-border bg-surface-muted px-4 py-2"
    >
      <p className="mx-auto max-w-[1520px] text-[13px] text-fg-muted">
        Enlace compartido por {notice.sharedByLabel} · vence el{" "}
        <span className="font-mono tabular-nums">
          {formatDate(notice.expiresAtIso)}
        </span>{" "}
        · puede revocarse en cualquier momento.
      </p>
    </div>
  );
}

/**
 * El aviso de pago pendiente. No esconde el documento: lo que hace es explicar
 * por qué algunas secciones están cerradas, y las secciones cerradas siguen
 * ocupando su lugar con su título — un documento mutilado se lee como un error,
 * un documento con candados se lee como un documento con candados.
 */
function PaywallBanner({ href }: { href: string | null }) {
  return (
    <div
      role="status"
      className="border-b border-border bg-primary-soft px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg">
          Este informe está incompleto: las secciones con la estimación, los
          inmuebles comparables y el anexo se abren al completar el pago.
        </p>
        {href !== null && (
          <Button asChild size="sm">
            <Link href={href}>Completar el pago</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * El aviso de estimación no final (T-0007): documento preliminar generado
 * por IA, el PDF se habilita recién tras la validación manual. Se pinta
 * VERBATIM — nunca se re-tipea, traduce ni recorta (T-0007 §3.2.4) — y se
 * muestra iff `!capabilities.released`. Misma banda persistente ancho
 * completo que `SampleBanner`/`PaywallBanner` (`docs/DESIGN.md` §21): fuera
 * del `<article>`, no descartable.
 */
function EstimateNoticeBanner({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="border-b border-warning bg-warning-soft px-4 py-2.5"
      data-estimate-notice-banner
    >
      <div className="mx-auto flex max-w-[1520px] items-start gap-2.5">
        <SealWarning
          aria-hidden="true"
          weight="duotone"
          className="mt-0.5 size-4 shrink-0 text-warning"
        />
        <p className="text-[13px] text-fg">{text}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// La página
// ---------------------------------------------------------------------------

export interface ReporteAvaluoShellProps {
  view: LandingView;
  /** URL de descarga del PDF (con el token del dueño). `null` ⇒ sin documento. */
  downloadHref?: string | null;
  /**
   * Capacidades de entrega (T-0007, `resolveDelivery`). Obligatorio a
   * propósito: no hay default "todo permitido" en este componente — el único
   * default fail-closed vive en `resolveDelivery` (`DENIED`), y quien llama
   * a este componente (la página) SIEMPRE lo resuelve explícitamente antes
   * de renderizar. Gatea «Imprimir», el chip/acciones del sello y muestra el
   * aviso de estimación cuando `!released`.
   */
  capabilities: DeliveryCapabilitiesView;
}

const ARTICLE_ID = "informe";

export function ReporteAvaluoShell({
  view,
  downloadHref = null,
  capabilities,
}: ReporteAvaluoShellProps) {
  const railChapters: RailChapter[] = view.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    sections: chapter.sections.map((section) => ({
      id: section.node.id,
      title:
        section.node.title ??
        (section.node.id === "doc-header"
          ? "Encabezado del documento"
          : "Pie del documento"),
    })),
  }));

  // Lo poco que los bloques necesitan de la vista entera. Baja por props: el
  // árbol es de servidor y así queda escrito quién consume qué.
  const ctx: Omit<BlockContext, "sectionId" | "insight" | "compact"> = {
    seal: { slug: view.meta.slug, render: view.render, canVerify: capabilities.canVerify },
    paywallHref: view.meta.paywallCtaHref,
    sample: view.sample,
  };

  const sealBlock = view.chapters
    .flatMap((c) => c.sections)
    .find((s) => s.node.id === "sello-verificacion")
    ?.node.blocks.find((b) => b.kind === "seal");
  const hashShort =
    sealBlock?.kind === "seal"
      ? (sealBlock.certContentHashCorto ??
        view.render?.seal.certContentHash?.slice(0, 12) ??
        null)
      : null;

  return (
    <ReportMotionConfig>
      <main id="main-content" className="min-h-screen bg-bg text-fg">
        <a href={`#${ARTICLE_ID}`} className="skip-link">
          Ir directo al informe
        </a>

        {view.sample && <SampleBanner />}
        {view.shareNotice !== null && <ShareBanner notice={view.shareNotice} />}
        {!capabilities.released && capabilities.estimateNotice !== null && (
          <EstimateNoticeBanner text={capabilities.estimateNotice} />
        )}
        {!view.paid && <PaywallBanner href={view.meta.paywallCtaHref} />}

        <ReportPrintOpener />
        <ReportTopbar
          issuerLabel={view.meta.issuerLabel}
          status={view.status}
          hashShort={hashShort}
          sealAltered={view.render?.seal.state === "altered"}
          downloadHref={downloadHref}
          sample={view.sample}
          canExport={capabilities.canExport}
          canVerify={capabilities.canVerify}
        />

        <div className="mx-auto max-w-[1520px] px-4 md:px-6">
          {/* Bloque en móvil (el índice sticky necesita un ancestro alto), rejilla en lg. */}
          <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-x-8">
            <ReportRail
              chapters={railChapters}
              completeness={view.meta.completeness}
              articleId={ARTICLE_ID}
            />

            <div className="relative min-w-0 py-6 lg:py-8">
              {/* La marca de agua del DS tapiza el lienzo detrás de las tarjetas. */}
              {view.sample && (
                <SampleDataWatermark
                  show
                  label="Datos de muestra"
                  showBadge={false}
                  density="sparse"
                  opacity={0.55}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  <span />
                </SampleDataWatermark>
              )}

              <article
                id={ARTICLE_ID}
                {...(view.sample ? { "data-sample": "true" } : {})}
                className="relative min-w-0 space-y-12"
              >
                {view.chapters.map((chapter, index) => (
                  <ReportChapter
                    key={chapter.id}
                    chapter={chapter}
                    index={index}
                    view={view}
                    ctx={ctx}
                  />
                ))}
              </article>
            </div>
          </div>

          <footer className="mt-4 border-t border-border-faint py-8 text-[12.5px] text-fg-subtle">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p>
                {view.meta.issuerLabel} · Avalúo Nest · política{" "}
                <span className="font-mono">{view.meta.policyVersion}</span>
              </p>
              <p className="font-mono tabular-nums">
                {view.meta.completeness.total} secciones ·{" "}
                {view.chapters.length} bloques
              </p>
            </div>
          </footer>
        </div>
      </main>
    </ReportMotionConfig>
  );
}
