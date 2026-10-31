'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowSquareOut, PencilSimple, UserPlus } from '@phosphor-icons/react';
import { BackButton, Tabs, TabsContent, TabsList, TabsTrigger } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { CompletarMandatoDialog } from '@/components/inmobiliaria/CompletarMandatoDialog';
import { FotosDelInmueble } from '@/components/inmobiliaria/FotosDelInmueble';
import { ConsignacionEditForm } from '@/components/inmobiliaria/ConsignacionEditForm';
import { FichaDelInmueble } from '@/components/inmobiliaria/ficha/FichaDelInmueble';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { ObservacionesInternas } from '@/components/inmobiliaria/ficha/ObservacionesInternas';
import { EstadoDelInmueble } from '@/components/inmobiliaria/ficha/EstadoDelInmueble';
import { useAgentes, useInmueblesSinConsignacion, usePropietarios } from '@/lib/hooks/useInmobiliaria';
import type { Property } from '@/lib/types/property';
import { propertiesApi } from '@/lib/api/properties.service';
import { formatCurrency } from '@/lib/format';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';

/**
 * La ficha de un inmueble SIN propietario (Juan, 27-10-2026: «si no tiene propietario, no me deja seguir a
 * editarlo ni nada»). La ficha de siempre (`/inmuebles/[id]`) va por la CONSIGNACIÓN y un inmueble captado sin
 * propietario no tiene una; aquí se ve, se edita, se cambian sus fotos (Multimedia) y se anotan las observaciones
 * internas. «Agregar propietario» abre el mismo diálogo del portafolio, que crea la consignación con lo pactado.
 */
function FichaSinPropietario({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [completar, setCompletar] = useState(false);
  const [inmueble, setInmueble] = useState<Property | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);
  const refetch = useCallback(async () => {
    setErrorCrudo(null);
    try {
      setInmueble(await propertiesApi.getById(propertyId));
    } catch (e) {
      setErrorCrudo(e);
    }
  }, [propertyId]);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  const { inmuebles, refetch: recargarFila } = useInmueblesSinConsignacion();
  const { propietarios } = usePropietarios();
  const { agentes } = useAgentes();
  const fila = useMemo(() => inmuebles.find((i) => i.propertyId === propertyId) ?? null, [inmuebles, propertyId]);

  if (errorCrudo) {
    return <FalloDeCarga error={errorCrudo} queEs="el inmueble" onReintentar={refetch} />;
  }
  if (!inmueble) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface-muted" aria-busy="true" />;
  }

  const precio =
    inmueble.listingType === 'sale'
      ? inmueble.salePrice
        ? formatCurrency(inmueble.salePrice)
        : 'Precio por confirmar'
      : inmueble.monthlyRent
        ? `${formatCurrency(inmueble.monthlyRent)}/mes`
        : 'Canon por confirmar';

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackButton href="/panel/inmobiliaria/inmuebles" label="Volver a Inmuebles" />
        <EncabezadoDePantalla
          seccion="Arrendamientos"
          titulo={inmueble.title || 'Inmueble'}
          descripcion={[inmueble.address, barrioYCiudad(inmueble.neighborhood, inmueble.city)].filter(Boolean).join(' · ')}
          acciones={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" hideArrow onClick={() => setEditando(true)} data-testid="ficha-sin-propietario-editar">
                <PencilSimple className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
              <Button hideArrow onClick={() => setCompletar(true)} disabled={!fila} data-testid="ficha-sin-propietario-agregar">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Agregar propietario
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <EstadoDelInmueble estado={fila?.status ?? inmueble.status} />
          <span className="rounded-full bg-warning-soft px-2.5 py-1 text-caption font-medium text-fg" data-testid="sin-propietario">
            Sin propietario
          </span>
          <span className="text-sm font-medium text-fg">{precio}</span>
          <Link
            href={`/propiedades/${propertyId}`}
            target="_blank"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver como lo ve el cliente
            <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 🔴 31-10-2026 (Nico: «en la ficha del inmueble no aparece todo lo que puede tener y la posibilidad de
          llenarlo, así como lo tendría un inmueble migrado»): la ficha completa, con «Lo que falta» y su editar. */}
      <Tabs defaultValue="ficha">
        <TabsList>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
          <TabsTrigger value="observaciones">Observaciones internas</TabsTrigger>
          <TabsTrigger value="propietario">Propietario</TabsTrigger>
        </TabsList>
        <TabsContent value="ficha" className="mt-4">
          <FichaDelInmueble property={inmueble} onEditar={() => setEditando(true)} loQueFaltaEnLaLista />
        </TabsContent>
        <TabsContent value="multimedia" className="mt-4">
          <FotosDelInmueble propertyId={propertyId} onCambio={() => void refetch()} />
        </TabsContent>
        <TabsContent value="observaciones" className="mt-4">
          <ObservacionesInternas propertyId={propertyId} />
        </TabsContent>
        <TabsContent value="propietario" className="mt-4">
          <EmptyState
            icon={UserPlus}
            ilustracion="llaves"
            title="Todavía no tiene propietario"
            description="Se publica igual. El propietario, su cédula y su cuenta los agregas cuando vayas a hacer el contrato; la comisión que pactaste ya quedó guardada."
            action={fila ? { label: 'Agregar propietario', onClick: () => setCompletar(true) } : undefined}
          />
        </TabsContent>
      </Tabs>

      {editando ? (
        <ConsignacionEditForm
          abierto
          soloElInmueble
          onCerrar={() => setEditando(false)}
          // Sin mandato todavía: el cajón sólo edita el inmueble (sin la sección del mandato).
          consignacion={
            {
              id: '',
              propertyId,
              listingType: inmueble.listingType === 'sale' ? 'sale' : 'rent',
              status: 'active',
              propertyTitle: inmueble.title,
              propertyAddress: inmueble.address,
              propertyCity: inmueble.city,
              propertyZone: inmueble.neighborhood ?? '',
              monthlyRent: inmueble.monthlyRent ?? null,
              adminFee: inmueble.adminFee ?? 0,
              commissionPercent: 0,
              agenteId: null,
            } as unknown as Consignacion
          }
          property={inmueble}
          onGuardado={() => undefined}
          onGuardadoElInmueble={() => void refetch()}
        />
      ) : null}

      <CompletarMandatoDialog
        inmueble={completar ? fila : null}
        onClose={() => setCompletar(false)}
        propietarios={propietarios}
        agentes={agentes}
        onCompleted={() => {
          setCompletar(false);
          void recargarFila();
          // Ya tiene consignación: su ficha es la de siempre.
          router.push(`/panel/inmobiliaria/inmuebles/${propertyId}?por=inmueble`);
        }}
      />
    </div>
  );
}

export default function Pagina({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = use(params);
  return (
    <PageGuard module="portafolio" action="view">
      <div className="p-6 lg:p-8">
        <FichaSinPropietario propertyId={propertyId} />
      </div>
    </PageGuard>
  );
}
