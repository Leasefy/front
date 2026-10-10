'use client';

/**
 * «Tu página en Leasefy» (Nico, 09-10-2026): «el perfil de la inmobiliaria
 * reemplaza su página web». Aquí la inmobiliaria elige su nombre corto
 * (`leasefy.co/i/<nombre>`), su lema, su portada y sus redes, y tiene a la
 * mano cómo publicar: uno a uno o muchos a la vez. Lo que publica sale en su
 * página y en el buscador de Leasefy.
 *
 * Guarda con `PUT /inmobiliaria/agency` (`slug`, `lema`, `branding.socials`) y
 * la portada con `POST /inmobiliaria/agency/portada`. El nombre corto se
 * valida con la MISMA regla del back (`lib/marketplace/nombre-corto.ts`).
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowSquareOut, Globe, ImageSquare, Stack, UploadSimple } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { normalizarNombreCorto, problemaDelNombreCorto } from '@/lib/marketplace/nombre-corto';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

const REDES = [
  { clave: 'instagram', nombre: 'Instagram', ejemplo: '@tuinmobiliaria' },
  { clave: 'tiktok', nombre: 'TikTok', ejemplo: '@tuinmobiliaria' },
  { clave: 'youtube', nombre: 'YouTube', ejemplo: '@tuinmobiliaria' },
  { clave: 'facebook', nombre: 'Facebook', ejemplo: 'facebook.com/tuinmobiliaria' },
] as const;

type Redes = Record<(typeof REDES)[number]['clave'], string>;

export function SeccionTuPagina() {
  const { config, isLoading, errorCrudo, refetch } = useInmobiliariaConfig();
  const agency = config?.agency ?? null;

  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      vacio={!agency}
      queEs="tu página en Leasefy"
      onReintentar={refetch}
      esqueleto={<EsqueletoDeSeccion filas={5} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Globe}
          titulo="Todavía no pudimos leer tu inmobiliaria"
          ayuda="Vuelve a intentar en un momento: sin los datos de la agencia no hay página que mostrar."
        />
      }
    >
      {agency && <Formulario agency={agency as unknown as Agencia} alGuardar={() => void refetch()} />}
    </EstadoDeDatos>
  );
}

interface Agencia {
  id: string;
  name: string;
  slug?: string | null;
  lema?: string | null;
  portadaUrl?: string | null;
  branding?: { socials?: Partial<Record<string, string>> } | null;
}

function Formulario({ agency, alGuardar }: { agency: Agencia; alGuardar: () => void }) {
  const [slug, setSlug] = useState(agency.slug ?? '');
  const [lema, setLema] = useState(agency.lema ?? '');
  const [portada, setPortada] = useState(agency.portadaUrl ?? null);
  const [redes, setRedes] = useState<Redes>(() => ({
    instagram: agency.branding?.socials?.instagram ?? '',
    tiktok: agency.branding?.socials?.tiktok ?? '',
    youtube: agency.branding?.socials?.youtube ?? '',
    facebook: agency.branding?.socials?.facebook ?? '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorDelNombre, setErrorDelNombre] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => setPortada(agency.portadaUrl ?? null), [agency.portadaUrl]);

  const normalizado = String(normalizarNombreCorto(slug) ?? '');
  const problema = slug ? problemaDelNombreCorto(normalizado) : 'forma';
  const direccion = `leasefy.co/i/${normalizado || agency.slug || agency.id}`;

  const guardar = async () => {
    if (problema) {
      setErrorDelNombre(
        problema === 'reservado'
          ? 'Ese nombre corto está reservado. Prueba con el nombre de tu inmobiliaria.'
          : 'Va en minúsculas, sin tildes ni espacios (usa guiones), entre 3 y 50 letras.',
      );
      return;
    }
    setGuardando(true);
    setErrorDelNombre(null);
    try {
      await agencyApi.updateAgency({
        ...(normalizado !== (agency.slug ?? '') ? { slug: normalizado } : {}),
        lema: lema.trim() || null,
        branding: { socials: { ...(agency.branding?.socials ?? {}), ...redes } },
      } as never);
      toast.success('Tu página quedó guardada.');
      alGuardar();
    } catch (e) {
      const texto = mensajeParaLaPersona(e, { porDefecto: 'No pudimos guardar tu página.', accion: 'guardar tu página' });
      if (/nombre corto/i.test(texto)) setErrorDelNombre(texto);
      else toast.error(texto);
    } finally {
      setGuardando(false);
    }
  };

  const subirPortada = async (f: File | undefined) => {
    if (!f) return;
    setSubiendo(true);
    try {
      const r = await agencyApi.uploadAgencyPortada(f);
      setPortada(r.portadaUrl);
      toast.success('La portada quedó en tu página.');
      alGuardar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos subir la portada.', accion: 'subir la portada' }));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="seccion-tu-pagina">
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="flex flex-wrap items-center gap-2 text-[14px] text-fg">
          <Globe className="h-4 w-4 text-primary" aria-hidden />
          Tu página web es tu perfil en Leasefy:
          <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-[13px]">{direccion}</span>
          <Link
            href={`/i/${agency.slug ?? agency.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary hover:underline"
          >
            Ver mi página
            <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </p>
        <p className="mt-1 text-[13px] text-fg-muted">
          Tiene tu propio chat que conoce tus inmuebles, tus videos y lo que dicen de ti quienes firmaron contigo.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="nombre-corto" className="block text-[14px] font-medium text-fg">
            Nombre corto
          </label>
          <div className="mt-1.5 flex items-center rounded-lg border border-border bg-surface focus-within:border-primary">
            <span className="pl-3 font-mono text-[13px] text-fg-subtle">leasefy.co/i/</span>
            <input
              id="nombre-corto"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(normalizado)}
              aria-invalid={Boolean(errorDelNombre) || undefined}
              aria-describedby="nombre-corto-ayuda"
              className="h-11 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[14px] text-fg focus:outline-none"
            />
          </div>
          <p id="nombre-corto-ayuda" className={errorDelNombre ? 'mt-1.5 text-[13px] text-danger' : 'mt-1.5 text-[13px] text-fg-muted'}>
            {errorDelNombre ?? 'En minúsculas y con guiones. Si lo cambias, el enlace viejo deja de funcionar.'}
          </p>
        </div>
        <div>
          <label htmlFor="lema" className="block text-[14px] font-medium text-fg">
            Lema <span className="font-normal text-fg-muted">(opcional)</span>
          </label>
          <input
            id="lema"
            value={lema}
            maxLength={160}
            onChange={(e) => setLema(e.target.value)}
            placeholder="Arriendos en Laureles y Belén desde 1998"
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] text-fg placeholder:text-fg-placeholder focus:border-primary focus:outline-none"
          />
          <p className="mt-1.5 text-[13px] text-fg-muted">Sale debajo de tu nombre.</p>
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium text-fg">Portada</p>
        <div className="relative mt-1.5 h-32 overflow-hidden rounded-lg border border-border bg-surface-muted md:h-40">
          {portada ? (
            <Image src={portada} alt="La portada de tu página" fill sizes="800px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center gap-2 text-[13.5px] text-fg-muted">
              <ImageSquare className="h-5 w-5" aria-hidden />
              Sin portada todavía
            </span>
          )}
        </div>
        <input
          ref={archivo}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => subirPortada(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => archivo.current?.click()}
          disabled={subiendo}
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-fg hover:border-border-strong disabled:opacity-60"
        >
          <UploadSimple className="h-4 w-4" aria-hidden />
          {subiendo ? 'Subiendo…' : portada ? 'Cambiar la portada' : 'Subir una portada'}
        </button>
        <p className="mt-1 text-[12.5px] text-fg-muted">JPG, PNG o WebP, ancha (por ejemplo 2000 × 800), hasta 8 MB.</p>
      </div>

      <div>
        <p className="text-[14px] font-medium text-fg">Tus redes</p>
        <p className="text-[13px] text-fg-muted">Un clic en tu página abre tu Instagram, tu TikTok… Escribe tu cuenta o el enlace.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {REDES.map((r) => (
            <label key={r.clave} className="block">
              <span className="text-[13px] text-fg">{r.nombre}</span>
              <input
                value={redes[r.clave]}
                onChange={(e) => setRedes((x) => ({ ...x, [r.clave]: e.target.value }))}
                placeholder={r.ejemplo}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] text-fg placeholder:text-fg-placeholder focus:border-primary focus:outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-fg hover:bg-primary-600 disabled:opacity-60 active:scale-[0.97]"
        >
          {guardando ? 'Guardando…' : 'Guardar mi página'}
        </button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-[14px] font-medium text-fg">Publica tus inmuebles</p>
        <p className="text-[13px] text-fg-muted">
          Lo que publicas sale en tu página y en el buscador de Leasefy, a nombre de tu inmobiliaria. Agrega el enlace del
          video de Instagram o TikTok de cada uno.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/panel/inmobiliaria/inmuebles/nuevo"
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-fg hover:bg-primary-600"
          >
            Publicar un inmueble
          </Link>
          <Link
            href="/panel/inmobiliaria/inmuebles/importar"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-fg hover:border-border-strong"
          >
            <Stack className="h-4 w-4" aria-hidden />
            Cargar muchos desde un archivo
          </Link>
        </div>
      </div>
    </div>
  );
}
