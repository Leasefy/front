'use client';

/**
 * El Piloto automático en «Tu plan de Leasefy» (Nico, 31-10-2026: «no veo por qué no sumaste lo del piloto automático
 * de poder comprar para sumar los 900 pesos adicionales»). Dice cuánto suma con SUS inmuebles y en cuánto queda el mes,
 * y lo compra ahí mismo: la prueba de 30 días si nunca lo prendió, o contratarlo si está en la prueba o ya terminó
 * (los mismos diálogos del Piloto, con el segundo factor). Contratado, su línea sale en la cuenta del plan y esto no
 * se pinta.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Presence } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ConfirmarAutomatico, pideSegundoFactor } from '@/components/inmobiliaria/piloto/ConfirmarAutomatico';
import { QueVaAPasar, QueVaAPasarAlContratar } from '@/components/inmobiliaria/piloto/PilotoActivacion';
import { useMonedaDeReferencia } from '@/components/precios/MonedaDeReferencia';
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service';
import type { CotizacionDelPlan } from '@/lib/conversion/acceso';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePilotoActivo } from '@/lib/hooks/piloto/use-piloto-opera-sola';
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context';
import type { PilotoActivoResponse } from '@/lib/api/piloto';
import { cn } from '@/lib/utils';

const numero = (n: number) => n.toLocaleString('es-CO');

type Compra = 'contratar' | 'probar' | null;

/** Qué se le ofrece según cómo está el Piloto de la inmobiliaria. Puro: se prueba solo. */
export function compraDelPiloto(d: PilotoActivoResponse | null): Compra {
  if (!d?.puedeCambiarlo) return null;
  if (d.sePuedeContratar === true && (d.motivo === 'activo' || d.motivo === 'prueba_terminada')) return 'contratar';
  if (d.sePuedeActivar && !d.sinVencimiento && (d.motivo === 'sin_activar' || d.motivo === 'apagado_por_la_inmobiliaria')) return 'probar';
  return null;
}

