/* ════════════════════════════════════════════════════════════════════
   El SEO de la landing estática, dirección por dirección y en los dos idiomas
   (Nico 24-10-2026: «optimiza toda la landing para SEO, para que podamos aparecer
   en todo lado»; reglas en la skill seo-experto).

   Lo usa scripts/landing/armar-paginas.mjs para escribir public/paginas/<idioma>/…:
   título (30–60), descripción (70–160), migas y los datos estructurados de cada
   página. Los textos dicen lo que la página ya dice (nada inventado) con la palabra
   que la gente busca al principio: «software inmobiliario», «CRM inmobiliario»,
   «cobranza de arriendos», «avalúo de arriendo», «conciliación bancaria»…
   ════════════════════════════════════════════════════════════════════ */
export const SITIO = 'https://leasefy.co';
export const IDIOMAS = ['es', 'en'];
export const HREFLANG = { es: 'es-CO', en: 'en' };
export const LOCALE_OG = { es: 'es_CO', en: 'en_US' };
export const IMAGEN_OG = `${SITIO}/opengraph-image`;
export const LOGO = `${SITIO}/icons/icon-512x512.png`;
export const CORREO = 'hola@leasefy.co';

export const PRODUCTOS = ['crm', 'erp', 'cobranza', 'inquilino', 'avaluos', 'conciliacion', 'matching', 'asegurabilidad'];
export const PUBLICOS = ['inmobiliarias', 'propietarios', 'inquilinos', 'agentes'];

const HOME = 'public/landing/index.html';
const PROD = 'public/internas/productos/index.html';
const PARA = 'public/internas/para/index.html';

/** Las 28 direcciones (14 × 2 idiomas): ruta sin prefijo, fuente y archivo de salida bajo public/paginas/<idioma>/. */
export const PAGINAS = [
  { ruta: '/', fuente: HOME, salida: 'index.html', tipo: 'home' },
  { ruta: '/productos', fuente: PROD, salida: 'productos/index.html', tipo: 'productos', vista: 'productos' },
  ...PRODUCTOS.map((p) => ({ ruta: `/productos/${p}`, fuente: PROD, salida: `productos/${p}.html`, tipo: 'producto', vista: p })),
  ...PUBLICOS.map((p) => ({ ruta: `/para/${p}`, fuente: PARA, salida: `para/${p}.html`, tipo: 'para', vista: p })),
];

/** La dirección pública final (con prefijo de idioma), la que va en canonical, hreflang y sitemap. */
export function urlDe(idioma, ruta) {
  return `${SITIO}/${idioma}${ruta === '/' ? '' : ruta}`;
}

