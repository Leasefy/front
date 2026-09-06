/**
 * Los artículos del blog. Única fuente: `/blog` y `/blog/[slug]` leen de acá,
 * y `generateStaticParams` genera una ruta por `slug`.
 *
 * ## El formato de `content`
 *
 * `BlogArticle.renderContent` entiende un markdown reducido, y sólo esto:
 * `## Título` abre una sección; una línea que empieza Y termina en asteriscos
 * dobles es una etiqueta destacada; `1. **Título**: cuerpo` arma una lista
 * numerada —los renglones seguidos se agrupan en un solo `<ol>` aunque tengan
 * una línea en blanco en medio—; la negrita dentro de un párrafo funciona; y
 * una línea en blanco es un respiro entre bloques.
 *
 * 🔴 Lo que NO entiende: viñetas con guion (salen como un párrafo que empieza
 * con guion), enlaces markdown, imágenes, citas y tablas. Y como `content` es
 * un template literal, no puede llevar acentos graves ni interpolaciones.
 *
 * `author` y `tags` alimentan el JSON-LD del artículo y el Open Graph; sin
 * ellos la ficha del buscador queda sin autor y sin palabras clave.
 * `readTime` está calculado sobre el texto real, a 180 palabras por minuto
 * redondeando hacia arriba:
 * si editas un artículo, ajústalo.
 */
export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  href: string;
  content?: string;
  author?: string;
  tags?: string[];
}

