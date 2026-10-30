'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { enterTransition, Ilustracion, StatusBadge, usePrefersReducedMotion, type NombreIlustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';

import { useAuth } from '@/lib/auth/use-auth';
import { DIAS_PARA_INSISTIR, type AccesoDeLaCuenta, type VistaDeLaPrueba } from '@/lib/conversion/acceso';
import { cn } from '@/lib/utils';

const PAGO = '/panel/inmobiliaria/upgrade';
const DIAS_SIN_LA_BARRA_GRATIS = 7;
const llaveDeLaBarra = (agencyId: string) => `leasefy-barra-del-plan-gratis:${agencyId}`;

export interface MensajeDeLaBarra {
  /** regalo = el mes gratis va bien (naranja); urgente = quedan pocos días o terminó (rojo); gratis = lo gratis. */
  tono: 'regalo' | 'urgente' | 'gratis';
  /** La frase entera (lector de pantalla y pruebas). */
  texto: string;
  /** Lo que se lee primero, en negrita. */
  titulo: string;
  /** La segunda línea. */
  detalle: string;
  boton: string;
  /** La de lo gratis se puede cerrar por 7 días; la del mes gratis no (es su cuenta regresiva). */
  sePuedeCerrar: boolean;
  ilustracion: NombreIlustracion;
  /** Los días que quedan del mes gratis (la pastilla) y cuánto queda del mes, de 0 a 1 (la línea). */
  dias: number | null;
  queda: number | null;
}

const UN_DIA = 24 * 60 * 60 * 1000;

/** Cuánto queda del mes gratis, de 0 a 1, con su largo de verdad (30 días si no se puede leer). */
function loQueQueda(p: VistaDeLaPrueba): number {
  const largo = Math.round((Date.parse(p.termina) - Date.parse(p.empieza)) / UN_DIA);
  const total = Number.isFinite(largo) && largo > 0 ? largo : 30;
  return Math.max(0, Math.min(1, p.diasQueQuedan / total));
}

/** Qué dice la barra según el acceso. `null` = no se pinta (paga, es cliente o el back no lo dice). Pura. */
export function mensajeDeLaBarra(acceso: AccesoDeLaCuenta | null | undefined): MensajeDeLaBarra | null {
  if (!acceso) return null;
  const p = acceso.prueba;
  if (acceso.estado === 'prueba' && p) {
    const quien = p.aliado ? `${p.aliado} te regaló` : 'Tienes';
    if (p.diasQueQuedan <= DIAS_PARA_INSISTIR) {
      const cuando = p.diasQueQuedan === 1 ? 'Mañana termina tu mes gratis' : `Te quedan ${p.diasQueQuedan} días de tu mes gratis`;
      const detalle = 'Deja tu plan activo y no se apaga nada de lo que montaste.';
      return {
        tono: 'urgente',
        texto: `${cuando}. ${detalle}`,
        titulo: cuando,
        detalle,
        boton: 'Dejar mi plan activo',
        sePuedeCerrar: false,
        ilustracion: 'reloj_mora',
        dias: p.diasQueQuedan,
        queda: loQueQueda(p),
      };
    }
    return {
      tono: 'regalo',
      texto: `${quien} un mes de Leasefy completo: te quedan ${p.diasQueQuedan} días. Úsalo todo.`,
      titulo: `${quien} un mes de Leasefy completo`,
      detalle: 'Contratos, cobro, giros y facturación: úsalo todo mientras dura.',
      boton: 'Ver mi plan',
      sePuedeCerrar: false,
      ilustracion: 'novedad_regalo',
      dias: p.diasQueQuedan,
      queda: loQueQueda(p),
    };
  }
  if (acceso.estado === 'gratis' && p?.vencida) {
    const detalle = 'Lo que creaste sigue ahí: al pagar vuelve todo como lo dejaste.';
    return {
      tono: 'urgente',
      texto: `Tu mes gratis terminó. ${detalle}`,
      titulo: 'Tu mes gratis terminó',
      detalle,
      boton: 'Seguir con todo',
      sePuedeCerrar: false,
      ilustracion: 'reloj_mora',
      dias: 0,
      queda: 0,
    };
  }
  if (acceso.estado === 'gratis') {
    return {
      tono: 'gratis',
      texto: 'Estás en el plan gratis: marketplace y Arrendamientos. Abre todo Leasefy desde $99.000 al mes.',
      titulo: 'Estás en el plan gratis',
      detalle: 'Marketplace, Arrendamientos e Inquilinos son tuyos. Abre todo Leasefy desde $99.000 al mes.',
      boton: 'Abrir todo',
      sePuedeCerrar: true,
      ilustracion: 'plan_insignia',
      dias: null,
      queda: null,
    };
  }
  return null;
}

