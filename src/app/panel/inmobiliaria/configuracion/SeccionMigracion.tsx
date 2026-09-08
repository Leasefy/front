'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise, BellSimple, Buildings, FileText, ListNumbers, Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';
import { useMigracion } from '@/components/migracion/migracion-context';
import { migracionEstadoApi } from '@/lib/api/migracion-estado.service';
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  leerDecisionDeMigracion,
  type DecisionDeMigracion,
} from '@/lib/migracion/decision-de-migracion';
import { TarjetaDeAjustes, FilaDeAjuste } from './piezas';

/**
 * Configuración → Migración: siempre se puede migrar, se haya elegido «en
 * otro momento» o «no requiero migración» al entrar (Nico, 2026-09-07: «si
 * llega a arrepentirse por más que haya descartado, que tenga la posibilidad
 * de migrar»). «Migrar ahora» abre la migración a pantalla completa —la
 * misma de la puesta en marcha—; cada importador suelto sigue teniendo su
 * pantalla, y el recordatorio del sidebar se prende o se apaga.
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
  const { agency } = useAuth();
  const migracion = useMigracion();
  const agencyId = agency?.id ?? null;
  const [decision, setDecision] = useState<DecisionDeMigracion | null>(null);

  useEffect(() => {
    const leer = () => setDecision(leerDecisionDeMigracion(agencyId));
    leer();
    window.addEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
    return () => window.removeEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
  }, [agencyId]);

  // El recordatorio se apaga sólo con «no requiero migración» o con su ✕. La
  // cuenta manda (`recordatorioDescartado` del back); el navegador adelanta.
  const recordando = !(migracion?.estado?.recordatorioDescartado === true || decision === 'nunca');
  const alternar = () => {
    guardarDecisionDeMigracion(agencyId, recordando ? 'nunca' : 'luego');
    void migracionEstadoApi
      .recordatorio(recordando)
      .then(() => migracion?.recargar())
      .catch(() => undefined);
  };

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

      <TarjetaDeAjustes>
        <FilaDeAjuste
          icono={recordando ? BellSimple : ArrowsClockwise}
          titulo="Recordatorio en el menú"
          descripcion={
            recordando
              ? 'Mientras la migración esté sin terminar, el menú muestra cómo va y desde ahí se retoma.'
              : 'Sin recordatorio en el menú. Puedes migrar desde acá cuando quieras.'
          }
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            data-testid="alternar-recordatorio-de-migracion"
            onClick={alternar}
          >
            {recordando ? 'Descartar' : 'Recordármelo'}
          </Button>
        </FilaDeAjuste>
      </TarjetaDeAjustes>
    </div>
  );
}
