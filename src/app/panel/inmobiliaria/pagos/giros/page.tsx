'use client';

/**
 * «Giros a propietarios» (Nico, 22-10-2026): la entrada del menú para los cuatro pasos —liquidar,
 * revisar y aprobar, el archivo del banco y marcar pagado—. Cada paso vive en su ruta de siempre
 * (`PasosDeLosGiros`), porque hay enlaces a ellas en toda la plataforma.
 *
 * Abre en el paso 1 (Liquidaciones), que es sólo de ADMIN y CONTADOR; quien gira sin ser contador
 * (un rol con `dispersiones` dado a mano) entra directo a revisar y aprobar, que es lo suyo.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';

const LIQUIDAR = '/panel/inmobiliaria/pagos/liquidaciones';
const REVISAR = '/panel/inmobiliaria/pagos/dispersiones';

export default function GirosAPropietariosPage() {
  const router = useRouter();
  const { isLoading, isAdmin, agencyRole } = usePermissions();

  useEffect(() => {
    if (isLoading) return;
    const liquida = isAdmin || agencyRole === AGENCY_ROLES.CONTADOR;
    router.replace(liquida ? LIQUIDAR : REVISAR);
  }, [isLoading, isAdmin, agencyRole, router]);

  return (
    <div className="p-6 lg:p-8">
      <EsqueletoDePagina variante="list" />
    </div>
  );
}