export function PilotoEnTuPlan({
  cotizacion,
  tarifas,
  onCambio,
  className,
}: {
  cotizacion: CotizacionDelPlan;
  tarifas: TarifasDeLeasefy['tarifas'] | null;
  /** Para volver a leer la cuenta del plan después de comprarlo. */
  onCambio?: () => void;
  className?: string;
}) {
  const { formato } = useMonedaDeReferencia();
  const { data, cambiando, cambiar, contratar, refetch } = usePilotoActivo();
  const flota = usePilotoFlotaCompartida();
  const [abierto, setAbierto] = useState<Compra>(null);
  const [contratado, setContratado] = useState(false);

  const d = cotizacion.desglose;
  if (!d || d.conPilotoAutomatico || !tarifas) return null;

  const porInmueble = tarifas.pilotoAutomatico.porInmueble;
  const n = cotizacion.inmuebles;
  const suma = n * porInmueble;
  const compra = contratado ? null : compraDelPiloto(data);
  const enPrueba = data?.motivo === 'activo' && data.prueba && !data.prueba.terminada ? data.prueba : null;

  const hacer = async (que: Exclude<Compra, null>) => {
    const r = que === 'contratar' ? await contratar() : await cambiar(true);
    if (r.ok) {
      void flota.refetch();
      onCambio?.();
      if (que === 'contratar') {
        setContratado(true);
        toast.success('Contrataste el Piloto automático: se suma desde tu próxima renovación.');
      } else {
        toast.success(`Empezó tu prueba del Piloto automático: ${numero(tarifas.pilotoAutomatico.pruebaDias)} días sin costo.`);
      }
      return { ok: true };
    }
    if (!pideSegundoFactor(r.fallo)) {
      const accion = que === 'contratar' ? 'contratar el Piloto automático' : 'empezar la prueba del Piloto automático';
      toast.error(mensajeParaLaPersona(r.fallo, { porDefecto: `No se pudo ${accion}.`, accion }));
    }
    return { ok: false, fallo: r.fallo };
  };

  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-6 sm:p-8', className)}
      data-testid="piloto-en-tu-plan"
      data-compra={compra ?? 'ninguna'}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">Súmale</p>
          <h2 className="mt-3 text-h3 text-fg">Piloto automático</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Los agentes hacen solos su trabajo, con el director que arma el plan del día. Lo que mueve plata o sale sin
            vuelta atrás te lo sigue pidiendo con un clic.
          </p>
          {enPrueba ? (
            <p className="mt-3 text-sm text-fg" data-testid="piloto-en-prueba">
              Estás en tu prueba: {enPrueba.diasRestantes === 1 ? 'te queda 1 día' : `te quedan ${numero(enPrueba.diasRestantes)} días`}. Al
              terminar vuelve a Copiloto si no lo contratas.
            </p>
          ) : null}
        </div>

        <div className="shrink-0 lg:text-right">
          <p className="text-body text-fg" data-testid="piloto-precio">
            <span className="font-mono tabular-nums">{formato(porInmueble)}</span> más por inmueble al mes
          </p>
          {n > 0 ? (
            <p className="mt-1 text-caption text-fg-muted" data-testid="piloto-con-tus-inmuebles">
              Con {n === 1 ? 'tu inmueble' : `tus ${numero(n)} inmuebles`} suma{' '}
              <span className="font-mono tabular-nums">{formato(suma)}</span>. Tu mes quedaría en{' '}
              <span className="font-mono tabular-nums text-fg">{formato(cotizacion.monto + suma)}</span> más IVA.
            </p>
          ) : (
            <p className="mt-1 text-caption text-fg-muted">Suma por cada inmueble activo que gestiones.</p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {compra === 'contratar' ? (
              <Button variant="secondary" className="h-11 rounded-full px-6" isLoading={cambiando} onClick={() => setAbierto('contratar')} data-testid="piloto-contratar">
                Contratar el Piloto
              </Button>
            ) : compra === 'probar' ? (
              <Button variant="secondary" className="h-11 rounded-full px-6" isLoading={cambiando} onClick={() => setAbierto('probar')} data-testid="piloto-probar">
                Probarlo {numero(tarifas.pilotoAutomatico.pruebaDias)} días gratis
              </Button>
            ) : null}
            <Button asChild variant="ghost" className="h-11 rounded-full px-5">
              <Link href="/panel/inmobiliaria/piloto">Cómo funciona</Link>
            </Button>
          </div>
          <Presence show={contratado}>
            <p className="mt-2 text-caption text-success" data-testid="piloto-contratado">
              Contratado: se suma desde tu próxima renovación.
            </p>
          </Presence>
          {!compra && !contratado && data && !data.puedeCambiarlo ? (
            <p className="mt-2 text-caption text-fg-muted">Lo contrata un administrador de tu inmobiliaria.</p>
          ) : null}
        </div>
      </div>

      {data ? (
        <>
          <ConfirmarAutomatico
            abierto={abierto === 'probar'}
            quien="el Piloto"
            pilotoActivo
            titulo="¿Empezar la prueba del Piloto automático?"
            descripcion="Desde ese momento el Piloto actúa a tu nombre en tu inmobiliaria."
            explicacion={<QueVaAPasar d={data} />}
            textoSi="Sí, empezar la prueba"
            textoVerificar="Verificar y empezar"
            onConfirmar={() => hacer('probar')}
            onCerrar={() => {
              setAbierto(null);
              void refetch();
            }}
          />
          <ConfirmarAutomatico
            abierto={abierto === 'contratar'}
            quien="el Piloto"
            pilotoActivo
            titulo="¿Contratar el Piloto automático?"
            descripcion="Deja de vencer: sigue trabajando a tu nombre en tu inmobiliaria."
            explicacion={<QueVaAPasarAlContratar d={data} porInmueble={porInmueble} />}
            textoSi="Sí, contratarlo"
            textoVerificar="Verificar y contratar"
            onConfirmar={() => hacer('contratar')}
            onCerrar={() => {
              setAbierto(null);
              void refetch();
            }}
          />
        </>
      ) : null}
    </section>
  );
}
