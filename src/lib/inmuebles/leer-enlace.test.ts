import { describe, it, expect } from 'vitest';
import {
  leerInmuebleDeHtml,
  loQueFalta,
  dineroColombiano,
  medidaColombiana,
  tipoDeInmueble,
  etiquetasMeta,
  bloquesJsonLd,
} from './leer-enlace';

/** Una ficha con JSON-LD, como la publican los CRM que declaran sus datos. */
const CON_JSON_LD = `
<!doctype html><html><head>
  <title>Apartamento en arriendo — Chapinero</title>
  <meta property="og:title" content="Apartamento en Chapinero">
  <meta property="og:image" content="https://cdn.ejemplo.com/1.jpg">
  <meta property="og:image" content="/relativa/2.jpg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Apartment",
    "name": "Apartamento 302 en Chapinero",
    "description": "Apartamento remodelado con vista.",
    "numberOfBedrooms": 3,
    "numberOfBathroomsTotal": 2,
    "floorSize": { "@type": "QuantitativeValue", "value": 78, "unitCode": "MTK" },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Carrera 13 # 53-20",
      "addressLocality": "Bogotá"
    },
    "offers": { "@type": "Offer", "price": "2500000", "priceCurrency": "COP" }
  }
  </script>
</head><body><p>Canon de arrendamiento $2.500.000</p></body></html>`;

