'use client';

import { useEffect, useState } from 'react';

import { propertiesApi } from '@/lib/api/properties.service';
import { primeraFoto } from '@/components/property/PortadaDelInmueble';
import type { Property } from '@/lib/types/property';

/**
 * El catálogo del marketplace para las piezas de la landing (15-10-2026).
 *
 * Varias piezas lo leen a la vez (menú, franja, sección, aviso): una sola
 * petición por página, compartida. Todo sale de `GET /properties`, público:
 * los números que se pintan son los del catálogo, nunca inventados. Si la
 * carga falla o no hay nada publicado, cada pieza se retira sola.
 */
export interface Catalogo {
  /** Disponibles y con foto: lo que se puede mostrar de vitrina. */
  inmuebles: Property[];
  /** Cuántos hay publicados (lo dice el back, no la vitrina). */
  total: number;
  /** Inmobiliarias distintas que publican en lo que llegó. */
  inmobiliarias: { nombre: string; logo: string | null; cuantos: number }[];
  cargando: boolean;
  fallo: boolean;
}

const VACIO: Catalogo = { inmuebles: [], total: 0, inmobiliarias: [], cargando: true, fallo: false };

let enCurso: Promise<Catalogo> | null = null;

function pedir(): Promise<Catalogo> {
  if (!enCurso) {
    enCurso = propertiesApi
      .list({ limit: 60 })
      .then((r) => {
        const disponibles = r.data.filter((p) => p.status === 'available' && primeraFoto(p));
        const porNombre = new Map<string, { nombre: string; logo: string | null; cuantos: number }>();
        for (const p of r.data) {
          const nombre = p.agencyName?.trim();
          if (!nombre) continue;
          const previo = porNombre.get(nombre);
          if (previo) previo.cuantos += 1;
          else porNombre.set(nombre, { nombre, logo: p.agencyLogoUrl ?? null, cuantos: 1 });
        }
        return {
          inmuebles: disponibles,
          total: r.meta?.total ?? r.data.length,
          inmobiliarias: [...porNombre.values()].sort((a, b) => b.cuantos - a.cuantos),
          cargando: false,
          fallo: false,
        };
      })
      .catch(() => {
        enCurso = null;
        return { ...VACIO, cargando: false, fallo: true };
      });
  }
  return enCurso;
}

export function useCatalogo(): Catalogo {
  const [catalogo, setCatalogo] = useState<Catalogo>(VACIO);
  useEffect(() => {
    let vivo = true;
    pedir().then((c) => vivo && setCatalogo(c));
    return () => {
      vivo = false;
    };
  }, []);
  return catalogo;
}

/** «$ 2.350.000»: como lo escribe el marketplace. */
export function pesos(n: number | null | undefined): string {
  if (!n) return 'Canon por confirmar';
  return `$ ${Math.round(n).toLocaleString('es-CO')}`;
}

/** «Laureles · Medellín», o sólo la ciudad. */
export function dondeQueda(p: Property): string {
  return [p.neighborhood, p.city].filter(Boolean).join(' · ');
}

const TIPO: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  studio: 'Apartaestudio',
  room: 'Habitación',
  commercial: 'Local',
  office: 'Oficina',
  warehouse: 'Bodega',
};

export function tipoDe(p: Property): string {
  return TIPO[p.type] ?? 'Inmueble';
}

/** Con «reducir movimiento», todo quieto. */
export function useQuieto(): boolean {
  const [quieto, setQuieto] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setQuieto(m.matches);
    const cambio = () => setQuieto(m.matches);
    m.addEventListener('change', cambio);
    return () => m.removeEventListener('change', cambio);
  }, []);
  return quieto;
}

/** Un índice que avanza solo cada `ms` (quieto con «reducir movimiento» o en pausa). */
export function useTurno(largo: number, ms: number, pausa = false): number {
  const quieto = useQuieto();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (quieto || pausa || largo < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % largo), ms);
    return () => window.clearInterval(t);
  }, [largo, ms, quieto, pausa]);
  return largo ? i % largo : 0;
}
