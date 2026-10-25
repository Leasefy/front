'use client';

/**
 * Configuración → Reparaciones (reunión con Portofino, 22-10-2026).
 *
 * Dos cosas:
 *
 * 1. EL TIEMPO PARA ATENDER CADA PRIORIDAD (H-07, 18-09-2026: emergencia 4 h,
 *    alta 24 h, media 3 días, baja 7 días). Desde septiembre el back lo LEÍA de
 *    la inmobiliaria y nadie lo podía cambiar desde el panel. Nico en la
 *    reunión: «dependiendo de la prioridad se tiene sí o sí que trabajar en X
 *    tiempo».
 *
 * 2. QUIÉN PUEDE HACER LA REPARACIÓN. Nico: «de crítico urgente, sólo la
 *    inmobiliaria; para tiempos más laxos, "la puede hacer usted"». Por defecto
 *    Alta y Emergencia son sólo de la inmobiliaria; en las demás el propietario
 *    puede responder «La hago yo» o la inmobiliaria se la puede dejar.
 *
 * 🔴 Cambiar el tiempo NO mueve las reparaciones ya reportadas: cada una nació
 * con su plazo. Lo dice la pantalla, porque es lo primero que se pregunta.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Siren, UserCircle } from '@phosphor-icons/react';

import { Button, Input } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { ConfiguracionDeReparaciones, PrioridadDelBack } from '@/lib/types/deducciones';
import { useCambiosPorGuardar } from '@/components/configuracion/cambios-por-guardar';
import { EsqueletoDeSeccion, TarjetaDeAjustes, FilaDeAjuste } from './piezas';

/** De la más urgente a la que más espera, como se leen. */
const PRIORIDADES: Array<{ valor: PrioridadDelBack; titulo: string; descripcion: string }> = [
  { valor: 'EMERGENCY', titulo: 'Emergencia', descripcion: 'Agua corriendo, sin luz, una puerta que no cierra.' },
  { valor: 'HIGH', titulo: 'Alta', descripcion: 'Algo que no deja vivir bien el inmueble.' },
  { valor: 'MEDIUM', titulo: 'Media', descripcion: 'Molesta, pero da unos días.' },
  { valor: 'LOW', titulo: 'Baja', descripcion: 'Un arreglo que puede esperar.' },
];

const MAX_HORAS = 8760; // Un año. Más que eso no es un plazo, es un olvido.

/** «4 horas», «1 día», «3 días», «1 día y 6 horas». */
export function horasEnPalabras(horas: number): string {
  if (!Number.isInteger(horas) || horas <= 0) return '';
  const dias = Math.floor(horas / 24);
  const resto = horas % 24;
  const enDias = dias === 1 ? '1 día' : `${dias} días`;
  const enHoras = resto === 1 ? '1 hora' : `${resto} horas`;
  if (dias === 0) return enHoras;
  if (resto === 0) return enDias;
  return `${enDias} y ${enHoras}`;
}