describe('leerInmuebleDeHtml', () => {
  it('lee la ficha completa cuando el sitio declara JSON-LD', () => {
    const r = leerInmuebleDeHtml(CON_JSON_LD, 'https://ejemplo.com/apto-302');

    expect(r.titulo?.valor).toBe('Apartamento 302 en Chapinero');
    expect(r.direccion?.valor).toBe('Carrera 13 # 53-20');
    expect(r.ciudad?.valor).toBe('Bogotá');
    expect(r.canon?.valor).toBe(2_500_000);
    expect(r.area?.valor).toBe(78);
    expect(r.habitaciones?.valor).toBe(3);
    expect(r.banos?.valor).toBe(2);
    expect(r.tipo?.valor).toBe('apartment');
    expect(loQueFalta(r)).toEqual([]);
  });

  it('marca la procedencia de cada dato, no sólo el valor', () => {
    const r = leerInmuebleDeHtml(CON_JSON_LD, 'https://ejemplo.com/x');
    // Un dato que el sitio declara no vale lo mismo que uno leído de una frase:
    // la pantalla necesita poder distinguirlos.
    expect(r.canon?.fuente).toBe('json-ld');
    expect(r.canon?.textoOriginal).toBe('price');
  });

  it('resuelve las imágenes relativas y no las repite', () => {
    const r = leerInmuebleDeHtml(CON_JSON_LD, 'https://ejemplo.com/apto-302');
    expect(r.imagenes).toEqual([
      'https://cdn.ejemplo.com/1.jpg',
      'https://ejemplo.com/relativa/2.jpg',
    ]);
  });

  it('cae a Open Graph cuando no hay JSON-LD', () => {
    const html = `<html><head>
      <meta property="og:title" content="Casa en Laureles">
      <meta property="og:description" content="Casa de 2 pisos, 120 m2, 4 alcobas, 3 baños. Arriendo $4.200.000 mensuales.">
    </head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/casa');

    expect(r.titulo?.fuente).toBe('open-graph');
    expect(r.tipo?.valor).toBe('house');
    // Estos salen del TEXTO de la descripción de Open Graph, no de un campo.
    expect(r.area?.valor).toBe(120);
    expect(r.habitaciones?.valor).toBe(4);
    expect(r.banos?.valor).toBe(3);
    expect(r.canon?.valor).toBe(4_200_000);
    expect(r.canon?.fuente).toBe('texto');
  });

  // ── Las trampas ────────────────────────────────────────────────────────

  it('NO toma un precio de venta como canon: lo lee como precio de venta', () => {
    // La ficha tiene un número grande con `$`, pero no dice arriendo por ningún
    // lado. Agarrar cualquier `$` es cómo se publica un arriendo de $450 millones.
    const html = `<html><head><meta property="og:title" content="Casa en venta">
      </head><body><p>Precio de venta: $450.000.000. Estrato 4.</p></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/venta');

    expect(r.canon).toBeUndefined();
    expect(r.negocio?.valor).toBe('venta');
    expect(r.precioVenta?.valor).toBe(450_000_000);
    expect(loQueFalta(r)).not.toContain('canon');
    expect(loQueFalta(r)).not.toContain('precio de venta');
  });

  it('lee «2.5 baños» como 2 y no como 5', () => {
    // Sin capturar el decimal, `\d+` engancha el «5» de «2.5» y devuelve cinco.
    const html = `<html><body><p>Apartamento con 3.5 alcobas y 2.5 baños</p></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/x');

    expect(r.banos?.valor).toBe(2);
    expect(r.habitaciones?.valor).toBe(3);
  });

  it('un apartaestudio no es un apartamento', () => {
    // «apartaestudio» contiene «estudio» y empieza como «aparta…»: si el orden
    // de los términos fuera otro, entraría tipificado mal.
    const html = `<html><head><meta property="og:title" content="Apartaestudio en Cedritos"></head><body></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').tipo?.valor).toBe('studio');
  });

  it('descarta un «arriendo 3» suelto: no llega al piso del back', () => {
    const html = `<html><body><p>Arriendo 3 meses de depósito</p></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').canon).toBeUndefined();
  });

  it('no inventa nada cuando la página no dice nada', () => {
    const r = leerInmuebleDeHtml('<html><body>Hola</body></html>', 'https://x.co/1');

    expect(r.area).toBeUndefined();
    expect(r.banos).toBeUndefined();
    expect(r.canon).toBeUndefined();
    expect(r.imagenes).toEqual([]);
    // Todos los obligatorios reportados, ninguno en cero.
    expect(loQueFalta(r)).toEqual(['dirección', 'ciudad', 'canon', 'área', 'baños']);
  });

  it('sigue leyendo aunque el JSON-LD esté roto', () => {
    const html = `<html><head>
      <meta property="og:title" content="Apartamento en Envigado">
      <script type="application/ld+json">{ esto no es json }</script>
    </head><body></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').titulo?.valor).toBe('Apartamento en Envigado');
  });

  it('encuentra los videos aunque el inmueble todavía no los guarde', () => {
    const html = `<html><head>
      <meta property="og:video" content="https://cdn.x.co/tour.mp4">
    </head><body></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').videos).toEqual(['https://cdn.x.co/tour.mp4']);
  });
});

/**
 * La estructura REAL de una ficha de Ciencuadras, medida el 2026-08-11 sobre
 * `/inmueble/apartamento-en-arriendo-en-la-soledad-bogota-3792653`. Los tres
 * casos de abajo son defectos que esta ficha destapó y que ninguna prueba
 * escrita a mano habría encontrado: los tres devolvían un valor plausible.
 */
const FICHA_COMO_LAS_DE_VERDAD = `
<html><head>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Organization","name":"Ciencuadras.com",
   "address":{"@type":"PostalAddress","streetAddress":"Avenida Calle 26 # 68b-31","addressLocality":"Bogotá"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebSite","name":"Ciencuadras.com"}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org/","@type":"Product",
   "name":"Apartamento en Arriendo en La Soledad, Teusaquillo, Bogotá",
   "description":"Apartamento en arrendamiento con una área de 38 m2, un baño, una alcoba.",
   "offers":{"@type":"Offer","price":"1900000","priceCurrency":"COP",
     "itemOffered":{"@type":"Apartment",
       "address":{"@type":"PostalAddress","addressLocality":"Teusaquillo","addressRegion":"Bogotá"},
       "floorSize":{"@type":"QuantitativeValue","value":"35.0","unitCode":"MTK"}}}}
  </script>
</head><body></body></html>`;

describe('defectos encontrados contra una ficha real', () => {
  it('NO usa el bloque de la empresa: ni su nombre ni la dirección de su oficina', () => {
    const r = leerInmuebleDeHtml(FICHA_COMO_LAS_DE_VERDAD, 'https://x.co/1');

    // Antes el inmueble se llamaba «Ciencuadras.com» y su dirección era la
    // oficina del portal. Los dos campos llenos, los dos de otra entidad.
    expect(r.titulo?.valor).toBe('Apartamento en Arriendo en La Soledad, Teusaquillo, Bogotá');
    expect(r.direccion?.valor).not.toBe('Avenida Calle 26 # 68b-31');
  });

  it('lee floorSize «35.0» como 35 y no como 350', () => {
    // El punto separa miles en dinero y es decimal en una medida. Pasar la
    // medida por el parser de dinero multiplicaba el área por diez.
    expect(leerInmuebleDeHtml(FICHA_COMO_LAS_DE_VERDAD, 'https://x.co/1').area?.valor).toBe(35);
  });

  it('sabe cuál de los dos campos es la ciudad y cuál el barrio', () => {
    // La ficha trae addressLocality=Teusaquillo (barrio) y addressRegion=Bogotá
    // (ciudad). Leer el esquema al pie de la letra deja Teusaquillo de ciudad.
    const r = leerInmuebleDeHtml(FICHA_COMO_LAS_DE_VERDAD, 'https://x.co/1');
    expect(r.ciudad?.valor).toBe('Bogotá');
    expect(r.barrio?.valor).toBe('Teusaquillo');
  });

  it('no deja que un departamento se cuele como barrio (T-0030 WU-3, defecto real: Itagüí/Antioquia)', () => {
    // Importación real: addressRegion="Antioquia" (departamento, NO ciudad),
    // addressLocality="Itagüí" (sí es ciudad — está en CIUDADES). esCiudad()
    // elige bien la ciudad, pero el sobrante ("Antioquia") se asignaba SIN
    // preguntar si era plausible que fuera un barrio. Un import real produjo
    // `neighborhood: "Antioquia"`.
    const html = `
<html><head>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Apartment",
   "name":"Apartamento en Itagüí",
   "address":{"@type":"PostalAddress","streetAddress":"Calle 52 Sur # 48-30",
     "addressLocality":"Itagüí","addressRegion":"Antioquia"},
   "offers":{"@type":"Offer","price":"1500000","priceCurrency":"COP"}}
  </script>
</head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/itagui-1');

    expect(r.ciudad?.valor).toBe('Itagüí');
    expect(r.barrio).toBeUndefined();
  });

  it('trae la galería del inmueble y NO las fotos de los similares', () => {
    // La ficha real traía 93 URLs de imágenes de 89 inmuebles distintos: el
    // carrusel de «similares» viaja embebido. Sólo 14 eran del apartamento
    // mirado. Barrer todas le colgaría a este inmueble la casa de otro.
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.co/inmuebles/images/3792653/portada.jpeg">
      </head><body>
      <img src="https://cdn.co/inmuebles/images/3792653/cocina.jpeg">
      <img src="https://cdn.co/inmuebles/images/3792653/bano.jpeg">
      <img src="https://cdn.co/inmuebles/images/1101110/otro-apartamento.jpeg">
      <img src="https://cdn.co/inmuebles/images/2006032/otro-mas.jpeg">
      </body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/apartamento-bogota-3792653');

    expect(r.imagenes).toHaveLength(3);
    expect(r.imagenes.every((u) => u.includes('/3792653/'))).toBe(true);
  });

  it('si no puede probar de quién es la carpeta, deja sólo la portada', () => {
    // Carpeta genérica `/fotos/`: podría tener las imágenes de todo el portal.
    // Ante la duda, una foto cierta antes que catorce probables.
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.co/fotos/portada.jpeg">
      </head><body><img src="https://cdn.co/fotos/de-cualquiera.jpeg"></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/ficha-123');

    expect(r.imagenes).toEqual(['https://cdn.co/fotos/portada.jpeg']);
  });

  it('saca la dirección de la descripción cuando el portal no la publica', () => {
    // Ciencuadras reserva la dirección: el JSON-LD sólo trae barrio y ciudad.
    // Pero el aviso la escribe en la descripción. Sin leerla, TODAS las fichas
    // del portal quedan marcadas «Dirección requerida» y no se puede importar
    // ninguna.
    const html = `<html><head><meta property="og:description"
      content="Apartamento ubicado en el barrio la soledad calle 39A # 25-14, 3 piso con área de 38 m2.">
      </head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/1');

    expect(r.direccion?.valor).toBe('calle 39A # 25-14');
    expect(r.direccion?.fuente).toBe('texto');
  });

  it.each([
    ['Cra. 13 No. 53-20', 'Cra. 13 No. 53-20'],
    ['Diagonal 40 # 20-15', 'Diagonal 40 # 20-15'],
    ['Kr 13 # 45 - 11', 'Kr 13 # 45 - 11'],
    ['Transversal 5 # 12-34', 'Transversal 5 # 12-34'],
  ])('reconoce la nomenclatura «%s»', (escrita, esperada) => {
    const html = `<html><head><meta property="og:description" content="Casa en ${escrita} con patio.">
      </head><body></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').direccion?.valor).toBe(esperada);
  });

  it('NO toma la dirección del pie de página de la inmobiliaria', () => {
    // El texto suelto de la página trae la sede de quien publica. Si entrara,
    // el inmueble quedaría en la oficina de la inmobiliaria.
    const html = `<html><head><meta property="og:description" content="Apartamento remodelado con vista.">
      </head><body><footer>Nuestra sede: Avenida Calle 26 # 68b-31, Bogotá</footer></body></html>`;
    expect(leerInmuebleDeHtml(html, 'https://x.co/1').direccion).toBeUndefined();
  });

  it('igual saca el canon del bloque correcto', () => {
    expect(leerInmuebleDeHtml(FICHA_COMO_LAS_DE_VERDAD, 'https://x.co/1').canon?.valor).toBe(
      1_900_000,
    );
  });
});

