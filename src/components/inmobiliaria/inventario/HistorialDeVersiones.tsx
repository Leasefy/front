'use client';

/**
 * Las versiones del inventario del inmueble, de la más nueva a la más vieja.
 * «Ver» abre una versión en sólo lectura: una completa no se edita (un cambio
 * es una versión nueva), y el borrador se edita arriba, no acá.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { useI18n } from '@/lib/i18n';
import { instanteLegible } from '@/lib/inventario/bloqueo-por-inventario';
import type { VersionDelInventario } from '@/lib/types/inventario-del-inmueble';

const B = 'inmobiliaria.inventarioDelInmueble';

export function HistorialDeVersiones({ versiones }: { versiones: VersionDelInventario[] }) {
  const { t } = useI18n();
  const [abierta, setAbierta] = useState<VersionDelInventario | null>(null);

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="historial-de-versiones-titulo"
      data-testid="historial-de-versiones"
    >
      <h3 id="historial-de-versiones-titulo" className="text-sm font-semibold text-foreground">
        {t(`${B}.historialTitulo`)}
      </h3>
      {versiones.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t(`${B}.historialVacio`)}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {versiones.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
              data-testid={`version-${v.version}`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {t(`${B}.versionTitulo`, { version: v.version })}
                  </span>
                  <Badge variant={v.estado === 'COMPLETO' ? 'success' : 'secondary'}>
                    {t(v.estado === 'COMPLETO' ? `${B}.estadoCompleto` : `${B}.estadoBorrador`)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.estado === 'COMPLETO'
                    ? t(`${B}.completadaEl`, { fecha: instanteLegible(v.completadoEn) })
                    : t(`${B}.editadaEl`, { fecha: instanteLegible(v.updatedAt) })}
                  {' · '}
                  {t(`${B}.items`, { n: v.items.length })}
                  {v.contratos > 0 && <> · {t(`${B}.contratosQueLaUsan`, { n: v.contratos })}</>}
                  {v.origen === 'CONSIGNACION' && <> · {t(`${B}.origenConsignacion`)}</>}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAbierta(v)}>
                {t(`${B}.verVersion`)}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierta !== null} onOpenChange={(o) => !o && setAbierta(null)}>
        <DialogContent className="sm:max-w-3xl" data-testid="version-abierta">
          {abierta && (
            <>
              <DialogHeader>
                <DialogTitle>{t(`${B}.versionTitulo`, { version: abierta.version })}</DialogTitle>
                <DialogDescription>
                  {abierta.estado === 'COMPLETO'
                    ? t(`${B}.completadaEl`, { fecha: instanteLegible(abierta.completadoEn) })
                    : t(`${B}.editadaEl`, { fecha: instanteLegible(abierta.updatedAt) })}
                </DialogDescription>
              </DialogHeader>
              <ActaEntregaView
                inventoryItems={abierta.items}
                contractDate={abierta.completadoEn ?? abierta.updatedAt}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default HistorialDeVersiones;
