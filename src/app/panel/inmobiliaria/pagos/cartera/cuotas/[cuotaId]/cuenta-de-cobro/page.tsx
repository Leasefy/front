'use client';

/**
 * Cuenta de cobro de una CUOTA del contrato — el documento del período, listo
 * para imprimir o guardar como PDF.
 *
 * 🔴 PG-R12 (QA de Pagos, 03-10-2026): la cuenta de cobro salía sólo del COBRO
 * (`cartera/cobros/[id]/cuenta-de-cobro`), así que un mes migrado sin cobro no
 * tenía cuenta de cobro y el total era el del cobro aunque hubiera quedado
 * viejo. La regla del 15-09 es «ningún número sale de los cobros»: ésta sale
 * de la cuota (`GET /inmobiliaria/recibos-de-caja/cuotas/:cuotaId/cuenta-de-cobro`).
 * Se entra desde el cajón de la cuota en la Deuda del mes. El documento es el
 * mismo `<CuentaDeCobro>`.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { CuentaDeCobro } from '@/components/cobros/cuenta-de-cobro/CuentaDeCobro';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import { rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';

const DEUDA_DEL_MES = '/panel/inmobiliaria/pagos';

function CuentaDeCobroDeLaCuotaContent() {
  const params = useParams<{ cuotaId: string }>();
  const searchParams = useSearchParams();
  const cuotaId = params.cuotaId;
  const volverA = rutaDeRegreso(searchParams.get('volver'), DEUDA_DEL_MES);

  const [cuenta, setCuenta] = useState<CobroConDesglose | null>(null);
  const [agencia, setAgencia] = useState<AgencyProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // La cuota es lo que importa; la agencia sólo viste el encabezado.
      const [c, a] = await Promise.all([
        recibosDeCajaApi.cuentaDeCobroDeLaCuota(cuotaId),
        agencyApi.getMyAgency().catch(() => null),
      ]);
      setCuenta(c);
      setAgencia(a);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cuotaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-6 p-6 lg:p-8" data-cuenta-pagina>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-cuenta-barra
      >
        <Button asChild variant="ghost" hideArrow className="w-fit">
          <Link href={volverA}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        </Button>
        <Button
          variant="secondary"
          hideArrow
          onClick={() => window.print()}
          disabled={!cuenta}
          data-testid="imprimir"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir o guardar PDF
        </Button>
      </div>

      {cargando ? (
        <div className="mx-auto w-full max-w-[800px] space-y-4 rounded-lg border border-border bg-surface p-12">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="la cuenta de cobro de la cuota"
          onReintentar={cargar}
          volverA={{ label: 'Volver a la deuda del mes', href: DEUDA_DEL_MES }}
        />
      ) : cuenta ? (
        <CuentaDeCobro cobro={cuenta} agencia={agencia} />
      ) : null}
    </div>
  );
}

export default function CuentaDeCobroDeLaCuotaPage() {
  return (
    <PageGuard module="cobros" action="view">
      <Suspense
        fallback={
          <div className="p-6 lg:p-8">
            <Skeleton className="mx-auto h-96 w-full max-w-[800px]" />
          </div>
        }
      >
        <CuentaDeCobroDeLaCuotaContent />
      </Suspense>
    </PageGuard>
  );
}
