'use client';

import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { propertiesApi } from '@/lib/api/properties.service';
import { uploadPropertyPhotos, PROPERTY_PHOTO_MAX_COUNT } from '@/lib/api/property-photos';
import { PropertyPhotoPicker } from '@/components/inmobiliaria/PropertyPhotoPicker';
import { Button, Input, Textarea, Spinner } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SegmentedControl } from '@leasefy/cadence';
import { COLOMBIAN_CITIES } from '@/lib/types/property';
import type { AgencyProperty, PropertyType } from '@/lib/types/property';

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

interface PropertyImageRow {
  id: string;
  url: string;
  order: number;
}

/**
 * Edit modal for panel properties. Seeds the form with the current property
 * and PATCHes via propertiesApi.update (backend PATCH /properties/:id, owner
 * or assigned agent). Photos: existing images (with ids) are fetched on open,
 * removable via DELETE /properties/:id/images/:imageId, and new ones can be
 * added (uploaded on save, respecting the backend max of 10 total).
 * Same overlay pattern as ChangeAgentModal.
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
    description: property.description,
    type: property.type,
    city: property.city,
    neighborhood: property.neighborhood,
    address: property.address,
    monthlyRent: String(property.monthlyRent),
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    area: String(property.area),
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingImageId(null);
    }
  };

  // Backend caps at 10 images per property (existing + new).
  const remainingPhotoSlots = Math.max(0, PROPERTY_PHOTO_MAX_COUNT - images.length);

  const isValid =
    !!form.title &&
    !!form.description &&
    !!form.city &&
    !!form.neighborhood &&
    !!form.address &&
    Number(form.monthlyRent) > 0 &&
    Number(form.bedrooms) >= 0 &&
    Number(form.bathrooms) >= 0 &&
    Number(form.area) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await propertiesApi.update(property.id, {
        title: form.title,
        description: form.description,
        type: form.type,
        city: form.city,
        neighborhood: form.neighborhood,
        address: form.address,
        monthlyRent: Number(form.monthlyRent),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area: Number(form.area),
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
      setError(err instanceof Error ? err.message : 'Error al actualizar la propiedad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-fg">Editar propiedad</h2>
            <p className="text-sm text-fg-muted mt-0.5 truncate max-w-[320px]">
              {property.title}
            </p>
          </div>
          <Button variant="ghost" size="icon" hideArrow onClick={onClose} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Título *</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              data-testid="edit-title"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Descripción *</label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              className="resize-none"
              data-testid="edit-description"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Tipo de inmueble *</label>
            <SegmentedControl<PropertyType>
              aria-label="Tipo de inmueble"
              fullWidth
              value={form.type}
              onChange={(v) => update('type', v)}
              options={PROPERTY_TYPES.map((pt) => ({ value: pt.value, label: pt.label }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Ciudad *</label>
              <Select value={form.city || undefined} onValueChange={(v) => update('city', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná una ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {COLOMBIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Barrio / Zona *</label>
              <Input
                type="text"
                value={form.neighborhood}
                onChange={(e) => update('neighborhood', e.target.value)}
                data-testid="edit-neighborhood"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Dirección *</label>
            <Input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              data-testid="edit-address"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Habitaciones *</label>
              <Input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                data-testid="edit-bedrooms"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Baños *</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
                data-testid="edit-bathrooms"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Área (m²) *</label>
              <Input
                type="number"
                min="1"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                data-testid="edit-area"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">Canon (COP) *</label>
              <Input
                type="number"
                min="1"
                value={form.monthlyRent}
                onChange={(e) => update('monthlyRent', e.target.value)}
                data-testid="edit-rent"
              />
            </div>
          </div>

          {/* ── Fotos ── */}
          <div className="space-y-2 pt-1">
            <label className="text-sm font-medium text-fg">Fotos</label>
            {imagesLoading ? (
              <div className="flex items-center gap-2 text-sm text-fg-muted py-2">
                <Spinner size="sm" /> Cargando fotos...
              </div>
            ) : (
              <>
                {imagesError && (
                  <p className="text-xs text-fg-muted" data-testid="edit-images-error">
                    No se pudieron cargar las fotos actuales.
                  </p>
                )}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-3" data-testid="edit-existing-images">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="relative w-20 h-20 rounded-xl border border-border bg-center bg-cover"
                        style={{ backgroundImage: `url(${img.url})` }}
                        data-testid="edit-existing-image"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          disabled={deletingImageId !== null}
                          aria-label="Eliminar foto"
                          data-testid={`edit-remove-image-${img.id}`}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-border bg-card text-fg-muted flex items-center justify-center hover:text-danger disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
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
                  <p className="text-xs text-fg-muted">
                    Alcanzaste el máximo de {PROPERTY_PHOTO_MAX_COUNT} fotos. Elimina una para agregar otra.
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-danger" data-testid="edit-error">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              hideArrow
              isLoading={isSubmitting}
              disabled={!isValid || isSubmitting}
              className="flex-1"
              data-testid="edit-submit"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
