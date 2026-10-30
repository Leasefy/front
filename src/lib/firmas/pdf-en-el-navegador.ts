/**
 * pdf.js en el navegador, para ver las páginas del documento y ubicar las firmas (Firmas, 28-10-2026).
 *
 * No va en el paquete: los dos archivos de pdf.js 5.4.296 (los mismos del back) viven en `public/vendor/pdfjs-5.4.296/`
 * y se cargan sólo cuando alguien elige «La pongo yo en el documento». Se cargan con un `<script type="module">`
 * creado desde el código (lo permite la CSP con `strict-dynamic`) y el worker sale del mismo origen (`worker-src
 * 'self'`). pdf.js deja su API en `globalThis.pdfjsLib`.
 */

export const PDFJS_BASE = '/vendor/pdfjs-5.4.296';

export interface PaginaDePdf {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
  };
}

export interface DocumentoDePdf {
  numPages: number;
  getPage(n: number): Promise<PaginaDePdf>;
  destroy(): Promise<void>;
}

interface PdfJs {
  getDocument(o: { data: ArrayBuffer | Uint8Array; isEvalSupported?: boolean }): { promise: Promise<DocumentoDePdf> };
  GlobalWorkerOptions: { workerSrc: string };
}

let cargando: Promise<PdfJs> | null = null;

export function cargarPdfJs(): Promise<PdfJs> {
  if (typeof window === 'undefined') return Promise.reject(new Error('pdf.js sólo corre en el navegador'));
  const g = globalThis as unknown as { pdfjsLib?: PdfJs };
  if (g.pdfjsLib) return Promise.resolve(g.pdfjsLib);
  cargando ??= new Promise<PdfJs>((resolve, reject) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = `${PDFJS_BASE}/pdf.min.mjs`;
    s.onload = () => {
      const lib = g.pdfjsLib;
      if (!lib) {
        cargando = null;
        reject(new Error('No pudimos abrir el visor de PDF.'));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
      resolve(lib);
    };
    s.onerror = () => {
      cargando = null;
      reject(new Error('No pudimos abrir el visor de PDF. Revisa tu conexión.'));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

export async function abrirPdf(archivo: File): Promise<DocumentoDePdf> {
  const lib = await cargarPdfJs();
  const datos = new Uint8Array(await archivo.arrayBuffer());
  return lib.getDocument({ data: datos, isEvalSupported: false }).promise;
}
