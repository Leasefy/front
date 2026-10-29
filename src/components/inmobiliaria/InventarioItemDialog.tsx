'use client';

/**
 * InventarioItemDialog — agregar o editar UN ítem del inventario del inmueble.
 *
 * Nico (2026-09-02): «¿por qué este inmueble no deja agregar inventario? ¿no
 * está construido?». No lo estaba: los tres botones de la tarjeta venían
 * `disabled` con «Próximamente» y el back no guardaba inventario en la
 * consignación. Ahora sí: el inventario se carga desde que el inmueble entra
 * a la agencia —lo que hay y en qué estado, tal como se lo recibe al
 * propietario—, sin esperar contrato, entrega ni acta. Un inmueble en venta
 * también tiene inventario.
 *
 * 🔴 Nico, 2026-09-12: «la parte de agregar inventario debería de funcionar
 * offline porque hay muchos apartamentos donde no hay señal». Por eso la foto
 * dejó de ser sólo un enlace: se toma con la cámara del teléfono ahí mismo y
 * se guarda en el borrador local; la subida es después, cuando haya señal
 * (`use-borrador-de-inventario.ts`).
 *
 * 🔴 Nico (reunión con Portofino, 29-10-2026): agregar al inventario va en un
 * CAJÓN, no en un modal —se agrega sin perder de vista la lista ni lo que se
 * estaba haciendo (crear un contrato)—, y la foto se distingue clara: TOMARLA
 * con la cámara o ADJUNTAR una imagen del computador o del celular (también
 * arrastrándola en escritorio), con su vista previa y «Quitar». El campo de
 * «pega el enlace» confundía y se fue: la foto que ya tenía el ítem se
 * conserva tal cual.
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, ImageSquare, Trash } from '@phosphor-icons/react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

export const CONDICIONES: ReadonlyArray<InventoryItem['condition']> = ['excellent', 'good', 'fair', 'poor'];

const CONDICION_LABEL_KEY: Record<InventoryItem['condition'], string> = {
  excellent: 'inmobiliaria.acta.condExcellent',
  good: 'inmobiliaria.acta.condGood',
  fair: 'inmobiliaria.acta.condFair',
  poor: 'inmobiliaria.acta.condPoor',
};

export type ItemDeInventarioBorrador = Omit<InventoryItem, 'id'> & { id?: string };

/** Lo mismo que acepta el back (`FotoDeInventarioService`). */
export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Se valida acá, con la foto todavía en la mano, y no al subir: una foto
 * rechazada 40 minutos después —ya fuera del apartamento— no se puede volver
 * a tomar.
 */
/**
 * Cuánto puede medir la URL de la foto. 2048 y no 500 (23-09-2026): la foto
 * del inventario viene del back como URL FIRMADA del bucket privado —≈550
 * caracteres con su token— y cortarla a 500 le arrancaba el token (el back
 * igual saca la ruta, pero la vista previa quedaba rota). Es el mismo tope del
 * back (`ItemDeInventarioDto.photoUrl`).
 */
export const LARGO_MAXIMO_DE_LA_URL_DE_LA_FOTO = 2048;

export function revisarFoto(archivo: File): string | null {
  if (!FOTO_TIPOS.includes(archivo.type)) return 'La foto tiene que ser JPG, PNG o WebP.';
  if (archivo.size > FOTO_MAX_BYTES) return 'La foto no puede pesar más de 5 MB.';
  return null;
}

interface Props {
  abierto: boolean;
  /** `null` = agregar; con ítem = editar. */
  item: InventoryItem | null;
  guardando: boolean;
  /** La foto que ya está en el borrador de este ítem, para mostrarla al editar. */
  vistaPreviaDeLaFoto?: string;
  onCerrar: () => void;
  /** `foto` viaja aparte del ítem: todavía no tiene URL, es un archivo. */
  onGuardar: (item: ItemDeInventarioBorrador, foto?: Blob | null) => void;
  /**
   * Muestra «Espacio». Sólo en el inventario por versiones: la lista vieja de
   * la consignación rechaza campos que no conoce.
   */
  conEspacio?: boolean;
}

