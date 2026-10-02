'use client';

/**
 * Elegir las fotos de una solicitud de mantenimiento (02-10-2026).
 *
 * Vivía dentro de `MantenimientoForm` (las fotos del reporte, al crear). Salió
 * a su archivo porque el cierre de la solicitud también sube fotos —las del
 * trabajo terminado— y tienen que verse y validarse igual: mismo tipo, mismo
 * peso, mismo tope de 30 que el back (`MAX_FOTOS_DEL_MANTENIMIENTO`).
 *
 * Sólo ELIGE: la subida real (`subirFotosDelMantenimiento` →
 * `POST /inmobiliaria/mantenimiento/:id/fotos`) la hace quien lo usa. La vista
 * previa (`blob:`) es sólo para verla acá y nunca sale del navegador.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Camera, X } from '@phosphor-icons/react';
import { IconButton, motionDuration, motionEase } from '@leasefy/cadence';
import {
  MAX_FOTOS_DEL_MANTENIMIENTO,
  TIPOS_DE_FOTO_DEL_MANTENIMIENTO,
} from '@/lib/mantenimiento/limites-del-mantenimiento';

export interface SelectorDeFotosDelMantenimientoProps {
  /** `id` del `<input type="file">` (el `htmlFor` de la etiqueta). */
  id: string;
  etiqueta: React.ReactNode;
  pista?: React.ReactNode;
  /** El texto de la casilla para agregar («Agregar foto»). */
  textoAgregar: string;
  fotos: readonly File[];
  onAgregar: (fotos: File[]) => void;
  onQuitar: (index: number) => void;
  /** El error de las fotos, para marcar el control (el texto va debajo). */
  conError?: boolean;
  /** El `id` del `<ErrorDelCampo>` que lo explica. */
  idDelError?: string;
  /** Mientras se sube: ni agregar ni quitar. */
  deshabilitado?: boolean;
  testIdFoto?: string;
  testIdInput?: string;
}

/**
 * La vista previa de cada foto elegida. Es SÓLO para verla acá: la URL local
 * (`blob:`) nunca sale del navegador, y se libera al quitar la foto o al
 * cerrar el formulario.
 */
function useVistasPrevias(fotos: readonly File[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const creadas = fotos.map((f) => URL.createObjectURL(f));
    setUrls(creadas);
    return () => creadas.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);
  return urls;
}

/** Una llave estable por archivo, para que la salida anime la foto correcta. */
const LLAVES_DE_LAS_FOTOS = new WeakMap<File, string>();
let fotosVistas = 0;
function llaveDeLaFoto(foto: File): string {
  let llave = LLAVES_DE_LAS_FOTOS.get(foto);
  if (!llave) {
    fotosVistas += 1;
    llave = `foto-${fotosVistas}`;
    LLAVES_DE_LAS_FOTOS.set(foto, llave);
  }
  return llave;
}

export function SelectorDeFotosDelMantenimiento({
  id,
  etiqueta,
  pista,
  textoAgregar,
  fotos,
  onAgregar,
  onQuitar,
  conError,
  idDelError,
  deshabilitado,
  testIdFoto = 'mantenimiento-foto',
  testIdInput = 'mantenimiento-foto-input',
}: SelectorDeFotosDelMantenimientoProps) {
  const vistas = useVistasPrevias(fotos);
  const reducido = useReducedMotion();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegidas = Array.from(e.target.files ?? []);
    if (elegidas.length > 0) onAgregar(elegidas);
    e.target.value = '';
  };

  // Entran con un leve crecimiento y salen acelerando; con movimiento
  // reducido, sólo el fundido.
  const entrada = reducido ? { opacity: 0 } : { opacity: 0, scale: 0.94 };
  const salida = reducido
    ? { opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.standard } }
    : { opacity: 0, scale: 0.94, transition: { duration: motionDuration.fast, ease: motionEase.exit } };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {etiqueta}
      </label>
      {pista ? <p className="text-caption text-fg-muted dark:text-fg-subtle">{pista}</p> : null}

      <div className="flex flex-wrap gap-3 mt-3">
        <AnimatePresence initial={false}>
          {fotos.map((foto, index) => (
            <motion.div
              key={llaveDeLaFoto(foto)}
              layout={!reducido}
              initial={entrada}
              animate={{ opacity: 1, scale: 1 }}
              exit={salida}
              transition={{
                duration: motionDuration.base,
                ease: reducido ? motionEase.standard : motionEase.enter,
              }}
              className="relative w-24 h-24 rounded-xl overflow-hidden group"
              data-testid={testIdFoto}
            >
              {vistas[index] ? (
                <img src={vistas[index]} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              ) : null}
              {!deshabilitado && (
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<X className="w-4 h-4" />}
                  onClick={() => onQuitar(index)}
                  aria-label={`Quitar la foto ${index + 1}`}
                  className="absolute top-1 right-1 bg-danger text-white hover:bg-danger/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Agregar: hasta el tope del back (30 por solicitud). */}
        {fotos.length < MAX_FOTOS_DEL_MANTENIMIENTO && !deshabilitado && (
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border dark:border-border-strong flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/30 hover:bg-primary-soft transition-all">
            <Camera className="w-6 h-6 text-fg-subtle" />
            <span className="text-caption text-fg-muted dark:text-fg-subtle">{textoAgregar}</span>
            {/* allowlist: hidden type=file behind a custom camera dropzone tile (playbook hidden/file-input allowlist) */}
            <input
              id={id}
              type="file"
              multiple
              accept={TIPOS_DE_FOTO_DEL_MANTENIMIENTO.join(',')}
              onChange={handleFileChange}
              className="hidden"
              aria-invalid={conError || undefined}
              aria-describedby={conError && idDelError ? idDelError : undefined}
              data-testid={testIdInput}
            />
          </label>
        )}
      </div>
    </div>
  );
}
