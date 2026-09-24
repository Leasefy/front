'use client';

/**
 * «Mi paz y salvo», en el portal del inquilino.
 *
 * Reemplaza dos tarjetas que decían «Próximamente» sobre un endpoint que no
 * existía (ver `lib/api/lease-documents.service.ts`, que era un contrato sin
 * back). Ahora hay back, y la pantalla hace lo que el pedido del CEO llamaba
 * «automático»: si el libro dice que no se debe nada, el papel sale solo.
 *
 * Tres decisiones de presentación, todas por la misma razón:
 *
 *  1. **Un renglón por contrato**, no un botón suelto. Una persona puede tener
 *     dos contratos con la misma inmobiliaria, uno terminado y otro vigente, y
 *     cada uno lleva un documento distinto.
 *  2. **El nombre del documento sale del estado del contrato**, no de un
 *     selector. Un cliente que elige entre «paz y salvo» y «estar al día»
 *     elige mal la mitad de las veces y se lleva un no.
 *  3. **Cuando no se puede, se dice por qué ANTES de tocar el botón.** El back
 *     devuelve todos los motivos juntos; acá se imprimen tal cual. Un botón
 *     que sólo responde «no se puede» después de apretarlo no es una respuesta.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Certificate, Download, WarningCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EmptyState } from '@/components/ui/empty-state';
import {
  leaseDocumentsApi,
  type CertificadoDisponible,
  type TipoDeCertificado,
} from '@/lib/api/lease-documents.service';

const NOMBRE_DEL_CERTIFICADO: Record<TipoDeCertificado, string> = {
  PAZ_Y_SALVO: 'Paz y salvo',
  CERTIFICADO_ESTAR_AL_DIA: 'Certificado de estar al día',
};

const QUE_CERTIFICA: Record<TipoDeCertificado, string> = {
  PAZ_Y_SALVO:
    'El contrato terminó y no queda nada por pagar. Lo emite tu inmobiliaria contra su estado de cuenta.',
  CERTIFICADO_ESTAR_AL_DIA:
    'El contrato sigue vigente y no tienes nada vencido a la fecha. No es un paz y salvo.',
};

export function MisCertificados() {
  const [contratos, setContratos] = useState<CertificadoDisponible[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [emitiendo, setEmitiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setContratos(await leaseDocumentsApi.disponibles());
    } catch (e) {
      // 🔴 El error ENTERO, no su mensaje: `EstadoDeDatos` necesita el `status`
      // y el `code` para saber si fue el segundo factor, la sesión o nosotros
      // (`lib/errores/el-error-entero-llega-a-la-pantalla.test.ts`).
      setError(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const emitir = useCallback(async (fila: CertificadoDisponible) => {
    setEmitiendo(fila.contractId);
    let url: string | null = null;
    try {
      const { documentoId, tipo } = await leaseDocumentsApi.emitir(fila.contractId);
      const blob = await leaseDocumentsApi.pdf(documentoId);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${NOMBRE_DEL_CERTIFICADO[tipo].toLowerCase().replace(/ /g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`${NOMBRE_DEL_CERTIFICADO[tipo]} emitido`);
      // El veredicto pudo cambiar (y el documento ya quedó en la inmobiliaria).
      void cargar();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : 'No pudimos emitir el certificado.',
      );
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
      setEmitiendo(null);
    }
  }, [cargar]);

  return (
    <section className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
          <Certificate className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-fg dark:text-white">
            Paz y salvo y certificados
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Los emite tu inmobiliaria contra su estado de cuenta, no se escriben a mano.
            Cuál te corresponde lo decide el estado de cada contrato.
          </p>
        </div>
      </div>

      <EstadoDeDatos
        cargando={contratos === null && !error}
        error={error}
        vacio={contratos !== null && contratos.length === 0}
        queEs="tus certificados"
        onReintentar={cargar}
        cuandoVacio={
          <EmptyState
            icon={Certificate}
            title="Todavía no tienes contratos"
            description="Cuando tengas un contrato con una inmobiliaria en Leasefy, acá vas a poder pedir tu paz y salvo."
          />
        }
      >
        <ul className="space-y-3" data-testid="certificados-del-inquilino">
          {(contratos ?? []).map((fila) => (
            <li
              key={fila.contractId}
              className="rounded-lg border border-border dark:border-border-strong p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg dark:text-white">
                    {fila.tipo ? NOMBRE_DEL_CERTIFICADO[fila.tipo] : 'Sin certificado disponible'}
                  </p>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    Contrato {fila.numero} · {fila.inmueble}
                  </p>
                  <p className="text-xs text-fg-subtle">{fila.agencia.nombre}</p>
                </div>
                {fila.tipo && fila.puedeEmitirse && (
                  <Button
                    variant="secondary"
                    hideArrow
                    isLoading={emitiendo === fila.contractId}
                    disabled={emitiendo !== null}
                    onClick={() => void emitir(fila)}
                  >
                    <Download className="w-4 h-4" />
                    Emitir y descargar
                  </Button>
                )}
              </div>

              {fila.tipo && fila.puedeEmitirse && (
                <p className="flex items-start gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <span>{QUE_CERTIFICA[fila.tipo]}</span>
                </p>
              )}

              {!fila.puedeEmitirse && fila.impedimentos.length > 0 && (
                <ul className="space-y-1.5">
                  {fila.impedimentos.map((i) => (
                    <li
                      key={i.code}
                      className="flex items-start gap-2 text-sm text-fg-muted dark:text-fg-subtle"
                    >
                      <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" />
                      <span>{i.mensaje}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </EstadoDeDatos>
    </section>
  );
}
