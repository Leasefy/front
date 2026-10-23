'use client';

/**
 * Las facturas de proveedor: la lista, registrar, causar y anular
 * (contrato del 18-09, §3).
 *
 * ── 🔴 Esto es lo que le falta al P&G para tener gastos propios ─────────────
 *
 * Hoy el libro sabe de lo que entra (recibos) y de lo que se le gira al
 * propietario (lotes de dispersión), y nada de lo que la inmobiliaria gasta en sí
 * misma. Por eso el P&G salía sin gastos. Cada factura registrada acá y CAUSADA
 * es una línea de la clase 5 del P&G y una fila del formato 1001 de la exógena.
 *
 * ── Registrada no es causada, y la diferencia importa ──────────────────────
 *
 * Una factura en BORRADOR existe en Leasefy y NO en el libro: no aparece en el
 * P&G, no aparece en la exógena, y el proveedor ya está esperando el pago. Por
 * eso el estado va en su propia columna con su badge, la lista arranca sin filtro
 * de estado, y la portada tiene una alerta que las cuenta.
 *
 * ── 🔴 Causar muestra el asiento que quedó ─────────────────────────────────
 *
 * Después de causar se pide el asiento y se muestran sus líneas. No es
 * decoración: es la única forma de que quien registró la factura vea a qué
 * cuentas fue, y de que descubra un mapeo mal hecho en la primera factura y no
 * en el cierre del mes. El contrato lo pide así.
 *
 * ── Anular reversa, nunca borra ────────────────────────────────────────────
 *
 * Con motivo, en un `AlertDialog` (nunca `confirm()` del navegador: ver
 * `components/ui/sin-dialogos-del-navegador.test.ts`). Y una factura PAGADA no se
 * anula: primero se anula el egreso, porque la plata ya salió del banco. La
 * pantalla lo dice en vez de dejar intentar.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowsClockwise, FileText, Money, Plus, Prohibit } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { RangoDeFechas } from '../RangoDeFechas';
type TonoDeCifra = 'aviso' | 'voltaje';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { TituloDeBloque } from '@/components/finanzas/piezas';
import {
  contabilidadApi,
  type AsientoContable,
  type CuentaPuc,
} from '@/lib/api/contabilidad.service';
import {
  facturacionElectronicaService,
} from '@/lib/api/facturacion-electronica.service';
import type { ProveedorNoObligado } from '@/lib/api/facturacion-electronica.service';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { RubroDelPresupuesto, Sede } from '@/lib/api/finanzas.types';
import {
  ESTADOS_DE_FACTURA,
  NOMBRE_DEL_ESTADO_DE_FACTURA,
  NOMBRE_DEL_TIPO_DE_FACTURA,
  gastosApi,
  type EstadoDeFacturaDeProveedor,
  type FacturaDeProveedor,
  type PaginaDeFacturas,
} from '@/lib/api/gastos.service';
import { diaDe, diaLegible } from '@/lib/contabilidad/fechas';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { Monto } from '../Monto';
import { AccionConMotivo, FaltaLaMigracion } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';
import { usePuedeRegistrar } from '../use-puede-registrar';
import { PagarFactura } from './PagarFactura';
import { egresoDeLaFacturaEnPalabras, sePuedePagar } from '@/lib/contabilidad/pagar-factura';
import { FormularioDeFactura } from './FormularioDeFactura';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/** El valor de «todas» en los `Select` del DS (Radix no acepta `''`). */
const TODOS = '__todos__';

const TONO_DEL_ESTADO: Record<
  EstadoDeFacturaDeProveedor,
  'secondary' | 'outline' | 'destructive' | 'default'
> = {
  BORRADOR: 'outline',
  CAUSADA: 'secondary',
  PAGADA: 'default',
  ANULADA: 'destructive',
};

/**
 * Los estados en la franja (glow up 21-10), con el nombre del trabajo que piden: una factura en
 * borrador está POR CAUSAR (no está en el libro) y una causada está POR PAGAR.
 */
