'use client';

/**
 * El panel de la inmobiliaria DIBUJADO, sin ser el panel.
 *
 * Lo pinta `SegundoFactorDentroDelPanel` detrás del paso a paso para activar
 * el segundo factor: la persona tiene que sentir que está en SU panel (Nico,
 * 30-09-2026: «yo estoy es dentro»), pero el panel de verdad no se puede
 * montar todavía — con la sesión en `aal1` el back contesta 403
 * `SEGUNDO_FACTOR_REQUERIDO` a casi todo, y cada provider, cada badge del
 * sidebar y cada tarjeta dispararía su pedido y su toast de error.
 *
 * Por eso esto es PURAMENTE presentacional: cero fetches, cero contextos de
 * datos, cero hooks. Copia la geometría del layout real —sidebar de 240 px
 * desde `lg`, cabecera de 64 px, contenido con el mismo tope de ancho, la
 * barra de abajo en teléfono— para que, al activar, el panel aparezca en el
 * mismo sitio en vez de saltar. Las barras NO laten (`animate-pulse`): no se
 * está cargando nada, se está esperando a la persona.
 */

/** Una barra gris del esqueleto. */
function Barra({ className }: { className: string }) {
  return <div className={`rounded-full bg-muted ${className}`} />;
}

/** Anchos fijos (no aleatorios): el esqueleto se ve igual en cada render. */
const FILAS_DEL_MENU = ['w-16', 'w-12', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20', 'w-14', 'w-24', 'w-16'];
const FILAS_DE_LA_TABLA = ['w-40', 'w-32', 'w-44', 'w-28', 'w-36', 'w-40'];

export interface EsqueletoDelPanelProps {
  /** El nombre de la inmobiliaria (de la sesión, sin pedir nada). */
  nombre?: string | null;
}

export function EsqueletoDelPanel({ nombre }: EsqueletoDelPanelProps) {
  const inicial = nombre?.trim().charAt(0).toUpperCase() || 'L';
  return (
    <div className="min-h-screen bg-plan-page" data-testid="esqueleto-del-panel">
      {/* Sidebar — la misma caja que `PlanSidebar` (oculto bajo `lg`). */}
      <aside className="hidden border-r border-border bg-bg lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col">
        <div className="flex h-16 items-center gap-2.5 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft font-heading text-body-sm font-medium text-primary">
            {inicial}
          </div>
          {nombre?.trim() ? (
            <span className="min-w-0 truncate text-body-sm font-medium text-fg">{nombre.trim()}</span>
          ) : (
            <Barra className="h-3 w-28" />
          )}
        </div>
        <div className="space-y-2 px-3">
          <div className="h-9 rounded-full border border-border bg-surface" />
          <div className="h-9 rounded-full bg-muted" />
        </div>
        <div className="mt-6 space-y-1 px-3">
          {FILAS_DEL_MENU.map((ancho, i) => (
            <div key={i}>
              {i === 2 || i === 6 ? <Barra className="mb-3 ml-2 mt-5 h-2 w-14" /> : null}
              <div className="flex h-9 items-center gap-3 px-2">
                <div className="size-[18px] shrink-0 rounded-[5px] bg-muted" />
                <Barra className={`h-2.5 ${ancho}`} />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="pb-20 lg:pb-0 lg:pl-[240px]">
        {/* Cabecera — la de `PlanHeader`. */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-muted lg:hidden" />
            <Barra className="h-2.5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-8 w-28 rounded-full bg-muted sm:block" />
            <div className="size-8 rounded-full bg-muted" />
            <div className="size-8 rounded-full bg-muted" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1920px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="space-y-3">
            <Barra className="h-6 w-56 max-w-full" />
            <Barra className="h-3 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 rounded-lg border border-border bg-surface p-4">
                <Barra className="h-2.5 w-20" />
                <Barra className="h-5 w-24" />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-4 border-b border-border px-4 py-4">
              <Barra className="h-3 w-24" />
              <Barra className="h-3 w-16" />
              <Barra className="h-3 w-20" />
            </div>
            {FILAS_DE_LA_TABLA.map((ancho, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
                <div className="size-8 shrink-0 rounded-full bg-muted" />
                <Barra className={`h-2.5 ${ancho} max-w-[40%]`} />
                <Barra className="ml-auto h-2.5 w-16" />
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* La barra de abajo en teléfono — la de `MobileNavBar`. */}
      <div className="fixed inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-border bg-bg lg:hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="size-6 rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
