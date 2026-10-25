'use client';

/**
 * El vacío de «Mi arriendo» para quien todavía no arrienda (revisora r27, CA).
 *
 * Antes cada pestaña lo decía a su manera: «No tienes arriendos activos», «Sin pagos por ahora», «Aún no tienes
 * acuerdos…», «Sin contratos aún»; unas con la casa 3D, otras con un ícono en un círculo, unas en tarjeta y otras no.
 * Ahora es UNO: la casa, sin tarjeta, el mismo título y la misma salida. Lo único que cambia es la línea que dice
 * qué va a aparecer en esa pestaña.
 */
import { House } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/empty-state';
import { useI18n } from '@/lib/i18n';

export const TITULO_SIN_ARRIENDO = 'Todavía no tienes un arriendo';

export function SinArriendoTodavia({
  queVaAqui,
  whatGoesHere,
  testid = 'sin-arriendo-todavia',
}: {
  /** Qué va a aparecer en esta pestaña cuando arriende («Aquí ves cada pago…»). */
  queVaAqui: string;
  whatGoesHere: string;
  testid?: string;
}) {
  const { locale } = useI18n();
  const es = locale !== 'en';
  return (
    <div data-testid={testid}>
      <EmptyState
        icon={House}
        ilustracion="casa"
        title={es ? TITULO_SIN_ARRIENDO : "You don't have a rental yet"}
        description={es ? queVaAqui : whatGoesHere}
        action={{ label: es ? 'Ver inmuebles para mí' : 'See homes for me', href: '/inquilino/para-ti' }}
      />
    </div>
  );
}
