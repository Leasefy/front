'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { rutaDelFormulario, type InmobiliariaDelFormulario } from './inmobiliaria-del-formulario';

/** Sin tildes ni mayúsculas, para que «portofino» encuentre «Portofino Propiedad Raíz». */
function plano(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * ¿A qué inmobiliaria le escribe la persona? (ARCO-1). Cada una responde por
 * los datos que tiene de ella; su formulario vive en `/arco/<inmobiliaria>`.
 * `null` = el back no respondió: se dice, sin inventar una lista.
 */
export function ElegirInmobiliaria({ inmobiliarias }: { inmobiliarias: InmobiliariaDelFormulario[] | null }) {
  const { t } = useI18n();
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    if (!inmobiliarias) return [];
    const q = plano(busqueda);
    const ordenadas = [...inmobiliarias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return q ? ordenadas.filter((i) => plano(`${i.nombre} ${i.ciudad ?? ''}`).includes(q)) : ordenadas;
  }, [inmobiliarias, busqueda]);

  return (
    <div className="w-full max-w-xl rounded-[22px] border border-border bg-surface p-6 sm:p-8" data-testid="arco-elegir">
      <div className="mb-6 text-center">
        <p className="mb-2 text-xl font-semibold font-heading text-fg">Leasefy</p>
        <h1 className="mb-3 text-3xl font-semibold font-heading text-fg">{t('inmobiliaria.ai.arco.public.title')}</h1>
        <p className="mx-auto max-w-sm text-sm text-fg-subtle">{t('inmobiliaria.ai.arco.public.elegir.texto')}</p>
      </div>

      <h2 className="mb-3 text-base font-semibold text-fg">{t('inmobiliaria.ai.arco.public.elegir.titulo')}</h2>

      {inmobiliarias === null ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-fg-muted" role="alert">
          {t('inmobiliaria.ai.arco.public.elegir.noCargo')}
        </p>
      ) : inmobiliarias.length === 0 ? (
        <p className="px-1 py-1 text-sm text-fg-muted" data-testid="arco-elegir-vacio">
          {t('inmobiliaria.ai.arco.public.elegir.sinResultados')}
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t('inmobiliaria.ai.arco.public.elegir.buscar')}
              aria-label={t('inmobiliaria.ai.arco.public.elegir.buscar')}
              className="min-h-[44px] pl-9"
            />
          </div>
          {visibles.length === 0 ? (
            <p className="px-1 py-3 text-sm text-fg-muted" data-testid="arco-elegir-vacio">
              {t('inmobiliaria.ai.arco.public.elegir.sinResultados')}
            </p>
          ) : (
            <Stagger className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {visibles.map((i) => (
                <StaggerItem key={i.id}>
                  <Link
                    href={rutaDelFormulario(i)}
                    className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    {i.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- el logo viene de la inmobiliaria, de cualquier dominio
                      <img src={i.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-fg-muted"
                        aria-hidden
                      >
                        {i.nombre.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{i.nombre}</span>
                      {i.ciudad && <span className="block truncate text-xs text-fg-subtle">{i.ciudad}</span>}
                    </span>
                    <CaretRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
          {visibles.length > 0 && (
            <p className="mt-4 text-xs text-fg-subtle">{t('inmobiliaria.ai.arco.public.elegir.noEsta')}</p>
          )}
        </>
      )}
    </div>
  );
}
