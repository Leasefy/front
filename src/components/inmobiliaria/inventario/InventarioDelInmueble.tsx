'use client';

/**
 * El inventario del inmueble, por versiones, en su ficha.
 *
 * 🔴 Nico y Juan Camilo, 2026-09-16: «el asesor no hace el inventario cuando
 * el contrato ya está activo, lo hace sobre la propiedad». Acá se llena (con o
 * sin señal), se COMPLETA —desde ahí la versión queda fija y es la que se
 * lleva el próximo contrato— y se ve el historial. Si un contrato terminó
 * después del último completo, la ficha lo dice: «Inventario por actualizar
 * tras el contrato N».
 *
 * Sin la migración del back (`disponible: false`), o si no se pudo preguntar y
 * no hay copia en este teléfono, monta la tarjeta de siempre
 * (`InventarioDeLaConsignacion`): nada deja de funcionar.
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from '@phosphor-icons/react';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { BarraDeBorradorDeInventario } from '@/components/inmobiliaria/BarraDeBorradorDeInventario';
import { InventarioDeLaConsignacion } from '@/components/inmobiliaria/InventarioDeLaConsignacion';
import {
  InventarioItemDialog,
  type ItemDeInventarioBorrador,
} from '@/components/inmobiliaria/InventarioItemDialog';
import { PrepararParaSinSenal } from '@/components/inmobiliaria/PrepararParaSinSenal';
import { HistorialDeVersiones } from '@/components/inmobiliaria/inventario/HistorialDeVersiones';
import { inventarioDelInmuebleApi } from '@/lib/api/inventario-del-inmueble.service';
import {
  useBorradorDeInventario,
  type DestinoDelBorrador,
} from '@/lib/hooks/use-borrador-de-inventario';
import type { EstadoDeLaCopia } from '@/lib/hooks/use-copia-de-inmueble';
import {
  useInventariosDelInmueble,
  type EstadoDeLosInventarios,
} from '@/lib/hooks/use-inventarios-del-inmueble';
import { useI18n } from '@/lib/i18n';
import { avisoDeVigencia } from '@/lib/inventario/aviso-de-vigencia';
import type { Consignacion, InventoryItem } from '@/lib/types/inmobiliaria';
import type { InventariosDelInmueble } from '@/lib/types/inventario-del-inmueble';

const B = 'inmobiliaria.inventarioDelInmueble';

interface Props {
  consignacion: Pick<Consignacion, 'id' | 'contractDate' | 'inventoryItems'>;
  puedeEditar: boolean;
  copiaLocal?: EstadoDeLaCopia;
  sinSenal?: boolean;
  /** Sólo para la tarjeta de siempre (sin la migración). */
  onActualizada?: (consignacion: Consignacion) => void;
}

export function InventarioDelInmueble(props: Props) {
  const { t } = useI18n();
  const inventarios = useInventariosDelInmueble(props.consignacion.id);

  if (inventarios.cargando && !inventarios.datos) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground" role="status">
        {t(`${B}.cargando`)}
      </p>
    );
  }

  const datos = inventarios.datos;
  if (!datos || !datos.disponible) {
    return (
      <div className="space-y-2" id="inventario" data-testid="inventario-sin-versiones">
        {/* 🔴 La nota va DEBAJO (Nico, 18-09-2026). Arriba separaba «Trabajar
            sin señal» de la tarjeta del inventario —que es a lo que pertenece,
            porque es la copia de ESE inventario para llevárselo a la visita— y
            además abría la pantalla con una aclaración técnica en vez de con el
            inventario, que es a lo que la persona vino. */}
        <InventarioDeLaConsignacion
          consignacion={props.consignacion}
          puedeEditar={props.puedeEditar}
          copiaLocal={props.copiaLocal}
          sinSenal={props.sinSenal}
          onActualizada={props.onActualizada}
        />
        {datos && !datos.disponible && (
          <p className="px-1 text-xs text-muted-foreground" data-testid="nota-de-inventario">
            {t(`${B}.migracionPendiente`)}
          </p>
        )}
      </div>
    );
  }

  return <InventarioPorVersiones {...props} datos={datos} inventarios={inventarios} />;
}

