'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { propertiesApi } from '@/lib/api/properties.service';
import { uploadPropertyPhotos, PROPERTY_PHOTO_MAX_COUNT } from '@/lib/api/property-photos';
import { PropertyPhotoPicker } from '@/components/inmobiliaria/PropertyPhotoPicker';
import { Button, Input, Textarea, Spinner } from '@/components/ui';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Combobox } from '@/components/ui/combobox';
import { CIUDADES_DE_COLOMBIA, etiquetaDeCiudad } from '@/lib/constants/colombia-geo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { erroresDelInmueble } from '@/lib/inmuebles/limites-del-inmueble';
import { SegmentedControl } from '@leasefy/cadence';
import type { AgencyProperty, PropertyType } from '@/lib/types/property';

/** Todas las ciudades del país (antes eran 10 y una de Sabaneta abría vacía). */
const OPCIONES_DE_CIUDAD = CIUDADES_DE_COLOMBIA.map((c) => ({ value: c.ciudad, label: etiquetaDeCiudad(c) }));
/** El back pide 20 letras si hay descripción (`CreatePropertyDto.description`, `@MinLength(20)`); vacía se puede. */
const LARGO_MINIMO_DE_LA_DESCRIPCION = 20;

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
  { value: 'room', label: 'Habitación' },
];

interface PropertyEditModalProps {
  property: AgencyProperty;
  onClose: () => void;
  onSuccess: () => void;
}

/** Los campos del formulario: los mismos nombres que `PATCH /properties/:id`. */
type CampoDelModal =
  | 'title'
  | 'description'
  | 'type'
  | 'city'
  | 'neighborhood'
  | 'address'
  | 'monthlyRent'
  | 'salePrice'
  | 'bedrooms'
  | 'bathrooms'
  | 'area';
const CAMPOS_DEL_MODAL: readonly CampoDelModal[] = [
  'title', 'description', 'type', 'city', 'neighborhood', 'address', 'monthlyRent', 'salePrice', 'bedrooms', 'bathrooms', 'area',
];
const idDelCampo = (campo: CampoDelModal) => `edit-campo-${campo}`;
const numeroOVacio = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));

interface PropertyImageRow {
  id: string;
  url: string;
  order: number;
}

/**
 * 🔴 Es un CAJÓN, no un modal (Nico, 28-10-2026: «cuando uno le da editar un inmueble debería de mostrar los datos que
 * ya están cargados… y muestra no un modal si no un drawer»). Abría con la ciudad vacía porque el selector sólo tenía
 * 10 ciudades (Sabaneta no estaba) y con «Guardar» apagado porque pedía una descripción que /publica no exige; ahora
 * la ciudad sale de las 1.100 del país (y si la guardada no está, se agrega), la descripción es opcional como en el
 * back y un inmueble en venta edita su precio de venta en vez del canon.
 *
 * Edit drawer for panel properties. Seeds the form with the current property
 * and PATCHes via propertiesApi.update (backend PATCH /properties/:id, owner
 * or assigned agent). Photos: existing images (with ids) are fetched on open,
 * removable via DELETE /properties/:id/images/:imageId, and new ones can be
 * added (uploaded on save, respecting the backend max of 10 total).
 *
 * Es el `Dialog` canónico (DESIGN.md §17): el `<form>` va en el cuerpo y el
 * botón de guardar en el pie fijo, apuntándolo con `form=`. El clic en el velo
 * NO cierra (así era la cáscara a mano): un formulario largo con fotos no se
 * pierde por un clic de más; se sale por Cancelar, la ✕ o Esc.
 */
