/**
 * PortalPlaceholder — shell honesto "Próximamente" para las secciones del Portal del Propietario
 * (v8-01, fundación). Cada pilar (Mi plata / Elegir inquilino / Solicitudes / Novedades) monta este
 * shell hasta que su ola (v8-02..v8-05) lo reemplaza con la vista real cableada al back.
 *
 * Es un empty-state HONESTO: mientras el back del portal esté flag-OFF (o el owner-JWT no esté
 * cableado), no hay data que mostrar y NUNCA se fabrica. Cuando Victor encienda el portal, cada ola
 * ya trae la vista real que consume `useOwnerPortal` + los servicios owner-facing.
 */
import type { Icon } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/empty-state';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

export interface PortalPlaceholderProps {
  /** Título de la sección (header). */
  title: string;
  /** Subtítulo que describe el valor de la sección. */
  subtitle: string;
  /** Icono Phosphor de la sección. */
  icon: Icon;
  /** Descripción del empty-state (por qué está vacío hoy + qué mostrará). */
  emptyDescription: string;
  /** El sobretítulo: la sección del menú (revisora r25). */
  seccion?: string;
  /** El título del vacío. Por defecto «Próximamente». */
  tituloDelVacio?: string;
  /** Lo que la persona SÍ tiene, para no dejarla en un vacío sin salida (revisora r25). */
  accion?: { label: string; href: string };
}

export function PortalPlaceholder({ title, subtitle, icon, emptyDescription, seccion, tituloDelVacio, accion }: PortalPlaceholderProps) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="p-6 lg:p-8">
        <EncabezadoDePantalla seccion={seccion} titulo={title} descripcion={subtitle} />
        <div className="mt-8">
          <EmptyState
            ilustracion="casa"
            icon={icon}
            title={tituloDelVacio ?? 'Próximamente'}
            description={emptyDescription}
            action={accion}
          />
        </div>
      </div>
    </div>
  );
}
