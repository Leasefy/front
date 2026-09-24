'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CaretLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import { GenerarDispersion } from '@/components/inmobiliaria/dispersion/GenerarDispersion';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';

/**
 * La pantalla de generar la dispersión del mes.
 * Ruta: /panel/inmobiliaria/pagos/dispersiones/generar
 *
 * Adentro ya no hay un asistente de seis pasos: es UNA pantalla que pregunta a
 * quién se le gira y confirma ahí mismo (ver `GenerarDispersion`).
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
  const handleComplete = (month: string) => {
    router.push(`/panel/inmobiliaria/pagos/dispersiones?mes=${month}`);
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
        {/* 🔴 Nico, 22-09: «¿por qué no utilizas todo el ancho? ¡para eso lo
            tienes!». Esta pantalla tenía DOS topes distintos —el encabezado en
            `max-w-4xl` (896 px) y el contenido en `max-w-6xl` (1152 px)—, así
            que en un monitor de 1.900 px sobraba media pantalla Y el botón de
            volver ni siquiera quedaba alineado con las tarjetas de abajo. El
            panel ya tiene su tope (1.920 px) en su layout: acá no va ninguno. */}
        <div className="px-6 py-4 lg:px-8">
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
        className="px-6 py-6 lg:px-8"
      >
        <GenerarDispersion onComplete={handleComplete} onCancel={handleCancel} />
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
