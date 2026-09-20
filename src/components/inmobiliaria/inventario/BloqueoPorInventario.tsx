'use client';

/**
 * «Todavía no puedes iniciar este contrato»: el inmueble no tiene un
 * inventario completo y actualizado. Con enlace a la sección del inventario
 * de su ficha, que es donde se arregla.
 */
import { ClipboardText } from '@phosphor-icons/react';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { useI18n } from '@/lib/i18n';
import {
  enlaceAlInventario,
  type BloqueoPorInventario as Bloqueo,
} from '@/lib/inventario/bloqueo-por-inventario';
import { textoDelBloqueo } from '@/lib/inventario/aviso-de-vigencia';

const B = 'inmobiliaria.inventarioDelInmueble';

export function BloqueoPorInventario({ bloqueo }: { bloqueo: Bloqueo }) {
  const { t } = useI18n();
  const texto = textoDelBloqueo(bloqueo);
  return (
    <AlertaAccionable
      severidad="warning"
      titulo={t(`${B}.bloqueoTitulo`)}
      icon={<ClipboardText className="h-5 w-5" aria-hidden />}
      accion={
        bloqueo.consignacionId
          ? { label: t(`${B}.bloqueoEnlace`), href: enlaceAlInventario(bloqueo.consignacionId) }
          : undefined
      }
      data-testid="bloqueo-por-inventario"
    >
      <p>{t(texto.clave, texto.params)}</p>
      {!bloqueo.consignacionId && <p>{t(`${B}.bloqueoSinEnlace`)}</p>}
    </AlertaAccionable>
  );
}

export default BloqueoPorInventario;