export const blogPosts: BlogPost[] = [
  {
    title: "Las mejores formas de invertir en propiedades en Colombia en 2026",
    slug: "invertir-propiedades-colombia",
    excerpt: "Desde apartaestudios en Medellín hasta locales comerciales en Bogotá, te mostramos dónde está la rentabilidad real.",
    category: "Inversiones",
    date: "Ene 15, 2026",
    readTime: "4 min",
    image: "https://images.pexels.com/photos/2119714/pexels-photo-2119714.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/invertir-propiedades-colombia",
    author: "Equipo Leasefy",
    tags: ["inversión inmobiliaria", "rentabilidad", "apartaestudios", "locales comerciales", "Colombia"],
    content: `Colombia se consolida como uno de los destinos más atractivos para la inversión inmobiliaria en América Latina. Con una economía en crecimiento, una clase media en expansión y un marco regulatorio cada vez más favorable para inversionistas nacionales y extranjeros, el 2026 presenta oportunidades únicas para quienes buscan rentabilidad en el sector de finca raíz.

En este artículo, exploramos las mejores estrategias y tipos de propiedad para invertir, con datos reales del mercado colombiano.

## Apartaestudios en Medellín: alta demanda, rotación rápida

Medellín se ha posicionado como la ciudad con mayor demanda de arriendos de corta y mediana estadía. Los apartaestudios de 25 a 45 m² en zonas como El Poblado, Laureles y Envigado ofrecen tasas de ocupación superiores al 85% anual.

La rentabilidad bruta promedio oscila entre el 7% y el 9% anual, superando significativamente las tasas de interés de los CDTs. La clave está en elegir propiedades con buena conectividad al metro y a zonas comerciales.

**Inversión típica:** $180 - $350 millones COP
**Rentabilidad esperada:** 7% - 9% bruto anual

## Locales comerciales en Bogotá: estabilidad y contratos largos

Los locales comerciales en zonas de alto tráfico en Bogotá —como Chapinero, Usaquén y la Zona T— ofrecen una ventaja clave: contratos de arriendo a largo plazo (3 a 5 años) con incrementos anuales indexados al IPC.

Aunque la inversión inicial es mayor, la estabilidad de ingresos y la menor rotación de inquilinos hacen de esta una opción ideal para inversionistas conservadores que buscan flujo de caja predecible.

**Inversión típica:** $400 - $900 millones COP
**Rentabilidad esperada:** 6% - 8% bruto anual

## Casas en ciudades intermedias: la apuesta de largo plazo

Ciudades como Pereira, Bucaramanga, Santa Marta y Villavicencio están experimentando un boom inmobiliario impulsado por la migración interna y el crecimiento del trabajo remoto. Los precios por metro cuadrado son entre un 40% y 60% más bajos que en Bogotá, lo que permite una entrada más accesible al mercado.

Las casas en estas ciudades, especialmente en barrios en desarrollo, ofrecen potencial de valorización del 10% al 15% anual, además de ingresos por arriendo.

**Inversión típica:** $150 - $280 millones COP
**Rentabilidad esperada:** 5% - 7% bruto anual + valorización

## Propiedades para arriendo vacacional: el modelo Airbnb

El turismo en Colombia sigue creciendo. Ciudades como Cartagena, Santa Marta y el Eje Cafetero son focos de arriendo vacacional con alta demanda tanto nacional como internacional.

Un apartamento bien ubicado y amoblado puede generar ingresos 2 a 3 veces superiores al arriendo tradicional, aunque requiere mayor gestión operativa. Plataformas como Airbnb y Booking facilitan la comercialización, pero es fundamental considerar los costos de administración, limpieza y mantenimiento.

**Inversión típica:** $200 - $500 millones COP
**Rentabilidad esperada:** 9% - 14% bruto anual (con gestión activa)

## Fondos de inversión inmobiliaria (FICs): diversificación sin gestión

Para quienes prefieren no administrar propiedades directamente, los Fondos de Inversión Colectiva inmobiliarios ofrecen exposición al sector con tickets de entrada desde $5 millones COP.

Estos fondos invierten en portafolios diversificados de propiedades comerciales, residenciales e industriales, ofreciendo liquidez parcial y gestión profesional. Es importante revisar las comisiones y el track record del fondo antes de invertir.

**Inversión mínima:** $5 - $50 millones COP
**Rentabilidad esperada:** 5% - 8% bruto anual

## Consejos prácticos antes de invertir

1. **Investiga la zona**: Revisa los planes de desarrollo urbano (POT) de la ciudad. Las zonas con proyectos de infraestructura tienden a valorizarse más rápido.

2. **Calcula la rentabilidad neta**: Resta impuestos, administración, seguros y mantenimiento de la rentabilidad bruta. Una propiedad con 8% bruto puede rendir 5% neto.

3. **Diversifica**: No concentres toda tu inversión en un solo tipo de propiedad o ciudad. La diversificación reduce el riesgo.

4. **Usa plataformas confiables**: Herramientas como Leasefy te permiten evaluar propiedades, comparar rentabilidades y gestionar tus arriendos desde un solo lugar.

5. **Considera el financiamiento**: Las tasas de crédito hipotecario en Colombia están bajando. Un apalancamiento inteligente puede multiplicar tu rentabilidad sobre capital propio.

El mercado inmobiliario colombiano ofrece opciones para todos los perfiles de inversionista. La clave está en informarse, comparar y actuar con datos, no con emociones. En Leasefy te ayudamos a encontrar la propiedad y a administrarla sin que se te vaya el día en eso.`,
  },
  {
    title: "Guía completa: qué verificar antes de firmar un contrato de arriendo",
    slug: "verificar-contrato-arriendo",
    excerpt: "Los 8 puntos que todo inquilino debe revisar antes de firmar. Protege tu depósito y tus derechos.",
    category: "Contratos",
    date: "Dic 22, 2025",
    readTime: "8 min",
    image: "https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/verificar-contrato-arriendo",
    author: "Equipo Leasefy",
    tags: ["contrato de arriendo", "Ley 820 de 2003", "derechos del arrendatario", "depósito de arriendo", "inventario de entrada", "arrendamiento en Colombia"],
    content: `Firmar un arriendo en Colombia es más seguro de lo que parece, porque casi todo lo que importa ya está escrito en la Ley 820 de 2003. El problema es que muy poca gente la ha leído, y por eso siguen circulando contratos con cláusulas que no valen y cobros que no se pueden hacer.

Esta guía recorre los ocho puntos que conviene revisar antes de poner la firma. No necesitas un abogado para ninguno: necesitas media hora y el contrato en la mano.

## 1. Que el contrato diga lo que la ley exige

El contrato de vivienda urbana puede ser verbal o escrito, pero si es escrito —y siempre conviene que lo sea— la ley pide que queden claros siete puntos:

1. **Las partes**: nombre e identificación de quien arrienda y de quien toma en arriendo.

2. **El inmueble**: dirección exacta y, si aplica, número de matrícula inmobiliaria.

3. **Lo que se entrega**: los bienes y las partes del inmueble que recibes, uno por uno.

4. **El precio y la forma de pago**: cuánto, a quién, en qué fecha y por qué medio.

5. **Los servicios y cosas conexas**: parqueadero, depósito, cuarto útil, terraza.

6. **El término de duración**: cuánto dura el contrato.

7. **Quién paga los servicios públicos**: y quién queda a cargo de la administración.

Si falta alguno, no es que el contrato se caiga: es que el día que haya un desacuerdo, ese punto se va a discutir sin papel que lo respalde. Y quien pierde esa discusión casi siempre es quien no tiene el inmueble.

## 2. Que quien firma pueda arrendar

Pídele al arrendador el certificado de tradición y libertad del inmueble, con fecha reciente. Cuesta poco, se saca en línea, y ahí ves quién es el propietario y si el inmueble tiene embargos o hipotecas.

Si quien firma es una inmobiliaria, tiene que estar matriculada: la ley obliga a matricularse a toda persona o empresa cuya actividad sea arrendar vivienda urbana o hacer intermediación entre arrendadores y arrendatarios. Preguntar por la matrícula no es desconfiar, es lo mismo que pedir la cámara de comercio.

Y si quien firma no es el propietario ni una inmobiliaria, pide el poder o el contrato de administración que lo autoriza.

## 3. El canon, y cuánto puede subir

Dos reglas que casi nadie conoce, y que son las que más plata mueven.

**El precio tiene un techo.** El canon mensual no puede exceder el 1% del valor comercial del inmueble o de la parte que se arrienda. Y ese valor comercial, para este efecto, no puede pasar de dos veces el avalúo catastral vigente.

**El aumento también tiene techo.** Cada doce meses de contrato bajo el mismo precio, el arrendador puede subir el canon hasta el 100% del IPC del año calendario anterior. Ni un peso más. Y tiene que avisarte el monto y la fecha por servicio postal autorizado, o por el mecanismo de notificación que hayan pactado expresamente en el contrato.

Un contrato que diga que el canon se incrementará anualmente en el IPC más tres puntos está pactando algo que la ley no permite en vivienda urbana. Vale la pena decirlo antes de firmar, no después.

## 4. El depósito que te piden casi nunca es legal

Este es el punto donde más plata se pierde, y el menos conocido.

**En arrendamiento de vivienda urbana no se pueden exigir depósitos en dinero para garantizar el cumplimiento del contrato.** No es una zona gris: la ley lo prohíbe expresamente, y además prohíbe disfrazarlo, sea pactándolo por interpuesta persona, en un documento distinto al contrato, o llamándolo de otra manera.

Lo que sí es legal para respaldar el contrato:

1. **Un codeudor**: alguien que responde solidariamente si tú no pagas.

2. **Una póliza o seguro de arrendamiento**: la aseguradora le paga al propietario y después te cobra a ti.

3. **Una afianzadora**: la misma lógica, con una compañía de fianzas.

Y el canon por anticipado —pagar el mes al comenzarlo— no es un depósito: es la forma de pago normal.

Si te piden un mes de depósito reembolsable al final, estás frente a un cobro que la ley no permite. Y como no está permitido, tampoco hay un procedimiento claro para que te lo devuelvan: por eso tantos depósitos terminan en discusiones que nadie gana.

## 5. El inventario de entrada es tu seguro

La ley pide que el contrato identifique los bienes y las partes del inmueble que se entregan. En la práctica eso es un inventario, y es lo único que te va a proteger el día de la salida.

Hazlo bien: recorre el inmueble con quien haga la entrega, anota el estado de pisos, paredes, ventanas, grifería, electrodomésticos y llaves, y toma fotos con fecha de todo lo que ya venga dañado o marcado. Firmen los dos. Guarda tu copia.

Sin inventario, la discusión de la salida es tu palabra contra la del propietario sobre un apartamento que ya no puedes ver.

## 6. Servicios públicos y administración: quién paga qué

Que el contrato diga explícitamente quién asume cada servicio, la administración y el internet. Que se entienda que van por cuenta del arrendatario no basta: escríbanlo.

Pide también los recibos al día en el momento de la entrega. Si recibes el inmueble con deudas de servicios, esa deuda queda pegada al inmueble y te va a llegar a ti.

Y ojo con la administración: en propiedad horizontal, las cuotas atrasadas y las multas del inmueble no desaparecen porque cambie el inquilino. Pide el paz y salvo de la copropiedad antes de mudarte.

## 7. Cuánto dura, cómo se prorroga y cómo se sale

Si el contrato no dice cuánto dura, la ley entiende que son doce meses. Y si al vencimiento ninguna de las partes lo termina como corresponde, se prorroga por el mismo término, en las mismas condiciones y con el reajuste que aplique.

Para salir tienes dos caminos, y los dos exigen aviso escrito por servicio postal autorizado:

1. **Al vencimiento**: avisas con al menos tres meses de anticipación, no tienes que dar ninguna razón y no pagas indemnización.

2. **Antes del vencimiento**: avisas con al menos tres meses de anticipación y pagas una indemnización equivalente a tres meses de canon.

Los tres meses no son un capricho del contrato: están en la ley. Anótalos en el calendario el día que firmes, porque un aviso tardío convierte una salida gratis en una salida de tres cánones.

Y un detalle que cuesta caro: un mensaje de WhatsApp no es un aviso por servicio postal autorizado. Manda la carta y guarda la guía.

## 8. Pide el comprobante de cada pago

Quien recibe el pago está obligado a expedirte un comprobante escrito con la fecha, el monto y el período al que corresponde. No es un favor: es una obligación legal.

Si un día el arrendador se niega a recibirte el pago, no te quedes con la plata. La ley te permite consignarla en una entidad autorizada dentro de los cinco días siguientes al vencimiento del plazo pactado, y avisarle. Esa consignación vale como pago.

## Antes de firmar, en una línea

Lee el contrato completo, revisa el certificado de tradición, no pagues depósitos, haz el inventario con fotos y guarda cada comprobante. Con eso cubres la enorme mayoría de los problemas que después terminan en un juzgado.

Esto es información general sobre la Ley 820 de 2003, no asesoría legal para tu caso. Si algo en tu contrato no te cuadra, consúltalo antes de firmar: después de la firma las opciones son menos.`,
  },
  {
    title: "Por qué Colombia sigue siendo la mejor opción para nuevos residentes",
    slug: "colombia-mejor-opcion",
    excerpt: "Calidad de vida, costos accesibles y un mercado inmobiliario en crecimiento constante.",
    category: "Lifestyle",
    date: "Nov 8, 2025",
    readTime: "5 min",
    image: "https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/colombia-mejor-opcion",
    author: "Equipo Leasefy",
    tags: ["vivir en Colombia", "nómadas digitales", "expatriados", "arrendar sin historial", "Medellín", "Bogotá", "costo de vida"],
    content: `Colombia lleva años apareciendo en las listas de destinos para trabajar en remoto, jubilarse o empezar de nuevo. Detrás del titular hay razones concretas, y también un par de fricciones que casi nadie menciona hasta que ya estás acá buscando dónde vivir.

Esto es lo que conviene saber antes de mudarte, contado desde el lado práctico: dónde, cuánto, y qué te van a pedir para arrendar.

## Tres ciudades, tres formas de vivir

**Medellín** tiene clima estable todo el año —lo de la ciudad de la eterna primavera es literal, no un eslogan— y la mejor infraestructura de transporte público del país. El Poblado y Laureles concentran la vida internacional; Envigado y Sabaneta ofrecen algo parecido, más tranquilo y bastante más barato. Es la ciudad donde más fácil se hace comunidad si llegas sin conocer a nadie.

**Bogotá** es la ciudad de trabajo. Están la mayor oferta laboral, las empresas, las universidades y la escena cultural más densa. A cambio pide paciencia con el tráfico y con un clima frío y variable. Chapinero, Usaquén y Cedritos son las zonas donde la mayoría de los recién llegados termina.

**La costa y el Eje Cafetero** son otra decisión: menos oferta de trabajo local, más calidad de vida diaria y una vivienda que rinde más por metro cuadrado. Funcionan bien si tu ingreso viene de afuera.

No hay una respuesta correcta. Hay una pregunta previa: tu ingreso depende de la ciudad donde vives, o no. Todo lo demás sale de ahí.

## Lo que cuesta vivir aquí

El costo de vida varía muchísimo entre ciudades, y entre barrios de la misma ciudad. En lugar de darte un número que envejece mal, acá está la forma de armarlo tú:

1. **El canon**: mira avisos reales del barrio que te interesa, no promedios de ciudad. La diferencia entre dos barrios vecinos puede ser del doble.

2. **La administración**: en propiedad horizontal es un gasto mensual aparte, y en edificios con piscina, gimnasio y portería 24 horas no es menor. Pregúntalo siempre antes de decidir.

3. **Los servicios**: agua, luz, gas e internet. En Colombia la tarifa depende del estrato del inmueble, así que el mismo consumo cuesta distinto en dos barrios.

4. **El transporte**: si el trabajo te ata a una zona, vivir lejos y barato puede salir más caro en tiempo y en pasajes.

Una regla práctica: al canon que veas en el aviso súmale la administración, y calcula los servicios aparte. Ese es el número real.

## La parte que nadie te cuenta: arrendar sin historial en Colombia

Acá está la fricción de verdad, y conviene saberla antes de aterrizar.

Para arrendar vivienda en Colombia casi siempre te van a pedir una garantía. Las tres formas habituales son un codeudor con finca raíz en la ciudad, una póliza de arrendamiento con una aseguradora, o una afianzadora. Y las tres se apoyan en algo que un recién llegado no tiene: historial crediticio en el país, contrato laboral colombiano o un familiar con propiedad acá.

Es el motivo por el que muchos extranjeros terminan pagando alojamiento temporal a precio de turista durante meses. No porque no puedan pagar un arriendo, sino porque no pueden demostrarlo del modo en que el mercado local espera.

Qué ayuda de verdad:

1. **Llegar con los papeles armados**: pasaporte, visa o cédula de extranjería, extractos bancarios de los últimos meses y una carta laboral o contrato de tu empleador, aunque sea del exterior.

2. **Buscar quien acepte estudio con ingresos del exterior**: no todas las inmobiliarias lo hacen, pero cada vez son más.

3. **Preguntar por afianzadora antes que por codeudor**: una afianzadora evalúa tu capacidad de pago; un codeudor te obliga a conocer, el primer mes, a alguien con propiedad en Colombia.

4. **Pedir el estudio antes de enamorarte de un inmueble**: saber hasta cuánto te aprueban cambia por completo qué avisos vale la pena mirar.

## Papeles: la visa no suele ser el obstáculo

Colombia tiene varias categorías de visa, y desde 2022 existe una específica para nómadas digitales, pensada para quien trabaja en remoto para empresas de fuera del país. También están las visas de migrante por trabajo, por sociedad, por matrimonio o por pensión.

Los requisitos y los montos cambian con el tiempo, así que el único dato confiable es el oficial: consúltalos en el portal de la Cancillería antes de planear nada. Lo que sí se puede decir en general es que la visa rara vez es lo que frena a la gente. Lo que frena es el arriendo.

## Qué mirar antes de decidir el barrio

Camina la zona a dos horas distintas: un martes a las ocho de la mañana y un sábado en la noche. La misma cuadra puede ser dos lugares.

Revisa qué hay a diez minutos a pie —mercado, farmacia, salud— porque eso decide tu día a día mucho más que los metros cuadrados del apartamento. Y pregunta por el estrato del inmueble: define lo que vas a pagar de servicios todos los meses.

Colombia recompensa a quien llega informado. La calidad de vida está; lo que hay que resolver bien, y temprano, es dónde vas a vivir y cómo lo vas a demostrar.`,
  },
  {
    title: "Cómo preparar tu apartamento para arrendar más rápido",
    slug: "preparar-apartamento-arriendo",
    excerpt: "Staging, fotografía profesional y pricing correcto: la fórmula para arrendar en menos de 2 semanas.",
    category: "Propietarios",
    date: "Oct 3, 2025",
    readTime: "6 min",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/preparar-apartamento-arriendo",
    author: "Equipo Leasefy",
    tags: ["arrendar más rápido", "propietarios", "fotografía inmobiliaria", "precio de arriendo", "vacancia", "staging"],
    content: `Un inmueble vacío no es un inmueble en pausa: es un inmueble que cuesta plata todos los días. Cada mes de vacancia se lleva un canon completo, y esa cuenta casi nunca aparece en la conversación cuando se decide el precio de publicación.

Esta guía es lo que hacemos, en orden, para que un inmueble se arriende rápido y bien. No hay trucos: hay una secuencia.

## El precio: la cuenta que casi nadie hace

Publicar por encima del mercado no es sacarle un poco más. Es apostar meses de vacancia contra un porcentaje de canon. Haz la cuenta antes de decidir.

Supón un canon de mercado de 2.000.000 al mes y publicas a 2.200.000, un 10% más.

**Si funciona**: ganas 200.000 al mes, 2.400.000 en un año.
**Si te cuesta dos meses extra de vacancia**: pierdes 4.000.000 de una, y además empiezas a cobrar tarde.

Es decir: un sobreprecio del 10% necesita arrendarse casi igual de rápido para empatar. Con un mes extra de vacancia ya vas perdiendo, y la vacancia no se recupera nunca: un mes vacío es un mes que no vuelve.

Cómo fijarlo bien:

1. **Mira avisos activos, no cerrados**: lo que se publicó hace seis meses y sigue publicado te dice cuál es el precio que NO funciona.

2. **Compara el mismo producto**: mismo barrio, mismo número de habitaciones, mismo estrato, con y sin parqueadero. Un apartamento sin parqueadero en un barrio donde todos lo tienen no compite igual.

3. **Suma la administración a la comparación**: dos inmuebles con el mismo canon y administraciones distintas no cuestan lo mismo para el inquilino, y él sí lo va a notar.

4. **Define desde el principio hasta dónde bajas**: un precio con margen decidido de antemano se negocia mejor que uno defendido por orgullo.

## Las fotos deciden si tu aviso se abre

En un portal, la foto de portada es prácticamente lo único que compite. Todo lo demás —descripción, características, precio— sólo se lee si la foto ganó el clic.

Lo que más cambia el resultado, en orden:

1. **Luz natural**: fotografía entre las 9 y las 11 de la mañana, o entre las 3 y las 5 de la tarde, con las cortinas abiertas y las luces encendidas. Nunca de noche.

2. **Horizontal y a la altura del pecho**: el celular en horizontal, sostenido más abajo de lo que resulta natural. Es lo que hace que los espacios se vean como son.

3. **Desde la esquina**: párate en una esquina de cada ambiente y dispara hacia la esquina opuesta. Así un cuarto se ve completo.

4. **Sin gran angular exagerado**: una foto que hace ver el apartamento al doble de su tamaño genera visitas que se van decepcionadas. Eso no es marketing, es perder el tiempo de todos.

5. **Doce fotos, no cuarenta**: sala, comedor, cocina, cada habitación, cada baño, zona de ropas, balcón o vista, y la fachada. En ese orden.

Si el inmueble está en obra, con humedad o sin pintar, arréglalo antes de fotografiarlo. Una foto honesta de algo feo no arrienda; una foto de algo arreglado, sí.

## Staging: qué mover y qué no

No hace falta amoblar. Hace falta despejar.

**Saca todo lo personal**: fotos familiares, imanes de la nevera, productos de aseo a la vista, ropa colgada. Quien mira tiene que poder imaginarse ahí, y eso no pasa mientras vea la vida de otro.

**Vacía un tercio de los clósets y las repisas**: un clóset lleno se lee como un clóset pequeño.

**Arregla lo barato que se nota**: una chapa floja, un enchufe roto, la silicona negra de la ducha, una llave que gotea, una bombilla fundida. Cuestan poco y son exactamente lo que un visitante usa para calcular en qué estado está todo lo que no puede ver.

**Pinta si la pintura tiene más de tres años**: es la inversión con mejor retorno de esta lista, y por bastante.

**Limpieza profunda antes de fotografiar y antes de cada visita**: vidrios, juntas del baño, campana de la cocina, olor. El olor es lo primero que se percibe y lo único que no se puede fotografiar.

## El aviso: escribe lo que la gente busca

Un título que dice hermoso apartamento no dice nada. Uno que dice apartamento de 2 habitaciones en Laureles, con parqueadero y balcón responde tres preguntas antes del clic.

En el cuerpo, contesta lo que siempre preguntan por WhatsApp: cuánto es la administración, si acepta mascotas, si está amoblado, en qué piso está, si tiene ascensor, cuántos parqueaderos y desde cuándo está disponible. Cada una de esas respuestas que no escribes se convierte en un mensaje que alguien de tu equipo va a contestar veinte veces.

Y sé específico con la ubicación: zona norte no le sirve a nadie; el barrio y una referencia conocida a diez minutos, sí.

## Ten los papeles listos antes de publicar

Nada mata un cierre como un inquilino aprobado esperando documentos.

Ten a la mano el certificado de tradición y libertad reciente, el paz y salvo de administración, los recibos de servicios al día y, si aplica, el reglamento de propiedad horizontal con las reglas de mascotas y mudanzas. Si el inmueble tiene varios propietarios, resuelve antes quién firma y con qué poder.

## Estudia al inquilino, no lo adivines

El inquilino más rápido no es el mejor inquilino. Un mal contrato cuesta mucho más que dos semanas de vacancia.

Pide el estudio completo: identidad, ingresos verificables, historial de pago y referencias del arriendo anterior. Y define desde el principio con qué garantía vas a trabajar —codeudor, póliza o afianzadora— porque eso cambia a quién puedes aprobar y en cuánto tiempo.

Recuerda que en vivienda urbana no puedes exigir depósitos en dinero como garantía: la Ley 820 de 2003 lo prohíbe. La protección real viene de la garantía y del estudio, no de retener plata.

## Los primeros siete días dicen todo

Publica y mide. Si en la primera semana el aviso tiene visitas pero nadie pide cita, el problema es el precio. Si no tiene ni visitas, el problema es la foto de portada o el título. Si hay citas pero nadie vuelve, el problema está en el inmueble o en lo que prometía el aviso.

Es un diagnóstico de tres preguntas y sirve siempre. Lo que no sirve es esperar un mes a ver qué pasa: para cuando lo sepas, ya pagaste el diagnóstico con un canon completo.`,
  },
];

export const blogCategories = ["Todos", "Inversiones", "Contratos", "Lifestyle", "Propietarios"];
