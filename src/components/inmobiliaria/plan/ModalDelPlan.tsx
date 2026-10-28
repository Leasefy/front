'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowsLeftRight, CheckCircle, Gift, HourglassMedium, PhoneCall, Receipt, Signature } from '@phosphor-icons/react';
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/use-auth';
import { conversionApi } from '@/lib/api/conversion.service';
import { precioDelMes, type AccesoDeLaCuenta, type CotizacionDelPlan } from '@/lib/conversion/acceso';

const PAGO = '/panel/inmobiliaria/upgrade';
const DIA = 24 * 60 * 60 * 1000;

export type MomentoDelModal = { clave: string; tipo: 'faltan' | 'termino' | 'gratis'; dias?: number };

/** Hitos del mes gratis en los que sale el modal (una vez cada uno). */
const HITOS = [10, 7, 3, 1] as const;

/**
 * Qué modal toca HOY (puro). Una vez por hito del mes gratis (10, 7, 3 y 1 día), una vez al día cuando terminó y, en
 * lo gratis, una vez por semana. `null` = ninguno.
 */
export function momentoDelModal(acceso: AccesoDeLaCuenta | null | undefined, hoy: Date): MomentoDelModal | null {
  if (!acceso) return null;
  const p = acceso.prueba;
  if (acceso.estado === 'prueba' && p) {
    const hito = [...HITOS].reverse().find((d) => p.diasQueQuedan <= d);
    return hito === undefined ? null : { clave: `faltan-${hito}`, tipo: 'faltan', dias: p.diasQueQuedan };
  }
  if (acceso.estado === 'gratis' && p?.vencida) {
    return { clave: `termino-${hoy.toISOString().slice(0, 10)}`, tipo: 'termino' };
  }
  if (acceso.estado === 'gratis') {
    const semana = (hoy.getTime() - (hoy.getTime() % (7 * DIA))) / (7 * DIA);
    return { clave: `gratis-${semana}`, tipo: 'gratis' };
  }
  return null;
}

const llave = (agencyId: string, clave: string) => `leasefy-modal-del-plan:${agencyId}:${clave}`;

function yaSalio(agencyId: string, clave: string): boolean {
  try {
    return window.localStorage.getItem(llave(agencyId, clave)) === '1';
  } catch {
    return false;
  }
}

function marcar(agencyId: string, clave: string) {
  try {
    window.localStorage.setItem(llave(agencyId, clave), '1');
  } catch {
    /* sin almacenamiento: puede volver a salir, no rompe nada */
  }
}

/** La bienvenida comercial (`CandadoDelModoComercial`) ya se cerró una vez. */
function bienvenidaVista(agencyId: string): boolean {
  try {
    return window.localStorage.getItem(`leasefy-bienvenida-comercial:${agencyId}`) === '1';
  } catch {
    return false;
  }
}

const LO_QUE_TIENES = [
  { icono: ArrowsLeftRight, texto: 'Recaudo en línea, cartera y giros a propietarios' },
  { icono: Signature, texto: 'Contratos con firma electrónica' },
  { icono: PhoneCall, texto: 'Mori cobra por ti a quien se atrasa' },
  { icono: Receipt, texto: 'Facturación electrónica y contabilidad' },
] as const;

/**
 * El modal del plan (Nico, 27-10-2026: «luego del mes ya le aparecería un modal muy hermoso para invitarlos a que
 * paguen… y a los que sí tienen el mes gratis, unos 10 días antes, irles mostrando cosas»). Sólo al administrador
 * (es quien paga); a los demás les habla la barra. No sale en la pantalla de pago ni en el registro.
 */
