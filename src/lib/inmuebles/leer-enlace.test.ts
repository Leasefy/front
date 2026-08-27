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

  it('NO toma un precio de venta como canon', () => {
    // La ficha tiene un número grande con `$`, pero no dice arriendo por ningún
    // lado. Agarrar cualquier `$` es cómo se publica un arriendo de $450 millones.
    const html = `<html><head><meta property="og:title" content="Casa en venta">
      </head><body><p>Precio de venta: $450.000.000. Estrato 4.</p></body></html>`;
    const r = leerInmuebleDeHtml(html, 'https://ejemplo.com/venta');

    expect(r.canon).toBeUndefined();
    expect(loQueFalta(r)).toContain('canon');
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
