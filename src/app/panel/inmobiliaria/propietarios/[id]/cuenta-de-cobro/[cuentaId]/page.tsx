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
import { useParams } from 'next/navigation';
import { Printer } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { CuentaDeCobroDelPropietario } from '@/components/cobros/cuenta-de-cobro/CuentaDeCobroDelPropietario';
import { deduccionesApi } from '@/lib/api/deducciones.service';
import { useI18n } from '@/lib/i18n';
import { BackButton, CrossFade } from '@leasefy/cadence';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useTr } from '@/lib/i18n/use-tr';
import type { CuentaDeCobroDelPropietario as Cuenta } from '@/lib/types/deducciones';

function Contenido() {
  const { t } = useI18n();
  const tr = useTr();
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
      {/* Glow up 22-10: el encabezado común (sección, título y para qué sirve) con la vuelta
          arriba y «Imprimir» como la única principal. Todo esto se esconde al imprimir. */}
      <div className="space-y-3" data-cuenta-barra>
        <BackButton href={ficha} label={t(k('volver'))} />
        <EncabezadoDePantalla
          seccion={tr('Propietarios')}
          titulo={t(k('titulo'))}
          descripcion={tr('Lo que el propietario le debe a la inmobiliaria, listo para imprimir o guardar en PDF.')}
          accionPrincipal={
            <Button size="sm" hideArrow onClick={() => window.print()} disabled={!cuenta} data-testid="imprimir">
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t(k('imprimir'))}
            </Button>
          }
        />
      </div>

      {/* Cargando → la cuenta de cobro (o el fallo): se cruzan. `popLayout`:
          la cuenta entra YA y el esqueleto se va por encima. */}
      <CrossFade swapKey={cargando ? 'cargando' : error ? 'fallo' : cuenta ? 'cuenta' : 'nada'} mode="popLayout">
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
      </CrossFade>
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
