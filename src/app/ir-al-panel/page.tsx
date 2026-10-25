'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/use-auth';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { useTx } from '@/lib/idioma/use-idioma';
import { destinoConSesion } from '@/lib/auth/destino-con-sesion';

/**
 * «Ir al panel» de la landing estática (`public/landing`, `public/internas`):
 * la página sabe que hay sesión pero no de quién; aquí se decide con la misma
 * regla que `/auth` después de entrar (`destinoConSesion`). Sin sesión, a `/auth`.
 */
export default function IrAlPanel() {
  const tx = useTx();
  const auth = useAuth();
  const [esperaVencida, setEsperaVencida] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEsperaVencida(true), 4000);
    return () => clearTimeout(id);
  }, []);

  const destino = destinoConSesion({
    cargando: auth.isLoading,
    confirmacion: auth.confirmacionDeLaSesion,
    autenticado: auth.isAuthenticated,
    user: auth.user,
    needsOnboarding: auth.needsOnboarding,
    perfilElegido: auth.perfilElegido,
    agencyRole: auth.agencyRole,
    agencyMembershipChecked: auth.agencyMembershipChecked,
    hasActiveAgencyMembership: auth.hasActiveAgencyMembership,
    ultimaCuenta: auth.ultimaCuenta,
    esperaVencida,
  });
  const ruta = destino.tipo === 'ir' ? destino.ruta : null;

  useEffect(() => {
    if (ruta) window.location.replace(ruta);
  }, [ruta]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg" data-testid="ir-al-panel">
      <CargaDeMarca tamano="md" disposicion="apilada" texto={tx('Abriendo tu panel…', 'Opening your dashboard…')} className="flex" />
    </main>
  );
}
