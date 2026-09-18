'use client';

/**
 * «Mis certificados de retención» en el portal del PROPIETARIO.
 *
 * Nico (17-09): «Portal del propietario: sus liquidaciones… facturas de comisión
 * y CERTIFICADOS DE RETENCIÓN», y «el certificado anual se genera solo para todos
 * los propietarios… queda disponible en su portal».
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Mostrar un certificado que no se emitió.** El back devuelve sólo los
 *    EMITIDOS (numerados y con fecha). Uno calculado pero no emitido no es un
 *    documento, y enseñárselo al propietario lo invita a declarar con una cifra
 *    que la inmobiliaria todavía puede cambiar.
 * 2. **Decir «no tienes» cuando el problema es otro.** Sin correo en la cuenta,
 *    sin ficha en la inmobiliaria o sin retenciones del año son tres cosas
 *    distintas, y el back manda `motivo` para poder decir cuál.
 * 3. **Pedir a quién mostrar.** Lo resuelve la sesión: un certificado trae el NIT
 *    y las bases gravables de una persona.
 */

import { useCallback, useEffect, useState } from 'react';
import { SealCheck } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SectionLabel } from '@/components/ui/section-label';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type { MisCertificados } from '@/lib/api/tesoreria.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export default function MisCertificadosPage() {
  const [datos, setDatos] = useState<MisCertificados | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await tesoreriaApi.misCertificados());
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1.5">
        <SectionLabel>Impuestos</SectionLabel>
        <h1 className="text-h2 text-fg">Mis certificados de retención</h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Lo que los inquilinos te retuvieron en el año, para tu declaración. La cuota quedó
          saldada con el canon completo y lo retenido se te descontó en tu liquidación: es tu
          impuesto, y esto es el papel con el que lo acreditas.
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando}
        error={fallo}
        queEs="tus certificados de retención"
        onReintentar={cargar}
        vacio={datos !== null && datos.certificados.length === 0}
        cuandoVacio={
          <p
            className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted"
            data-testid="sin-certificados"
          >
            {datos?.motivo ??
              'Todavía no hay certificados emitidos a tu nombre.'}
          </p>
        }
      >
        {datos && datos.certificados.length > 0 ? (
          <ul className="space-y-4" data-testid="mis-certificados">
            {datos.certificados.map((c) => (
              <li
                key={c.id}
                className="space-y-3 rounded-lg border border-border bg-surface p-5"
                data-testid={`certificado-${c.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-fg">
                      <SealCheck className="h-4 w-4 text-success" aria-hidden="true" />
                      Año gravable {c.anio} · certificado {c.numero}
                    </p>
                    <p className="text-sm text-fg-muted">
                      A nombre de {c.nombre} ({c.documento}) · emitido el{' '}
                      {c.emitidoAt.slice(0, 10)}
                    </p>
                  </div>
                  <p className="font-mono text-lg tabular-nums text-fg">
                    {formatCurrency(c.totalRetenidoCop)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {[
                    ['Base', c.baseCop],
                    ['Retefuente', c.retefuenteCop],
                    ['ReteIVA', c.reteIvaCop],
                    ['ReteICA', c.reteIcaCop],
                  ].map(([etiqueta, valor]) => (
                    <div key={String(etiqueta)} className="rounded border border-border bg-bg p-3">
                      <dt className="text-xs text-fg-muted">{etiqueta}</dt>
                      <dd className="font-mono tabular-nums text-fg">
                        {formatCurrency(Number(valor))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}
