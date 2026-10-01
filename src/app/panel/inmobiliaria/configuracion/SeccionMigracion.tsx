'use client';

import { useRouter } from 'next/navigation';
import { ArrowsClockwise, Buildings, FileText, ListNumbers, Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useMigracion } from '@/components/migracion/migracion-context';
import { TarjetaDeAjustes, FilaDeAjuste } from './piezas';

/**
 * Configuración → Migración: siempre se puede migrar, se haya elegido «en
 * otro momento» o «no requiero migración» al entrar (Nico, 2026-09-07: «si
 * llega a arrepentirse por más que haya descartado, que tenga la posibilidad
 * de migrar»). «Migrar ahora» abre la migración a pantalla completa —la
 * misma de la puesta en marcha—; cada importador suelto sigue teniendo su
 * pantalla.
 *
 * 🔴 Ya no hay «Recordatorio en el menú» con «Descartar» (Nico, 01-10): la
 * tarjeta del menú es fija mientras la migración esté en curso, sale sólo a
 * quien le dio «Migrar» y se va sola al terminar. Un botón para apagarla no
 * haría nada. Estaba en git antes de `feat(menú): migración fija`.
 */
const PASOS = [
  {
    icono: Users,
    titulo: 'Propietarios e inquilinos',
    descripcion: 'Tu archivo de terceros, con cuentas bancarias y documentos.',
    href: '/panel/inmobiliaria/migracion/terceros',
  },
  {
    icono: Buildings,
    titulo: 'Inmuebles y contratos',
    descripcion: 'Los contratos vigentes con su inmueble, canon y fechas.',
    href: '/panel/inmobiliaria/contratos/migrar',
  },
  {
    icono: ListNumbers,
    titulo: 'Plan de cuentas (PUC)',
    descripcion: 'Tus cuentas contables, para que los asientos salgan con tu plan.',
    href: '/panel/inmobiliaria/migracion/puc',
  },
  {
    icono: FileText,
    titulo: 'Saldos contables',
    descripcion: 'Los saldos iniciales para arrancar la contabilidad cuadrada.',
    href: '/panel/inmobiliaria/migracion/contables',
  },
] as const;

export function SeccionMigracion() {
  const router = useRouter();
  const migracion = useMigracion();

  return (
    <div className="space-y-4" data-testid="seccion-migracion">
      <TarjetaDeAjustes>
        <FilaDeAjuste
          icono={ArrowsClockwise}
          titulo="Asistente de migración"
          descripcion="Los seis pasos a pantalla completa, en orden: propietarios, inquilinos, inmuebles, contratos, plan de cuentas y saldos."
        >
          <Button
            type="button"
            size="sm"
            hideArrow
            data-testid="abrir-asistente-de-migracion"
            // Sin contexto (fuera del panel) cae al primer importador suelto.
            onClick={() => (migracion ? migracion.abrir() : router.push(PASOS[0].href))}
          >
            Migrar ahora
          </Button>
        </FilaDeAjuste>
      </TarjetaDeAjustes>

      <TarjetaDeAjustes>
        {PASOS.map((paso) => (
          <FilaDeAjuste key={paso.href} icono={paso.icono} titulo={paso.titulo} descripcion={paso.descripcion}>
            <Button type="button" variant="outline" size="sm" hideArrow onClick={() => router.push(paso.href)}>
              Abrir
            </Button>
          </FilaDeAjuste>
        ))}
      </TarjetaDeAjustes>
    </div>
  );
}
