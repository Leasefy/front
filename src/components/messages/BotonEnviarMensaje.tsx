'use client';

/**
 * «Enviar mensaje» desde donde estés parado.
 *
 * El cajón de la bandeja sirve para buscar a alguien; esto es lo otro: ya
 * estás mirando la ficha de un inquilino o de un propietario y querés
 * escribirle sin volver a buscarlo.
 *
 * Abre (o reabre) el hilo directo y navega a la bandeja con ese hilo
 * seleccionado. Si la persona todavía no tiene cuenta en el portal, el back lo
 * dice con `SIN_CUENTA` y acá se cuenta tal cual: no es «no tienen nada en
 * común», es que no hay dónde escribirle todavía.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';

import { Button } from '@/components/ui/button';
import { messagesApi } from '@/lib/api/messages.service';
import { ApiError } from '@/lib/api/client';

/** A dónde vuelve cada perfil a leer sus mensajes. */
export type BandejaDestino = 'inmobiliaria' | 'inquilino' | 'propietario';

const RUTA: Record<BandejaDestino, string> = {
  inmobiliaria: '/panel/inmobiliaria/mensajes',
  inquilino: '/inquilino/mensajes',
  propietario: '/panel/mensajes',
};

interface Props {
  /** La persona a la que le escribe la inmobiliaria. */
  counterpartId?: string;
  /** La inmobiliaria a la que le escribe un inquilino o un propietario. */
  agencyId?: string;
  bandeja?: BandejaDestino;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default';
  className?: string;
  etiqueta?: string;
}

export function BotonEnviarMensaje({
  counterpartId,
  agencyId,
  bandeja = 'inmobiliaria',
  variant = 'outline',
  size = 'sm',
  className,
  etiqueta = 'Enviar mensaje',
}: Props) {
  const router = useRouter();
  const [abriendo, setAbriendo] = useState(false);

  const abrir = async () => {
    setAbriendo(true);
    try {
      const { conversationId } = await messagesApi.abrirHiloDirecto(
        counterpartId ? { counterpartId } : { agencyId },
      );
      router.push(`${RUTA[bandeja]}?conversationId=${conversationId}`);
    } catch (err) {
      toast.error(mensajeDeFallo(err));
      setAbriendo(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      hideArrow
      isLoading={abriendo}
      disabled={abriendo || (!counterpartId && !agencyId)}
      onClick={() => void abrir()}
      className={className}
      data-testid="enviar-mensaje"
    >
      <PaperPlaneTilt className="h-4 w-4" weight="fill" />
      {etiqueta}
    </Button>
  );
}

/** Cada motivo se cuenta como lo que es; ninguno como «algo salió mal». */
function mensajeDeFallo(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'No pudimos abrir la conversación. Intentá de nuevo.';
  }
  if (err.status === 404) {
    return 'Esa persona todavía no tiene cuenta en Leasefy, así que no hay dónde escribirle.';
  }
  if (err.status === 403) {
    return 'Solo podés escribirle a alguien con quien tengas un inmueble o un contrato en común.';
  }
  return 'No pudimos abrir la conversación. Intentá de nuevo.';
}