function InventarioPorVersiones({
  consignacion,
  puedeEditar,
  copiaLocal,
  sinSenal = false,
  datos,
  inventarios,
}: Props & { datos: InventariosDelInmueble; inventarios: EstadoDeLosInventarios }) {
  const { t } = useI18n();
  const router = useRouter();
  const [itemAbierto, setItemAbierto] = useState<InventoryItem | null | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);
  const [completando, setCompletando] = useState(false);
  const { reemplazar } = inventarios;

  const destino = useMemo<DestinoDelBorrador>(
    () => ({
      subirFoto: (id, itemId, foto) => inventarioDelInmuebleApi.subirFotoDelBorrador(id, itemId, foto),
      guardar: async (id, items) => {
        reemplazar(await inventarioDelInmuebleApi.guardarBorrador(id, items));
      },
    }),
    [reemplazar],
  );

  // Lo que muestra la tabla cuando no hay nada local: el borrador del back, o
  // el último completo (editarlo abre la versión siguiente partiendo de él).
  const itemsDelBack = datos.borrador?.items ?? datos.ultimoCompleto?.items ?? [];
  const borradorLocal = useBorradorDeInventario({
    consignacionId: consignacion.id,
    destino,
    itemsDelBack,
  });

  const items = useMemo(
    () =>
      [...borradorLocal.items]
        // Los del mismo espacio, juntos; sin espacio, al final y en su orden.
        .map((item, i) => ({ item, i }))
        .sort((a, b) => {
          const ea = a.item.espacio ?? '￿';
          const eb = b.item.espacio ?? '￿';
          return ea === eb ? a.i - b.i : ea.localeCompare(eb, 'es');
        })
        .map(({ item }) =>
          borradorLocal.vistasPrevias[item.id]
            ? { ...item, photoUrl: borradorLocal.vistasPrevias[item.id] }
            : item,
        ),
    [borradorLocal.items, borradorLocal.vistasPrevias],
  );

  const guardarItem = useCallback(
    (item: ItemDeInventarioBorrador, foto?: Blob | null) => {
      const completo = { ...item, id: item.id ?? `it-${Date.now()}` } as InventoryItem;
      setGuardando(true);
      void borradorLocal
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
    [borradorLocal, t],
  );

  const quitarItem = useCallback(
    (item: InventoryItem) => {
      void borradorLocal
        .quitarItem(item)
        .then(() => toast.success(t('inmobiliaria.acta.itemDialog.removed')))
        .catch((err: unknown) => {
          toast.error(t('inmobiliaria.acta.itemDialog.error'), {
            description: err instanceof Error ? err.message : undefined,
          });
        });
    },
    [borradorLocal, t],
  );

  const completar = useCallback(async () => {
    setCompletando(true);
    try {
      const nuevos = await inventarioDelInmuebleApi.completar(consignacion.id);
      reemplazar(nuevos);
      toast.success(t(`${B}.completado`, { version: nuevos.ultimoCompleto?.version ?? '' }));
    } catch (err) {
      toast.error(t(`${B}.errorAlCompletar`), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCompletando(false);
    }
  }, [consignacion.id, reemplazar, t]);

  const aviso = avisoDeVigencia(datos.vigencia);
  const borrador = datos.borrador;
  const encabezado = borrador
    ? t(`${B}.borradorDeVersion`, { version: borrador.version })
    : datos.ultimoCompleto
      ? t(`${B}.versionCompleta`, { version: datos.ultimoCompleto.version })
      : t(`${B}.sinVersiones`);

  // Completar exige: un borrador en el back, nada pendiente en el teléfono
  // (lo que no subió no estaría en la versión que queda fija) y al menos un
  // ítem. Sin señal tampoco: el cierre lo hace el back.
  const motivoParaNoCompletar = !borrador
    ? null
    : borradorLocal.hayPendientes || borradorLocal.subiendo
      ? t(`${B}.completarSubePrimero`)
      : borrador.items.length === 0
        ? t(`${B}.completarSinItems`)
        : null;
  const puedeCompletar =
    puedeEditar && !!borrador && !motivoParaNoCompletar && !inventarios.desdeCache && !sinSenal;

  return (
    <div className="space-y-3" id="inventario" data-testid="inventario-del-inmueble">
      {inventarios.desdeCache && (
        <p className="text-xs text-muted-foreground" role="status">
          {t(`${B}.desdeCache`)}
        </p>
      )}

      {aviso && (
        <AlertaAccionable
          severidad={aviso.severidad}
          titulo={t(aviso.titulo.clave, aviso.titulo.params)}
          data-testid={`aviso-inventario-${aviso.severidad}`}
        >
          {aviso.texto && <p>{t(aviso.texto.clave, aviso.texto.params)}</p>}
        </AlertaAccionable>
      )}

      {copiaLocal && (
        <PrepararParaSinSenal
          guardadoEn={copiaLocal.guardadoEn}
          preparando={copiaLocal.preparando}
          ultimaPreparacion={copiaLocal.ultimaPreparacion}
          sinSenal={sinSenal}
          onPreparar={() => void copiaLocal.preparar()}
        />
      )}

      {puedeEditar && (
        <BarraDeBorradorDeInventario
          hayPendientes={borradorLocal.hayPendientes}
          actualizadoEn={borradorLocal.actualizadoEn}
          fotosSinSubir={borradorLocal.fotosSinSubir}
          senal={borradorLocal.senal}
          subiendo={borradorLocal.subiendo}
          avance={borradorLocal.avance}
          errorDeSubida={borradorLocal.errorDeSubida}
          onSubir={() => void borradorLocal.subir()}
          onDescartar={() => void borradorLocal.descartar()}
        />
      )}

      <p className="text-sm font-medium text-foreground" data-testid="encabezado-de-version">
        {encabezado}
      </p>

      <ActaEntregaView
        inventoryItems={items}
        contractDate={borrador?.updatedAt ?? datos.ultimoCompleto?.completadoEn ?? consignacion.contractDate}
        onPrint={() => router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}/acta`)}
        onAddItem={puedeEditar ? () => setItemAbierto(null) : undefined}
        onEditItem={puedeEditar ? (item) => setItemAbierto(item) : undefined}
        onDeleteItem={puedeEditar ? quitarItem : undefined}
      />

      {puedeEditar && borrador && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4" data-testid="completar-inventario">
          <p className="text-sm text-muted-foreground">{t(`${B}.completarAyuda`)}</p>
          {motivoParaNoCompletar && <p className="text-sm text-warning">{motivoParaNoCompletar}</p>}
          <Button
            onClick={() => void completar()}
            disabled={!puedeCompletar || completando}
            data-testid="completar-inventario-boton"
          >
            <CheckCircle className="mr-2 h-4 w-4" aria-hidden />
            {completando ? t(`${B}.completando`) : t(`${B}.completar`)}
          </Button>
        </div>
      )}

      <HistorialDeVersiones versiones={datos.versiones} />

      {puedeEditar && (
        <InventarioItemDialog
          abierto={itemAbierto !== undefined}
          item={itemAbierto ?? null}
          guardando={guardando}
          vistaPreviaDeLaFoto={itemAbierto ? borradorLocal.vistasPrevias[itemAbierto.id] : undefined}
          onCerrar={() => setItemAbierto(undefined)}
          onGuardar={guardarItem}
          conEspacio
        />
      )}
    </div>
  );
}

export default InventarioDelInmueble;
