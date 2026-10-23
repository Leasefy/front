'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { EnvelopeSimple, MagnifyingGlass } from '@phosphor-icons/react';
import { Avatar, Stagger, StaggerItem } from '@leasefy/cadence';
import { LeasefyLogotype } from '@/components/brand';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  // Sin lista (el back no respondió o no hay ninguna): no se pide «elegir» lo
  // que no se ve; la salida es el correo de Leasefy (revisora r25, R4).
  const sinLista = inmobiliarias === null || inmobiliarias.length === 0;
  const escribirnos = (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="arco-escribirnos">
      <Button asChild size="sm" hideArrow>
        <a href="mailto:hola@leasefy.co?subject=Solicitud%20sobre%20mis%20datos%20personales">
          <EnvelopeSimple className="h-4 w-4" aria-hidden />
          {t('inmobiliaria.ai.arco.public.elegir.escribirnos')}
        </a>
      </Button>
      <Link href="/" className="text-body-sm text-fg-muted underline underline-offset-4 hover:text-fg sm:ml-2">
        {t('inmobiliaria.ai.arco.public.elegir.irAlInicio')}
      </Link>
    </div>
  );

  return (
    <div className="w-full max-w-xl rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-8" data-testid="arco-elegir">
      {/* Revisora r27 (ARCO, UI): todo alineado a la izquierda, como el cuerpo y los botones (antes el título y la
          descripción centrados en la misma tarjeta); el correo sólo en el botón. */}
      <div className="mb-6 space-y-3">
        {/* El logo lleva al inicio (antes no llevaba a ningún lado). */}
        <Link href="/" aria-label="Leasefy, ir al inicio" className="inline-block">
          <LeasefyLogotype className="h-5 w-auto text-fg" title="Leasefy" />
        </Link>
        <h1 className="text-balance text-h2 text-fg">{t('inmobiliaria.ai.arco.public.title')}</h1>
        <p className="max-w-md text-body-sm text-fg-muted">
          {t(sinLista ? 'inmobiliaria.ai.arco.public.elegir.textoSinLista' : 'inmobiliaria.ai.arco.public.elegir.texto')}
        </p>
      </div>

      {!sinLista && <h2 className="mb-3 text-body font-medium text-fg">{t('inmobiliaria.ai.arco.public.elegir.titulo')}</h2>}

      {inmobiliarias === null ? (
        <div>
          <p className="text-body-sm text-fg" role="alert">
            {t('inmobiliaria.ai.arco.public.elegir.noCargo')}
          </p>
          <p className="mt-1 text-body-sm text-fg-muted">{t('inmobiliaria.ai.arco.public.elegir.mientras')}</p>
          {escribirnos}
        </div>
      ) : inmobiliarias.length === 0 ? (
        <div>
          <p className="text-body-sm text-fg-muted" data-testid="arco-elegir-vacio">
            {t('inmobiliaria.ai.arco.public.elegir.sinLista')}
          </p>
          {escribirnos}
        </div>
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
            <p className="px-1 py-3 text-body-sm text-fg-muted" data-testid="arco-elegir-vacio">
              {t('inmobiliaria.ai.arco.public.elegir.sinResultados')}
            </p>
          ) : (
            <Stagger className="divide-y divide-border-faint overflow-hidden rounded-md border border-border">
              {visibles.map((i) => (
                <StaggerItem key={i.id}>
                  <Link
                    href={rutaDelFormulario(i)}
                    className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    {i.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- el logo viene de la inmobiliaria, de cualquier dominio
                      <img src={i.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
                    ) : (
                      <span aria-hidden className="shrink-0">
                        <Avatar name={i.nombre} size="sm" kind="marca" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm text-fg">{i.nombre}</span>
                      {i.ciudad && <span className="block truncate text-caption text-fg-subtle">{i.ciudad}</span>}
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
          {visibles.length > 0 && (
            <p className="mt-4 text-caption text-fg-subtle">{t('inmobiliaria.ai.arco.public.elegir.noEsta')}</p>
          )}
        </>
      )}
    </div>
  );
}
