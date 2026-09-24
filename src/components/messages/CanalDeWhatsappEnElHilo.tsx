'use client';

/**
 * El puente entre el chat de Leasefy y el WhatsApp del inquilino o del
 * propietario, contado en la pantalla.
 *
 * Nico (2026-09-12): «Los mensajes que salgan de la inmobiliaria hacia el
 * inquilino o hacia el propietario deberían poder salir hacia el WhatsApp
 * donde tenemos el número. Lo que ellos contesten nos llega y se refleja en el
 * feature de chats.»
 *
 * Dos piezas, las dos sin inventar nada:
 *   · el aviso de arriba del hilo, que dice si lo que se escriba acá también
 *     le llega por WhatsApp —y a qué número— o por qué no;
 *   · la píldora debajo de cada burbuja con en qué quedó ese mensaje.
 *
 * Un mensaje sin estado no pinta nada: quiere decir que sólo vivió en la
 * plataforma, no que «se envió».
 */

import { CheckCircle, Warning, WhatsappLogo } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type {
  CanalDeWhatsapp,
  EstadoDeWhatsapp,
  MotivoDelCanalDeWhatsapp,
} from '@/lib/api/messages.types';

type Locale = 'es' | 'en' | string;

const MOTIVOS: Record<
  MotivoDelCanalDeWhatsapp,
  { es: string; en: string }
> = {
  ok: { es: '', en: '' },
  no_aplica: { es: '', en: '' },
  sin_consentimiento: {
    es: 'Todavía no autorizó que le escribamos por WhatsApp. Puedes activarlo en su ficha.',
    en: 'They have not authorized WhatsApp yet. You can turn it on from their profile.',
  },
  sin_telefono: {
    es: 'No tenemos su teléfono, así que esto no sale por WhatsApp.',
    en: 'We have no phone for them, so this does not go out over WhatsApp.',
  },
  ambiguo: {
    es: 'Su ficha tiene más de un número en el mismo campo: no elegimos por ti. Déjale uno solo para poder escribirle.',
    en: 'Their profile has more than one number in the same field: we will not pick for you. Leave a single one to message them.',
  },
  invalido: {
    es: 'El teléfono que tenemos no es un celular al que se le pueda escribir por WhatsApp.',
    en: 'The phone we have is not a mobile that can receive WhatsApp.',
  },
};

/** El aviso de arriba del hilo. */
export function AvisoDeWhatsapp({
  canal,
  locale,
}: {
  canal: CanalDeWhatsapp;
  locale: Locale;
}) {
  const es = locale === 'es';
  const quien = canal.nombre ?? (es ? 'esta persona' : 'this person');

  if (canal.puedeEnviar) {
    return (
      <div
        data-testid="aviso-whatsapp"
        className="flex items-start gap-3 border-b border-border bg-success-soft/40 px-6 py-3"
      >
        <WhatsappLogo className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" weight="fill" aria-hidden />
        <p className="text-sm text-foreground">
          {es
            ? `Este hilo también llega al WhatsApp de ${quien} ${canal.telefono ?? ''}`.trim()
            : `This thread also reaches ${quien}'s WhatsApp ${canal.telefono ?? ''}`.trim()}
        </p>
      </div>
    );
  }

  const detalle = MOTIVOS[canal.motivo]?.[es ? 'es' : 'en'] ?? '';
  return (
    <div
      data-testid="aviso-whatsapp"
      className="flex items-start gap-3 border-b border-border bg-warning-soft/40 px-6 py-3"
    >
      <Warning className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" weight="fill" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {es
            ? `Esto NO le llega por WhatsApp a ${quien}`
            : `This does NOT reach ${quien} on WhatsApp`}
        </p>
        {detalle !== '' && <p className="mt-0.5 text-caption text-muted-foreground">{detalle}</p>}
      </div>
    </div>
  );
}

const ESTADOS: Record<EstadoDeWhatsapp, { es: string; en: string; clases: string }> = {
  ENCOLADO: { es: 'WhatsApp: en cola', en: 'WhatsApp: queued', clases: 'bg-surface-muted text-fg-muted' },
  ENVIADO: { es: 'WhatsApp: enviado', en: 'WhatsApp: sent', clases: 'bg-info-soft text-info' },
  ENTREGADO: { es: 'WhatsApp: entregado', en: 'WhatsApp: delivered', clases: 'bg-success-soft text-success' },
  LEIDO: { es: 'WhatsApp: leído', en: 'WhatsApp: read', clases: 'bg-success-soft text-success' },
  FALLO: { es: 'WhatsApp: falló', en: 'WhatsApp: failed', clases: 'bg-danger-soft text-danger' },
  // No se dice «enviado» cuando no salió: sin llave del proveedor el envío es
  // una simulación de desarrollo y la pantalla lo dice tal cual.
  SIMULADO: { es: 'WhatsApp: simulado', en: 'WhatsApp: simulated', clases: 'bg-warning-soft text-warning' },
  RECIBIDO: { es: 'Llegó por WhatsApp', en: 'Came in over WhatsApp', clases: 'bg-info-soft text-info' },
};

/** La píldora debajo de la burbuja. Sin estado, no pinta nada. */
export function EstadoDeWhatsappEnMensaje({
  estado,
  error,
  locale,
}: {
  estado: EstadoDeWhatsapp | null;
  error?: string | null;
  locale: Locale;
}) {
  if (!estado) return null;
  const es = locale === 'es';
  const info = ESTADOS[estado];
  if (!info) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5">
      <span
        data-testid={`estado-whatsapp-${estado.toLowerCase()}`}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
          info.clases,
        )}
      >
        {estado === 'FALLO' ? (
          <Warning className="h-3 w-3" weight="fill" aria-hidden />
        ) : estado === 'ENTREGADO' || estado === 'LEIDO' ? (
          <CheckCircle className="h-3 w-3" weight="fill" aria-hidden />
        ) : (
          <WhatsappLogo className="h-3 w-3" weight="fill" aria-hidden />
        )}
        {es ? info.es : info.en}
      </span>
      {/* El motivo del fallo es lo único accionable: se muestra, no se esconde. */}
      {estado === 'FALLO' && error ? (
        <span className="text-[11px] text-muted-foreground">{error}</span>
      ) : null}
    </div>
  );
}
