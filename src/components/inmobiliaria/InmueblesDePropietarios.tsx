'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { House, IdentificationBadge, WhatsappLogo } from '@phosphor-icons/react';

import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';

/**
 * «De tus propietarios» (Nico, 27-10-2026: la plataforma del agente inmobiliario). Los inmuebles que un
 * propietario independiente le asignó a este agente desde su panel («Tu agente»). El back los da en
 * `GET /properties/assigned` (sólo los asignados, no el portafolio) y el contacto del dueño en
 * `GET /agents/me/properties/:id/landlord`. Los que asigna la propia inmobiliaria a su asesor tienen `agencyId`
 * y no van aquí. Sin ninguno, el bloque no se pinta: no estorba a la inmobiliaria que no trabaja así.
 */
interface InmuebleAsignado {
  id: string;
  title: string | null;
  address?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  agencyId: string | null;
  monthlyRent: number | null;
  images?: Array<{ url?: string | null }> | null;
}

interface Dueno {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function InmueblesDePropietarios() {
  const [inmuebles, setInmuebles] = useState<InmuebleAsignado[]>([]);
  const [duenos, setDuenos] = useState<Record<string, Dueno | null>>({});

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<InmuebleAsignado[]>('/properties/assigned')
      .then(async (lista) => {
        const deDuenos = (Array.isArray(lista) ? lista : []).filter((i) => !i.agencyId);
        if (!vivo) return;
        setInmuebles(deDuenos);
        const pares = await Promise.all(
          deDuenos.map((i) =>
            apiClient
              .get<Dueno>(`/agents/me/properties/${i.id}/landlord`)
              .then((d) => [i.id, d] as const)
              .catch(() => [i.id, null] as const),
          ),
        );
        if (vivo) setDuenos(Object.fromEntries(pares));
      })
      // Sin la ruta o sin el rol, no hay bloque: nunca un error en el portafolio por esto.
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  if (inmuebles.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="de-tus-propietarios" data-testid="inmuebles-de-propietarios">
      <h2 id="de-tus-propietarios" className="flex items-center gap-2 text-[17px] font-medium text-fg">
        <IdentificationBadge className="h-5 w-5 text-primary" aria-hidden />
        De tus propietarios
        <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-caption tabular-nums text-fg-muted">
          {inmuebles.length}
        </span>
      </h2>
      <p className="mt-1 text-[14px] text-fg-muted">Te los asignaron sus dueños para que los muestres y les consigas inquilino.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {inmuebles.map((i) => {
          const dueno = duenos[i.id];
          const nombre = [dueno?.firstName, dueno?.lastName].filter(Boolean).join(' ').trim();
          const foto = i.images?.find((f) => f?.url)?.url ?? null;
          const telefono = dueno?.phone?.replace(/\D/g, '') ?? '';
          return (
            <li key={i.id} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <House className="h-6 w-6 text-fg-subtle" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <Link href={`/propiedades/${i.id}`} className="block truncate text-[15px] font-medium text-fg hover:underline">
                  {i.title || i.address || 'Inmueble'}
                </Link>
                <span className="block truncate text-[13px] text-fg-muted">
                  {[i.neighborhood, i.city].filter(Boolean).join(', ')}
                  {i.monthlyRent ? ` · ${formatCurrency(i.monthlyRent)}/mes` : ''}
                </span>
                <span className="mt-1 flex items-center gap-2 truncate text-[13px] text-fg-muted">
                  Dueño: <span className="truncate text-fg">{nombre || dueno?.email || 'Sin nombre registrado'}</span>
                  {telefono && (
                    <a
                      href={`https://wa.me/${telefono.length === 10 ? `57${telefono}` : telefono}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <WhatsappLogo className="h-4 w-4" aria-hidden />
                      Escribirle
                    </a>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
