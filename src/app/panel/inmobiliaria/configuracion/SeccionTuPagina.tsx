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

import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { ArrowSquareOut, Check, Globe, Stack, UploadSimple } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { normalizarNombreCorto, problemaDelNombreCorto } from '@/lib/marketplace/nombre-corto';
import { PORTADAS_DE_LEASEFY, esPortadaDeLeasefy, portadaDe } from '@/lib/marketplace/portadas';
import { LogoDeLaInmobiliaria } from '@/components/marketplace/inmobiliaria/piezas';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';
import { useCambiosPorGuardar } from '@/components/configuracion/cambios-por-guardar';

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
          titulo="Todavía no se pudo leer tu inmobiliaria"
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
  logoUrl?: string | null;
  branding?: { socials?: Partial<Record<string, string>>; primaryColor?: string | null } | null;
}

function Formulario({ agency, alGuardar }: { agency: Agencia; alGuardar: () => void }) {
  const [slug, setSlug] = useState(agency.slug ?? '');
  const [lema, setLema] = useState(agency.lema ?? '');
  const [portada, setPortada] = useState(agency.portadaUrl ?? null);
  const [logo, setLogo] = useState(agency.logoUrl ?? null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const archivoDelLogo = useRef<HTMLInputElement>(null);
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
  useEffect(() => setLogo(agency.logoUrl ?? null), [agency.logoUrl]);

  const normalizado = String(normalizarNombreCorto(slug) ?? '');
  const problema = slug ? problemaDelNombreCorto(normalizado) : 'forma';
  const direccion = `leasefy.co/i/${normalizado || agency.slug || agency.id}`;

  const guardar = async (): Promise<boolean> => {
    if (problema) {
      setErrorDelNombre(
        problema === 'reservado'
          ? 'Ese nombre corto está reservado. Prueba con el nombre de tu inmobiliaria.'
          : 'Va en minúsculas, sin tildes ni espacios (usa guiones), entre 3 y 50 letras.',
      );
      return false;
    }
    setGuardando(true);
    setErrorDelNombre(null);
    try {
      await agencyApi.updateAgency({
        ...(normalizado !== (agency.slug ?? '') ? { slug: normalizado } : {}),
        lema: lema.trim() || null,
        branding: { socials: { ...(agency.branding?.socials ?? {}), ...redes } },
      } as never);
      if (!conBarra) toast.success('Tu página quedó guardada.');
      alGuardar();
      return true;
    } catch (e) {
      const texto = mensajeParaLaPersona(e, { porDefecto: 'No se pudo guardar tu página.', accion: 'guardar tu página' });
      if (/nombre corto/i.test(texto)) setErrorDelNombre(texto);
      else toast.error(texto);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  // La barra de guardado de Configuración (Nico, 20-10-2026). La portada y el
  // logo se guardan al subirlos: un archivo ya subido no se «descarta».
  const redesGuardadas = (clave: string) => agency.branding?.socials?.[clave] ?? '';
  const cambios =
    (slug.trim() !== (agency.slug ?? '') ? 1 : 0) +
    (lema.trim() !== (agency.lema ?? '').trim() ? 1 : 0) +
    (Object.keys(redes) as Array<keyof Redes>).filter((k) => redes[k].trim() !== redesGuardadas(k)).length;
  const { conBarra } = useCambiosPorGuardar({
    id: 'tu-pagina',
    cambios,
    guardar,
    descartar: () => {
      setSlug(agency.slug ?? '');
      setLema(agency.lema ?? '');
      setRedes({
        instagram: redesGuardadas('instagram'),
        tiktok: redesGuardadas('tiktok'),
        youtube: redesGuardadas('youtube'),
        facebook: redesGuardadas('facebook'),
      });
      setErrorDelNombre(null);
    },
  });

  const subirPortada = async (f: File | undefined) => {
    if (!f) return;
    setSubiendo(true);
    try {
      const r = await agencyApi.uploadAgencyPortada(f);
      setPortada(r.portadaUrl);
      toast.success('La portada quedó en tu página.');
      alGuardar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo subir la portada.', accion: 'subir la portada' }));
    } finally {
      setSubiendo(false);
    }
  };

  /** Una portada de Leasefy, o `null` para volver a la de por defecto. */
  const elegirPortada = async (src: string | null) => {
    setEligiendo(src ?? 'ninguna');
    try {
      await agencyApi.updateAgency({ portadaUrl: src } as never);
      setPortada(src);
      toast.success(src ? 'Elegiste esa portada para tu página.' : 'Quedó la portada de Leasefy.');
      alGuardar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo cambiar la portada.', accion: 'cambiar la portada' }));
    } finally {
      setEligiendo(null);
    }
  };

  const subirLogo = async (f: File | undefined) => {
    if (!f) return;
    setSubiendoLogo(true);
    try {
      const r = await agencyApi.uploadAgencyLogo(f);
      setLogo(r.logoUrl);
      toast.success('Tu logo quedó en tu página.');
      alGuardar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo subir el logo.', accion: 'subir el logo' }));
    } finally {
      setSubiendoLogo(false);
    }
  };

  const usarIniciales = async () => {
    setSubiendoLogo(true);
    try {
      await agencyApi.updateAgency({ logoUrl: null } as never);
      setLogo(null);
      toast.success('Tu página muestra tus iniciales.');
      alGuardar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo quitar el logo.', accion: 'quitar el logo' }));
    } finally {
      setSubiendoLogo(false);
    }
  };

  const propia = Boolean(portada) && !esPortadaDeLeasefy(portada);
  const elegida = portada ?? PORTADAS_DE_LEASEFY[0].src;

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
          {/* Ronda 30: el campo de Cadence (antes un <input> armado a mano). */}
          <Input
            id="lema"
            value={lema}
            maxLength={160}
            onChange={(e) => setLema(e.target.value)}
            placeholder="Arriendos en Laureles y Belén desde 1998"
            className="mt-1.5"
          />
          <p className="mt-1.5 text-[13px] text-fg-muted">Sale debajo de tu nombre.</p>
        </div>
      </div>

      {/* Nico, 12-10-2026: «que suban su logo y su portada y puedan elegir cómo se van a ver
          en la red social; si no eligen nada, los predeterminados nuestros». */}
      <div className="space-y-5" data-testid="asi-te-ven">
        <div>
          <p className="text-[14px] font-medium text-fg">Así te ven en Leasefy</p>
          <p className="text-[13px] text-fg-muted">
            Tu logo y tu portada salen en tu página, en el buscador y en el chat. Si no subes nada, salen tus iniciales y
            una portada de Leasefy.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="vista-previa-de-la-pagina">
          <div className="relative h-28 bg-surface-muted md:h-36">
            <Image src={portadaDe(portada)} alt="" fill sizes="900px" className="object-cover" />
          </div>
          <div className="flex items-end gap-4 px-5 pb-4">
            <LogoDeLaInmobiliaria
              i={{ nombre: agency.name, logoUrl: logo, color: agency.branding?.primaryColor ?? null }}
              tamano={64}
              className="relative z-10 -mt-8 ring-4 ring-surface"
            />
            <div className="min-w-0 pt-3">
              <p className="truncate font-heading text-[18px] font-medium text-fg">{agency.name}</p>
              <p className="truncate text-[13px] text-fg-muted">{lema.trim() || 'Tu lema sale aquí'}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[13.5px] font-medium text-fg">Logo</p>
          <input
            ref={archivoDelLogo}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => subirLogo(e.target.files?.[0])}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => archivoDelLogo.current?.click()}
              disabled={subiendoLogo}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-fg hover:border-border-strong disabled:opacity-60"
            >
              <UploadSimple className="h-4 w-4" aria-hidden />
              {subiendoLogo ? 'Guardando…' : logo ? 'Cambiar el logo' : 'Subir mi logo'}
            </button>
            {logo && (
              <button
                type="button"
                onClick={usarIniciales}
                disabled={subiendoLogo}
                className="inline-flex h-9 items-center rounded-full px-3 text-[13.5px] font-medium text-fg-muted hover:text-fg disabled:opacity-60"
              >
                Usar mis iniciales
              </button>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-fg-muted">Cuadrado, con fondo transparente si puedes. PNG, JPG, WebP o SVG.</p>
        </div>

        <div>
          <p className="text-[13.5px] font-medium text-fg">Portada</p>
          <p className="text-[13px] text-fg-muted">Sube la tuya o elige una de Leasefy.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Portadas de Leasefy">
            {PORTADAS_DE_LEASEFY.map((p) => {
              const activa = !propia && elegida === p.src;
              return (
                <button
                  key={p.src}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  aria-label={p.nombre}
                  disabled={eligiendo !== null}
                  onClick={() => elegirPortada(p.src)}
                  className={
                    'relative h-20 overflow-hidden rounded-lg border-2 transition-[border-color,box-shadow] duration-base disabled:opacity-70 ' +
                    (activa ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]' : 'border-transparent hover:border-border-strong')
                  }
                >
                  <Image src={p.src} alt="" fill sizes="240px" className="object-cover" />
                  {activa && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg">
                      <Check className="h-3 w-3" weight="bold" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <input
            ref={archivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => subirPortada(e.target.files?.[0])}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => archivo.current?.click()}
              disabled={subiendo}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-fg hover:border-border-strong disabled:opacity-60"
            >
              <UploadSimple className="h-4 w-4" aria-hidden />
              {subiendo ? 'Subiendo…' : propia ? 'Cambiar mi portada' : 'Subir mi portada'}
            </button>
            {propia && (
              <button
                type="button"
                onClick={() => elegirPortada(null)}
                disabled={eligiendo !== null}
                className="inline-flex h-9 items-center rounded-full px-3 text-[13.5px] font-medium text-fg-muted hover:text-fg disabled:opacity-60"
              >
                Usar la de Leasefy
              </button>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-fg-muted">JPG, PNG o WebP, ancha (por ejemplo 2000 × 800), hasta 8 MB.</p>
        </div>
      </div>

      <div>
        <p className="text-[14px] font-medium text-fg">Tus redes</p>
        <p className="text-[13px] text-fg-muted">Un clic en tu página abre tu Instagram, tu TikTok… Escribe tu cuenta o el enlace.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {REDES.map((r) => (
            <label key={r.clave} className="block">
              <span className="text-[13px] text-fg">{r.nombre}</span>
              <Input
                value={redes[r.clave]}
                onChange={(e) => setRedes((x) => ({ ...x, [r.clave]: e.target.value }))}
                placeholder={r.ejemplo}
                className="mt-1"
              />
            </label>
          ))}
        </div>
      </div>

      <div className={conBarra ? 'hidden' : 'flex justify-end'}>
        <Button type="button" hideArrow onClick={() => void guardar()} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar mi página'}
        </Button>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="text-[14px] font-medium text-fg">Publica tus inmuebles</p>
        <p className="text-[13px] text-fg-muted">
          Lo que publicas sale en tu página y en el buscador de Leasefy, a nombre de tu inmobiliaria. Agrega el enlace del
          video de Instagram o TikTok de cada uno.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Una sola azul en la sección (Guardar mi página): publicar va en secundaria. */}
          <Button asChild size="sm" variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/inmuebles/nuevo">Publicar un inmueble</Link>
          </Button>
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
