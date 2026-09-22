/**
 * 🔴 UN `<Image>` DE `next/image` NO RECIBE UN `src` QUE PUEDE NO EXISTIR.
 *
 * QA 22-09: «Mi arriendo» del inquilino se caía ENTERA («Leasefy no pudo abrir»)
 * porque los inmuebles migrados llegan con `propertyThumbnail: null` y
 * `next/image` hace `typeof src === 'object'` → `null.default` → TypeError. Con
 * `src=""` no se cae, pero pinta el ícono de imagen rota con el título encima.
 *
 * El remedio canónico es `PortadaDelInmueble` (dice «Sin fotos»). Esta prueba
 * lee cada `<Image src={…}>` y exige que el `src` sea seguro:
 *  - un literal o una plantilla (`'/x.png'`, `` `https://…${id}` ``);
 *  - una variable que ya se comprobó en el mismo bloque (`foto ? (<Image src={foto}`
 *    o `foto && (<Image src={foto}`);
 *  - un `a || 'respaldo'` con respaldo NO vacío.
 * Lo que no calza con eso y ya estaba se DECLARA con su motivo. La lista no dice
 * «está bien»: dice «ya estaba, y se sabe por qué no se cae». Lo nuevo rompe.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function tsx(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) tsx(p, out);
    else if (/\.tsx$/.test(p) && !/\.test\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

interface Uso {
  archivo: string;
  src: string;
}

function usos(): { leidos: number; inseguros: Uso[] } {
  let leidos = 0;
  const inseguros: Uso[] = [];
  for (const archivo of tsx('src')) {
    const texto = readFileSync(archivo, 'utf8');
    if (!/from ['"]next\/image['"]/.test(texto)) continue;
    // Recorrer el TEXTO, no las líneas: `<Image` y `src=` casi nunca van juntos.
    const re = /<Image\b[^>]*?\ssrc=\{((?:[^}$]|\$(?!\{)|\$\{[^}]*\})*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) {
      leidos += 1;
      const src = m[1].trim();
      if (!esSeguro(src, texto.slice(Math.max(0, m.index - 600), m.index))) {
        inseguros.push({ archivo, src });
      }
    }
  }
  return { leidos, inseguros };
}

function esSeguro(src: string, antes: string): boolean {
  if (/^(['"`])[\s\S]*\1$/.test(src)) return true;
  // Respaldo no vacío al final: `x || '/placeholder.svg'`.
  if (/(\|\||\?\?)\s*(['"`])[^'"`]+\2$/.test(src)) return true;
  // Comprobado justo antes: `src ? (` / `src && (` / `!src ? … :` con el mismo texto.
  const sinBang = src.replace(/!$/, '').replace(/^\((.*)\)$/, '$1');
  const escapado = sinBang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`${escapado}\\)?\\s*(\\?|&&)`).test(antes)) return true;
  // Una constante de módulo en MAYÚSCULAS (imports estáticos, `POSTER`).
  if (/^[A-Z][A-Z0-9_]*$/.test(src)) return true;
  return false;
}

/**
 * Los que ya estaban el 22-09 y por qué no se caen. Si uno se arregla, sale de
 * acá (lo exige la segunda prueba).
 */
const DECLARADOS: ReadonlyArray<Uso & { motivo: string }> = [
  {
    archivo: 'src/app/inquilino/aplicaciones/[applicationId]/page.tsx',
    src: 'property.thumbnail',
    motivo: 'applications.service.ts siempre llena `thumbnail` (respaldo `/placeholder-property.svg`).',
  },
  {
    archivo: 'src/app/para/inmobiliarias/page.tsx',
    src: 'testimonial.image',
    motivo: 'Datos estáticos de la landing, escritos en el mismo archivo.',
  },
  {
    archivo: 'src/components/home/TestimonialCarousel.tsx',
    src: 'testimonial.image',
    motivo: 'Datos estáticos de la landing.',
  },
  { archivo: 'src/components/landing/blog/BlogArticle.tsx', src: 'post.image', motivo: 'Artículos del blog, estáticos.' },
  { archivo: 'src/components/landing/blog/BlogArticle.tsx', src: 'item.image', motivo: 'Artículos del blog, estáticos.' },
  { archivo: 'src/components/landing/blog/BlogListing.tsx', src: 'featured.image', motivo: 'Artículos del blog, estáticos.' },
  { archivo: 'src/components/landing/blog/BlogListing.tsx', src: 'post.image', motivo: 'Artículos del blog, estáticos.' },
  { archivo: 'src/components/landing/media/LandingImage.tsx', src: 'cierre.src', motivo: 'Import estático de la landing.' },
  {
    archivo: 'src/components/property/PhotoGalleryModal.tsx',
    src: 'images[activeIndex]',
    motivo: 'La galería sólo se abre desde una foto que existe; recorre la lista que la abrió.',
  },
  { archivo: 'src/components/property/PhotoGalleryModal.tsx', src: 'image', motivo: 'Elemento de la lista de fotos.' },
  { archivo: 'src/components/property/PortadaDelInmueble.tsx', src: 'src', motivo: 'Es el remedio: `primeraFoto` ya descartó lo vacío.' },
  { archivo: 'src/components/property/PropertyCard.tsx', src: 'src', motivo: 'Recorre `allImages`, ya filtradas con `trim()`.' },
  { archivo: 'src/components/property/PropertyDetailView.tsx', src: 'image', motivo: 'Elemento de la lista de fotos.' },
  {
    archivo: 'src/components/property/PropertyDetailView.tsx',
    src: 'property.images[0]',
    motivo: 'Dos usos, los dos dentro de `property.images.length === 0 ? «Sin fotos» : …`.',
  },
  { archivo: 'src/components/tenant/PropertyDetailSheet.tsx', src: 'image', motivo: 'Elemento de la lista de fotos.' },
];

const clave = (u: Uso) => `${u.archivo} :: ${u.src}`;

describe('guardián · <Image> con un src que puede faltar', () => {
  const { leidos, inseguros } = usos();

  it('lee los <Image> del producto (si lee pocos, la aguja se rompió)', () => {
    expect(leidos).toBeGreaterThan(30);
  });

  it('no aparece un <Image> nuevo con un src sin comprobar', () => {
    const declarados = new Set(DECLARADOS.map(clave));
    const nuevos = inseguros.map(clave).filter((k) => !declarados.has(k));
    expect(nuevos, 'Usa PortadaDelInmueble o comprueba el src antes de pintar <Image>').toEqual([]);
  });

  it('lo declarado sigue existiendo (si se arregló, sácalo de la lista)', () => {
    const vivos = new Set(inseguros.map(clave));
    const sobran = DECLARADOS.map(clave).filter((k) => !vivos.has(k));
    expect(sobran).toEqual([]);
  });
});
