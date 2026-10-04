'use client';

/**
 * Registrar la factura de un proveedor (contrato del 18-09, §3).
 *
 * ── QA de Contabilidad (CB-20 / CB-21, 03-10-2026) ──────────────────────────
 *
 *   · Es un CAJÓN, no un modal (como «Asiento manual» y «Hacer recibo de
 *     caja»): cabecera fija, el formulario en el cuerpo que scrollea y los
 *     botones en el pie, siempre a la vista. Sus listas son el `Select` del DS
 *     y sus fechas el selector de fecha del DS.
 *   · Un rechazo del back (p. ej. `ASIENTO_DESCUADRADO` «débitos $100.000
 *     contra créditos $119.000») se dice CON SUS NÚMEROS, en el formulario y
 *     en el aviso — no la frase genérica «el asiento no cuadra».
 *   · Las `notas` de la previsualización (lo que falta configurar: si la
 *     inmobiliaria es responsable de IVA…) se ven ANTES de causar, arriba de
 *     los botones, con el enlace a donde se configura.
 *   · Elegir un proveedor del registro PROPONE su retefuente (`retefuentePct`
 *     sobre la base) y, si no es responsable de IVA, las líneas sin IVA. Las
 *     dos cosas se pueden cambiar.
 *
 * ── 🔴 El proveedor se puede escribir a mano, y eso es una decisión ─────────
 *
 * El registro de proveedores ya existe
 * (`GET /inmobiliaria/facturacion/documento-soporte/proveedores`) y es lo que se
 * ofrece primero. Pero una factura se puede registrar SIN él, escribiendo los
 * datos: los del plomero que vino una vez y no va a volver. Y una vez elegido el
 * proveedor del registro, sus datos quedan CONGELADOS en la factura — un
 * documento tributario no cambia porque alguien editó una ficha, y el back los
 * guarda copiados por eso mismo.
 *
 * ── 🔴 El total del papel es un CONTROL, y se controla dos veces ────────────
 *
 * `totalCop` es lo que dice el papel y viaja al back, que lo compara con lo que
 * suman las líneas: si no coinciden es 400 `TOTALES_NO_CUADRAN` y **no se
 * registra nada**. Es el único control que compara contra algo de AFUERA del
 * sistema — una línea de $4.000.000 tecleada donde iban $400.000 cuadra
 * perfectamente consigo misma y pasa todos los demás.
 *
 * La pantalla lo comprueba ADEMÁS localmente, y los dos no se estorban: el aviso
 * local aparece mientras se escribe, con el papel todavía en la mano; el 400 es
 * la autoridad y se muestra con los cuatro números que manda el back (el total
 * del papel, el de las líneas, el subtotal y el IVA). Ni el aviso local bloquea
 * el envío —el caso legítimo existe: un proveedor que calculó el IVA distinto, y
 * para eso la línea acepta el IVA en pesos— ni el 400 se traduce a una frase
 * propia cuando el back ya mandó los números.
 *
 * ── Qué le falta se dice en palabras, no con un botón gris ──────────────────
 *
 * `problemasDeLaFactura` devuelve las frases; el botón se deshabilita y las
 * muestra. Un «Registrar» apagado sin explicación con doce campos arriba manda a
 * buscar cuál falta.
 *
 * ── Sin cuenta en la línea NO es un error ──────────────────────────────────
 *
 * La línea puede quedarse sin `cuentaId`: ahí el back usa la cuenta del rubro o,
 * sin rubro, la del evento `GASTO_SIN_RUBRO`. Es para eso que ese evento existe,
 * y la pantalla lo dice en vez de exigir que alguien elija una cuenta del PUC
 * para cada cerradura.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, SealCheck, Trash, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { ApiError } from '@/lib/api/client';
import { CampoDeDia } from '../CampoDeDia';
import { Monto } from '../Monto';
import { Nota } from '../piezas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import {
  gastosApi,
  NOMBRE_DEL_TIPO_DE_FACTURA,
  TIPOS_DE_FACTURA,
  type FacturaDeProveedor,
  type FacturaNueva,
  totalesQueNoCuadran,
  type LiquidacionDeFactura,
  type TipoDeFacturaDeProveedor,
  type TotalesQueNoCuadran,
} from '@/lib/api/gastos.service';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';
import type { ProveedorNoObligado } from '@/lib/api/facturacion-electronica.service';
import type { RubroDelPresupuesto, Sede } from '@/lib/api/finanzas.types';
import {
  avisoDeTotalQueNoCuadra,
  camposDeLaFactura,
  erroresDeLosTopes,
  ivaDeLaLinea,
  lineaVacia,
  lineasParaElBack,
  netoAPagar,
  problemasDeLaFactura,
  sumaDeRetenciones,
  totalesDeLasLineas,
  type BorradorDeFactura,
  type CampoDeLaFactura,
  type LineaEnCurso,
} from '@/lib/contabilidad/factura-de-proveedor';
import { hoy } from '@/lib/contabilidad/fechas';
// CB-17: la plata de Contabilidad con UN formato («$ 1.234.567», «−$ 119.100»).
import { plata as formatCurrency, plataEnElTexto, textoDelBack } from '@/lib/contabilidad/plata';
import {
  enlaceDeLaNota,
  propuestaDelProveedor,
  retefuentePropuesta,
} from '@/lib/contabilidad/propuesta-del-proveedor';

/** «A mano» / «sin rubro» / «sin sede» en los `Select` del DS (Radix no acepta `''`). */
const NINGUNO = '__ninguno__';

