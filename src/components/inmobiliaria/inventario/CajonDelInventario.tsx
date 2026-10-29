'use client';

/**
 * El inventario del inmueble ENTERO en un cajón: verlo, agregar, editar,
 * quitar y completarlo sin salir de donde se está.
 *
 * 🔴 Nico (reunión con Portofino, 29-10-2026): desde «Nuevo contrato»,
 * «Hacer el inventario» llevaba a la ficha del inmueble (y a Multimedia, no
 * al inventario) y al volver el formulario estaba en blanco. Ahora el
 * inventario pasa aquí, encima del formulario: se cierra y todo lo que se
 * llevaba del contrato sigue ahí. Es la MISMA pieza de la ficha
 * (`InventarioDelInmueble`, con su cajón para cada ítem), así que no hay dos
 * inventarios que se desincronicen.
 */
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { InventarioDelInmueble } from '@/components/inmobiliaria/inventario/InventarioDelInmueble';
import { useConsignacion } from '@/lib/hooks/useInmobiliaria';
import { usePuedeEditarInventario } from '@/lib/hooks/use-puede-editar-inventario';
import { useI18n } from '@/lib/i18n';

const B = 'inmobiliaria.inventarioDelInmueble';

export function CajonDelInventario({
  abierto,
  consignacionId,
  onCerrar,
  textoDeVolver,
}: {
  abierto: boolean;
  /** La consignación dueña del inventario (la del inmueble elegido). */
  consignacionId: string | null;
  /** Al cerrar, quien lo abrió vuelve a preguntar si ya se puede seguir. */
  onCerrar: () => void;
  /** «Volver al contrato»: lo que dice el botón del pie. */
  textoDeVolver?: string;
}) {
  const { t } = useI18n();
  const puedeEditar = usePuedeEditarInventario();
  // Se pide sólo con el cajón abierto: el formulario no paga la consulta si nadie lo abre.
  const { consignacion } = useConsignacion(abierto && consignacionId ? consignacionId : undefined);

  return (
    <Cajon abierto={abierto} onOpenChange={(o) => !o && onCerrar()} tamano="lg" data-testid="cajon-del-inventario">
      <CajonCabecera titulo={t(`${B}.titulo`)} descripcion={t(`${B}.cajonDescripcion`)} />
      <CajonCuerpo className="space-y-4">
        {consignacion ? (
          <InventarioDelInmueble consignacion={consignacion} puedeEditar={puedeEditar} />
        ) : (
          <p className="text-body-sm text-fg-muted" role="status">
            {t(`${B}.cargando`)}
          </p>
        )}
      </CajonCuerpo>
      <CajonPie ayuda={t(`${B}.cajonAyuda`)}>
        <Button type="button" variant="secondary" hideArrow onClick={onCerrar} data-testid="cajon-del-inventario-volver">
          {textoDeVolver ?? t(`${B}.volverAlContrato`)}
        </Button>
      </CajonPie>
    </Cajon>
  );
}

export default CajonDelInventario;
