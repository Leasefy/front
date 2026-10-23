'use client';

/**
 * Recaudo — cuánto llegó, cuánto hay disponible y cómo va el mes.
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/recaudo/*`.
 */

import { CaretDown } from '@phosphor-icons/react';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Button } from '@/components/ui/button';
import { DropdownList, DropdownListContent, DropdownListItem, DropdownListSeparator, DropdownListTrigger } from '@/components/ui/dropdown-menu';
import { PageGuard } from '@/components/auth/PageGuard';
import { SIN_EL_AUXILIAR_DE_CARTERA } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos';
import { Recaudo } from '@/components/recaudo/Recaudo';
import Link from 'next/link';
import { useTr } from '@/lib/i18n/use-tr';

export default function RecaudoPage() {
  const tr = useTr();
  return (
    // COBRANZA-MANUAL (04-10-2026): el auxiliar de cartera no ve lo que salió en giros.
    <PageGuard module="cobros" action="view" roles={[...SIN_EL_AUXILIAR_DE_CARTERA]} seccion="Recaudo">
      <div className="space-y-6 p-6 lg:p-8">
        {/* GLOW UP (22-10): el encabezado común, una línea, y los recaudos que no son
            de cuotas (estudios, aseguradoras, autopago) en un menú, no tres enlaces sueltos. */}
        <EncabezadoDePantalla
          seccion={tr('Cobrar a inquilinos')}
          titulo={tr("Recaudo")}
          descripcion={tr("Lo que llegó, lo que falta y lo que salió a propietarios, mes por mes.")}
          acciones={
            <DropdownList>
              <DropdownListTrigger asChild>
                <Button variant="secondary" size="sm" hideArrow data-testid="otros-recaudos">
                  {tr("Otros recaudos")}
                  <CaretDown className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </DropdownListTrigger>
              <DropdownListContent align="end">
                {/* Ronda 30 (revisora r27): «Ver los recibos» y «Lotes al banco» viven acá —a 390 eran
                    dos botones más antes de la cifra—. 🔴 Juan (15-10): «¿dónde se ven los recibos?». */}
                <DropdownListItem asChild>
                  <Link href="/panel/inmobiliaria/pagos/recibos" data-testid="ver-los-recibos">{tr("Ver los recibos")}</Link>
                </DropdownListItem>
                <DropdownListItem asChild>
                  <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes" data-testid="lotes-al-banco">{tr("Lotes al banco")}</Link>
                </DropdownListItem>
                <DropdownListSeparator />
                {/* 17-09-2026: los estudios que pagan los solicitantes, con su recibo. */}
                <DropdownListItem asChild>
                  <Link href="/panel/inmobiliaria/pagos/recaudo/estudios">{tr("Estudios pagados por solicitantes")}</Link>
                </DropdownListItem>
                {/* D11 (17-09-2026): las aseguradoras que pagan siniestros. */}
                <DropdownListItem asChild>
                  <Link href="/panel/inmobiliaria/pagos/recaudo/aseguradoras">{tr("Aseguradoras")}</Link>
                </DropdownListItem>
                {/* 26-09-2026: los inquilinos con cobro automático (sólo lectura). */}
                <DropdownListItem asChild>
                  <Link href="/panel/inmobiliaria/pagos/recaudo/autopago">{tr("Autopago")}</Link>
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          }
        />
        <Recaudo />
      </div>
    </PageGuard>
  );
}
