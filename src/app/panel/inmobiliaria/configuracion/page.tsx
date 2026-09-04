'use client';

/**
 * `/panel/inmobiliaria/configuracion` — la raíz de Configuración: Perfil.
 *
 * Además atiende dos casos que no son «mostrar el perfil»:
 *
 *  · Enlaces viejos con `?tab=` o `?seccion=` (el buscador del panel todavía
 *    manda a `?tab=medios-de-pago`): se los lleva a su URL nueva.
 *  · Quien no es ADMIN no puede ver el perfil de la agencia, pero sí otras
 *    secciones (Equipo, Automatización IA). En vez de rebotarlo fuera de
 *    Configuración —que es lo que hacía el `PageGuard adminOnly` de la página
 *    entera—, se lo deja en la primera sección que sí puede abrir.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Spinner } from '@/components/ui';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { SeccionCompleta } from './contenido';
import {
  destinoDeParametrosViejos,
  hrefDeSeccion,
  puedeVerSeccion,
  seccionPorId,
  seccionesVisibles,
} from './secciones';

export default function ConfiguracionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, canAccess, isLoading } = usePermissions();

  const destinoViejo = destinoDeParametrosViejos(searchParams);
  const ctx = { isAdmin, canAccess };
  const puedeVerPerfil = puedeVerSeccion(seccionPorId('perfil'), ctx);
  const alternativa = isLoading || puedeVerPerfil ? null : (seccionesVisibles(ctx)[0] ?? null);

  useEffect(() => {
    if (destinoViejo) {
      router.replace(destinoViejo);
      return;
    }
    if (alternativa) router.replace(hrefDeSeccion(alternativa.id));
  }, [destinoViejo, alternativa, router]);

  if (destinoViejo || alternativa) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  return <SeccionCompleta id="perfil" />;
}
