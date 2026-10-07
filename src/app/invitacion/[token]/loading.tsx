import { CargaDeMarca } from '@/components/ui/carga-de-marca';

/**
 * Carga de la ruta: pantalla completa, así que va el logo de Leasefy en carga
 * (Nico, 01-10) — el mismo fondo y la misma carga que «Validando invitación…»
 * de la página, para que el paso de una a otra no salte.
 */
export default function InvitacionLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <CargaDeMarca tamano="lg" disposicion="apilada" texto="Cargando invitación" />
    </div>
  );
}
