'use client';

/**
 * «Mi estado de cuenta» en el portal del INQUILINO.
 *
 * Es el mismo documento que ve la inmobiliaria, con el mismo PDF: el inquilino
 * no tiene que pedirle a nadie que se lo mande. Hasta hoy, «Pagos» le mostraba
 * sus recibos uno por uno y nunca cuánto le falta por pagar del contrato
 * entero, que es la pregunta que la gente hace.
 *
 * 🔴 Se pide con `GET /inmobiliaria/estado-de-cuenta/mio` y no con
 * `/inquilino/:id`: acá no hay un id en la URL porque el cliente ES el dueño
 * del token. Pedirlo por id significaría que cualquiera puede escribir el id
 * de otro.
 */

import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { BotonDescargarPDF } from '@/components/estado-de-cuenta/BotonDescargarPDF';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';

export default function MiEstadoDeCuentaPage() {
  return (
    <PantallaDelEstadoDeCuenta
      cargar={() => estadoDeCuentaApi.mio()}
      volverA={{ label: 'Volver a pagos', href: '/inquilino/pagos' }}
      acciones={(doc, nota) => (
        <BotonDescargarPDF doc={doc} hoy={doc.fecha} nota={nota} />
      )}
    />
  );
}
