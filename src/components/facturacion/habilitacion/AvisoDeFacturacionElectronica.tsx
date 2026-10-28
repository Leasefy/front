'use client';

/**
 * Arriba en Facturación, mientras no haya terminado la guía (Nico, 28-10-2026): «Activa tu facturación electrónica ·
 * 3 de 9 · Seguir». Sin la ruta, sin plan pagado o ya lista: no sale nada.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ilustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { habilitacionApi, type VistaDeLaHabilitacion } from '@/lib/api/habilitacion-de-facturacion.service';
import { PASOS_DE_LA_GUIA } from './pasos-de-la-guia';

export function AvisoDeFacturacionElectronica() {
  const [vista, setVista] = useState<VistaDeLaHabilitacion | null>(null);
  useEffect(() => {
    let vivo = true;
    habilitacionApi
      .vista()
      .then((v) => vivo && setVista(v))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (!vista || !vista.disponible || !vista.elegible || vista.termino) return null;
  const sigue = vista.siguiente ? PASOS_DE_LA_GUIA[vista.siguiente] : null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center" data-testid="aviso-facturacion-electronica">
      <Ilustracion nombre="factura" tamano={56} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-body text-fg">Activa tu facturación electrónica</p>
        <p className="text-body-sm text-fg-muted">
          Paso {vista.avance.hechos + 1 > vista.avance.total ? vista.avance.total : vista.avance.hechos + 1} de {vista.avance.total}
          {sigue ? ` · ${sigue.titulo}` : ''}. Te llevamos con la DIAN hasta dejar a Feel como tu proveedor.
        </p>
      </div>
      <Button asChild variant="outline" size="sm" hideArrow className="shrink-0">
        <Link href="/panel/inmobiliaria/facturacion/activar">{vista.avance.hechos > 0 ? 'Seguir' : 'Empezar'}</Link>
      </Button>
    </div>
  );
}
