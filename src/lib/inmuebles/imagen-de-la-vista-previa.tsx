/**
 * La imagen de la vista previa del enlace de un inmueble (1200 × 630), la que
 * WhatsApp, iMessage, Facebook o LinkedIn muestran al pegar
 * `leasefy.co/propiedades/<id>`. La sirve `app/api/og/inmueble/[id]/route.tsx`.
 *
 * Diseño A de los tres que vio Nico el 21-10-2026 («este quiero que se vea
 * mejor» → eligió «A · Foto completa»): la foto entera de fondo; arriba a la
 * izquierda «EN ARRIENDO» y el tipo; arriba a la derecha la inmobiliaria con
 * su logo; abajo el lugar, el título, el precio con sus cifras y el logo de
 * Leasefy.
 *
 * 🔴 Sólo del servidor: lee las fuentes del disco y usa `sharp`.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

import { LEASEFY_LOCKUP_VIEWBOX, LEASEFY_SYMBOL_PATH, LEASEFY_WORDMARK_PATH } from '@/components/brand/leasefy-logo-paths';
import { formatCurrency } from '@/lib/format';
import {
  cifrasCortas,
  lugarDelInmueble,
  tituloParaCompartir,
  type InmuebleParaCompartir,
} from '@/lib/inmuebles/ficha-para-compartir';
import { nombreDelTipo } from '@/lib/marketplace/busqueda';
import { ALTO_DE_LA_IMAGEN, ANCHO_DE_LA_IMAGEN } from '@/lib/inmuebles/vista-previa-del-inmueble';


/** Lo que la tarjeta pinta, ya en palabras. */
export interface DatosDeLaTarjeta {
  /** «EN ARRIENDO» / «EN VENTA». */
  negocio: string;
  /** «APARTAMENTO»; `null` si el tipo no se conoce. */
  tipo: string | null;
  titulo: string;
  /** «Poblado, Medellín»; vacío si no hay. */
  lugar: string;
  /** «$ 1.200.000»; `null` sin precio. */
  precio: string | null;
  /** «/mes» en arriendo; `null` en venta. */
  periodo: string | null;
  /** «2 hab», «2 baños», «50 m²», «1 parq.» (o «Estrato 4»). */
  cifras: string[];
  /** El nombre entero de la inmobiliaria; `null` si no se sabe. */
  inmobiliaria: string | null;
}

/** De los datos del inmueble a lo que la tarjeta dice. Pura (se prueba sola). */
export function datosDeLaTarjeta(
  d: InmuebleParaCompartir & { tipo?: string | null },
  inmobiliaria: string | null,
): DatosDeLaTarjeta {
  const venta = d.tipoDeNegocio === 'sale';
  const monto = venta ? d.precioDeVenta : d.canon;
  const conPrecio = typeof monto === 'number' && Number.isFinite(monto) && monto > 0;
  const tipo = nombreDelTipo(d.tipo);
  return {
    negocio: venta ? 'EN VENTA' : 'EN ARRIENDO',
    tipo: tipo ? tipo.toLocaleUpperCase('es-CO') : null,
    titulo: tituloParaCompartir(d),
    lugar: lugarDelInmueble(d),
    precio: conPrecio ? formatCurrency(monto) : null,
    periodo: conPrecio && !venta ? '/mes' : null,
    cifras: cifrasCortas(d),
    inmobiliaria: inmobiliaria?.trim() || null,
  };
}

/**
 * El tamaño del título según su largo: entero siempre, nunca cortado con
 * «…» (Juan, 21-10-2026: «las palabras se nos quedan» cortadas). Con 46
 * letras o menos cabe en una línea de 54 px; más largo baja la letra y usa
 * dos líneas.
 */
export function tamanoDelTitulo(titulo: string): number {
  const n = titulo.length;
  if (n <= 34) return 56;
  if (n <= 46) return 50;
  if (n <= 70) return 44;
  return 38;
}

// ── Lo que viene de afuera: fotos, logo y fuentes ───────────────────────────

/** Una foto de celular puede pesar varios MB; más de esto no se baja. */
const PESO_MAXIMO_DE_LA_FOTO = 20 * 1024 * 1024;
const ESPERA_DE_LA_FOTO_MS = 3000;

