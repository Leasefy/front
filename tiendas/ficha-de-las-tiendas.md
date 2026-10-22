# Ficha de Leasefy en App Store y Google Play

Todo en español de Colombia. Lo que va entre «» se copia tal cual.

## Datos comunes

| Campo | Valor |
|---|---|
| Nombre de la app | «Leasefy» |
| Identificador (bundle / paquete) | `co.leasefy.app` |
| Categoría | Negocios (principal) · Finanzas (secundaria, sólo Apple) |
| Sitio web | https://leasefy.co |
| Soporte | https://leasefy.co/ayuda · hola@leasefy.co |
| Política de privacidad | https://leasefy.co/privacidad |
| Borrar la cuenta y los datos (Google lo pide en la web) | https://leasefy.co/arco — y dentro de la app: Perfil › «Eliminar mi cuenta» |
| Edad | 18+ en Google (contratos y pagos); 4+ en Apple (no hay contenido para adultos) |
| Anuncios | No |
| Compras dentro de la app | No. El arriendo se paga con Wompi (un servicio del mundo real, Apple 3.1.3(e)); el plan de la inmobiliaria lo contrata la empresa con Leasefy, no se compra en la app (Apple 3.1.3(c)). |

## App Store (Apple)

- **Subtítulo** (30): «Arriendos, pagos y contratos»
- **Texto promocional** (170): «Paga tu arriendo, firma contratos y sigue tu inmueble desde el celular. Para inmobiliarias, propietarios e inquilinos en Colombia.»
- **Palabras clave** (100): `arriendo,inmobiliaria,canon,inquilino,propietario,contrato,pago,cobranza,arrendamiento,finca raiz`
- **Descripción**:

> Leasefy es la plataforma de arriendos de las inmobiliarias de Colombia. Con la app tienes todo en el celular.
>
> SI ERES INQUILINO
> • Paga tu arriendo con PSE, tarjeta o Nequi y descarga tus recibos.
> • Mira tu estado de cuenta, tus contratos y las fechas de pago.
> • Pide reparaciones con fotos y sigue cada solicitud.
> • Recibe un aviso antes de que venza tu pago.
>
> SI ERES PROPIETARIO
> • Sigue tus inmuebles, tus giros y tus facturas.
> • Descarga tus certificados y extractos cuando los necesites.
> • Aprueba gastos y revisa lo que hace tu inmobiliaria.
>
> SI TRABAJAS EN UNA INMOBILIARIA
> • Contratos, cobranza, propietarios, pagos y contabilidad en un solo lugar.
> • Los agentes de Leasefy se encargan de la cobranza, la conciliación y el estudio de inquilinos.
> • Avisos al instante cuando entra un pago o llega una solicitud.
>
> Tu información viaja cifrada y sólo la ve quien tiene permiso. Entras con tu correo, con Google o con Apple.

- **Notas para la revisión** (en inglés, el revisor las lee así):

> Leasefy is a property-management platform for real-estate agencies in Colombia. Tenants pay their rent (a real-world service) through Wompi, a Colombian payment gateway; agencies subscribe to Leasefy through a B2B contract outside the app, so there are no digital purchases inside the app.
> Demo account (tenant): [CORREO] / [CONTRASEÑA]. Demo account (agency, no second factor for this account): [CORREO] / [CONTRASEÑA].
> Native features: Sign in with Apple, push notifications, share sheet for PDF/Excel documents, camera for inspections and documents.

### Privacidad en App Store Connect («Etiqueta de privacidad»)

Ningún dato se usa para rastrear a la persona entre apps de otras empresas. Todo está **vinculado a la identidad** de quien usa la app.

| Tipo de dato | Para qué |
|---|---|
| Información de contacto: nombre, correo, teléfono, dirección | Funcionamiento de la app |
| Información financiera: historial de pagos, cuentas bancarias de los propietarios para los giros | Funcionamiento de la app |
| Información sensible: número de documento; estudio de crédito del inquilino (sólo si lo pide) | Funcionamiento de la app |
| Contenido del usuario: fotos, documentos, mensajes con la inmobiliaria y el asistente | Funcionamiento de la app |
| Identificadores: id de la cuenta | Funcionamiento de la app |
| Diagnóstico: registros de fallos | Funcionamiento de la app |

No se recolecta ubicación, contactos, historial de navegación ni datos de uso con fines publicitarios.

## Google Play

- **Nombre** (30): «Leasefy: arriendos y pagos»
- **Descripción breve** (80): «Paga tu arriendo, firma contratos y administra inmuebles desde el celular.»
- **Descripción completa**: la misma de Apple.
- **Seguridad de los datos**: los mismos tipos de la tabla de Apple. Cifrados en tránsito: sí. La persona puede pedir que se borren: sí (en la app y en https://leasefy.co/arco). Se comparten con terceros: con la pasarela de pagos (Wompi) para cobrar, y con la aseguradora sólo si el inquilino pide el estudio.
- **Gráfico de funciones** (1024 × 500): `tiendas/grafico-de-funciones.png`.

## Capturas que faltan

Con una inmobiliaria de demostración (datos inventados; nunca datos de clientes):

- iPhone 6,9" (1320 × 2868) y 6,5" (1284 × 2778): 4 a 6 capturas. No hacen falta de iPad: la app es sólo
  para iPhone.
- Android teléfono (1080 × 1920 o más): 4 a 8 capturas.

Pantallas sugeridas: inicio del inquilino con su próximo pago · pagar el arriendo · estado de cuenta ·
solicitudes con fotos · inicio de la inmobiliaria · cobranza · ficha del contrato.

## Antes de mandar a revisión (lo que puede hacer que la rechacen)

1. **Reportar y bloquear**: el marketplace deja publicar inmuebles y escribir mensajes. Apple (1.2) y
   Google piden que se pueda reportar una publicación o a una persona, y bloquearla. Ya existe «Reportar
   esta publicación» al pie de la ficha (correo a hola@leasefy.co); bloquear a una persona todavía no.
2. **Cuenta de demostración** que entre sin segundo factor (o con instrucciones claras), con datos inventados.
3. **Avalúo pagado**: si alguien compra un avalúo desde la app de iPhone, Apple puede decir que es un
   contenido digital y exigir su cobro (15–30 %). Si lo objetan, se esconde la compra del avalúo en iPhone.
