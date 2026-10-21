'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { GenerarDispersion } from '@/components/inmobiliaria/dispersion/GenerarDispersion';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

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

  // GLOW UP 21-10: el encabezado común (sección, título, para qué sirve) con la
  // vuelta arriba, como las demás pantallas de Pagos; sin la franja aparte.
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/panel/inmobiliaria/pagos/dispersiones" label={t('inmobiliaria.common.back')} />
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.dispersiones')}
        titulo={t('inmobiliaria.dispersiones.wizard.title')}
        descripcion={t('inmobiliaria.dispersiones.subtitle')}
      />
      <GenerarDispersion onComplete={handleComplete} onCancel={handleCancel} />
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
