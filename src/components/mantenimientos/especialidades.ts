/**
 * Los oficios de un proveedor, en palabras.
 *
 * Los valores son los del enum del back (`MantenimientoType`, en mayúsculas y
 * con `OTHER_MAINT` para no chocar en Prisma). Viven acá y no dentro de una
 * pantalla porque los usan dos: la tabla, que los pinta y filtra por ellos, y
 * el formulario, que los ofrece al registrar.
 */

export const ESPECIALIDADES: Array<{ valor: string; label: string }> = [
  { valor: 'PLUMBING', label: 'Plomería' },
  { valor: 'ELECTRICAL', label: 'Electricidad' },
  { valor: 'APPLIANCE', label: 'Electrodomésticos' },
  { valor: 'STRUCTURAL', label: 'Estructural' },
  { valor: 'PAINTING', label: 'Pintura' },
  { valor: 'LOCKS', label: 'Cerrajería' },
  { valor: 'OTHER_MAINT', label: 'Otros' },
];

export const EN_PALABRAS = new Map(ESPECIALIDADES.map((e) => [e.valor, e.label]));
