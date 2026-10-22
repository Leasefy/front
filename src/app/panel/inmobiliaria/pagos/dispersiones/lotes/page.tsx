'use client';

/**
 * Lotes al banco — los pagos a propietarios que salen juntos.
 *
 * Ruta: /panel/inmobiliaria/pagos/dispersiones/lotes
 * Permiso: `dispersiones`/view, el mismo del `GET` del back.
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaDeLotes } from '@/components/dispersiones/lotes/ListaDeLotes';
import { ComoSaleUnLote } from '@/components/dispersiones/lotes/ComoSaleUnLote';
import { LoQueFaltaDelMes } from '@/components/giros/LoQueFaltaDelMes';
import { esMesValido, mesActual } from '@/lib/recaudo/meses';
import {
  SECCION_DE_LOS_GIROS,
  TITULO_DE_LOS_GIROS,
  descripcionDelPaso,
  type PasoDeLosGiros,
} from '@/components/giros/PasosDeLosGiros';
import { useTr } from '@/lib/i18n/use-tr';

/**
 * «Ir a Lotes» desde un giro trae su mes (`?mes=2026-09`): la pantalla abre en
 * ESE mes y no en el de hoy. `useSearchParams` en Next 14 pide Suspense; el
 * respaldo es la lista en el mes actual.
 *
 * El paso 4 («Marcar pagado») es esta misma pantalla con los lotes que faltan
 * por marcar, y sin la tarjeta para armar el lote, que es del paso 3.
 */
function pasoDeLaRuta(paso: string | null): PasoDeLosGiros {
  return paso === 'pagado' ? 'pagado' : 'banco';
}

function LotesDelPaso() {
  const params = useSearchParams();
  const tr = useTr();
  const paso = pasoDeLaRuta(params.get('paso'));
  const mesPedido = params.get('mes');
  // El riel dice lo hecho en el mes que se elige en la lista.
  const [mes, setMes] = useState(() => (mesPedido && esMesValido(mesPedido) ? mesPedido : mesActual()));
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
      {/* Decisión 17 de Nico (22-10): «Lo que falta del mes» en vez del riel de chulos. */}
      <LoQueFaltaDelMes paso={paso} mes={mes} onCambiarMes={setMes} />
      {/* El mes lo manda el selector único de arriba (la lista ya no tiene el suyo). */}
      <ListaDeLotes
        key={paso}
        mes={mes}
        filtroInicial={paso === 'pagado' ? 'en_curso' : undefined}
        sinArmar={paso === 'pagado'}
      />
    </>
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
          <LotesDelPaso />
        </Suspense>
      </div>
    </PageGuard>
  );
}
