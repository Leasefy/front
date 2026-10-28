import type { NombreIlustracion } from '@leasefy/cadence';

/**
 * Lo que trae el mes de Leasefy completo, con su 3D: la página del aliado (`/aliados/<codigo>`) y la del colega que
 * invita (`/r/<codigo>`, Refiere y gana) dicen lo mismo.
 */
export const LO_QUE_TRAE_EL_MES: readonly { ilustracion: NombreIlustracion; titulo: string; texto: string }[] = [
  { ilustracion: 'casa', titulo: 'Publica gratis, siempre', texto: 'Tus inmuebles en el marketplace de Leasefy y tu página de inmobiliaria.' },
  { ilustracion: 'firma', titulo: 'Contratos en línea', texto: 'Desde la plantilla legal, con firma electrónica e inventario.' },
  { ilustracion: 'banco', titulo: 'El arriendo entra y sale solo', texto: 'Links de pago, conciliación con el banco y giros a los propietarios.' },
  { ilustracion: 'sobre_cobro', titulo: 'Mori cobra por ti', texto: 'Llama y escribe por WhatsApp a quien se atrasa, con el tono de tu inmobiliaria.' },
  { ilustracion: 'factura', titulo: 'Facturación y contabilidad', texto: 'Facturas ante la DIAN y asientos automáticos, sin digitar.' },
  { ilustracion: 'novedad_cohete', titulo: 'Agentes de IA', texto: 'Avalúos, estudios de inquilinos y cobranza que trabajan mientras duermes.' },
];
