'use client';

import { House, FileText, CreditCard, Folder, Chat, Heart } from '@phosphor-icons/react';
import { EmptyState } from '@/components/data-display/EmptyState';
import { useI18n } from '@/lib/i18n';

type EmptyStateContext = 'rental' | 'applications' | 'payments' | 'documents' | 'messages' | 'saved';

interface NoDataEmptyStateProps {
  context: EmptyStateContext;
}

const EMPTY_STATE_CONFIG: Record<EmptyStateContext, {
  icon: typeof House;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  ctaEs: string;
  ctaEn: string;
  ctaHref: string;
  secondaryEs?: string;
  secondaryEn?: string;
  secondaryHref?: string;
}> = {
  rental: {
    icon: House,
    titleEs: 'Sin arriendos activos',
    titleEn: 'No active rentals',
    descriptionEs: 'Cuando firmes un contrato de arriendo, aparecerá aquí con todos sus detalles.',
    descriptionEn: 'When you sign a rental contract, it will appear here with all its details.',
    ctaEs: 'Explorar propiedades',
    ctaEn: 'Browse properties',
    ctaHref: '/inquilino/explorar',
    secondaryEs: 'Ver mis aplicaciones',
    secondaryEn: 'View my applications',
    secondaryHref: '/inquilino/aplicaciones',
  },
  applications: {
    icon: FileText,
    titleEs: 'Sin aplicaciones',
    titleEn: 'No applications',
    descriptionEs: 'Aún no has aplicado a ninguna propiedad. Encuentra tu próximo hogar y envía tu primera aplicación.',
    descriptionEn: "You haven't applied to any property yet. Find your next home and submit your first application.",
    ctaEs: 'Buscar propiedades',
    ctaEn: 'Search properties',
    ctaHref: '/inquilino/explorar',
    secondaryEs: 'Ver guardados',
    secondaryEn: 'View saved',
    secondaryHref: '/inquilino/guardados',
  },
  payments: {
    icon: CreditCard,
    titleEs: 'Sin historial de pagos',
    titleEn: 'No payment history',
    descriptionEs: 'Cuando tengas un arriendo activo, aquí podrás ver y gestionar tus pagos mensuales.',
    descriptionEn: 'When you have an active rental, you can view and manage your monthly payments here.',
    ctaEs: 'Explorar propiedades',
    ctaEn: 'Browse properties',
    ctaHref: '/inquilino/explorar',
    secondaryEs: 'Ver mi arriendo',
    secondaryEn: 'View my rental',
    secondaryHref: '/inquilino/arriendo',
  },
  documents: {
    icon: Folder,
    titleEs: 'Sin documentos',
    titleEn: 'No documents',
    descriptionEs: 'Tus contratos, recibos y otros documentos importantes aparecerán aquí cuando los tengas.',
    descriptionEn: 'Your contracts, receipts, and other important documents will appear here when you have them.',
    ctaEs: 'Ver mi arriendo',
    ctaEn: 'View my rental',
    ctaHref: '/inquilino/arriendo',
  },
  messages: {
    icon: Chat,
    titleEs: 'Sin mensajes',
    titleEn: 'No messages',
    descriptionEs: 'Cuando apliques a propiedades, podrás comunicarte con los propietarios aquí.',
    descriptionEn: 'When you apply to properties, you can communicate with landlords here.',
    ctaEs: 'Explorar propiedades',
    ctaEn: 'Browse properties',
    ctaHref: '/inquilino/explorar',
  },
  saved: {
    icon: Heart,
    titleEs: 'Sin propiedades guardadas',
    titleEn: 'No saved properties',
    descriptionEs: 'Guarda propiedades que te interesen para compararlas después y no perderlas de vista.',
    descriptionEn: 'Save properties you like to compare them later and keep track of them.',
    ctaEs: 'Buscar propiedades',
    ctaEn: 'Search properties',
    ctaHref: '/inquilino/explorar',
  },
};

/**
 * Empty state for when tenant has completed onboarding but has no data.
 * Used on sub-pages (arriendo, aplicaciones, pagos, etc.).
 *
 * Estilo limpio canónico (2026-06-16): delega en la primitiva universal
 * <EmptyState /> — chip neutro + ícono mudo en gris + título + descripción +
 * CTA pill outlined. Sin caja con borde/fondo, sin azul de marca, sin
 * ilustraciones ni animación de entrada decorativa.
 */
export function NoDataEmptyState({ context }: NoDataEmptyStateProps) {
  const { locale } = useI18n();
  const config = EMPTY_STATE_CONFIG[context];

  const primaryCta = {
    label: locale === 'es' ? config.ctaEs : config.ctaEn,
    href: config.ctaHref,
  };

  const secondaryCta = config.secondaryHref
    ? {
        label: locale === 'es' ? (config.secondaryEs as string) : (config.secondaryEn as string),
        href: config.secondaryHref,
      }
    : undefined;

  return (
    <EmptyState
      icon={config.icon}
      title={locale === 'es' ? config.titleEs : config.titleEn}
      description={locale === 'es' ? config.descriptionEs : config.descriptionEn}
      primaryCta={primaryCta}
      secondaryCta={secondaryCta}
    />
  );
}
