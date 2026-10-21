'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';
import { RegistroRapido } from '@/components/publica/RegistroRapido';
import { PublicadorRapido } from '@/components/publica/PublicadorRapido';
import { VentanaParaPublicar, type PerfilQuePublica } from '@/components/marketplace/VentanaParaPublicar';
import { CONFIRMAR_CON_CODIGO, DESTINOS_PARA_PUBLICAR } from '@/components/marketplace/CuentaParaPublicar';
import type { CaminoParaMuchos } from '@/components/publica/TraerMuchos';
import { marketplaceApi, paginaDe } from '@/lib/api/marketplace.service';

const CAMINOS: CaminoParaMuchos[] = ['enlaces', 'excel', 'carpetas'];

/**
 * La página de la inmobiliaria para compartir: por su nombre corto
 * (`/i/arriendos-del-valle`) si ya lo tiene, y mientras tanto (o si no) por su id.
 */
function usePaginaPublica(agencyId: string | null | undefined): string | null {
  const [ruta, setRuta] = useState<string | null>(null);
  useEffect(() => {
    if (!agencyId) return;
    let vigente = true;
    setRuta(`/i/${agencyId}`);
    marketplaceApi
      .pagina(agencyId)
      .then((p) => {
        if (vigente) setRuta(paginaDe(p));
      })
      .catch(() => {
        // Sin la página (todavía no sale en el marketplace): queda la del id.
      });
    return () => {
      vigente = false;
    };
  }, [agencyId]);
  return ruta && typeof window !== 'undefined' ? `${window.location.origin}${ruta}` : null;
}

/**
 * `/publica` — publicar rápido desde el marketplace (Juan y Nico, 19-10-2026):
 * la cuenta (si falta) → el registro rápido (nombre + WhatsApp, si falta) → el
 * publicador. Fuera del panel y sin menú: el que vino a publicar, publica.
 */
function Publica() {
  const sp = useSearchParams();
  const { user, isAuthenticated, isLoading, perfilElegido, refreshUser, hasActiveAgencyMembership, agencyRole, agency } = useAuth();
  const [ventana, setVentana] = useState(false);
  const esInmobiliaria = Boolean(user) && (hasActiveAgencyMembership || user?.role === 'agency');
  const paginaPublica = usePaginaPublica(esInmobiliaria ? agency?.id : null);
  const traer = sp.get('traer');
  const caminoInicial = CAMINOS.find((c) => c === traer) ?? null;
  // «Publicar para venta» desde algún lado: `?operacion=venta` (o `arriendo`) se salta la pregunta.
  const operacionPedida = sp.get('operacion');
  const operacionInicial = operacionPedida === 'venta' ? 'sale' : operacionPedida === 'arriendo' ? 'rent' : null;

  const delParametro = sp.get('perfil');
  const perfilPedido: PerfilQuePublica | null =
    delParametro === 'agency' || delParametro === 'landlord'
      ? delParametro
      : perfilElegido === 'agency' || perfilElegido === 'landlord'
        ? perfilElegido
        : null;

  let contenido: React.ReactNode;
  if (isLoading) {
    contenido = <CargaDeMarca tamano="lg" />;
  } else if (!isAuthenticated || !user) {
    contenido = (
      <div className="mx-auto max-w-[460px] text-center" data-testid="publica-sin-cuenta">
        <h1 className="text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">Publica gratis en Leasefy</h1>
        <p className="mt-3 text-[15px] text-fg-subtle">Crea tu cuenta o entra con la tuya, y publica uno o muchos inmuebles.</p>
        <Button className="mt-7 h-12 rounded-full px-7 text-[15px]" onClick={() => setVentana(true)}>
          Empezar
        </Button>
        <VentanaParaPublicar abierta={ventana} alCambiar={setVentana} destinos={DESTINOS_PARA_PUBLICAR} confirmarConCodigo={CONFIRMAR_CON_CODIGO} />
      </div>
    );
  } else if (!user.onboardingCompleted && !hasActiveAgencyMembership) {
    const nombre = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    contenido = (
      <RegistroRapido
        perfilInicial={perfilPedido}
        nombreConocido={nombre}
        alTerminar={async () => {
          await refreshUser();
        }}
      />
    );
  } else if (user.role === 'tenant' && !hasActiveAgencyMembership) {
    contenido = (
      <div className="mx-auto max-w-[460px] text-center" data-testid="publica-cuenta-de-inquilino">
        <h1 className="text-[26px] font-medium text-fg">Tu cuenta es de inquilino</h1>
        <p className="mt-3 text-[15px] text-fg-subtle">
          Para publicar necesitas una cuenta de propietario o de inmobiliaria. Sal y crea una con otro correo.
        </p>
        <Button asChild variant="secondary" className="mt-6 h-11 rounded-full px-6">
          <Link href="/inquilino">Ir a mi portal</Link>
        </Button>
      </div>
    );
  } else if (hasActiveAgencyMembership && (agencyRole === 'CONTADOR' || agencyRole === 'VIEWER')) {
    contenido = (
      <div className="mx-auto max-w-[460px] text-center">
        <h1 className="text-[26px] font-medium text-fg">Tu rol no publica inmuebles</h1>
        <p className="mt-3 text-[15px] text-fg-subtle">Pídele a un administrador de tu inmobiliaria que los publique.</p>
      </div>
    );
  } else {
    contenido = (
      <PublicadorRapido
        usuario={user.id}
        paginaPublica={paginaPublica}
        caminoInicial={caminoInicial}
        operacionInicial={operacionInicial}
        alTerminar={
          esInmobiliaria
            ? { href: '/panel/inmobiliaria/inmuebles', texto: 'Entrar a mi cuenta' }
            : { href: '/panel/propiedades', texto: 'Entrar a mi cuenta' }
        }
      />
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
            Volver al marketplace
          </Link>
        </div>
      </header>
      <main className="px-4 py-10 sm:px-6 sm:py-14">{contenido}</main>
    </div>
  );
}

export default function PublicaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <Publica />
    </Suspense>
  );
}
