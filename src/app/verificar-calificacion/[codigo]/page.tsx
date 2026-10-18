'use client';

/**
 * ¿ESTE CERTIFICADO DE CALIFICACIÓN LEASEFY ES DE VERDAD? Pública, sin sesión.
 *
 * Quien recibe el certificado (sobre todo una inmobiliaria que no está en
 * Leasefy) escribe el código o abre el enlace y ve si es auténtico: el nombre
 * enmascarado, la letra, el veredicto, hasta qué canon y un resumen. Todo lo
 * dice el back (`GET /calificacion-leasefy/verificar/:codigo`); esta página no
 * decide nada.
 */

import { use, useEffect, useState } from 'react';
import { CheckCircle, SealWarning } from '@phosphor-icons/react';

import { LetraDeLaCalificacion } from '@/components/calificacion/TarjetaDeCalificacion';
import { calificacionLeasefyApi, type CertificadoVerificado } from '@/lib/api/calificacion-leasefy.service';
import { formatCurrency } from '@/lib/format';

const MOTIVO: Record<NonNullable<CertificadoVerificado['motivo']>, string> = {
  NO_EXISTE: 'No encontramos un certificado con ese código.',
  SIN_PAGAR: 'Ese certificado todavía no se emitió.',
  VENCIDO: 'Ese certificado ya venció.',
  REVOCADO: 'Ese certificado fue revocado.',
};

const VEREDICTO: Record<string, string> = {
  FACIL: 'Se le arrienda fácil',
  CON_CONDICIONES: 'Se le arrienda con condiciones',
  NO: 'No se recomienda arrendarle',
  REVISAR: 'Que una persona revise los documentos antes de decidir',
};

function dia(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

export default function VerificarCalificacionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [r, setR] = useState<CertificadoVerificado | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    calificacionLeasefyApi.verificar(codigo).then(setR).catch(() => setFallo(true));
  }, [codigo]);

  return (
    <main className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-1 text-center">
          <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">Leasefy</p>
          <h1 className="text-h2 text-fg">Verificar una Calificación Leasefy</h1>
          <p className="font-mono text-sm tabular-nums text-fg-muted">{decodeURIComponent(codigo)}</p>
        </header>

        {fallo && (
          <p className="rounded-lg bg-warning-soft p-4 text-center text-sm text-fg">
            No pudimos comprobarlo en este momento. Intenta de nuevo en un rato.
          </p>
        )}

        {r && !r.autentico && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-6">
            <SealWarning className="h-6 w-6 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="font-medium text-fg">No es un certificado válido</p>
              <p className="mt-1 text-sm text-fg-muted">{MOTIVO[r.motivo ?? 'NO_EXISTE']}</p>
            </div>
          </div>
        )}

        {r?.autentico && (
          <div className="space-y-5 rounded-lg border border-border bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle className="h-5 w-5" weight="fill" aria-hidden />
              Es auténtico y lo emitió Leasefy
            </p>
            <div className="flex items-center gap-4">
              <LetraDeLaCalificacion letra={r.letra} grande />
              <div>
                <p className="text-lg font-medium text-fg">{r.nombreEnmascarado}</p>
                <p className="text-sm text-fg-muted">
                  <span className="font-mono tabular-nums">{r.puntaje}</span>/100 · {VEREDICTO[r.veredicto ?? ''] ?? '—'}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">Canon máximo</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">
                  {r.canonMaximoCop !== null ? formatCurrency(r.canonMaximoCop) : 'Sin ingreso verificado'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">Historial en Leasefy</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">
                  {r.resumen?.historial.mesesObservados ? `${r.resumen.historial.mesesObservados} meses` : 'Sin historial'}
                  {r.resumen?.historial.porcentajeATiempo !== null && r.resumen?.historial.porcentajeATiempo !== undefined
                    ? ` · ${r.resumen.historial.porcentajeATiempo} % a tiempo`
                    : ''}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">Emitido</dt>
                <dd className="mt-1 text-fg">{dia(r.emitidoEl)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">Vale hasta</dt>
                <dd className="mt-1 text-fg">{dia(r.venceEl)}</dd>
              </div>
            </dl>
            {r.resumen && r.resumen.condiciones.length > 0 && (
              <p className="rounded-md bg-primary-soft p-3 text-sm text-fg">
                Condiciones sugeridas: {r.resumen.condiciones.join(' · ')}
              </p>
            )}
            <p className="text-xs text-fg-subtle">
              La Calificación Leasefy no es un reporte a centrales de riesgo: resume cómo le ha ido a la persona arrendando
              en Leasefy y sus documentos. La persona autorizó compartirla.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
