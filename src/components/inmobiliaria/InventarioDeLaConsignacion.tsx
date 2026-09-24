'use client';

/**
 * El inventario de un inmueble, entero: la tarjeta, el diálogo de agregar /
 * editar, la barra del borrador sin señal y «Preparar para trabajar sin
 * señal».
 *
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». Hasta ahora todo esto vivía suelto
 * dentro de la página de la ficha del inmueble —estado, handlers, diálogo— y
 * por eso la ficha del contrato sólo podía MOSTRARLO: copiar el flujo entero
 * habría dejado dos inventarios que se desincronizan al primer arreglo.
 *
 * Así que vive acá, y las dos pantallas montan lo MISMO sobre la MISMA
 * consignación: lo que se agrega desde el contrato aparece en el inmueble y al
 * revés, porque es una sola lista (`PUT …/consignaciones/:id/inventario`) y un
 * solo borrador local (llaveado por consignación, no por pantalla).
 *
 * Lo que el componente NO decide:
 *
 *  · **Si se puede editar** (`puedeEditar`). La regla es la misma en las dos
 *    pantallas y vive en `use-puede-editar-inventario.ts`; acá sólo se
 *    obedece: sin permiso, la tarjeta queda de sólo lectura —sin agregar, sin
 *    editar, sin quitar— y no promete nada.
 *  · **Si hay copia local** (`copiaLocal`). La ficha del inmueble ya la
 *    maneja para armarse sin señal, así que se la pasa; quien no la tenga no
 *    muestra el botón de preparar en vez de mostrar uno que no hace nada.
 */

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { BarraDeBorradorDeInventario } from '@/components/inmobiliaria/BarraDeBorradorDeInventario';
import {
  InventarioItemDialog,
  type ItemDeInventarioBorrador,
} from '@/components/inmobiliaria/InventarioItemDialog';
import { PrepararParaSinSenal } from '@/components/inmobiliaria/PrepararParaSinSenal';
import { useBorradorDeInventario } from '@/lib/hooks/use-borrador-de-inventario';
import type { EstadoDeLaCopia } from '@/lib/hooks/use-copia-de-inmueble';
import type { Consignacion, InventoryItem } from '@/lib/types/inmobiliaria';

interface Props {
  /** La consignación dueña del inventario. Es la misma desde las dos fichas. */
  consignacion: Pick<Consignacion, 'id' | 'contractDate' | 'inventoryItems'>;
  /** Sin esto la tarjeta es de sólo lectura. Ver `usePuedeEditarInventario`. */
  puedeEditar: boolean;
  /** Desde qué contrato se abrió, si se abrió desde uno. Viaja al borrador. */
  contratoId?: string;
  /**
   * La copia local del inmueble. Con ella se muestra «Preparar para trabajar
   * sin señal»; sin ella, no.
   */
  copiaLocal?: EstadoDeLaCopia;
  /** `true` cuando el navegador dice que no hay red. */
  sinSenal?: boolean;
  /** La consignación que devolvió el back al subir el borrador. */
  onActualizada?: (consignacion: Consignacion) => void;
  /**
   * «Ver el inmueble →» al lado del título, cuando la tarjeta se abre desde
   * otra ficha (el contrato). Desde la ficha del inmueble no hace falta.
   */
  enlaceAlInmueble?: { href: string; texto?: string; testid?: string };
}

