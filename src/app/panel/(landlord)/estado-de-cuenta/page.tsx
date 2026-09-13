'use client';

/**
 * «Mi estado de cuenta» en el portal del PROPIETARIO.
 *
 * Lo que la inmobiliaria le ha girado y lo que le falta por girar, contrato por
 * contrato, con la comisión y sus impuestos. CEO: «Con eso le digo a la DIAN
 * (exógena) cuánto le he pagado a cada propietario desde 2022» — el propietario
 * necesita el mismo papel para su declaración.
 *
 * Mismo endpoint que el portal del inquilino
 * (`GET /inmobiliaria/estado-de-cuenta/mio`): el back resuelve por el rol de la
 * sesión con qué sombrero entra la persona. Uno solo, porque «mi estado de
 * cuenta» quiere decir lo mismo de los dos lados.
 */

import { PantallaDelEstadoDeCuenta } from '@/components/estado-de-cuenta/PantallaDelEstadoDeCuenta';
import { BotonDescargarPDF } from '@/components/estado-de-cuenta/BotonDescargarPDF';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';

export default function MiEstadoDeCuentaDelPropietarioPage() {
  return (
    <PantallaDelEstadoDeCuenta
      cargar={() => estadoDeCuentaApi.mio()}
      volverA={{ label: 'Volver al panel', href: '/panel' }}
      acciones={(doc, nota) => (
        <BotonDescargarPDF doc={doc} hoy={doc.fecha} nota={nota} />
      )}
    />
  );
}