describe('números en formato colombiano', () => {
  it.each([
    ['$2.500.000', 2_500_000],
    ['2.500.000 COP', 2_500_000],
    ['$ 950.000', 950_000],
    ['1,250,000', 1_250_000],
  ])('dineroColombiano(%s) = %i', (texto, esperado) => {
    expect(dineroColombiano(texto)).toBe(esperado);
  });

  it('la coma es decimal en una medida, no separador de miles', () => {
    expect(medidaColombiana('75,5')).toBe(75.5);
    expect(medidaColombiana('120')).toBe(120);
  });
});

describe('tipoDeInmueble', () => {
  it.each([
    ['Apartamento con balcón', 'apartment'],
    ['Casa campestre', 'house'],
    ['Apartaestudio amoblado', 'studio'],
    ['Local comercial sobre la 80', 'commercial'],
    ['Oficina en Chicó', 'office'],
    ['Bodega industrial', 'warehouse'],
  ])('%s → %s', (texto, esperado) => {
    expect(tipoDeInmueble(texto)).toBe(esperado);
  });

  it('devuelve undefined cuando no reconoce el tipo', () => {
    expect(tipoDeInmueble('Lote en la vereda')).toBeUndefined();
  });
});

describe('lectura del HTML', () => {
  it('lee los meta sin importar el orden de los atributos', () => {
    const meta = etiquetasMeta(
      `<meta content="Hola" property="og:title"><meta name="description" content="Algo">`,
    );
    expect(meta.get('og:title')).toBe('Hola');
    expect(meta.get('description')).toBe('Algo');
  });

  it('aplana @graph y offers', () => {
    const bloques = bloquesJsonLd(`<script type="application/ld+json">
      {"@graph":[{"@type":"Apartment","offers":{"@type":"Offer","price":"1000000"}}]}
    </script>`);
    expect(bloques.some((b) => b.price === '1000000')).toBe(true);
  });
});

