'use client';

/**
 * «Mis informes» en el portal del PROPIETARIO: el certificado anual de ingresos
 * y el historial de reparaciones con su comprobante.
 *
 * Punto 6 de la «ola 5» (Nico, 17-09-2026). La rentabilidad por inmueble ya
 * existía en el panel de la inmobiliaria; estas dos no existían en ninguna
 * parte y había que sumar doce extractos a mano.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Ofrecer años vacíos.** Los años salen de los períodos que de verdad
 *    tienen cuota a su nombre. Ofrecer 2019 a quien llegó en 2025 es ofrecerle
 *    cinco certificados en blanco.
 * 2. **Callar lo que el certificado no incluye.** Los períodos que gestionó el
 *    sistema anterior de la inmobiliaria NO están, y el certificado lo dice con
 *    todas las letras: un propietario migrado a mitad de año que vea un ingreso
 *    más chico de lo que recuerda tiene que poder entender por qué.
 * 3. **Mostrar un descuento sin su comprobante.** Un propietario al que le
 *    descontaron $800.000 quiere ver la factura. El comprobante vive en un
 *    bucket privado, así que se pide firmado al abrirlo — nunca un enlace
 *    inventado, y cuando no hay, la fila lo dice.
 */

import { useCallback, useEffect, useState } from 'react';
import { FileArrowDown } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SectionLabel } from '@/components/ui/section-label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  informesDelPropietarioApi,
  type CertificadoDeIngresos,
  type InformesDisponibles,
  type ReparacionDelPropietario,
} from '@/lib/api/informes-del-propietario.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';

/**
 * 🔴 QA 22-09: el back ofrecía «2027 · 2026» y la pantalla abría 2027 —un
 * certificado TRIBUTARIO con cánones que no se han causado—. Un año que no ha
 * empezado no tiene nada que certificar: no se ofrece, y se abre el más nuevo
 * que sí. (Que 2026 sume octubre–diciembre es del back, que no corta en el mes
 * en curso; queda anotado para él.)
 */
function aniosCertificables(anios: readonly number[], hoy: Date = new Date()): number[] {
  const esteAnio = hoy.getFullYear();
  return anios.filter((a) => a <= esteAnio);
}

