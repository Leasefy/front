/**
 * La revisión de la cara antes de la foto del firmante (Nico, 28-10-2026: «cámara propia + revisar la cara», sin Didit).
 *
 * Corre en el navegador con face-api 1.7.15 (MIT; TensorFlow.js adentro) y su detector chico (≈190 KB), servidos desde
 * nuestro origen (`public/vendor/face-api/`): la foto no sale a ningún tercero y la política de contenido no se abre a
 * otro dominio. Se carga con `import()` sólo cuando la persona abre la cámara (≈0,5 MB por la red, comprimido).
 *
 * No es una prueba de vida: sólo confirma que en la foto hay UNA cara de frente, centrada y de buen tamaño. La parte pura
 * (`encuadreDeLaFoto`) decide qué decirle a la persona; la carga se prueba en el navegador.
 */

export const VERSION_DE_FACE_API = '1.7.15';
const BASE = `/vendor/face-api/${VERSION_DE_FACE_API}`;

/** Una cara que vio el detector, en píxeles del cuadro revisado. */
export interface CaraVista {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** 0 a 1. */
  puntaje: number;
}

export type EncuadreDeLaFoto = 'sin-cara' | 'varias' | 'lejos' | 'fuera' | 'lista';

/** La cara tiene que ocupar al menos esto del lado corto del cuadro (más chica = está lejos). */
export const TAMANO_MINIMO_DE_LA_CARA = 0.22;
/** Otra cara cuenta como «otra persona» si mide al menos esto de la más grande (las de un cuadro al fondo no). */
const OTRA_PERSONA = 0.5;

/** Qué decirle a la persona según lo que vio el detector en un cuadro de `ancho` × `alto`. Pura. */
export function encuadreDeLaFoto(caras: CaraVista[], ancho: number, alto: number): EncuadreDeLaFoto {
  if (caras.length === 0 || ancho <= 0 || alto <= 0) return 'sin-cara';
  const ordenadas = [...caras].sort((a, b) => b.ancho - a.ancho);
  const cara = ordenadas[0];
  if (ordenadas.slice(1).some((c) => c.ancho >= cara.ancho * OTRA_PERSONA)) return 'varias';
  if (cara.ancho < Math.min(ancho, alto) * TAMANO_MINIMO_DE_LA_CARA) return 'lejos';
  const centroX = (cara.x + cara.ancho / 2) / ancho;
  const centroY = (cara.y + cara.alto / 2) / alto;
  if (centroX < 0.25 || centroX > 0.75 || centroY < 0.2 || centroY > 0.8) return 'fuera';
  return 'lista';
}

/** Lo que se le dice a la persona en cada caso, debajo de la cámara. */
export const FRASE_DEL_ENCUADRE: Record<EncuadreDeLaFoto, string> = {
  'sin-cara': 'Pon tu cara dentro del óvalo.',
  varias: 'Que salga sólo tu cara.',
  lejos: 'Acércate un poco a la cámara.',
  fuera: 'Centra tu cara en el óvalo.',
  lista: 'Listo. Toma la foto.',
};

export interface RevisorDeLaCara {
  revisar(medio: HTMLVideoElement | HTMLCanvasElement): Promise<CaraVista[]>;
}

/** Lo poco de face-api que se usa (el módulo llega sin tipos: se carga por URL). */
interface FaceApi {
  tf: { ready(): Promise<unknown> };
  nets: { tinyFaceDetector: { loadFromUri(uri: string): Promise<void> } };
  TinyFaceDetectorOptions: new (o: { inputSize: number; scoreThreshold: number }) => unknown;
  detectAllFaces(
    medio: HTMLVideoElement | HTMLCanvasElement,
    opciones: unknown,
  ): Promise<Array<{ score: number; box: { x: number; y: number; width: number; height: number } }>>;
}

let cargando: Promise<RevisorDeLaCara> | null = null;

/**
 * Carga face-api y su detector una sola vez por pestaña. Si falla (red, un navegador sin WebGL ni CPU suficiente), la
 * promesa se rechaza y la próxima llamada lo intenta de nuevo; la cámara deja tomar la foto sin revisión.
 */
export function cargarElRevisorDeLaCara(): Promise<RevisorDeLaCara> {
  cargando ??= (async () => {
    const ruta = `${BASE}/face-api.esm.js`;
    const f = (await import(/* webpackIgnore: true */ ruta)) as FaceApi;
    await f.tf.ready();
    await f.nets.tinyFaceDetector.loadFromUri(`${BASE}/modelo`);
    const opciones = new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const revisor: RevisorDeLaCara = {
      revisar: async (medio) =>
        (await f.detectAllFaces(medio, opciones)).map((d) => ({
          x: d.box.x,
          y: d.box.y,
          ancho: d.box.width,
          alto: d.box.height,
          puntaje: d.score,
        })),
    };
    return revisor;
  })().catch((e: unknown) => {
    cargando = null;
    throw e;
  });
  return cargando;
}
