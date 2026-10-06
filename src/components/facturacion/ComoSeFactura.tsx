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
      {/* 🔴 QA-FACT (03-10-2026), con las decisiones de Nico de ese día: sin
          escenario confirmado NO se emite (antes decía que se facturaba sin
          impuestos), los intereses van en factura aparte cuando se pagan, la
          comisión sale cuando se gira, y el proveedor tecnológico es UNO de
          Leasefy para todas (decía «de la inmobiliaria», FA-R27). */}
      <p>
        Cada factura sale de la cuota del contrato: el mismo canon, el mismo
        prorrateo y los mismos impuestos que el cliente ve en su estado de
        cuenta. Un contrato sin el escenario tributario confirmado no se
        factura hasta confirmarlo en el contrato: nunca sale una factura sin
        los impuestos que de verdad lleva. La factura del mes no lleva
        intereses de mora: se facturan aparte, cuando se pagan. La comisión
        del propietario se factura cuando se le gira. Cada factura se numera
        con la resolución vigente de la DIAN y Leasefy la transmite con su
        proveedor tecnológico: en «Electrónica (DIAN)» ves si ya está validada
        (con su CUFE) o qué le falta a tu inmobiliaria para transmitir.
      </p>
    </ParaEntenderMas>
  );
}