export default function MisInformesPage() {
  const [disponibles, setDisponibles] = useState<InformesDisponibles | null>(null);
  const [certificado, setCertificado] = useState<CertificadoDeIngresos | null>(null);
  const [reparaciones, setReparaciones] = useState<ReparacionDelPropietario[] | null>(null);
  const [motivoDeReparaciones, setMotivoDeReparaciones] = useState<string | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setFallo(null);
    try {
      const [d, r] = await Promise.all([
        informesDelPropietarioApi.disponibles(),
        informesDelPropietarioApi.reparaciones(),
      ]);
      const anios = aniosCertificables(d.anios);
      setDisponibles({ ...d, anios });
      setReparaciones(r.reparaciones);
      setMotivoDeReparaciones(r.motivo);
      const elegido = anios.length > 0 ? Math.max(...anios) : null;
      setAnio(elegido);
      if (elegido !== null) {
        setCertificado(
          await informesDelPropietarioApi.certificadoDeIngresos(elegido),
        );
      }
    } catch (e) {
      // El error entero: la pantalla necesita status y code para saber si fue
      // la sesión, el segundo factor o nosotros.
      setFallo(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarAnio = useCallback(async (nuevo: number) => {
    setAnio(nuevo);
    try {
      setCertificado(await informesDelPropietarioApi.certificadoDeIngresos(nuevo));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No pudimos traer ese certificado.',
      );
    }
  }, []);

  const abrirComprobante = useCallback(async (deduccionId: string) => {
    try {
      const { url } = await informesDelPropietarioApi.comprobante(deduccionId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No pudimos abrir el comprobante.',
      );
    }
  }, []);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-fg dark:text-white">Mis informes</h1>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Tu certificado anual de ingresos y el historial de reparaciones de tus inmuebles.
        </p>
      </header>

      <EstadoDeDatos
        cargando={disponibles === null && !fallo}
        error={fallo}
        queEs="tus informes"
        onReintentar={cargar}
      >
        {/* ── Certificado anual de ingresos ── */}
        <section className="space-y-4">
          <SectionLabel>Certificado anual de ingresos</SectionLabel>

          {disponibles?.motivo && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {disponibles.motivo}
            </p>
          )}

          {(disponibles?.anios.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="anios">
              {disponibles!.anios.map((a) => (
                <Button
                  key={a}
                  variant={a === anio ? 'default' : 'secondary'}
                  hideArrow
                  onClick={() => void cambiarAnio(a)}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}

          {certificado && (
            <div
              className="rounded-xl border border-border dark:border-border-strong p-5 space-y-4"
              data-testid="certificado"
            >
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Renglon
                  titulo="Ingreso bruto por arrendamiento"
                  valor={certificado.ingresoBrutoCop}
                />
                <Renglon titulo="IVA generado" valor={certificado.ivaCop} />
                <Renglon
                  titulo="Otros conceptos causados"
                  valor={certificado.otrosConceptosCop}
                />
                <Renglon
                  titulo="Comisión de administración"
                  valor={certificado.comisionCop}
                />
                <Renglon titulo="IVA de la comisión" valor={certificado.ivaComisionCop} />
                <Renglon
                  titulo="Retenciones que te practicaron"
                  valor={certificado.retencionesQueLePracticaronCop}
                />
                <Renglon
                  titulo="Retenciones que practicaste sobre la comisión"
                  valor={certificado.retencionesQueElPracticoCop}
                />
              </dl>

              {certificado.inmuebles.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-fg-muted dark:text-fg-subtle">
                        <th className="py-2 pr-4">Inmueble</th>
                        <th className="py-2 pr-4 text-right">Ingreso bruto</th>
                        <th className="py-2 pr-4 text-right">Comisión</th>
                        <th className="py-2 text-right">Retenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificado.inmuebles.map((i) => (
                        <tr key={i.contractId} className="border-t border-border">
                          <td className="py-2 pr-4">{i.inmueble}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatCurrency(i.ingresoBrutoCop)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatCurrency(i.comisionCop)}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatCurrency(i.retenidoCop)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 🔴 Lo que el certificado NO incluye se dice, no se calla. */}
              <ul className="space-y-1.5" data-testid="advertencias">
                {certificado.advertencias.map((a) => (
                  <li key={a} className="text-xs text-fg-muted dark:text-fg-subtle">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Historial de reparaciones ── */}
        <section className="space-y-4">
          <SectionLabel>Historial de reparaciones</SectionLabel>

          {motivoDeReparaciones && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {motivoDeReparaciones}
            </p>
          )}

          {reparaciones && reparaciones.length === 0 && !motivoDeReparaciones && (
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              Todavía no hay reparaciones registradas en tus inmuebles.
            </p>
          )}

          <ul className="space-y-3" data-testid="reparaciones">
            {(reparaciones ?? []).map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border dark:border-border-strong p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fg dark:text-white">{r.titulo}</p>
                    <p className="text-sm text-fg-muted dark:text-fg-subtle">
                      {r.fecha} · {r.inmueble}
                      {r.proveedor ? ` · ${r.proveedor}` : ''}
                    </p>
                  </div>
                  {/* Un `null` es «no te tocó a ti», y se dice así — nunca «$0». */}
                  <p className="text-sm tabular-nums text-fg dark:text-white">
                    {r.aCargoDelPropietarioCop === null
                      ? 'No se te descontó'
                      : formatCurrency(r.aCargoDelPropietarioCop)}
                  </p>
                </div>
                <p className="text-sm text-fg-muted dark:text-fg-subtle">{r.descripcion}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {r.comprobante ? (
                    <Button
                      variant="secondary"
                      hideArrow
                      onClick={() => void abrirComprobante(r.comprobante!.deduccionId)}
                    >
                      <FileArrowDown className="w-4 h-4" />
                      {r.comprobante.nombre ?? 'Ver comprobante'}
                    </Button>
                  ) : (
                    r.aCargoDelPropietarioCop !== null && (
                      <span className="text-xs text-fg-muted dark:text-fg-subtle">
                        Este descuento no tiene comprobante cargado. Pídelo a tu inmobiliaria.
                      </span>
                    )
                  )}
                  {r.fotos.map((f) => (
                    <a
                      key={f.url}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      {f.nombre}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </EstadoDeDatos>
    </div>
  );
}

function Renglon({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2">
      <dt className="text-sm text-fg-muted dark:text-fg-subtle">{titulo}</dt>
      <dd className="text-sm tabular-nums text-fg dark:text-white">
        {formatCurrency(valor)}
      </dd>
    </div>
  );
}
