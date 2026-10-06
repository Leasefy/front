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

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarBlank, Receipt } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CuentasPorPagar } from '@/components/contabilidad/gastos/CuentasPorPagar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageGuard } from '@/components/auth/PageGuard';
import { NuevaFactura } from '@/components/facturacion/NuevaFactura';
import { ComoSeFactura } from '@/components/facturacion/ComoSeFactura';
import { FacturasEmitidas } from '@/components/facturacion/FacturasEmitidas';
import { ColaDeTransmision } from '@/components/facturacion/ColaDeTransmision';
// DIAN-FEEL (04-10-2026): el aviso dice qué le falta a ESTA inmobiliaria.
import { BannerDeLaDian } from '@/components/facturacion/EstadoAnteLaDian';
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
// AVISO-TIPO-DOC (05-10-2026): los propietarios cuyo documento frena la factura por mandato.
import { AvisoTipoDeDocumento } from '@/components/inmobiliaria/AvisoTipoDeDocumento';
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
   * DIAN-FEEL (04-10-2026): «Cargar la resolución» de Configuración →
   * Facturación llega con `?tab=resolucion`. Se lee del navegador al montar
   * (sin `useSearchParams`, que pediría un Suspense en la página).
   */
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('tab');
    if (pedida && esTab(pedida)) setActive(pedida);
  }, []);

  /*
   * El mes de los listados de documentos. «Ventas» y «Notas» leen
   * `GET /facturacion/emitidas?mes=`, que es por mes como todo lo demás de
   * facturación; las otras dos pestañas todavía no tienen de dónde leer.
   */
  const [mes, setMes] = useState(mesActual());
  const meses = mesesParaElegir();

  /*
   * 🔴 «Cargar la resolución» desde «Nueva factura» abre el cajón de carga, no
   * sólo la pestaña: mandar a una pantalla donde todavía hay que buscar el
   * botón es la mitad del camino (Nico, 21-09: «eso debería ser un CTA que
   * saque toda la información y ya funcione desde ahí»).
   */
  const [abrirCargaDeResolucion, setAbrirCargaDeResolucion] = useState(false);
  const bajarLaBandera = useCallback(() => setAbrirCargaDeResolucion(false), []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* «Cómo se factura» va a la derecha del título, donde iría la acción de
          la pantalla (Nico, 23-09): dentro de la tarjeta ocupaba una fila entera
          vacía a su izquierda. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
          <p className="text-body text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        <div className="shrink-0" data-testid="facturacion-como-funciona">
          <ComoSeFactura />
        </div>
      </header>

      {/* El aviso de lo que todavía no pasa con lo emitido: se numera, pero
          no se transmite a la DIAN. Sólo en Ventas y Notas, que es donde está
          lo emitido. 🔴 FA-06 (QA-FACT, 03-10): decía «Estructura lista — el
          motor DIAN llega en M2» (jerga interna) y «Compras todavía se lleva en
          Pagos» estando en Ventas; Compras ya lo dice en su propio vacío. */}
      {/* DIAN-FEEL (04-10-2026): con FEEL prendido y la inmobiliaria lista,
          desaparece; si no, dice qué le falta a ESTA inmobiliaria. Sin
          respuesta del back, el texto de siempre. */}
      {active === 'ventas' || active === 'notas' ? (
        <BannerDeLaDian
          textoDeAntes={{ titulo: t(k('m2BannerTitle')), descripcion: t(k('m2BannerDesc')) }}
        />
      ) : null}

      {/* AVISO-TIPO-DOC: en «Por facturar», el total de lo frenado por el
          documento del propietario y el camino a completarlo (cada fila frenada
          ya dice su motivo con «Completar en el propietario»). */}
      {active === 'nueva' ? <AvisoTipoDeDocumento /> : null}

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
                que emita nada, y ofrecerlo ahí sería un botón que no cumple.
                🔴 CB-R21 (04-10, Nico: «Proveedores: Una sola, en Gastos»): ya
                no abre el formulario del agente de pagos (guardaba la factura
                aparte, fuera del libro): lleva a Contabilidad → Gastos. */}
            {active === 'compras' && (
              <Button asChild hideArrow className="shrink-0" data-testid="facturacion-registrar-compra">
                <Link href="/panel/inmobiliaria/contabilidad/gastos">
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
              <NuevaFactura
                onIrAResolucion={() => {
                  setActive('resolucion');
                  setAbrirCargaDeResolucion(true);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="resolucion" className="mt-0">
            <div className="p-4">
              <ResolucionDeFacturacion
                abrirCarga={abrirCargaDeResolucion}
                onCargaAbierta={bajarLaBandera}
              />
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
              {/* 🔴 El mes es del DS y dice a qué lista gobierna, pegado a
                  ella (Nico, 21-09: «no estás usando los componentes de
                  cadence» y «el mes y la tabla deberían ser una sola cosa»).
                  Era un `<select>` crudo de 36 px con una etiqueta «Mes»
                  suelta encima de la tabla. */}
              <div className="space-y-0">
                <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-caption text-fg-muted">
                    {clave === 'ventas'
                      ? 'Las facturas que emitiste en el mes.'
                      : 'Las notas crédito y débito del mes.'}
                  </p>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger
                      className="w-56 gap-2"
                      aria-label={
                        clave === 'ventas'
                          ? 'Mes de las facturas emitidas'
                          : 'Mes de las notas'
                      }
                      data-testid="facturacion-mes-emitidas"
                    >
                      <CalendarBlank
                        className="h-4 w-4 shrink-0 text-fg-muted"
                        aria-hidden="true"
                      />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m} value={m}>
                          {mesLegible(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4">
                  <FacturasEmitidas mes={mes} vista={clave} />
                </div>
              </div>
            </TabsContent>
          ))}

          {/* 🔴 CB-R21 (04-10-2026, decidido con la recomendada): «Compras»
              muestra las facturas de proveedor de Contabilidad → Gastos —la
              única fuente, decisión de Nico—, las mismas de Pagos → cuentas
              por pagar. Antes era un vacío que mandaba a Pagos. */}
          <TabsContent value="compras" className="mt-0">
            <div className="p-4">
              <CuentasPorPagar conRegistrar={false} />
            </div>
          </TabsContent>
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
    // Nico (03-10-2026): Facturación es sólo de administrador y contador, también
    // en el back. A los demás, el cartel dice «No tienes acceso a Facturación».
    // FA-H-10 (QA-FACT-CONTA-95 r2): y con el permiso de `cobros` (lo que pide el
    // back en todas las rutas de facturación). Sin él, el contador veía la
    // pantalla entera con cada consulta en 403; ahora el cartel la cubre entera.
    <PageGuard module="cobros" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Facturación">
      <FacturacionContent />
    </PageGuard>
  );
}
