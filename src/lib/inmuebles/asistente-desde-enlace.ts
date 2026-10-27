/**
 * «Crear el inmueble desde un enlace» DENTRO del panel (Juan y Nico, 27-10-2026: «cuando se esté creando un
 * inmueble, también tenga la posibilidad de que con una URL le creemos el inmueble y hasta arrastremos las fotos,
 * todo lo que tiene el inmueble en ese link»). El publicador rápido (`/publica`) ya lo hacía; el asistente del
 * panel no.
 *
 * Esto sólo traduce lo leído (`InmuebleDesdeEnlace`, el mismo lector de `/api/inmuebles/desde-enlace`) a los
 * campos del asistente. Regla: lo que el aviso no dice NO se inventa, y lo que la persona ya escribió no se pisa
 * (`soloLoVacio`).
 */
import type { InmuebleDesdeEnlace } from './leer-enlace';
import type { WizardFormData } from '@/components/inmobiliaria/ConsignacionWizardSteps';

const TIPOS_DEL_ASISTENTE = ['apartment', 'house', 'studio', 'commercial', 'office', 'warehouse', 'parking', 'land'] as const;
type TipoDelAsistente = (typeof TIPOS_DEL_ASISTENTE)[number];

function tipoDelAsistente(clave: string | undefined): TipoDelAsistente | undefined {
  return (TIPOS_DEL_ASISTENTE as readonly string[]).includes(clave ?? '') ? (clave as TipoDelAsistente) : undefined;
}

/** Los campos del asistente que salen del aviso. */
export function datosDelAsistenteDesdeElEnlace(leido: InmuebleDesdeEnlace): Partial<WizardFormData> {
  const datos: Partial<WizardFormData> = {};
  const tipo = tipoDelAsistente(leido.tipo?.valor);
  if (tipo) datos.propertyType = tipo;
  if (leido.titulo?.valor) datos.propertyTitle = leido.titulo.valor.slice(0, 200);
  if (leido.descripcion?.valor) datos.propertyDescription = leido.descripcion.valor.slice(0, 5000);
  // Una referencia («cerca al parque») o el municipio no es la dirección exacta: no se pone como si lo fuera.
  if (leido.direccion?.valor && !leido.direccionAproximada) datos.propertyAddress = leido.direccion.valor;
  if (leido.ciudad?.valor) datos.propertyCity = leido.ciudad.valor;
  if (leido.barrio?.valor) datos.propertyZone = leido.barrio.valor;
  if (leido.departamento?.valor) datos.department = leido.departamento.valor;
  if (leido.negocio?.valor === 'venta') {
    datos.listingType = 'sale';
    datos.tambienEnVenta = false;
    if (leido.precioVenta?.valor) datos.salePrice = leido.precioVenta.valor;
  } else if (leido.negocio?.valor === 'arriendo') {
    datos.listingType = 'rent';
  }
  if (leido.canon?.valor && leido.negocio?.valor !== 'venta') datos.monthlyRent = leido.canon.valor;
  if (leido.administracion?.valor) datos.adminFee = leido.administracion.valor;
  if (leido.area?.valor) datos.area = Math.round(leido.area.valor);
  if (leido.habitaciones?.valor != null) datos.bedrooms = leido.habitaciones.valor;
  if (leido.banos?.valor != null) datos.bathrooms = leido.banos.valor;
  if (leido.videos?.[0]) datos.videoUrl = leido.videos[0];
  return datos;
}

/** Sólo lo que la persona todavía no escribió: el aviso completa, no pisa. */
export function soloLoVacio(
  actuales: Partial<WizardFormData>,
  delEnlace: Partial<WizardFormData>,
): Partial<WizardFormData> {
  const salida: Partial<WizardFormData> = {};
  for (const [clave, valor] of Object.entries(delEnlace) as [keyof WizardFormData, unknown][]) {
    const actual = actuales[clave];
    const vacio =
      actual === undefined ||
      actual === null ||
      (typeof actual === 'string' && actual.trim() === '') ||
      (typeof actual === 'number' && actual === 0);
    // El tipo de operación y el tipo de inmueble arrancan con un valor por defecto: el aviso sí los decide.
    if (vacio || clave === 'listingType' || clave === 'tambienEnVenta' || clave === 'propertyType') {
      (salida as Record<string, unknown>)[clave] = valor;
    }
  }
  return salida;
}

/** Qué campos trajo el enlace, en palabras, para decirlo («Trajimos el título, el canon y 12 fotos»). */
export function loQueTrajo(datos: Partial<WizardFormData>, fotos: number): string[] {
  const partes: string[] = [];
  if (datos.propertyTitle) partes.push('el título');
  if (datos.propertyType) partes.push('el tipo');
  if (datos.propertyAddress) partes.push('la dirección');
  else if (datos.propertyCity) partes.push('la ciudad');
  if (datos.monthlyRent) partes.push('el canon');
  if (datos.salePrice) partes.push('el precio de venta');
  if (datos.area || datos.bedrooms != null) partes.push('las características');
  if (datos.propertyDescription) partes.push('la descripción');
  if (datos.videoUrl) partes.push('el video');
  if (fotos > 0) partes.push(fotos === 1 ? '1 foto' : `${fotos} fotos`);
  return partes;
}
