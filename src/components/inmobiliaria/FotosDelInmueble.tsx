'use client';

/**
 * FotosDelInmueble — la galería del inmueble, editable desde su ficha.
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «Si las inmobiliarias se llevan los inmuebles por CSV no van a tener fotos,
 * no veo la posibilidad acá de agregarle fotos.» La ficha mostraba la
 * portada (si había) y nada más; el único sitio con fotos era el diálogo de
 * edición de OTRA pantalla. Un inmueble sin fotos no se puede publicar
 * decentemente, así que las fotos tienen que vivir donde se abre el inmueble.
 *
 * Usa el endpoint real del back (`POST/DELETE /properties/:id/images`,
 * `PATCH …/images/order`), el mismo que el importador. Máximo 10, JPG/PNG/
 * WebP, 5 MB — las mismas reglas que valida `property-photos.ts`.
 */

import { useCallback, useEffect, useState } from 'react';
import { Images, Star, Trash, UploadSimple } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PropertyPhotoPicker } from '@/components/inmobiliaria/PropertyPhotoPicker';
import { propertiesApi } from '@/lib/api/properties.service';
import { uploadPropertyPhotos, PROPERTY_PHOTO_MAX_COUNT } from '@/lib/api/property-photos';

interface Imagen {
  id: string;
  url: string;
  order: number;
}

export interface FotosDelInmuebleProps {
  propertyId: string;
  /** Se llama cuando cambia la galería (subir, quitar, portada): la ficha refresca la portada del encabezado. */
  onCambio?: () => void;
}

export function FotosDelInmueble({ propertyId, onCambio }: FotosDelInmuebleProps) {
  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await propertiesApi.getImages(propertyId);
      setImagenes([...lista].sort((a, b) => a.order - b.order));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las fotos.');
    } finally {
      setCargando(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cupo = Math.max(0, PROPERTY_PHOTO_MAX_COUNT - imagenes.length);

  const subir = async () => {
    if (nuevas.length === 0) return;
    setSubiendo(true);
    try {
      const r = await uploadPropertyPhotos(propertyId, nuevas.slice(0, cupo));
      if (r.uploaded > 0) {
        toast.success(`${r.uploaded} ${r.uploaded === 1 ? 'foto subida' : 'fotos subidas'}`);
      }
      if (r.failed.length > 0) {
        toast.error(`${r.failed.length} ${r.failed.length === 1 ? 'foto no se subió' : 'fotos no se subieron'}`, {
          description: r.failed[0]?.reason,
        });
      }
      setNuevas([]);
      await cargar();
      onCambio?.();
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async (img: Imagen) => {
    setOcupada(img.id);
    try {
      await propertiesApi.deleteImage(propertyId, img.id);
      setImagenes((prev) => prev.filter((x) => x.id !== img.id));
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo quitar la foto', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setOcupada(null);
    }
  };

  const hacerPortada = async (img: Imagen) => {
    setOcupada(img.id);
    try {
      const orden = [img.id, ...imagenes.filter((x) => x.id !== img.id).map((x) => x.id)];
      await propertiesApi.reorderImages(propertyId, orden);
      setImagenes((prev) => orden.map((id, i) => ({ ...prev.find((x) => x.id === id)!, order: i })));
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo cambiar la portada', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section
      className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-bg overflow-hidden"
      data-testid="fotos-del-inmueble"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
            <Images className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-fg dark:text-white">Fotos</h3>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
          {imagenes.length} de {PROPERTY_PHOTO_MAX_COUNT}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Spinner size="sm" /> Cargando fotos…
          </div>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : imagenes.length === 0 ? (
          <p className="text-sm text-fg-muted" data-testid="fotos-vacio">
            Este inmueble todavía no tiene fotos. Sin fotos, en el portal se ve un espacio vacío: sube las de la
            ficha o las que tomó el agente.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-testid="fotos-galeria">
            {imagenes.map((img, i) => (
              <li key={img.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Foto ${i + 1} del inmueble`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white">
                    <Star weight="fill" className="h-3 w-3" /> Portada
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => void hacerPortada(img)}
                      disabled={ocupada !== null}
                      className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-fg hover:bg-white disabled:opacity-50"
                      aria-label={`Hacer portada la foto ${i + 1}`}
                    >
                      Portada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void quitar(img)}
                    disabled={ocupada !== null}
                    className="rounded-md bg-white/90 p-1 text-danger hover:bg-white disabled:opacity-50"
                    aria-label={`Quitar la foto ${i + 1}`}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!cargando && !error && (
          cupo > 0 ? (
            <div className="space-y-3">
              <PropertyPhotoPicker photos={nuevas} onChange={setNuevas} max={cupo} />
              {nuevas.length > 0 && (
                <div className="flex justify-end">
                  <Button size="sm" hideArrow onClick={() => void subir()} isLoading={subiendo} data-testid="fotos-subir">
                    <UploadSimple className="h-4 w-4" />
                    Subir {nuevas.length} {nuevas.length === 1 ? 'foto' : 'fotos'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-fg-muted">
              Llegaste al máximo de {PROPERTY_PHOTO_MAX_COUNT} fotos. Quita una para subir otra.
            </p>
          )
        )}
      </div>
    </section>
  );
}
