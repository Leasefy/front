'use client';

/**
 * El acta de entrega del inmueble, para imprimir.
 *
 * Antes la fila «Acta de entrega» de Documentos hacía scroll a la tarjeta de
 * inventario —que ya estaba a la vista— y «no pasaba nada» (Nico, 2026-09-03);
 * y los botones de imprimir/descargar de esa tarjeta decían «Próximamente».
 * Esta hoja es el acta de verdad: el inmueble, sus dueños, el inventario con
 * el estado de cada ítem y los espacios para firmar. Se imprime con el botón
 * (o Ctrl+P): el `<style>` de abajo esconde el panel al imprimir.
 *
 * «Descargar PDF» la baja como archivo: el back renderiza la misma hoja
 * (`GET /consignaciones/:id/acta.pdf`). Es de sólo lectura: el inventario se
 * edita en la ficha.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, DownloadSimple, Package, Printer, SpinnerGap } from '@phosphor-icons/react';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import { descargar } from '@/lib/propietarios/exportar-datos';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth/use-auth';
import { useConsignacion, usePropietario } from '@/lib/hooks/useInmobiliaria';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatParticipacion } from '@/lib/types/inmobiliaria';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

const ESTILO_DE_IMPRESION = `
@media print {
  aside, header, nav, .fixed, [data-nivel], [data-acta-oculto] { display: none !important; }
  .lg\\:pl-\\[240px\\], .lg\\:pl-16 { padding-left: 0 !important; }
  main { padding: 0 !important; }
  body { background: #fff !important; }
  .acta-hoja { border: 0 !important; box-shadow: none !important; max-width: none !important; }
  /* El Table del DS envuelve la tabla en un contenedor con scroll. Al paginar,
     un bloque con overflow se trata como indivisible y un inventario largo se
     corta al final de la primera hoja. En papel no hay scroll. */
  .acta-hoja .overflow-auto { overflow: visible !important; }
}
`;

export default function ActaDeEntregaPage() {
  const params = useParams();
  const consignacionId = params.id as string;
  const { t, formatDate } = useI18n();
  const { agency } = useAuth();
  const { consignacion, isLoading, error, refetch } = useConsignacion(consignacionId);
  const { propietario } = usePropietario(consignacion?.propietarioId);
  const [bajando, setBajando] = useState(false);

  const bajarPdf = async () => {
    if (!consignacion) return;
    setBajando(true);
    try {
      const blob = await consignacionesApi.getActaPdf(consignacion.id);
      descargar(blob, `acta-entrega-${consignacion.propertyCode ?? consignacion.id.slice(0, 8)}.pdf`);
    } catch (err) {
      toast.error(t('inmobiliaria.acta.downloadError'), {
        description: err instanceof ApiError && err.message.length < 160 ? err.message : undefined,
      });
    } finally {
      setBajando(false);
    }
  };

  const condicion: Record<InventoryItem['condition'], string> = {
    excellent: t('inmobiliaria.acta.condExcellent'),
    good: t('inmobiliaria.acta.condGood'),
    fair: t('inmobiliaria.acta.condFair'),
    poor: t('inmobiliaria.acta.condPoor'),
  };

  const items = consignacion?.inventoryItems ?? [];
  const duenos =
    consignacion && consignacion.copropietarios.length > 1
      ? consignacion.copropietarios.map((c) => ({
          nombre: c.propietario?.name ?? c.propietarioId,
          participacion: formatParticipacion(c.participacionBps),
        }))
      : propietario
        ? [{ nombre: propietario.name, participacion: null }]
        : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <style>{ESTILO_DE_IMPRESION}</style>

      <div className="mb-4 flex items-center justify-between gap-3" data-acta-oculto>
        <Link
          href={`/panel/inmobiliaria/inmuebles/${consignacionId}`}
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('inmobiliaria.acta.backToProperty')}
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" hideArrow onClick={() => window.print()} disabled={!consignacion} data-testid="acta-imprimir">
            <Printer className="h-4 w-4" />
            {t('inmobiliaria.acta.print')}
          </Button>
          <Button hideArrow onClick={() => void bajarPdf()} disabled={!consignacion || bajando} data-testid="acta-descargar">
            {bajando ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <DownloadSimple className="h-4 w-4" />}
            {t('inmobiliaria.acta.downloadPdf')}
          </Button>
        </div>
      </div>

      <EstadoDeDatos
        cargando={isLoading}
        error={error}
        vacio={!consignacion}
        queEs="el acta"
        onReintentar={refetch}
        esqueleto={<div className="h-96 animate-pulse rounded-lg bg-surface-muted" />}
      >
        {consignacion && (
          <article
            className="acta-hoja rounded-lg border border-border bg-surface p-8 text-fg shadow-sm print:p-0"
            data-testid="acta-hoja"
          >
            <header className="mb-6 border-b border-border pb-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                {agency?.name ?? t('inmobiliaria.common.title')}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{t('inmobiliaria.acta.pageTitle')}</h1>
              <p className="mt-1 text-sm text-fg-muted">
                {t('inmobiliaria.acta.deliveryDateLabel')}: {formatDate(consignacion.contractDate)}
              </p>
            </header>

            <section className="mb-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                  {t('inmobiliaria.acta.property')}
                </h2>
                <p className="mt-1 font-medium">{consignacion.propertyTitle}</p>
                <p className="text-sm text-fg-muted">
                  {consignacion.propertyAddress}, {consignacion.propertyCity}
                </p>
                {consignacion.propertyCode != null && (
                  <p className="mt-1 font-mono text-xs text-fg-muted">#{consignacion.propertyCode}</p>
                )}
              </div>
              <div>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                  {t('inmobiliaria.acta.owner')}
                </h2>
                {duenos.length === 0 ? (
                  <p className="mt-1 text-sm text-fg-muted">—</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {duenos.map((d) => (
                      <li key={d.nombre} className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{d.nombre}</span>
                        {d.participacion && (
                          <span className="font-mono text-xs tabular-nums text-fg-muted">{d.participacion}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {propietario?.documentNumber && duenos.length === 1 && (
                  <p className="text-sm text-fg-muted">
                    {propietario.documentType} {propietario.documentNumber}
                  </p>
                )}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                {t('inmobiliaria.acta.inventorySection')} · {items.length} {t('inmobiliaria.acta.itemsLabel')}
              </h2>
              {items.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={t('inmobiliaria.acta.noInventory')}
                  description={t('inmobiliaria.acta.noInventoryDesc')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    {/* El encabezado no es una fila sobre la que se pueda actuar: sin hover. */}
                    <TableRow className="hover:bg-transparent">
                      <TableHead scope="col" className="px-0 pr-3">
                        {t('inmobiliaria.acta.thItem')}
                      </TableHead>
                      <TableHead scope="col" numeric className="px-0 pr-3">
                        {t('inmobiliaria.acta.thQty')}
                      </TableHead>
                      <TableHead scope="col" className="px-0 pr-3">
                        {t('inmobiliaria.acta.thCondition')}
                      </TableHead>
                      <TableHead scope="col" className="px-0">
                        {t('inmobiliaria.acta.thNotes')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-0 py-2 pr-3 align-top">{item.name}</TableCell>
                        <TableCell numeric className="px-0 py-2 pr-3 align-top font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="px-0 py-2 pr-3 align-top">
                          {condicion[item.condition]}
                        </TableCell>
                        <TableCell className="px-0 py-2 align-top text-fg-muted">
                          {item.notes ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section>
              <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                {t('inmobiliaria.acta.signatures')}
              </h2>
              <div className="grid gap-8 sm:grid-cols-3">
                {[t('inmobiliaria.acta.owner'), t('inmobiliaria.acta.agent'), t('inmobiliaria.acta.tenant')].map((quien) => (
                  <div key={quien} className="pt-10">
                    <div className="border-t border-fg/60" />
                    <p className="mt-2 text-sm text-fg-muted">{quien}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        )}
      </EstadoDeDatos>
    </div>
  );
}
