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
    readTime: "6 min",
    image: "https://images.pexels.com/photos/2119714/pexels-photo-2119714.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/invertir-propiedades-colombia",
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

4. **Usa plataformas confiables**: Herramientas como Luxterra te permiten evaluar propiedades, comparar rentabilidades y gestionar tus arriendos desde un solo lugar.

5. **Considera el financiamiento**: Las tasas de crédito hipotecario en Colombia están bajando. Un apalancamiento inteligente puede multiplicar tu rentabilidad sobre capital propio.

El mercado inmobiliario colombiano ofrece opciones para todos los perfiles de inversionista. La clave está en informarse, comparar y actuar con datos, no con emociones. En Luxterra, te ayudamos a encontrar la propiedad ideal y a maximizar tu retorno.`,
  },
  {
    title: "Guía completa: qué verificar antes de firmar un contrato de arriendo",
    slug: "verificar-contrato-arriendo",
    excerpt: "Los 8 puntos que todo inquilino debe revisar antes de firmar. Protege tu depósito y tus derechos.",
    category: "Contratos",
    date: "Dic 22, 2025",
    readTime: "5 min",
    image: "https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/verificar-contrato-arriendo",
  },
  {
    title: "Por qué Colombia sigue siendo la mejor opción para nuevos residentes",
    slug: "colombia-mejor-opcion",
    excerpt: "Calidad de vida, costos accesibles y un mercado inmobiliario en crecimiento constante.",
    category: "Lifestyle",
    date: "Nov 8, 2025",
    readTime: "4 min",
    image: "https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/colombia-mejor-opcion",
  },
  {
    title: "Cómo preparar tu apartamento para arrendar más rápido",
    slug: "preparar-apartamento-arriendo",
    excerpt: "Staging, fotografía profesional y pricing correcto: la fórmula para arrendar en menos de 2 semanas.",
    category: "Propietarios",
    date: "Oct 3, 2025",
    readTime: "7 min",
    image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600&q=80",
    href: "/blog/preparar-apartamento-arriendo",
  },
];

export const blogCategories = ["Todos", "Inversiones", "Contratos", "Lifestyle", "Propietarios"];
