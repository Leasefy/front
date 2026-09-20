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
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
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
    <PageGuard module="reportes" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Contabilidad
          </Link>
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-h2 text-fg">Información exógena</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Los seis formatos que le toca presentar a una inmobiliaria, armados contra el libro. El
            1647 es el propio del negocio: lo que se recaudó para los propietarios. Leasefy prepara
            la plantilla del Prevalidador de la DIAN y no transmite nada.
          </p>
        </header>
        <Exogena key={anio ?? 'actual'} anioInicial={anio} />
      </div>
    </PageGuard>
  );
}
