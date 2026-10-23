import { CargandoElEnlace, MarcoDelEnlace } from '@/components/enlace-publico/MarcoDelEnlace';

/**
 * Carga de la ruta: la MISMA que «Validando invitación…» de la página (el
 * marco del enlace con el logo y la carga de la marca, Nico 01-10), para que
 * el paso de una a otra no salte.
 */
export default function InvitacionLoading() {
  return (
    <MarcoDelEnlace vista="cargando">
      <CargandoElEnlace texto="Validando invitación…" />
    </MarcoDelEnlace>
  );
}