/**
 * Sólo se bajan fotos del almacén de Leasefy (Supabase) y de UploadThing, los
 * mismos orígenes que `next.config.mjs` deja optimizar. Los datos vienen del
 * back, pero una ruta pública que baja cualquier URL sería una puerta.
 */
export function fotoPermitida(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname;
  return host.endsWith('.supabase.co') || host === 'utfs.io' || host === 'uploadthing.com';
}

async function bajar(url: string): Promise<Buffer | null> {
  if (!fotoPermitida(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ESPERA_DE_LA_FOTO_MS) });
    if (!res.ok) return null;
    if (Number(res.headers.get('content-length') ?? 0) > PESO_MAXIMO_DE_LA_FOTO) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > PESO_MAXIMO_DE_LA_FOTO ? null : buf;
  } catch {
    return null;
  }
}

/**
 * La foto ya recortada a 1200 × 630 y en JPEG. Satori no lee WebP ni AVIF y
 * una foto de 4000 px la haría lenta; `rotate()` respeta la orientación del
 * celular.
 */
export async function fotoDeFondo(url: string | null | undefined): Promise<string | null> {
  const buf = url ? await bajar(url) : null;
  if (!buf) return null;
  try {
    const jpg = await sharp(buf)
      .rotate()
      .resize(ANCHO_DE_LA_IMAGEN, ALTO_DE_LA_IMAGEN, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString('base64')}`;
  } catch {
    return null;
  }
}

/** El logo de la inmobiliaria en un cuadrado blanco de 88 px (su WebP pasa a PNG). */
export async function logoDeLaInmobiliaria(url: string | null | undefined): Promise<string | null> {
  const buf = url ? await bajar(url) : null;
  if (!buf) return null;
  try {
    const png = await sharp(buf)
      .resize(88, 88, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * La tarjeta ya dibujada (PNG de `next/og`) a JPEG: ~900 KB → ~120 KB. WhatsApp
 * no muestra la imagen de una vista previa pesada.
 */
export async function enJpeg(png: Buffer): Promise<Buffer> {
  return sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

type Fuente = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: 'normal' };
let fuentes: Promise<Fuente[]> | null = null;

/** Las fuentes de la marca (`assets/og/fuentes`, ver su LEEME). Se leen una vez. */
export function fuentesDeLaMarca(): Promise<Fuente[]> {
  if (!fuentes) {
    const leer = (archivo: string) => readFile(join(process.cwd(), 'assets/og/fuentes', archivo));
    fuentes = Promise.all([
      leer('SchibstedGrotesk-Regular.ttf'),
      leer('SchibstedGrotesk-SemiBold.ttf'),
      leer('SchibstedGrotesk-Bold.ttf'),
      leer('JetBrainsMono-Medium.ttf'),
      leer('JetBrainsMono-Bold.ttf'),
    ]).then(([regular, semibold, negrita, monoMedia, monoNegrita]) => [
      { name: 'Schibsted', data: regular, weight: 400, style: 'normal' },
      { name: 'Schibsted', data: semibold, weight: 600, style: 'normal' },
      { name: 'Schibsted', data: negrita, weight: 700, style: 'normal' },
      { name: 'JetBrains', data: monoMedia, weight: 500, style: 'normal' },
      { name: 'JetBrains', data: monoNegrita, weight: 700, style: 'normal' },
    ]);
    // Si falló (un despliegue sin los archivos), que el próximo pedido lo intente de nuevo.
    fuentes.catch(() => {
      fuentes = null;
    });
  }
  return fuentes;
}

// ── La tarjeta ──────────────────────────────────────────────────────────────

const OSCURO = 'rgba(20,20,24,0.72)';

function Letrero({ texto }: { texto: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'JetBrains',
        fontWeight: 500,
        fontSize: 20,
        letterSpacing: 2.4,
        padding: '9px 16px',
        borderRadius: 999,
        background: OSCURO,
        color: '#ffffff',
      }}
    >
      {texto}
    </div>
  );
}

function LogoDeLeasefy({ alto }: { alto: number }) {
  const ancho = Math.round((alto * 947) / 235);
  return (
    <svg width={ancho} height={alto} viewBox={LEASEFY_LOCKUP_VIEWBOX} fill="#ffffff">
      <path d={LEASEFY_SYMBOL_PATH} />
      <path d={LEASEFY_WORDMARK_PATH} />
    </svg>
  );
}

function Pin() {
  return (
    <svg width="26" height="26" viewBox="0 0 256 256" fill="currentColor">
      <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" />
    </svg>
  );
}

/**
 * El diseño A. Todo con `display: flex` (Satori no conoce otro). Sin foto, el
 * fondo es el degradado de la marca.
 */
export function TarjetaDeLaVistaPrevia({
  datos,
  foto,
  logo,
}: {
  datos: DatosDeLaTarjeta;
  foto: string | null;
  logo: string | null;
}) {
  const nombreLargo = (datos.inmobiliaria ?? '').length > 34;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: ANCHO_DE_LA_IMAGEN,
        height: ALTO_DE_LA_IMAGEN,
        fontFamily: 'Schibsted',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #121230 45%, #1A40FF 100%)',
      }}
    >
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element -- Satori pinta <img>, no next/image.
        <img
          src={foto}
          alt=""
          width={ANCHO_DE_LA_IMAGEN}
          height={ALTO_DE_LA_IMAGEN}
          style={{ position: 'absolute', top: 0, left: 0, width: ANCHO_DE_LA_IMAGEN, height: ALTO_DE_LA_IMAGEN, objectFit: 'cover' }}
        />
      )}
      {/* Oscurece arriba un poco (los letreros) y abajo bastante (el texto). */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: ANCHO_DE_LA_IMAGEN,
          height: ALTO_DE_LA_IMAGEN,
          display: 'flex',
          background:
            'linear-gradient(180deg, rgba(10,12,20,0.35) 0%, rgba(10,12,20,0) 28%, rgba(10,12,20,0.15) 45%, rgba(10,12,20,0.88) 100%)',
        }}
      />

      <div style={{ position: 'absolute', top: 36, left: 44, display: 'flex', gap: 10 }}>
        <Letrero texto={datos.negocio} />
        {datos.tipo && <Letrero texto={datos.tipo} />}
      </div>

      {datos.inmobiliaria && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 40,
            maxWidth: 620,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#ffffff',
            padding: logo ? '8px 20px 8px 8px' : '12px 22px',
            borderRadius: 999,
          }}
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element -- Satori pinta <img>, no next/image.
            <img
              src={logo}
              alt=""
              width={44}
              height={44}
              style={{ width: 44, height: 44, borderRadius: 999, border: '1px solid #eeeeee' }}
            />
          )}
          <div style={{ display: 'flex', fontWeight: 600, fontSize: nombreLargo ? 18 : 21, color: '#141414' }}>
            {datos.inmobiliaria}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 44,
          right: 44,
          bottom: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          color: '#ffffff',
        }}
      >
        {datos.lugar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>
            <Pin />
            {datos.lugar}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            // 700 y no 600: el navegador engruesa la letra blanca sobre la foto y Satori no;
            // así se ve como la propuesta A que Nico eligió.
            fontWeight: 700,
            fontSize: tamanoDelTitulo(datos.titulo),
            lineHeight: 1.08,
            letterSpacing: -1,
            paddingRight: 8,
          }}
        >
          {datos.titulo}
        </div>
        {/* El precio y las cifras; si no caben en una fila, las cifras bajan (el logo tiene su lugar a la derecha). */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 18, rowGap: 12, marginTop: 6, paddingRight: 150 }}>
          {datos.precio && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ display: 'flex', fontFamily: 'JetBrains', fontWeight: 700, fontSize: 58, letterSpacing: -1 }}>
                {datos.precio}
              </div>
              {datos.periodo && (
                <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.8)' }}>{datos.periodo}</div>
              )}
            </div>
          )}
          {datos.cifras.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {datos.cifras.map((c) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    fontFamily: 'JetBrains',
                    fontWeight: 500,
                    fontSize: 23,
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.16)',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', right: 44, bottom: 50, display: 'flex' }}>
        <LogoDeLeasefy alto={34} />
      </div>
    </div>
  );
}
