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
 * `PATCH …/images/order`), el mismo que el importador. Máximo
 * `PROPERTY_PHOTO_MAX_COUNT` (40), JPG/PNG/WebP, 5 MB — las mismas reglas que
 * valida `property-photos.ts`.
 *
 * Misma noche, segunda vuelta: «si quiero subir más no deja» (eran 10) y
 * «mirá eso tan feo, que se deje de una manera más fácil subirlas y más
 * bonita». Ahora se sueltan/eligen/pegan en `SubidaDeFotos` y se suben al
 * tiro, con el avance a la vista; cada miniatura abre el visor.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Images, Star, Trash, UploadSimple } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@leasefy/cadence';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { propertiesApi } from '@/lib/api/properties.service';
import { PROPERTY_PHOTO_MAX_COUNT } from '@/lib/api/property-photos';
import { SubidaDeFotos, filtrarFotos } from '@/components/inmobiliaria/inmueble/SubidaDeFotos';

interface Imagen {
  id: string;
  url: string;
  order: number;
}

/** Una foto que está subiendo: se ve en la grilla antes de existir en el back. */
interface EnCamino {
  clave: string;
  url: string;
  estado: 'esperando' | 'subiendo' | 'fallo';
}

export interface FotosDelInmuebleProps {
  propertyId: string;
  /** Se llama cuando cambia la galería (subir, quitar, portada): la ficha refresca la portada del encabezado. */
  onCambio?: () => void;
  /** Abrir la foto `indice` en grande (el visor lo pone la ficha, que también lo abre desde la portada). */
  onVer?: (indice: number) => void;
}

/**
 * Lo que dice el back cabe en un toast sólo si es una frase. Un volcado de
 * Prisma («Invalid `this.prisma…` invocation … Unique constraint failed») no
 * le sirve a nadie en la pantalla: se deja el título y ya.
 */
function descripcionDelError(e: unknown): string | undefined {
  if (!(e instanceof Error) || !e.message) return undefined;
  const m = e.message.trim();
  if (m.length > 160 || m.includes('\n') || m.startsWith('Invalid `')) return undefined;
  return m;
}

