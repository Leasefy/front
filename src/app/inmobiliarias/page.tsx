'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Buildings, MagnifyingGlass } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TarjetaDeInmobiliaria } from '@/components/marketplace/inmobiliaria/piezas';
import { marketplaceApi } from '@/lib/api/marketplace.service';

const DE_A = 24;
type Tarjeta = Awaited<ReturnType<typeof marketplaceApi.inmobiliarias>>[number];

/**
 * `/inmobiliarias` — todas las inmobiliarias que publican (Nico, 27-10-2026: «si hay miles, ¿qué pasa?»). El inicio
 * del marketplace muestra cuatro; aquí se buscan por nombre y se cargan de a 24, las de más inmuebles primero.
 */
export default function DirectorioDeInmobiliarias() {
  const [q, setQ] = useState('');
  const [busca, setBusca] = useState('');
  const [tarjetas, setTarjetas] = useState<Tarjeta[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Un respiro al escribir: no se busca en cada letra.
  useEffect(() => {
    const t = window.setTimeout(() => setBusca(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let vivo = true;
    setTarjetas(null);
    marketplaceApi
      .inmobiliarias({ limite: DE_A, q: busca })
      .then((r) => {
        if (!vivo) return;
        setTarjetas(r);
        setHayMas(r.length === DE_A);
      })
      .catch(() => vivo && setTarjetas([]));
    return () => {
      vivo = false;
    };
  }, [busca]);

  const cargarMas = async () => {
    if (!tarjetas) return;
    setCargando(true);
    try {
      const r = await marketplaceApi.inmobiliarias({ limite: DE_A, q: busca, desde: tarjetas.length });
      setTarjetas([...tarjetas, ...r]);
      setHayMas(r.length === DE_A);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Leasefy — inicio" className="inline-flex text-fg">
            <LeasefyLogotype size={20} title="Leasefy" />
          </Link>
          <Link href="/propiedades" className="inline-flex items-center gap-1.5 text-[13.5px] text-fg-muted hover:text-fg">
            <ArrowLeft size={14} aria-hidden="true" />
            Volver al marketplace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <h1 className="text-[32px] font-[420] leading-tight tracking-[-0.03em] text-fg">Inmobiliarias en Leasefy</h1>
        <p className="mt-1 text-[15px] text-fg-muted">Síguelas para ver lo que publican, o pregúntale directamente a cada una.</p>
        <label className="mt-6 flex h-12 max-w-[520px] items-center gap-2 rounded-full border border-border bg-surface px-4 focus-within:border-primary">
          <MagnifyingGlass size={18} className="text-fg-muted" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca una inmobiliaria por su nombre"
            aria-label="Buscar inmobiliaria"
            className="h-full w-full bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-placeholder"
            data-testid="buscar-inmobiliaria"
          />
        </label>
        {tarjetas === null ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : tarjetas.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={Buildings} ilustracion="casa" title={busca ? `No encontramos «${busca}»` : 'Todavía no hay inmobiliarias publicando'} description="Prueba con otra parte del nombre." />
          </div>
        ) : (
          <>
            <Stagger className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(520px,100%),1fr))]">
              {tarjetas.map((t) => (
                <StaggerItem key={t.id}>
                  <TarjetaDeInmobiliaria t={t} />
                </StaggerItem>
              ))}
            </Stagger>
            {hayMas && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" className="h-11 rounded-full px-6" onClick={() => void cargarMas()} isLoading={cargando} data-testid="cargar-mas-inmobiliarias">
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