function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function InventarioItemDialog({
  abierto,
  item,
  guardando,
  vistaPreviaDeLaFoto,
  onCerrar,
  onGuardar,
  conEspacio = false,
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState<InventoryItem['condition']>('good');
  const [notes, setNotes] = useState('');
  const [espacio, setEspacio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [errores, setErrores] = useState<{ name?: string; quantity?: string; foto?: string }>({});
  const entradaDeFoto = useRef<HTMLInputElement>(null);
  const entradaDeImagen = useRef<HTMLInputElement>(null);

  // Cada apertura arranca del ítem que se edita (o en blanco).
  useEffect(() => {
    if (!abierto) return;
    setName(item?.name ?? '');
    setQuantity(String(item?.quantity ?? 1));
    setCondition(item?.condition ?? 'good');
    setNotes(item?.notes ?? '');
    setEspacio(item?.espacio ?? '');
    setPhotoUrl(item?.photoUrl ?? '');
    setFoto(null);
    setErrores({});
  }, [abierto, item]);

  // La foto elegida en esta apertura; se revoca al cambiarla para no dejar
  // una URL de objeto colgada por cada intento.
  const [vistaLocal, setVistaLocal] = useState<string | null>(null);
  useEffect(() => {
    if (!foto) {
      setVistaLocal(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setVistaLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const tomarArchivo = (archivo: File | undefined) => {
    if (!archivo) return;
    const problema = revisarFoto(archivo);
    if (problema) {
      setErrores((v) => ({ ...v, foto: problema }));
      return;
    }
    setErrores((v) => ({ ...v, foto: undefined }));
    setFoto(archivo);
  };

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    // Limpiar el input deja volver a elegir el MISMO archivo después de un
    // rechazo; sin esto el `change` no vuelve a dispararse.
    e.target.value = '';
    tomarArchivo(archivo);
  };

  // Escritorio: soltar la imagen encima del recuadro de la foto.
  const [arrastrando, setArrastrando] = useState(false);
  const soltar = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    tomarArchivo(e.dataTransfer.files?.[0]);
  };

  // «Quitar» se lleva la nueva y también la que ya tenía el ítem.
  const quitarFoto = () => {
    setFoto(null);
    setPhotoUrl('');
    setErrores((v) => ({ ...v, foto: undefined }));
  };

  const vista = vistaLocal ?? (photoUrl.trim() ? vistaPreviaDeLaFoto ?? photoUrl.trim() : null);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = Number(quantity);
    const nuevosErrores: typeof errores = {};
    if (!name.trim()) nuevosErrores.name = t('inmobiliaria.acta.itemDialog.nameRequired');
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) {
      nuevosErrores.quantity = t('inmobiliaria.acta.itemDialog.quantityInvalid');
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    onGuardar(
      {
        id: item?.id ?? nuevoId(),
        name: name.trim().slice(0, 120),
        quantity: cantidad,
        condition,
        ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
        ...(photoUrl.trim()
          ? { photoUrl: photoUrl.trim().slice(0, LARGO_MAXIMO_DE_LA_URL_DE_LA_FOTO) }
          : {}),
        ...(conEspacio && espacio.trim() ? { espacio: espacio.trim().slice(0, 80) } : {}),
      },
      foto,
    );
  };

  return (
    <Cajon
      abierto={abierto}
      onOpenChange={(o) => !o && !guardando && onCerrar()}
      tamano="sm"
      data-testid="inventario-item-dialog"
    >
      <CajonCabecera
        titulo={item ? t('inmobiliaria.acta.itemDialog.titleEdit') : t('inmobiliaria.acta.itemDialog.titleNew')}
        descripcion={t('inmobiliaria.acta.itemDialog.subtitle')}
      />
      {/* `contents`: el cuerpo y el pie siguen siendo hijos de la columna del
          cajón y el botón del pie es el `submit` del formulario. */}
      <form id={ID_DEL_FORMULARIO} onSubmit={enviar} className="contents" noValidate>
        <CajonCuerpo className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="inv-name" className="text-sm font-medium text-fg">
              {t('inmobiliaria.acta.itemDialog.name')} <span className="text-danger">*</span>
            </label>
            <Input
              id="inv-name"
              aria-required="true"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inmobiliaria.acta.itemDialog.namePlaceholder')}
              maxLength={120}
              autoFocus
            />
            {errores.name && <p className="text-caption text-danger">{errores.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="inv-qty" className="text-sm font-medium text-fg">
                {t('inmobiliaria.acta.itemDialog.quantity')} <span className="text-danger">*</span>
              </label>
              <Input
                id="inv-qty"
                aria-required="true"
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errores.quantity && <p className="text-caption text-danger">{errores.quantity}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg">{t('inmobiliaria.acta.itemDialog.condition')}</label>
              <Select value={condition} onValueChange={(v) => setCondition(v as InventoryItem['condition'])}>
                <SelectTrigger data-testid="inventario-condicion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICIONES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(CONDICION_LABEL_KEY[c])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {conEspacio && (
            <div className="space-y-1.5">
              <label htmlFor="inv-espacio" className="text-sm font-medium text-fg">
                {t('inmobiliaria.inventarioDelInmueble.espacio')}
              </label>
              <Input
                id="inv-espacio"
                value={espacio}
                onChange={(e) => setEspacio(e.target.value)}
                placeholder={t('inmobiliaria.inventarioDelInmueble.espacioPlaceholder')}
                maxLength={80}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="inv-notes" className="text-sm font-medium text-fg">
              {t('inmobiliaria.acta.itemDialog.notes')}
            </label>
            <textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inmobiliaria.acta.itemDialog.notesPlaceholder')}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-fg">{t('inmobiliaria.acta.itemDialog.photo')}</span>
            {/* Dos entradas: la cámara (`capture` abre la trasera del teléfono
                directo) y el selector de archivos (galería del celular o
                carpeta del computador). En escritorio también se suelta aquí. */}
            <input
              ref={entradaDeFoto}
              id="inv-foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={elegirFoto}
              data-testid="inventario-foto-archivo"
            />
            <input
              ref={entradaDeImagen}
              id="inv-imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={elegirFoto}
              data-testid="inventario-foto-adjuntar-archivo"
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltar}
              className={cn(
                'flex flex-col gap-3 rounded-[16px] border border-dashed p-3 transition-colors sm:flex-row sm:items-center',
                arrastrando ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-muted',
              )}
              data-testid="inventario-foto-zona"
            >
              {vista ? (
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[12px] bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element -- la foto todavía no está subida: es una URL de objeto local */}
                  <img
                    src={vista}
                    alt={t('inmobiliaria.acta.itemDialog.photo')}
                    className="h-full w-full object-cover"
                    data-testid="inventario-foto-vista"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[12px] bg-surface text-fg-subtle">
                  <ImageSquare className="h-7 w-7" aria-hidden />
                </div>
              )}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => entradaDeFoto.current?.click()}
                    data-testid="inventario-foto-tomar"
                  >
                    <Camera className="h-4 w-4" aria-hidden />
                    {t('inmobiliaria.acta.itemDialog.photoTake')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => entradaDeImagen.current?.click()}
                    data-testid="inventario-foto-adjuntar"
                  >
                    <ImageSquare className="h-4 w-4" aria-hidden />
                    {vista ? t('inmobiliaria.acta.itemDialog.photoChange') : t('inmobiliaria.acta.itemDialog.photoAttach')}
                  </Button>
                  {vista && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      hideArrow
                      onClick={quitarFoto}
                      data-testid="inventario-foto-quitar"
                    >
                      <Trash className="h-4 w-4" aria-hidden />
                      {t('inmobiliaria.acta.itemDialog.photoRemove')}
                    </Button>
                  )}
                </div>
                <p className="hidden text-caption text-fg-muted md:block">{t('inmobiliaria.acta.itemDialog.photoDrop')}</p>
              </div>
            </div>
            {errores.foto && <p className="text-caption text-danger">{errores.foto}</p>}
            <p className="text-caption text-fg-muted">{t('inmobiliaria.acta.itemDialog.photoHelp')}</p>
          </div>
        </CajonCuerpo>

        <CajonPie>
          <Button type="button" variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
            {t('inmobiliaria.acta.itemDialog.cancel')}
          </Button>
          <Button type="submit" hideArrow isLoading={guardando} data-testid="inventario-item-guardar">
            {item ? t('inmobiliaria.acta.itemDialog.save') : t('inmobiliaria.acta.itemDialog.saveNew')}
          </Button>
        </CajonPie>
      </form>
    </Cajon>
  );
}

const ID_DEL_FORMULARIO = 'form-inventario-item';