export function PropertyEditModal({ property, onClose, onSuccess }: PropertyEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Photos ──
  const [images, setImages] = useState<PropertyImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [form, setForm] = useState({
    title: property.title,
    description: property.description ?? '',
    type: property.type,
    city: property.city,
    // 🔴 Vacío cuando no se sabe. `String(null)` es la cadena «null», que se
    // pinta tal cual adentro del input: los cuatro son nullables desde el
    // 2026-09-09.
    neighborhood: property.neighborhood ?? '',
    address: property.address,
    // `String(null)` es «null»: un inmueble en venta (o sin canon) abría con esa palabra en el campo.
    monthlyRent: property.monthlyRent == null ? '' : String(property.monthlyRent),
    salePrice: property.salePrice == null ? '' : String(property.salePrice),
    bedrooms: property.bedrooms == null ? '' : String(property.bedrooms),
    bathrooms: property.bathrooms == null ? '' : String(property.bathrooms),
    area: property.area == null ? '' : String(property.area),
  });

  /** Lo que el back no aceptó, por campo; se va al editar ese campo. */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDelModal, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDelServidor((prev) => (prev[field as CampoDelModal] ? { ...prev, [field]: undefined } : prev));
  };

  /*
   * Los topes del back (`limites-del-inmueble.ts`, espejo del DTO) sobre lo
   * escrito: se ven en el momento y no dejan guardar (sistema de errores,
   * 02-10-2026). Lo del servidor va debajo, si el tope no dice nada.
   */
  const topes = erroresDelInmueble({
    title: form.title,
    address: form.address,
    city: form.city,
    neighborhood: form.neighborhood,
    monthlyRent: numeroOVacio(form.monthlyRent),
    bedrooms: numeroOVacio(form.bedrooms),
    bathrooms: numeroOVacio(form.bathrooms),
    area: numeroOVacio(form.area),
  }) as Partial<Record<CampoDelModal, string>>;
  const enVenta = property.listingType === 'sale';
  // Sólo si la cambió: una descripción vieja y corta no impide guardar lo demás (y no se vuelve a mandar).
  const cambioLaDescripcion = form.description.trim() !== (property.description ?? '').trim();
  const descripcionCorta =
    cambioLaDescripcion &&
    form.description.trim().length > 0 &&
    form.description.trim().length < LARGO_MINIMO_DE_LA_DESCRIPCION
      ? `Escribe al menos ${LARGO_MINIMO_DE_LA_DESCRIPCION} letras o déjala vacía.`
      : undefined;
  const errorDe = (campo: CampoDelModal) =>
    (campo === 'description' ? descripcionCorta : undefined) ?? topes[campo] ?? delServidor[campo];
  /** La ciudad guardada aunque no esté en la lista del país (una escrita a mano en otro lado): se ve tal cual. */
  const opcionesDeCiudad =
    form.city && !OPCIONES_DE_CIUDAD.some((o) => o.value === form.city)
      ? [{ value: form.city, label: form.city }, ...OPCIONES_DE_CIUDAD]
      : OPCIONES_DE_CIUDAD;
  const a11y = (campo: CampoDelModal) => ({
    id: idDelCampo(campo),
    'aria-invalid': errorDe(campo) ? true : undefined,
    'aria-describedby': errorDe(campo) ? `${idDelCampo(campo)}-error` : undefined,
  });

  useEffect(() => {
    let alive = true;
    propertiesApi
      .getImages(property.id)
      .then((imgs) => {
        if (alive) setImages(imgs);
      })
      .catch(() => {
        if (alive) setImagesError(true);
      })
      .finally(() => {
        if (alive) setImagesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [property.id]);

  const handleRemoveImage = async (imageId: string) => {
    if (deletingImageId) return;
    setDeletingImageId(imageId);
    try {
      await propertiesApi.deleteImage(property.id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      toast.error('No se pudo eliminar la foto', {
        description: mensajeParaLaPersona(err, { accion: 'eliminar la foto' }),
      });
    } finally {
      setDeletingImageId(null);
    }
  };

  // Backend caps at 10 images per property (existing + new).
  const remainingPhotoSlots = Math.max(0, PROPERTY_PHOTO_MAX_COUNT - images.length);

  const isValid =
    !!form.title &&
    !descripcionCorta &&
    !!form.city &&
    !!form.address &&
    (enVenta ? Number(form.salePrice) > 0 : Number(form.monthlyRent) > 0) &&
    // Barrio, habitaciones, baños y área pueden quedar vacíos: no saberlos es
    // un estado legítimo (2026-09-09). Lo que no se acepta es un número
    // absurdo escrito a mano — vacío pasa, «-3» no.
    (form.bedrooms === '' || Number(form.bedrooms) >= 0) &&
    (form.bathrooms === '' || Number(form.bathrooms) >= 0) &&
    (form.area === '' || Number(form.area) > 0) &&
    Object.keys(topes).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await propertiesApi.update(property.id, {
        title: form.title,
        // Sólo si cambió y no quedó vacía: el back pide 20 letras si viene (y no se inventa una).
        ...(cambioLaDescripcion && form.description.trim() ? { description: form.description.trim() } : {}),
        type: form.type,
        city: form.city,
        // Vacío = «no lo sé», y se manda como tal. `Number('')` es 0, que en
        // el catálogo se lee como un hecho del inmueble.
        neighborhood: form.neighborhood.trim() || null,
        address: form.address,
        ...(enVenta ? { salePrice: Number(form.salePrice) } : { monthlyRent: Number(form.monthlyRent) }),
        bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
        bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
        area: form.area === '' ? null : Number(form.area),
      });

      // The PATCH succeeded: photo failures must not read as a failed save.
      if (newPhotos.length > 0) {
        const { failed } = await uploadPropertyPhotos(property.id, newPhotos);
        if (failed.length > 0) {
          toast.warning(
            `Los cambios se guardaron, pero ${failed.length} de ${newPhotos.length} fotos no se subieron.`,
            { description: failed[0]?.reason },
          );
        } else {
          toast.success('Propiedad actualizada con fotos nuevas');
        }
      } else {
        toast.success('Propiedad actualizada');
      }
      onSuccess();
    } catch (err) {
      // Un 400 con `campos`: cada error bajo su campo y el foco al primero; el
      // aviso de abajo, SÓLO con lo que no tiene campo (o un 5xx con la
      // referencia, o la conexión si no hubo respuesta).
      const reparto = repartirErroresDelServidor<CampoDelModal>(err, {
        campos: CAMPOS_DEL_MODAL,
        porDefecto: 'No se pudo actualizar el inmueble',
        accion: 'actualizar la propiedad',
      });
      setDelServidor(reparto.porCampo);
      setError(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
      const primero = reparto.orden[0];
      if (primero) {
        const el = formRef.current?.querySelector<HTMLElement>(`#${idDelCampo(primero)}`);
        el?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Cajon abierto onOpenChange={(abierto) => !abierto && onClose()} tamano="md" data-testid="editar-inmueble">
      <CajonCabecera titulo="Editar inmueble" descripcion={property.title} />
      <CajonCuerpo>
        {/* El pie vive FUERA del <form>: el botón de guardar lo apunta con `form=`. */}
        <form ref={formRef} id={ID_DEL_FORMULARIO} onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor={idDelCampo('title')} className="text-body-sm text-fg">Título *</label>
            <Input
              {...a11y('title')}
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              data-testid="edit-title"
            />
            <ErrorDelCampo id={`${idDelCampo('title')}-error`} mensaje={errorDe('title')} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={idDelCampo('description')} className="text-body-sm text-fg">Descripción</label>
            <Textarea
              {...a11y('description')}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              className="resize-none"
              placeholder="Lo que hace distinto al inmueble: luz, vista, cercanía, acabados…"
              data-testid="edit-description"
            />
            <ErrorDelCampo
              id={`${idDelCampo('description')}-error`}
              mensaje={errorDe('description')}
              pista={`Opcional. Si la escribes, mínimo ${LARGO_MINIMO_DE_LA_DESCRIPCION} letras.`}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-body-sm text-fg" id="edit-tipo">Tipo de inmueble *</p>
            <SegmentedControl<PropertyType>
              aria-labelledby="edit-tipo"
              aria-label="Tipo de inmueble"
              fullWidth
              value={form.type}
              onChange={(v) => update('type', v)}
              options={PROPERTY_TYPES.map((pt) => ({ value: pt.value, label: pt.label }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={idDelCampo('city')} className="text-body-sm text-fg">Ciudad *</label>
              <Combobox
                className="w-full"
                value={form.city || undefined}
                onChange={(v) => update('city', v ?? '')}
                options={opcionesDeCiudad}
                placeholder="Elige la ciudad"
                searchPlaceholder="Buscar ciudad o departamento…"
                invalid={Boolean(errorDe('city'))}
                data-testid="edit-city"
              />
              <ErrorDelCampo id={`${idDelCampo('city')}-error`} mensaje={errorDe('city')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={idDelCampo('neighborhood')} className="text-body-sm text-fg">Barrio o zona</label>
              <Input
                {...a11y('neighborhood')}
                type="text"
                value={form.neighborhood}
                onChange={(e) => update('neighborhood', e.target.value)}
                placeholder="Opcional"
                data-testid="edit-neighborhood"
              />
              <ErrorDelCampo id={`${idDelCampo('neighborhood')}-error`} mensaje={errorDe('neighborhood')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={idDelCampo('address')} className="text-body-sm text-fg">Dirección *</label>
            <Input
              {...a11y('address')}
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              data-testid="edit-address"
            />
            <ErrorDelCampo id={`${idDelCampo('address')}-error`} mensaje={errorDe('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor={idDelCampo('bedrooms')} className="text-body-sm text-fg">Habitaciones</label>
              <Input
                {...a11y('bedrooms')}
                type="number"
                min="0"
                inputMode="numeric"
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                data-testid="edit-bedrooms"
              />
              <ErrorDelCampo id={`${idDelCampo('bedrooms')}-error`} mensaje={errorDe('bedrooms')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={idDelCampo('bathrooms')} className="text-body-sm text-fg">Baños</label>
              <Input
                {...a11y('bathrooms')}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
                data-testid="edit-bathrooms"
              />
              <ErrorDelCampo id={`${idDelCampo('bathrooms')}-error`} mensaje={errorDe('bathrooms')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={idDelCampo('area')} className="text-body-sm text-fg">Área (m²)</label>
              <Input
                {...a11y('area')}
                type="number"
                min="1"
                inputMode="numeric"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                data-testid="edit-area"
              />
              <ErrorDelCampo id={`${idDelCampo('area')}-error`} mensaje={errorDe('area')} />
            </div>
            {enVenta ? (
              <div className="space-y-1.5">
                <label htmlFor={idDelCampo('salePrice')} className="text-body-sm text-fg">Precio (COP) *</label>
                <Input
                  {...a11y('salePrice')}
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="font-mono tabular-nums"
                  value={form.salePrice}
                  onChange={(e) => update('salePrice', e.target.value)}
                  data-testid="edit-sale-price"
                />
                <ErrorDelCampo id={`${idDelCampo('salePrice')}-error`} mensaje={errorDe('salePrice')} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor={idDelCampo('monthlyRent')} className="text-body-sm text-fg">Canon (COP) *</label>
                <Input
                  {...a11y('monthlyRent')}
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className="font-mono tabular-nums"
                  value={form.monthlyRent}
                  onChange={(e) => update('monthlyRent', e.target.value)}
                  data-testid="edit-rent"
                />
                <ErrorDelCampo id={`${idDelCampo('monthlyRent')}-error`} mensaje={errorDe('monthlyRent')} />
              </div>
            )}
          </div>

          {/* ── Fotos ── */}
          <div className="space-y-2 pt-1">
            <p className="text-body-sm text-fg">Fotos</p>
            {imagesLoading ? (
              <div className="flex items-center gap-2 py-2 text-body-sm text-fg-muted">
                <Spinner size="sm" /> Cargando fotos…
              </div>
            ) : (
              <>
                {imagesError && (
                  <p className="text-caption text-fg-muted" data-testid="edit-images-error">
                    No se pudieron cargar las fotos actuales.
                  </p>
                )}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-3" data-testid="edit-existing-images">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="relative h-20 w-20 rounded-md border border-border bg-cover bg-center"
                        style={{ backgroundImage: `url(${img.url})` }}
                        data-testid="edit-existing-image"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          disabled={deletingImageId !== null}
                          aria-label="Eliminar foto"
                          data-testid={`edit-remove-image-${img.id}`}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-fg-muted hover:text-danger disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {remainingPhotoSlots > 0 ? (
                  <PropertyPhotoPicker
                    photos={newPhotos}
                    onChange={setNewPhotos}
                    disabled={isSubmitting}
                    max={remainingPhotoSlots}
                  />
                ) : (
                  <p className="text-caption text-fg-muted">
                    Alcanzaste el máximo de {PROPERTY_PHOTO_MAX_COUNT} fotos. Elimina una para agregar otra.
                  </p>
                )}
              </>
            )}
          </div>

          {/* El aviso del formulario (lo que no tiene campo): un bloque, no un error de campo. */}
          {error && (
            <p role="alert" className="text-body-sm text-danger" data-testid="edit-error">{error}</p>
          )}
        </form>
      </CajonCuerpo>
      <CajonPie
        izquierda={
          <Button type="button" variant="ghost" hideArrow onClick={onClose}>
            Cancelar
          </Button>
        }
      >
        <Button
          type="submit"
          form={ID_DEL_FORMULARIO}
          hideArrow
          isLoading={isSubmitting}
          disabled={!isValid || isSubmitting}
          data-testid="edit-submit"
        >
          Guardar los cambios
        </Button>
      </CajonPie>
    </Cajon>
  );
}

const ID_DEL_FORMULARIO = 'form-editar-propiedad';
