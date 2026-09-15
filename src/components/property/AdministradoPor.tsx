'use client';

/**
 * Quién administra el inmueble en el marketplace (Nico, 2026-09-15): conviven
 * inmuebles de Leasefy y de otras inmobiliarias, y cada uno lleva el logo de
 * quien lo administra. El espacio del logo es fijo:
 * - **Leasefy** (su inmobiliaria es `NEXT_PUBLIC_LEASEFY_AGENCY_ID`): el símbolo
 *   real, no una imagen subida.
 * - **Otra inmobiliaria con logo**: su logo (bucket público de Supabase).
 * - **Sin logo todavía**: sus iniciales, para que el espacio no quede vacío ni
 *   cambie de tamaño de una tarjeta a otra.
 */

import Image from 'next/image';
import { LeasefySymbol } from '@/components/brand';
import { cn } from '@/lib/utils';

export interface Administrador {
  agencyId: string | null;
  nombre: string;
  logoUrl: string | null;
}

/** ¿Lo administra la inmobiliaria de Leasefy? Sin la variable, nadie lo es. */
export function esLeasefy(agencyId: string | null | undefined): boolean {
  const idDeLeasefy = process.env.NEXT_PUBLIC_LEASEFY_AGENCY_ID;
  return Boolean(idDeLeasefy && agencyId && agencyId === idDeLeasefy);
}

/** «victor inmobiliaria8» → «VI»; «Arriendos» → «AR». */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (palabras.length === 0) return '·';
  const letras = palabras.length >= 2 ? `${palabras[0][0]}${palabras[1][0]}` : palabras[0].slice(0, 2);
  return letras.toUpperCase();
}

export function LogoDelAdministrador({
  administrador,
  tamano = 28,
  className,
}: {
  administrador: Administrador;
  tamano?: number;
  className?: string;
}) {
  const leasefy = esLeasefy(administrador.agencyId);
  return (
    <span
      data-testid="logo-del-administrador"
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface',
        className,
      )}
      style={{ width: tamano, height: tamano }}
    >
      {leasefy ? (
        <LeasefySymbol size={Math.round(tamano * 0.5)} className="text-primary" title="Leasefy" />
      ) : administrador.logoUrl ? (
        <Image
          src={administrador.logoUrl}
          alt={`Logo de ${administrador.nombre}`}
          fill
          sizes={`${tamano}px`}
          className="object-contain p-0.5"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-mono font-semibold text-muted-foreground"
          style={{ fontSize: Math.max(9, Math.round(tamano * 0.36)) }}
        >
          {iniciales(administrador.nombre)}
        </span>
      )}
    </span>
  );
}

/** Logo + «Administrado por …», para tarjetas y atribuciones. */
export function AdministradoPor({
  administrador,
  tamano = 22,
  className,
}: {
  administrador: Administrador;
  tamano?: number;
  className?: string;
}) {
  const nombre = esLeasefy(administrador.agencyId) ? 'Leasefy' : administrador.nombre;
  return (
    <div data-testid="administrado-por" className={cn('flex min-w-0 items-center gap-2', className)}>
      <LogoDelAdministrador administrador={administrador} tamano={tamano} />
      <p className="min-w-0 truncate text-[12px] text-muted-foreground">
        Administrado por <span className="font-medium text-foreground">{nombre}</span>
      </p>
    </div>
  );
}
