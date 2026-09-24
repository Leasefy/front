'use client';

/**
 * «Ver soporte» de un descuento. El archivo vive en un bucket privado: se pide
 * una URL firmada de una hora en el momento del clic —nunca se guarda una que
 * vence— y se abre en otra pestaña.
 */

import { useState } from 'react';
import { Paperclip } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { deduccionesApi } from '@/lib/api/deducciones.service';
import { useI18n } from '@/lib/i18n';

export function SoporteDeLaDeduccion({
  propietarioId,
  deduccionId,
  nombre,
}: {
  propietarioId: string;
  deduccionId: string;
  nombre: string | null;
}) {
  const { t } = useI18n();
  const [abriendo, setAbriendo] = useState(false);

  const abrir = async () => {
    // La pestaña se abre ANTES de esperar al back: un `window.open` después de
    // un `await` lo bloquea el navegador como ventana emergente.
    const pestana = window.open('', '_blank', 'noopener');
    setAbriendo(true);
    try {
      const { url } = await deduccionesApi.urlDelSoporte(propietarioId, deduccionId);
      if (pestana) pestana.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (error) {
      pestana?.close();
      toast.error(t('inmobiliaria.deducciones.noSeAbrioSoporte'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <Button
      variant="link"
      size="sm"
      hideArrow
      onClick={() => void abrir()}
      disabled={abriendo}
      className="h-auto gap-1 px-0 text-xs"
      title={nombre ?? undefined}
      data-testid={`soporte-${deduccionId}`}
    >
      <Paperclip className="h-3.5 w-3.5" />
      {abriendo ? t('inmobiliaria.deducciones.abriendoSoporte') : t('inmobiliaria.deducciones.verSoporte')}
    </Button>
  );
}
