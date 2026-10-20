/**
 * El inglés de las frases del GLOW UP de UX (20-10-2026), aparte de
 * `frases-en.ts` para que el rediseño y las demás sesiones no se pisen en el
 * mismo archivo. Se mezcla al principio de `FRASES_EN`: si una frase ya existe
 * allá, gana la de allá. La clave es el texto EXACTO que se ve en español.
 */
export const FRASES_EN_DEL_GLOW_UP: Record<string, string> = {
  // components/pantalla/ListaParaEmpezar.tsx
  'Ocultar': 'Hide',
  'Ver': 'Show',
  'Ver lo que falta': "See what's missing",
  'Sigue': 'Next',
  'Opcional': 'Optional',
  'Todo listo para {que}': 'All set to {que}',
  'Revisando lo que necesitas para {que}…': 'Checking what you need to {que}…',
  'No pudimos revisar todo lo que necesitas para {que}': "We couldn't check everything you need to {que}",
  'Para {que} te falta 1 paso': '1 step left to {que}',
  'Para {que} te faltan {n} pasos': '{n} steps left to {que}',
  '{n} de {total} listos': '{n} of {total} done',
  'Listo': 'Done',
  'Revisando': 'Checking',
  'No se pudo revisar': "Couldn't check",
  'Paso {n}, falta': 'Step {n}, to do',
  // components/pantalla/PasosDeLaTarea.tsx
  '{n} de {total}': '{n} of {total}',
  'Cerrar': 'Close',
  'Cambiar': 'Change',
  'Paso {n}, hecho': 'Step {n}, done',
  'Paso {n}, el que sigue': 'Step {n}, next',
  'Paso {n}, después': 'Step {n}, later',
  // components/pantalla/MasDetalles.tsx
  'Ver detalles': 'Show details',
  'Ocultar detalles': 'Hide details',
  // app/panel/inmobiliaria/facturacion/page.tsx
  'Resolución y numeración': 'Resolution and numbering',
  'El permiso de la DIAN con el que se numeran tus facturas, y con qué resolución sale cada tipo de documento.':
    'The DIAN authorization your invoices are numbered with, and which resolution each document type uses.',
  'Volver a la facturación': 'Back to invoicing',
  'Factura cada mes a tus inquilinos y propietarios, y sigue lo que emitiste ante la DIAN.':
    'Invoice your tenants and owners every month, and track what you issued with the DIAN.',
  'Facturar el mes': "Invoice this month",
  'Emitidas': 'Issued',
  'Certificados': 'Certificates',
  'Qué documentos ver': 'Which documents to show',
  'Facturas de venta': 'Sales invoices',
  'Notas crédito y débito': 'Credit and debit notes',
  'Qué compras ver': 'Which purchases to show',
  'Facturas de proveedores': 'Supplier invoices',
  'A quién le falta el correo': 'Who is missing an email',
  'Sin correo, su factura queda sin entregar y la aceptación tácita no corre. Se completa en su ficha.':
    "Without an email, their invoice isn't delivered and tacit acceptance doesn't run. Fill it in on their profile.",
  // components/facturacion/LoQueNecesitasParaFacturar.tsx
  'facturar': 'invoice',
  'Se hace una sola vez. Empieza por el que dice «Sigue».': 'You do this once. Start with the one marked “Next”.',
  'No pudimos leer tus resoluciones. Recarga la página para volver a revisar.':
    "We couldn't read your resolutions. Reload the page to check again.",
  'Resolución {numero}{prefijo}: quedan {n} números.': 'Resolution {numero}{prefijo}: {n} numbers left.',
  'Cada documento del mes tiene con qué numerarse.': "Every document this month has a resolution to be numbered with.",
  'Falta la que numera «{tipo}».': 'Missing the one that numbers “{tipo}”.',
  'Sin ella no se numera ninguna factura. Son los datos del papel que te dio la DIAN.':
    "Without it no invoice gets numbered. It's the data on the document the DIAN gave you.",
  'La resolución de facturación de la DIAN': "The DIAN invoicing resolution",
  'Cargar la resolución': 'Upload the resolution',
  'Ver resoluciones': 'See resolutions',
  'El tipo de documento de 1 propietario': "1 owner's document type",
  'El tipo de documento de {n} propietarios': "{n} owners' document type",
  'Sin él, su factura por mandato no se emite.': "Without it, their mandate invoice isn't issued.",
  'Completar la ficha': 'Complete the profile',
  'Completar las fichas': 'Complete the profiles',
  'La factura electrónica ante la DIAN': 'E-invoicing with the DIAN',
  'Transmitiendo en el ambiente de pruebas de la DIAN.': "Transmitting in the DIAN's test environment.",
  'Se habilita cuando cargues la resolución.': "It's enabled once you upload the resolution.",
  'Ver los pasos': 'See the steps',
  'Lo habilita el administrador.': 'The administrator enables it.',
  'No pudimos leer en qué va tu habilitación.': "We couldn't read the status of your enablement.",
  'El correo de tus inquilinos y propietarios': "Your tenants' and owners' email",
  'No pudimos revisar a quién le falta.': "We couldn't check who is missing one.",
  'Todos tienen correo: sus facturas les llegan.': 'Everyone has an email: their invoices reach them.',
  '{n} de {total} no tienen correo: sus facturas quedan sin entregar.':
    "{n} of {total} have no email: their invoices aren't delivered.",
  'No frena la factura': "Doesn't block invoicing",
  'Ver a quién le falta': 'See who is missing one',
}
