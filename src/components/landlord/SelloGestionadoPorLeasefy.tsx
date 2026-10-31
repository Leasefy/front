'use client';

import { useEffect, useState } from 'react';

import { LeasefySymbol } from '@/components/brand/LeasefySymbol';
import { landlordApi } from '@/lib/api/landlord.service';
import { useAuth } from '@/lib/auth';
import { leerCuentaGuardada, tieneDosCuentasDePropietario } from '@/lib/auth/cuenta-activa';

/**
 * ¿Está en su cuenta de propietario «con Leasefy»? (Nico, 31-10-2026: con inmuebles de Leasefy y de una inmobiliaria son
 * dos cuentas en «Cambiar de cuenta»). Entonces se ve el panel propio con el sello, aunque una inmobiliaria también le
 * gestione otros.
 */
export function useCuentaConLeasefy(): boolean {
  const { user, cuentas } = useAuth();
  return tieneDosCuentasDePropietario(cuentas) && leerCuentaGuardada(user?.id)?.con === 'leasefy';
}

/**
 * ¿Leasefy le gestiona inmuebles a este propietario? (Nico, 31-10-2026). Sólo se pregunta para el propietario
 * independiente; si el back no responde o no tiene la ruta, no hay sello (nunca se afirma sin saberlo).
 */
export function useGestionadoPorLeasefy(preguntar: boolean): boolean {
  const [gestionado, setGestionado] = useState(false);
  useEffect(() => {
    if (!preguntar) return;
    let vivo = true;
    landlordApi
      .gestionDeLeasefy()
      .then((r) => vivo && setGestionado(r.gestionado === true))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [preguntar]);
  return gestionado;
}

/** El sello de la plataforma del propietario al que Leasefy le gestiona los inmuebles (Nico, 31-10-2026). */
export function SelloGestionadoPorLeasefy() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3" data-testid="sello-gestionado-por-leasefy">
      <div className="flex items-center gap-2">
        <LeasefySymbol size={16} className="text-fg" />
        <p className="text-body-sm text-fg">Gestionado por Leasefy</p>
      </div>
      <p className="mt-1 text-caption text-fg-muted">Leasefy administra tus inmuebles: cobra el arriendo y te informa cada mes.</p>
    </div>
  );
}
