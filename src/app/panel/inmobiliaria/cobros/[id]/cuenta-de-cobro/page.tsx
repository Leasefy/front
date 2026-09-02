'use client';

/**
 * Cuenta de cobro de un cobro — el documento del período, listo para
 * imprimir o guardar como PDF.
 *
 * Se entra desde el detalle del cobro y desde la ficha del contrato
 * (`?volver=` trae la ruta de regreso). El documento en sí es
 * `<CuentaDeCobro>`; esta página sólo trae los datos y pone la barra.
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
import { agencyApi, cobrosApi } from '@/lib/api/inmobiliaria.service';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';

const LISTA_DE_COBROS = '/panel/inmobiliaria/cobros';

/**
 * `?volver=` sólo se respeta si apunta adentro del panel: un enlace de
 * regreso que sale a otro dominio es un open redirect con otro nombre.
 */
function rutaDeRegreso(volver: string | null): string {
  if (!volver) return LISTA_DE_COBROS;
  if (!volver.startsWith('/panel/') || volver.startsWith('//')) return LISTA_DE_COBROS;
  return volver;
}

function CuentaDeCobroContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const volverA = rutaDeRegreso(searchParams.get('volver'));

  const [cobro, setCobro] = useState<CobroConDesglose | null>(null);
  const [agencia, setAgencia] = useState<AgencyProfile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // El cobro es lo que importa; la agencia sólo viste el encabezado. Si
      // esa segunda llamada falla, el documento sale igual, sin emisor.
      const [c, a] = await Promise.all([
        cobrosApi.getById(id),
        agencyApi.getMyAgency().catch(() => null),
      ]);
      setCobro(c);
      setAgencia(a);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [id]);

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
          disabled={!cobro}
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
          queEs="el cobro"
          onReintentar={cargar}
          volverA={{ label: 'Volver a cobros', href: LISTA_DE_COBROS }}
        />
      ) : cobro ? (
        <CuentaDeCobro cobro={cobro} agencia={agencia} />
      ) : null}
    </div>
  );
}

export default function CuentaDeCobroPage() {
  return (
    <PageGuard module="cobros" action="view">
      <Suspense
        fallback={
          <div className="p-6 lg:p-8">
            <Skeleton className="mx-auto h-96 w-full max-w-[800px]" />
          </div>
        }
      >
        <CuentaDeCobroContent />
      </Suspense>
    </PageGuard>
  );
}
