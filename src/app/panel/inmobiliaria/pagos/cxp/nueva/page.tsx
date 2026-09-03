'use client';

/**
 * Registrar una factura de proveedor desde una foto/PDF (IA) o a mano.
 * Ruta: /panel/inmobiliaria/pagos/cxp/nueva
 *
 * Permiso: ap:create-bill (el mismo gate del POST /ap/bills del micro).
 * Al registrar, redirige al detalle de la factura en tesorería/ap/[id].
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CaretLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { Spinner } from '@/components/ui/spinner';
import { FacturaProveedorIACapture } from '@/components/inmobiliaria/tesoreria/FacturaProveedorIACapture';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

function NuevaFacturaContent() {
  const { t } = useI18n();
  const { agency } = useAuth();
  const router = useRouter();
  const k = (s: string) => `inmobiliaria.tesoreria.facturas.${s}`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <nav>
        <Link
          href="/panel/inmobiliaria/pagos/liquidaciones"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          {t(k('back'))}
        </Link>
      </nav>

      <header className="space-y-1.5">
        <SectionLabel>{t(k('label'))}</SectionLabel>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t(k('title'))}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">{t(k('subtitle'))}</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5 lg:p-6 max-w-5xl">
        {agency?.id ? (
          <FacturaProveedorIACapture
            agencyId={agency.id}
            onRegistrada={(bill) => router.push(`/panel/inmobiliaria/pagos/cxp/${bill.id}`)}
            onCancel={() => router.push('/panel/inmobiliaria/pagos/liquidaciones')}
          />
        ) : (
          <div className="flex items-center justify-center py-14">
            <Spinner size="md" variant="muted" />
          </div>
        )}
      </section>
    </div>
  );
}

export default function NuevaFacturaPage() {
  return (
    <PageGuard module="ap" action="create-bill">
      <NuevaFacturaContent />
    </PageGuard>
  );
}
