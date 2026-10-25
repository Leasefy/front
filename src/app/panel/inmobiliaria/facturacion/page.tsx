'use client';

/**
 * Facturación — `/panel/inmobiliaria/facturacion`.
 *
 * ── GLOW UP (Nico, 20-10-2026) ─────────────────────────────────────────────
 * «Nuestros usuarios no están comprendiendo bien la UX […] qué requiere hacer
 * primero el usuario y segundo etc.. hasta que complete el job to be done».
 * Facturación tenía OCHO pestañas del mismo peso —Por facturar, Ventas,
 * Compras, Electrónica, Notas, Documento soporte, Mandato y correos,
 * Resolución— y lo que hay que dejar listo antes de facturar estaba repartido
 * entre cuatro de ellas (el aviso de la resolución salía tres veces).
 *
 * Ahora la pantalla se lee de arriba abajo, en el orden en que se trabaja:
 *   1. el encabezado dice qué es y deja a la mano lo que se hace: la ayuda,
 *      «Resolución y numeración» y la acción principal de la pestaña;
 *   2. «Para facturar te faltan N pasos» junta lo que se arregla UNA vez
 *      (`LoQueNecesitasParaFacturar`), cada cosa con su botón;
 *   3. la tarjeta del trabajo, con CINCO pestañas por lo que se viene a hacer:
 *      Por facturar · Emitidas (facturas | notas) · Electrónica (DIAN) ·
 *      Compras (de proveedores | documento soporte) · Certificados.
 *
 * La resolución dejó de ser una pestaña (se toca una vez al año): se carga
 * desde un cajón que se abre ahí donde haga falta —la lista de arriba, el pie
 * de «Por facturar»— y se administra en su vista, con «Volver a la
 * facturación». `?tab=resolucion` (el enlace de Configuración) sigue llegando.
 *
 * Lo que cada pestaña hace por dentro NO cambió: son los mismos componentes.
 *
 * ── De antes (sigue valiendo) ──────────────────────────────────────────────
 * - Las pestañas viven DENTRO de la tarjeta de la tabla (Nico, 03-09).
 * - «Cómo se factura» va en el encabezado, fuera de la tarjeta (Nico, 23-09).
 * - La tarjeta recorta con `overflow-x-clip`, nunca `overflow-hidden`: el pie
 *   pegajoso de «Por facturar» se mide contra la ventana (19-09).
 * - «Compras» lista las facturas de proveedor de Contabilidad → Gastos, la
 *   única fuente (CB-R21, 04-10), y registrar una lleva allá.
 * - Sólo administrador y contador, con el permiso de `cobros` (03-10).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarBlank, Receipt, Stamp } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
import { Button } from '@/components/ui/button';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import { CuentasPorPagar } from '@/components/contabilidad/gastos/CuentasPorPagar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
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
import { LoQueNecesitasParaFacturar } from '@/components/facturacion/LoQueNecesitasParaFacturar';
import { CajonDeLaResolucion } from '@/components/facturacion/CajonDeLaResolucion';
import {
  facturacionPorMesService,
  mesActual,
  mesesParaElegir,
  mesLegible,
  type ResolucionesDeLaAgencia,
} from '@/lib/api/facturacion-por-mes.service';
import { ResolucionDeFacturacion } from '@/components/facturacion/ResolucionDeFacturacion';
import type { FacturacionTab } from '@/lib/api/facturacion.types';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/**
 * Lo que la pantalla puede estar mostrando. Son los mismos ocho de siempre
 * (los enlaces con `?tab=` siguen llegando); lo que cambió es cómo se agrupan
 * en las pestañas (`grupoDe`).
 */
type PestanaDeFacturacion = FacturacionTab | 'nueva' | 'resolucion' | 'soporte' | 'mandato';

/** Las cinco pestañas de la tarjeta. */
type Grupo = 'nueva' | 'ventas' | 'electronica' | 'compras' | 'mandato';

const VALORES: readonly PestanaDeFacturacion[] = [
  'nueva',
  'ventas',
  'notas',
  'electronica',
  'compras',
  'soporte',
  'mandato',
  'resolucion',
];

const esTab = (v: string): v is PestanaDeFacturacion =>
  (VALORES as readonly string[]).includes(v);

/** En qué pestaña vive cada vista. `resolucion` no tiene: es su propia vista. */
function grupoDe(p: PestanaDeFacturacion): Grupo {
  if (p === 'notas') return 'ventas';
  if (p === 'soporte') return 'compras';
  if (p === 'resolucion') return 'nueva';
  return p;
}

