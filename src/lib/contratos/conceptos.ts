/**
 * conceptos — el catálogo de cosas que se cobran en un contrato.
 *
 * Portado del catálogo real de la inmobiliaria (107 filas). Lo que se hizo con
 * él no es copiarlo: es sacarle lo que no era un concepto.
 *
 * ── Qué se quitó, y por qué ─────────────────────────────────────────────────
 *
 * **26 filas se llaman literalmente "NO UTILIZAR".** Un cuarto del catálogo son
 * lápidas: conceptos que alguien dejó de usar y no se pudieron borrar porque
 * tenían movimientos atados. Migrarlas sería mudarse con la basura.
 *
 * **41 filas eran la misma cosa con distinto impuesto.** Había nueve "Canon De
 * Arrendamiento", que se diferenciaban sólo en el combo tributario metido en el
 * nombre ("con IVA, RF, Reteica y Reteiva"). Elegir mal entre nueve opciones
 * que se leen casi igual no da un error: da una factura equivocada. Acá el
 * concepto es uno y los impuestos los calcula `liquidar()` a partir de quién le
 * paga a quién — ver [escenarios-tributarios.ts].
 *
 * Quedan **66**, y ninguno pide saber de retenciones para elegirlo.
 *
 * ⚠️ Los nombres se conservan tal cual venían salvo en las familias fusionadas.
 * Las mayúsculas raras y los duplicados de matiz ("Administración Propiedad
 * Horizontal" y "…Horizontal 1", tres "Reparación N a cargo del propietario")
 * son del catálogo original: se dejan para que la migración cuadre uno a uno, y
 * son la primera lista para limpiar CON la inmobiliaria, no por nuestra cuenta.
 */

import type { BaseTributaria } from './escenarios-tributarios'

/** Quién pone y quién recibe la plata de un concepto. */
export type Parte = 'INQUILINO' | 'PROPIETARIO' | 'INMOBILIARIA' | 'TERCERO'

export interface Concepto {
  /** Estable: es lo que se guarda, no el nombre. */
  id: string
  nombre: string
  /** Cómo se comporta ante los impuestos. Antes vivía dentro del nombre. */
  base: BaseTributaria
  paga: Parte
  recibe: Parte
}