export const TEXTOS = {
  '/': {
    es: ['Leasefy: software inmobiliario con CRM, ERP y agentes AI', 'Software para inmobiliarias en Colombia: CRM, ERP y agentes AI que automatizan arriendos, cobranza, contratos, conciliación y pagos a propietarios.'],
    en: ['Leasefy: real estate software with CRM, ERP and AI agents', 'Software for real estate agencies in Colombia: CRM, ERP and AI agents that automate rentals, collections, leases, bank reconciliation and owner payouts.'],
  },
  '/productos': {
    es: ['CRM, ERP y agentes AI para inmobiliarias | Leasefy', 'El sistema de Leasefy: CRM inmobiliario, ERP de arriendos y agentes AI de cobranza, estudio del inquilino, avalúos, conciliación, matching y asegurabilidad.'],
    en: ['CRM, ERP and AI agents for real estate agencies | Leasefy', 'The Leasefy system: real estate CRM, rental ERP and AI agents for collections, tenant screening, appraisals, reconciliation, matching and insurability.'],
  },
  '/productos/crm': {
    es: ['CRM inmobiliario: tu comercial de punta a punta | Leasefy', 'CRM inmobiliario: cada interesado, cada inmueble y cada asesor en un solo embudo, sin planillas ni chats sueltos. Para inmobiliarias en Colombia.'],
    en: ['Real estate CRM: your sales, end to end | Leasefy', 'Real estate CRM: every lead, every property and every agent in a single pipeline — no spreadsheets, no scattered chats. Built for agencies in Colombia.'],
  },
  '/productos/erp': {
    es: ['ERP de arriendos: recaudo y giros en orden | Leasefy', 'Software de administración de arriendos: la plata del arriendo en una operación trazable, con recaudo, giros a propietarios y cierre de mes sin sorpresas.'],
    en: ['Rental ERP: collections and owner payouts in order | Leasefy', 'Property management software: rental money in a traceable operation, with collections, owner payouts and a month-end close with no surprises.'],
  },
  '/productos/cobranza': {
    es: ['Cobranza de arriendos con agente de IA | Leasefy', 'Agente de cobranza para inmobiliarias: recordatorios, seguimiento y escalamiento de la mora con tono humano, sin que tu equipo levante el teléfono.'],
    en: ['Rent collections with an AI agent | Leasefy', 'Collections agent for real estate agencies: reminders, follow-up and escalation of late rent with a human tone, without your team picking up the phone.'],
  },
  '/productos/inquilino': {
    es: ['Estudio del inquilino en minutos con IA | Leasefy', 'Estudio de arrendamiento: identidad, capacidad de pago y comportamiento de cada candidato, verificados contra fuentes reales y sin papeleo.'],
    en: ['Tenant screening in minutes with AI | Leasefy', 'Tenant screening: identity, ability to pay and behavior of every candidate, verified against real sources — no paperwork.'],
  },
  '/productos/avaluos': {
    es: ['Avalúo de arriendo: el canon correcto | Leasefy', 'Cuánto cobrar de arriendo: cada inmueble con el canon del mercado real de tu ciudad, con comparables de la zona. Ni sobrevalorado ni regalado.'],
    en: ['Rental appraisal: the right rent price | Leasefy', "How much to charge for rent: every property priced at your city's real market rent, with comparables from the area. Neither overpriced nor given away."],
  },
  '/productos/conciliacion': {
    es: ['Conciliación bancaria para inmobiliarias | Leasefy', 'Conciliación del extracto contra los contratos: cada pago encuentra su contrato solo y el cruce deja de ser un Excel de viernes.'],
    en: ['Bank reconciliation for real estate agencies | Leasefy', 'Statement-to-lease reconciliation: every payment finds its lease on its own, and matching stops being a Friday Excel.'],
  },
  '/productos/matching': {
    es: ['Matching de inmuebles e interesados con IA | Leasefy', 'El agente cruza necesidad, presupuesto e inventario al instante: cada interesado recibe el mismo día opciones de arriendo que sí le sirven.'],
    en: ['AI matching of properties and leads | Leasefy', 'The agent matches needs, budget and inventory instantly: every lead gets rental options that actually fit, the same day.'],
  },
  '/productos/asegurabilidad': {
    es: ['Asegurabilidad de contratos de arriendo con IA | Leasefy', 'El agente evalúa y gestiona la asegurabilidad de cada contrato de arriendo: cotiza con varias aseguradoras y deja a los propietarios tranquilos.'],
    en: ['Lease insurability with an AI agent | Leasefy', "The agent assesses and manages each lease's insurability: it quotes several insurers and keeps owners at ease from day one."],
  },
  '/para/inmobiliarias': {
    es: ['Software para inmobiliarias: escala con tecnología | Leasefy', 'CRM de candidatos, scoring con IA, contratos digitales y API completa: la plataforma para que tu inmobiliaria automatice evaluaciones y crezca.'],
    en: ['Software for real estate agencies: scale with tech | Leasefy', 'Candidate CRM, AI scoring, digital leases and a full API: the platform for your agency to automate tenant screening and grow.'],
  },
  '/para/propietarios': {
    es: ['Arrienda tu propiedad sin comisiones | Leasefy', 'Para propietarios: evaluación de inquilinos gratis, publicación en portales gratis y cobro del arriendo automatizado. Arrienda sin comisiones.'],
    en: ['Rent out your property with no commission | Leasefy', 'For owners: free tenant screening, free listing on portals and automated rent collection. Rent out your property with no commission.'],
  },
  '/para/inquilinos': {
    es: ['Encuentra tu hogar en arriendo sin estrés | Leasefy', 'Para inquilinos: inmuebles verificados, postulación simple y contratos claros. Encuentra tu próximo arriendo en Leasefy.'],
    en: ['Find your next rental home, stress-free | Leasefy', 'For tenants: verified properties, simple applications and clear leases. Find your next rental on Leasefy.'],
  },
  '/para/agentes': {
    es: ['Leasefy para agentes inmobiliarios: cierra más arriendos', 'Para agentes inmobiliarios: genera tu enlace, compártelo por WhatsApp y recibe evaluaciones profesionales de tus candidatos. Cierra más arriendos.'],
    en: ['Leasefy for real estate agents: close more rentals', 'For real estate agents: create your link, share it on WhatsApp and get professional screenings of your candidates. Close more rentals, faster.'],
  },
};