/**
 * Fichas reales de portofinopropiedadraiz.com (T-0034), medidas por el
 * Orquestador contra las páginas en vivo el 2026-08-26. Recortadas a lo que el
 * lector usa: el `srcSet` real trae 16 variantes de tamaño por foto; acá
 * quedan 2 — ya alcanzan para probar que `w=`/`q=` no duplican la foto.
 */
function proxyDeFoto(n: number, w: number): string {
  const real = `https%3A%2F%2Fportofinopr.arrendasoft.co%2Fimg%2Ffotos%2F1920x1080_foto_${n}.jpg`;
  return `/api/nuby/image-proxy?url=${real}&amp;w=${w}&amp;q=75`;
}

function imgDeFoto(n: number): string {
  return `<img alt="Fotografía ${n} - Apartamento Arriendo Itagüi" loading="lazy" sizes="96px" srcSet="${proxyDeFoto(n, 640)} 640w, ${proxyDeFoto(n, 1920)} 1920w" src="${proxyDeFoto(n, 3840)}"/>`;
}

const FICHA_2925_PORTOFINO = `<!doctype html><html><head>
<title>Apartamento Arriendo Itagüi | Portofino Propiedad Raíz</title>
<meta property="og:image" content="https://portofino-propiedad-raiz.web.app/api/nuby/image-proxy?url=https%3A%2F%2Fportofinopr.arrendasoft.co%2Fimg%2Ffotos%2F1920x1080_foto_1.jpg&amp;w=1600&amp;q=75"/>
<meta name="twitter:image" content="https://portofino-propiedad-raiz.web.app/api/nuby/image-proxy?url=https%3A%2F%2Fportofinopr.arrendasoft.co%2Fimg%2Ffotos%2F1920x1080_foto_1.jpg&amp;w=1600&amp;q=75"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"RealEstateListing","name":"Apartamento Arriendo Itagüi","description":"Apartamento duplex, cerca al tránsito de itagui, estación del metro, rutas integradas","address":{"@type":"PostalAddress","addressLocality":"Itagüí","addressRegion":"Antioquia","addressCountry":"CO"},"offers":{"@type":"Offer","price":1500000,"priceCurrency":"COP"},"numberOfRooms":2,"numberOfBathroomsTotal":1,"floorSize":{"@type":"QuantitativeValue","value":65,"unitCode":"MTK"}}</script>
</head><body>
${[1, 2, 3, 4, 5, 6, 7, 8].map(imgDeFoto).join('\n')}
</body></html>`;

