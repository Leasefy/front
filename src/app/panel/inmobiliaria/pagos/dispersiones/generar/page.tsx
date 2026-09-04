'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CaretLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DispersionWizard } from '@/components/inmobiliaria';
import type { Dispersion } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';

/**
 * GenerarDispersionesPage - Wrapper page for DispersionWizard
 * Route: /panel/inmobiliaria/pagos/dispersiones/generar
 */
function GenerarDispersionesContent() {
  const { t } = useI18n();
  const router = useRouter();

  /**
   * El asistente ya avisó, con el número que devolvió el back.
   *
   * Acá había un SEGUNDO `toast.success` que contaba `dispersiones.length` — y
   * el asistente llama a `onComplete([])`, así que anunciaba «0 dispersiones»
   * pegado al aviso correcto. Dos mensajes sobre la misma acción, y el que
   * sobraba era el falso.
   *
   * Se vuelve al mes que se acaba de generar: la lista abre en el mes actual,
   * así que generar las de julio y caer en agosto vacío se lee como que no
   * pasó nada.
   */
  const handleComplete = (_dispersiones: Dispersion[], month?: string) => {
    router.push(
      month
        ? `/panel/inmobiliaria/pagos/dispersiones?mes=${month}`
        : '/panel/inmobiliaria/pagos/dispersiones',
    );
  };

  const handleCancel = () => {
    router.push('/panel/inmobiliaria/pagos/dispersiones');
  };

  return (
    <div className="min-h-screen bg-plan-page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border bg-background"
      >
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" hideArrow>
              <Link href="/panel/inmobiliaria/pagos/dispersiones">
                <CaretLeft className="w-5 h-5" />
                <span className="hidden sm:inline">{t('inmobiliaria.common.back')}</span>
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
                <PaperPlaneTilt className="w-5 h-5 text-primary" weight="fill" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-fg">
                  {t('inmobiliaria.dispersiones.wizard.title')}
                </h1>
                <p className="text-sm text-fg-muted">
                  {t('inmobiliaria.dispersiones.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wizard Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="container max-w-4xl mx-auto px-4 py-8"
      >
        <DispersionWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </motion.div>
    </div>
  );
}

export default function GenerarDispersionesPage() {
  return (
    <PageGuard module="dispersiones">
      <GenerarDispersionesContent />
    </PageGuard>
  );
}
