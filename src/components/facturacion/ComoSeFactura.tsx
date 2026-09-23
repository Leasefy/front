'use client';

import { ParaEntenderMas } from '@/components/ui/para-entender-mas';

/**
 * «Cómo se factura» — lo que Facturación todavía NO hace, dicho detrás de un
 * botón (regla del molde, Nico 22-09: el párrafo gris encima de la tabla «se
 * ve tirado»).
 *
 * Vive en el ENCABEZADO de la pantalla, donde iría su botón de acción, y en
 * variante secundaria. Nico, 23-09, viéndolo como botón fantasma solo a la
 * derecha dentro de la tarjeta: «mira tan feo ese espacio que hay en la
 * izquierda solo porque colocaste ese botón… déjalo arriba donde iría el
 * botón». Una fila entera para un botón empujaba el mes y la tabla hacia abajo.
 */
export function ComoSeFactura() {
  return (
    <ParaEntenderMas etiqueta="Cómo se factura" variante="secundario">
      <p>
        Cada factura sale de la cuota del contrato: el mismo canon, el mismo
        prorrateo y los mismos impuestos que el cliente ve en su estado de
        cuenta. Una cuota que se generó sin escenario tributario confirmado se
        factura SIN impuestos y se marca «sin confirmar»: nunca se factura un
        impuesto que nadie confirmó. La factura se numera con la resolución
        vigente de la DIAN, pero todavía no se transmite electrónicamente (sin
        CUFE ni validación): eso necesita el proveedor tecnológico de la
        inmobiliaria.
      </p>
    </ParaEntenderMas>
  );
}
