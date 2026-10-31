'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { DescripcionConFormato } from '@/components/property/DescripcionConFormato';
import { propertiesApi } from '@/lib/api/properties.service';
import { formatCurrency } from '@/lib/format';
import { descripcionPublica } from '@/lib/inmuebles/descripcion-publica';
import { nombreDeLaCaracteristica } from '@/lib/inmuebles/caracteristicas';
import { resumenDeEspecificaciones } from '@/lib/inmuebles/especificaciones';
import type { PortafolioRow } from '@/lib/types/inmobiliaria';
import type { Property } from '@/lib/types/property';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

/**
 * Ver el inmueble sin salir de la tabla (Nico, 31-10-2026: «dejar previsualizar la propiedad sin tener que meterse a
 * ella desde la tabla… en un modal»). Las fotos, el precio, las especificaciones, las características y la
 * descripción con su formato; «Abrir la ficha» lleva a la ficha completa.
 */
export function VistaPreviaDelInmueble({ fila, onCerrar }: { fila: PortafolioRow | null; onCerrar: () => void }) {
  const tr = useTr();
  const [inmueble, setInmueble] = useState<Property | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);
  const [foto, setFoto] = useState(0);
  const [intento, setIntento] = useState(0);
  const propertyId = fila?.propertyId ?? null;

  useEffect(() => {
    setInmueble(null);
    setFallo(null);
    setFoto(0);
    if (!propertyId) return;
    let vivo = true;
    propertiesApi
      .getById(propertyId)
      .then((p) => vivo && setInmueble(p))
      .catch((e) => vivo && setFallo(e));
    return () => {
      vivo = false;
    };
  }, [propertyId, intento]);

  const enlace = fila
    ? fila.kind === 'consignacion'
      ? `/panel/inmobiliaria/inmuebles/${fila.id}`
      : `/panel/inmobiliaria/inmuebles/sin-propietario/${fila.propertyId}`
    : '#';
  const fotos = inmueble?.images ?? (fila?.propertyThumbnail ? [fila.propertyThumbnail] : []);
  const esVenta = (inmueble?.listingType ?? fila?.listingType) === 'sale';
  const precio = esVenta ? inmueble?.salePrice ?? null : inmueble?.monthlyRent ?? fila?.monthlyRent ?? null;
  const caracteristicas = (fila?.especificaciones?.caracteristicas ?? inmueble?.amenities ?? [])
    .map((c) => nombreDeLaCaracteristica(String(c)))
    .filter((x): x is string => Boolean(x));
  const descripcion = descripcionPublica(inmueble?.description);

  return (
    <Dialog open={Boolean(fila)} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent size="lg" data-testid="vista-previa-del-inmueble">
        <DialogHeader>
          <DialogTitle>{fila?.propertyTitle ?? tr('Inmueble')}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {[fila?.propertyAddress, fila?.propertyZone, fila?.propertyCity].filter(Boolean).join(', ')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {fallo ? <FalloDeCarga error={fallo} queEs={tr('el inmueble')} onReintentar={() => setIntento((n) => n + 1)} /> : null}
          {fotos.length > 0 ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotos[foto]} alt={fila?.propertyTitle ?? ''} className="aspect-[16/10] w-full rounded-lg object-cover" />
              {fotos.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label={tr('Fotos')}>
                  {fotos.slice(0, 12).map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      role="listitem"
                      aria-label={tr('Foto {n}', { n: i + 1 })}
                      aria-current={i === foto}
                      onClick={() => setFoto(i)}
                      className={cn('h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors', i === foto ? 'border-primary' : 'border-transparent')}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-h3 tabular-nums text-fg" data-testid="vista-previa-precio">
              {precio && precio > 0 ? formatCurrency(precio) : tr('Precio por confirmar')}
              {!esVenta && precio && precio > 0 ? <span className="ml-1 text-body-sm text-fg-muted">{tr('al mes')}</span> : null}
            </p>
            <p className="text-body-sm text-fg-muted" data-testid="vista-previa-especificaciones">
              {resumenDeEspecificaciones(fila?.especificaciones) || tr('Sin especificaciones registradas')}
            </p>
          </div>

          {caracteristicas.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={tr('Características')}>
              {caracteristicas.map((c) => (
                <li key={c} className="rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg">
                  {c}
                </li>
              ))}
            </ul>
          ) : null}

          {inmueble ? (
            descripcion ? (
              <DescripcionConFormato texto={descripcion} className="text-body-sm leading-[1.6] text-fg-muted" />
            ) : (
              <p className="text-body-sm text-fg-subtle">{tr('Sin descripción todavía.')}</p>
            )
          ) : !fallo ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-surface-muted" />
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={onCerrar}>
            {tr('Cerrar')}
          </Button>
          <Button asChild variant="ink" hideArrow>
            <Link href={enlace}>{tr('Abrir la ficha')}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
