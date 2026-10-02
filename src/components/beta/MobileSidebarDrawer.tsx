'use client';

import { useI18n } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * MobileSidebarDrawer — la barra del chat en el celular.
 *
 * Desde el 02-10-2026 es el `Sheet` flotante, como todo cajón del producto
 * (DESIGN.md §4 «Drawers»): era el último armado a mano (velo + panel `fixed
 * inset-y-0 left-0` con su propio Esc y su propio bloqueo del scroll). La
 * primitiva pone el portal, el foco atrapado y devuelto, Esc, el velo, la
 * capa `z-[300]` y la ✕ del producto; `SmoothScroll` frena Lenis mientras está
 * abierto.
 *
 * Lateral (`mobile="side"`), no hoja desde abajo: es navegación, como la barra
 * del panel (`PlanSidebar`). La barra arma su propio layout (`layout="manual"`)
 * y el título va sólo para el lector de pantalla. La ✕ conserva su fila arriba,
 * como antes, para no montarse sobre el selector de apps de `BetaSidebar`.
 */
export function MobileSidebarDrawer({ open, onClose, children }: MobileSidebarDrawerProps) {
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent
        side="left"
        mobile="side"
        layout="manual"
        aria-describedby={undefined}
        closeLabel={t('beta.mobile.closeMenu')}
        // 280 px como antes; la barra trae su propio borde derecho y su ancho
        // fijo, que dentro del cajón flotante sobran.
        className="w-[280px] bg-bg [&_aside]:w-full [&_aside]:border-r-0"
        data-testid="cajon-del-chat"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t('beta.a11y.sidebarNav')}</SheetTitle>
        </SheetHeader>
        {/* La fila de la ✕ (la pone `SheetContent`, arriba a la derecha). */}
        <div className="h-14 shrink-0" aria-hidden="true" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
