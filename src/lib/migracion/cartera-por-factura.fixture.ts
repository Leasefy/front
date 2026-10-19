/**
 * Header-only fixture of a real per-invoice tenant debt report (the one the
 * agency exported from its previous system). It carries the 22 column titles
 * and NO values: no document, name or amount of any person lives in the repo.
 */
export const ENCABEZADOS_DEL_INFORME_DE_CARTERA: readonly string[] = [
  'Nro. Factura',
  'Fecha de Factura',
  'Fecha de Vencimiento',
  'Documento Inquilino',
  'Nombre Inquilino',
  'Documento Propietario',
  'Nombre Propietario',
  'Concepto',
  'Detalle',
  'Contrato',
  'Valor Base',
  'Descuento',
  'IVA',
  'Retención',
  'Rete IVA',
  'Rete ICA',
  'Notas Débito/Crédito',
  'Valor Recibos',
  'Valor Total',
  'Saldo Pendiente',
  'Estado',
  'Días de Mora/Próximos',
]
