'use client';

/**
 * Configuración → Mandato: qué motivos de terminación decide SIEMPRE el
 * propietario (reunión con Portofino, 22-10-2026). Con uno marcado, terminar un
 * contrato por ese motivo le pide el sí al propietario en su portal; en los
 * demás, quien la registra elige. Cada cambio se guarda al tocarlo.
 */
import { useEffect, useState } from 'react';
import { CalendarX } from '@phosphor-icons/react';

import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cicloDeVidaApi, type ConfiguracionDeTerminaciones } from '@/lib/api/ciclo-de-vida.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { TarjetaDeAjustes, FilaDeAjuste } from './piezas';

export function SeccionTerminacionesConElPropietario() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  const [datos, setDatos] = useState<ConfiguracionDeTerminaciones | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    cicloDeVidaApi
      .configuracionDeTerminaciones()
      .then(setDatos)
      .catch(() => setDatos(null));
  }, []);

  if (!datos || !datos.disponible) return null;

  const cambiar = async (codigo: string, marcado: boolean) => {
    const motivos = marcado ? [...new Set([...datos.vanAlPropietario, codigo])] : datos.vanAlPropietario.filter((m) => m !== codigo);
    setGuardando(codigo);
    try {
      setDatos(await cicloDeVidaApi.guardarConfiguracionDeTerminaciones(motivos));
    } catch (e) {
      toast.error('No se pudo guardar', { description: mensajeParaLaPersona(e, { accion: 'guardar los motivos de terminación' }) });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="terminaciones-con-el-propietario">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <CalendarX className="h-4 w-4" aria-hidden="true" />
          ¿Qué terminaciones decide el propietario?
        </h3>
        <p className="text-sm text-fg-muted">
          Con los motivos marcados, terminar un contrato antes de tiempo le pide el sí al propietario en su portal y el
          contrato sigue igual hasta que responda. En los demás, quien la registra elige si se lo pide.
        </p>
      </div>
      <TarjetaDeAjustes>
        {datos.motivos
          .filter((m) => m.codigo !== 'OTRO')
          .map((m) => (
            <FilaDeAjuste key={m.codigo} icono={CalendarX} titulo={m.nombre} descripcion={datos.vanAlPropietario.includes(m.codigo) ? 'La decide el propietario.' : 'La decide tu inmobiliaria (o se la pide al propietario).'}>
              <Switch
                checked={datos.vanAlPropietario.includes(m.codigo)}
                disabled={!puedeEditar || guardando !== null}
                onCheckedChange={(v: boolean) => void cambiar(m.codigo, v)}
                aria-label={`${m.nombre}: la decide el propietario`}
                data-testid={`decide-el-propietario-${m.codigo}`}
              />
            </FilaDeAjuste>
          ))}
      </TarjetaDeAjustes>
    </div>
  );
}
