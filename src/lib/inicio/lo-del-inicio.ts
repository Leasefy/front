/**
 * Lo que `GET /api/inicio` le entrega a los widgets del inicio de sesión (la ruta sólo puede exportar lo de Next,
 * por eso los tipos viven aquí). Ver `src/app/api/inicio/route.ts`.
 */
import type { NoticiaProptech } from './noticias-proptech';

/** Un artículo del blog de Leasefy, con sólo lo que el widget pinta. */
export interface EntradaDelBlog {
  titulo: string;
  categoria: string;
  fecha: string;
  imagen: string;
  href: string;
}

export interface LoDelInicio {
  blog: EntradaDelBlog[];
  noticias: NoticiaProptech[];
}