export function FotosDelInmueble({ propertyId, onCambio, onVer }: FotosDelInmuebleProps) {
  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enCamino, setEnCamino] = useState<EnCamino[]>([]);
  const [ocupada, setOcupada] = useState<string | null>(null);
  // Arrastrar fotos sobre CUALQUIER parte de la sección (no sólo la zona):
  // soltarlas encima de la grilla también sube.
  const [arrastrandoEncima, setArrastrandoEncima] = useState(false);
  const subiendoRef = useRef(false);

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

  const subiendo = enCamino.some((f) => f.estado !== 'fallo');
  const cupo = Math.max(0, PROPERTY_PHOTO_MAX_COUNT - imagenes.length - enCamino.filter((f) => f.estado !== 'fallo').length);

  /**
   * Sube de a una, en el orden en que llegaron (el back numera cada foto al
   * insertarla; en paralelo el orden sería el de la red). Elegir ya es
   * subir: no hay paso de «confirmar».
   */
  const subir = useCallback(
    async (archivos: File[]) => {
      if (archivos.length === 0 || subiendoRef.current) return;
      subiendoRef.current = true;
      const lote: EnCamino[] = archivos.map((f, i) => ({
        clave: `${Date.now()}-${i}-${f.name}`,
        url: URL.createObjectURL(f),
        estado: 'esperando',
      }));
      setEnCamino((prev) => [...prev.filter((f) => f.estado !== 'fallo'), ...lote]);

      let subidas = 0;
      const fallos: string[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const { clave } = lote[i];
        setEnCamino((prev) => prev.map((f) => (f.clave === clave ? { ...f, estado: 'subiendo' } : f)));
        try {
          await propertiesApi.uploadImage(propertyId, archivos[i]);
          subidas += 1;
          setEnCamino((prev) => prev.filter((f) => f.clave !== clave));
        } catch (e) {
          fallos.push(e instanceof Error ? e.message : archivos[i].name);
          setEnCamino((prev) => prev.map((f) => (f.clave === clave ? { ...f, estado: 'fallo' } : f)));
        }
      }
      for (const f of lote) URL.revokeObjectURL(f.url);
      subiendoRef.current = false;

      if (subidas > 0) toast.success(subidas === 1 ? 'Foto subida' : `${subidas} fotos subidas`);
      if (fallos.length > 0) {
        toast.error(fallos.length === 1 ? 'Una foto no se subió' : `${fallos.length} fotos no se subieron`, {
          description: fallos[0],
        });
      }
      if (subidas > 0) {
        await cargar();
        onCambio?.();
      }
    },
    [propertyId, cargar, onCambio],
  );

  const soltarEnLaSeccion = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrandoEncima(false);
    if (cupo <= 0 || subiendo) return;
    const validas = filtrarFotos(Array.from(e.dataTransfer.files), cupo);
    if (validas.length > 0) void subir(validas);
  };

  // Quitar es irreversible: primero se pregunta (AlertDialog), después se borra.
  // `porQuitar` es la foto que espera confirmación; null = diálogo cerrado.
  const [porQuitar, setPorQuitar] = useState<Imagen | null>(null);

  const quitar = async (img: Imagen) => {
    setOcupada(img.id);
    try {
      await propertiesApi.deleteImage(propertyId, img.id);
      setImagenes((prev) => prev.filter((x) => x.id !== img.id));
      toast.success('Foto quitada');
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo quitar la foto', { description: descripcionDelError(e) });
    } finally {
      setOcupada(null);
    }
  };

  const confirmarQuitar = async () => {
    const img = porQuitar;
    setPorQuitar(null);
    if (img) await quitar(img);
  };

  const hacerPortada = async (img: Imagen) => {
    setOcupada(img.id);
    try {
      const orden = [img.id, ...imagenes.filter((x) => x.id !== img.id).map((x) => x.id)];
      await propertiesApi.reorderImages(propertyId, orden);
      setImagenes((prev) => orden.map((id, i) => ({ ...prev.find((x) => x.id === id)!, order: i })));
      toast.success('Portada actualizada');
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo cambiar la portada', { description: descripcionDelError(e) });
    } finally {
      setOcupada(null);
    }
  };

  const esLaPortada = porQuitar != null && imagenes[0]?.id === porQuitar.id;

  return (
    <section
      className={cn(
        'relative rounded-lg border bg-surface dark:bg-bg overflow-hidden transition-colors',
        arrastrandoEncima ? 'border-primary' : 'border-border dark:border-border-strong',
      )}
      data-testid="fotos-del-inmueble"
      onDragEnter={(e) => {
        if (!Array.from(e.dataTransfer.types).includes('Files') || cupo <= 0) return;
        e.preventDefault();
        setArrastrandoEncima(true);
      }}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes('Files') || cupo <= 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setArrastrandoEncima(false);
      }}
      onDrop={soltarEnLaSeccion}
    >
      {arrastrandoEncima && imagenes.length > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary-soft/90"
          data-testid="fotos-soltar-overlay"
        >
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-fg shadow-md">
            <UploadSimple className="h-4 w-4" weight="bold" />
            Soltá para subir {cupo === 1 ? 'la última foto' : `hasta ${cupo} fotos`}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center text-fg-muted dark:text-fg-subtle">
            <Images className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-fg">Fotos</h3>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle tabular-nums" data-testid="fotos-contador">
          {subiendo
            ? `Subiendo ${enCamino.filter((f) => f.estado !== 'fallo').length}…`
            : `${imagenes.length} de ${PROPERTY_PHOTO_MAX_COUNT}`}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Spinner size="sm" /> Cargando fotos…
          </div>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : imagenes.length === 0 && enCamino.length === 0 ? (
          <div className="space-y-4" data-testid="fotos-vacio">
            <p className="text-sm text-fg-muted">
              Este inmueble todavía no tiene fotos. Sin fotos, en el portal se ve un espacio vacío: subí las de la
              ficha o las que tomó el agente.
            </p>
            <SubidaDeFotos variante="grande" cupo={cupo} maximo={PROPERTY_PHOTO_MAX_COUNT} onArchivos={(a) => void subir(a)} aceptarPegado />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-testid="fotos-galeria">
            {imagenes.map((img, i) => (
              <li key={img.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface-muted">
                <button
                  type="button"
                  onClick={() => onVer?.(i)}
                  className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`Ver la foto ${i + 1} en grande`}
                  data-testid={`foto-ver-${i}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Foto ${i + 1} del inmueble`} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                </button>
                {i === 0 && (
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-primary-fg">
                    <Star weight="fill" className="h-3 w-3" /> Portada
                  </span>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [&>*]:pointer-events-auto">
                  {i !== 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={() => void hacerPortada(img)}
                      disabled={ocupada !== null}
                      className="h-auto rounded-md bg-surface/90 px-2 py-1 text-xs font-medium hover:bg-surface disabled:bg-surface/90 disabled:opacity-50"
                      aria-label={`Hacer portada la foto ${i + 1}`}
                    >
                      Portada
                    </Button>
                  )}
                  <IconButton
                    onClick={() => setPorQuitar(img)}
                    disabled={ocupada !== null}
                    className="size-auto rounded-md bg-surface/90 p-1 text-danger hover:bg-surface hover:text-danger disabled:bg-surface/90 disabled:opacity-50 [&_svg]:size-4"
                    aria-label={`Quitar la foto ${i + 1}`}
                    icon={<Trash />}
                  />
                </div>
              </li>
            ))}
            {enCamino.map((f) => (
              <li
                key={f.clave}
                className="relative overflow-hidden rounded-lg border border-border bg-surface-muted"
                data-testid="foto-en-camino"
                data-estado={f.estado}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className={cn('aspect-[4/3] w-full object-cover', f.estado !== 'fallo' && 'opacity-60')} />
                <div className="absolute inset-0 flex items-center justify-center">
                  {f.estado === 'fallo' ? (
                    <span className="rounded-full bg-danger px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white">
                      No se subió
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white">
                      <Spinner size="sm" className="text-white" />
                      {f.estado === 'subiendo' ? 'Subiendo' : 'En cola'}
                    </span>
                  )}
                </div>
              </li>
            ))}
            {cupo > 0 && (
              <li>
                <SubidaDeFotos variante="ficha" cupo={cupo} maximo={PROPERTY_PHOTO_MAX_COUNT} onArchivos={(a) => void subir(a)} disabled={subiendo} aceptarPegado />
              </li>
            )}
          </ul>
        )}

        {!cargando && !error && imagenes.length > 0 && (
          <p className="text-xs text-fg-muted">
            {cupo > 0
              ? `Caben ${cupo} ${cupo === 1 ? 'foto más' : 'fotos más'}. Arrastralas acá, elegilas o pegalas con Ctrl+V. La primera es la portada.`
              : `Llegaste al máximo de ${PROPERTY_PHOTO_MAX_COUNT} fotos. Quitá una para subir otra.`}
          </p>
        )}
      </div>
      <AlertDialog open={porQuitar !== null} onOpenChange={(abierto) => { if (!abierto) setPorQuitar(null); }}>
        <AlertDialogContent data-testid="quitar-foto-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra del inmueble y no se puede deshacer.
              {esLaPortada ? ' La siguiente pasa a ser la portada.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupada !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              disabled={ocupada !== null}
              onClick={() => void confirmarQuitar()}
              data-testid="quitar-foto-confirmar"
            >
              Quitar foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
