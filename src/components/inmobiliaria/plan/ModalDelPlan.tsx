'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle } from '@phosphor-icons/react';
import type { NombreIlustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BeneficiosEn3D, ChipDelAliado, EscenaDeMarca, FOTOS_DE_LA_ESCENA, PlacaDe3D, VentanaDelProducto } from '@/components/conversion/EscenaDeMarca';
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

/** La frase del precio: con los inmuebles de la cuenta, o el mínimo si todavía no hay (nunca «tus 0 inmuebles»). */
export function fraseDelPrecio(cotizacion: CotizacionDelPlan | null): string {
  if (cotizacion && cotizacion.inmuebles > 0) {
    const cuantos = cotizacion.inmuebles === 1 ? 'tu inmueble' : `tus ${cotizacion.inmuebles.toLocaleString('es-CO')} inmuebles`;
    return `Con ${cuantos}: ${precioDelMes(cotizacion.monto)} al mes más IVA.`;
  }
  return 'Desde $99.000 al mes más IVA, según tus inmuebles. Dos usuarios incluidos.';
}

/**
 * La escena de cada momento (Nico 31-10-2026: «haz más hermosos los modales de mejora tu plan»): la foto, la pantalla
 * REAL de Leasefy completo asomando (el tablero de la operación) y, en su esquina, la cuenta de días o el 3D.
 */
const ESCENAS: Record<MomentoDelModal['tipo'], { principal: NombreIlustracion; foto: string }> = {
  gratis: { principal: 'novedad_cohete', foto: FOTOS_DE_LA_ESCENA[1] },
  faltan: { principal: 'reloj_mora', foto: FOTOS_DE_LA_ESCENA[0] },
  termino: { principal: 'llaves', foto: FOTOS_DE_LA_ESCENA[3] },
};

const TABLERO = { src: '/landing-v2/producto/erp-tablero.webp', alt: 'El tablero de Leasefy completo: recaudo, cartera y giros del mes' };

/** La cuenta de días en el centro de la escena: el número grande en su ficha. */
function CuentaDeDias({ dias }: { dias: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] bg-bg px-7 py-5 shadow-[0_18px_40px_rgba(4,16,48,0.35)] ring-1 ring-border">
      <span className="text-[56px] font-[420] leading-none tracking-[-0.04em] text-primary tabular-nums" data-testid="modal-del-plan-dias">
        {dias}
      </span>
      <span className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{dias === 1 ? 'día' : 'días'}</span>
    </div>
  );
}

/**
 * El modal del plan (Nico, 27-10-2026: «luego del mes ya le aparecería un modal muy hermoso para invitarlos a que
 * paguen… y a los que sí tienen el mes gratis, unos 10 días antes, irles mostrando cosas»). Sólo al administrador
 * (es quien paga); a los demás les habla la barra. No sale en la pantalla de pago ni en el registro.
 */
export function ModalDelPlan() {
  const { agency, agencyRole, user } = useAuth();
  const ruta = usePathname() ?? '';
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
  const escena = ESCENAS[momento.tipo];
  const cerrar = () => setMomento(null);

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid={`modal-del-plan-${momento.tipo}`}>
        <DialogBody className="p-0 sm:p-0">
          <EscenaDeMarca
            foto={escena.foto}
            asomando
            marca={
              aliado && momento.tipo !== 'gratis' ? <ChipDelAliado aliado={aliado} /> : undefined
            }
          >
            <VentanaDelProducto
              captura={TABLERO.src}
              alt={TABLERO.alt}
              acento={
                momento.tipo === 'faltan' && momento.dias !== undefined ? (
                  <CuentaDeDias dias={momento.dias} />
                ) : (
                  <PlacaDe3D nombre={escena.principal} tamano={64} />
                )
              }
            />
          </EscenaDeMarca>
          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                {momento.tipo === 'gratis' ? 'Leasefy completo' : aliado ? `Tu mes gratis con ${aliado}` : 'Tu mes gratis'}
              </p>
              <DialogTitle className="text-h2 text-fg">{titulo}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">{subtitulo}</DialogDescription>
            </div>
            <BeneficiosEn3D />
            <p className="flex items-center gap-2.5 rounded-xl bg-success-soft px-3 py-2.5 text-body-sm text-fg" data-testid="modal-del-plan-precio">
              <CheckCircle className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
              {fraseDelPrecio(cotizacion)}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