export interface FormularioDeFacturaProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama con la factura que quedó, para que la lista se refresque. */
  onRegistrada: (factura: FacturaDeProveedor, seCauso: boolean) => void;
  cuentas: readonly CuentaPuc[];
  proveedores: readonly ProveedorNoObligado[];
  rubros: readonly RubroDelPresupuesto[];
  sedes: readonly Sede[];
}

/**
 * El id del control de cada campo, para enfocarlo cuando el back o el tope del
 * cliente le ponen un error y para el `aria-describedby` de su `ErrorDelCampo`.
 */
function idDelCampo(campo: CampoDeLaFactura): string {
  const linea = /^lineas\.(\d+)\.(descripcion|baseCop|ivaPct)$/.exec(campo);
  if (linea) {
    const [, i, cual] = linea;
    return cual === 'descripcion' ? `linea-desc-${i}` : cual === 'baseCop' ? `linea-base-${i}` : `linea-iva-${i}`;
  }
  const ids: Record<string, string> = {
    proveedorNombre: 'factura-nombre',
    proveedorTipoDocumento: 'factura-tipo-doc',
    proveedorDocumento: 'factura-doc',
    proveedorCiudad: 'factura-ciudad',
    proveedorDireccion: 'factura-direccion',
    prefijoDelProveedor: 'factura-prefijo',
    numeroDelProveedor: 'factura-numero',
    fecha: 'factura-fecha',
    fechaDeVencimiento: 'factura-vence',
    concepto: 'factura-concepto',
    totalCop: 'factura-total',
    retefuenteCop: 'factura-retefuente',
    reteivaCop: 'factura-reteiva',
    reteicaCop: 'factura-reteica',
    // La suma de los renglones no tiene un control propio: se enfoca la
    // primera base, que es por donde se empieza a revisar.
    lineas: 'linea-base-0',
  };
  return ids[campo] ?? 'factura-nombre';
}

/** El error de la lista de renglones entera (la suma, o demasiados). */
const ID_DEL_ERROR_DE_LAS_LINEAS = 'factura-lineas-error';

function enfocar(campo: CampoDeLaFactura) {
  if (typeof document === 'undefined') return;
  document.getElementById(idDelCampo(campo))?.focus();
}

