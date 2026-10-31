/**
 * Los emojis que se le ofrecen a quien escribe la descripción de un inmueble (Nico 31-10-2026: «agregar emojis… para
 * que puedan agregar mejor sus descripciones»). Son CONTENIDO de la persona —lo que ya pegaban de WhatsApp: «🏡 Piso
 * 10 · 🛏️ 3 alcobas»—, no adorno de la interfaz; por eso viven aquí escritos por su código y no sueltos en una pantalla.
 * Agrupados por lo que se describe de un inmueble, con su nombre para leerlo en voz alta.
 */

export interface EmojiDeLaDescripcion {
  emoji: string;
  nombre: string;
}

export interface GrupoDeEmojis {
  titulo: string;
  emojis: readonly EmojiDeLaDescripcion[];
}

const e = (codigos: number[], nombre: string): EmojiDeLaDescripcion => ({ emoji: String.fromCodePoint(...codigos), nombre });
const VS = 0xfe0f;

export const GRUPOS_DE_EMOJIS: readonly GrupoDeEmojis[] = [
  {
    titulo: 'El inmueble',
    emojis: [
      e([0x1f3e1], 'Casa con jardín'),
      e([0x1f3e0], 'Casa'),
      e([0x1f3e2], 'Edificio'),
      e([0x1f3d8, VS], 'Casas'),
      e([0x1f3d9, VS], 'Ciudad'),
      e([0x1f307], 'Atardecer en la ciudad'),
      e([0x1f511], 'Llave'),
      e([0x1f6aa], 'Puerta'),
      e([0x1fa9f], 'Ventana'),
      e([0x1f6d7], 'Ascensor'),
    ],
  },
  {
    titulo: 'Los espacios',
    emojis: [
      e([0x1f6cf, VS], 'Cama'),
      e([0x1f6cb, VS], 'Sala'),
      e([0x1f6c1], 'Bañera'),
      e([0x1f6bf], 'Ducha'),
      e([0x1f6bd], 'Baño'),
      e([0x1f373], 'Cocina'),
      e([0x1f9fa], 'Zona de ropas'),
      e([0x1f9e5], 'Clóset'),
      e([0x1f33f], 'Balcón con plantas'),
      e([0x1f333], 'Árbol'),
      e([0x1f4d0], 'Área'),
      e([0x1f4cf], 'Medida'),
    ],
  },
  {
    titulo: 'Comodidades',
    emojis: [
      e([0x1f697], 'Carro'),
      e([0x1f17f, VS], 'Parqueadero'),
      e([0x1f4e6], 'Cuarto útil'),
      e([0x1f3ca], 'Piscina'),
      e([0x1f3cb, VS], 'Gimnasio'),
      e([0x1f436], 'Mascotas'),
      e([0x1f31e], 'Iluminado'),
      e([0x2744, VS], 'Aire acondicionado'),
      e([0x1f525], 'Gas'),
      e([0x1f4f6], 'Internet'),
      e([0x1f512], 'Seguridad'),
      e([0x1f9f9], 'Aseo'),
    ],
  },
  {
    titulo: 'La ubicación',
    emojis: [
      e([0x1f4cd], 'Ubicación'),
      e([0x1f5fa, VS], 'Mapa'),
      e([0x1f687], 'Metro'),
      e([0x1f68c], 'Bus'),
      e([0x1f3eb], 'Colegio'),
      e([0x1f3e5], 'Hospital'),
      e([0x1f6d2], 'Supermercado'),
      e([0x1f3ea], 'Tienda'),
      e([0x2615], 'Café'),
      e([0x1f304], 'Montañas'),
    ],
  },
  {
    titulo: 'Precio y contacto',
    emojis: [
      e([0x1f4b0], 'Bolsa de dinero'),
      e([0x1f4b5], 'Billete'),
      e([0x1f4c4], 'Documento'),
      e([0x1f4dd], 'Nota'),
      e([0x1f4c5], 'Calendario'),
      e([0x1f4de], 'Teléfono'),
      e([0x1f4f2], 'Celular'),
      e([0x2709, VS], 'Correo'),
      e([0x2705], 'Listo'),
      e([0x2b50], 'Estrella'),
      e([0x2728], 'Brillos'),
      e([0x1f449], 'Señalar'),
      e([0x2757], 'Importante'),
      e([0x1f389], 'Celebración'),
    ],
  },
];
