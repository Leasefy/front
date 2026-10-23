'use client';

/**
 * Los dos estados que no son «acá está la plata»: el fallo y el mes sin nada.
 *
 * Vivían dentro de `DispersionWizard`. Salieron a un archivo propio cuando el
 * asistente de seis pasos se volvió UNA pantalla (21-09): lo que se fue son los
 * pasos, no las lecciones — sobre todo la de D7, que el motivo del back no se
 * puede tirar y reemplazar por una frase fija.
 */

import { CurrencyCircleDollar } from '@phosphor-icons/react';

import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AvisoLiquidacionFrenada } from '../AvisoLiquidacionFrenada';
import {
  leerLiquidacionFrenada,
  motivoLegible,
} from '@/lib/api/dispersiones-errores';

/**
 * Lo que la pantalla dice cuando el back no liquidó, en tres escalones:
 *
 *   1. Un dato del inmueble frena el mes (`code` conocido) → cuál inmueble,
 *      el motivo del back y el enlace a su ficha. Sin reintentar: da igual.
 *   2. Otro 4xx con motivo → el motivo, tal cual lo escribió el back.
 *   3. Red o servidor → `FalloDeCarga`, que sí ofrece reintentar.
 */
export function FalloDelAsistente({
  error,
  queNoSalio,
  onReintentar,
}: {
  error: unknown;
  queNoSalio: string;
  onReintentar?: () => void;
}) {
  const frenada = leerLiquidacionFrenada(error);
  if (frenada) {
    return (
      <AvisoLiquidacionFrenada
        frenada={frenada}
        despues="generar los giros"
      />
    );
  }
  const motivo = motivoLegible(error);
  if (motivo) {
    return (
      <AlertaAccionable
        severidad="danger"
        titulo={queNoSalio}
        data-testid="asistente-motivo"
      >
        {motivo}
      </AlertaAccionable>
    );
  }
  return (
    <FalloDeCarga
      error={error}
      queEs="los giros del mes"
      onReintentar={onReintentar}
      enmarcado
    />
  );
}

/** El vacío, con la razón que contó el back. */
export function MesSinGiros({
  motivo,
  accion,
}: {
  motivo: { titulo: string; detalle: string };
  /** La salida del vacío («Ver los giros de octubre»): un vacío sin acción deja a la persona sin camino. */
  accion?: { label: string; href: string };
}) {
  // El vacío de Cadence (círculo, título liviano, una acción secondary) dentro del recuadro punteado del asistente.
  return (
    <div className="rounded-lg border border-dashed border-border" data-testid="asistente-mes-vacio">
      <EmptyState icon={CurrencyCircleDollar} title={motivo.titulo} description={motivo.detalle} action={accion} />
    </div>
  );
}
