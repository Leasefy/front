'use client';

/**
 * Recibos — `/panel/inmobiliaria/pagos/recibos`.
 *
 * 🔴 Juan (Portofino, 15-10-2026): «¿dónde se ven los recibos de caja que se
 * generaron? ¿y los recibos o egresos de la dispersión?». Dos pestañas: lo que
 * ENTRÓ (recibos de caja, `cobros:view`) y lo que SALIÓ a los propietarios
 * (los giros hechos con su extracto, que pide además `dispersiones:view`).
 */

import { useState } from 'react';

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecibosDeCajaDeLaInmobiliaria } from '@/components/recibos/RecibosDeCajaDeLaInmobiliaria';
import { EgresosAPropietarios } from '@/components/recibos/EgresosAPropietarios';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';

type Pestana = 'recibos' | 'egresos';

export default function RecibosPage() {
  const permisos = usePermissionsContextSafe();
  const veLosEgresos = permisos === null || permisos.canAccess('dispersiones', 'view');
  const [pestana, setPestana] = useState<Pestana>('recibos');

  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* Revisora r24 (Recibos): el encabezado común y la misma sección que sus hermanas del
            grupo «Cobrar a inquilinos» (Deuda del mes, Recaudo, Cartera). */}
        <EncabezadoDePantalla
          seccion="Pagos · inquilinos"
          titulo="Recibos"
          descripcion="Los recibos de caja de cada pago que entró y, aparte, lo que se les giró a los propietarios."
        />

        {veLosEgresos ? (
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
            <TabsList variant="segmented">
              <TabsTrigger value="recibos" data-testid="pestana-recibos">
                Recibos de caja
              </TabsTrigger>
              <TabsTrigger value="egresos" data-testid="pestana-egresos">
                Egresos a propietarios
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {pestana === 'egresos' && veLosEgresos ? <EgresosAPropietarios /> : <RecibosDeCajaDeLaInmobiliaria />}
      </div>
    </PageGuard>
  );
}