const FICHA_2929_PORTOFINO_CASCARON = `<!doctype html><html><head>
<title>Ficha de Inmueble | Portofino Propiedad Raiz</title>
<meta property="og:image" content="https://portofinopropiedadraiz.com/og-image.png"/>
<meta name="twitter:image" content="https://portofinopropiedadraiz.com/og-image.png"/>
</head><body>
<img src="/logo-portofino.png" alt="Portofino Propiedad Raíz" width="41" height="68"/>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&amp;data=algo" alt="QR Code Inmueble"/>
<img alt="Cargando fotografía del inmueble" data-nimg="fill"/>
</body></html>`;

describe('galería ampliada — fotos que sólo están en el <img> (T-0034 WU-1, Slice A)', () => {
  it('trae las 8 fotos de la ficha real 2925, en orden, sin duplicar por w=/q=', () => {
    const r = leerInmuebleDeHtml(FICHA_2925_PORTOFINO, 'https://portofinopropiedadraiz.com/propiedades/2925');

    expect(r.imagenes).toHaveLength(8);
    expect(r.imagenes).toEqual([
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_1.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_2.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_3.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_4.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_5.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_6.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_7.jpg',
      'https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_8.jpg',
    ]);
  });

  it('la portada (declarada) queda primera: es la que se usa de miniatura', () => {
    const r = leerInmuebleDeHtml(FICHA_2925_PORTOFINO, 'https://portofinopropiedadraiz.com/propiedades/2925');
    expect(r.imagenes[0]).toBe('https://portofinopr.arrendasoft.co/img/fotos/1920x1080_foto_1.jpg');
  });

  it('la ficha 2929 es un cascarón sin fotos: NO importa el logo del sitio como si fuera una', () => {
    const r = leerInmuebleDeHtml(
      FICHA_2929_PORTOFINO_CASCARON,
      'https://portofinopropiedadraiz.com/propiedades/2929',
    );
    expect(r.imagenes).toEqual([]);
  });

  it('no bloquea la ficha sin fotos: el resto de los datos igual falta en la lista, no un error', () => {
    const r = leerInmuebleDeHtml(
      FICHA_2929_PORTOFINO_CASCARON,
      'https://portofinopropiedadraiz.com/propiedades/2929',
    );
    // Sin JSON-LD ni descripción esta ficha no trae nada más — el punto es que
    // leerInmuebleDeHtml() no explota ni rechaza, sólo devuelve lo que hay.
    expect(r.imagenes).toEqual([]);
    expect(loQueFalta(r).length).toBeGreaterThan(0);
  });

  it('no regresa el caso que la guarda de la línea 456 protege: carpeta sin id, sólo la portada', () => {
    // El mismo caso que ya cubre `galeriaDelMismoInmueble` (carpeta genérica
    // `/fotos/`), ahora también a través del camino nuevo del <img>: el
    // candidato NO comparte el patrón de nombre con el ancla (nombres
    // distintos, ninguno numerado), así que no se prueba y no entra.
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.co/fotos/portada.jpeg">
      </head><body><img src="https://cdn.co/fotos/de-cualquiera.jpeg"></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/ficha-123');

    expect(r.imagenes).toEqual(['https://cdn.co/fotos/portada.jpeg']);
  });
});