const MIGAS = {
  es: { inicio: 'Inicio', productos: 'Productos', para: 'Para quién' },
  en: { inicio: 'Home', productos: 'Products', para: "Who it's for" },
};
const AUDIENCIA = {
  es: { inmobiliarias: 'Inmobiliarias', propietarios: 'Propietarios', inquilinos: 'Inquilinos', agentes: 'Agentes inmobiliarios' },
  en: { inmobiliarias: 'Real estate agencies', propietarios: 'Property owners', inquilinos: 'Tenants', agentes: 'Real estate agents' },
};

/**
 * Los datos estructurados de una página (un solo @graph). `extra`: { nombreDelProducto, preguntas: [[p, r]] }
 * con lo que el generador lee de la página (el nombre del módulo en su idioma, las preguntas visibles).
 */
export function datosEstructurados(pagina, idioma, extra = {}) {
  const [titulo, descripcion] = TEXTOS[pagina.ruta][idioma];
  const url = urlDe(idioma, pagina.ruta);
  const lengua = HREFLANG[idioma];
  const org = {
    '@type': 'Organization',
    '@id': `${SITIO}/#organizacion`,
    name: 'Leasefy',
    url: SITIO,
    logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
    email: CORREO,
    address: { '@type': 'PostalAddress', addressLocality: 'Medellín', addressRegion: 'Antioquia', addressCountry: 'CO' },
    areaServed: { '@type': 'Country', name: 'Colombia' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: CORREO, availableLanguage: ['es', 'en'] },
  };
  const sitio = {
    '@type': 'WebSite',
    '@id': `${SITIO}/#sitio`,
    name: 'Leasefy',
    url: SITIO,
    inLanguage: ['es-CO', 'en'],
    publisher: { '@id': org['@id'] },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITIO}/${idioma}/propiedades?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
  const app = {
    '@type': 'SoftwareApplication',
    '@id': `${SITIO}/#software`,
    name: 'Leasefy',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: idioma === 'en' ? 'Real estate and property management software' : 'Software inmobiliario y de administración de arriendos',
    operatingSystem: 'Web',
    url: urlDe(idioma, '/'),
    description: TEXTOS['/'][idioma][1],
    inLanguage: lengua,
    publisher: { '@id': org['@id'] },
  };
  const migas = [{ nombre: MIGAS[idioma].inicio, url: urlDe(idioma, '/') }];
  if (pagina.tipo === 'productos' || pagina.tipo === 'producto') migas.push({ nombre: MIGAS[idioma].productos, url: urlDe(idioma, '/productos') });
  if (pagina.tipo === 'producto') migas.push({ nombre: extra.nombreDelProducto || titulo, url });
  if (pagina.tipo === 'para') migas.push({ nombre: AUDIENCIA[idioma][pagina.vista], url });
  const pagWeb = {
    '@type': 'WebPage',
    '@id': `${url}#pagina`,
    url,
    name: titulo,
    description: descripcion,
    inLanguage: lengua,
    isPartOf: { '@id': sitio['@id'] },
    about: { '@id': pagina.tipo === 'home' || pagina.tipo === 'productos' ? app['@id'] : org['@id'] },
    primaryImageOfPage: IMAGEN_OG,
  };
  const grafo = [org, sitio];
  if (migas.length > 1) {
    const lista = {
      '@type': 'BreadcrumbList',
      '@id': `${url}#migas`,
      itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: m.url })),
    };
    pagWeb.breadcrumb = { '@id': lista['@id'] };
    grafo.push(lista);
  }
  if (pagina.tipo === 'home' || pagina.tipo === 'productos') grafo.push(app);
  if (pagina.tipo === 'producto') {
    grafo.push({
      '@type': 'SoftwareApplication',
      '@id': `${url}#modulo`,
      name: `Leasefy · ${extra.nombreDelProducto || titulo}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url,
      description: descripcion,
      inLanguage: lengua,
      isPartOf: { '@id': app['@id'] },
      publisher: { '@id': org['@id'] },
    });
    pagWeb.about = { '@id': `${url}#modulo` };
  }
  if (pagina.tipo === 'para') pagWeb.audience = { '@type': 'Audience', audienceType: AUDIENCIA[idioma][pagina.vista] };
  grafo.push(pagWeb);
  if (extra.preguntas && extra.preguntas.length) {
    grafo.push({
      '@type': 'FAQPage',
      '@id': `${url}#preguntas`,
      inLanguage: lengua,
      mainEntity: extra.preguntas.map(([p, r]) => ({ '@type': 'Question', name: p, acceptedAnswer: { '@type': 'Answer', text: r } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': grafo };
}