export function ModalDelPlan() {
  const { agency, agencyRole, user } = useAuth();
  const ruta = usePathname() ?? '';
  const reducido = usePrefersReducedMotion();
  const [momento, setMomento] = useState<MomentoDelModal | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionDelPlan | null>(null);
  const acceso = agency?.acceso ?? null;

  useEffect(() => {
    if (agencyRole !== 'ADMIN' || !agency?.id) return;
    if (ruta.startsWith('/panel/inmobiliaria/upgrade') || ruta.startsWith('/panel/inmobiliaria/checkout')) return;
    const m = momentoDelModal(acceso, new Date());
    if (!m || yaSalio(agency.id, m.clave)) return;
    // En lo gratis, nunca encima de la bienvenida del primer día (la del candado).
    if (m.tipo === 'gratis' && agency.modoComercial === true && !bienvenidaVista(agency.id)) return;
    let vivo = true;
    // Un respiro: que la pantalla cargue antes de invitar.
    const t = window.setTimeout(() => {
      if (!vivo) return;
      marcar(agency.id, m.clave);
      setMomento(m);
      conversionApi
        .accesoDeLaInmobiliaria()
        .then((a) => vivo && setCotizacion(a.cotizacion))
        .catch(() => undefined);
    }, 1500);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [acceso, agency?.id, agency?.modoComercial, agencyRole, ruta]);

  if (!momento || !acceso) return null;
  const aliado = acceso.prueba?.aliado ?? null;
  const nombre = user?.firstName ? `${user.firstName}, ` : '';
  const titulo =
    momento.tipo === 'termino'
      ? 'Tu mes gratis terminó'
      : momento.tipo === 'faltan'
        ? momento.dias === 1
          ? 'Mañana termina tu mes gratis'
          : `Te quedan ${momento.dias} días de tu mes gratis`
        : 'Lleva tu inmobiliaria en piloto automático';
  const subtitulo =
    momento.tipo === 'termino'
      ? `${nombre}gracias por probar Leasefy${aliado ? ` con ${aliado}` : ''}. Tu cuenta volvió al plan gratis y nada de lo que creaste se perdió: al pagar vuelve todo como lo dejaste.`
      : momento.tipo === 'faltan'
        ? `${nombre}${aliado ? `${aliado} te regaló` : 'tienes'} Leasefy completo. Deja tu plan activo antes de que termine y tu operación sigue sin pausa.`
        : `${nombre}publicar y atender interesados ya es tuyo, gratis. Con Leasefy completo, el cobro, los contratos y los giros se hacen solos.`;
  const Icono = momento.tipo === 'gratis' ? Gift : HourglassMedium;
  const cerrar = () => setMomento(null);

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid={`modal-del-plan-${momento.tipo}`}>
        <div className="grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="relative flex items-center justify-center overflow-hidden bg-primary-soft px-6 py-12">
            {[18, 13, 8].map((rem, i) => (
              <motion.span
                key={rem}
                aria-hidden="true"
                className="absolute rounded-full border border-primary/15"
                style={{ width: `${rem}rem`, height: `${rem}rem` }}
                initial={{ opacity: 0, scale: reducido ? 1 : 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...enterTransition(reducido), delay: reducido ? 0 : 0.08 * (3 - i) }}
              />
            ))}
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -6 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0, y: [0, -6, 0] }}
              transition={
                reducido ? enterTransition(true) : { ...enterTransition(false), y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }
              }
              className="relative flex h-24 w-24 flex-col items-center justify-center rounded-3xl bg-surface shadow-lg ring-1 ring-primary/10"
            >
              {momento.tipo === 'faltan' && momento.dias !== undefined ? (
                <>
                  <span className="text-[34px] font-[420] leading-none tracking-[-0.03em] text-primary tabular-nums">{momento.dias}</span>
                  <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">{momento.dias === 1 ? 'día' : 'días'}</span>
                </>
              ) : (
                <Icono className="h-12 w-12 text-primary" weight="duotone" aria-hidden="true" />
              )}
            </motion.div>
          </div>
          <div className="space-y-5 p-6 md:p-8">
            <DialogHeader className="space-y-2 border-0 p-0 text-left">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                {momento.tipo === 'gratis' ? 'Leasefy completo' : aliado ? `Tu mes gratis con ${aliado}` : 'Tu mes gratis'}
              </p>
              <DialogTitle className="text-h3 text-fg">{titulo}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">{subtitulo}</DialogDescription>
            </DialogHeader>
            <Stagger className="space-y-2.5">
              {LO_QUE_TIENES.map(({ icono: I, texto }) => (
                <StaggerItem key={texto} className="flex items-start gap-2.5">
                  <I className="mt-0.5 h-5 w-5 shrink-0 text-primary" weight="duotone" aria-hidden="true" />
                  <span className="text-sm text-fg">{texto}</span>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="flex items-center gap-2 text-sm text-fg" data-testid="modal-del-plan-precio">
              <CheckCircle className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
              {cotizacion
                ? `Con tus ${cotizacion.inmuebles.toLocaleString('es-CO')} inmuebles: ${precioDelMes(cotizacion.monto)} al mes más IVA.`
                : 'Desde $99.000 al mes más IVA, según tus inmuebles.'}
            </p>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" hideArrow onClick={cerrar} data-testid="modal-del-plan-ahora-no">
                {momento.tipo === 'termino' ? 'Seguir con lo gratis' : 'Más tarde'}
              </Button>
              <Button asChild onClick={cerrar}>
                <Link href={PAGO} data-testid="modal-del-plan-pagar">
                  {momento.tipo === 'termino' ? 'Volver a tener todo' : momento.tipo === 'faltan' ? 'Dejar mi plan activo' : 'Abrir todo Leasefy'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