/** Un número que puede estar vacío: `''` no es `0`. */
function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null;
  const n = Number(texto.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function FormularioDeFactura({
  abierto,
  onCerrar,
  onRegistrada,
  cuentas,
  proveedores,
  rubros,
  sedes,
}: FormularioDeFacturaProps) {
  const [tipo, setTipo] = useState<TipoDeFacturaDeProveedor>('FACTURA');
  /** `''` = el proveedor se escribe a mano. */
  const [proveedorId, setProveedorId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorTipoDocumento, setProveedorTipoDocumento] = useState('NIT');
  const [proveedorDocumento, setProveedorDocumento] = useState('');
  const [proveedorCiudad, setProveedorCiudad] = useState('');
  const [proveedorDireccion, setProveedorDireccion] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(() => hoy());
  const [vencimiento, setVencimiento] = useState('');
  const [concepto, setConcepto] = useState('');
  const [rubro, setRubro] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [lineas, setLineas] = useState<LineaEnCurso[]>(() => [lineaVacia()]);
  /**
   * CB-21: lo que propone el registro del proveedor elegido. `retefuentePct`
   * se aplica sobre la base mientras la persona no escriba la retefuente a
   * mano; `ivaPorDefecto` es el de las líneas nuevas (0 si no es responsable).
   */
  const [retefuentePct, setRetefuentePct] = useState<number | null>(null);
  const [retefuenteEscrita, setRetefuenteEscrita] = useState(false);
  const [ivaPorDefecto, setIvaPorDefecto] = useState(() => lineaVacia().ivaPct);
  const [sinIvaPorElProveedor, setSinIvaPorElProveedor] = useState(false);
  /** CB-20: el rechazo del back en palabras (con sus números), en el formulario. */
  const [rechazoDelBack, setRechazoDelBack] = useState<string | null>(null);
  const [totalDelPapel, setTotalDelPapel] = useState<number | null>(null);
  const [retefuente, setRetefuente] = useState(0);
  const [reteiva, setReteiva] = useState(0);
  const [reteica, setReteica] = useState(0);
  const [guardando, setGuardando] = useState(false);
  /**
   * La liquidación del BACK (`POST /gastos/facturas/previsualizar`). `null`
   * mientras no haya líneas válidas o mientras el pedido falle: ahí la pantalla
   * muestra la cuenta local, que es la misma aritmética sin el perfil tributario
   * del proveedor. Nunca se muestran las dos como si fueran lo mismo.
   */
  const [liquidacion, setLiquidacion] = useState<LiquidacionDeFactura | null>(null);
  /**
   * Los cuatro números del 400 `TOTALES_NO_CUADRAN`. `null` = no hubo, o el
   * último intento fue por otra cosa. Se limpia al empezar cada envío: dejarlo
   * pegado haría que un fallo de red pareciera un descuadre.
   */
  const [descuadreDelBack, setDescuadreDelBack] = useState<TotalesQueNoCuadran | null>(null);
  /**
   * Los errores que el back mandó en `campos` (400 `DATOS_INVALIDOS`, o el
   * `TOTAL_FUERA_DE_RANGO` de la suma), cada uno en su campo. Se borra el de
   * un campo apenas la persona lo cambia: el error ya no habla de lo que hay.
   */
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<CampoDeLaFactura, string>>
  >({});

  const borrador: BorradorDeFactura = {
    proveedorNombre,
    proveedorDocumento,
    numeroDelProveedor: numero,
    fecha,
    concepto,
    lineas,
    totalCop: totalDelPapel,
    retefuenteCop: retefuente,
    reteivaCop: reteiva,
    reteicaCop: reteica,
  };

  const totales = useMemo(() => totalesDeLasLineas(lineas), [lineas]);
  /**
   * 🔁 Los topes del back (`limites-de-gastos.ts`), con su misma frase y en su
   * campo, mientras se escribe: un cero de más se ve antes de enviar.
   */
  const erroresDelCliente = erroresDeLosTopes(borrador);
  const errorDe = (campo: CampoDeLaFactura): string | undefined =>
    erroresDelCliente[campo] ?? erroresDelServidor[campo];
  /**
   * Las props del control de un campo que puede tener error. La primera base
   * nombra además el error de la lista entera (la suma), que es el que recibe
   * el foco cuando la suma no cabe.
   */
  const conError = (campo: CampoDeLaFactura) => {
    const ids: string[] = [];
    if (errorDe(campo)) ids.push(`${idDelCampo(campo)}-error`);
    if (campo === 'lineas.0.baseCop' && errorDe('lineas')) ids.push(ID_DEL_ERROR_DE_LAS_LINEAS);
    return ids.length > 0
      ? { 'aria-invalid': true as const, 'aria-describedby': ids.join(' ') }
      : {};
  };
  const olvidarError = (...campos: CampoDeLaFactura[]) =>
    setErroresDelServidor((previos) => {
      if (!campos.some((c) => previos[c] !== undefined)) return previos;
      const siguientes = { ...previos };
      for (const c of campos) delete siguientes[c];
      return siguientes;
    });
  const problemas = useMemo(() => problemasDeLaFactura(borrador), [borrador]);
  const avisoDelTotal = avisoDeTotalQueNoCuadra(borrador, formatCurrency);
  const retenciones = sumaDeRetenciones(borrador);
  const neto = totalDelPapel === null ? null : netoAPagar(totalDelPapel, borrador);

  /*
   * 🔴 La liquidación la hace el BACK mientras se escribe. No es un capricho de
   * arquitectura: depende del perfil tributario del PROVEEDOR —si es responsable
   * de IVA, su porcentaje de retefuente, si la inmobiliaria es agente retenedor
   * de ICA en ese municipio— y eso el navegador no lo sabe. La cuenta local de
   * `factura-de-proveedor.ts` sigue existiendo para el aviso instantáneo de que
   * el papel y las líneas no dicen lo mismo, que es otra pregunta.
   *
   * Con retraso de medio segundo: sin él, cada tecla de una base de seis cifras
   * son seis peticiones, y las respuestas llegan desordenadas. `vivo` descarta
   * la respuesta de un pedido que ya quedó viejo, para que el total no parpadee
   * hacia atrás.
   */
  const lineasListas = useMemo(() => lineasParaElBack(lineas), [lineas]);
  const huellaDeLaLiquidacion = JSON.stringify([
    proveedorId,
    lineasListas,
    retefuente,
    reteiva,
    reteica,
  ]);

  useEffect(() => {
    if (!abierto || lineasListas.length === 0) {
      setLiquidacion(null);
      return;
    }
    let vivo = true;
    const id = setTimeout(() => {
      void gastosApi.facturas
        .previsualizar({
          ...(proveedorId ? { proveedorId } : {}),
          lineas: lineasListas,
          retefuenteCop: retefuente,
          reteivaCop: reteiva,
          reteicaCop: reteica,
        })
        .then((l) => {
          if (vivo) setLiquidacion(l);
        })
        .catch(() => {
          // Que la previsualización falle no puede tapar el formulario: se
          // muestra la cuenta local y el back tendrá la última palabra igual.
          if (vivo) setLiquidacion(null);
        });
    }, 500);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
    // `huellaDeLaLiquidacion` resume las cinco entradas en un valor estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, huellaDeLaLiquidacion]);

  // CB-21: la retefuente propuesta sigue a la base mientras nadie la escriba.
  useEffect(() => {
    if (retefuentePct === null || retefuenteEscrita) return;
    setRetefuente(retefuentePropuesta(totales.subtotalCop, retefuentePct));
  }, [retefuentePct, retefuenteEscrita, totales.subtotalCop]);

  /** Elegir un proveedor del registro copia sus datos en la factura. */
  const elegirProveedor = (id: string) => {
    setProveedorId(id);
    const p = proveedores.find((x) => x.id === id);
    if (!p) {
      // A mano: lo propuesto por el registro deja de aplicar (lo escrito queda).
      setRetefuentePct(null);
      setSinIvaPorElProveedor(false);
      setIvaPorDefecto(lineaVacia().ivaPct);
      return;
    }
    setProveedorNombre(p.nombre);
    if (p.tipoDocumento) setProveedorTipoDocumento(p.tipoDocumento);
    if (p.documento) setProveedorDocumento(p.documento);
    if (p.ciudad) setProveedorCiudad(p.ciudad);
    if (p.direccion) setProveedorDireccion(p.direccion);
    // CB-21: su retefuente y, si no es responsable de IVA, las líneas sin IVA.
    const propuesta = propuestaDelProveedor(p, lineaVacia().ivaPct);
    setRetefuentePct(propuesta.retefuentePct);
    setRetefuenteEscrita(false);
    setIvaPorDefecto(propuesta.ivaPct);
    setSinIvaPorElProveedor(propuesta.sinIva);
    setLineas((previas) => previas.map((l) => ({ ...l, ivaPct: propuesta.ivaPct })));
  };

  const cambiarLinea = (indice: number, cambios: Partial<LineaEnCurso>) => {
    olvidarError(
      'lineas',
      ...(Object.keys(cambios).map((k) => `lineas.${indice}.${k}`) as CampoDeLaFactura[]),
    );
    setLineas((previas) => previas.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  };

  const guardar = async (causar: boolean) => {
    /*
     * 🔁 Lo que el back rechazaría por un tope (un cero de más) se ataja acá,
     * con la misma frase, y se enfoca el campo: no viaja nada.
     */
    const fueraDeRango = (Object.keys(erroresDelCliente) as CampoDeLaFactura[])[0];
    if (fueraDeRango) {
      enfocar(fueraDeRango);
      return;
    }
    setGuardando(true);
    setDescuadreDelBack(null);
    setErroresDelServidor({});
    setRechazoDelBack(null);
    try {
      const cuerpo: FacturaNueva = {
        tipo,
        ...(proveedorId ? { proveedorId } : {}),
        proveedorNombre: proveedorNombre.trim(),
        ...(proveedorTipoDocumento ? { proveedorTipoDocumento } : {}),
        ...(proveedorDocumento ? { proveedorDocumento: proveedorDocumento.trim() } : {}),
        ...(proveedorCiudad ? { proveedorCiudad: proveedorCiudad.trim() } : {}),
        ...(proveedorDireccion ? { proveedorDireccion: proveedorDireccion.trim() } : {}),
        ...(prefijo ? { prefijoDelProveedor: prefijo.trim() } : {}),
        numeroDelProveedor: numero.trim(),
        fecha,
        ...(vencimiento ? { fechaDeVencimiento: vencimiento } : {}),
        concepto: concepto.trim(),
        ...(rubro ? { rubro } : {}),
        ...(sedeId ? { sedeId } : {}),
        lineas: lineasParaElBack(lineas),
        retefuenteCop: retefuente,
        reteivaCop: reteiva,
        reteicaCop: reteica,
        /*
         * 🔴 El total del papel, como CONTROL. Va sólo si la persona lo escribió:
         * el DTO lo declara opcional y sin él el back no compara nada — mandar un
         * `0` porque el campo está vacío haría fallar cada factura.
         */
        ...(totalDelPapel !== null ? { totalCop: totalDelPapel } : {}),
        ...(causar ? { causar: true } : {}),
      };
      const factura = await gastosApi.facturas.registrar(cuerpo);
      toast.success(
        causar
          ? `Factura registrada y causada${factura.asientoNumero ? ` (asiento N.º ${factura.asientoNumero})` : ''}.`
          : 'Factura registrada. Queda en borrador hasta que la causes.',
      );
      onRegistrada(factura, causar);
      onCerrar();
    } catch (e) {
      /*
       * 🔴 El 400 del control del total se muestra APARTE y no como un toast que
       * se va en cinco segundos: trae los cuatro números que hacen falta para
       * encontrar el renglón mal digitado, y hay que poder mirarlos mientras se
       * corrige. El toast igual sale, con el mensaje del back.
       */
      setDescuadreDelBack(totalesQueNoCuadran(e));
      // El diálogo queda abierto: no se pierde lo digitado.
      /*
       * Un 400 con `campos` va a cada campo (la base del renglón 2, el total) y
       * se enfoca el primero; al toast va SÓLO lo que no tiene dónde ir. Sin
       * `campos` (un código de negocio, un 5xx, la red) habla
       * `mensajeDeContabilidad`, con la regla de oro.
       */
      const reparto = repartirErroresDelServidor<CampoDeLaFactura>(e, {
        campos: camposDeLaFactura(lineas.length),
      });
      setErroresDelServidor(reparto.porCampo);
      if (reparto.orden[0]) enfocar(reparto.orden[0]);
      if (reparto.delServidor.length === 0) {
        /*
         * 🔴 CB-20: `ASIENTO_DESCUADRADO` trae en su mensaje los débitos y los
         * créditos; la frase fija del código («el asiento no cuadra…») los
         * escondía. Se dice el mensaje del back (si se puede leer) y queda en
         * el formulario, no sólo en un aviso que se va en cinco segundos.
         */
        const mensaje =
          e instanceof ApiError && e.code === 'ASIENTO_DESCUADRADO'
            ? plataEnElTexto(
                mensajeParaLaPersona(e, {
                  porDefecto: mensajeDeContabilidad(e, 'No se pudo registrar la factura.'),
                }),
              )
            : mensajeDeContabilidad(e, 'No se pudo registrar la factura.');
        toast.error(mensaje);
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && !totalesQueNoCuadran(e)) {
          setRechazoDelBack(mensaje);
        }
      } else if (reparto.sueltos.length > 0) {
        toast.error(reparto.sueltos.join(' · '));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    // CB-21: un CAJÓN (`xl`: las líneas de doce columnas caben sin correrse).
    <Cajon
      abierto={abierto}
      onOpenChange={(a) => !a && !guardando && onCerrar()}
      tamano="xl"
      data-testid="formulario-de-factura"
    >
      <CajonCabecera
        titulo="Registrar una factura de proveedor"
        descripcion="Lo que la inmobiliaria gasta en sí misma. Esto NO es un giro al propietario: el canon que se gira baja un pasivo y no es gasto de la inmobiliaria."
      />

      <CajonCuerpo className="space-y-6">
          {/* ── El proveedor ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Proveedor</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label id="factura-proveedor-rotulo" htmlFor="factura-proveedor">Del registro</Label>
                <Select
                  value={proveedorId || NINGUNO}
                  onValueChange={(v) => elegirProveedor(v === NINGUNO ? '' : v)}
                >
                  <SelectTrigger
                    id="factura-proveedor"
                    aria-labelledby="factura-proveedor-rotulo"
                    data-testid="factura-proveedor"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Escribir los datos a mano</SelectItem>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                        {p.documento ? ` · ${p.documento}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label id="factura-tipo-rotulo" htmlFor="factura-tipo">Tipo de documento</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDeFacturaDeProveedor)}>
                  <SelectTrigger id="factura-tipo" aria-labelledby="factura-tipo-rotulo" data-testid="factura-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DE_FACTURA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {NOMBRE_DEL_TIPO_DE_FACTURA[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="factura-nombre">Nombre o razón social</Label>
                <Input
                  id="factura-nombre"
                  value={proveedorNombre}
                  onChange={(e) => {
                    olvidarError('proveedorNombre');
                    setProveedorNombre(e.target.value);
                  }}
                  data-testid="factura-nombre"
                  {...conError('proveedorNombre')}
                />
                <ErrorDelCampo id="factura-nombre-error" mensaje={errorDe('proveedorNombre')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-tipo-doc">Tipo de documento del proveedor</Label>
                <Input
                  id="factura-tipo-doc"
                  value={proveedorTipoDocumento}
                  onChange={(e) => {
                    olvidarError('proveedorTipoDocumento');
                    setProveedorTipoDocumento(e.target.value);
                  }}
                  {...conError('proveedorTipoDocumento')}
                />
                <ErrorDelCampo
                  id="factura-tipo-doc-error"
                  mensaje={errorDe('proveedorTipoDocumento')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-doc">Documento</Label>
                <Input
                  id="factura-doc"
                  value={proveedorDocumento}
                  onChange={(e) => {
                    olvidarError('proveedorDocumento');
                    setProveedorDocumento(e.target.value);
                  }}
                  data-testid="factura-documento"
                  {...conError('proveedorDocumento')}
                />
                <ErrorDelCampo id="factura-doc-error" mensaje={errorDe('proveedorDocumento')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-ciudad">Ciudad</Label>
                <Input
                  id="factura-ciudad"
                  value={proveedorCiudad}
                  onChange={(e) => {
                    olvidarError('proveedorCiudad');
                    setProveedorCiudad(e.target.value);
                  }}
                  {...conError('proveedorCiudad')}
                />
                <ErrorDelCampo id="factura-ciudad-error" mensaje={errorDe('proveedorCiudad')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-direccion">Dirección</Label>
                <Input
                  id="factura-direccion"
                  value={proveedorDireccion}
                  onChange={(e) => {
                    olvidarError('proveedorDireccion');
                    setProveedorDireccion(e.target.value);
                  }}
                  {...conError('proveedorDireccion')}
                />
                <ErrorDelCampo
                  id="factura-direccion-error"
                  mensaje={errorDe('proveedorDireccion')}
                />
              </div>
            </div>
            {proveedorId ? (
              <Nota testId="nota-proveedor-congelado">
                <p>
                  Estos datos quedan copiados en la factura: si después se edita la ficha del
                  proveedor, la factura no cambia. Un documento tributario no se reescribe.
                </p>
              </Nota>
            ) : null}
          </section>

          {/* ── El documento ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">El documento</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="factura-prefijo">Prefijo</Label>
                <Input
                  id="factura-prefijo"
                  value={prefijo}
                  onChange={(e) => {
                    olvidarError('prefijoDelProveedor');
                    setPrefijo(e.target.value);
                  }}
                  placeholder="FE"
                  {...conError('prefijoDelProveedor')}
                />
                <ErrorDelCampo id="factura-prefijo-error" mensaje={errorDe('prefijoDelProveedor')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-numero">Número</Label>
                <Input
                  id="factura-numero"
                  value={numero}
                  onChange={(e) => {
                    olvidarError('numeroDelProveedor');
                    setNumero(e.target.value);
                  }}
                  data-testid="factura-numero"
                  {...conError('numeroDelProveedor')}
                />
                <ErrorDelCampo id="factura-numero-error" mensaje={errorDe('numeroDelProveedor')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-fecha">Fecha</Label>
                <CampoDeDia
                  id="factura-fecha"
                  value={fecha}
                  onChange={(v) => {
                    olvidarError('fecha');
                    setFecha(v);
                  }}
                  invalido={Boolean(errorDe('fecha'))}
                  describedBy={errorDe('fecha') ? 'factura-fecha-error' : undefined}
                  testid="factura-fecha"
                />
                <ErrorDelCampo id="factura-fecha-error" mensaje={errorDe('fecha')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-vence">Vence</Label>
                <CampoDeDia
                  id="factura-vence"
                  value={vencimiento}
                  min={fecha || undefined}
                  onChange={(v) => {
                    olvidarError('fechaDeVencimiento');
                    setVencimiento(v);
                  }}
                  placeholder="Sin vencimiento"
                  quitable
                  etiquetaDeQuitar="Quitar el vencimiento"
                  invalido={Boolean(errorDe('fechaDeVencimiento'))}
                  describedBy={errorDe('fechaDeVencimiento') ? 'factura-vence-error' : undefined}
                  testid="factura-vence"
                />
                <ErrorDelCampo id="factura-vence-error" mensaje={errorDe('fechaDeVencimiento')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="factura-concepto">Concepto</Label>
                <Input
                  id="factura-concepto"
                  value={concepto}
                  onChange={(e) => {
                    olvidarError('concepto');
                    setConcepto(e.target.value);
                  }}
                  placeholder="Cerraduras para la oficina"
                  data-testid="factura-concepto"
                  {...conError('concepto')}
                />
                <ErrorDelCampo id="factura-concepto-error" mensaje={errorDe('concepto')} />
              </div>
              <div className="space-y-1.5">
                <Label id="factura-rubro-rotulo" htmlFor="factura-rubro">Rubro del P&G</Label>
                <Select value={rubro || NINGUNO} onValueChange={(v) => setRubro(v === NINGUNO ? '' : v)}>
                  <SelectTrigger id="factura-rubro" aria-labelledby="factura-rubro-rotulo" data-testid="factura-rubro">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Sin rubro</SelectItem>
                    {rubros.map((r) => (
                      <SelectItem key={r.rubro} value={r.rubro}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label id="factura-sede-rotulo" htmlFor="factura-sede">Sede</Label>
                <Select value={sedeId || NINGUNO} onValueChange={(v) => setSedeId(v === NINGUNO ? '' : v)}>
                  <SelectTrigger id="factura-sede" aria-labelledby="factura-sede-rotulo" data-testid="factura-sede">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Sin sede</SelectItem>
                    {sedes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre} ({s.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Las líneas ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-fg">Líneas</h3>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => setLineas((p) => [...p, { ...lineaVacia(), ivaPct: ivaPorDefecto }])}
                data-testid="agregar-linea"
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Agregar línea
              </Button>
            </div>

            {sinIvaPorElProveedor ? (
              <p className="text-caption text-fg-muted" data-testid="lineas-sin-iva">
                El proveedor no es responsable de IVA (su registro lo dice): las líneas van sin IVA.
                Si el papel trae IVA, cámbialo en la línea.
              </p>
            ) : null}
            <ul className="space-y-3">
              {lineas.map((l, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-12"
                  data-testid={`linea-${i}`}
                >
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label htmlFor={`linea-desc-${i}`}>Descripción</Label>
                    <Input
                      id={`linea-desc-${i}`}
                      value={l.descripcion}
                      onChange={(e) => cambiarLinea(i, { descripcion: e.target.value })}
                      data-testid={`linea-descripcion-${i}`}
                      {...conError(`lineas.${i}.descripcion`)}
                    />
                    <ErrorDelCampo
                      id={`linea-desc-${i}-error`}
                      mensaje={errorDe(`lineas.${i}.descripcion`)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor={`linea-cuenta-${i}`}>Cuenta del gasto</Label>
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={l.cuentaId}
                      onChange={(cuentaId) => cambiarLinea(i, { cuentaId })}
                      soloImputables
                      placeholder="La del rubro"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`linea-base-${i}`}>Base</Label>
                    <Input
                      id={`linea-base-${i}`}
                      inputMode="numeric"
                      value={l.baseCop === null ? '' : String(l.baseCop)}
                      onChange={(e) => cambiarLinea(i, { baseCop: aNumero(e.target.value) })}
                      data-testid={`linea-base-${i}`}
                      {...conError(`lineas.${i}.baseCop`)}
                    />
                    <ErrorDelCampo
                      id={`linea-base-${i}-error`}
                      mensaje={errorDe(`lineas.${i}.baseCop`)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`linea-iva-${i}`}>IVA %</Label>
                    <Input
                      id={`linea-iva-${i}`}
                      inputMode="numeric"
                      value={String(l.ivaPct)}
                      onChange={(e) => cambiarLinea(i, { ivaPct: aNumero(e.target.value) ?? 0 })}
                      data-testid={`linea-iva-${i}`}
                      {...conError(`lineas.${i}.ivaPct`)}
                    />
                    <ErrorDelCampo
                      id={`linea-iva-${i}-error`}
                      mensaje={errorDe(`lineas.${i}.ivaPct`)}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:col-span-2">
                    <div className="space-y-0.5">
                      <p className="text-caption text-fg-muted">IVA</p>
                      <Monto
                        valor={ivaDeLaLinea(l.baseCop ?? 0, l.ivaPct)}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      hideArrow
                      aria-label={`Quitar la línea ${i + 1}`}
                      disabled={lineas.length === 1}
                      onClick={() => setLineas((p) => p.filter((_, j) => j !== i))}
                      data-testid={`quitar-linea-${i}`}
                    >
                      <Trash className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {/* El error de la lista entera (la SUMA de los renglones, o
                demasiados renglones): va debajo de los renglones y lo nombra la
                primera base, que es por donde se empieza a revisar. */}
            <ErrorDelCampo id={ID_DEL_ERROR_DE_LAS_LINEAS} mensaje={errorDe('lineas')} />

            <Nota testId="nota-de-la-cuenta">
              <p>
                Una línea sin cuenta no es un error: el asiento usa la cuenta del rubro y, sin
                rubro, la del evento «Gasto sin rubro» del mapeo contable.
              </p>
            </Nota>
          </section>

          {/* ── Los totales ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Totales y retenciones</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="factura-total">Total de la factura</Label>
                <Input
                  id="factura-total"
                  inputMode="numeric"
                  value={totalDelPapel === null ? '' : String(totalDelPapel)}
                  onChange={(e) => {
                    olvidarError('totalCop');
                    setTotalDelPapel(aNumero(e.target.value));
                  }}
                  data-testid="factura-total"
                  {...conError('totalCop')}
                />
                <ErrorDelCampo
                  id="factura-total-error"
                  mensaje={errorDe('totalCop')}
                  pista="El número que dice el papel, no el que calculamos."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-retefuente">Retefuente</Label>
                <Input
                  id="factura-retefuente"
                  inputMode="numeric"
                  value={String(retefuente)}
                  onChange={(e) => {
                    olvidarError('retefuenteCop');
                    setRetefuenteEscrita(true);
                    setRetefuente(aNumero(e.target.value) ?? 0);
                  }}
                  data-testid="factura-retefuente"
                  {...conError('retefuenteCop')}
                />
                <ErrorDelCampo
                  id="factura-retefuente-error"
                  mensaje={errorDe('retefuenteCop')}
                  pista={
                    retefuentePct !== null && !retefuenteEscrita
                      ? `Propuesta: ${retefuentePct.toLocaleString('es-CO')} % de la base, del registro del proveedor.`
                      : undefined
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-reteiva">ReteIVA</Label>
                <Input
                  id="factura-reteiva"
                  inputMode="numeric"
                  value={String(reteiva)}
                  onChange={(e) => {
                    olvidarError('reteivaCop');
                    setReteiva(aNumero(e.target.value) ?? 0);
                  }}
                  data-testid="factura-reteiva"
                  {...conError('reteivaCop')}
                />
                <ErrorDelCampo id="factura-reteiva-error" mensaje={errorDe('reteivaCop')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-reteica">ReteICA</Label>
                <Input
                  id="factura-reteica"
                  inputMode="numeric"
                  value={String(reteica)}
                  onChange={(e) => {
                    olvidarError('reteicaCop');
                    setReteica(aNumero(e.target.value) ?? 0);
                  }}
                  data-testid="factura-reteica"
                  {...conError('reteicaCop')}
                />
                <ErrorDelCampo id="factura-reteica-error" mensaje={errorDe('reteicaCop')} />
              </div>
            </div>

            <dl
              className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4"
              data-testid="liquidacion"
            >
              <div>
                <dt className="text-caption text-fg-muted">Subtotal de las líneas</dt>
                <dd>
                  <Monto valor={liquidacion?.subtotalCop ?? totales.subtotalCop} className="text-sm" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">IVA de las líneas</dt>
                <dd>
                  <Monto valor={liquidacion?.ivaCop ?? totales.ivaCop} className="text-sm" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">Retenciones</dt>
                <dd>
                  <Monto
                    valor={
                      liquidacion
                        ? liquidacion.retefuenteCop + liquidacion.reteivaCop + liquidacion.reteicaCop
                        : retenciones
                    }
                    className="text-sm"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">Se le paga (neto)</dt>
                <dd data-testid="factura-neto">
                  {liquidacion ? (
                    <Monto valor={liquidacion.netoCop} className="text-sm font-medium" />
                  ) : neto === null ? (
                    <span className="text-sm text-fg-subtle">—</span>
                  ) : (
                    <Monto valor={neto} className="text-sm font-medium" />
                  )}
                </dd>
              </div>

              {/* 🔴 De dónde sale cada impuesto, EN LAS PALABRAS DEL BACK
                  (`explicacion`): él sabe si la tarifa salió del perfil del
                  proveedor, de una base mínima o de lo que escribió la persona.
                  `origen` resume eso en una etiqueta; sin la distinción no se
                  sabe cuál revisar contra el papel. */}
              {liquidacion && liquidacion.impuestos.length > 0 ? (
                <div className="sm:col-span-4">
                  <dt className="text-caption text-fg-muted">Impuestos, uno por uno</dt>
                  <dd>
                    <ul className="mt-1 space-y-0.5" data-testid="impuestos-de-la-factura">
                      {liquidacion.impuestos.map((i) => (
                        <li
                          key={`${i.tipo}-${i.nombre}`}
                          className="flex flex-wrap items-baseline gap-x-2 text-caption text-fg-muted"
                        >
                          <span className="text-fg">{i.nombre}</span>
                          {i.porcentaje !== null ? <span>{i.porcentaje}%</span> : null}
                          <Monto valor={i.valorCop} className="text-caption" />
                          <span className="rounded-sm bg-surface-muted px-1">
                            {i.origen === 'CALCULADO' ? 'lo calculó Leasefy' : 'lo escribiste tú'}
                          </span>
                          {i.explicacion ? (
                            <span className="text-fg-subtle">{i.explicacion}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* El PENDIENTE_DE_CONFIRMAR de esta pieza: una retención calculada
                sobre un perfil que nadie confirmó es plata que la inmobiliaria
                le puede terminar debiendo a la DIAN. */}
            {liquidacion?.sinConfirmar ? (
              <div
                className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
                role="status"
                data-testid="liquidacion-sin-confirmar"
              >
                <SealCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium">
                    Alguna retención salió de un perfil tributario que nadie confirmó
                  </p>
                  <p className="text-fg-muted">
                    Verifica con el contador antes de causar: una retención mal practicada es plata
                    que la inmobiliaria le termina debiendo a la DIAN.
                  </p>
                </div>
              </div>
            ) : null}


            {/* 🔴 El 400 del back: la autoridad, con sus cuatro números. Va
                ARRIBA del aviso local — cuando los dos aparecen, el que importa
                es el que ya rechazó la factura. */}
            {descuadreDelBack ? (
              <div
                className="space-y-1 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-fg"
                role="alert"
                data-testid="descuadre-del-back"
              >
                <p className="font-medium">
                  El back rechazó la factura: el papel y las líneas no dicen lo mismo
                </p>
                <p>
                  La factura dice{' '}
                  <Monto valor={descuadreDelBack.totalDeLaFacturaCop} className="text-sm" /> y las
                  líneas suman{' '}
                  <Monto valor={descuadreDelBack.totalDeLasLineasCop} className="text-sm" /> —
                  subtotal <Monto valor={descuadreDelBack.subtotalCop} className="text-sm" /> más IVA{' '}
                  <Monto valor={descuadreDelBack.ivaCop} className="text-sm" />.
                </p>
                <p className="text-fg-muted">
                  No se registró nada. Revisa la base o el IVA de cada renglón; si el proveedor
                  calculó el IVA distinto, el que manda es el del papel.
                </p>
              </div>
            ) : null}

            {avisoDelTotal ? (
              <div
                className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
                role="alert"
                data-testid="aviso-total-no-cuadra"
              >
                {avisoDelTotal}
              </div>
            ) : null}
          </section>

          {/* 🔴 CB-20: lo que la previsualización dice que falta configurar, ANTES
              de causar y con el enlace a donde se configura. */}
          {liquidacion && liquidacion.notas.length > 0 ? (
            <div
              className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
              role="status"
              data-testid="notas-de-la-liquidacion"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <ul className="space-y-1.5">
                {liquidacion.notas.map((n) => {
                  const enlace = enlaceDeLaNota(n);
                  return (
                    <li key={n}>
                      {textoDelBack(n)}
                      {enlace ? (
                        <>
                          {' '}
                          <Link
                            href={enlace.href}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {enlace.label}
                          </Link>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {/* 🔴 CB-20: el rechazo del back, con sus números, queda a la vista. */}
          {rechazoDelBack ? (
            <div
              className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-fg"
              role="alert"
              data-testid="rechazo-del-back"
            >
              <p className="font-medium">No se registró la factura</p>
              <p>{rechazoDelBack}</p>
            </div>
          ) : null}

          {problemas.length > 0 ? (
            <ul
              className="space-y-1 rounded-lg border border-border bg-surface-muted p-3 text-caption text-fg-muted"
              data-testid="problemas-de-la-factura"
            >
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
      </CajonCuerpo>

      <CajonPie>
          <Button variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            hideArrow
            onClick={() => void guardar(false)}
            disabled={guardando || problemas.length > 0}
            title={problemas[0]}
            data-testid="registrar-factura"
          >
            {guardando ? 'Registrando…' : 'Registrar en borrador'}
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar(true)}
            disabled={guardando || problemas.length > 0}
            title={problemas[0]}
            data-testid="registrar-y-causar"
          >
            {guardando ? 'Registrando…' : 'Registrar y causar'}
          </Button>
      </CajonPie>
    </Cajon>
  );
}
