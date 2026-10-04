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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AccionConMotivo, FaltaLaMigracion, Nota } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';
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
  const escritura = usePuedeEscribir();
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

  const actual = VISTAS.find((v) => v.valor === vista)!;
  const facturas = pagina?.facturas ?? [];

  return (
    <section className="space-y-4" data-testid="cuentas-por-pagar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)}>
          <TabsList className="max-w-full overflow-x-auto">
            {VISTAS.map((v) => (
              <TabsTrigger key={v.valor} value={v.valor} data-testid={`cxp-vista-${v.valor}`}>
                {v.nombre}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {conRegistrar ? (
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href={GASTOS} data-testid="cxp-registrar-en-gastos">
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Registrar factura
            </Link>
          </Button>
        ) : null}
      </div>

      <Nota>
        Las facturas de proveedor se registran y se causan en Contabilidad, en Gastos. Aquí ves las
        causadas y las mandas a pagar: el pago queda en Egresos, donde se arma el lote y lo aprueba
        otra persona antes de girar.
      </Nota>

      {error ? (
        <FalloDeCarga error={error} queEs="las cuentas por pagar" onReintentar={cargar} />
      ) : cargando && !pagina ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : pagina && !pagina.disponible ? (
        <FaltaLaMigracion
          motivo={pagina.motivo}
          queSeEspera="ver las cuentas por pagar"
          mientrasTanto="Mientras no esté, las facturas de proveedor no se pueden registrar ni pagar desde Leasefy."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
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
            <TableBody>
              {facturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-fg-muted">
                    {actual.vacio}
                  </TableCell>
                </TableRow>
              ) : (
                facturas.map((f) => {
                  const estado = estadoDePago(f, dia);
                  return (
                    <TableRow key={f.id} data-testid={`cxp-fila-${f.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium text-fg">{f.proveedorNombre}</p>
                        <p className="text-caption text-fg-muted">{f.concepto}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <p>{numeroDeLaFactura(f) || 'Sin número'}</p>
                        <p className="text-caption text-fg-muted">{diaLegible(f.fecha)}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {f.fechaDeVencimiento ? diaLegible(f.fechaDeVencimiento) : 'Sin fecha'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Monto valor={f.netoCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
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
                      <TableCell>
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
        }}
      />
    </section>
  );
}
