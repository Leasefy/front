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
      // C2 (revisora r25): el contenedor de las demás pantallas del portal (antes p-4 y centrado a 1200 px: a 390
      // arrancaba en x = 16). La pieza es compartida con el panel y el enlace público: se ajusta sólo aquí.
      className="mx-0 max-w-none p-6 lg:p-8"
      volverA={{ label: 'Volver a pagos', href: '/inquilino/pagos' }}
      // Glow up 22-10: el encabezado de las demás pantallas del portal (la sección del riel; «Pagos» es la pestaña
      // de al lado, así que el «Volver a pagos» sólo queda en el fallo).
      encabezado={{
        seccion: 'Mi arriendo',
        descripcion: 'Cada cuota de tu contrato, lo que ya pagaste y lo que te falta.',
      }}
      // Revisora r23 (portal del inquilino): el vacío le habla a quien mira, no «Este cliente no tiene contratos»
      // (el texto del panel). Lo mismo que el portal del propietario.
      // Revisora r24: una sola voz («tu inmobiliaria», sin «con nosotros») y la salida del vacío.
      textosSinContratos={{
        titulo: 'Todavía no tienes un contrato de arriendo',
        detalle: 'Cuando tu inmobiliaria lo firme, aquí ves cada cuota, lo que pagaste y lo que te falta.',
        accion: { label: 'Ver inmuebles para mí', href: '/inquilino/para-ti' },
      }}
      acciones={(doc, nota) => (
        <BotonDescargarPDF doc={doc} hoy={doc.fecha} nota={nota} />
      )}
    />
  );
}
