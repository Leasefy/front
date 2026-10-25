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
import { CheckCircle, SealWarning, WarningCircle } from '@phosphor-icons/react';
import { Appear, CrossFade } from '@leasefy/cadence';

import { LeasefyLogotype } from '@/components/brand';
import { LetraDeLaCalificacion } from '@/components/calificacion/TarjetaDeCalificacion';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { calificacionLeasefyApi, type CertificadoVerificado } from '@/lib/api/calificacion-leasefy.service';
import { codigoDelEnlace } from '@/lib/calificacion/codigo-del-enlace';
import { formatCurrency } from '@/lib/format';
import { traducir } from '@/lib/i18n/use-tr';
import { IDIOMAS } from '@/lib/idioma/idioma';
import { cambiarIdioma, useIdioma, useTx } from '@/lib/idioma/use-idioma';
import { cn } from '@/lib/utils';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';

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
            'rounded-full px-2.5 py-1 font-mono text-caption tracking-wide transition-colors',
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
  // Ronda 30: en español, la fecha de la casa («16 oct 2026»).
  const dia = (iso: string | null) =>
    iso
      ? idioma === 'en'
        ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : fechaCorta(iso)
      : '—';
  const meses = (n: number) => (n === 1 ? tx('1 mes', '1 month') : tx(`${n} meses`, `${n} months`));
  const aTiempo = (p: number) => tx(` · ${p} % a tiempo`, ` · ${p}% on time`);

  // Lo que se ve: comprobando → la respuesta (auténtico / no válido) o el fallo.
  const vista = fallo ? 'fallo' : !r ? 'comprobando' : r.autentico ? 'autentico' : 'no-valido';
  /** El rótulo de cada dato del certificado: 13 px, sin mayúsculas sostenidas. */
  const rotulo = 'text-caption text-fg-subtle';

  return (
    <main className="min-h-screen bg-bg px-4 pb-12 pt-8 sm:pt-12">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-3 text-center">
          <LeasefyLogotype className="mx-auto h-6 w-auto text-fg" title="Leasefy" />
          <h1 className="text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">
            {tx('Verificar una Calificación Leasefy', 'Verify a Leasefy rating')}
          </h1>
          <p className="font-mono text-body-sm tabular-nums text-fg-muted">{codigo}</p>
        </header>

        <SelectorDelIdioma />

        <Appear>
          <CrossFade swapKey={vista}>
            {vista === 'comprobando' ? (
              <div className="rounded-lg border border-border bg-surface px-6 py-10">
                <CargaDeMarca
                  tamano="md"
                  disposicion="apilada"
                  texto={tx('Comprobando el certificado…', 'Checking the certificate…')}
                  className="flex text-center"
                />
              </div>
            ) : null}

            {fallo && (
              <p className="flex items-start gap-2.5 rounded-lg bg-warning-soft p-4 text-body-sm text-fg">
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" aria-hidden />
                {tx(
                  'No pudimos comprobarlo en este momento. Intenta de nuevo en un rato.',
                  "We couldn't check it right now. Please try again in a while.",
                )}
              </p>
            )}

            {r && !r.autentico && (
              <div className="space-y-3 rounded-lg border border-border bg-surface p-6">
                <SealWarning className="h-8 w-8 text-danger" aria-hidden />
                <p className="font-heading text-[22px] font-[420] leading-tight tracking-[-0.02em] text-fg">
                  {tx('No es un certificado válido', 'This is not a valid certificate')}
                </p>
                <p className="text-body-sm text-fg-muted">{par(MOTIVO[r.motivo ?? 'NO_EXISTE'])}</p>
              </div>
            )}

            {r?.autentico && (
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {/* LA respuesta, arriba y en grande: ¿es de verdad? */}
                <div className="flex items-center gap-3 border-b border-border-faint px-6 py-5">
                  <CheckCircle className="h-7 w-7 shrink-0 text-success" weight="fill" aria-hidden />
                  <p className="font-heading text-[20px] font-[420] leading-tight tracking-[-0.015em] text-fg">
                    {tx('Es auténtico y lo emitió Leasefy', 'It is authentic and was issued by Leasefy')}
                  </p>
                </div>
                <div className="space-y-6 p-6">
                  <div className="flex items-center gap-4">
                    <LetraDeLaCalificacion
                      letra={r.letra}
                      grande
                      etiqueta={r.letra ? tx(`Letra ${r.letra}`, `Grade ${r.letra}`) : tx('Sin letra', 'No grade')}
                    />
                    <div className="min-w-0">
                      <p className="text-h3 text-fg">{r.nombreEnmascarado}</p>
                      <p className="text-body-sm text-fg-muted">
                        <span className="font-mono tabular-nums">{r.puntaje}</span>/100 · {par(VEREDICTO[r.veredicto ?? ''])}
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-body-sm min-[420px]:grid-cols-2">
                    <div>
                      <dt className={rotulo}>{tx('Canon máximo', 'Maximum rent (COP)')}</dt>
                      <dd className="mt-1 font-mono tabular-nums text-fg">
                        {r.canonMaximoCop !== null
                          ? formatCurrency(r.canonMaximoCop, idioma)
                          : tx('Sin ingreso verificado', 'No verified income')}
                      </dd>
                    </div>
                    <div>
                      <dt className={rotulo}>{tx('Historial en Leasefy', 'History on Leasefy')}</dt>
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
                      <dt className={rotulo}>{tx('Emitido', 'Issued')}</dt>
                      <dd className="mt-1 text-fg">{dia(r.emitidoEl)}</dd>
                    </div>
                    <div>
                      <dt className={rotulo}>{tx('Vale hasta', 'Valid until')}</dt>
                      <dd className="mt-1 text-fg">{dia(r.venceEl)}</dd>
                    </div>
                  </dl>
                  {r.resumen && r.resumen.condiciones.length > 0 && (
                    <p className="rounded-md bg-surface-muted p-3 text-body-sm text-fg">
                      {tx('Condiciones sugeridas:', 'Suggested conditions:')}{' '}
                      {r.resumen.condiciones.map((c) => traducir(c, idioma)).join(' · ')}
                    </p>
                  )}
                  <p className="border-t border-border-faint pt-4 text-caption text-fg-subtle">
                    {tx(
                      'La Calificación Leasefy no es un reporte a centrales de riesgo: resume cómo le ha ido a la persona arrendando en Leasefy y sus documentos. La persona autorizó compartirla.',
                      'The Leasefy rating is not a credit bureau report: it sums up how the person has done renting on Leasefy, plus their documents. The person authorized sharing it.',
                    )}
                  </p>
                </div>
              </div>
            )}
          </CrossFade>
        </Appear>
      </div>
    </main>
  );
}
