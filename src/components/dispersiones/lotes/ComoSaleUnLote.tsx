'use client';

/**
 * «¿Cómo funciona?» de Lotes al banco: los cinco pasos de un lote, en el cajón
 * de `ParaEntenderMas`, con el botón en el encabezado de la pantalla.
 *
 * Antes eran cinco pasos dibujados en una tira («1. Armas el lote… → 2. …»)
 * dentro de la tarjeta del mes, siempre a la vista. Nico (05-10-2026): «eso no
 * debe de estar ahí siempre […] llévalas al botón que al dar clic abre drawer
 * y explica mejor cada cosa y más bonito». En la tarjeta queda a la vista sólo
 * lo que es un aviso de seguridad: que armar el lote no gira plata y que el
 * archivo lo sube una persona al portal del banco (`lote-no-gira-solo`, en
 * `ListaDeLotes`), igual que la línea de Portales.
 *
 * Lo que dice cada paso sale del propio flujo: el diálogo de «Armar el lote»
 * («se congelan las dispersiones con los datos bancarios de hoy; todavía no se
 * gira nada», el administrador que aprueba al armar salvo que pase el monto del
 * segundo aprobador) y la tira que había.
 */

import { CheckCircle, DownloadSimple, ShieldCheck, Stack, UploadSimple } from '@phosphor-icons/react';

import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PasosExplicados, type PasoExplicado } from '@/components/ui/pasos-explicados';

export const PASOS_DE_UN_LOTE: PasoExplicado[] = [
  {
    id: 'armar',
    icono: Stack,
    titulo: 'Armas el lote eligiendo el banco',
    explicacion:
      'Eliges el mes y el banco desde el que giras. Se congelan las dispersiones con los datos bancarios de hoy; todavía no se gira nada.',
    quien: 'tu',
    tuParte: 'toca «Armar el lote» en la tarjeta del mes.',
  },
  {
    id: 'aprobar',
    icono: ShieldCheck,
    titulo: 'Otra persona lo aprueba con un código',
    explicacion:
      'Si lo arma un administrador, queda aprobado al armarlo, salvo que pase el monto del segundo aprobador (Configuración → Perfil → Dispersiones): ese lote lo aprueba otra persona.',
  },
  {
    id: 'descargar',
    icono: DownloadSimple,
    titulo: 'Descargas el archivo de ese banco',
    explicacion: 'Sale en el formato del banco que elegiste (o su planilla), desde el detalle del lote.',
    quien: 'tu',
  },
  {
    id: 'subir',
    icono: UploadSimple,
    titulo: 'Lo subes al portal del banco',
    explicacion: 'Con tu usuario, en la página del banco. Desde Leasefy no sale ningún giro.',
    quien: 'tu',
  },
  {
    id: 'pagado',
    icono: CheckCircle,
    titulo: 'Marcas el lote pagado',
    explicacion:
      'Cuando el banco ya pagó, lo dices en el detalle del lote con «Marcar pagado», junto a «Descargar archivo».',
    quien: 'tu',
  },
];

export function ComoSaleUnLote() {
  return (
    <ParaEntenderMas
      etiqueta="¿Cómo funciona?"
      titulo="Cómo sale un pago a propietarios"
      descripcion="Cinco pasos, del lote armado al lote pagado. La plata la gira el banco, no Leasefy."
      variante="secundario"
      className="self-start sm:shrink-0"
    >
      <PasosExplicados data-testid="como-sale-un-lote" pasos={PASOS_DE_UN_LOTE} />
    </ParaEntenderMas>
  );
}

export default ComoSaleUnLote;
