'use client';

/**
 * ¿ESTE CERTIFICADO DE CALIFICACIÓN LEASEFY ES DE VERDAD? Pública, sin sesión.
 *
 * Quien recibe el certificado (sobre todo una inmobiliaria que no está en
 * Leasefy) escribe el código o abre el enlace y ve si es auténtico: el nombre
 * enmascarado, la letra, el veredicto, hasta qué canon y un resumen. Todo lo
 * dice el back (`GET /calificacion-leasefy/verificar/:codigo`); esta página no
 * decide nada.
 *
 * En español o en inglés como el resto de la parte pública (`/es/…`, `/en/…`,
 * 19-10-2026): sin prefijo, el middleware la manda al idioma de quien la abre.
 * Las condiciones llegan del back en español y son frases fijas: se traducen con
 * el mismo diccionario del panel (`frases-en.ts`).
 */

import { use, useEffect, useState } from 'react';
import { CheckCircle, SealWarning } from '@phosphor-icons/react';

import { LetraDeLaCalificacion } from '@/components/calificacion/TarjetaDeCalificacion';
import { calificacionLeasefyApi, type CertificadoVerificado } from '@/lib/api/calificacion-leasefy.service';
import { codigoDelEnlace } from '@/lib/calificacion/codigo-del-enlace';
import { formatCurrency } from '@/lib/format';
import { traducir } from '@/lib/i18n/use-tr';
import { IDIOMAS } from '@/lib/idioma/idioma';
import { cambiarIdioma, useIdioma, useTx } from '@/lib/idioma/use-idioma';
import { cn } from '@/lib/utils';

type Par = readonly [es: string, en: string];

const MOTIVO: Record<NonNullable<CertificadoVerificado['motivo']>, Par> = {
  NO_EXISTE: ['No encontramos un certificado con ese código.', "We couldn't find a certificate with that code."],
  SIN_PAGAR: ['Ese certificado todavía no se emitió.', "That certificate hasn't been issued yet."],
  VENCIDO: ['Ese certificado ya venció.', 'That certificate has expired.'],
  REVOCADO: ['Ese certificado fue revocado.', 'That certificate was revoked.'],
};

const VEREDICTO: Record<string, Par> = {
  FACIL: ['Se le arrienda fácil', 'Easy to rent to'],
  CON_CONDICIONES: ['Se le arrienda con condiciones', 'Rent with conditions'],
  NO: ['No se recomienda arrendarle', 'Renting is not recommended'],
  REVISAR: ['Que una persona revise los documentos antes de decidir', 'Have a person review the documents before deciding'],
};

function SelectorDelIdioma() {
  const idioma = useIdioma();
  const tx = useTx();
  return (
    <div className="flex justify-center gap-1" role="group" aria-label={tx('Idioma', 'Language')}>
      {IDIOMAS.map((i) => (
        <button
          key={i}
          type="button"
          lang={i}
          aria-pressed={i === idioma}
          aria-label={i === 'es' ? 'Español' : 'English'}
          onClick={() => i !== idioma && cambiarIdioma(i)}
          className={cn(
            'rounded-full px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide transition-colors',
            i === idioma ? 'bg-surface-muted text-fg' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {i.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function VerificarCalificacionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: segmento } = use(params);
  const codigo = codigoDelEnlace(segmento);
  const idioma = useIdioma();
  const tx = useTx();
  const [r, setR] = useState<CertificadoVerificado | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    calificacionLeasefyApi.verificar(codigo).then(setR).catch(() => setFallo(true));
  }, [codigo]);

  const par = (p: Par | undefined) => (p ? tx(p[0], p[1]) : '—');
  const dia = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';
  const meses = (n: number) => (n === 1 ? tx('1 mes', '1 month') : tx(`${n} meses`, `${n} months`));
  const aTiempo = (p: number) => tx(` · ${p} % a tiempo`, ` · ${p}% on time`);

  return (
    <main className="min-h-screen bg-bg px-4 py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-1 text-center">
          <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">Leasefy</p>
          <h1 className="text-h2 text-fg">{tx('Verificar una Calificación Leasefy', 'Verify a Leasefy rating')}</h1>
          <p className="font-mono text-sm tabular-nums text-fg-muted">{codigo}</p>
        </header>

        <SelectorDelIdioma />

        {fallo && (
          <p className="rounded-lg bg-warning-soft p-4 text-center text-sm text-fg">
            {tx(
              'No pudimos comprobarlo en este momento. Intenta de nuevo en un rato.',
              "We couldn't check it right now. Please try again in a while.",
            )}
          </p>
        )}

        {r && !r.autentico && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-6">
            <SealWarning className="h-6 w-6 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="font-medium text-fg">{tx('No es un certificado válido', 'This is not a valid certificate')}</p>
              <p className="mt-1 text-sm text-fg-muted">{par(MOTIVO[r.motivo ?? 'NO_EXISTE'])}</p>
            </div>
          </div>
        )}

        {r?.autentico && (
          <div className="space-y-5 rounded-lg border border-border bg-surface p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle className="h-5 w-5" weight="fill" aria-hidden />
              {tx('Es auténtico y lo emitió Leasefy', 'It is authentic and was issued by Leasefy')}
            </p>
            <div className="flex items-center gap-4">
              <LetraDeLaCalificacion
                letra={r.letra}
                grande
                etiqueta={r.letra ? tx(`Letra ${r.letra}`, `Grade ${r.letra}`) : tx('Sin letra', 'No grade')}
              />
              <div>
                <p className="text-lg font-medium text-fg">{r.nombreEnmascarado}</p>
                <p className="text-sm text-fg-muted">
                  <span className="font-mono tabular-nums">{r.puntaje}</span>/100 · {par(VEREDICTO[r.veredicto ?? ''])}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                  {tx('Canon máximo', 'Maximum rent (COP)')}
                </dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">
                  {r.canonMaximoCop !== null
                    ? formatCurrency(r.canonMaximoCop, idioma)
                    : tx('Sin ingreso verificado', 'No verified income')}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                  {tx('Historial en Leasefy', 'History on Leasefy')}
                </dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">
                  {r.resumen?.historial.mesesObservados
                    ? meses(r.resumen.historial.mesesObservados)
                    : tx('Sin historial', 'No history')}
                  {r.resumen?.historial.porcentajeATiempo !== null && r.resumen?.historial.porcentajeATiempo !== undefined
                    ? aTiempo(r.resumen.historial.porcentajeATiempo)
                    : ''}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tx('Emitido', 'Issued')}</dt>
                <dd className="mt-1 text-fg">{dia(r.emitidoEl)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                  {tx('Vale hasta', 'Valid until')}
                </dt>
                <dd className="mt-1 text-fg">{dia(r.venceEl)}</dd>
              </div>
            </dl>
            {r.resumen && r.resumen.condiciones.length > 0 && (
              <p className="rounded-md bg-primary-soft p-3 text-sm text-fg">
                {tx('Condiciones sugeridas:', 'Suggested conditions:')}{' '}
                {r.resumen.condiciones.map((c) => traducir(c, idioma)).join(' · ')}
              </p>
            )}
            <p className="text-xs text-fg-subtle">
              {tx(
                'La Calificación Leasefy no es un reporte a centrales de riesgo: resume cómo le ha ido a la persona arrendando en Leasefy y sus documentos. La persona autorizó compartirla.',
                'The Leasefy rating is not a credit bureau report: it sums up how the person has done renting on Leasefy, plus their documents. The person authorized sharing it.',
              )}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
