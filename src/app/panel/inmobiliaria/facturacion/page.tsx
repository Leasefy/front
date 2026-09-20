'use client';

/**
 * Facturación — la estructura del módulo, con el motor DIAN todavía por
 * llegar (M2).
 *
 * Nico (2026-09-03): «esas tabs ¿por qué están fuera de la tabla? sabes que
 * deben quedar dentro». Las pestañas son la primera fila de la tarjeta de la
 * tabla, como el buscador y el filtro de Inquilinos. Lo que había además y se
 * fue:
 *   - una leyenda de estados (Aceptada DIAN · Pendiente · …) que no filtraba
 *     nada: ningún control dibujado sin comportamiento;
 *   - una franja con icono y descripción por pestaña: la descripción vive en
 *     el vacío de cada pestaña, que es donde hace falta leerla;
 *   - «Nueva factura», que sólo mostraba un toast «llega con M2»: oculto
 *     hasta que emita de verdad. El banner ya dice que el motor no está.
 *
 * Todavía no hay servicio de facturación (`facturacion.types.ts` es el
 * contrato que M2 implementará), así que la tabla no tiene de dónde sacar
 * filas: encabezados reales y vacío honesto en el cuerpo, sin datos
 * inventados. La paginación entra con el servicio (`useTablePagination` +
 * `TablePagination`, como en Solicitudes): sin filas nunca se pintaría.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Info, Receipt } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageGuard } from '@/components/auth/PageGuard';
import { SinDatos } from '@/components/estado/SinDatos';
import { NuevaFactura } from '@/components/facturacion/NuevaFactura';
import { FacturasEmitidas } from '@/components/facturacion/FacturasEmitidas';
import { ColaDeTransmision } from '@/components/facturacion/ColaDeTransmision';
import { EntregasYAcuse } from '@/components/facturacion/EntregasYAcuse';
import { DocumentoSoporte } from '@/components/facturacion/DocumentoSoporte';
import { CertificacionDelMandatario } from '@/components/facturacion/CertificacionDelMandatario';
import { TercerosSinCorreo } from '@/components/facturacion/TercerosSinCorreo';
import {
  mesActual,
  mesesParaElegir,
  mesLegible,
} from '@/lib/api/facturacion-por-mes.service';
import { ResolucionDeFacturacion } from '@/components/facturacion/ResolucionDeFacturacion';
import type { FacturacionTab } from '@/lib/api/facturacion.types';

interface TabDef {
  key: FacturacionTab;
  /** Sufijos de clave bajo `inmobiliaria.facturacion`. */
  columns: readonly string[];
}

/** Las columnas salen del contrato de `facturacion.types.ts`, no de un boceto. */
const TABS: readonly TabDef[] = [
  {
    key: 'ventas',
    columns: ['colNumero', 'colTercero', 'colConcepto', 'colFecha', 'colSubtotal', 'colIva', 'colTotal', 'colPago', 'colDian'],
  },
  {
    key: 'compras',
    columns: ['colNumero', 'colProveedor', 'colConcepto', 'colFecha', 'colTotal', 'colVence', 'colPago'],
  },
  {
    key: 'electronica',
    columns: ['colTipo', 'colNumero', 'colCufe', 'colTercero', 'colFecha', 'colTotal', 'colDian'],
  },
  {
    key: 'notas',
    columns: ['colTipo', 'colNumero', 'colFacturaRef', 'colMotivo', 'colValor', 'colFecha', 'colDian'],
  },
];

/**
 * 🔴 «Nueva factura» es una pestaña más, y es la PRIMERA.
 *
 * Nico (2026-09-12): «En el módulo de facturación debe tener la pestaña de
 * nueva factura y permitir seleccionar por mes de facturación.» Antes había un
 * botón «Nueva factura» que sólo mostraba un toast «llega con M2»; se había
 * ocultado justamente por eso. Ahora existe de verdad y no es un botón: es
 * donde se factura el mes.
 *
 * NO entra en `FacturacionTab` (el contrato de tipos del motor DIAN, que
 * describe cuatro listados de documentos ya emitidos). Esta pestaña no lista
 * documentos: calcula los que faltan por emitir.
 */
/**
 * «Resolución» tampoco entra en `FacturacionTab`: no lista documentos, guarda
 * el permiso de la DIAN con el que se numeran. Vive acá y no en Configuración →
 * Facturación porque ésa es la suscripción a Leasefy (lo que la inmobiliaria
 * nos paga) y ésta es la autorización con la que ella le factura a sus
 * clientes: dos cosas que se llaman igual y no son lo mismo. Toda esta pantalla
 * ya está detrás de ADMIN y CONTADOR, que son los dos roles que pueden tocarlo.
 */
