/**
 * El WhatsApp de ventas de Leasefy (Nico, 20-10-2026). A quien publicó desde
 * el marketplace no le vendemos módulos: le vendemos EL SERVICIO. Somos más
 * que un marketplace: a la inmobiliaria se la manejamos en piloto automático y
 * al propietario le administramos su inmueble por menos de lo que cobra el
 * mercado. El precio se habla por WhatsApp; el pago (Wompi) cuando esté listo.
 */
export const WHATSAPP_DE_VENTAS = '573013075347';

/** Lo que se muestra: «+57 301 307 5347». */
export const WHATSAPP_DE_VENTAS_VISIBLE = '+57 301 307 5347';

export type QuienCompra = 'inmobiliaria' | 'propietario';

export interface ContextoDelMensaje {
  quien: QuienCompra;
  /** Nombre de pila de quien escribe. */
  nombre?: string | null;
  /** La inmobiliaria (sólo inmobiliaria). */
  empresa?: string | null;
  /** Lo que estaba mirando cuando quiso comprar («Cobranza», «Contratos»…). */
  queVio?: string | null;
}

/** El primer mensaje, ya escrito, para que sólo toque «Enviar». */
export function mensajeParaVentas({ quien, nombre, empresa, queVio }: ContextoDelMensaje): string {
  const soy = nombre?.trim() ? `Soy ${nombre.trim()}` : 'Hola';
  if (quien === 'inmobiliaria') {
    const de = empresa?.trim() ? `, de ${empresa.trim()}` : '';
    const vi = queVio?.trim() ? ` Estaba mirando ${queVio.trim()} en mi cuenta.` : '';
    return (
      `Hola, Leasefy. ${soy}${de}. Ya publiqué nuestros inmuebles en su marketplace.${vi} ` +
      'Quiero saber cómo pueden manejar mi inmobiliaria en piloto automático: cobranza, contratos, pagos a propietarios y contabilidad.'
    );
  }
  const vi = queVio?.trim() ? ` Vi ${queVio.trim()} en mi cuenta.` : '';
  return (
    `Hola, Leasefy. ${soy}. Publiqué mi inmueble en su marketplace.${vi} ` +
    'Quiero que me ayuden a administrarlo: arrendarlo bien, cobrar el arriendo y tener el contrato en regla. ¿Cuánto me cuesta?'
  );
}

export function enlaceDeWhatsApp(contexto: ContextoDelMensaje): string {
  return `https://wa.me/${WHATSAPP_DE_VENTAS}?text=${encodeURIComponent(mensajeParaVentas(contexto))}`;
}
