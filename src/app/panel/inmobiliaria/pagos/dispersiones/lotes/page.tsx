'use client';

/**
 * Lotes al banco — los pagos a propietarios que salen juntos.
 *
 * Ruta: /panel/inmobiliaria/pagos/dispersiones/lotes
 * Permiso: `dispersiones`/view, el mismo del `GET` del back.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaDeLotes } from '@/components/dispersiones/lotes/ListaDeLotes';
import { ComoSaleUnLote } from '@/components/dispersiones/lotes/ComoSaleUnLote';
import {
  PasosDeLosGiros,
  SECCION_DE_LOS_GIROS,
  TITULO_DE_LOS_GIROS,
  descripcionDelPaso,
  type PasoDeLosGiros,
} from '@/components/giros/PasosDeLosGiros';
import { useTr } from '@/lib/i18n/use-tr';

/**
 * «Ir a Lotes» desde una dispersión trae su mes (`?mes=2026-09`): la pantalla
 * abre en ESE mes y no en el de hoy. `useSearchParams` en Next 14 pide
 * Suspense; el respaldo es la lista en el mes actual.
 */
/** El paso 4 («Marcar pagado») es esta misma pantalla con los lotes que faltan por marcar. */
function pasoDeLaRuta(paso: string | null): PasoDeLosGiros {
  return paso === 'pagado' ? 'pagado' : 'banco';
}

function EncabezadoYPasos() {
  const params = useSearchParams();
  const tr = useTr();
  const paso = pasoDeLaRuta(params.get('paso'));
  return (
    <>
      {/* «¿Cómo funciona?» a la derecha, donde iría el botón de acción
          (05-10-2026): abre el cajón con los cinco pasos de un lote. */}
      <EncabezadoDePantalla
        seccion={tr(SECCION_DE_LOS_GIROS)}
        titulo={tr(TITULO_DE_LOS_GIROS)}
        descripcion={tr(descripcionDelPaso(paso))}
        ayuda={<ComoSaleUnLote />}
      />
      <PasosDeLosGiros paso={paso} />
    </>
  );
}

function ListaEnElMesPedido() {
  const params = useSearchParams();
  // Paso 4: abre en los lotes «en curso», los que esperan que el banco pague y se marquen.
  return (
    <ListaDeLotes
      mesInicial={params.get('mes')}
      filtroInicial={params.get('paso') === 'pagado' ? 'en_curso' : undefined}
    />
  );
}

export default function LotesDeDispersionPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* Giros a propietarios (Nico, 22-10-2026): el archivo del banco y marcar pagado son los
            pasos 3 y 4 de la misma tarea que Liquidaciones y Dispersiones. */}
        <Suspense
          fallback={
            <EncabezadoDePantalla
              seccion={SECCION_DE_LOS_GIROS}
              titulo={TITULO_DE_LOS_GIROS}
              descripcion={descripcionDelPaso('banco')}
            />
          }
        >
          <EncabezadoYPasos />
        </Suspense>
        <Suspense fallback={<ListaDeLotes />}>
          <ListaEnElMesPedido />
        </Suspense>
      </div>
    </PageGuard>
  );
}
