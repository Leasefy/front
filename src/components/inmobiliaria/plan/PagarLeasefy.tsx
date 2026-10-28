'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowsLeftRight,
  Buildings,
  CalendarCheck,
  ChatsCircle,
  CheckCircle,
  Gift,
  LockSimpleOpen,
  PhoneCall,
  Receipt,
  Signature,
} from '@phosphor-icons/react';
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AgencyCheckoutOverlay } from '@/components/inmobiliaria/AgencyCheckoutOverlay';
import { useAgencyCheckout } from '@/lib/hooks/useAgencyCheckout';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { useAuth } from '@/lib/auth/use-auth';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { conversionApi } from '@/lib/api/conversion.service';
import { precioDelMes, type AccesoConCotizacion } from '@/lib/conversion/acceso';
import { shouldResumeReactivation } from '@/app/panel/inmobiliaria/upgrade/resume-reactivation';
import { enlaceDeWhatsApp } from '@/lib/venta/whatsapp-de-leasefy';
import { RecargasDePreguntas } from './RecargasDePreguntas';

/** Lo que se abre al pagar: lo que la cuenta gratis ve en demo. */
const LO_QUE_SE_ABRE = [
  { icono: Signature, texto: 'Contratos con firma electrónica e inventario' },
  { icono: ArrowsLeftRight, texto: 'Recaudo en línea, cartera y giros a propietarios' },
  { icono: PhoneCall, texto: 'Mori cobra por llamada y WhatsApp a quien se atrasa' },
  { icono: Receipt, texto: 'Facturación electrónica y contabilidad' },
  { icono: ChatsCircle, texto: 'El chat de tu inmobiliaria y el piloto automático' },
  { icono: CalendarCheck, texto: 'Renovaciones, incrementos y mantenimientos' },
] as const;

/** Lo que la cuenta gratis ya tiene y no pierde nunca. */
const LO_GRATIS = ['Tus inmuebles en el marketplace', 'Interesados, visitas y postulaciones', 'Tu página de inmobiliaria'] as const;

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' });

/**
 * «Tu plan de Leasefy» (Nico, 27-10-2026: «pagar desde el panel»). La pantalla a la que llevan el modal del fin del
 * mes gratis, los correos y los candados: qué tiene hoy, cuánto le sale CON SUS inmuebles (la misma cuenta del
 * cobro) y pagar con Wompi (tarjeta, PSE o Nequi). Al pagar se abre todo. Antes (05-10) decía «Habla con Leasefy».
 */