/**
 * 🔴 Y tres pestañas más con la facturación electrónica (17-09-2026), por lo
 * mismo que «Nueva factura» y «Resolución»: no listan documentos de
 * `FacturacionTab`, hacen otra cosa.
 *
 *   · `soporte` — el documento soporte de los proveedores que no facturan.
 *   · `mandato` — la certificación del mandatario (lo que cada propietario
 *     necesita para declarar) y los terceros a los que les falta el correo.
 *
 * «Electrónica (DIAN)» sí es de `FacturacionTab` y ahora tiene de dónde leer:
 * la cola de transmisión y las entregas.
 */
type PestanaDeFacturacion =
  | FacturacionTab
  | 'nueva'
  | 'resolucion'
  | 'soporte'
  | 'mandato';

const esTab = (v: string): v is PestanaDeFacturacion =>
  v === 'nueva' ||
  v === 'resolucion' ||
  v === 'soporte' ||
  v === 'mandato' ||
  TABS.some((x) => x.key === v);

function FacturacionContent() {
  const { t } = useI18n();
  const [active, setActive] = useState<PestanaDeFacturacion>('nueva');
  const k = (suffix: string) => `inmobiliaria.facturacion.${suffix}`;

  /*
   * El mes de los listados de documentos. «Ventas» y «Notas» leen
   * `GET /facturacion/emitidas?mes=`, que es por mes como todo lo demás de
   * facturación; las otras dos pestañas todavía no tienen de dónde leer.
   */
  const [mes, setMes] = useState(mesActual());
  const meses = mesesParaElegir();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-2">
        <SectionLabel>{t(k('label'))}</SectionLabel>
        <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
        <p className="text-body text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
      </header>

      {/* Banner del M2, tal cual estaba: no es de esta pantalla decidir cuándo
          llega el motor. Se calla en «Nueva factura» porque ahí sí hay motor
          —lo que falta es el IVA y la numeración DIAN— y esa pestaña lo dice
          con sus propias palabras: dos avisos distintos sobre lo mismo, uno
          encima del otro, no los lee nadie. */}
      {active === 'ventas' || active === 'compras' || active === 'notas' ? (
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>
      ) : null}

      {/* UNA tarjeta: pestañas arriba, tabla debajo. Sin título encima. */}
      <Tabs
        value={active}
        onValueChange={(v) => {
          if (esTab(v)) setActive(v);
        }}
      >
        {/* 🔴 `overflow-x-clip`, NO `overflow-hidden`.
            `overflow: hidden` convierte a esta tarjeta en el contenedor de
            desplazamiento más cercano, y eso MATA cualquier `position: sticky`
            de adentro: la barra de acciones masivas del pie de «Nueva factura»
            quedaba dibujada a 2.889 px, fuera de la pantalla, en vez de pegada
            al borde de abajo. `overflow-x: clip` recorta igual contra las
            esquinas redondeadas pero no crea contenedor de desplazamiento, así
            que lo pegajoso vuelve a medirse contra la ventana. */}
        <section
          className="rounded-lg border border-border bg-surface overflow-x-clip"
          data-testid="facturacion-tarjeta"
        >
          <div className="border-b border-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="segmented" aria-label={t(k('title'))} className="justify-start">
              <TabsTrigger value="nueva" className="whitespace-nowrap">
                {t(k('tab_nueva'))}
              </TabsTrigger>
              {TABS.map((x) => (
                <TabsTrigger key={x.key} value={x.key} className="whitespace-nowrap">
                  {t(k(`tab_${x.key}`))}
                </TabsTrigger>
              ))}
              <TabsTrigger value="soporte" className="whitespace-nowrap">
                {t(k('tab_soporte'))}
              </TabsTrigger>
              <TabsTrigger value="mandato" className="whitespace-nowrap">
                {t(k('tab_mandato'))}
              </TabsTrigger>
              <TabsTrigger value="resolucion" className="whitespace-nowrap">
                {t(k('tab_resolucion'))}
              </TabsTrigger>
            </TabsList>

            {/* La ÚNICA puerta para registrar una factura de proveedor.
                Nico (2026-09-08): «¿por qué existe registrar factura si tenemos
                una sección dedicada a facturación?». Estaba en dos pantallas de
                Pagos —el encabezado del Resumen y Liquidaciones— y en ninguna
                de las dos era el tema. La pantalla que abre (`pagos/cxp/nueva`,
                lectura de la foto o el PDF con IA) no cambió: cambió de dónde
                se entra. Sólo en «Compras»: en Ventas todavía no hay motor DIAN
                que emita nada, y ofrecerlo ahí sería un botón que no cumple. */}
            {active === 'compras' && (
              <Button asChild hideArrow className="shrink-0" data-testid="facturacion-registrar-compra">
                <Link href="/panel/inmobiliaria/pagos/cxp/nueva">
                  <Receipt className="h-4 w-4" weight="bold" />
                  {t(k('registrarCompra'))}
                </Link>
              </Button>
            )}
          </div>

          <TabsContent value="nueva" className="mt-0">
            <div className="p-4">
              {/* La pestaña es estado local: sin el callback, «Cargar la
                  resolución» sería un texto que dice a dónde ir sin llevar. */}
              <NuevaFactura onIrAResolucion={() => setActive('resolucion')} />
            </div>
          </TabsContent>

          <TabsContent value="resolucion" className="mt-0">
            <div className="p-4">
              <ResolucionDeFacturacion />
            </div>
          </TabsContent>

          {/* 🔴 «Electrónica (DIAN)» ya no es un vacío honesto: es la cola de
              transmisión y las entregas. Las dos van juntas porque responden la
              misma pregunta —«¿este documento existe ante la DIAN y le llegó al
              cliente?»— y son dos estados distintos: se puede estar aceptado
              por la DIAN y sin entregar. */}
          <TabsContent value="electronica" className="mt-0">
            <div className="space-y-6 p-4">
              <ColaDeTransmision />
              <EntregasYAcuse />
            </div>
          </TabsContent>

          <TabsContent value="soporte" className="mt-0">
            <div className="p-4">
              <DocumentoSoporte />
            </div>
          </TabsContent>

          <TabsContent value="mandato" className="mt-0">
            <div className="space-y-6 p-4">
              <CertificacionDelMandatario />
              <TercerosSinCorreo />
            </div>
          </TabsContent>

          {/* 🔴 «Ventas» y «Notas» YA tienen de dónde leer.
              F4 de la auditoría del 13-09: estas pestañas decían «todavía no
              tienes facturas de venta» después de emitir 800, porque no había
              ninguna ruta que listara lo emitido. Ahora existe
              `GET /facturacion/emitidas`, y con ella la anulación por NOTA
              CRÉDITO (decisión de negocio de Nico del 15-09: una factura
              emitida no se borra, se netea con otro documento). «Compras» y
              «Electrónica» siguen con su vacío honesto: esas sí dependen del
              motor DIAN. */}
          {(['ventas', 'notas'] as const).map((clave) => (
            <TabsContent key={clave} value={clave} className="mt-0">
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="facturacion-mes-emitidas"
                    className="text-caption text-fg-muted"
                  >
                    Mes
                  </label>
                  <select
                    id="facturacion-mes-emitidas"
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    data-testid="facturacion-mes-emitidas"
                  >
                    {meses.map((m) => (
                      <option key={m} value={m}>
                        {mesLegible(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <FacturasEmitidas mes={mes} vista={clave} />
              </div>
            </TabsContent>
          ))}

          {/* 🔴 «Compras» es la ÚNICA pestaña que sigue sin listado propio: las
              facturas de proveedor viven en Pagos → cuentas por pagar. Las
              otras tres que estaban acá («Electrónica», y ahora «Documento
              soporte» y «Mandato») ya tienen motor y pintan sus propias
              tablas. */}
          {TABS.filter((x) => x.key === 'compras').map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tab.columns.map((c) => (
                      <TableHead key={c} className="whitespace-nowrap">
                        {t(k(c))}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* El vacío vive dentro del cuerpo para que los encabezados
                      se sigan viendo.

                      🔴 F4 (auditoría 13-09): decía «Todavía no tienes facturas
                      de compra» sobre un listado que no puede leer. Una
                      pantalla que no puede leer no afirma nada sobre los datos
                      de la persona: dice dónde están de verdad. */}
                  <TableRow>
                    <TableCell colSpan={tab.columns.length} className="p-0">
                      <SinDatos
                        queSon={t(k('queSon_compras'))}
                        icono={Receipt}
                        titulo="Este listado todavía no trae tus compras"
                        descripcion={`${t(k('desc_compras'))} Las facturas de proveedor que registras quedan en Pagos, en cuentas por pagar. ${t(k('registrarCompraDesc'))}`}
                        accion={
                          <Button asChild variant="outline" hideArrow data-testid="facturacion-ir-a-cxp">
                            <Link href="/panel/inmobiliaria/pagos/cxp">Ver cuentas por pagar</Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </section>
      </Tabs>
    </div>
  );
}

export default function FacturacionPage() {
  // Antes era `adminOnly`. Al mudar acá la única puerta para registrar una
  // factura de proveedor, dejarla sólo para administradores le quitaba al
  // CONTADOR algo que sí podía hacer desde Liquidaciones — y el contador es
  // justamente quien factura. Mismo par de roles que /pagos.
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <FacturacionContent />
    </PageGuard>
  );
}
