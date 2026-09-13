'use client';

/**
 * El inventario del inmueble, llenado sin señal.
 *
 * 🔴 Nico, 2026-09-12: «la parte de agregar inventario debería de funcionar
 * offline porque hay muchos apartamentos donde no hay señal. Entonces la
 * persona que está haciendo todo ese tema del inventario debería poder
 * agregar todo sin señal y que ya después, cuando tenga señal, la cargue y se
 * actualice en el contrato y también en el inmueble».
 *
 * La regla es una sola y vale con señal y sin ella: **cada cambio cae primero
 * en el teléfono**, y el back es el segundo paso. Con señal la subida arranca
 * sola y la pantalla se siente igual que antes («se guardó»); sin señal, o si
 * la subida falla, el borrador queda y aparece la barra con «Subir
 * inventario». Nada se pierde por cerrar la pestaña, quedarse sin batería ni
 * bajar al sótano.
 *
 * El borrador se borra SÓLO cuando el back confirmó todo — ver
 * `subir-borrador.ts`.
 *
 * ⚠️ **Lo que esto NO cubre**: entrar a la pantalla ya estando sin señal. El
 * caso que sí resuelve —y es el que Nico describió— es «entré con señal y la
 * perdí adentro»: una vez cargada la pantalla, todo sigue funcionando sin red.
 * Para abrirla desde cero sin señal harían falta dos cosas que NO están acá:
 * un service worker que cachee la ruta y sus chunks, y una copia local de la
 * consignación (sin ella la ficha carga vacía aunque el HTML sí llegue).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import {
  almacenDeBorradores,
  tienePendientes,
  type BorradorDeInventario,
} from '@/lib/inventario/borrador-de-inventario';
import { haySenal } from '@/lib/inventario/hay-senal';
import { subirBorrador, type AvanceDeSubida } from '@/lib/inventario/subir-borrador';
import type { Consignacion, InventoryItem } from '@/lib/types/inmobiliaria';

interface Opciones {
  consignacionId: string | undefined;
  /** El inventario tal como lo tiene el back ahora. */
  itemsDelBack: InventoryItem[] | undefined;
  /** Desde qué contrato se abrió, si se abrió desde uno. */
  contratoId?: string;
  /** Para refrescar la ficha cuando la subida termina. */
  alSubir?: (consignacion: Consignacion) => void;
}

export interface EstadoDelBorrador {
  /** Lo que la tabla tiene que mostrar: el borrador si hay, el back si no. */
  items: InventoryItem[];
  /** Fotos todavía sin subir, como URL de objeto, para previsualizarlas. */
  vistasPrevias: Record<string, string>;
  hayPendientes: boolean;
  actualizadoEn: number | null;
  fotosSinSubir: number;
  /** `null` = todavía no se sabe; se resuelve al montar y al volver la red. */
  senal: boolean | null;
  subiendo: boolean;
  avance: AvanceDeSubida | null;
  guardarItem: (item: InventoryItem, foto?: Blob | null) => Promise<void>;
  quitarItem: (item: InventoryItem) => Promise<void>;
  subir: () => Promise<void>;
  descartar: () => Promise<void>;
  /** Último error de subida, para decirlo en la barra en vez de esconderlo. */
  errorDeSubida: string | null;
}

