'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift } from '@phosphor-icons/react';
import { enterTransition, Ilustracion, Stagger, StaggerItem, usePrefersReducedMotion, type NombreIlustracion } from '@leasefy/cadence';

import { AuroraDeMarca } from '@/components/brand/AuroraDeMarca';
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { SelloDelAliado, TresDeQueFlota, useChispa } from '@/components/conversion/EscenaDeMarca';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth/use-auth';
import { conversionApi, type AlianzaPublica } from '@/lib/api/conversion.service';
import { guardarAliadoPendiente } from '@/lib/conversion/acceso';

const LO_QUE_INCLUYE: readonly { ilustracion: NombreIlustracion; titulo: string; texto: string }[] = [
  { ilustracion: 'casa', titulo: 'Publica gratis, siempre', texto: 'Tus inmuebles en el marketplace de Leasefy y tu página de inmobiliaria.' },
  { ilustracion: 'firma', titulo: 'Contratos en línea', texto: 'Desde la plantilla legal, con firma electrónica e inventario.' },
  { ilustracion: 'banco', titulo: 'El arriendo entra y sale solo', texto: 'Links de pago, conciliación con el banco y giros a los propietarios.' },
  { ilustracion: 'sobre_cobro', titulo: 'Mori cobra por ti', texto: 'Llama y escribe por WhatsApp a quien se atrasa, con el tono de tu inmobiliaria.' },
  { ilustracion: 'factura', titulo: 'Facturación y contabilidad', texto: 'Facturas ante la DIAN y asientos automáticos, sin digitar.' },
  { ilustracion: 'novedad_cohete', titulo: 'Agentes de IA', texto: 'Avalúos, estudios de inquilinos y cobranza que trabajan mientras duermes.' },
]

/** Cómo funciona el mes gratis, en tres pasos. */
const COMO_FUNCIONA = [
  { titulo: 'Crea tu cuenta y publica', texto: 'Tu nombre, tu WhatsApp y tus inmuebles. Nada más para empezar.' },
  { titulo: 'Usa todo durante el mes', texto: 'Contratos, cobro, giros, facturación y los agentes de IA, sin límites.' },
  { titulo: 'Al terminar, tú decides', texto: 'Sigues con todo, o te quedas con lo gratis: el marketplace y Arrendamientos.' },
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
  const portada = useRef<HTMLElement>(null);
  // La chispa una vez, cuando la invitación está vigente y se ve.
  useChispa(alianza !== null && alianza !== 'no-existe' && alianza.vigente, portada, 700);

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
    const regalo = alianza.diasGratis === 30 ? 'un mes' : `${alianza.diasGratis} días`;
    contenido = (
      <div data-testid="aliado-vigente">
        {/* Nico, 28-10: «hay que hacer más hermoso cuando ingresen a la invitación, algo espectacular». */}
        <section ref={portada} className="relative isolate mx-auto max-w-[1200px] overflow-hidden rounded-[28px] px-5 pb-14 pt-12 text-center text-white sm:rounded-[36px] sm:px-10 sm:pb-20 sm:pt-16">
          <AuroraDeMarca animada={!reducido} className="absolute inset-0 -z-10" />
          <TresDeQueFlota nombre="novedad_regalo" tamano={88} giro={-10} segundos={5.2} retraso={0.3} className="left-[5%] top-[10%] hidden md:block" />
          <TresDeQueFlota nombre="llaves" tamano={72} giro={9} segundos={4.6} retraso={0.4} className="right-[6%] top-[12%] hidden md:block" />
          <TresDeQueFlota nombre="contrato" tamano={68} giro={7} segundos={5.8} retraso={0.5} className="bottom-[12%] left-[8%] hidden lg:block" />
          <TresDeQueFlota nombre="banco" tamano={72} giro={-8} segundos={5} retraso={0.6} className="bottom-[10%] right-[8%] hidden lg:block" />
          <TresDeQueFlota nombre="casa" tamano={56} giro={-5} segundos={6.2} retraso={0.7} className="left-[18%] top-[46%] hidden xl:block" />
          <TresDeQueFlota nombre="factura" tamano={56} giro={6} segundos={5.4} retraso={0.8} className="right-[17%] top-[50%] hidden xl:block" />

          <motion.div
            className="mx-auto flex max-w-[720px] flex-col items-center"
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enterTransition(reducido)}
          >
            <SelloDelAliado aliado={alianza.nombre} />
            <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              Invitación de {alianza.nombre}
            </span>
            <h1 className="mt-5 text-[38px] font-[420] leading-[1.04] tracking-[-0.035em] sm:text-[60px]" style={{ textWrap: 'balance' }}>
              {alianza.nombre} te regala {regalo} de Leasefy completo
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-white/80 sm:text-[18px]">
              Publica tus inmuebles, monta tus contratos y deja que el cobro, los giros y la facturación se hagan solos. Sin
              tarjeta: al terminar decides si sigues.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
              <Button
                className="h-[52px] rounded-full bg-white px-8 text-[16px] text-[#0a0f2c] shadow-[0_14px_40px_rgba(0,0,0,0.25)] hover:bg-white/90"
                onClick={empezar}
                isLoading={usando}
                data-testid="empezar-mes-gratis"
              >
                Empezar mi mes gratis
              </Button>
              {!user && (
                <Link href={`/auth?returnUrl=${encodeURIComponent(`/aliados/${alianza.codigo}`)}`} className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">
                  Ya tengo cuenta: entrar
                </Link>
              )}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto mt-16 max-w-[1100px] sm:mt-20">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-primary">Lo que trae tu mes</p>
          <h2 className="mx-auto mt-3 max-w-[22ch] text-center text-[28px] font-[420] leading-tight tracking-[-0.03em] text-fg sm:text-[36px]" style={{ textWrap: 'balance' }}>
            Toda tu inmobiliaria, en piloto automático
          </h2>
          <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LO_QUE_INCLUYE.map(({ ilustracion, titulo, texto }) => (
              <StaggerItem key={titulo} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-shadow duration-base hover:shadow-md">
                <Ilustracion nombre={ilustracion} tamano={64} tono="auto" alt="" />
                <span>
                  <span className="block text-[16px] font-medium text-fg">{titulo}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{texto}</span>
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="mx-auto mt-16 max-w-[1100px] rounded-[28px] border border-border bg-surface px-5 py-10 sm:mt-20 sm:px-10">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-primary">Cómo funciona</p>
          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            {COMO_FUNCIONA.map((paso, i) => (
              <li key={paso.titulo} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-fg ring-4 ring-primary/15">
                  {i + 1}
                </span>
                {i < COMO_FUNCIONA.length - 1 ? (
                  <span aria-hidden="true" className="absolute left-[calc(2.5rem+0.75rem)] right-0 top-5 hidden h-px bg-border md:block" />
                ) : null}
                <span className="mt-4 block text-[16px] font-medium text-fg">{paso.titulo}</span>
                <span className="mt-1 block max-w-[32ch] text-sm leading-relaxed text-fg-muted">{paso.texto}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button className="h-12 rounded-full px-7 text-[15px]" onClick={empezar} isLoading={usando} data-testid="empezar-mes-gratis-abajo">
              Empezar mi mes gratis
            </Button>
          </div>
        </section>
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