export function InventarioDeLaConsignacion({
  consignacion,
  puedeEditar,
  contratoId,
  copiaLocal,
  sinSenal = false,
  onActualizada,
  enlaceAlInmueble,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  // `undefined` = diálogo cerrado; `null` = agregar; ítem = editar.
  const [itemAbierto, setItemAbierto] = useState<InventoryItem | null | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  /**
   * Cada cambio cae PRIMERO en el teléfono y el back es el segundo paso: con
   * señal la subida arranca sola y se siente igual que antes; sin ella el
   * borrador espera y la barra lo dice. Ver `use-borrador-de-inventario.ts`.
   */
  const inventario = useBorradorDeInventario({
    consignacionId: consignacion.id,
    itemsDelBack: consignacion.inventoryItems,
    contratoId,
    alSubir: onActualizada,
  });

  /**
   * Una foto tomada sin señal todavía no tiene URL, así que la tabla la
   * muestra desde el archivo local. Es sólo para mirar: lo que se guarda en el
   * ítem sigue siendo la URL del back, nunca un `blob:` que muere al recargar.
   */
  const items = useMemo(
    () =>
      inventario.items.map((i) =>
        inventario.vistasPrevias[i.id] ? { ...i, photoUrl: inventario.vistasPrevias[i.id] } : i,
      ),
    [inventario.items, inventario.vistasPrevias],
  );

  const guardarItem = useCallback(
    (item: ItemDeInventarioBorrador, foto?: Blob | null) => {
      const completo = { ...item, id: item.id ?? `it-${Date.now()}` } as InventoryItem;
      setGuardando(true);
      void inventario
        .guardarItem(completo, foto)
        .then(() => {
          setItemAbierto(undefined);
          toast.success(t('inmobiliaria.acta.itemDialog.saved'));
        })
        .catch((err: unknown) => {
          toast.error(t('inmobiliaria.acta.itemDialog.error'), {
            description: err instanceof Error ? err.message : undefined,
          });
        })
        .finally(() => setGuardando(false));
    },
    [inventario, t],
  );

  const quitarItem = useCallback(
    (item: InventoryItem) => {
      void inventario
        .quitarItem(item)
        .then(() => toast.success(t('inmobiliaria.acta.itemDialog.removed')))
        .catch((err: unknown) => {
          toast.error(t('inmobiliaria.acta.itemDialog.error'), {
            description: err instanceof Error ? err.message : undefined,
          });
        });
    },
    [inventario, t],
  );

  return (
    <div className="space-y-2" data-testid="inventario-de-la-consignacion">
      {/* La barra sólo tiene sentido para quien edita: quien mira no tiene
          borrador que subir ni que descartar. */}
      {puedeEditar && (
        <BarraDeBorradorDeInventario
          hayPendientes={inventario.hayPendientes}
          actualizadoEn={inventario.actualizadoEn}
          fotosSinSubir={inventario.fotosSinSubir}
          senal={inventario.senal}
          subiendo={inventario.subiendo}
          avance={inventario.avance}
          errorDeSubida={inventario.errorDeSubida}
          onSubir={() => void inventario.subir()}
          onDescartar={() => void inventario.descartar()}
        />
      )}

      <ActaEntregaView
        /* 🔴 «Trabajar sin señal» va DENTRO de la tarjeta del inventario: es la
           copia de ESE inventario para llevárselo a la visita. Como tarjeta
           aparte flotando encima parecía de otra cosa. */
        franja={
          copiaLocal ? (
            <PrepararParaSinSenal
              guardadoEn={copiaLocal.guardadoEn}
              preparando={copiaLocal.preparando}
              ultimaPreparacion={copiaLocal.ultimaPreparacion}
              sinSenal={sinSenal}
              onPreparar={() => void copiaLocal.preparar()}
              sinMarco
            />
          ) : undefined
        }
        inventoryItems={items}
        contractDate={consignacion.contractDate}
        // Imprimir es la hoja del acta del inmueble, la misma desde las dos
        // pantallas: el acta es del inmueble, no de quién la abrió.
        onPrint={() => router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}/acta`)}
        onAddItem={puedeEditar ? () => setItemAbierto(null) : undefined}
        onEditItem={puedeEditar ? (item) => setItemAbierto(item) : undefined}
        onDeleteItem={puedeEditar ? quitarItem : undefined}
        enlace={
          enlaceAlInmueble
            ? {
                href: enlaceAlInmueble.href,
                texto: enlaceAlInmueble.texto ?? 'Ver el inmueble',
                testid: enlaceAlInmueble.testid,
              }
            : undefined
        }
      />

      {puedeEditar && (
        <InventarioItemDialog
          abierto={itemAbierto !== undefined}
          item={itemAbierto ?? null}
          guardando={guardando}
          vistaPreviaDeLaFoto={itemAbierto ? inventario.vistasPrevias[itemAbierto.id] : undefined}
          onCerrar={() => setItemAbierto(undefined)}
          onGuardar={guardarItem}
        />
      )}
    </div>
  );
}

export default InventarioDeLaConsignacion;