const ESTADOS_EN_LA_FRANJA: { estado: EstadoDeFacturaDeProveedor; etiqueta: string; tono?: TonoDeCifra }[] = [
  { estado: 'BORRADOR', etiqueta: 'Por causar', tono: 'aviso' },
  { estado: 'CAUSADA', etiqueta: 'Por pagar', tono: 'voltaje' },
  { estado: 'PAGADA', etiqueta: 'Pagadas' },
  { estado: 'ANULADA', etiqueta: 'Anuladas' },
];

/** `?estado=` de la alerta de la portada. Lo que no exista no filtra nada. */
export function estadoDe(valor: string | null | undefined): EstadoDeFacturaDeProveedor | '' {
  return ESTADOS_DE_FACTURA.find((e) => e === valor) ?? '';
}

export function FacturasDeProveedor({
  estadoInicial = '',
  encabezado,
}: {
  estadoInicial?: EstadoDeFacturaDeProveedor | '';
  /**
   * El encabezado de la pantalla con la acción principal («Registrar una factura», con su
   * permiso y su motivo) a la derecha. Sin él, la acción va en el título del bloque.
   */
  encabezado?: (accionPrincipal: ReactNode) => ReactNode;
}) {
  const [pagina, setPagina] = useState<PaginaDeFacturas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState<EstadoDeFacturaDeProveedor | ''>(estadoInicial);
  const [rubroFiltro, setRubroFiltro] = useState('');

  /** Lo que el formulario necesita, cargado una vez. Un fallo no tumba la lista. */
  const [cuentas, setCuentas] = useState<CuentaPuc[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorNoObligado[]>([]);
  const [rubros, setRubros] = useState<RubroDelPresupuesto[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [causando, setCausando] = useState<string | null>(null);
  /** El asiento que quedó después de causar, para mostrarlo. */
  const [asiento, setAsiento] = useState<AsientoContable | null>(null);
  const [anulando, setAnulando] = useState<FacturaDeProveedor | null>(null);
  /** 🔴 CB-R21: la factura que se está mandando a pagar (cajón abierto). */
  const [pagando, setPagando] = useState<FacturaDeProveedor | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviandoAnulacion, setEnviandoAnulacion] = useState(false);

  const escritura = usePuedeEscribir();
  // El auxiliar contable registra (factura, causarla, su egreso) pero no anula.
  const registro = usePuedeRegistrar();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPagina(
        await gastosApi.facturas.listar({
          desde: desde || undefined,
          hasta: hasta || undefined,
          estado: estado || undefined,
          rubro: rubroFiltro || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, estado, rubroFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Después de causar, anular, registrar o pagar: la lista y los conteos de la franja. */
  const [version, setVersion] = useState(0);
  const releer = useCallback(async () => {
    setVersion((v) => v + 1);
    await cargar();
  }, [cargar]);

  /*
   * GLOW UP 21-10 · cuántas hay en cada estado, con su plata, para la franja que filtra: lo que
   * está por causar y lo que está por pagar es lo que pide trabajo. Un pedido chico por estado
   * (`limite: 1`, sólo se leen `total` y `totales`); el que falla deja su cifra en «—».
   */
  const [conteos, setConteos] = useState<Partial<Record<EstadoDeFacturaDeProveedor, { n: number; neto: number } | null>>>({});
  useEffect(() => {
    let vivo = true;
    void Promise.allSettled(
      ESTADOS_DE_FACTURA.map((e) =>
        gastosApi.facturas.listar({
          desde: desde || undefined,
          hasta: hasta || undefined,
          estado: e,
          rubro: rubroFiltro || undefined,
          limite: 1,
        }),
      ),
    ).then((rs) => {
      if (!vivo) return;
      const c: Partial<Record<EstadoDeFacturaDeProveedor, { n: number; neto: number } | null>> = {};
      rs.forEach((r, i) => {
        c[ESTADOS_DE_FACTURA[i]] =
          r.status === 'fulfilled' && r.value?.disponible
            ? { n: r.value.total, neto: r.value.totales?.netoCop ?? 0 }
            : null;
      });
      setConteos(c);
    });
    return () => {
      vivo = false;
    };
  }, [desde, hasta, rubroFiltro, version]);

  /*
   * Lo del formulario, en cuatro pedidos independientes. Si los proveedores no
   * cargan, el formulario sigue sirviendo con los datos a mano — que es
   * justamente el camino que el contrato deja abierto.
   */
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [c, p, r, s] = await Promise.allSettled([
        contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true }),
        facturacionElectronicaService.proveedores(),
        finanzasApi.rubros(),
        finanzasApi.sedes(),
      ]);
      if (!vivo) return;
      if (c.status === 'fulfilled') setCuentas(c.value);
      if (p.status === 'fulfilled') setProveedores(p.value.proveedores);
      if (r.status === 'fulfilled') setRubros(r.value.rubros);
      if (s.status === 'fulfilled') setSedes(s.value.sedes);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const causar = async (factura: FacturaDeProveedor) => {
    setCausando(factura.id);
    setAsiento(null);
    try {
      const causada = await gastosApi.facturas.causar(factura.id);
      toast.success(
        causada.asientoNumero
          ? `Causada con el asiento N.º ${causada.asientoNumero}.`
          : 'Factura causada.',
      );
      // 🔴 El asiento que quedó, para que se vea a qué cuentas fue.
      if (causada.asientoId) {
        try {
          setAsiento(await contabilidadApi.asientos.detalle(causada.asientoId));
        } catch {
          // El asiento existe aunque no se pueda mostrar: no se anuncia un fallo
          // que haría dudar de si la factura quedó causada.
          setAsiento(null);
        }
      }
      await releer();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo causar la factura.'));
    } finally {
      setCausando(null);
    }
  };

  const anular = async () => {
    if (!anulando) return;
    setEnviandoAnulacion(true);
    try {
      await gastosApi.facturas.anular(anulando.id, motivo.trim());
      toast.success('Factura anulada. Su asiento quedó reversado, no borrado.');
      setAnulando(null);
      setMotivo('');
      await releer();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo anular la factura.'));
    } finally {
      setEnviandoAnulacion(false);
    }
  };

  /** Qué se puede hacer con una factura según su estado, con su motivo. */
  const permisosBase = (f: FacturaDeProveedor) => {
    if (!registro.puede) {
      return { causar: { puede: false, motivo: registro.motivo }, anular: { puede: false, motivo: escritura.motivo } };
    }
    if (f.estado === 'ANULADA') {
      const m = 'Esta factura está anulada.';
      return { causar: { puede: false, motivo: m }, anular: { puede: false, motivo: m } };
    }
    if (f.estado === 'PAGADA') {
      return {
        causar: { puede: false, motivo: 'Ya está causada y pagada.' },
        anular: {
          puede: false,
          motivo:
            'Esta factura ya se pagó: la plata salió del banco. Anula primero el egreso, que reversa el pago.',
        },
      };
    }
    if (f.estado === 'CAUSADA') {
      return {
        causar: { puede: false, motivo: `Ya está causada${f.asientoNumero ? ` (asiento N.º ${f.asientoNumero})` : ''}.` },
        anular: { puede: true, motivo: null },
      };
    }
    return { causar: { puede: true, motivo: null }, anular: { puede: true, motivo: null } };
  };
  /** El auxiliar contable causa pero no anula: «anular» sigue la regla de escritura. */
  const permisos = (f: FacturaDeProveedor) => {
    const p = permisosBase(f);
    return escritura.puede ? p : { ...p, anular: { puede: false, motivo: escritura.motivo } };
  };

  const totales = pagina?.totales;
  const sinCausar = useMemo(
    () => (pagina?.facturas ?? []).filter((f) => f.estado === 'BORRADOR').length,
    [pagina],
  );

  if (cargando && !pagina) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Cargando las facturas…</span>
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-3.5 w-40 rounded-sm bg-surface-muted" />
          <Skeleton className="h-9 w-56 rounded-sm bg-surface-muted" />
          <Skeleton className="h-2 w-full rounded-full bg-surface-muted" />
        </div>
        <div className="divide-y divide-border rounded-lg border border-border" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-4 flex-1 rounded-sm bg-surface-muted" />
              <Skeleton className="h-4 w-24 rounded-sm bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error || !pagina) {
    return <FalloDeCarga error={error} queEs="las facturas de proveedor" onReintentar={cargar} />;
  }

  // Sin la migración 50 no hay tabla `facturas_de_proveedor`.
  if (!pagina.disponible) {
    return (
      <FaltaLaMigracion
        motivo={pagina.motivo}
        queSeEspera="registrar facturas de proveedor"
        mientrasTanto="Mientras no esté, el P&G sale sin los gastos propios de la inmobiliaria y lo dice en sus avisos."
        testId="facturas-sin-migracion"
      />
    );
  }

  /** «Todas»: la suma de los estados si se pudieron contar todos; si no, el total de la lista. */
  const conteoTotal = ESTADOS_DE_FACTURA.every((e) => conteos[e])
    ? ESTADOS_DE_FACTURA.reduce((t, e) => t + (conteos[e]?.n ?? 0), 0)
    : estado === ''
      ? pagina.total
      : null;

  // GLOW UP 3.ª vuelta · LA RESPUESTA: lo que falta causar y pagar, de lo que se facturó en el
  // período (con los conteos por estado que ya se piden; sin ellos, no se inventa la cifra).
  const porCausar = conteos.BORRADOR;
  const porPagar = conteos.CAUSADA;
  const pagadas = conteos.PAGADA;
  const hayRespuesta = Boolean(porCausar && porPagar && pagadas);
  const falta = (porCausar?.neto ?? 0) + (porPagar?.neto ?? 0);
  const facturado = falta + (pagadas?.neto ?? 0);
  const cifras = localeDeLasCifras();
  const notaSinCausar =
    sinCausar > 0 ? (
      <span data-testid="nota-sin-causar">
        {sinCausar === 1
          ? 'Hay 1 factura en borrador: no está en el libro.'
          : `Hay ${sinCausar} facturas en borrador: no están en el libro.`}{' '}
        Una factura sin causar no aparece en el P&G ni en la exógena, y el proveedor ya está
        esperando el pago.
      </span>
    ) : null;

  const accionRegistrar = (
    <AccionConMotivo
              puede={registro.puede}
              motivo={registro.motivo}
              onClick={() => setFormularioAbierto(true)}
              variant="default"
              testId="abrir-formulario-de-factura"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Registrar una factura
            </AccionConMotivo>
  );

  return (
    <div className="space-y-6" data-testid="facturas-de-proveedor">
      {/* 🔴 CB-17: la explicación la dice la cabecera de la pantalla, una vez. GLOW UP 21-10: la
          acción principal («Registrar una factura») va en el encabezado, a la derecha. */}
      {encabezado ? (
        encabezado(accionRegistrar)
      ) : (
        <TituloDeBloque titulo="Facturas de proveedor" accion={accionRegistrar} />
      )}

      {hayRespuesta ? (
        <CifraHeroe
          rotulo="Falta causar y pagar"
          cifra={<Monto valor={falta} />}
          contexto={
            <>
              en {((porCausar?.n ?? 0) + (porPagar?.n ?? 0)).toLocaleString(cifras)}{' '}
              {(porCausar?.n ?? 0) + (porPagar?.n ?? 0) === 1 ? 'factura' : 'facturas'}, de{' '}
              <Monto valor={facturado} /> facturados
            </>
          }
          total={facturado}
          // C3 (revisora r25): sin facturas, UNA línea y no «$ 0» con tres tramos en cero.
          cuandoEsCero="Todavía no hay facturas de proveedores en este período."
          tramos={[
            { clave: 'pagadas', etiqueta: `Pagadas · ${(pagadas?.n ?? 0).toLocaleString(cifras)}`, monto: pagadas?.neto ?? 0, tono: 'exito', cifra: <Monto valor={pagadas?.neto ?? 0} /> },
            { clave: 'por-pagar', etiqueta: `Por pagar · ${(porPagar?.n ?? 0).toLocaleString(cifras)}`, monto: porPagar?.neto ?? 0, tono: 'neutro', cifra: <Monto valor={porPagar?.neto ?? 0} /> },
            { clave: 'por-causar', etiqueta: `Por causar · ${(porCausar?.n ?? 0).toLocaleString(cifras)}`, monto: porCausar?.neto ?? 0, tono: 'aviso', cifra: <Monto valor={porCausar?.neto ?? 0} /> },
          ]}
          pie={notaSinCausar}
          data-testid="cifra-de-los-gastos"
        />
      ) : null}

      {/* ═══ GLOW UP 21-10 · el trabajo de esta pantalla: registrar la factura de un proveedor,
          causarla (que quede en el libro) y pagarla. Antes eran cuatro bloques sueltos —filtros,
          totales, nota y lista— con el estado en un desplegable. Ahora es UNA tarjeta: arriba los
          estados con su plata (lo que está por causar y por pagar es lo que pide trabajo), cada
          uno filtra; debajo fechas y rubro; la lista; y los totales del filtro al pie. */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 pt-4 pb-3">
          <PestanasDeEstado
            etiqueta="Filtrar por estado"
            data-testid="estados-de-las-facturas"
            valor={estado === '' ? 'TODAS' : estado}
            onCambio={(v) => setEstado(v === 'TODAS' ? '' : (v as EstadoDeFacturaDeProveedor))}
            pestanas={[
              { valor: 'TODAS', etiqueta: 'Todas', cuantos: conteoTotal, fija: true },
              ...ESTADOS_EN_LA_FRANJA.map(({ estado: e, etiqueta, tono }) => ({
                valor: e as EstadoDeFacturaDeProveedor | 'TODAS',
                etiqueta,
                cuantos: conteos[e] ? conteos[e]!.n : null,
                fija: true,
                tono: conteos[e] && conteos[e]!.n > 0 && tono === 'aviso' ? ('aviso' as const) : undefined,
                testid: `estado-${e.toLowerCase()}`,
              })),
            ]}
          />
          {/* Sin los conteos no hay cifra arriba: la nota del borrador va aquí, junto a la lista. */}
          {!hayRespuesta && notaSinCausar ? (
            <p className="mt-2 text-caption text-warning">{notaSinCausar}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {/* El período, con los mismos atajos del libro y los informes (antes, dos campos «Sin
            fecha» sin decir cuál era cuál). */}
        <div className="min-w-0">
          <RangoDeFechas
            atajos
            desde={desde}
            hasta={hasta}
            onChange={(r) => {
              setDesde(r.desde);
              setHasta(r.hasta);
            }}
          />
        </div>
        <div className="w-[200px]">
          <Label id="facturas-rubro" className="sr-only">Rubro</Label>
          <Select
            value={rubroFiltro || TODOS}
            onValueChange={(v) => setRubroFiltro(v === TODOS ? '' : v)}
          >
            <SelectTrigger aria-labelledby="facturas-rubro" data-testid="filtro-rubro">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los rubros</SelectItem>
              {rubros.map((r) => (
                <SelectItem key={r.rubro} value={r.rubro}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>

        {pagina.facturas.length === 0 ? (
          <SinDatos
            hayFiltros={Boolean(desde || hasta || estado || rubroFiltro)}
            queSon="facturas"
            ilustracion="billetera"
            titulo="Todavía no hay facturas de proveedor"
            descripcion="Registra la primera (el contador, la luz de la oficina, una cerradura), cáusala para que quede en el libro y págala: el pago sale por Egresos, con la firma de otra persona."
            // Ronda 26 (revisora r25, Gastos UI): el azul ya es «Registrar una factura» del encabezado; el vacío
            // lleva la suya en arena (antes dos azules iguales).
            accion={
              registro.puede ? (
                <Button size="sm" variant="secondary" hideArrow onClick={() => setFormularioAbierto(true)}>
                  Registrar la primera
                </Button>
              ) : undefined
            }
            onLimpiarFiltros={() => {
              setDesde('');
              setHasta('');
              setEstado('');
              setRubroFiltro('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Se le paga</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBodyAnimado className="max-md:block">
                {pagina.facturas.map((f) => {
                  const p = permisos(f);
                  return (
                    <TableRowAnimada
                      key={f.id}
                      data-testid={`factura-${f.id}`}
                      className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                    >
                      <TableCell className="whitespace-nowrap max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0">
                        <p className="font-mono text-caption text-fg">
                          {f.prefijoDelProveedor ? `${f.prefijoDelProveedor}-` : ''}
                          {f.numeroDelProveedor}
                        </p>
                        <p className="text-caption text-fg-muted">
                          {NOMBRE_DEL_TIPO_DE_FACTURA[f.tipo]}
                        </p>
                      </TableCell>
                      {/* CB-17: la tabla no cabía a 1440 (las acciones se cortaban):
                          columnas de texto más angostas y la fecha corta de la casa. */}
                      <TableCell className="max-w-[14rem] max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0">
                        <p className="truncate text-sm text-fg" title={f.proveedorNombre}>
                          {f.proveedorNombre}
                        </p>
                        <p className="text-caption text-fg-muted">
                          {f.proveedorDocumento ?? 'sin documento'}
                          {f.proveedorId === null ? ' · escrito a mano' : ''}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-caption text-fg-muted max-md:col-start-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-right">
                        {fechaCorta(diaDe(f.fecha))}
                      </TableCell>
                      <TableCell className="max-w-[14rem] max-md:col-start-1 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
                        <p className="truncate text-sm text-fg" title={f.concepto}>
                          {f.concepto}
                        </p>
                        {f.rubro ? (
                          <p className="text-caption text-fg-muted">{f.rubro}</p>
                        ) : null}
                        {f.motivoDeLaAnulacion ? (
                          <p className="text-caption text-danger">
                            Anulada: {f.motivoDeLaAnulacion}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right max-md:hidden">
                        <Monto valor={f.totalCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="text-right max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                        <Monto valor={f.netoCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                        <Badge variant={TONO_DEL_ESTADO[f.estado]}>
                          {NOMBRE_DEL_ESTADO_DE_FACTURA[f.estado]}
                        </Badge>
                        {f.asientoNumero ? (
                          <p className="mt-1 text-caption text-fg-muted">
                            Asiento N.º {f.asientoNumero}
                          </p>
                        ) : null}
                        {f.egreso ? (
                          <Link
                            href="/panel/inmobiliaria/contabilidad/egresos"
                            className="mt-1 block text-caption text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                            data-testid={`egreso-de-${f.id}`}
                          >
                            {egresoDeLaFacturaEnPalabras(f.egreso)}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-md:col-span-2 max-md:row-start-4 max-md:block max-md:p-0">
                        <div className="flex flex-wrap gap-2">
                          <AccionConMotivo
                            puede={p.causar.puede}
                            motivo={p.causar.motivo}
                            ocupado={causando === f.id}
                            textoOcupado="Causando…"
                            onClick={() => void causar(f)}
                            testId={`causar-${f.id}`}
                          >
                            <ArrowsClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Causar
                          </AccionConMotivo>
                          <AccionConMotivo
                            puede={p.anular.puede}
                            motivo={p.anular.motivo}
                            onClick={() => {
                              setAnulando(f);
                              setMotivo('');
                            }}
                            testId={`anular-${f.id}`}
                          >
                            <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Anular
                          </AccionConMotivo>
                          {/* 🔴 CB-R21: pagar la causada crea SU egreso (Egresos → lote → doble firma). */}
                          {sePuedePagar(f) ? (
                            <AccionConMotivo
                              puede={registro.puede}
                              motivo={registro.motivo}
                              onClick={() => setPagando(f)}
                              testId={`pagar-${f.id}`}
                            >
                              <Money className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Pagar
                            </AccionConMotivo>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRowAnimada>
                  );
                })}
              </TableBodyAnimado>
            </Table>
          </div>
        )}

        {/* Los totales del filtro, al pie de la lista (antes, una tarjeta aparte arriba). */}
        {totales && pagina.total > 0 ? (
          <dl
            className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-border bg-surface-muted/40 px-4 py-3"
            aria-label="Totales de las facturas del filtro"
            data-testid="totales-de-facturas"
          >
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">Facturas</dt>
              <dd className="font-mono text-sm tabular-nums text-fg">
                {pagina.total.toLocaleString(localeDeLasCifras())}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">Subtotal</dt>
              <dd><Monto valor={totales.subtotalCop} className="text-sm" /></dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">IVA</dt>
              <dd><Monto valor={totales.ivaCop} className="text-sm" /></dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">Retenciones</dt>
              <dd><Monto valor={totales.retencionesCop} className="text-sm" /></dd>
            </div>
            <div className="ml-auto flex items-baseline gap-2">
              <dt className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-fg-subtle">Se les paga (neto)</dt>
              <dd><Monto valor={totales.netoCop} className="text-sm text-fg" /></dd>
            </div>
          </dl>
        ) : null}
      </section>

      {/* ── 🔴 El asiento que quedó ───────────────────────────────────── */}
      {asiento ? (
        <section
          className="space-y-3 rounded-lg border border-success/40 bg-success-soft p-4"
          data-testid="asiento-de-la-factura"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Asiento N.º {asiento.numero} · {diaLegible(asiento.fecha)}
            </h3>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="h-auto p-0 text-caption"
              onClick={() => setAsiento(null)}
              data-testid="cerrar-asiento"
            >
              Ocultar
            </Button>
          </div>
          <p className="text-caption text-fg-muted">{asiento.descripcion}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asiento.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap font-mono text-caption">
                      {m.cuenta ? `${m.cuenta.codigo} · ${m.cuenta.nombre}` : m.cuentaId}
                    </TableCell>
                    <TableCell className="text-caption text-fg-muted">
                      {m.descripcion ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Monto valor={m.debitoCop} vacioSiCero className="text-sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Monto valor={m.creditoCop} vacioSiCero className="text-sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-caption text-fg-muted">
            Si alguna cuenta no es la que esperabas, arreglala en el mapeo contable y reversá este
            asiento: un asiento no se edita.
          </p>
        </section>
      ) : null}

      <FormularioDeFactura
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        onRegistrada={(factura, seCauso) => {
          void releer();
          if (seCauso && factura.asientoId) {
            void contabilidadApi.asientos
              .detalle(factura.asientoId)
              .then(setAsiento)
              .catch(() => setAsiento(null));
          }
        }}
        cuentas={cuentas}
        proveedores={proveedores}
        rubros={rubros}
        sedes={sedes}
      />

      {/* Anular con motivo, en el diálogo del sistema de diseño. */}
      <AlertDialog
        open={anulando !== null}
        onOpenChange={(a) => {
          if (!a && !enviandoAnulacion) {
            setAnulando(null);
            setMotivo('');
          }
        }}
      >
        <AlertDialogContent
          variant="destructive"
          icon={<Prohibit weight="bold" />}
          data-testid="dialogo-de-anulacion"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Anular la factura {anulando?.prefijoDelProveedor ?? ''}
              {anulando?.numeroDelProveedor}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {anulando?.asientoNumero
                ? `El asiento N.º ${anulando.asientoNumero} se REVERSA con un asiento espejo: no se borra, y los dos quedan en el libro. `
                : 'La factura queda anulada —no se borra— y, como todavía no tiene asiento, no hay nada que reversar en el libro. '}
              El motivo se guarda con la anulación y lo va a leer el contador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-de-anulacion">Motivo</Label>
            <Textarea
              id="motivo-de-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Llegó repetida; el proveedor la reemplazó por la FE-4530."
              rows={3}
              data-testid="motivo-de-anulacion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoAnulacion}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Se cierra cuando el back contestó, no con el clic.
                e.preventDefault();
                void anular();
              }}
              disabled={motivo.trim().length === 0}
              loading={enviandoAnulacion}
              data-testid="confirmar-anulacion"
            >
              {enviandoAnulacion ? 'Anulando…' : 'Anular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PagarFactura
        factura={pagando}
        onCerrar={() => setPagando(null)}
        onPagada={() => {
          setPagando(null);
          void releer();
        }}
      />
    </div>
  );
}