export const CONCEPTOS: Concepto[] = [
  { id: 'abono-a-canon', nombre: "Abono A Canon", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-a-cargo-del-inquilino', nombre: "Administracion a cargo del inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-pf', nombre: "Administracion PF", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-plataforma-virtual', nombre: "Administración Plataforma Virtual", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-propiedad-horizontal', nombre: "Administración Propiedad Horizontal", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-propiedad-horizontal-1', nombre: "Administración Propiedad Horizontal 1", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'administracion-propietario', nombre: "Administración propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'ajuste-al-peso-mayor-valor-pagado', nombre: "Ajuste al peso mayor valor pagado", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'ajuste-al-peso-menor-valor-pagado', nombre: "Ajuste al peso menor valor pagado", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'anticipo-servicios-publicos-inquilino', nombre: "Anticipo Servicios Públicos Inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'aseo', nombre: "Aseo", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'avaluos', nombre: "Avaluos", base: 'SERVICIO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'bonificacion', nombre: "BONIFICACIÓN", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  /** Reemplaza 9 variantes del catálogo viejo: Canon De Arrendamiento con IVA · Canon De Arrendamiento Con Iva y Retención · Canon De Arrendamiento Con Iva, Retención Y Retecree · Canon De Arrendamiento con IVA, RF y Reteiva · Canon De Arrendamiento con Iva, RF, Reteica y Reteiva · Canon De Arrendamiento con IVA, RF, y Reteica · Canon De Arrendamiento Con Retencion · CANON DE ARRENDAMIENTO INMUEBLE ARRENDADO · Canon De Arrendamiento Personas Naturales */
  { id: 'canon-arrendamiento', nombre: "Canon de arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'PROPIETARIO' },
  { id: 'cobertura-por-restitucion-o-abandono', nombre: "Cobertura por restitución o abandono", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'cobro-de-servicios-publicos-inquilino', nombre: "Cobro De Servicios Públicos Inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'cobro-de-servicios-publicos-propietario', nombre: "Cobro De Servicios Públicos Propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'comision-captacion-de-inmueble', nombre: "Comisión captación de inmueble", base: 'COMISION', paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' },
  /** Reemplaza 4 variantes del catálogo viejo: Comision contrato de arrendamiento · Comision del contrato con IVA y RF  del 11% PJURIDICAS · Comisión Del Contrato con IVA y RF del 11% · Comisión Del Contrato Entre Personas Naturales */
  { id: 'comision-contrato', nombre: "Comisión del contrato", base: 'COMISION', paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' },
  /** Reemplaza 2 variantes del catálogo viejo: Comision Inicial 20% · Comision Inicial Inquilino 20% Con Iva Del 19% */
  { id: 'comision-inicial', nombre: "Comisión inicial", base: 'COMISION', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'comision-por-cesion', nombre: "Comision Por Cesion", base: 'COMISION', paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' },
  { id: 'compra-de-gastos-varios', nombre: "Compra de gastos varios", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'cuota-extra-admon', nombre: "Cuota Extra Admon", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'danos-asumidos-por-el-inquilino', nombre: "Daños Asumidos Por El Inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'danos-asumidos-por-la-inmobiliaria', nombre: "Daños Asumidos Por La Inmobiliaria", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'descuento-convenio-fondelco', nombre: "Descuento convenio Fondelco", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'devolucion-por-servicios-publicos-inquilino', nombre: "Devolución por Servicios Públicos Inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'devolucion-por-servicios-publicos-propietario', nombre: "Devolución Por Servicios Públicos Propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'devolucion-reparaciones-propietario', nombre: "Devolución reparaciones propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'devolucion-retefuente-comision', nombre: "DEVOLUCIÓN RETEFUENTE COMISION", base: 'COMISION', paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' },
  { id: 'devolucion-servicios-publicos-acuerdos-de-pago', nombre: "Devolución Servicios Públicos Acuerdos De Pago", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'gasto-administrativo-por-mora', nombre: "Gasto administrativo por mora", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  /** Reemplaza 2 variantes del catálogo viejo: Impuesto Predial · IMPUESTO PREDIAL */
  { id: 'impuesto-predial', nombre: "Impuesto predial", base: 'NO_GRAVADO', paga: 'PROPIETARIO', recibe: 'TERCERO' },
  /** Reemplaza 3 variantes del catálogo viejo: Incremento Canon De Arrendamiento · Incremento canon de arrendamiento con IVA · Incremento canon de arrendamiento con Iva y Retención */
  { id: 'incremento-canon', nombre: "Incremento del canon", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'PROPIETARIO' },
  { id: 'ingreso-por-deducciones-varias', nombre: "Ingreso por deducciones varias", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'interes-mora-arrendamiento', nombre: "Interés Mora Arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'iva', nombre: "IVA", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'mano-de-obra-acondicionamiento-edficios', nombre: "Mano de obra acondicionamiento edficios", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'multa-por-desocupacion-anticipada-de-inquilino', nombre: "Multa Por Desocupación Anticipada De Inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'nomina', nombre: "NOMINA", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'otros-valores-canon', nombre: "Otros Valores Canon", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'pago-anticipado-canon-de-arrendamiento', nombre: "Pago Anticipado Canon De Arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'papeleria', nombre: "Papeleria", base: 'SERVICIO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'parqueadero-independiente', nombre: "Parqueadero Independiente", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'pintura-para-interiores', nombre: "Pintura para interiores", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'poliza-seguro-propietario', nombre: "POLIZA SEGURO PROPIETARIO", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'publicidad-y-propaganda', nombre: "Publicidad y Propaganda", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'reajuste-canon-de-arrendamiento', nombre: "Reajuste canon de arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'reajuste-canon-de-arrendamiento-dias-adicionales', nombre: "Reajuste canon de arrendamiento días adicionales", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'reajuste-canon-retribuible-a-propietario', nombre: "Reajuste canon retribuible a propietario", base: 'ARRENDAMIENTO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'reintegro-canon-de-arrendamiento-a-fianly', nombre: "Reintegro canon de arrendamiento a Fianly", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'remodelacion-inquilino', nombre: "REMODELACIÓN INQUILINO", base: 'SERVICIO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'renovacion-extemporanea', nombre: "Renovación extemporánea", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'renta-administrada', nombre: "RENTA ADMINISTRADA", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'reparacion-1-a-cargo-del-propietario', nombre: "Reparación 1 a cargo del propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'reparacion-2-a-cargo-del-propietario', nombre: "Reparación 2 a cargo del propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'reparacion-3-a-cargo-del-propietario', nombre: "Reparación 3 a cargo del propietario", base: 'NO_GRAVADO', paga: 'INMOBILIARIA', recibe: 'PROPIETARIO' },
  { id: 'reparacion-a-cargo-del-inquilino', nombre: "Reparación a cargo del inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'reparacion-asumida-por-el-inquilino', nombre: "Reparación asumida por el inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'resta-canon', nombre: "Resta Canon", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'retroactivo', nombre: "RETROACTIVO", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'saldo-a-favor-inquilino', nombre: "Saldo a favor inquilino", base: 'NO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'seguro-de-arrendamiento', nombre: "Seguro De Arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'servicio-adelantamiento-canon-de-arrendamiento', nombre: "Servicio Adelantamiento Canon De Arrendamiento", base: 'ARRENDAMIENTO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },
  { id: 'servicios-inmobiliarios', nombre: "Servicios Inmobiliarios", base: 'COMISION', paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' },
  { id: 'venta-de-inmueble', nombre: "VENTA DE INMUEBLE", base: 'SERVICIO_GRAVADO', paga: 'INQUILINO', recibe: 'INMOBILIARIA' },]

export function conceptoPorId(id: string): Concepto | undefined {
  return CONCEPTOS.find((c) => c.id === id)
}

/** Los que mueven el grueso de la plata, para ofrecerlos primero. */
export const CONCEPTOS_FRECUENTES = [
  'canon-arrendamiento',
  'administracion-propiedad-horizontal',
  'comision-contrato',
  'seguro-de-arrendamiento',
  'interes-mora-arrendamiento',
  'cobro-de-servicios-publicos-inquilino',
] as const
