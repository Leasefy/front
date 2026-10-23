'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/cadence';
import { ConsignacionWizard } from '@/components/inmobiliaria/ConsignacionWizard';
import {
  OrigenDelInmueble,
  origenInicial,
} from '@/components/inmobiliaria/consignacion/OrigenDelInmueble';
import { ElegirInmuebleDrawer } from '@/components/inmobiliaria/consignacion/ElegirInmuebleDrawer';
import { CompletarMandatoDialog } from '@/components/inmobiliaria/CompletarMandatoDialog';
import {
  usePropietarios,
  useAgentes,
  useInmueblesSinConsignacion,
} from '@/lib/hooks/useInmobiliaria';
import { lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

const PORTAFOLIO = '/panel/inmobiliaria/inmuebles';

/**
 * Qué se está haciendo:
 *  - `null`      → todavía no eligió: se pregunta (`OrigenDelInmueble`). Sólo
 *                  ocurre cuando se asigna a un propietario concreto.
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

  // Con qué arranca la pantalla: la regla vive en `origenInicial`, con su
  // porqué. Resumen: sólo se pregunta cuando se asigna a un propietario.
  const origenEnLaUrl = searchParams.get('origen');
  const seAsignaAUnPropietario = propietarioInicial !== undefined;
  const [origen, setOrigen] = useState<Origen | null>(() =>
    origenInicial({ origenEnLaUrl, propietarioId: propietarioInicial }),
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Glow up 22-10: el encabezado común, sin la caja de ícono de color. */}
      <div className="space-y-3">
        <BackButton href={volverA} label={etiquetaDeRegreso} />
        <EncabezadoDePantalla
          seccion={t('inmobiliaria.nav.inmuebles')}
          titulo={t('inmobiliaria.portafolio.new.title')}
          descripcion={t('inmobiliaria.portafolio.new.subtitle')}
        />
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
          // Cerrar el drawer sin elegir vuelve a donde se venía: a la
          // pregunta si la hubo, y al asistente si no —nunca a una pantalla
          // en blanco.
          if (!abierto && !elegido) setOrigen(seAsignaAUnPropietario ? null : 'nuevo');
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
    <PageGuard module="portafolio" action="create">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <NuevaConsignacionContent />
      </Suspense>
    </PageGuard>
  );
}
