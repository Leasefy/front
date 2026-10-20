'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LockSimple, Megaphone, CheckCircle } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  INICIO_DEL_MODO_COMERCIAL,
  RUTA_PARA_ACTIVAR,
  abiertaEnModoComercial,
  enModoComercial,
} from '@/lib/nav/modo-comercial';

/** Lo que se abre al activar: lo que la persona todavía no ve. */
const LO_QUE_SE_ABRE = [
  'Contratos y firma electrónica',
  'Cobranza, recaudo y pagos a propietarios',
  'Contabilidad y facturación electrónica',
  'Los agentes de IA: avalúos, estudios, cobranza',
] as const;

/**
 * El candado del modo comercial (Juan y Nico, 19/20-10-2026). Envuelve el
 * contenido del panel:
 *   · el inicio del panel (el chat de los agentes) lleva a sus inmuebles;
 *   · una ruta cerrada muestra para qué sirve activar, con el botón;
 *   · la primera vez, una bienvenida que dice qué tiene y qué se abre al activar.
 * Fuera del modo comercial no hace nada.
 */
export function CandadoDelModoComercial({ children }: { children: ReactNode }) {
  const { agency } = useAuth();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const comercial = enModoComercial(agency);
  const esElInicio = comercial && pathname.replace(/\/+$/, '') === '/panel/inmobiliaria';

  useEffect(() => {
    if (esElInicio) router.replace(INICIO_DEL_MODO_COMERCIAL);
  }, [esElInicio, router]);

  if (!comercial) return <>{children}</>;
  if (esElInicio) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  }
  return (
    <>
      {abiertaEnModoComercial(pathname) ? children : <ActivarTuCuenta />}
      <BienvenidaComercial agencyId={agency?.id ?? null} />
    </>
  );
}

/** Lo que ve quien entra a una parte cerrada. */
export function ActivarTuCuenta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className="mx-auto my-10 max-w-[560px] rounded-lg border border-border bg-surface p-6 sm:p-8"
      data-testid="activar-tu-cuenta"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
        <LockSimple size={22} weight="bold" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-[24px] font-medium leading-tight tracking-[-0.02em] text-fg">Esto se abre al activar tu cuenta</h1>
      <p className="mt-2 text-[15px] text-fg-muted">
        Tu cuenta hoy es comercial: publicas, te llegan los interesados y agendas visitas. Al activarla te pedimos el NIT
        y la razón social, proteges la cuenta con un segundo factor y se abre todo. Por ahora es gratis.
      </p>
      <ul className="mt-5 space-y-2">
        {LO_QUE_SE_ABRE.map((x) => (
          <li key={x} className="flex items-center gap-2 text-[14px] text-fg">
            <CheckCircle size={16} weight="fill" className="text-primary" aria-hidden="true" />
            {x}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-11 rounded-full px-6" data-testid="activar-mi-cuenta">
          <Link href={RUTA_PARA_ACTIVAR}>Activar mi cuenta</Link>
        </Button>
        <Button asChild variant="secondary" className="h-11 rounded-full px-6">
          <Link href={INICIO_DEL_MODO_COMERCIAL}>Volver a mis inmuebles</Link>
        </Button>
      </div>
    </motion.section>
  );
}

const CLAVE_BIENVENIDA = (agencyId: string) => `leasefy-bienvenida-comercial:${agencyId}`;

/** Una sola vez por inmobiliaria: qué tiene abierto y qué se abre al activar. */
function BienvenidaComercial({ agencyId }: { agencyId: string | null }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    try {
      if (window.localStorage.getItem(CLAVE_BIENVENIDA(agencyId)) !== '1') setAbierta(true);
    } catch {
      // Sin almacenamiento: no se insiste.
    }
  }, [agencyId]);

  const cerrar = () => {
    setAbierta(false);
    if (!agencyId) return;
    try {
      window.localStorage.setItem(CLAVE_BIENVENIDA(agencyId), '1');
    } catch {
      // Sin almacenamiento: la próxima vez sale otra vez, y ya.
    }
  };

  return (
    <Dialog open={abierta} onOpenChange={(o) => (o ? setAbierta(true) : cerrar())}>
      <DialogContent size="sm" icon={<Megaphone weight="bold" />} data-testid="bienvenida-comercial">
        <DialogHeader>
          <DialogTitle>Tu cuenta ya está lista para publicar</DialogTitle>
          <DialogDescription>
            Aquí ves tus inmuebles, los interesados que te escriben, las postulaciones y tu agenda de visitas. Cuando
            quieras más, activa tu cuenta: contratos, cobranza, pagos a propietarios y los agentes de IA. Por ahora es
            gratis.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={cerrar} className="rounded-full" data-testid="bienvenida-seguir">
            Seguir con mis inmuebles
          </Button>
          <Button asChild className="rounded-full" onClick={cerrar}>
            <Link href={RUTA_PARA_ACTIVAR}>Activar ahora</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