function cerradaHaceMenosDe7Dias(agencyId: string): boolean {
  try {
    const vez = Number(window.localStorage.getItem(llaveDeLaBarra(agencyId)));
    return Number.isFinite(vez) && vez > 0 && Date.now() - vez < DIAS_SIN_LA_BARRA_GRATIS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * La barra del plan (Nico, 27-10-2026): arriba del contenido, en cada pantalla del panel. En el mes gratis cuenta los
 * días; desde 10 antes del fin se pone seria; terminado, invita a seguir; en lo gratis, una franja que se cierra por
 * 7 días. Sin `acceso` (back anterior) no se pinta.
 *
 * Nico, 28-10-2026: «esa alerta azul oscura de arriba está horrible … naranja que da alerta, y luego rojo cuando falte
 * poco, los que manejamos en badges». Con los tonos de advertencia y peligro de Cadence, el 3D de cada momento, la
 * pastilla de los días que quedan y una línea que se va gastando con el mes.
 */
export function BarraDelMesGratis({
  acceso: accesoDado,
  pago = PAGO,
  soloElMesGratis = false,
}: {
  /** El acceso de la persona (el propietario); sin él, el de la inmobiliaria de la sesión. */
  acceso?: AccesoDeLaCuenta | null;
  pago?: string;
  /** El propietario: sólo la cuenta regresiva del mes gratis (su plan gratis ya tiene su propia venta). */
  soloElMesGratis?: boolean;
} = {}) {
  const { agency } = useAuth();
  const reducido = usePrefersReducedMotion();
  const crudo = mensajeDeLaBarra(accesoDado !== undefined ? accesoDado : agency?.acceso);
  const mensaje = soloElMesGratis && crudo?.tono === 'gratis' ? null : crudo;
  const [cerrada, setCerrada] = useState(true);

  useEffect(() => {
    setCerrada(Boolean(mensaje?.sePuedeCerrar && agency?.id && cerradaHaceMenosDe7Dias(agency.id)));
  }, [mensaje?.sePuedeCerrar, agency?.id]);

  const cerrar = () => {
    setCerrada(true);
    try {
      if (agency?.id) window.localStorage.setItem(llaveDeLaBarra(agency.id), String(Date.now()));
    } catch {
      /* sin almacenamiento: vuelve a salir la próxima vez */
    }
  };

  const visible = Boolean(mensaje) && !(mensaje?.sePuedeCerrar && cerrada);

  return (
    <AnimatePresence initial={false}>
      {visible && mensaje && (
        <motion.div
          key={mensaje.tono}
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducido ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={enterTransition(reducido)}
          className="px-4 pt-4 sm:px-6 lg:px-8"
          data-testid="barra-del-plan"
          data-tono={mensaje.tono}
        >
          <div
            role="status"
            aria-label={mensaje.texto}
            className={cn(
              'relative flex flex-col gap-3 overflow-hidden rounded-2xl border py-3 pl-3 pr-3 sm:flex-row sm:items-center sm:gap-4 sm:pr-4',
              mensaje.tono === 'regalo' && 'border-warning/30 bg-warning-soft',
              mensaje.tono === 'urgente' && 'border-danger/30 bg-danger-soft',
              mensaje.tono === 'gratis' && 'border-border bg-surface shadow-sm',
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-xl',
                  mensaje.tono === 'regalo' && 'bg-surface/70',
                  mensaje.tono === 'urgente' && 'bg-surface/70',
                  mensaje.tono === 'gratis' && 'bg-primary-soft',
                )}
              >
                <Ilustracion nombre={mensaje.ilustracion} tamano={40} tono="auto" alt="" />
              </span>
              <span className="min-w-0 flex-1" aria-hidden="true">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      'text-body-sm font-medium',
                      mensaje.tono === 'regalo' && 'text-warning-ink',
                      mensaje.tono === 'urgente' && 'text-danger-ink',
                      mensaje.tono === 'gratis' && 'text-fg',
                    )}
                  >
                    {mensaje.titulo}
                  </span>
                  {mensaje.dias !== null && mensaje.dias > 0 && (
                    <StatusBadge tone={mensaje.tono === 'urgente' ? 'critical' : 'warning'} pulse={mensaje.tono === 'urgente'} data-testid="barra-del-plan-dias">
                      {mensaje.dias === 1 ? 'Queda 1 día' : `Quedan ${mensaje.dias} días`}
                    </StatusBadge>
                  )}
                </span>
                <span className="mt-0.5 block text-caption text-fg-muted sm:text-body-sm">{mensaje.detalle}</span>
                {mensaje.queda !== null && (
                  <span className="mt-2 block h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface/80">
                    <motion.span
                      className={cn('block h-full rounded-full', mensaje.tono === 'urgente' ? 'bg-danger' : 'bg-warning')}
                      initial={reducido ? false : { width: '100%' }}
                      animate={{ width: `${Math.round(mensaje.queda * 100)}%` }}
                      transition={reducido ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    />
                  </span>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 self-stretch sm:self-auto">
              <Button asChild size="sm" className="flex-1 sm:flex-none" data-testid="barra-del-plan-boton">
                <Link href={pago}>{mensaje.boton}</Link>
              </Button>
              {mensaje.sePuedeCerrar && (
                <button
                  type="button"
                  onClick={cerrar}
                  className="inline-flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-muted"
                  aria-label="Cerrar por ahora"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
