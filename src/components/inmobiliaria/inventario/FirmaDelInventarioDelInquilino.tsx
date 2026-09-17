'use client';

/**
 * Portal del inquilino: firma el inventario con el que arranca su contrato.
 *
 * 🔴 Nico, 2026-09-17: firma electrónica del INQUILINO al iniciar el
 * contrato, con el mecanismo que ya existe. Es el MISMO `SignatureForm` de la
 * firma del contrato —el mismo trazo y el mismo código de verificación, que el
 * inquilino pide con su botón— con palabras que dicen que se firma el
 * inventario. La firma no bloquea nada: si no firma, queda pendiente y la
 * inmobiliaria lo ve en la ficha del contrato.
 *
 * No pinta nada si no hay qué firmar (sin la migración del back, o un contrato
 * sin copia del inventario).
 */
import { useEffect, useState } from 'react';
import { SignatureForm, type SignaturePayload } from '@/components/contract/SignatureForm';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { toast } from '@/components/ui/toast';
import { inventarioDelInmuebleApi } from '@/lib/api/inventario-del-inmueble.service';
import { useI18n } from '@/lib/i18n';
import { instanteLegible } from '@/lib/inventario/bloqueo-por-inventario';
import type { InventarioParaElInquilino } from '@/lib/types/inventario-del-inmueble';

const B = 'inmobiliaria.inventarioDelInmueble';

export function FirmaDelInventarioDelInquilino({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  const [datos, setDatos] = useState<InventarioParaElInquilino | null>(null);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    let vivo = true;
    inventarioDelInmuebleApi
      .inventarioParaFirmar(contractId)
      .then((r) => {
        if (vivo) setDatos(r);
      })
      .catch(() => {
        /* Sin respuesta no se muestra: firmar el inventario no bloquea nada. */
      });
    return () => {
      vivo = false;
    };
  }, [contractId]);

  if (!datos?.disponible || !datos.copia) return null;

  const firmado = datos.firma?.estado === 'FIRMADO';

  const firmar = async ({ signatureData, otpVerificationToken }: SignaturePayload) => {
    setFirmando(true);
    try {
      const r = await inventarioDelInmuebleApi.firmarInventario(contractId, {
        acceptedTerms: true,
        consentText: t(`${B}.firmaAceptacion`),
        signatureData,
        otpVerificationToken,
      });
      setDatos(r);
      toast.success(t(`${B}.firmaExito`));
    } catch (err) {
      toast.error(t(`${B}.firmaError`), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setFirmando(false);
    }
  };

  return (
    <section className="space-y-4" data-testid="firma-del-inventario-del-inquilino">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">{t(`${B}.firmaInquilinoTitulo`)}</h2>
        <p className="text-sm text-fg-muted">
          {t(`${B}.firmaInquilinoAyuda`, { version: datos.copia.version })}
        </p>
      </div>

      <ActaEntregaView inventoryItems={datos.copia.items} contractDate={datos.copia.completadoEn} />

      {firmado && datos.firma ? (
        <p className="text-sm text-success" data-testid="inventario-firmado">
          {t(`${B}.firmadoPor`, {
            nombre: datos.firma.firmadoPor ?? '',
            fecha: instanteLegible(datos.firma.firmadoEn),
          })}
        </p>
      ) : (
        <SignatureForm
          onSign={(p) => void firmar(p)}
          contractId={contractId}
          isLandlord={false}
          isLoading={firmando}
          requireOTP
          textos={{
            firmado: t(`${B}.firmaHecha`),
            aceptacion: t(`${B}.firmaAceptacion`),
            boton: t(`${B}.firmaBoton`),
          }}
        />
      )}
    </section>
  );
}

export default FirmaDelInventarioDelInquilino;
