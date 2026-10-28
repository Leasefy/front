'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, HourglassMedium, LockSimpleOpen, X } from '@phosphor-icons/react';
import { enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';

import { useAuth } from '@/lib/auth/use-auth';
import { DIAS_PARA_INSISTIR, type AccesoDeLaCuenta } from '@/lib/conversion/acceso';
import { cn } from '@/lib/utils';

const PAGO = '/panel/inmobiliaria/upgrade';
const DIAS_SIN_LA_BARRA_GRATIS = 7;
const llaveDeLaBarra = (agencyId: string) => `leasefy-barra-del-plan-gratis:${agencyId}`;

export interface MensajeDeLaBarra {
  tono: 'regalo' | 'urgente' | 'gratis';
  texto: string;
  boton: string;
  /** La de lo gratis se puede cerrar por 7 días; la del mes gratis no (es su cuenta regresiva). */
  sePuedeCerrar: boolean;
}

/** Qué dice la barra según el acceso. `null` = no se pinta (paga, es cliente o el back no lo dice). Pura. */
export function mensajeDeLaBarra(acceso: AccesoDeLaCuenta | null | undefined): MensajeDeLaBarra | null {
  if (!acceso) return null;
  const p = acceso.prueba;
  if (acceso.estado === 'prueba' && p) {
    const quien = p.aliado ? `${p.aliado} te regaló` : 'Tienes';
    if (p.diasQueQuedan <= DIAS_PARA_INSISTIR) {
      const cuando = p.diasQueQuedan === 1 ? 'Mañana termina tu mes gratis' : `Te quedan ${p.diasQueQuedan} días de tu mes gratis`;
      return {
        tono: 'urgente',
        texto: `${cuando}. Deja tu plan activo y no se apaga nada de lo que montaste.`,
        boton: 'Dejar mi plan activo',
        sePuedeCerrar: false,
      };
    }
    return {
      tono: 'regalo',
      texto: `${quien} un mes de Leasefy completo: te quedan ${p.diasQueQuedan} días. Úsalo todo.`,
      boton: 'Ver mi plan',
      sePuedeCerrar: false,
    };
  }
  if (acceso.estado === 'gratis' && p?.vencida) {
    return {
      tono: 'urgente',
      texto: 'Tu mes gratis terminó. Lo que creaste sigue ahí: al pagar vuelve todo como lo dejaste.',
      boton: 'Seguir con todo',
      sePuedeCerrar: false,
    };
  }
  if (acceso.estado === 'gratis') {
    return {
      tono: 'gratis',
      texto: 'Estás en el plan gratis: marketplace y Arrendamientos. Abre todo Leasefy desde $99.000 al mes.',
      boton: 'Abrir todo',
      sePuedeCerrar: true,
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
  const Icono = mensaje?.tono === 'urgente' ? HourglassMedium : mensaje?.tono === 'regalo' ? Gift : LockSimpleOpen;

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
            className={cn(
              'flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center',
              mensaje.tono === 'urgente' && 'border-transparent bg-ink text-ink-fg',
              mensaje.tono === 'regalo' && 'border-primary/25 bg-primary-soft text-fg',
              mensaje.tono === 'gratis' && 'border-border bg-surface text-fg',
            )}
          >
            <span className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
              <Icono size={18} weight="duotone" className={cn('mt-0.5 shrink-0', mensaje.tono === 'urgente' ? 'text-ink-fg' : 'text-primary')} aria-hidden="true" />
              <span className="min-w-0">{mensaje.texto}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Link
                href={pago}
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors duration-fast',
                  mensaje.tono === 'urgente' ? 'bg-ink-fg text-ink hover:bg-ink-fg/90' : 'bg-primary text-primary-fg hover:bg-primary/90',
                )}
                data-testid="barra-del-plan-boton"
              >
                {mensaje.boton}
              </Link>
              {mensaje.sePuedeCerrar && (
                <button
                  type="button"
                  onClick={cerrar}
                  className="inline-flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted"
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
