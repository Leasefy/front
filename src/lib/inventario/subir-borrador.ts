/**
 * Subir el inventario que se llenó sin señal.
 *
 * 🔴 Nico, 2026-09-12: «que ya después, cuando tenga señal, la cargue y se
 * actualice en el contrato y también en el inmueble».
 *
 * El orden importa y no es arbitrario:
 *
 * 1. **Las fotos primero, una por una.** Son lo pesado (hasta 5 MB cada una)
 *    y lo que se corta cuando la señal es de una barra. Cada foto que sube
 *    se anota en su ítem y SALE del borrador, y el borrador se guarda ahí
 *    mismo: si el siguiente pedido falla, lo ya subido no se vuelve a subir.
 * 2. **La lista completa después**, en un solo `PUT`. Reemplaza el inventario
 *    del inmueble, que es lo que ya hacía la pantalla estando con señal.
 * 3. **El borrador se borra al final**, sólo cuando el back confirmó. Un
 *    borrador que se borra antes de la confirmación es una hora de trabajo
 *    perdida por un timeout.
 *
 * **Idempotencia en dos capas**, porque una sola no alcanza: acá sacamos del
 * borrador lo ya subido, y el back guarda cada foto en una ruta que depende
 * sólo del `itemId`, con `upsert`. Si el navegador se cierra justo entre el
 * `POST` que respondió y el `guardar` que no llegó a correr, el reintento
 * pisa la misma foto en vez de dejar dos.
 *
 * Y el inventario queda en los DOS lugares que Nico pidió sin nada extra: vive
 * en la consignación, que es lo que lee la ficha del inmueble y también
 * `InmuebleDelContrato` desde la ficha del contrato.
 */

import type { InventoryItem } from '@/lib/types/inmobiliaria';
import type { BorradorDeInventario } from './borrador-de-inventario';

export interface AvanceDeSubida {
  /** Cuántas fotos ya subieron en esta pasada. */
  fotosSubidas: number;
  /** Cuántas había que subir al empezar. */
  fotosTotales: number;
}

export interface OpcionesDeSubida {
  borrador: BorradorDeInventario;
  /** `POST …/inventario/foto`: devuelve la URL con la que queda guardada. */
  subirFoto: (consignacionId: string, itemId: string, foto: Blob) => Promise<string>;
  /** `PUT …/inventario`: la lista completa. */
  guardarInventario: (consignacionId: string, items: InventoryItem[]) => Promise<void>;
  /** Persistir el borrador a mitad de camino: es lo que evita re-subir. */
  guardarBorrador: (borrador: BorradorDeInventario) => Promise<void>;
  /** Borrarlo, ya con todo confirmado. */
  borrarBorrador: (consignacionId: string) => Promise<void>;
  alAvanzar?: (avance: AvanceDeSubida) => void;
}

export interface ResultadoDeSubida {
  items: InventoryItem[];
  fotosSubidas: number;
}

export async function subirBorrador({
  borrador,
  subirFoto,
  guardarInventario,
  guardarBorrador,
  borrarBorrador,
  alAvanzar,
}: OpcionesDeSubida): Promise<ResultadoDeSubida> {
  const { consignacionId } = borrador;
  const pendientes = Object.keys(borrador.fotos);
  let enCurso: BorradorDeInventario = { ...borrador, fotos: { ...borrador.fotos } };
  let fotosSubidas = 0;

  alAvanzar?.({ fotosSubidas: 0, fotosTotales: pendientes.length });

  for (const itemId of pendientes) {
    const foto = enCurso.fotos[itemId];
    // Una foto de un ítem que ya no está en la lista (lo quitaron después de
    // sacarle la foto) no se sube: ocuparía el cupo de la red por nada.
    if (!foto || !enCurso.items.some((i) => i.id === itemId)) {
      const { [itemId]: _, ...resto } = enCurso.fotos;
      enCurso = { ...enCurso, fotos: resto };
      await guardarBorrador(enCurso);
      continue;
    }

    const photoUrl = await subirFoto(consignacionId, itemId, foto);

    const { [itemId]: _subida, ...resto } = enCurso.fotos;
    enCurso = {
      ...enCurso,
      items: enCurso.items.map((i) => (i.id === itemId ? { ...i, photoUrl } : i)),
      fotos: resto,
      actualizadoEn: Date.now(),
    };
    // Antes de tocar la red otra vez: si el próximo pedido falla, esta foto
    // ya no está pendiente.
    await guardarBorrador(enCurso);
    fotosSubidas += 1;
    alAvanzar?.({ fotosSubidas, fotosTotales: pendientes.length });
  }

  await guardarInventario(consignacionId, enCurso.items);
  await borrarBorrador(consignacionId);
  return { items: enCurso.items, fotosSubidas };
}
