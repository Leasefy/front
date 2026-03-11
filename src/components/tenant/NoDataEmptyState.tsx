'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { House, FileText, CreditCard, Folder, Chat, Heart, ArrowUpRight, MagnifyingGlass } from '@phosphor-icons/react';
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
    ctaHref: '/propiedades',
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
    ctaEn: 'MagnifyingGlass properties',
    ctaHref: '/propiedades',
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
    ctaHref: '/propiedades',
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
    ctaHref: '/propiedades',
  },
  saved: {
    icon: Heart,
    titleEs: 'Sin propiedades guardadas',
    titleEn: 'No saved properties',
    descriptionEs: 'Guarda propiedades que te interesen para compararlas después y no perderlas de vista.',
    descriptionEn: 'FloppyDisk properties you like to compare them later and keep track of them.',
    ctaEs: 'Buscar propiedades',
    ctaEn: 'MagnifyingGlass properties',
    ctaHref: '/propiedades',
  },
};

/**
 * Empty state for when tenant has completed onboarding but has no data
 * Used on sub-pages (arriendo, aplicaciones, pagos, etc.)
 */
export function NoDataEmptyState({ context }: NoDataEmptyStateProps) {
  const { locale } = useI18n();
  const config = EMPTY_STATE_CONFIG[context];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-12 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-white dark:bg-[#2a2a2c] flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Icon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
      </div>

      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
        {locale === 'es' ? config.titleEs : config.titleEn}
      </h3>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
        {locale === 'es' ? config.descriptionEs : config.descriptionEn}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={config.ctaHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
        >
          <MagnifyingGlass className="w-4 h-4" />
          {locale === 'es' ? config.ctaEs : config.ctaEn}
        </Link>

        {config.secondaryHref && (
          <Link
            href={config.secondaryHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {locale === 'es' ? config.secondaryEs : config.secondaryEn}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