export function PagarLeasefy() {
  const router = useRouter();
  const reducido = usePrefersReducedMotion();
  const { user, agency, refreshAgency } = useAuth();
  const permisos = usePermissionsContextSafe();
  const puedePagar = Boolean(permisos?.isAdmin || permisos?.canAccess('subscription', 'edit'));
  const { state: suscripcion, subscriptionStatus, refetch } = useAgencySubscription();
  const [datos, setDatos] = useState<AccesoConCotizacion | null>(null);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await conversionApi.accesoDeLaInmobiliaria());
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const checkout = useAgencyCheckout(() => {
    void refreshAgency({ despuesDeUnCambio: true });
    void refetch();
    // Quien vino del marketplace (agente o inmobiliaria) vuelve con sus tres pasos para activar abiertos
    // (`PasosParaActivar` lee `bienvenida`); la inmobiliaria de siempre, al panel.
    router.push(agency?.cuentaDeAgente || agency?.vinoDelMarketplace ? '/panel/inmobiliaria?bienvenida=activar' : '/panel/inmobiliaria');
  });

  if (error) return <FalloDeCarga error={error} queEs="tu plan" onReintentar={cargar} />;
  if (!datos) {
    return (
      <div className="space-y-6 p-6 lg:p-8" aria-busy="true">
        <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    );
  }

  const { estado, prueba, cotizacion } = datos;
  const reactivar = suscripcion?.openCharge && shouldResumeReactivation(suscripcion.openCharge, subscriptionStatus);
  const pagar = () => {
    if (!cotizacion) return;
    if (reactivar && suscripcion?.openCharge) {
      checkout.resume(suscripcion.openCharge.id, cotizacion.tier, subscriptionStatus);
      return;
    }
    void checkout.pay(cotizacion.tier, subscriptionStatus, suscripcion?.planTier ?? null);
  };
  const yaTieneTodo = estado === 'pagado' || estado === 'cliente';
  const whatsapp = enlaceDeWhatsApp({ quien: 'inmobiliaria', nombre: user?.firstName ?? null, empresa: agency?.name ?? null, queVio: 'el plan de Leasefy' });

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="pagar-leasefy">
      <BackButton />
      <EncabezadoDePantalla
        seccion="Tu cuenta"
        titulo="Tu plan de Leasefy"
        descripcion="Lo que tienes hoy y cuánto te sale Leasefy completo con tus inmuebles."
      />

      <EstadoDelPlan estado={estado} prueba={prueba} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <motion.section
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enterTransition(reducido)}
          className="relative overflow-hidden rounded-lg border border-primary/25 bg-surface p-6 sm:p-8"
          data-testid="leasefy-completo"
        >
          <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-soft" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-primary">
              <LockSimpleOpen size={14} weight="bold" aria-hidden="true" />
              Leasefy completo
            </p>
            {cotizacion ? (
              <div className="mt-4">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[44px] font-[420] leading-none tracking-[-0.03em] text-fg tabular-nums" data-testid="precio-del-mes">
                    {precioDelMes(cotizacion.monto)}
                  </span>
                  <span className="text-[15px] text-fg-muted">al mes más IVA</span>
                </p>
                <p className="mt-2 text-sm text-fg-muted">
                  {cotizacion.porInmueble
                    ? `Con tus ${cotizacion.inmuebles.toLocaleString('es-CO')} inmuebles gestionados y ${cotizacion.usuarios} usuarios: $2.100 por inmueble, mínimo $99.000.`
                    : `Plan ${cotizacion.nombre}.`}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-fg-muted">Escríbenos y te decimos cuánto te sale con tus inmuebles.</p>
            )}
            <Stagger className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {LO_QUE_SE_ABRE.map(({ icono: Icono, texto }) => (
                <StaggerItem key={texto} className="flex items-start gap-2.5 text-sm text-fg">
                  <Icono size={18} className="mt-0.5 shrink-0 text-primary" weight="duotone" aria-hidden="true" />
                  {texto}
                </StaggerItem>
              ))}
            </Stagger>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              {yaTieneTodo ? (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-success" data-testid="ya-tienes-todo">
                  <CheckCircle size={18} weight="fill" aria-hidden="true" />
                  Tu inmobiliaria ya tiene Leasefy completo.
                </p>
              ) : cotizacion && puedePagar ? (
                <Button className="h-12 rounded-full px-7 text-[15px]" onClick={pagar} isLoading={checkout.state === 'processing'} data-testid="pagar-el-plan">
                  {reactivar ? 'Pagar lo pendiente y seguir' : 'Pagar y abrir todo'}
                </Button>
              ) : (
                <p className="text-sm text-fg-muted">
                  {cotizacion ? 'El plan lo paga el administrador de tu inmobiliaria.' : null}
                </p>
              )}
              {!yaTieneTodo && (
                <Button asChild variant="secondary" className="h-12 rounded-full px-6 text-[15px]">
                  <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                    Hablar con Leasefy
                  </a>
                </Button>
              )}
            </div>
            {!yaTieneTodo && cotizacion && (
              <p className="mt-3 text-caption text-fg-subtle">Tarjeta, PSE o Nequi por Wompi. Se abre al instante y se renueva cada mes; cancelas cuando quieras.</p>
            )}
          </div>
        </motion.section>

        <section className="rounded-lg border border-border bg-surface p-6 sm:p-8" data-testid="lo-gratis">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
            <Buildings size={14} weight="bold" aria-hidden="true" />
            Gratis, siempre
          </p>
          <h2 className="mt-3 text-[18px] font-medium text-fg">Marketplace y Arrendamientos</h2>
          <p className="mt-1 text-sm text-fg-muted">Esto es tuyo pagues o no, y nada de lo que crees se pierde.</p>
          <ul className="mt-5 space-y-2.5">
            {LO_GRATIS.map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-sm text-fg">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-fg-subtle" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <RecargasDePreguntas />

      <AgencyCheckoutOverlay
        planName={cotizacion?.nombre ?? 'Leasefy'}
        isPaid
        state={checkout.state}
        error={checkout.error}
        paymentUrl={checkout.paymentUrl}
        popupBlocked={checkout.popupBlocked}
        pollError={checkout.pollError}
        awaitingTimedOut={checkout.awaitingTimedOut}
        resuming={checkout.resuming}
        onVerify={checkout.verifyNow}
        onClose={checkout.reset}
      />
    </div>
  );
}

function EstadoDelPlan({ estado, prueba }: Pick<AccesoConCotizacion, 'estado' | 'prueba'>) {
  let titulo: string;
  let texto: string;
  if (estado === 'prueba' && prueba) {
    titulo = prueba.diasQueQuedan === 1 ? 'Mañana termina tu mes gratis' : `Te quedan ${prueba.diasQueQuedan} días de tu mes gratis`;
    texto = `${prueba.aliado ? `${prueba.aliado} te regaló` : 'Tienes'} Leasefy completo hasta el ${fecha.format(new Date(prueba.termina))}. Si pagas antes, no se apaga nada.`;
  } else if (estado === 'gratis' && prueba?.vencida) {
    titulo = 'Tu mes gratis terminó';
    texto = `Terminó el ${fecha.format(new Date(prueba.termina))}. Tu cuenta volvió al plan gratis y lo que creaste sigue ahí: al pagar vuelve todo como lo dejaste.`;
  } else if (estado === 'gratis') {
    titulo = 'Tienes el plan gratis';
    texto = 'Publicas en el marketplace y atiendes interesados sin pagar nada. Lo demás de Leasefy se abre al pagar.';
  } else {
    titulo = 'Tienes Leasefy completo';
    texto = 'Tu inmobiliaria tiene todo abierto. Gracias por confiar en Leasefy.';
  }
  const total = prueba ? Math.max(1, (new Date(prueba.termina).getTime() - new Date(prueba.empieza).getTime()) / 86_400_000) : 0;
  const usado = estado === 'prueba' && prueba ? Math.min(100, Math.max(0, ((total - prueba.diasQueQuedan) / total) * 100)) : null;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center" data-testid="estado-del-plan">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Gift size={22} weight="duotone" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-medium text-fg">{titulo}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{texto}</p>
        {usado !== null && (
          <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${usado}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}
