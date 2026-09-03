'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Buildings } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/cadence';
import { ConsignacionWizard } from '@/components/inmobiliaria/ConsignacionWizard';
import { OrigenDelInmueble } from '@/components/inmobiliaria/consignacion/OrigenDelInmueble';
import { ElegirInmuebleDrawer } from '@/components/inmobiliaria/consignacion/ElegirInmuebleDrawer';
import { CompletarMandatoDialog } from '@/components/inmobiliaria/CompletarMandatoDialog';
import {
  usePropietarios,
  useAgentes,
  useInmueblesSinConsignacion,
} from '@/lib/hooks/useInmobiliaria';
import { lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

const PORTAFOLIO = '/panel/inmobiliaria/inmuebles';

/**
 * Qué se está haciendo:
 *  - `null`      → todavía no eligió: se pregunta (`OrigenDelInmueble`).
 *  - `nuevo`     → el asistente de siempre, intacto.
 *  - `existente` → drawer con los inmuebles sin mandato + el diálogo de mandato.
 */
type Origen = 'nuevo' | 'existente';

function NuevaConsignacionContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { propietarios } = usePropietarios();
  const { agentes } = useAgentes();

  // Desde la ficha de un propietario se llega con `?propietarioId=` (para
  // quién es) y `?volver=` (a dónde regresar). Desde el portafolio, sin nada.
  const propietarioInicial = searchParams.get('propietarioId') ?? undefined;
  const volverA = rutaDeRegreso(searchParams.get('volver'), PORTAFOLIO);
  const etiquetaDeRegreso =
    lugarDeRegreso(volverA) === 'propietario'
      ? t('inmobiliaria.portafolio.new.backToOwner')
      : t('inmobiliaria.portafolio.detail.backToPortfolio');

  /**
   * Nico (2026-09-02): la consignación puede ser sobre un inmueble nuevo o
   * sobre uno que ya está en el portafolio (migrado por Excel o por enlace y
   * todavía sin mandato). Se pregunta ANTES de pedir un solo dato.
   *
   * `?origen=nuevo` salta la pregunta: lo usa quien ya sabe, y deja el enlace
   * viejo al asistente funcionando igual que siempre.
   */
  const origenEnLaUrl = searchParams.get('origen');
  const [origen, setOrigen] = useState<Origen | null>(
    origenEnLaUrl === 'nuevo' || origenEnLaUrl === 'existente' ? origenEnLaUrl : null,
  );
  const [drawerAbierto, setDrawerAbierto] = useState(origenEnLaUrl === 'existente');
  const [elegido, setElegido] = useState<InmuebleSinConsignacion | null>(null);

  const {
    inmuebles: sinMandato,
    isLoading: cargandoSinMandato,
    error: errorSinMandato,
  } = useInmueblesSinConsignacion();

  const irAlPortafolio = () => router.push(volverA);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back Link */}
        <BackButton href={volverA} label={etiquetaDeRegreso} />

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
            <Buildings className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {t('inmobiliaria.portafolio.new.title')}
            </h1>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.portafolio.new.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {origen === 'nuevo' ? (
        <ConsignacionWizard
          propietarios={propietarios}
          agentes={agentes}
          propietarioInicial={propietarioInicial}
          volverA={volverA}
        />
      ) : (
        <OrigenDelInmueble
          disponibles={sinMandato.length}
          cargando={cargandoSinMandato}
          onNuevo={() => setOrigen('nuevo')}
          onExistente={() => {
            setOrigen('existente');
            setDrawerAbierto(true);
          }}
        />
      )}

      {/* El camino «ya está en el portafolio»: elegir cuál y darle el mandato. */}
      <ElegirInmuebleDrawer
        abierto={drawerAbierto}
        onOpenChange={(abierto) => {
          setDrawerAbierto(abierto);
          // Cerrar el drawer sin elegir vuelve a la pregunta, no a una
          // pantalla en blanco.
          if (!abierto && !elegido) setOrigen(null);
        }}
        inmuebles={sinMandato}
        cargando={cargandoSinMandato}
        error={errorSinMandato}
        onElegir={(inmueble) => {
          setElegido(inmueble);
          setDrawerAbierto(false);
        }}
        onCrearNuevo={() => {
          setDrawerAbierto(false);
          setOrigen('nuevo');
        }}
      />

      <CompletarMandatoDialog
        inmueble={elegido}
        propietarios={propietarios}
        agentes={agentes}
        propietarioInicial={propietarioInicial}
        onClose={() => {
          setElegido(null);
          // Cancelar el mandato devuelve al drawer: lo más probable es que se
          // haya equivocado de inmueble, no que quiera abandonar todo.
          setDrawerAbierto(true);
        }}
        onCompleted={() => {
          setElegido(null);
          irAlPortafolio();
        }}
      />
    </div>
  );
}

export default function NuevaConsignacionPage() {
  return (
    <PageGuard module="portafolio">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <NuevaConsignacionContent />
      </Suspense>
    </PageGuard>
  );
}