export function SeccionReparaciones() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  const [datos, setDatos] = useState<ConfiguracionDeReparaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [soloInmobiliaria, setSoloInmobiliaria] = useState<PrioridadDelBack[]>([]);
  const [guardando, setGuardando] = useState(false);
  const conBarraRef = useRef(false);

  const poner = (d: ConfiguracionDeReparaciones) => {
    setDatos(d);
    setHoras(Object.fromEntries(PRIORIDADES.map((p) => [p.valor, String(d.slaHoras[p.valor])])));
    setSoloInmobiliaria(d.prioridadesSoloDeLaInmobiliaria);
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      poner(await aprobacionesDeReparacionApi.configuracion());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const horasCambiadas = datos
    ? PRIORIDADES.filter((p) => (horas[p.valor] ?? '').trim() !== String(datos.slaHoras[p.valor]))
    : [];
  const mismaLista = (a: PrioridadDelBack[], b: PrioridadDelBack[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  const prioridadesCambiaron = datos ? !mismaLista(soloInmobiliaria, datos.prioridadesSoloDeLaInmobiliaria) : false;

  /** Lo que la persona escribió y no es un número de horas que el back acepte. */
  const horaMala = PRIORIDADES.find((p) => {
    const n = Number((horas[p.valor] ?? '').trim());
    return !Number.isInteger(n) || n < 1 || n > MAX_HORAS;
  });

  const guardar = async (): Promise<boolean> => {
    if (!datos) return false;
    if (horasCambiadas.length > 0 && horaMala) {
      toast.error(`El tiempo de ${horaMala.titulo} va en horas enteras, entre 1 y ${MAX_HORAS}.`);
      return false;
    }
    setGuardando(true);
    try {
      const d = await aprobacionesDeReparacionApi.guardarConfiguracion({
        ...(horasCambiadas.length > 0
          ? {
              slaHoras: Object.fromEntries(PRIORIDADES.map((p) => [p.valor, Number(horas[p.valor])])) as Record<
                PrioridadDelBack,
                number
              >,
            }
          : {}),
        ...(prioridadesCambiaron ? { prioridadesSoloDeLaInmobiliaria: soloInmobiliaria } : {}),
      });
      poner(d);
      if (!conBarraRef.current) {
        toast.success('Listo. Las reparaciones ya reportadas conservan el plazo con el que nacieron.');
      }
      return true;
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar la configuración de reparaciones.',
          accion: 'guardar la configuración de reparaciones',
        }),
      );
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const { conBarra } = useCambiosPorGuardar({
    id: 'reparaciones',
    cambios: horasCambiadas.length + (prioridadesCambiaron ? 1 : 0),
    guardar,
    descartar: () => {
      if (datos) poner(datos);
    },
    activo: puedeEditar,
  });
  conBarraRef.current = conBarra;

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="la configuración de reparaciones"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={8} />}
      >
        <div />
      </EstadoDeDatos>
    );
  }

  const hayCambios = horasCambiadas.length > 0 || prioridadesCambiaron;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-base font-medium text-fg">
          <Clock className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          Tiempo para atender cada prioridad
        </h3>
        <p className="text-sm text-fg-muted">
          Cuenta desde que se reporta la reparación, en horas corridas. Si se pasa, la reparación queda vencida.
        </p>
      </div>
      {!datos.disponible.sla && (
        <div role="alert" className="rounded-xl bg-warning-soft px-3 py-2 text-caption text-fg">
          Todavía no se puede cambiar: Leasefy tiene pendiente una actualización. Mientras tanto rigen los tiempos sugeridos.
        </div>
      )}
      <TarjetaDeAjustes>
        {PRIORIDADES.map((p) => {
          const valor = horas[p.valor] ?? '';
          const n = Number(valor);
          const sugerido = datos.slaSugerido[p.valor];
          return (
            <FilaDeAjuste
              key={p.valor}
              icono={p.valor === 'EMERGENCY' ? Siren : Clock}
              titulo={p.titulo}
              descripcion={`${p.descripcion} Sugerido: ${horasEnPalabras(sugerido)}.`}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_HORAS}
                  step={1}
                  className="w-24 text-right font-mono tabular-nums"
                  aria-label={`Horas para atender una reparación de prioridad ${p.titulo}`}
                  disabled={!puedeEditar || !datos.disponible.sla}
                  value={valor}
                  onChange={(e) => setHoras({ ...horas, [p.valor]: e.target.value })}
                  data-testid={`horas-${p.valor}`}
                />
                <span className="w-28 shrink-0 text-caption text-fg-muted">
                  {Number.isInteger(n) && n >= 24 ? `horas · ${horasEnPalabras(n)}` : 'horas'}
                </span>
              </div>
            </FilaDeAjuste>
          );
        })}
      </TarjetaDeAjustes>

      <div className="space-y-1 pt-2">
        <h3 className="flex items-center gap-2 text-base font-medium text-fg">
          <UserCircle className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          ¿Quién puede hacer la reparación?
        </h3>
        <p className="text-sm text-fg-muted">
          En las prioridades marcadas la hace sólo tu inmobiliaria. En las demás, el propietario puede responder «La hago
          yo» y hacerla por su cuenta, o tú se la puedes dejar desde la tarjeta.
        </p>
      </div>
      {!datos.disponible.prioridades && (
        <div role="alert" className="rounded-xl bg-warning-soft px-3 py-2 text-caption text-fg">
          Todavía no se puede cambiar: Leasefy tiene pendiente una actualización. Mientras tanto Alta y Emergencia las hace
          sólo tu inmobiliaria.
        </div>
      )}
      <TarjetaDeAjustes>
        {PRIORIDADES.map((p) => {
          const marcada = soloInmobiliaria.includes(p.valor);
          return (
            <FilaDeAjuste
              key={p.valor}
              icono={p.valor === 'EMERGENCY' ? Siren : UserCircle}
              titulo={p.titulo}
              descripcion={
                marcada
                  ? 'La hace sólo tu inmobiliaria: no da espera a que el propietario consiga quién la haga.'
                  : 'La puede hacer el propietario por su cuenta.'
              }
            >
              <Switch
                checked={marcada}
                disabled={!puedeEditar || !datos.disponible.prioridades}
                onCheckedChange={(v: boolean) =>
                  setSoloInmobiliaria((actual) =>
                    v ? [...actual.filter((x) => x !== p.valor), p.valor] : actual.filter((x) => x !== p.valor),
                  )
                }
                aria-label={`Prioridad ${p.titulo}: sólo la inmobiliaria`}
                data-testid={`solo-inmobiliaria-${p.valor}`}
              />
            </FilaDeAjuste>
          );
        })}
      </TarjetaDeAjustes>

      <p className="text-caption text-fg-muted">
        Cambiar los tiempos <span className="text-fg">no mueve las reparaciones ya reportadas</span>: cada una se juzga con el plazo con el
        que nació. Cambiar quién la puede hacer tampoco le quita al propietario una que ya está haciendo; si subes su
        prioridad a una de las marcadas, la retoma tu inmobiliaria.
      </p>

      {puedeEditar && !conBarra && (
        <div className="flex justify-end">
          <Button
            hideArrow
            isLoading={guardando}
            disabled={!hayCambios || guardando}
            onClick={() => void guardar()}
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}
