'use client';

/**
 * «¿Te podemos arrendar este inmueble?» — el paso 1 en la ficha pública.
 *
 * Nico, 2026-09-14: la persona escribe su ingreso (y el de su codeudor, si
 * tiene) y toca «Verificar». Mientras escribe no se le dice nada. Al verificar:
 * - si no le alcanza (ingreso < 1,5 × canon), se lo decimos acá con lo que le
 *   falta — no tiene sentido pedirle cédula, autorización y pago;
 * - si le alcanza, sigue al paso 2: el formulario del estudio con Fianly
 *   (`/aprobacion?paso=2…`), ya prellenado con el canon, la ciudad y el tipo.
 *
 * Es un estimado (ver `estimado-de-arriendo.ts`) y lo dice.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WarningCircle } from '@phosphor-icons/react';
import { CampoDeMedianoche } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCurrency } from '@/lib/format';
import type { PropertyType } from '@/lib/types/property';
import {
  estimarArriendo,
  tipoParaElEstudio,
  type EstimadoDeArriendo,
} from '@/lib/aprobacion/estimado-de-arriendo';
import { guardarArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo';

interface TePodemosArrendarProps {
  propertyId: string;
  titulo: string;
  foto?: string | null;
  canon: number;
  ciudad?: string | null;
  tipo?: PropertyType | null;
  className?: string;
}

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="text-fg-muted">{etiqueta}</span>
      <span className={`font-mono tabular-nums ${fuerte ? 'font-medium text-fg' : 'font-normal text-fg'}`}>{valor}</span>
    </div>
  );
}

export function TePodemosArrendar({ propertyId, titulo, foto, canon, ciudad, tipo, className }: TePodemosArrendarProps) {
  const router = useRouter();
  const [ingreso, setIngreso] = useState('');
  const [ingresoCodeudor, setIngresoCodeudor] = useState('');
  // Sólo lo que dio «Verificar» y no alcanzó. Si alcanza, se navega al paso 2.
  const [noAlcanza, setNoAlcanza] = useState<EstimadoDeArriendo | null>(null);
  // Le alcanzó y ya va hacia «¡Felicitaciones!»: el botón carga mientras llega
  // (Nico, 15-09) y no deja un segundo clic.
  const [yendoALaRespuesta, setYendoALaRespuesta] = useState(false);

  const cambiar = (fijar: (v: string) => void) => (v: string) => {
    fijar(v);
    // Un resultado viejo encima de un número nuevo mentiría.
    setNoAlcanza(null);
  };

  const verificar = () => {
    const estimado = estimarArriendo({
      canon,
      ingreso: Number(ingreso) || 0,
      ingresoCodeudor: Number(ingresoCodeudor) || 0,
    });
    if (!estimado) return;
    if (estimado.alcanza) {
      guardarArriendoEnCurso({
        propertyId,
        titulo,
        ciudad: ciudad ?? null,
        tipo: tipoParaElEstudio(tipo),
        foto: foto ?? null,
        canon,
        ingresoTotal: estimado.ingresoTotal,
        canonMaximo: estimado.canonMaximo,
      });
      setYendoALaRespuesta(true);
      router.push(`/arrendar/${propertyId}`);
      return;
    }
    setNoAlcanza(estimado);
  };

  const puedeVerificar = (Number(ingreso) || 0) > 0;

  return (
    /*
      Ronda 30 (diseño nuevo): el único momento de medianoche de la ficha. El
      campo de marca de Cadence (fondo de noche, retícula y grano) y, adentro,
      los tokens del tema oscuro (`dark`) para que los campos, los pasos y el
      aviso se lean sobre la noche sin pintar nada a mano. Antes, una tarjeta
      blanca con sombra.
    */
    <CampoDeMedianoche
      as="section"
      cruces={false}
      aria-labelledby="te-podemos-arrendar-titulo"
      data-testid="te-podemos-arrendar"
      className={`dark rounded-[28px] border border-white/[0.09] p-[clamp(22px,3vw,34px)] text-fg ${className ?? ''}`}
    >
      <p className="inline-flex items-center gap-2.5 font-mono text-[13px] uppercase leading-[1.3] tracking-[0.08em] text-fg-subtle">
        <span className="h-2 w-2 shrink-0 rounded-[2px] bg-primary" aria-hidden />
        Paso 1 de 3
      </p>
      <h2
        id="te-podemos-arrendar-titulo"
        className="mt-3.5 max-w-[560px] text-balance text-[clamp(26px,2.5vw,34px)] font-[360] leading-[1.1] tracking-[-0.03em] text-fg"
      >
        ¿Te podemos arrendar este inmueble?
      </h2>
      <p className="mt-2 text-[15px] text-fg-muted">Escribe tu ingreso y verifica si te alcanza para este canon.</p>

      <div className="mt-6 grid gap-5 min-[701px]:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpa-ingreso" className="text-[14px] font-medium text-fg">
              Tu ingreso mensual
            </label>
            <MoneyInput id="tpa-ingreso" value={ingreso} onChange={cambiar(setIngreso)} placeholder="4.500.000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpa-codeudor" className="text-[14px] font-medium text-fg">
              Ingreso de tu codeudor <span className="font-normal text-fg-muted">(opcional)</span>
            </label>
            <MoneyInput
              id="tpa-codeudor"
              value={ingresoCodeudor}
              onChange={cambiar(setIngresoCodeudor)}
              placeholder="0"
            />
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-[20px] border border-white/[0.09] bg-white/[0.04] p-[18px]"
        >
          {noAlcanza ? (
            <div data-testid="estimado-no-alcanza" className="flex items-start gap-2.5 rounded-md bg-warning-soft px-3.5 py-3">
              <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
              <div>
                <p className="text-[14px] font-medium text-warning">Con ese ingreso no te alcanza</p>
                <p data-testid="estimado-faltante" className="mt-0.5 text-[13.5px] text-fg-muted">
                  Te faltan <span className="font-mono tabular-nums">{formatCurrency(noAlcanza.faltante)}</span> de
                  ingreso al mes. Un codeudor puede sumar el suyo.
                </p>
              </div>
            </div>
          ) : (
            <div data-testid="estimado-vacio" className="flex flex-col gap-3">
              <p className="text-[14px] font-medium text-fg">Así funciona</p>
              <PasosDelArriendo actual={1} orientation="vertical" conDescripcion />
            </div>
          )}
          <div className="flex flex-col gap-1.5 border-t border-white/[0.09] pt-3">
            <Fila etiqueta="Canon del inmueble" valor={formatCurrency(canon)} />
            {noAlcanza && (
              <>
                <Fila etiqueta="Ingreso que cuenta" valor={formatCurrency(noAlcanza.ingresoTotal)} />
                <Fila etiqueta="Canon que podrías pagar" valor={formatCurrency(noAlcanza.canonMaximo)} fuerte />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-[22px] flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-white/[0.09] pt-5">
        <p data-testid="nota-estimado" className="min-w-[min(100%,280px)] max-w-[52ch] flex-1 text-[13px] text-fg-muted">
          <span className="font-medium text-fg">Es un cálculo rápido con tu ingreso, no una aprobación.</span> Si te
          alcanza, en el siguiente paso validamos tus datos y te damos la respuesta definitiva para arrendar este
          inmueble.
        </p>
        <Button
          type="button"
          onClick={verificar}
          disabled={!puedeVerificar || yendoALaRespuesta}
          isLoading={yendoALaRespuesta}
          data-testid="verificar-arriendo"
          className="h-11 flex-shrink-0 px-5 text-[15px]"
        >
          {yendoALaRespuesta ? 'Verificando…' : 'Verificar'}
        </Button>
      </div>
    </CampoDeMedianoche>
  );
}
