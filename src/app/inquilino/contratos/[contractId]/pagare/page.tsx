'use client';

/**
 * T-0109 contract.md §3.1.E9 — pantalla "mi firma" del pagaré para el
 * inquilino. `E9` es de sólo lectura + un enlace: el inquilino firma en la
 * plataforma del PROVEEDOR (`urlDeFirma`), no en Leasefy — el back no emite
 * OTP para `PROMISSORY_NOTE` en esta tarea (contract.md §8). Se oculta sola
 * contra un back sin WU-4 (404).
 */

import { useCallback, useEffect, useState, use } from 'react';
import { ArrowSquareOut, CheckCircle, Receipt, WarningCircle } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EmptyState } from '@/components/ui/empty-state';
import { pagareApi } from '@/lib/api/pagare.service';
import type { MiFirmaDelPagareResponse } from '@/lib/api/pagare.types';
import { describirEstadoDelFirmante, esPagareNoDisponible } from '@/lib/contratos/pagare';

interface Props {
  params: Promise<{ contractId: string }>;
}

export default function MiFirmaDelPagarePage(props: Props) {
  const { contractId } = use(props.params);
  const [datos, setDatos] = useState<MiFirmaDelPagareResponse | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await pagareApi.miFirma(contractId));
      setNoDisponible(false);
    } catch (e) {
      if (esPagareNoDisponible(e)) setNoDisponible(true);
      else setError(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <BackButton href="/inquilino/contratos" label="Mis contratos" />
      <h1 className="text-h2 text-fg">Pagaré</h1>

      {cargando ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Spinner size="md" variant="muted" />
        </div>
      ) : noDisponible ? (
        <EmptyState
          icon={Receipt}
          title="El pagaré no está disponible todavía"
          description="Tu inmobiliaria todavía no habilitó esta función."
        />
      ) : error ? (
        <FalloDeCarga error={error} queEs="tu pagaré" onReintentar={cargar} />
      ) : datos ? (
        <Contenido datos={datos} />
      ) : null}
    </div>
  );
}

function Contenido({ datos }: { datos: MiFirmaDelPagareResponse }) {
  if (!datos.pagareId) {
    return (
      <EmptyState
        icon={Receipt}
        title="No tienes un pagaré pendiente"
        description="Cuando tu inmobiliaria emita el pagaré, lo verás acá."
      />
    );
  }

  return (
    <div className="space-y-4">
      {datos.esSandbox && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 flex items-start gap-2" data-testid="pagare-sandbox-banner">
          <WarningCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">Sandbox — sin validez jurídica</p>
        </div>
      )}

      {datos.miEstado === 'FIRMADO' ? (
        <div className="rounded-lg border border-success/30 bg-success-soft p-6 text-center space-y-2" data-testid="mi-firma-firmado">
          <CheckCircle className="w-8 h-8 text-success mx-auto" />
          <p className="font-semibold text-success">Ya firmaste el pagaré</p>
        </div>
      ) : datos.miEstado === 'RECHAZADO' ? (
        <p className="text-body-sm text-danger" data-testid="mi-firma-rechazado">
          Rechazaste este pagaré. Si fue un error, comunícate con tu inmobiliaria.
        </p>
      ) : datos.miEstado === 'VENCIDO' ? (
        <p className="text-body-sm text-warning" data-testid="mi-firma-vencido">
          El plazo para firmar venció. Pide a tu inmobiliaria que emita uno nuevo.
        </p>
      ) : datos.urlDeFirma ? (
        <div className="rounded-lg border border-border bg-surface p-6 space-y-3" data-testid="mi-firma-pendiente">
          <p className="text-body-sm text-fg-muted">
            Tu pagaré está listo para firmar en la plataforma de nuestro proveedor de firma electrónica.
          </p>
          <Button asChild hideArrow className="gap-2">
            <a href={datos.urlDeFirma} target="_blank" rel="noopener noreferrer" data-testid="ir-a-firmar-pagare">
              Ir a firmar
              <ArrowSquareOut className="w-4 h-4" />
            </a>
          </Button>
        </div>
      ) : (
        <p className="text-body-sm text-fg-muted">
          {describirEstadoDelFirmante(datos.miEstado ?? 'PENDIENTE').etiqueta}
        </p>
      )}
    </div>
  );
}
