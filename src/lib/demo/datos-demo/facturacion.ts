/**
 * Facturación con datos de ejemplo (el modo demo): lo que hay por facturar este mes a inquilinos y propietarios, lo ya
 * emitido, la resolución y el estado ante la DIAN. Personas y direcciones INVENTADAS (las de la demo de Contratos,
 * `./contratos.ts`): no son de ningún cliente.
 *
 * Los impuestos siguen las reglas que ya aplica el back: la vivienda urbana va sin IVA; el local comercial lleva IVA y
 * la retención que practica el inquilino; la comisión al propietario lleva IVA y se factura cuando se le gira.
 */
import type {
  DestinatarioDeFactura,
  EstadoDeLaResolucion,
  FacturaDelMes,
  FacturaEmitida,
  FacturasEmitidasDelMes,
  FacturasPorGenerar,
  ImpuestoDeLaFactura,
  ResolucionesDeLaAgencia,
  ResumenDeLado,
} from '@/lib/api/facturacion-por-mes.service';
import type { EstadoAnteLaDian, TercerosSinCorreo } from '@/lib/api/facturacion-electronica.service';
import type { VistaDeLaHabilitacion } from '@/lib/api/habilitacion-de-facturacion.service';
import type { LecturaDeLaDemo } from './index';

const DIA = 24 * 3_600_000;
const haceRato = (ms: number) => new Date(Date.now() - ms).toISOString();

function mesDesdeHoy(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 7);
}

