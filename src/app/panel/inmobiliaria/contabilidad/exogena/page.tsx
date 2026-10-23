'use client';

/**
 * Exógena — `/panel/inmobiliaria/contabilidad/exogena`.
 *
 * Permiso `reportes:view`, el mismo de toda la contabilidad. El visto bueno y el
 * mapeo de conceptos son escritura: se deshabilitan con su motivo si el rol no es
 * ADMIN ni CONTADOR (`ContabilidadEscrituraGuard`).
 *
 * `?anio=2025` abre ese año gravable: lo usa la alerta de la portada, que ya dice
 * de qué año son los formatos sin visto bueno.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { Exogena } from '@/components/contabilidad/exogena/Exogena';

/**
 * El año de la URL, o ninguno. No se acepta un año futuro ni texto: la exógena
 * de 2027 no tiene una sola fila en 2026, y un informe vacío se lee como «no
 * hubo movimiento».
 */
function anioDe(valor: string | null): number | undefined {
  const n = Number(valor);
  if (!Number.isInteger(n)) return undefined;
  const actual = new Date().getFullYear();
  if (n < 2015 || n > actual) return undefined;
  return n;
}

export default function ExogenaPage() {
  const anio = anioDe(useSearchParams().get('anio'));

  return (
    <PageGuard module="reportes" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Finanzas"
            titulo="Información exógena"
            descripcion="Los seis formatos que le toca presentar a una inmobiliaria, armados contra el libro."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">El 1647 es el propio del negocio: lo que se recaudó para los propietarios. Leasefy prepara la plantilla del Prevalidador de la DIAN y no transmite nada.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <Exogena key={anio ?? 'actual'} anioInicial={anio} />
      </div>
    </PageGuard>
  );
}
