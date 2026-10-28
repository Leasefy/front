'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/use-auth';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { enModoComercial } from '@/lib/nav/modo-comercial';

/**
 * 🔴 La cuenta del marketplace publica con el publicador rápido, también desde
 * el panel (Nico, 27-10-2026: «crear una cuenta no está sencillo para entrar
 * solo al marketplace… inclusive está pidiendo propietario obligatoriamente;
 * esta niña nos iba a migrar 108 propiedades para marketplace, pero no dio»).
 *
 * «Nuevo inmueble» del panel es el asistente del mandato: lo primero que pide
 * es el propietario, porque arma la consignación (comisión, cobros, giros). A
 * quien sólo publica eso le sobra. En el modo comercial (la inmobiliaria del
 * registro corto, sin activar) estas rutas abren el publicador rápido
 * (`/publica`): sin propietario, uno o muchos de una vez (Excel, enlaces o
 * carpetas de fotos). Al activar la cuenta vuelve el asistente de siempre.
 *
 * Mientras no se sabe la cuenta, ni el asistente ni el salto: la carga.
 */
export function AlPublicadorRapido({ destino, children }: { destino: string; children: ReactNode }) {
  const router = useRouter();
  const { agency, isLoading } = useAuth();
  const comercial = enModoComercial(agency);

  useEffect(() => {
    if (comercial) router.replace(destino);
  }, [comercial, destino, router]);

  if (isLoading || comercial) {
    return (
      <CargaDeMarca
        disposicion="apilada"
        texto="Abriendo el publicador…"
        className="flex min-h-[50vh] text-center"
        data-testid="al-publicador-rapido"
      />
    );
  }
  return <>{children}</>;
}