function diasDelMes(mes: string): number {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

const NOMBRES_DE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreDelMes = (mes: string) => `${NOMBRES_DE_MES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;

interface ContratoQueFactura {
  id: string;
  codigo: number;
  inquilino: string;
  documento: string;
  propietario: string;
  documentoPropietario: string;
  inmueble: string;
  canon: number;
  comercial: boolean;
  /** Cómo está la factura del inquilino este mes. */
  inquilinoEstado: 'POR_EMITIR' | 'EMITIDA' | 'SIN_ESCENARIO';
  /** Cómo está la comisión del propietario este mes. */
  propietarioEstado: 'POR_EMITIR' | 'EMITIDA' | 'SIN_GIRO';
  diasDeMora?: number;
}

const CONTRATOS: readonly ContratoQueFactura[] = [
  { id: 'demo-ct-1', codigo: 101, inquilino: 'Laura Restrepo', documento: '1036654321', propietario: 'Carlos Mejía', documentoPropietario: '71654987', inmueble: 'Cra 43A # 18 Sur 135, apto 702', canon: 2_350_000, comercial: false, inquilinoEstado: 'EMITIDA', propietarioEstado: 'EMITIDA' },
  { id: 'demo-ct-2', codigo: 102, inquilino: 'Andrés Gómez', documento: '71234567', propietario: 'María Isabel Uribe', documentoPropietario: '43567123', inmueble: 'Cl 10 # 34-21, casa 4', canon: 1_850_000, comercial: false, inquilinoEstado: 'POR_EMITIR', propietarioEstado: 'POR_EMITIR' },
  { id: 'demo-ct-3', codigo: 103, inquilino: 'Comercializadora El Poblado SAS', documento: '901234567', propietario: 'Inversiones Palmas SAS', documentoPropietario: '900765432', inmueble: 'Cra 37 # 8A-56, local 2', canon: 6_400_000, comercial: true, inquilinoEstado: 'POR_EMITIR', propietarioEstado: 'SIN_GIRO' },
  { id: 'demo-ct-4', codigo: 104, inquilino: 'Valentina Ríos', documento: '1017223344', propietario: 'Jorge Arango', documentoPropietario: '70123456', inmueble: 'Cl 79 Sur # 47E-80, apto 1504', canon: 2_900_000, comercial: false, inquilinoEstado: 'POR_EMITIR', propietarioEstado: 'POR_EMITIR' },
  { id: 'demo-ct-5', codigo: 105, inquilino: 'Juan Pablo Cardona', documento: '98765432', propietario: 'Luz Marina Henao', documentoPropietario: '42876543', inmueble: 'Cra 70 # 44-10, apto 301', canon: 1_650_000, comercial: false, inquilinoEstado: 'POR_EMITIR', propietarioEstado: 'SIN_GIRO', diasDeMora: 34 },
  { id: 'demo-ct-8', codigo: 108, inquilino: 'Sofía Vélez', documento: '1152998877', propietario: 'Martha Londoño', documentoPropietario: '43112233', inmueble: 'Cra 25 # 1A Sur-155, apto 1102', canon: 4_100_000, comercial: false, inquilinoEstado: 'SIN_ESCENARIO', propietarioEstado: 'SIN_GIRO' },
];

const COMISION = 0.1;
const RESOLUCION_NUMERO = '18764089123456';
const PREFIJO = 'LF';
const ULTIMO_USADO = 1043;

function impuestosDelInquilino(c: ContratoQueFactura): ImpuestoDeLaFactura[] {
  if (!c.comercial) return [];
  return [
    { tipo: 'IVA', sobre: 'ARRENDAMIENTO', nombre: 'IVA 19 %', porcentaje: 19, baseCop: c.canon, valorCop: Math.round(c.canon * 0.19), suma: true, loPractica: 'INMOBILIARIA', aCargoDe: 'INQUILINO', explicacion: 'El arriendo de un local comercial causa IVA.' },
    { tipo: 'RETEFUENTE', sobre: 'ARRENDAMIENTO', nombre: 'Retención en la fuente 3,5 %', porcentaje: 3.5, baseCop: c.canon, valorCop: Math.round(c.canon * 0.035), suma: false, loPractica: 'INQUILINO', aCargoDe: 'PROPIETARIO', explicacion: 'La practica el inquilino, que es agente retenedor, y le certifica al propietario.' },
  ];
}

/** El número de una factura ya emitida este mes: las últimas de la resolución, en el orden de la lista. */
function numeroDeLaEmitida(c: ContratoQueFactura, destinatario: DestinatarioDeFactura): number {
  const emitidas = CONTRATOS.flatMap((x) =>
    (['INQUILINO', 'PROPIETARIO'] as const)
      .filter((d) => (d === 'INQUILINO' ? x.inquilinoEstado : x.propietarioEstado) === 'EMITIDA')
      .map((d) => `${x.id}:${d}`),
  );
  const i = emitidas.indexOf(`${c.id}:${destinatario}`);
  return ULTIMO_USADO - (emitidas.length - 1 - Math.max(0, i));
}

function factura(c: ContratoQueFactura, destinatario: DestinatarioDeFactura, mes: string): FacturaDelMes {
  const esInquilino = destinatario === 'INQUILINO';
  const base = esInquilino ? c.canon : Math.round(c.canon * COMISION);
  const impuestos: ImpuestoDeLaFactura[] = esInquilino
    ? impuestosDelInquilino(c)
    : [{ tipo: 'IVA', sobre: 'COMISION', nombre: 'IVA 19 %', porcentaje: 19, baseCop: base, valorCop: Math.round(base * 0.19), suma: true, loPractica: 'INMOBILIARIA', aCargoDe: 'PROPIETARIO', explicacion: 'La comisión de administración causa IVA.' }];
  const iva = impuestos.filter((i) => i.tipo === 'IVA').reduce((s, i) => s + i.valorCop, 0);
  const retenciones = impuestos.filter((i) => !i.suma).reduce((s, i) => s + i.valorCop, 0);
  const estado = esInquilino ? c.inquilinoEstado : c.propietarioEstado;
  const emitida = estado === 'EMITIDA';
  const sinEscenario = estado === 'SIN_ESCENARIO';
  const sinGiro = estado === 'SIN_GIRO';
  const numeroDian = emitida ? numeroDeLaEmitida(c, destinatario) : null;
  const total = base + iva;
  return {
    saldadaPorNota: null,
    clave: `${c.id}:${mes}:${destinatario}`,
    cuotaId: `${c.id}-cuota-${mes}`,
    contractId: c.id,
    codigo: c.codigo,
    numeroExterno: null,
    inmueble: c.inmueble,
    mes,
    destinatario,
    terceroId: `${c.id}-${esInquilino ? 'inquilino' : 'propietario'}`,
    terceroNombre: esInquilino ? c.inquilino : c.propietario,
    terceroDocumento: esInquilino ? c.documento : c.documentoPropietario,
    lineas: esInquilino
      ? [{ tipo: 'CANON', nombre: `Canon de ${nombreDelMes(mes)}`, valorCop: c.canon, resta: false }]
      : [{ tipo: 'COMISION', nombre: 'Comisión de administración (10 %)', valorCop: base, resta: false }],
    subtotalCop: base,
    descuentoCop: 0,
    baseCop: base,
    ivaCop: iva,
    retencionesCop: retenciones,
    totalCop: total,
    netoCop: total - retenciones,
    impuestos: sinEscenario ? [] : impuestos,
    impuestosSinConfirmar: sinEscenario,
    notasTributarias: [],
    escenario: sinEscenario
      ? { codigo: 'SIN_DEFINIR', nombre: 'Sin confirmar', certeza: 'SIN_DEFINIR' }
      : { codigo: c.comercial ? 'COMERCIAL_PJ' : 'VIVIENDA_PN', nombre: c.comercial ? 'Local comercial · persona jurídica' : 'Vivienda urbana · persona natural', certeza: 'CONFIRMADO' },
    estado: emitida ? 'EMITIDA' : 'POR_EMITIR',
    codigoNoEmitible: sinEscenario ? 'ESCENARIO_SIN_CONFIRMAR' : sinGiro ? 'GIRO_SIN_PAGAR' : null,
    mandato: null,
    participacionBps: null,
    contratoInquilinoId: null,
    abonadoCop: emitida ? total : 0,
    saldoCop: emitida ? 0 : total,
    numero: emitida ? numeroDian : null,
    numeroDian: emitida ? `${PREFIJO}-${numeroDian}` : null,
    facturaId: emitida ? `demo-fac-${c.codigo}-${destinatario === 'INQUILINO' ? 'i' : 'p'}` : null,
    diasFacturados: diasDelMes(mes),
    diasDelMes: diasDelMes(mes),
    deduccionAlEgresoCop: esInquilino ? 0 : total,
    emitible: !emitida && !sinEscenario && !sinGiro,
    motivoNoEmitible: sinEscenario
      ? 'Confirma en el contrato cómo se factura (vivienda o comercial, y quién retiene).'
      : sinGiro
        ? 'Se factura cuando se le gire al propietario.'
        : null,
    mora: c.diasDeMora && esInquilino
      ? { esCartera: true, diasDeMora: c.diasDeMora, recargosCop: 0, origen: 'CUOTA', motivo: `Lleva ${c.diasDeMora} días sin pagar; la factura del mes va sin intereses.`, sinReglas: false }
      : null,
    avisos: [],
  };
}

function resumen(filas: FacturaDelMes[]): ResumenDeLado {
  const por = filas.filter((f) => f.estado === 'POR_EMITIR');
  return {
    porEmitir: por.length,
    emitidas: filas.length - por.length,
    totalCop: por.reduce((s, f) => s + f.totalCop, 0),
    baseCop: por.reduce((s, f) => s + f.baseCop, 0),
    ivaCop: por.reduce((s, f) => s + f.ivaCop, 0),
    retencionesCop: por.reduce((s, f) => s + f.retencionesCop, 0),
    sinConfirmar: filas.filter((f) => f.impuestosSinConfirmar).length,
    conIva: filas.filter((f) => f.ivaCop > 0).length,
    conRetenciones: filas.filter((f) => f.retencionesCop > 0).length,
  };
}

function estadoDeLaResolucion(): EstadoDeLaResolucion {
  return {
    puedeNumerar: true,
    motivo: null,
    explicacion: null,
    numero: RESOLUCION_NUMERO,
    prefijo: PREFIJO,
    desde: 1,
    hasta: 5000,
    vigenteHasta: `${Number(mesDesdeHoy(0).slice(0, 4)) + 1}-09-30`,
    disponibles: 5000 - ULTIMO_USADO,
    siguiente: `${PREFIJO}-${ULTIMO_USADO + 1}`,
  };
}

function porGenerar(): FacturasPorGenerar {
  const mes = mesDesdeHoy(0);
  const inquilinos = CONTRATOS.map((c) => factura(c, 'INQUILINO', mes));
  const propietarios = CONTRATOS.map((c) => factura(c, 'PROPIETARIO', mes));
  const ladoI = resumen(inquilinos);
  const ladoP = resumen(propietarios);
  const emitiblesHoy = [...inquilinos, ...propietarios].filter((f) => f.emitible);
  return {
    desde: mes,
    hasta: mes,
    mes,
    inquilinos,
    propietarios,
    omitidos: [],
    meses: [{ mes, nombre: nombreDelMes(mes), emitible: true, motivoNoEmitible: null, inquilinos: ladoI, propietarios: ladoP, terminan: [] }],
    porContrato: CONTRATOS.flatMap((c) =>
      (['INQUILINO', 'PROPIETARIO'] as const).map((d) => {
        const f = (d === 'INQUILINO' ? inquilinos : propietarios).find((x) => x.contractId === c.id)!;
        return { contractId: c.id, destinatario: d, codigo: c.codigo, numeroExterno: null, inmueble: c.inmueble, terceroNombre: f.terceroNombre, cantidad: 1, totalCop: f.totalCop, valorTipicoCop: f.totalCop, valorParejo: true, primerMes: mes, ultimoMes: mes, terminaEnElRango: false, terminaEl: null };
      }),
    ),
    totales: {
      contratos: CONTRATOS.length,
      meses: 1,
      emitiblesHoy: emitiblesHoy.length,
      totalEmitibleHoyCop: emitiblesHoy.reduce((s, f) => s + f.totalCop, 0),
      inquilinos: ladoI,
      propietarios: ladoP,
    },
    resolucion: estadoDeLaResolucion(),
    resolucionDeLaComision: estadoDeLaResolucion(),
  };
}

/** Lo emitido del mes: las dos de este mes y diez del mes pasado, todas validadas por la DIAN. */
function emitidas(camino: string): FacturasEmitidasDelMes {
  const mes = /[?&]mes=(\d{4}-\d{2})/.exec(camino)?.[1] ?? mesDesdeHoy(0);
  const esteMes = mes === mesDesdeHoy(0);
  const filas = esteMes
    ? CONTRATOS.flatMap((c) => [factura(c, 'INQUILINO', mes), factura(c, 'PROPIETARIO', mes)]).filter((f) => f.estado === 'EMITIDA')
    : CONTRATOS.filter((c) => c.inquilinoEstado !== 'SIN_ESCENARIO').flatMap((c) => [
        { ...factura({ ...c, inquilinoEstado: 'EMITIDA' }, 'INQUILINO', mes) },
        { ...factura({ ...c, propietarioEstado: 'EMITIDA' }, 'PROPIETARIO', mes) },
      ]);
  const facturas: FacturaEmitida[] = filas.map((f, i) => ({
    id: f.facturaId ?? `demo-fac-${mes}-${i}`,
    numero: esteMes && f.numero ? f.numero : ULTIMO_USADO - 24 + i,
    numeroDian: esteMes && f.numeroDian ? f.numeroDian : `${PREFIJO}-${ULTIMO_USADO - 24 + i}`,
    destinatario: f.destinatario,
    terceroNombre: f.terceroNombre,
    terceroDocumento: f.terceroDocumento,
    inmueble: f.inmueble,
    contractId: f.contractId,
    mes,
    baseCop: f.baseCop,
    ivaCop: f.ivaCop,
    retencionesCop: f.retencionesCop,
    totalCop: f.totalCop,
    netoCop: f.netoCop,
    createdAt: haceRato((esteMes ? 2 : 32) * DIA - i * 3_600_000),
    notaCredito: null,
    notasCredito: [],
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    correccion: { saldoCop: esteMes ? 0 : f.totalCop, acreditadoCop: 0, puedeAnular: true, puedeParcial: true, maximoParcialCop: f.totalCop, puedeNotaDebito: true, bloqueo: null, explicacion: null },
    transmision: { estado: 'ACEPTADA_DIAN', nombre: 'Validada por la DIAN' },
  }));
  return { mes, anulacionDisponible: true, notaParcialDisponible: true, facturas };
}

function resoluciones(): ResolucionesDeLaAgencia {
  const vigente = estadoDeLaResolucion();
  return {
    resoluciones: [{
      id: 'demo-res-1',
      numero: RESOLUCION_NUMERO,
      fechaResolucion: `${Number(mesDesdeHoy(0).slice(0, 4)) - 1}-09-30`,
      prefijo: PREFIJO,
      tipoDeDocumento: null,
      tipoNombre: 'Todas las facturas',
      desde: 1,
      hasta: 5000,
      vigenteDesde: `${Number(mesDesdeHoy(0).slice(0, 4)) - 1}-10-01`,
      vigenteHasta: vigente.vigenteHasta ?? '',
      ultimoNumeroUsado: ULTIMO_USADO,
      anulada: false,
      esDePrueba: false,
      documentosNumerados: ULTIMO_USADO,
      sePuedeMarcarDePrueba: false,
      usados: ULTIMO_USADO,
      disponibles: vigente.disponibles,
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      siguiente: vigente.siguiente,
    }],
    vigente,
    porTipoDisponible: true,
    marcaDePruebaDisponible: true,
    porTipo: (['CANON_INQUILINO', 'COMISION_PROPIETARIO'] as const).map((tipo) => ({
      tipo,
      nombre: tipo === 'CANON_INQUILINO' ? 'Canon a inquilinos' : 'Comisión a propietarios',
      resolucionId: 'demo-res-1',
      resolucionNumero: RESOLUCION_NUMERO,
      prefijo: PREFIJO,
      puedeNumerar: true,
      porLaGeneral: true,
      disponibles: vigente.disponibles,
      siguiente: vigente.siguiente,
      explicacion: null,
    })),
    umbrales: { numeros: 200, dias: 30 },
    avisos: [],
  };
}

function habilitacion(): VistaDeLaHabilitacion {
  const claves = ['antes', 'rut', 'alta', 'registro', 'proveedor', 'pruebas', 'numeracion', 'resolucion', 'asociar'] as const;
  return {
    disponible: true,
    motivo: null,
    elegible: true,
    termino: true,
    pasos: claves.map((clave, i) => ({ clave, estado: 'hecho', quien: i % 3 === 1 ? 'feel' : 'tu', hechoAt: haceRato((60 - i * 4) * DIA), seMarca: false })),
    siguiente: null,
    avance: { hechos: claves.length, total: claves.length },
    yaFacturaConOtro: false,
    tipoDePersona: 'EMPRESA',
    rut: { subido: true, subidoAt: haceRato(58 * DIA), altaPedidaAt: haceRato(57 * DIA), avisoAFeel: null },
    testSetId: { valor: null, guardadoAt: null, avisoAFeel: null },
    prefijos: [],
    proveedor: { empresa: 'Feel', razonSocialCompleta: 'Feel SAS', nit: '900000000', software: 'Feel Facturación' },
    enlaces: { habilitacion: 'https://catalogo-vpfe-hab.dian.gov.co', facturando: 'https://catalogo-vpfe.dian.gov.co', muisca: 'https://muisca.dian.gov.co', instructivo: 'https://www.dian.gov.co' },
    inmobiliaria: { nombre: 'Inmobiliaria de Prueba', nit: '901555444' },
    tarjeta: { mostrar: false },
  };
}

function anteLaDian(): EstadoAnteLaDian {
  const pasos: EstadoAnteLaDian['pasos'] = [
    { id: 'datos', titulo: 'Los datos de la inmobiliaria', detalle: 'NIT, razón social y dirección completos.', quien: 'INMOBILIARIA', hecho: true, accion: null },
    { id: 'habilitacion', titulo: 'Habilitada ante la DIAN', detalle: 'Con Feel como proveedor tecnológico.', quien: 'INMOBILIARIA', hecho: true, accion: null },
    { id: 'resolucion', titulo: 'La resolución de numeración', detalle: `${PREFIJO} 1 a 5.000, vigente.`, quien: 'INMOBILIARIA', hecho: true, accion: null },
    { id: 'registro', titulo: 'Registrada en Leasefy', detalle: 'Leasefy transmite por la inmobiliaria.', quien: 'LEASEFY', hecho: true, accion: null },
    { id: 'coincide', titulo: 'Los datos coinciden con la DIAN', detalle: 'El NIT y la resolución cuadran con lo que tiene la DIAN.', quien: 'LEASEFY', hecho: true, accion: null },
  ];
  return {
    estado: 'LISTA',
    titulo: 'Tus facturas llegan a la DIAN',
    descripcion: 'Cada factura que emites sale numerada y Leasefy la transmite sola.',
    transmite: true,
    ambiente: 'PRODUCCION',
    pasos,
    avisos: [],
  };
}

function tercerosSinCorreo(): TercerosSinCorreo {
  return { total: CONTRATOS.length * 2, conCorreo: CONTRATOS.length * 2, sinCorreo: 0, sinCorreoConWhatsapp: 0, sinNingunCanal: 0, exigido: false, configurable: true, terceros: [] };
}

export const FACTURACION_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/facturacion\/por-generar(\?|$)/, respuesta: porGenerar },
  { patron: /^\/inmobiliaria\/facturacion\/emitidas(\?|$)/, respuesta: emitidas },
  { patron: /^\/inmobiliaria\/facturacion\/resolucion(\?|$)/, respuesta: resoluciones },
  { patron: /^\/inmobiliaria\/facturacion\/electronica(\?|$)/, respuesta: anteLaDian },
  { patron: /^\/inmobiliaria\/facturacion\/terceros-sin-correo(\?|$)/, respuesta: tercerosSinCorreo },
  { patron: /^\/inmobiliaria\/facturacion\/aviso-tipo-de-documento(\?|$)/, respuesta: () => ({ total: 0, propietarios: [] }) },
  { patron: /^\/inmobiliaria\/habilitacion-de-facturacion(\?|$)/, respuesta: habilitacion },
];
