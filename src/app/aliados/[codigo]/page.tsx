'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowsLeftRight, Buildings, Gift, PhoneCall, Receipt, Signature } from '@phosphor-icons/react';
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth/use-auth';
import { conversionApi, type AlianzaPublica } from '@/lib/api/conversion.service';
import { guardarAliadoPendiente } from '@/lib/conversion/acceso';

const LO_QUE_INCLUYE = [
  { icono: Buildings, titulo: 'Publica gratis, siempre', texto: 'Tus inmuebles en el marketplace de Leasefy y tu página de inmobiliaria.' },
  { icono: Signature, titulo: 'Contratos en línea', texto: 'Desde la plantilla legal, con firma electrónica e inventario.' },
  { icono: ArrowsLeftRight, titulo: 'El arriendo entra y sale solo', texto: 'Links de pago, conciliación con el banco y giros a los propietarios.' },
  { icono: PhoneCall, titulo: 'Mori cobra por ti', texto: 'Llama y escribe por WhatsApp a quien se atrasa, con el tono de tu inmobiliaria.' },
  { icono: Receipt, titulo: 'Facturación y contabilidad', texto: 'Facturas ante la DIAN y asientos automáticos, sin digitar.' },
] as const;

/**
 * `/aliados/<codigo>` — el enlace de invitado de un aliado (Nico, 27-10-2026: Fianly, La Lonja, Fenalco). Dice quién
 * regala el mes y qué trae. «Empezar mi mes gratis»: con sesión lo activa de una; sin ella, guarda el código y manda
 * a publicar gratis (registro rápido). Al entrar al panel, `MesGratisPendiente` lo activa y lo celebra.
 */
export default function PaginaDelAliado({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const router = useRouter();
  const reducido = usePrefersReducedMotion();
  const { user, isLoading, hasActiveAgencyMembership } = useAuth();
  const [alianza, setAlianza] = useState<AlianzaPublica | null | 'no-existe'>(null);
  const [usando, setUsando] = useState(false);

  useEffect(() => {
    let vivo = true;
    conversionApi
      .alianza(codigo)
      .then((a) => vivo && setAlianza(a))
      .catch(() => vivo && setAlianza('no-existe'));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  const empezar = () => {
    if (alianza === null || alianza === 'no-existe') return;
    guardarAliadoPendiente(alianza.codigo);
    if (!user) {
      router.push(`/publica?aliado=${encodeURIComponent(alianza.codigo)}`);
      return;
    }
    setUsando(true);
    // Con sesión: el panel lo activa al entrar (MesGratisPendiente) y lo celebra; sin cuenta de publicar, a publicar.
    router.push(hasActiveAgencyMembership ? '/panel/inmobiliaria/inmuebles' : user.role === 'landlord' ? '/panel/propiedades' : `/publica?aliado=${encodeURIComponent(alianza.codigo)}`);
  };

  let contenido: React.ReactNode;
  if (alianza === null || isLoading) {
    contenido = (
      <div className="flex min-h-[50vh] items-center justify-center">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  } else if (alianza === 'no-existe' || !alianza.vigente) {
    contenido = (
      <div className="mx-auto max-w-[520px]" data-testid="aliado-no-disponible">
        <EmptyState
          icon={Gift}
          ilustracion="llaves"
          title={alianza === 'no-existe' ? 'Este enlace no existe' : `El mes gratis de ${alianza.nombre} ya no está disponible`}
          description="Igual puedes publicar tus inmuebles gratis en Leasefy y probar todo lo demás cuando quieras."
          action={{ label: 'Publicar gratis', onClick: () => router.push('/publica') }}
        />
      </div>
    );
  } else {
    contenido = (
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="aliado-vigente">
        <motion.div initial={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={enterTransition(reducido)}>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-primary">
            <Gift size={14} weight="bold" aria-hidden="true" />
            {alianza.nombre} × Leasefy
          </span>
          <h1 className="mt-5 text-[36px] font-[420] leading-[1.05] tracking-[-0.035em] text-fg sm:text-[48px]" style={{ textWrap: 'balance' }}>
            {alianza.nombre} te regala {alianza.diasGratis === 30 ? 'un mes' : `${alianza.diasGratis} días`} de Leasefy completo
          </h1>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-fg-muted">
            Publica tus inmuebles, monta tus contratos y deja que el cobro, los giros y la facturación se hagan solos. Sin
            tarjeta: al terminar decides si sigues.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-12 rounded-full px-7 text-[15px]" onClick={empezar} isLoading={usando} data-testid="empezar-mes-gratis">
              Empezar mi mes gratis
            </Button>
            {!user && (
              <Link href={`/auth?returnUrl=${encodeURIComponent(`/aliados/${alianza.codigo}`)}`} className="text-sm font-medium text-primary hover:underline">
                Ya tengo cuenta: entrar
              </Link>
            )}
          </div>
          <p className="mt-4 text-caption text-fg-subtle">Después del mes, lo gratis sigue siendo tuyo: el marketplace y Arrendamientos.</p>
        </motion.div>
        <Stagger className="grid gap-3">
          {LO_QUE_INCLUYE.map(({ icono: Icono, titulo, texto }) => (
            <StaggerItem key={titulo} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icono size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-fg">{titulo}</span>
                <span className="mt-0.5 block text-sm text-fg-muted">{texto}</span>
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Leasefy — inicio" className="inline-flex text-fg">
            <LeasefyLogotype size={20} title="Leasefy" />
          </Link>
          <Link href="/propiedades" className="inline-flex items-center gap-1.5 text-[13.5px] text-fg-muted hover:text-fg">
            <ArrowLeft size={14} aria-hidden="true" />
            Ver el marketplace
          </Link>
        </div>
      </header>
      <main className="px-4 py-10 sm:px-6 sm:py-16">{contenido}</main>
    </div>
  );
}