export function useBorradorDeInventario({
  consignacionId,
  itemsDelBack,
  contratoId,
  alSubir,
}: Opciones): EstadoDelBorrador {
  const [borrador, setBorrador] = useState<BorradorDeInventario | null>(null);
  const [senal, setSenal] = useState<boolean | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [avance, setAvance] = useState<AvanceDeSubida | null>(null);
  const [errorDeSubida, setErrorDeSubida] = useState<string | null>(null);
  const [vistasPrevias, setVistasPrevias] = useState<Record<string, string>>({});
  const subiendoRef = useRef(false);

  // Al entrar a la pantalla: ¿quedó algo sin subir de la última vez?
  useEffect(() => {
    if (!consignacionId) return;
    let vivo = true;
    void almacenDeBorradores()
      .leer(consignacionId)
      .then((b) => {
        if (vivo) setBorrador(b);
      })
      .catch(() => {
        /* Sin borrador guardado se trabaja igual, sobre lo del back. */
      });
    return () => {
      vivo = false;
    };
  }, [consignacionId]);

  // Las URL de objeto de las fotos pendientes, para que la tabla las muestre
  // sin haberlas subido. Se revocan al cambiar: si no, cada foto nueva deja
  // la anterior colgada en memoria.
  useEffect(() => {
    const fotos = borrador?.fotos ?? {};
    const urls: Record<string, string> = {};
    for (const [itemId, blob] of Object.entries(fotos)) {
      urls[itemId] = URL.createObjectURL(blob);
    }
    setVistasPrevias(urls);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [borrador]);

  const revisarSenal = useCallback(async () => {
    const hay = await haySenal();
    setSenal(hay);
    return hay;
  }, []);

  // La señal se mide al entrar y cada vez que el navegador dice que cambió.
  // `online`/`offline` solos no alcanzan (mienten), pero sí son el aviso de
  // que vale la pena volver a preguntar.
  useEffect(() => {
    void revisarSenal();
    const alCambiar = () => void revisarSenal();
    window.addEventListener('online', alCambiar);
    window.addEventListener('offline', alCambiar);
    return () => {
      window.removeEventListener('online', alCambiar);
      window.removeEventListener('offline', alCambiar);
    };
  }, [revisarSenal]);

  const subirAhora = useCallback(
    async (deBorrador: BorradorDeInventario) => {
      if (subiendoRef.current) return;
      subiendoRef.current = true;
      setSubiendo(true);
      setErrorDeSubida(null);
      const almacen = almacenDeBorradores();
      try {
        await subirBorrador({
          borrador: deBorrador,
          subirFoto: (id, itemId, foto) =>
            consignacionesApi.subirFotoDeInventario(id, itemId, foto),
          guardarInventario: async (id, items) => {
            const actualizada = await consignacionesApi.actualizarInventario(id, items);
            alSubir?.(actualizada);
          },
          guardarBorrador: (b) => almacen.guardar(b),
          borrarBorrador: (id) => almacen.borrar(id),
          alAvanzar: setAvance,
        });
        setBorrador(null);
        setSenal(true);
      } catch (err) {
        // El borrador sigue en el teléfono: lo que falló es la subida, no el
        // trabajo. Se vuelve a leer porque las fotos que SÍ subieron ya no
        // están pendientes.
        const quedo = await almacen.leer(deBorrador.consignacionId);
        setBorrador(quedo);
        setErrorDeSubida(err instanceof Error ? err.message : 'No se pudo subir');
        await revisarSenal();
      } finally {
        setAvance(null);
        setSubiendo(false);
        subiendoRef.current = false;
      }
    },
    [alSubir, revisarSenal],
  );

  /** Guardar en el teléfono y, si hay señal, subir en el mismo gesto. */
  const guardarYSubirSiSePuede = useCallback(
    async (siguiente: BorradorDeInventario) => {
      await almacenDeBorradores().guardar(siguiente);
      setBorrador(siguiente);
      if (await haySenal()) {
        setSenal(true);
        await subirAhora(siguiente);
      } else {
        setSenal(false);
      }
    },
    [subirAhora],
  );

  const baseDeItems = useCallback(
    () => borrador?.items ?? itemsDelBack ?? [],
    [borrador, itemsDelBack],
  );

  const guardarItem = useCallback(
    async (item: InventoryItem, foto?: Blob | null) => {
      if (!consignacionId) return;
      const actuales = baseDeItems();
      const existe = actuales.some((i) => i.id === item.id);
      const items = existe
        ? actuales.map((i) => (i.id === item.id ? item : i))
        : [...actuales, item];
      const fotos = { ...(borrador?.fotos ?? {}) };
      if (foto) fotos[item.id] = foto;
      await guardarYSubirSiSePuede({
        consignacionId,
        contratoId,
        items,
        fotos,
        actualizadoEn: Date.now(),
      });
    },
    [baseDeItems, borrador?.fotos, consignacionId, contratoId, guardarYSubirSiSePuede],
  );

  const quitarItem = useCallback(
    async (item: InventoryItem) => {
      if (!consignacionId) return;
      const { [item.id]: _, ...fotos } = borrador?.fotos ?? {};
      await guardarYSubirSiSePuede({
        consignacionId,
        contratoId,
        items: baseDeItems().filter((i) => i.id !== item.id),
        fotos,
        actualizadoEn: Date.now(),
      });
    },
    [baseDeItems, borrador?.fotos, consignacionId, contratoId, guardarYSubirSiSePuede],
  );

  const subir = useCallback(async () => {
    if (!borrador) return;
    if (!(await revisarSenal())) return;
    await subirAhora(borrador);
  }, [borrador, revisarSenal, subirAhora]);

  const descartar = useCallback(async () => {
    if (!consignacionId) return;
    await almacenDeBorradores().borrar(consignacionId);
    setBorrador(null);
    setErrorDeSubida(null);
  }, [consignacionId]);

  const hayPendientes = borrador ? tienePendientes(borrador, itemsDelBack) : false;

  return {
    items: borrador?.items ?? itemsDelBack ?? [],
    vistasPrevias,
    hayPendientes,
    actualizadoEn: borrador?.actualizadoEn ?? null,
    fotosSinSubir: Object.keys(borrador?.fotos ?? {}).length,
    senal,
    subiendo,
    avance,
    guardarItem,
    quitarItem,
    subir,
    descartar,
    errorDeSubida,
  };
}
