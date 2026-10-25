'use client';
/**
 * 🔴 CB-R21 (04-10-2026) · Cuentas por pagar = las facturas de Gastos.
 *
 * Decisión de Nico, tal cual: «Proveedores: Una sola, en Gastos». La factura
 * de proveedor se registra y se causa en Contabilidad › Gastos (con sus
 * retenciones, su asiento y su fila en la exógena). Esta lista NO tiene un
 * registro propio: lee esas mismas facturas —por pagar, vencidas, pagadas— y
 * «Pagar» crea el egreso de la factura, que sigue el camino que ya existe en
 * Egresos: lote → lo aprueba otra persona → archivo del banco → marcar pagado,
 * que asienta el pago y deja la factura PAGADA.
 *
 * Antes había un segundo formulario (el del agente de pagos) que guardaba la
 * factura en otro lado: no llegaba al libro, ni al P&G, ni a la exógena.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Money, Plus } from '@phosphor-icons/react';
import { SinDatos } from '@/components/estado/SinDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import {
  gastosApi,
  type FacturaDeProveedor,
  type FiltrosDeFacturas,
  type PaginaDeFacturas,
} from '@/lib/api/gastos.service';
import { diaLegible, hoy } from '@/lib/contabilidad/fechas';
import {
  NOMBRE_DEL_ESTADO_DE_PAGO,
  egresoDeLaFacturaEnPalabras,
  estadoDePago,
  sePuedePagar,
} from '@/lib/contabilidad/pagar-factura';
import { Monto } from '../Monto';
import { AccionConMotivo, FaltaLaMigracion, EsqueletoDeTabla } from '../piezas';
import { usePuedeRegistrar } from '../use-puede-registrar';
import { PagarFactura, numeroDeLaFactura } from './PagarFactura';

type Vista = 'por-pagar' | 'vencidas' | 'pagadas';

const VISTAS: { valor: Vista; nombre: string; filtro: FiltrosDeFacturas; vacio: string }[] = [
  {
    valor: 'por-pagar',
    nombre: 'Por pagar',
    filtro: { estado: 'CAUSADA' },
    vacio: 'No hay facturas causadas por pagar.',
  },
  {
    valor: 'vencidas',
    nombre: 'Vencidas',
    filtro: { vencidas: true },
    vacio: 'Ninguna factura causada está vencida.',
  },
  {
    valor: 'pagadas',
    nombre: 'Pagadas',
    filtro: { estado: 'PAGADA' },
    vacio: 'Todavía no hay facturas pagadas.',
  },
];

const TONO: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  'por-pagar': 'secondary',
  vencida: 'destructive',
  'en-pago': 'outline',
  pagada: 'outline',
};

const GASTOS = '/panel/inmobiliaria/contabilidad/gastos';
const EGRESOS = '/panel/inmobiliaria/contabilidad/egresos';

export function CuentasPorPagar({
  conRegistrar = true,
}: {
  /** `false` donde la pantalla ya tiene su propio «Registrar» (Facturación → Compras). */
  conRegistrar?: boolean;
} = {}) {
  // «Pagar» crea el egreso: el auxiliar contable también lo registra.
  const escritura = usePuedeRegistrar();
  const [vista, setVista] = useState<Vista>('por-pagar');
  const [pagina, setPagina] = useState<PaginaDeFacturas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pagando, setPagando] = useState<FacturaDeProveedor | null>(null);
  const dia = hoy();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const filtro = VISTAS.find((v) => v.valor === vista)!.filtro;
      setPagina(await gastosApi.facturas.listar({ ...filtro, limite: 200 }));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [vista]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Ronda 30 (revisora r27, C11): el conteo de las tres pestañas (una factura por pregunta: el back
     manda el total). Si alguna falla, esa pestaña va sin número. Se vuelve a contar tras pagar. */
  const [conteos, setConteos] = useState<Partial<Record<Vista, number>>>({});
  const contar = useCallback(() => {
    void Promise.all(
      VISTAS.map((v) =>
        gastosApi.facturas
          .listar({ ...v.filtro, limite: 1 })
          .then((r) => [v.valor, r?.total] as const)
          .catch(() => null),
      ),
    ).then((res) => {
      const c: Partial<Record<Vista, number>> = {};
      for (const x of res) if (x && typeof x[1] === 'number') c[x[0]] = x[1];
      setConteos(c);
    });
  }, []);
  useEffect(() => {
    contar();
  }, [contar]);

  const actual = VISTAS.find((v) => v.valor === vista)!;
  const facturas = pagina?.facturas ?? [];

  return (
    <section className="space-y-4" data-testid="cuentas-por-pagar">
      {/* Ronda 30 (revisora r27): las pestañas DENTRO de la tarjeta de la tabla y con su conteo; la nota de
          dos renglones, plegada; «Registrar factura» no sale cuando el vacío ya lleva «Ir a Gastos». */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <PestanasDeEstado
            etiqueta="Qué facturas ver"
            valor={vista}
            onCambio={(v) => setVista(v as Vista)}
            pestanas={VISTAS.map((v) => ({
              valor: v.valor,
              etiqueta: v.nombre,
              cuantos: v.valor === vista && pagina ? pagina.total : (conteos[v.valor] ?? null),
              fija: true,
              testid: `cxp-vista-${v.valor}`,
            }))}
          />
          <div className="flex flex-wrap items-center gap-3">
            <MasDetalles etiqueta="Cómo se pagan" etiquetaAbierto="Ocultar" className="text-caption" classNameDelContenido="max-w-md text-caption text-fg-muted">
              Las facturas de proveedor se registran y se causan en Contabilidad, en Gastos. Aquí ves las
              causadas y las mandas a pagar: el pago queda en Egresos, donde se arma el lote y lo aprueba
              otra persona antes de girar.
            </MasDetalles>
            {conRegistrar && !(vista === 'por-pagar' && pagina && facturas.length === 0) ? (
              <Button asChild variant="outline" size="sm" hideArrow>
                <Link href={GASTOS} data-testid="cxp-registrar-en-gastos">
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Registrar factura
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

      {error ? (
        <FalloDeCarga error={error} queEs="las cuentas por pagar" onReintentar={cargar} />
      ) : cargando && !pagina ? (
        <EsqueletoDeTabla queEs="Cargando las cuentas por pagar…" filas={4} />
      ) : pagina && !pagina.disponible ? (
        <FaltaLaMigracion
          motivo={pagina.motivo}
          queSeEspera="ver las cuentas por pagar"
          mientrasTanto="Mientras no esté, las facturas de proveedor no se pueden registrar ni pagar desde Leasefy."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">A girar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {facturas.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={6} className="p-0 max-md:block">
                    {/* Revisora r25 (C5): el vacío con su salida —las facturas se causan en Gastos—
                        (antes una línea gris). */}
                    <SinDatos
                      queSon="facturas"
                      icono={Money}
                      titulo={actual.vacio.replace(/\.$/, '')}
                      descripcion={
                        actual.valor === 'pagadas'
                          ? 'Cuando pagues una factura causada, queda aquí con su egreso.'
                          : actual.valor === 'vencidas'
                            ? 'Las que están por pagar todavía no pasan de su fecha.'
                            : 'Las facturas de los proveedores se registran y se causan en Gastos de la inmobiliaria.'
                      }
                      accion={
                        actual.valor === 'por-pagar' ? (
                          <Button asChild size="sm" variant="secondary" hideArrow>
                            <Link href={GASTOS}>Ir a Gastos</Link>
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                facturas.map((f) => {
                  const estado = estadoDePago(f, dia);
                  return (
                    <TableRow
                      key={f.id}
                      data-testid={`cxp-fila-${f.id}`}
                      className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                    >
                      <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                        <p className="text-sm font-medium text-fg">{f.proveedorNombre}</p>
                        <p className="text-caption text-fg-muted">{f.concepto}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                        <p>{numeroDeLaFactura(f) || 'Sin número'}</p>
                        <p className="text-caption text-fg-muted">{diaLegible(f.fecha)}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-right max-md:text-caption max-md:text-fg-muted max-md:before:content-['Vence_']">
                        {f.fechaDeVencimiento ? diaLegible(f.fechaDeVencimiento) : 'Sin fecha'}
                      </TableCell>
                      <TableCell className="text-right max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                        <Monto valor={f.netoCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                        {estado ? (
                          <Badge variant={TONO[estado]}>{NOMBRE_DEL_ESTADO_DE_PAGO[estado]}</Badge>
                        ) : null}
                        {f.egreso ? (
                          <Link
                            href={EGRESOS}
                            className="mt-1 block text-caption text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                          >
                            {egresoDeLaFacturaEnPalabras(f.egreso)}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0">
                        {sePuedePagar(f) ? (
                          <AccionConMotivo
                            puede={escritura.puede}
                            motivo={escritura.motivo}
                            onClick={() => setPagando(f)}
                            testId={`cxp-pagar-${f.id}`}
                          >
                            <Money className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Pagar
                          </AccionConMotivo>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
      </div>

      {pagina && pagina.total > facturas.length ? (
        <p className="text-caption text-fg-muted">
          Se ven {facturas.length} de {pagina.total}. Las demás están en{' '}
          <Link href={GASTOS} className="underline">
            Gastos
          </Link>
          , con filtros.
        </p>
      ) : null}

      <PagarFactura
        factura={pagando}
        onCerrar={() => setPagando(null)}
        onPagada={() => {
          setPagando(null);
          void cargar();
          contar();
        }}
      />
    </section>
  );
}
