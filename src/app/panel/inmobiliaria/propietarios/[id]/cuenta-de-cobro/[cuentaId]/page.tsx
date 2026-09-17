'use client';

/**
 * La cuenta de cobro al propietario — el documento, listo para imprimir o
 * guardar como PDF. Se entra desde la ficha del propietario (Deducciones) y
 * desde la cartera de propietarios que le deben a la inmobiliaria.
 *
 * El documento es `<CuentaDeCobroDelPropietario>`; esta página sólo lo trae y
 * pone la barra. Permiso: `propietarios:view`, el mismo del back.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { CuentaDeCobroDelPropietario } from '@/components/cobros/cuenta-de-cobro/CuentaDeCobroDelPropietario';
import { deduccionesApi } from '@/lib/api/deducciones.service';
import { useI18n } from '@/lib/i18n';
import type { CuentaDeCobroDelPropietario as Cuenta } from '@/lib/types/deducciones';

function Contenido() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.cuentaDeCobro.${s}`;
  const params = useParams<{ id: string; cuentaId: string }>();
  const ficha = `/panel/inmobiliaria/propietarios/${params.id}`;

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCuenta(await deduccionesApi.cuentaDeCobro(params.id, params.cuentaId));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [params.id, params.cuentaId]);

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
          <Link href={ficha}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t(k('volver'))}
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
          {t(k('imprimir'))}
        </Button>
      </div>

      {cargando ? (
        <div className="mx-auto w-full max-w-[800px] space-y-4 rounded-lg border border-border bg-surface p-12">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs={t(k('queEs'))}
          onReintentar={cargar}
          volverA={{ label: t(k('volver')), href: ficha }}
        />
      ) : cuenta ? (
        <CuentaDeCobroDelPropietario cuenta={cuenta} />
      ) : null}
    </div>
  );
}

export default function CuentaDeCobroDelPropietarioPage() {
  return (
    <PageGuard module="propietarios" action="view">
      <Suspense
        fallback={
          <div className="p-6 lg:p-8">
            <Skeleton className="mx-auto h-96 w-full max-w-[800px]" />
          </div>
        }
      >
        <Contenido />
      </Suspense>
    </PageGuard>
  );
}