describe('dirección — no perder el primer carácter y caer a referencia o municipio (T-0034 WU-1, Slice B)', () => {
  it('no pierde la «c» de «cerca al tránsito de itagui» (defecto real, ficha 2925)', () => {
    const r = leerInmuebleDeHtml(FICHA_2925_PORTOFINO, 'https://portofinopropiedadraiz.com/propiedades/2925');

    expect(r.direccion?.valor).toBe('cerca al tránsito de itagui');
    expect(r.direccion?.valor.startsWith('c')).toBe(true);
    expect(r.direccion?.valor).not.toMatch(/^erca/);
  });

  it('esa dirección es una referencia, no la exacta: la fila queda marcada como aproximada', () => {
    const r = leerInmuebleDeHtml(FICHA_2925_PORTOFINO, 'https://portofinopropiedadraiz.com/propiedades/2925');
    expect(r.direccionAproximada).toBe(true);
    expect(r.ciudad?.valor).toBe('Itagüí');
  });

  it('sin dirección exacta ni referencia, cae al municipio — y sigue marcada aproximada', () => {
    const html = `<html><head>
      <script type="application/ld+json">
      {"@type":"Apartment","name":"Apartamento en Bello",
       "description":"Apartamento amplio con acabados de lujo y excelente iluminación natural.",
       "address":{"@type":"PostalAddress","addressLocality":"Bello","addressRegion":"Antioquia"},
       "offers":{"@type":"Offer","price":"1200000"}}
      </script>
    </head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://x.co/1');

    expect(r.direccion?.valor).toBe('Bello');
    expect(r.direccionAproximada).toBe(true);
    // No bloquear: con el municipio alcanza para no pedir «dirección» de nuevo.
    expect(loQueFalta(r)).not.toContain('dirección');
  });

  it('una dirección exacta (declarada o de la prosa) NO se marca como aproximada', () => {
    const exacta = leerInmuebleDeHtml(CON_JSON_LD, 'https://ejemplo.com/x');
    expect(exacta.direccion?.valor).toBe('Carrera 13 # 53-20');
    expect(exacta.direccionAproximada).toBeFalsy();
  });

  it('sin municipio ni referencia tampoco inventa nada: sigue sin dirección', () => {
    const r = leerInmuebleDeHtml('<html><body>Hola</body></html>', 'https://x.co/1');
    expect(r.direccion).toBeUndefined();
    expect(r.direccionAproximada).toBeFalsy();
    expect(loQueFalta(r)).toContain('dirección');
  });
});

// ── El negocio y el barrio, medidos contra Fincaraíz (2026-09-01) ──────────
//
// Tres enlaces reales pegados en la migración: dos «Apartamento en Venta»
// entraron con un canon mensual de $420.000.000 y $220.000.000, y el barrio
// —que Fincaraíz publica en las migas de pan y en el título, no en la
// dirección estructurada— quedó vacío en los tres. Las fichas de abajo tienen
// la MISMA forma que las reales (JSON-LD RealEstateListing + BreadcrumbList).

/** Una ficha de Fincaraíz, con la forma exacta de la real 193740609. */
function fichaFincaraiz(opciones: {
  negocio: 'Venta' | 'Arriendo';
  barrioEnMigas?: string;
  nombre?: string;
  precio?: number;
  descripcion?: string;
  addressRegion?: string;
  sinMigas?: boolean;
}): string {
  const {
    negocio,
    barrioEnMigas,
    nombre = `Apartamento en ${negocio} en Las villas, Zipaquirá`,
    precio = 320_000_000,
    descripcion = 'Hermoso apartamento con vista a las montañas.',
    addressRegion = 'Cundinamarca',
    sinMigas = false,
  } = opciones;
  const migas = [
    'Fincaraíz',
    negocio,
    'Apartamentos',
    'Zipaquirá',
    ...(barrioEnMigas ? [barrioEnMigas] : []),
    nombre,
  ];
  return `<!doctype html><html><head>
    <title>${nombre}</title>
    <meta property="og:title" content="${nombre}">
    <meta property="og:description" content="Apartamento ubicado en Zipaquirá, ${barrioEnMigas ?? 'Zipaquirá'}. Cuenta con 3 habitaciones, 2 baños.">
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['RealEstateListing', 'Product'],
      name: nombre,
      description: descripcion,
      offers: { '@type': 'Offer', price: precio, priceCurrency: 'COP' },
      mainEntity: {
        '@type': 'Apartment',
        numberOfBedrooms: 3,
        numberOfBathroomsTotal: 2,
        floorSize: { '@type': 'QuantitativeValue', value: 63, unitCode: 'MTK' },
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Verde Alto apartments, Carrera 27, Zipaquirá, Cundinamarca, Colombia',
          addressLocality: 'Zipaquirá',
          addressRegion,
          addressCountry: 'CO',
        },
      },
    })}</script>
    ${
      sinMigas
        ? ''
        : `<script type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: migas.map((name, i) => ({ '@type': 'ListItem', position: i + 1, name })),
          })}</script>`
    }
  </head><body><p>Administración $ 260.000</p></body></html>`;
}

describe('el negocio decide a qué campo va el precio declarado', () => {
  it('una venta de Fincaraíz entra como precio de venta, no como canon de $320.000.000', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', barrioEnMigas: 'Las villas' }),
      'https://www.fincaraiz.com.co/apartamento-en-venta-en-las-villas-zipaquira/193740609',
    );

    expect(r.negocio).toEqual({ valor: 'venta', fuente: 'json-ld', textoOriginal: 'BreadcrumbList: Venta' });
    expect(r.precioVenta?.valor).toBe(320_000_000);
    expect(r.precioVenta?.fuente).toBe('json-ld');
    expect(r.canon).toBeUndefined();
    expect(loQueFalta(r)).toEqual([]);
  });

  it('un arriendo de Fincaraíz sigue entrando como canon', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Arriendo', barrioEnMigas: 'Alfaguara', precio: 2_500_000 }),
      'https://www.fincaraiz.com.co/apartamento-en-arriendo-en-alfaguara-jamundi/194162926',
    );

    expect(r.negocio?.valor).toBe('arriendo');
    expect(r.canon?.valor).toBe(2_500_000);
    expect(r.precioVenta).toBeUndefined();
  });

  it('sin migas de pan, la URL dice el negocio (Metrocuadrado lo pone en la ruta)', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', sinMigas: true, nombre: 'Apartamento bonito' }),
      'https://www.metrocuadrado.com/inmueble/venta-apartamento-bogota-bella-suiza-2-habitaciones/2162-M6953741',
    );

    expect(r.negocio?.valor).toBe('venta');
    expect(r.negocio?.fuente).toBe('url');
    expect(r.precioVenta?.valor).toBe(320_000_000);
  });

  it('sin migas ni URL, el título dice el negocio', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', sinMigas: true }),
      'https://ejemplo.com/ficha/12345',
    );

    expect(r.negocio?.valor).toBe('venta');
    expect(r.precioVenta?.valor).toBe(320_000_000);
  });

  it('un título que dice venta Y arriendo no decide: el precio va al canon, como antes', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', sinMigas: true, nombre: 'Casa en venta y arriendo en Chía', precio: 3_000_000 }),
      'https://ejemplo.com/ficha/12345',
    );

    expect(r.negocio).toBeUndefined();
    expect(r.canon?.valor).toBe(3_000_000);
    expect(r.precioVenta).toBeUndefined();
  });

  it('en una venta, «arriendo $2.500.000» de la prosa NO se lee como canon', () => {
    // Un aviso de venta cuenta lo que paga el inquilino actual todo el tiempo.
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({
        negocio: 'Venta',
        descripcion: 'Actualmente en arriendo por $2.500.000 mensuales. Excelente inversión.',
      }),
      'https://ejemplo.com/ficha/12345',
    );

    expect(r.canon).toBeUndefined();
    expect(r.precioVenta?.valor).toBe(320_000_000);
  });

  it('una venta sin precio declarado lo busca en la prosa con su etiqueta, con el piso del back', () => {
    const html = `<html><head><title>Casa en Venta en Cajicá</title></head>
      <body><p>Precio de venta: $ 480.000.000. Venta 3 alcobas.</p></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/casa-en-venta-en-cajica/1');

    expect(r.precioVenta?.valor).toBe(480_000_000);
    expect(r.precioVenta?.fuente).toBe('texto');
    expect(loQueFalta(r)).not.toContain('precio de venta');
  });

  it('una venta que no consigue precio reclama «precio de venta», no «canon»', () => {
    const html = `<html><head><title>Casa en Venta en Cajicá</title></head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/x');

    expect(loQueFalta(r)).toContain('precio de venta');
    expect(loQueFalta(r)).not.toContain('canon');
  });
});

describe('el barrio sale de las migas de pan o del título, nunca de la nada', () => {
  it('de las migas de pan: lo que queda después de quitar negocio, tipo y ciudad', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', barrioEnMigas: 'Las villas' }),
      'https://ejemplo.com/x',
    );

    expect(r.barrio).toEqual({ valor: 'Las villas', fuente: 'json-ld', textoOriginal: 'BreadcrumbList: Las villas' });
    expect(r.ciudad?.valor).toBe('Zipaquirá');
  });

  it('del título, en el orden «Barrio, Ciudad» del `name`', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', sinMigas: true, nombre: 'Apartamento en Venta en San antonio, Zipaquirá' }),
      'https://ejemplo.com/x',
    );

    expect(r.barrio?.valor).toBe('San antonio');
    expect(r.barrio?.fuente).toBe('json-ld');
  });

  it('del título al revés, «Ciudad, Barrio», como lo arma el <title> de Fincaraíz', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Arriendo', sinMigas: true, nombre: 'Apartamento en Arriendo en Zipaquirá, Alfaguara' }),
      'https://ejemplo.com/x',
    );

    expect(r.barrio?.valor).toBe('Alfaguara');
  });

  it('un título sin barrio («Apartamento en Venta en Zipaquirá») no inventa uno', () => {
    // La fila real de la migración: el portal no publicaba barrio. Ninguna de
    // las fuentes lo trae, así que queda vacío y la revisión lo pide.
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Venta', sinMigas: true, nombre: 'Apartamento en Venta en Zipaquirá' }),
      'https://ejemplo.com/x',
    );

    expect(r.barrio).toBeUndefined();
  });

  it('«Bogotá, d.c.» en addressRegion es la ciudad, no un barrio', () => {
    // Defecto real: una ficha con addressLocality «Bogotá» y addressRegion
    // «Bogotá, d.c.» dejaba «Bogotá, d.c.» como barrio del inmueble.
    const html = `<html><head><title>Apartaestudio en Venta en Gran america, Bogotá</title>
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'Apartment',
        name: 'Apartaestudio en Venta en Gran america, Bogotá',
        address: { '@type': 'PostalAddress', streetAddress: 'Carrera 30a #25A-20', addressLocality: 'Bogotá', addressRegion: 'Bogotá, d.c.' },
      })}</script></head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/x');

    expect(r.ciudad?.valor).toBe('Bogotá');
    expect(r.barrio?.valor).toBe('Gran america');
  });

  it('con Metrocuadrado («Venta de Apartamento en Bella suiza - Bogotá D.C. - 2162-M6953741») saca barrio y ciudad del título', () => {
    const html = `<html><head>
      <meta property="og:title" content="Venta de Apartamento en Bella suiza - Bogotá D.C. - 2162-M6953741">
      </head><body></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://www.metrocuadrado.com/inmueble/venta-apartamento-bogota-bella-suiza/2162-M6953741');

    expect(r.barrio?.valor).toBe('Bella suiza');
    expect(r.ciudad?.valor).toBe('Bogotá');
    expect(r.negocio?.valor).toBe('venta');
  });

  it('el departamento sale de addressRegion con la grafía que el back acepta', () => {
    const r = leerInmuebleDeHtml(
      fichaFincaraiz({ negocio: 'Arriendo', addressRegion: 'Valle del cauca' }),
      'https://ejemplo.com/x',
    );

    expect(r.departamento?.valor).toBe('Valle del Cauca');
  });

  it('la dirección pierde la cola «, Zipaquirá, Cundinamarca, Colombia»: esos ya tienen campo', () => {
    const r = leerInmuebleDeHtml(fichaFincaraiz({ negocio: 'Venta' }), 'https://ejemplo.com/x');

    expect(r.direccion?.valor).toBe('Verde Alto apartments, Carrera 27');
    expect(r.ciudad?.valor).toBe('Zipaquirá');
    expect(r.departamento?.valor).toBe('Cundinamarca');
  });
});
