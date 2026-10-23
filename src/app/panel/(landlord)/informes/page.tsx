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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchInput } from '@leasefy/cadence';
import { FileArrowDown } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SectionLabel } from '@/components/ui/section-label';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import type { InmuebleDelCertificado } from '@/lib/api/informes-del-propietario.service';
import { toast } from '@/components/ui/toast';
import {
  informesDelPropietarioApi,
  type CertificadoDeIngresos,
  type InformesDisponibles,
  type ReparacionDelPropietario,
} from '@/lib/api/informes-del-propietario.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { anioQueAbreElCertificado } from '@/lib/propietarios/anio-del-certificado';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { portalDelPropietarioApi } from '@/lib/api/portal-del-propietario.service';

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
  const [bajandoPdf, setBajandoPdf] = useState(false);
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
      // QA-PROP-95 C-35: el año anterior (el que se declara) si está; si no, el más nuevo.
      const elegido = anioQueAbreElCertificado(anios);
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
      // 02-10-2026: con la regla de oro del traductor (antes, `e.message` crudo).
      toast.error(
        mensajeParaLaPersona(e, {
          accion: 'traer ese certificado',
          porDefecto: 'No pudimos traer ese certificado. Prueba de nuevo en un momento.',
        }),
      );
    }
  }, []);

  const abrirComprobante = useCallback(async (deduccionId: string) => {
    try {
      const { url } = await informesDelPropietarioApi.comprobante(deduccionId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          accion: 'abrir el comprobante',
          porDefecto: 'No pudimos abrir el comprobante. Prueba de nuevo en un momento.',
        }),
      );
    }
  }, []);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Mi plata"
        titulo="Mis informes"
        descripcion="Tu certificado anual de ingresos y el historial de reparaciones de tus inmuebles."
      />

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
            <p className="text-sm text-fg-muted">
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
              className="rounded-lg border border-border p-5 space-y-4"
              data-testid="certificado"
            >
              {/* Nico, 11-10-2026: «Certificados descargables». */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  isLoading={bajandoPdf}
                  data-testid="bajar-certificado-de-ingresos"
                  onClick={async () => {
                    setBajandoPdf(true);
                    try {
                      await portalDelPropietarioApi.bajarCertificadoDeIngresos(certificado.anio);
                    } catch (e) {
                      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos bajar el PDF.', accion: 'bajar el certificado' }));
                    } finally {
                      setBajandoPdf(false);
                    }
                  }}
                >
                  <FileArrowDown className="h-4 w-4" aria-hidden="true" />
                  Descargar PDF
                </Button>
              </div>
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

              {certificado.inmuebles.length > 0 && <InmueblesDelCertificado inmuebles={certificado.inmuebles} />}

              {/* 🔴 Lo que el certificado NO incluye se dice, no se calla. */}
              <ul className="space-y-1.5" data-testid="advertencias">
                {certificado.advertencias.map((a) => (
                  <li key={a} className="text-caption text-fg-muted">
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
            <p className="text-sm text-fg-muted">
              {motivoDeReparaciones}
            </p>
          )}

          {reparaciones && reparaciones.length === 0 && !motivoDeReparaciones && (
            <p className="text-sm text-fg-muted">
              Todavía no hay reparaciones registradas en tus inmuebles.
            </p>
          )}

          <ul className="space-y-3" data-testid="reparaciones">
            {(reparaciones ?? []).map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{r.titulo}</p>
                    <p className="text-sm text-fg-muted">
                      {fechaCorta(r.fecha)} · {r.inmueble}
                      {r.proveedor ? ` · ${r.proveedor}` : ''}
                    </p>
                  </div>
                  {/* Un `null` es «no te tocó a ti», y se dice así — nunca «$0». */}
                  <p className="text-sm tabular-nums text-fg">
                    {r.aCargoDelPropietarioCop === null
                      ? 'No se te descontó'
                      : formatCurrency(r.aCargoDelPropietarioCop)}
                  </p>
                </div>
                <p className="text-sm text-fg-muted">{r.descripcion}</p>
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
                      <span className="text-caption text-fg-muted">
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
                      className="text-caption text-primary underline"
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
      <dt className="text-sm text-fg-muted">{titulo}</dt>
      <dd className="text-sm tabular-nums text-fg">
        {formatCurrency(valor)}
      </dd>
    </div>
  );
}

/** Con más de esta cantidad de inmuebles la tabla trae su buscador y su paginación. */
const POR_PAGINA = 10;

/**
 * Revisora r25: el detalle por inmueble del certificado en la tabla de la casa
 * (antes una `<table>` a mano), en tarjetas a 390 y, si crece, con buscador y
 * paginación dentro de la tarjeta (regla de Nico, 23-10: las tablas los conservan).
 */
function InmueblesDelCertificado({ inmuebles }: { inmuebles: readonly InmuebleDelCertificado[] }) {
  const [texto, setTexto] = useState('');
  const crece = inmuebles.length > POR_PAGINA;
  const filas = useMemo(() => {
    const q = texto.trim().toLocaleLowerCase('es');
    return q ? inmuebles.filter((i) => i.inmueble.toLocaleLowerCase('es').includes(q)) : inmuebles;
  }, [inmuebles, texto]);
  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(filas, {
    initialPageSize: POR_PAGINA,
    resetKey: texto,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="inmuebles-del-certificado">
      {crece && (
        <div className="border-b border-border p-3">
          <SearchInput
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onClear={() => setTexto('')}
            placeholder="Buscar inmueble"
            inputSize="md"
            className="w-full sm:w-72"
            data-testid="inmuebles-del-certificado-buscar"
          />
        </div>
      )}
      <Table className="max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow>
            <TableHead>Inmueble</TableHead>
            <TableHead numeric>Ingreso bruto</TableHead>
            <TableHead numeric>Comisión</TableHead>
            <TableHead numeric>Retenido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="max-md:block">
          {pageItems.length === 0 ? (
            <TableRow className="max-md:block">
              <TableCell colSpan={4} className="py-6 text-center text-body-sm text-fg-muted max-md:block">
                Ningún inmueble se llama así.{' '}
                <button type="button" className="underline" onClick={() => setTexto('')}>
                  Ver todos
                </button>
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((i) => (
              <TableRow
                key={i.contractId}
                data-testid="inmueble-del-certificado"
                className="max-md:grid max-md:grid-cols-3 max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
              >
                <TableCell className="max-md:col-span-3 max-md:block max-md:p-0">
                  <span className="font-medium text-fg">{i.inmueble}</span>
                </TableCell>
                <TableCell numeric className="font-mono tabular-nums max-md:block max-md:p-0 max-md:text-left">
                  <span className="block text-caption text-fg-muted md:hidden">Ingreso bruto</span>
                  {formatCurrency(i.ingresoBrutoCop)}
                </TableCell>
                <TableCell numeric className="font-mono tabular-nums max-md:block max-md:p-0 max-md:text-left">
                  <span className="block text-caption text-fg-muted md:hidden">Comisión</span>
                  {formatCurrency(i.comisionCop)}
                </TableCell>
                <TableCell numeric className="font-mono tabular-nums max-md:block max-md:p-0 max-md:text-left">
                  <span className="block text-caption text-fg-muted md:hidden">Retenido</span>
                  {formatCurrency(i.retenidoCop)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {crece && (
        <div className="border-t border-border">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
