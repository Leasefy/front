'use client';

/**
 * Facturación — la estructura del módulo, con el motor DIAN todavía por
 * llegar (M2).
 *
 * Nico (2026-09-03): «esas tabs ¿por qué están fuera de la tabla? sabes que
 * deben quedar dentro». Las pestañas son la primera fila de la tarjeta de la
 * tabla, como el buscador y el filtro de Inquilinos. Lo que había además y se
 * fue:
 *   - una leyenda de estados (Aceptada DIAN · Pendiente · …) que no filtraba
 *     nada: ningún control dibujado sin comportamiento;
 *   - una franja con icono y descripción por pestaña: la descripción vive en
 *     el vacío de cada pestaña, que es donde hace falta leerla;
 *   - «Nueva factura», que sólo mostraba un toast «llega con M2»: oculto
 *     hasta que emita de verdad. El banner ya dice que el motor no está.
 *
 * Todavía no hay servicio de facturación (`facturacion.types.ts` es el
 * contrato que M2 implementará), así que la tabla no tiene de dónde sacar
 * filas: encabezados reales y vacío honesto en el cuerpo, sin datos
 * inventados. La paginación entra con el servicio (`useTablePagination` +
 * `TablePagination`, como en Solicitudes): sin filas nunca se pintaría.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Info, Receipt } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageGuard } from '@/components/auth/PageGuard';
import { SinDatos } from '@/components/estado/SinDatos';
import type { FacturacionTab } from '@/lib/api/facturacion.types';

interface TabDef {
  key: FacturacionTab;
  /** Sufijos de clave bajo `inmobiliaria.facturacion`. */
  columns: readonly string[];
}

/** Las columnas salen del contrato de `facturacion.types.ts`, no de un boceto. */
const TABS: readonly TabDef[] = [
  {
    key: 'ventas',
    columns: ['colNumero', 'colTercero', 'colConcepto', 'colFecha', 'colSubtotal', 'colIva', 'colTotal', 'colPago', 'colDian'],
  },
  {
    key: 'compras',
    columns: ['colNumero', 'colProveedor', 'colConcepto', 'colFecha', 'colTotal', 'colVence', 'colPago'],
  },
  {
    key: 'electronica',
    columns: ['colTipo', 'colNumero', 'colCufe', 'colTercero', 'colFecha', 'colTotal', 'colDian'],
  },
  {
    key: 'notas',
    columns: ['colTipo', 'colNumero', 'colFacturaRef', 'colMotivo', 'colValor', 'colFecha', 'colDian'],
  },
];

const esTab = (v: string): v is FacturacionTab => TABS.some((x) => x.key === v);

function FacturacionContent() {
  const { t } = useI18n();
  const [active, setActive] = useState<FacturacionTab>('ventas');
  const k = (suffix: string) => `inmobiliaria.facturacion.${suffix}`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <SectionLabel>{t(k('label'))}</SectionLabel>
        <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
        <p className="text-body text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
      </header>

      {/* Banner del M2, tal cual estaba: no es de esta pantalla decidir cuándo
          llega el motor. */}
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/* UNA tarjeta: pestañas arriba, tabla debajo. Sin título encima. */}
      <Tabs
        value={active}
        onValueChange={(v) => {
          if (esTab(v)) setActive(v);
        }}
      >
        <section
          className="rounded-lg border border-border bg-surface overflow-hidden"
          data-testid="facturacion-tarjeta"
        >
          <div className="border-b border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="segmented" aria-label={t(k('title'))} className="justify-start">
              {TABS.map((x) => (
                <TabsTrigger key={x.key} value={x.key} className="whitespace-nowrap">
                  {t(k(`tab_${x.key}`))}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* La ÚNICA puerta para registrar una factura de proveedor.
                Nico (2026-09-08): «¿por qué existe registrar factura si tenemos
                una sección dedicada a facturación?». Estaba en dos pantallas de
                Pagos —el encabezado del Resumen y Liquidaciones— y en ninguna
                de las dos era el tema. La pantalla que abre (`pagos/cxp/nueva`,
                lectura de la foto o el PDF con IA) no cambió: cambió de dónde
                se entra. Sólo en «Compras»: en Ventas todavía no hay motor DIAN
                que emita nada, y ofrecerlo ahí sería un botón que no cumple. */}
            {active === 'compras' && (
              <Button asChild hideArrow className="shrink-0" data-testid="facturacion-registrar-compra">
                <Link href="/panel/inmobiliaria/pagos/cxp/nueva">
                  <Receipt className="h-4 w-4" weight="bold" />
                  {t(k('registrarCompra'))}
                </Link>
              </Button>
            )}
          </div>

          {TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tab.columns.map((c) => (
                      <TableHead key={c} className="whitespace-nowrap">
                        {t(k(c))}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* El vacío vive dentro del cuerpo para que los encabezados
                      se sigan viendo. */}
                  <TableRow>
                    <TableCell colSpan={tab.columns.length} className="p-0">
                      <SinDatos
                        queSon={t(k(`queSon_${tab.key}`))}
                        icono={Receipt}
                        descripcion={
                          tab.key === 'compras'
                            ? `${t(k('desc_compras'))} ${t(k('registrarCompraDesc'))}`
                            : t(k(`desc_${tab.key}`))
                        }
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </section>
      </Tabs>
    </div>
  );
}

export default function FacturacionPage() {
  // Antes era `adminOnly`. Al mudar acá la única puerta para registrar una
  // factura de proveedor, dejarla sólo para administradores le quitaba al
  // CONTADOR algo que sí podía hacer desde Liquidaciones — y el contador es
  // justamente quien factura. Mismo par de roles que /pagos.
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <FacturacionContent />
    </PageGuard>
  );
}
