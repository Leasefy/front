'use client';

/**
 * «Dejaste un inmueble a medio cargar.»
 *
 * W4 — el borrador se guarda solo, pero NUNCA se aplica solo. Que el
 * asistente aparezca ya lleno al entrar es peor que perder el trabajo: nadie
 * sabe de dónde salieron esos datos, y quien venía a cargar OTRO inmueble
 * termina publicando el anterior con dos campos cambiados. Por eso el
 * asistente arranca en blanco y acá se ofrecen los dos caminos, con la fecha a
 * la vista para que se sepa de cuándo es.
 *
 * Descartar sí pregunta: es la única acción de esta pantalla que borra trabajo
 * y no se puede deshacer.
 */

import { useState } from 'react';
import { ClockClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';

interface Props {
  /** Cuándo se guardó por última vez (ms). */
  actualizadoEn: number;
  /** En qué paso quedó y cuántos hay, para decir «paso 3 de 6». */
  paso: number;
  totalDePasos: number;
  fotos: number;
  /** El navegador no pudo guardar las fotos: hay que volver a elegirlas. */
  fotosNoGuardadas?: boolean;
  onContinuar: () => void;
  onDescartar: () => void;
}

/** Fecha larga en español: «14 de septiembre, 03:12 p. m.». */
export function cuando(ms: number, locale: string): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AvisoDeBorradorDePublicacion({
  actualizadoEn,
  paso,
  totalDePasos,
  fotos,
  fotosNoGuardadas,
  onContinuar,
  onDescartar,
}: Props) {
  const { t, locale } = useI18n();
  const [preguntar, setPreguntar] = useState(false);

  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-warning/30 bg-warning-soft p-4"
    >
      <div className="flex items-start gap-3">
        <ClockClockwise size={18} weight="regular" className="mt-0.5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-medium text-warning">
            {t('inmobiliaria.consignaciones.wizard.borrador.titulo')}
          </p>
          <p className="mt-1 text-sm text-warning">
            {t('inmobiliaria.consignaciones.wizard.borrador.detalle', {
              fecha: cuando(actualizadoEn, locale),
              paso,
              total: totalDePasos,
            })}
            {fotos > 0
              ? ` ${t('inmobiliaria.consignaciones.wizard.borrador.conFotos', { fotos })}`
              : ''}
          </p>
          {fotosNoGuardadas && (
            <p className="mt-1 text-sm text-warning">
              {t('inmobiliaria.consignaciones.wizard.borrador.fotosNoGuardadas')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" hideArrow onClick={onContinuar}>
          {t('inmobiliaria.consignaciones.wizard.borrador.continuar')}
        </Button>
        <Button size="sm" variant="secondary" hideArrow onClick={() => setPreguntar(true)}>
          {t('inmobiliaria.consignaciones.wizard.borrador.descartar')}
        </Button>
      </div>

      <AlertDialog open={preguntar} onOpenChange={setPreguntar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('inmobiliaria.consignaciones.wizard.borrador.dialogo.titulo')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('inmobiliaria.consignaciones.wizard.borrador.dialogo.descripcion')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('inmobiliaria.consignaciones.wizard.borrador.dialogo.conservar')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPreguntar(false);
                onDescartar();
              }}
            >
              {t('inmobiliaria.consignaciones.wizard.borrador.dialogo.descartar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AvisoDeBorradorDePublicacion;
