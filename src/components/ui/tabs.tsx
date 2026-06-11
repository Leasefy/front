'use client';

/**
 * SHIM: Tabs del DS (@leasefy/ui) — Radix + dos variants en TabsList:
 *   - "underline" (default): hairline border-b, texto activo ink, indicador primary.
 *   - "segmented": control segmentado quieto (surface-muted + fill surface, sin sombra).
 *
 * Uso: <TabsList variant="segmented"> … — los call sites no deben re-pintar
 * estados activos; el contrato de marca vive en el DS.
 */
export { Tabs, TabsList, TabsTrigger, TabsContent } from '@leasefy/ui';
export type { TabsListProps } from '@leasefy/ui';
