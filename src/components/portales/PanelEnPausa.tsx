'use client';

import { Buildings } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/empty-state';
import { leerFallo } from '@/lib/errores/traductor-de-errores';
import { useTr } from '@/lib/i18n/use-tr';

/** El código con que el back corta el panel del propietario independiente (503, `el-panel-del-propietario-independiente.ts`). */
export const CODIGO_PANEL_EN_PAUSA = 'PANEL_PROPIETARIO_INDEPENDIENTE_CONGELADO';

/** ¿El fallo es la pausa del panel independiente (y no una caída)? */
export function esElPanelEnPausa(error: unknown): boolean {
  if (!error) return false;
  return leerFallo(error).code === CODIGO_PANEL_EN_PAUSA;
}

/**
 * Ronda 28 (revisora r27, Mis inmuebles y Candidatos): la pausa del panel del
 * propietario independiente (decisión r24 #3 de Nico) es un ESTADO, no un error.
 * Antes salía como fallo: «Reintentar» y «escríbenos con la referencia…», y en
 * Candidatos con otra voz («Fue un problema nuestro…»). Una pausa no se reintenta:
 * dice qué pasa, a quién le sirve qué y la salida (escribirnos). Una sola voz en
 * las dos pantallas.
 */
export function PanelEnPausa() {
  const tr = useTr();
  return (
    <section className="rounded-lg border border-border bg-surface" data-testid="panel-en-pausa">
      <EmptyState
        icon={Buildings}
        ilustracion="casa"
        title={tr('Tu panel de propietario está en pausa')}
        description={tr(
          'Mientras tanto no se ven tus inmuebles ni tus candidatos. Si una inmobiliaria administra tu inmueble, entra por el portal que ella te dio; si no, escríbenos y te contamos cuándo vuelve.',
        )}
        action={{ label: tr('Escribir a hola@leasefy.co'), href: 'mailto:hola@leasefy.co' }}
      />
    </section>
  );
}
