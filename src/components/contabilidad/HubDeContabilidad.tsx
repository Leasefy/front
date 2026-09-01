'use client';

/**
 * La portada de Contabilidad: a dónde ir, y tres números para saber en qué
 * está el libro sin entrar a ningún lado.
 *
 * Cada número se pide por separado y falla por separado: si el cierre no
 * responde, las cuentas activas siguen apareciendo. Un «—» con su motivo vale
 * más que una portada entera en blanco por un solo 500.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpenText, ChartBar, TreeStructure } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { contabilidadApi } from '@/lib/api/contabilidad.service';
import { diaLegible, hoy, primerDiaDelMes } from '@/lib/contabilidad/fechas';

const BASE = '/panel/inmobiliaria/contabilidad';

interface Destino {
  href: string;
  icono: Icon;
  titulo: string;
  texto: string;
}

const DESTINOS: Destino[] = [
  {
    href: `${BASE}/puc`,
    icono: TreeStructure,
    titulo: 'Plan de cuentas',
    texto: 'El PUC de la inmobiliaria: ver, crear y editar cuentas. Lo que el contador quiere ver primero.',
  },
  {
    href: `${BASE}/asientos`,
    icono: BookOpenText,
    titulo: 'Asientos',
    texto: 'El libro: cada asiento con sus líneas, el manual, la reversa y el cierre de período.',
  },
  {
    href: `${BASE}/reportes`,
    icono: ChartBar,
    titulo: 'Reportes',
    texto: 'Balance de prueba, libro auxiliar por cuenta y estado de cuenta por tercero.',
  },
];

type Numero = { estado: 'cargando' } | { estado: 'ok'; texto: string } | { estado: 'fallo' };

function useNumero(pedir: () => Promise<string>): Numero {
  const [n, setN] = useState<Numero>({ estado: 'cargando' });
  useEffect(() => {
    let vivo = true;
    pedir()
      .then((texto) => vivo && setN({ estado: 'ok', texto }))
      .catch(() => vivo && setN({ estado: 'fallo' }));
    return () => {
      vivo = false;
    };
    // `pedir` es estable por construcción (funciones de módulo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return n;
}

async function cuentasActivas(): Promise<string> {
  const cuentas = await contabilidadApi.puc.listar({ soloActivas: true });
  return cuentas.length.toLocaleString('es-CO');
}

async function asientosDelMes(): Promise<string> {
  const p = await contabilidadApi.asientos.listar({
    desde: primerDiaDelMes(),
    hasta: hoy(),
    limite: 1,
  });
  return p.total.toLocaleString('es-CO');
}

async function ultimoCierre(): Promise<string> {
  const c = await contabilidadApi.asientos.cierre();
  return c.cerradaHasta ? diaLegible(c.cerradaHasta) : 'Sin cierres';
}

function Cifra({ etiqueta, numero }: { etiqueta: string; numero: Numero }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">{etiqueta}</dt>
      <dd className="font-mono text-2xl tabular-nums text-fg">
        {numero.estado === 'cargando' ? (
          <span className="inline-block h-7 w-16 animate-pulse rounded-sm bg-surface-muted" aria-label="cargando" />
        ) : numero.estado === 'ok' ? (
          numero.texto
        ) : (
          <span className="text-fg-subtle" title="No se pudo consultar">
            —
          </span>
        )}
      </dd>
    </div>
  );
}

export function HubDeContabilidad() {
  const cuentas = useNumero(cuentasActivas);
  const asientos = useNumero(asientosDelMes);
  const cierre = useNumero(ultimoCierre);

  return (
    <div className="space-y-8">
      <dl
        className="grid gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm sm:grid-cols-3"
        aria-label="Resumen del libro"
      >
        <Cifra etiqueta="Cuentas activas" numero={cuentas} />
        <Cifra etiqueta="Asientos este mes" numero={asientos} />
        <Cifra etiqueta="Cerrada hasta" numero={cierre} />
      </dl>

      <nav aria-label="Secciones de contabilidad" className="grid gap-4 md:grid-cols-3">
        {DESTINOS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft">
              <d.icono className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">{d.titulo}</h2>
              <p className="text-sm text-fg-muted">{d.texto}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
              Abrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
