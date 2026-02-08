'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CaretLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DispersionWizard } from '@/components/inmobiliaria';
import type { Dispersion } from '@/lib/types/inmobiliaria';

/**
 * GenerarDispersionesPage - Wrapper page for DispersionWizard
 * Route: /panel/inmobiliaria/dispersiones/generar
 */
export default function GenerarDispersionesPage() {
  const router = useRouter();

  const handleComplete = (dispersiones: Dispersion[]) => {
    toast.success('Dispersiones generadas correctamente', {
      description: `Se generaron ${dispersiones.length} dispersiones`,
    });
    router.push('/panel/inmobiliaria/dispersiones');
  };

  const handleCancel = () => {
    router.push('/panel/inmobiliaria/dispersiones');
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
            <Link
              href="/panel/inmobiliaria/dispersiones"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <CaretLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <PaperPlaneTilt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Generar Dispersiones del Mes
                </h1>
                <p className="text-sm text-muted-foreground">
                  Calcula y genera los pagos a propietarios
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
