/**
 * Doble de prueba de `@/components/ui/sheet`: las piezas del cajón como DOM
 * plano, sin Radix ni portal. `SheetTitle` de verdad es un `Dialog.Title` y
 * revienta fuera de un `Dialog`; acá es un `<h2>`.
 *
 * Uso — cada prueba conserva su propio `Sheet`/`SheetContent` si los necesita:
 *
 *   vi.mock('@/components/ui/sheet', async () => ({
 *     ...(await import('@/components/ui/sheet-test-stub')),
 *     SheetContent: …,
 *   }))
 *
 * Pinta TODO lo que las piezas reciben (título, subtítulo, acciones, `start`,
 * `note`) y conserva las marcas que las pruebas miran: `data-sheet-band`, el
 * filete `border-b`/`border-t` de cabecera y pie, y `overflow-y-auto` en el cuerpo.
 */
import * as React from 'react';

type ConHijos = { children?: React.ReactNode };

export const Sheet = ({ open, children }: ConHijos & { open?: boolean }) =>
  open === false ? null : <>{children}</>;

export const SheetTrigger = ({ children }: ConHijos) => <>{children}</>;
export const SheetClose = ({ children }: ConHijos) => <>{children}</>;
export const SheetPortal = ({ children }: ConHijos) => <>{children}</>;
export const SheetOverlay = () => null;

export const SheetContent = ({
  children,
  ...resto
}: ConHijos & Record<string, unknown>) => (
  <div data-testid={resto['data-testid'] as string | undefined}>{children}</div>
);

export const SheetTitle = ({ children }: ConHijos) => <h2>{children}</h2>;
export const SheetDescription = ({ children }: ConHijos) => <p>{children}</p>;

export const SheetHeader = ({
  title,
  description,
  leading,
  actions,
  children,
}: ConHijos & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div data-sheet-band="header" className="border-b">
    {leading}
    {title != null ? <h2>{title}</h2> : null}
    {description != null ? <p>{description}</p> : null}
    {children}
    {actions}
  </div>
);

export const SheetNav = ({
  position,
  total,
  context,
}: {
  position: number;
  total: number;
  context?: React.ReactNode;
}) => (
  <nav data-sheet-band="nav" className="border-b">
    {position} de {total} {context}
  </nav>
);

export const SheetBody = ({ children, className }: ConHijos & { className?: string }) => (
  <div data-sheet-band="body" className={['overflow-y-auto', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const SheetFooter = ({
  start,
  note,
  children,
}: ConHijos & { start?: React.ReactNode; note?: React.ReactNode }) => (
  <div data-sheet-band="footer" className="border-t">
    {note}
    {start}
    {children}
  </div>
);

export const SheetSection = ({
  title,
  description,
  actions,
  children,
}: ConHijos & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <section>
    {title != null ? <h3>{title}</h3> : null}
    {description != null ? <p>{description}</p> : null}
    {actions}
    {children}
  </section>
);

/** La tabla a sangre: conserva su marca `data-sheet-table` (DESIGN.md, «Contenido alineado al padding»). */
export const SheetTable = ({ children, className }: ConHijos & { className?: string }) => (
  <div data-sheet-table="" className={className}>
    {children}
  </div>
);

export const RELLENO_DEL_CAJON = 'px-6';
export const FILA_ANCHA_DE_LA_CABECERA = 'group-data-[close=true]/sheet:-mr-12';
