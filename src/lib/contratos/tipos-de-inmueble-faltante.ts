/**
 * Los tipos que la persona puede elegir al crear, desde la migración de
 * contratos, un inmueble que no estaba cargado (QA-MIG-A, MG-34).
 *
 * El back deduce el tipo de la dirección cuando la dirección lo dice («CASA 7»,
 * «AP 801», «LC 101»…) y sólo usa éste para las que no lo dicen. Sin ninguno
 * de los dos no crea nada: antes nacían todos como apartamento.
 */
export const TIPOS_DE_INMUEBLE_FALTANTE = [
  { valor: 'APARTMENT', etiqueta: 'Apartamento' },
  { valor: 'STUDIO', etiqueta: 'Apartaestudio' },
  { valor: 'HOUSE', etiqueta: 'Casa' },
  { valor: 'ROOM', etiqueta: 'Habitación' },
  { valor: 'COMMERCIAL', etiqueta: 'Local' },
  { valor: 'OFFICE', etiqueta: 'Oficina' },
  { valor: 'WAREHOUSE', etiqueta: 'Bodega' },
  { valor: 'PARKING', etiqueta: 'Parqueadero' },
  { valor: 'LAND', etiqueta: 'Lote' },
] as const

export type TipoDeInmuebleFaltante = (typeof TIPOS_DE_INMUEBLE_FALTANTE)[number]['valor']

/** Sentinel de Radix: un `<Select>` no admite `value=""`. */
export const SIN_TIPO = '__sin_tipo__'
