'use client';

/**
 * Pagination — THIN SHIM over @leasefy/ui.
 *
 * La implementación real vive en el design system (~/rent/design-system):
 * footer de tabla estilo Manus ("X filas · Filas por página · n/m · ‹ ›").
 *
 * Nota: la familia composable legacy (PaginationRoot, PaginationContent,
 * PaginationItem, PaginationLink, PaginationButton, PaginationPrevious/Next/
 * First/Last, PaginationEllipsis) no tenía NINGÚN call site en el mvp, por lo
 * que se retiró al adoptar el componente del DS. Si se necesita de nuevo,
 * importar el patrón compuesto directamente de '@leasefy/ui' o recuperar la
 * versión anterior del historial.
 */

export { Pagination } from '@leasefy/ui';
export type { PaginationProps } from '@leasefy/ui';
