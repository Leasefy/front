'use client';

/**
 * El inventario con el que se inició el contrato: la COPIA fija, sólo
 * lectura.
 *
 * 🔴 Nico y Juan Camilo, 2026-09-16: «el contrato debe guardar el último
 * inventario con el que se creó y dejarlo así hasta que el contrato
 * finalice». Por eso acá no se edita nada: el inventario se trabaja en la
 * ficha del inmueble. Si el inmueble quedó con el inventario por actualizar
 * (este contrato u otro terminó después del último completo), se dice acá
 * también, con el enlace a donde se hace.
 *
 * Sin la migración del back, o si no se pudo preguntar, se monta lo de
 * siempre (`legado`).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardText } from '@phosphor-icons/react';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { EmptyState } from '@/components/ui/empty-state';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { inventarioDelInmuebleApi } from '@/lib/api/inventario-del-inmueble.service';
import { useI18n } from '@/lib/i18n';
import {
  diaLegible,
  enlaceAlInventario,
  instanteLegible,
  numeroDelContrato,
} from '@/lib/inventario/bloqueo-por-inventario';
import { Badge } from '@/components/ui/badge';
import type { CopiaDelContrato, ResumenDeFirma } from '@/lib/types/inventario-del-inmueble';

const B = 'inmobiliaria.inventarioDelInmueble';

interface Props {
  contratoId: string;
  /** Lo que se monta si el inventario por versiones no está disponible. */
  legado: ReactNode;
}

export function InventarioDelContrato({ contratoId, legado }: Props) {
  const { t } = useI18n();
  const [datos, setDatos] = useState<CopiaDelContrato | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'fallo'>('cargando');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    inventarioDelInmuebleApi
      .copiaDelContrato(contratoId)
      .then((r) => {
        if (!vivo) return;
        setDatos(r);
        setEstado('listo');
      })
      .catch(() => {
        if (vivo) setEstado('fallo');
      });
    return () => {
      vivo = false;
    };
  }, [contratoId]);

  if (estado === 'cargando') {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground" role="status">
        {t(`${B}.cargando`)}
      </p>
    );
  }
  // Sin respuesta (p. ej. sin señal) o sin la migración: lo de siempre.
  if (estado === 'fallo' || !datos?.disponible) return <>{legado}</>;

  const tarea = datos.vigenciaDelInmueble?.porActualizarTras ?? null;
  const enlace = datos.consignacionId ? enlaceAlInventario(datos.consignacionId) : undefined;

  return (
    <div className="space-y-3" data-testid="inventario-del-contrato">
      {tarea && (
        <AlertaAccionable
          severidad="warning"
          titulo={t(`${B}.porActualizarTitulo`, { numero: numeroDelContrato(tarea) })}
          accion={enlace ? { label: t(`${B}.irAlInventario`), href: enlace } : undefined}
          data-testid="tarea-inventario-por-actualizar"
        >
          <p>
            {tarea.contratoId === contratoId
              ? t(`${B}.tareaEsteContrato`, { fecha: diaLegible(tarea.terminoEl) })
              : t(`${B}.porActualizarTexto`, { fecha: diaLegible(tarea.terminoEl) })}
          </p>
        </AlertaAccionable>
      )}

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{t(`${B}.contratoTitulo`)}</h3>
        {datos.copia && (
          <p className="text-xs text-muted-foreground" data-testid="copia-version">
            {t(`${B}.contratoVersion`, {
              version: datos.copia.version,
              fecha: instanteLegible(datos.copia.completadoEn),
            })}
          </p>
        )}
      </div>

      {datos.copia ? (
        <>
          <ActaEntregaView
            inventoryItems={datos.copia.items}
            contractDate={datos.copia.completadoEn}
            enlace={enlace ? { href: enlace, texto: t(`${B}.contratoVerInmueble`), testid: 'ver-el-inmueble' } : undefined}
          />
          {/* 🔴 Nico, 2026-09-17: la firma del inquilino sobre esta copia, con su
              estado. Pendiente no bloquea la activación: sólo se ve. */}
          <FirmaDeLaCopia firma={datos.copia.firmaDelInquilino} />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4" data-testid="contrato-sin-copia">
          <EmptyState
            icon={ClipboardText}
            title={t(`${B}.contratoTitulo`)}
            description={t(`${B}.contratoSinCopia`)}
            action={enlace ? { label: t(`${B}.contratoVerInmueble`), href: enlace } : undefined}
          />
        </div>
      )}
    </div>
  );
}

function FirmaDeLaCopia({ firma }: { firma: ResumenDeFirma | undefined }) {
  const { t } = useI18n();
  const firmado = firma?.estado === 'FIRMADO';
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 space-y-1"
      data-testid="firma-del-inquilino"
      data-estado={firmado ? 'firmado' : 'pendiente'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">{t(`${B}.firmaTitulo`)}</h4>
        <Badge variant={firmado ? 'success' : 'warning'}>
          {t(firmado ? `${B}.estadoFirmado` : `${B}.estadoPendiente`)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {firmado && firma
          ? t(`${B}.firmadoPor`, {
              nombre: firma.firmadoPor ?? firma.correo ?? '',
              fecha: instanteLegible(firma.firmadoEn),
            })
          : t(`${B}.firmaPendiente`)}
      </p>
      {firmado && firma?.integra === false && (
        <p className="text-sm text-danger">{t(`${B}.firmaNoIntegra`)}</p>
      )}
    </div>
  );
}

export default InventarioDelContrato;
