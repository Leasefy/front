'use client';

/**
 * «Tienes un inventario sin subir de este inmueble, de las 3:12 p. m.»
 *
 * 🔴 Nico, 2026-09-12: el inventario se llena en apartamentos donde no hay
 * señal. Esta barra es lo único que la persona ve de toda esa maquinaria, así
 * que tiene que decir tres cosas sin que nadie las adivine: que su trabajo
 * está guardado, que todavía no llegó al sistema, y qué falta para que llegue.
 *
 * No aparece cuando no hay nada pendiente: con señal la subida arranca sola y
 * la barra ni se ve.
 */

import { CloudArrowUp, SpinnerGap, WarningCircle, WifiSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { AvanceDeSubida } from '@/lib/inventario/subir-borrador';

interface Props {
  hayPendientes: boolean;
  /** Marca de tiempo del borrador, para decir de cuándo es. */
  actualizadoEn: number | null;
  fotosSinSubir: number;
  /** `null` mientras todavía se está midiendo. */
  senal: boolean | null;
  subiendo: boolean;
  avance: AvanceDeSubida | null;
  errorDeSubida: string | null;
  onSubir: () => void;
  onDescartar: () => void;
}

/**
 * «9:19 p. m.» — el locale ya deja el punto final de «m.», así que la frase
 * que la use NO lleva otro detrás: si no, queda «de las 9:19 p. m..».
 */
function hora(marca: number): string {
  return new Date(marca).toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BarraDeBorradorDeInventario({
  hayPendientes,
  actualizadoEn,
  fotosSinSubir,
  senal,
  subiendo,
  avance,
  errorDeSubida,
  onSubir,
  onDescartar,
}: Props) {
  if (!hayPendientes && !subiendo) return null;

  const sinSenal = senal === false;

  // Se apila SIEMPRE, sin `sm:flex-row`: esta barra vive en la columna
  // angosta de la ficha del inmueble (~300 px), y un breakpoint de VENTANA no
  // sabe nada de eso — en pantalla grande ponía el texto y los dos botones en
  // fila dentro de esa columna, y salía una palabra por renglón.
  return (
    <div
      className={`rounded-md border border-border p-3 flex flex-col gap-3 ${
        sinSenal ? 'bg-warning-soft' : 'bg-info-soft'
      }`}
      data-testid="borrador-de-inventario"
    >
      <div className="flex items-start gap-2">
        {subiendo ? (
          <SpinnerGap className="w-5 h-5 text-info flex-shrink-0 mt-0.5 animate-spin" />
        ) : sinSenal ? (
          <WifiSlash className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        ) : (
          <CloudArrowUp className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`text-sm font-medium ${sinSenal ? 'text-warning' : 'text-info'}`}>
            {subiendo
              ? avance && avance.fotosTotales > 0
                ? `Subiendo el inventario… ${avance.fotosSubidas} de ${avance.fotosTotales} fotos`
                : 'Subiendo el inventario…'
              : actualizadoEn
                ? `Tienes un inventario sin subir de este inmueble, de las ${hora(actualizadoEn)}`
                : 'Tienes un inventario sin subir de este inmueble.'}
          </p>
          <p className="text-body-sm text-fg-muted mt-0.5">
            {subiendo
              ? 'No cierres la pantalla hasta que termine.'
              : sinSenal
                ? 'Está guardado en este teléfono. Lo subimos apenas haya señal; puedes seguir agregando ítems mientras tanto.'
                : 'Está guardado en este teléfono y todavía no llegó al inmueble ni al contrato.'}
            {!subiendo && fotosSinSubir > 0 && (
              <>
                {' '}
                {fotosSinSubir === 1 ? 'Falta 1 foto.' : `Faltan ${fotosSinSubir} fotos.`}
              </>
            )}
          </p>
          {errorDeSubida && !subiendo && (
            <p className="text-body-sm text-danger mt-1 flex items-start gap-1.5">
              <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {errorDeSubida}
            </p>
          )}
        </div>
      </div>

      {!subiendo && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={onDescartar}
            data-testid="borrador-descartar"
          >
            Descartar
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={onSubir}
            /* Con señal desconocida (`null`) todavía se deja tocar: el propio
               botón vuelve a medirla antes de intentar. Lo que NO se hace es
               habilitarlo cuando ya sabemos que no hay. */
            disabled={sinSenal}
            title={sinSenal ? 'Sin señal. Lo subimos apenas vuelva.' : undefined}
            data-testid="borrador-subir"
          >
            <CloudArrowUp className="w-4 h-4" />
            Subir inventario
          </Button>
        </div>
      )}
    </div>
  );
}

export default BarraDeBorradorDeInventario;