function FacturacionContent() {
  const { t } = useI18n();
  const tr = useTr();
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

  /* El mes de los listados de lo emitido (Ventas y Notas). */
  const [mes, setMes] = useState(mesActual());
  const meses = mesesParaElegir();

  /*
   * 🔴 El cajón de cargar la resolución vive en la PÁGINA: lo abren la lista
   * de arriba y el pie de «Por facturar» sin cambiar de vista (Nico, 21-09:
   * «eso debería ser un CTA que saque toda la información y ya funcione desde
   * ahí»). Al cargarla se vuelve a leer todo lo que depende de ella.
   */
  const [cajonDeResolucion, setCajonDeResolucion] = useState(false);
  const [resoluciones, setResoluciones] = useState<ResolucionesDeLaAgencia | null>(null);
  const [version, setVersion] = useState(0);
  const abrirCargaDeResolucion = useCallback(async () => {
    try {
      setResoluciones(await facturacionPorMesService.resoluciones());
      setCajonDeResolucion(true);
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No pudimos leer tus resoluciones para cargar otra.',
          accion: 'abrir la carga de la resolución',
        }),
      );
    }
  }, []);

  /* A quién le falta el correo: un cajón, no una lista infinita al fondo. */
  const [cajonDeCorreos, setCajonDeCorreos] = useState(false);

  const grupo = grupoDe(active);

  if (active === 'resolucion') {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Dinero"
          titulo={tr('Resolución y numeración')}
          descripcion={tr(
            'El permiso de la DIAN con el que se numeran tus facturas, y con qué resolución sale cada tipo de documento.',
          )}
          acciones={
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => setActive('nueva')}
              data-testid="facturacion-volver"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {tr('Volver a la facturación')}
            </Button>
          }
          data-testid="facturacion-encabezado"
        />
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="facturacion-resolucion">
          <ResolucionDeFacturacion />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Dinero"
        titulo={t(k('title'))}
        descripcion={tr(
          'Factura cada mes a tus inquilinos y propietarios, y sigue lo que emitiste ante la DIAN.',
        )}
        ayuda={
          <div data-testid="facturacion-como-funciona">
            <ComoSeFactura />
          </div>
        }
        acciones={
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => setActive('resolucion')}
            data-testid="facturacion-ir-a-resoluciones"
          >
            <Stamp className="h-4 w-4" aria-hidden="true" />
            {tr('Resolución y numeración')}
          </Button>
        }
        accionPrincipal={
          grupo === 'compras' ? (
            // La ÚNICA puerta para registrar una factura de proveedor (Nico,
            // 08-09); desde CB-R21 (04-10) lleva a Contabilidad → Gastos.
            <Button asChild size="sm" hideArrow data-testid="facturacion-registrar-compra">
              <Link href="/panel/inmobiliaria/contabilidad/gastos">
                <Receipt className="h-4 w-4" weight="bold" />
                {t(k('registrarCompra'))}
              </Link>
            </Button>
          ) : grupo !== 'nueva' ? (
            <Button size="sm" hideArrow onClick={() => setActive('nueva')} data-testid="facturacion-ir-a-facturar">
              <Receipt className="h-4 w-4" weight="bold" />
              {tr('Facturar el mes')}
            </Button>
          ) : null
        }
        data-testid="facturacion-encabezado"
      />

      {/* Lo que se deja listo UNA vez, antes del trabajo del mes. */}
      {grupo === 'nueva' ? (
        <LoQueNecesitasParaFacturar
          onCargarResolucion={() => void abrirCargaDeResolucion()}
          onVerResoluciones={() => setActive('resolucion')}
          onVerCorreos={() => setCajonDeCorreos(true)}
          version={version}
        />
      ) : null}

      {/* El aviso de lo que todavía no pasa con lo emitido ante la DIAN: sólo
          donde está lo emitido. Con FEEL prendido y la inmobiliaria lista,
          desaparece (DIAN-FEEL, 04-10). */}
      {grupo === 'ventas' ? (
        <BannerDeLaDian
          textoDeAntes={{ titulo: t(k('m2BannerTitle')), descripcion: t(k('m2BannerDesc')) }}
        />
      ) : null}

      {/* UNA tarjeta: pestañas arriba, el trabajo debajo. */}
      <Tabs
        value={grupo}
        onValueChange={(v) => {
          if (esTab(v)) setActive(v);
        }}
      >
        {/* 🔴 `overflow-x-clip`, NO `overflow-hidden`: `hidden` vuelve a la
            tarjeta el contenedor de desplazamiento más cercano y mata el pie
            pegajoso de «Por facturar» (19-09). */}
        <section
          className="rounded-lg border border-border bg-surface overflow-x-clip"
          data-testid="facturacion-tarjeta"
        >
          <div className="border-b border-border p-4">
            <div className="max-w-full overflow-x-auto [scrollbar-width:none]" data-lenis-prevent>
              <TabsList variant="segmented" aria-label={t(k('title'))} className="justify-start">
                <TabsTrigger value="nueva" className="whitespace-nowrap">
                  {t(k('tab_nueva'))}
                </TabsTrigger>
                <TabsTrigger value="ventas" className="whitespace-nowrap">
                  {tr('Emitidas')}
                </TabsTrigger>
                <TabsTrigger value="electronica" className="whitespace-nowrap">
                  {t(k('tab_electronica'))}
                </TabsTrigger>
                <TabsTrigger value="compras" className="whitespace-nowrap">
                  {t(k('tab_compras'))}
                </TabsTrigger>
                <TabsTrigger value="mandato" className="whitespace-nowrap">
                  {tr('Certificados')}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="nueva" className="mt-0">
            <div className="p-4">
              <NuevaFactura
                onIrAResolucion={() => void abrirCargaDeResolucion()}
                sinAvisoDeResolucionArriba
                recargarCon={version}
              />
            </div>
          </TabsContent>

          {/* Lo emitido: facturas de venta y notas, del mismo mes. Ahí se
              anula con nota crédito (una factura emitida no se borra, 15-09). */}
          <TabsContent value="ventas" className="mt-0">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div data-testid="facturacion-emitidas-vista">
                <SegmentedControl<'ventas' | 'notas'>
                  aria-label={tr('Qué documentos ver')}
                  value={active === 'notas' ? 'notas' : 'ventas'}
                  onChange={setActive}
                  options={[
                    { value: 'ventas', label: tr('Facturas de venta') },
                    { value: 'notas', label: tr('Notas crédito y débito') },
                  ]}
                />
              </div>
              {/* 🔴 El mes es del DS y dice a qué lista gobierna, pegado a ella
                  (Nico, 21-09). */}
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger
                  className="w-56 gap-2"
                  aria-label={active === 'notas' ? 'Mes de las notas' : 'Mes de las facturas emitidas'}
                  data-testid="facturacion-mes-emitidas"
                >
                  <CalendarBlank className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
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
              <FacturasEmitidas mes={mes} vista={active === 'notas' ? 'notas' : 'ventas'} />
            </div>
          </TabsContent>

          {/* 🔴 «Electrónica (DIAN)»: la cola de transmisión y las entregas.
              Responden la misma pregunta —«¿este documento existe ante la DIAN
              y le llegó al cliente?»— y son dos estados distintos. */}
          <TabsContent value="electronica" className="mt-0">
            <div className="space-y-6 p-4">
              <ColaDeTransmision />
              <EntregasYAcuse />
            </div>
          </TabsContent>

          {/* Lo que la inmobiliaria compra: las facturas de proveedor (de
              Contabilidad → Gastos, CB-R21) y el documento soporte de los
              proveedores que no facturan. */}
          <TabsContent value="compras" className="mt-0">
            <div className="border-b border-border px-4 py-3">
              <div data-testid="facturacion-compras-vista">
                <SegmentedControl<'compras' | 'soporte'>
                  aria-label={tr('Qué compras ver')}
                  value={active === 'soporte' ? 'soporte' : 'compras'}
                  onChange={setActive}
                  options={[
                    { value: 'compras', label: tr('Facturas de proveedores') },
                    { value: 'soporte', label: t(k('tab_soporte')) },
                  ]}
                />
              </div>
            </div>
            <div className="p-4">
              {active === 'soporte' ? <DocumentoSoporte /> : <CuentasPorPagar conRegistrar={false} />}
            </div>
          </TabsContent>

          {/* Lo que cada propietario necesita para declarar. */}
          <TabsContent value="mandato" className="mt-0">
            <div className="p-4">
              <CertificacionDelMandatario />
            </div>
          </TabsContent>
        </section>
      </Tabs>

      <CajonDeLaResolucion
        abierto={cajonDeResolucion}
        onOpenChange={setCajonDeResolucion}
        datos={resoluciones}
        onCargada={() => setVersion((v) => v + 1)}
      />

      <Cajon abierto={cajonDeCorreos} onOpenChange={setCajonDeCorreos} tamano="xl" data-testid="cajon-de-correos">
        <CajonCabecera
          titulo={tr('A quién le falta el correo')}
          descripcion={tr(
            'Sin correo, su factura queda sin entregar y la aceptación tácita no corre. Se completa en su ficha.',
          )}
        />
        <CajonCuerpo>
          <TercerosSinCorreo enCajon />
        </CajonCuerpo>
      </Cajon>
    </div>
  );
}

export default function FacturacionPage() {
  return (
    // Nico (03-10-2026): Facturación es sólo de administrador y contador, también
    // en el back, y con el permiso de `cobros` (FA-H-10): sin él, el cartel
    // «No tienes acceso a Facturación» cubre la pantalla entera.
    <PageGuard module="cobros" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Facturación">
      <FacturacionContent />
    </PageGuard>
  );
}
