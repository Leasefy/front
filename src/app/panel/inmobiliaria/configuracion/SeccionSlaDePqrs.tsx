'use client';

/**
 * 🔴 EL TIEMPO MÁXIMO DE UNA PQRS (Nico, 17/18-09-2026: «cada PQRS con
 * responsable, tiempo máximo CONFIGURABLE y escalamiento automático al jefe si
 * se vence»).
 *
 * Lo que había: 15 días hábiles fijos para toda PQRS y toda inmobiliaria — el
 * plazo de la Ley 1755 art. 14, que rige para PETICIONES ante autoridades. Una
 * inmobiliaria no es una autoridad: su obligación nace del contrato y del
 * Estatuto del Consumidor (Ley 1480 art. 58). Y una que quiere contestar en 48
 * horas no podía prometerlo.
 *
 * 🔴 Vacío NO es cero: vacío significa «este tipo se rige por el plazo legal».
 * Un cero dejaría toda PQRS vencida desde el segundo uno, y por eso el back lo
 * rechaza; acá ni siquiera se puede escribir.
 *
 * 🔴 Cambiar esto NO mueve las PQRS ya radicadas. El plazo se congela en la fila
 * el día que se radica, justamente para que bajar el compromiso no vuelva
 * vencidas de golpe a las que estaban abiertas. La pantalla lo dice, porque es
 * lo primero que alguien se pregunta al bajarlo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Siren, UserCircleCheck } from '@phosphor-icons/react';

import { Button, Input } from '@/components/ui';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { slaDePqrsApi, type SlaDePqrs } from '@/lib/api/sla-de-pqrs.service';
import { pqrsApi } from '@/lib/api/pqrs-agencia.service';
import type { ResponsableDePqrs } from '@/lib/api/pqrs-agencia.types';
import { useCambiosPorGuardar } from '@/components/configuracion/cambios-por-guardar';
import { EsqueletoDeSeccion, TarjetaDeAjustes, FilaDeAjuste } from './piezas';

/** Los cuatro tipos, en el orden en que los lee una persona. */
const TIPOS: Array<{ valor: string; titulo: string; descripcion: string }> = [
  {
    valor: 'PETICION',
    titulo: 'Petición',
    descripcion: 'Pide algo que la inmobiliaria puede conceder.',
  },
  {
    valor: 'QUEJA',
    titulo: 'Queja',
    descripcion: 'Se queja de cómo lo atendieron.',
  },
  {
    valor: 'RECLAMO',
    titulo: 'Reclamo',
    descripcion: 'Exige que se corrija algo del servicio o del inmueble.',
  },
  {
    valor: 'SOLICITUD',
    titulo: 'Solicitud',
    descripcion: 'Un trámite: un paz y salvo, una certificación.',
  },
];

const MAX_HORAS = 2160; // 90 días. Más que eso no es un compromiso de respuesta.

export function SeccionSlaDePqrs() {
  const { canAccess, isAdmin } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');
  // SO-26 (04-10-2026): a quién se le escalan las vencidas. Sólo administrador.
  const [equipo, setEquipo] = useState<ResponsableDePqrs[]>([]);
  const [guardandoJefe, setGuardandoJefe] = useState(false);
  /*
   * Dentro de Configuración (Nico, 20-10-2026): elegir en los dos selectores y
   * escribir los plazos sólo marca; todo se guarda con la barra de abajo.
   * `undefined` = no lo han tocado.
   */
  const [jefeElegido, setJefeElegido] = useState<string | undefined>(undefined);
  const [porDefectoElegido, setPorDefectoElegido] = useState<string | undefined>(undefined);
  const conBarraRef = useRef(false);
  useEffect(() => {
    pqrsApi.responsables().then(setEquipo).catch(() => setEquipo([]));
  }, []);
  const guardarJefe = async (userId: string): Promise<boolean> => {
    setGuardandoJefe(true);
    try {
      const d = await slaDePqrsApi.guardarEscalamiento(userId || null);
      setDatos(d);
      setJefeElegido(undefined);
      if (conBarraRef.current) return true;
      toast.success(
        d.escalarANombre
          ? `Listo. Las PQRS vencidas se le escalan a ${d.escalarANombre}.`
          : 'Listo. Las PQRS vencidas no se le escalan a nadie.',
      );
      return true;
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar a quién se escalan.',
          accion: 'guardar a quién se escalan las PQRS vencidas',
        }),
      );
      return false;
    } finally {
      setGuardandoJefe(false);
    }
  };

  // AUTONOMIA-POR-TIPO (04-10-2026): el responsable por defecto de las PQRS que
  // llegan sin responsable (el Piloto se las asigna sola si la inmobiliaria lo
  // escogió en Autonomía → «Qué hace solo»). Sólo administrador.
  const [guardandoPorDefecto, setGuardandoPorDefecto] = useState(false);
  const guardarPorDefecto = async (userId: string): Promise<boolean> => {
    setGuardandoPorDefecto(true);
    try {
      const d = await slaDePqrsApi.guardarResponsablePorDefecto(userId || null);
      setDatos(d);
      setPorDefectoElegido(undefined);
      if (conBarraRef.current) return true;
      toast.success(
        d.responsablePorDefectoNombre
          ? `Listo. Las PQRS sin responsable quedan a cargo de ${d.responsablePorDefectoNombre} cuando el Piloto las asigna solo.`
          : 'Listo. Las PQRS sin responsable no tienen a quién asignarse solas: piden tu clic.',
      );
      return true;
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar el responsable por defecto.',
          accion: 'guardar el responsable por defecto de las PQRS',
        }),
      );
      return false;
    } finally {
      setGuardandoPorDefecto(false);
    }
  };

  const [datos, setDatos] = useState<SlaDePqrs | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await slaDePqrsApi.ver();
      setDatos(d);
      setBorrador(
        Object.fromEntries(
          TIPOS.map((t) => [t.valor, d.porTipo[t.valor] ? String(d.porTipo[t.valor]) : '']),
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (): Promise<boolean> => {
    setGuardando(true);
    try {
      const porTipo = Object.fromEntries(
        TIPOS.map((t) => {
          const crudo = borrador[t.valor]?.trim() ?? '';
          // Vacío = el plazo legal. Nunca 0: un plazo de cero horas dejaría
          // toda PQRS vencida desde el segundo uno.
          const n = crudo === '' ? null : Number(crudo);
          return [t.valor, Number.isInteger(n) && (n as number) > 0 ? n : null];
        }),
      );
      const d = await slaDePqrsApi.guardar(porTipo);
      setDatos(d);
      if (!conBarraRef.current) toast.success('Listo. Las PQRS ya radicadas conservan el plazo que se les prometió.');
      return true;
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar el tiempo máximo.',
          accion: 'guardar el tiempo máximo',
        }),
      );
      return false;
    } finally {
      setGuardando(false);
    }
  };

  // Lo que difiere de lo guardado (antes de los retornos tempranos: es un gancho).
  const plazoGuardado = (tipo: string) => (datos?.porTipo[tipo] ? String(datos.porTipo[tipo]) : '');
  const plazosCambiados = datos
    ? TIPOS.filter((t) => (borrador[t.valor] ?? '').trim() !== plazoGuardado(t.valor)).length
    : 0;
  const jefeCambio = jefeElegido !== undefined && jefeElegido !== (datos?.escalarAUserId ?? '');
  const porDefectoCambio =
    porDefectoElegido !== undefined && porDefectoElegido !== (datos?.responsablePorDefectoUserId ?? '');
  const { conBarra } = useCambiosPorGuardar({
    id: 'sla-de-pqrs',
    cambios: plazosCambiados + (jefeCambio ? 1 : 0) + (porDefectoCambio ? 1 : 0),
    guardar: async () => {
      if (plazosCambiados > 0 && !(await guardar())) return false;
      if (jefeCambio && !(await guardarJefe(jefeElegido ?? ''))) return false;
      if (porDefectoCambio && !(await guardarPorDefecto(porDefectoElegido ?? ''))) return false;
      return true;
    },
    descartar: () => {
      setBorrador(Object.fromEntries(TIPOS.map((t) => [t.valor, plazoGuardado(t.valor)])));
      setJefeElegido(undefined);
      setPorDefectoElegido(undefined);
    },
    activo: puedeEditar || isAdmin,
  });
  conBarraRef.current = conBarra;

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="el tiempo máximo de las PQRS"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={4} />}
      >
        <div />
      </EstadoDeDatos>
    );
  }

  const cambio = TIPOS.some(
    (t) => (borrador[t.valor] ?? '') !== (datos.porTipo[t.valor] ? String(datos.porTipo[t.valor]) : ''),
  );

  return (
    <div className="space-y-4">
      {/* Glow up 22-10: «cuánto te demoras, por tipo» lo dice el marco; aquí sólo lo que no dice. */}
      <p className="text-sm text-fg-muted">
        Déjalo vacío para regirte por el plazo legal de{' '}
        <span className="font-mono text-fg">{datos.legalDiasHabiles}</span> días hábiles (Ley 1755 art. 14 y
        Ley 1480 art. 58).
      </p>

      {!datos.disponible && (
        <div
          role="alert"
          className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-caption text-warning"
        >
          {datos.motivo ?? 'Todavía no se puede configurar.'}
        </div>
      )}

      <TarjetaDeAjustes>
        {TIPOS.map((t) => (
          <FilaDeAjuste
            key={t.valor}
            icono={Clock}
            titulo={t.titulo}
            descripcion={t.descripcion}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_HORAS}
                step={1}
                className="w-24 text-right tabular-nums"
                aria-label={`Horas para ${t.titulo}`}
                placeholder="Legal"
                disabled={!puedeEditar || !datos.disponible}
                value={borrador[t.valor] ?? ''}
                onChange={(e) =>
                  setBorrador({ ...borrador, [t.valor]: e.target.value })
                }
              />
              <span className="w-12 shrink-0 text-caption text-fg-muted">
                {borrador[t.valor]?.trim() ? 'horas' : 'legal'}
              </span>
            </div>
          </FilaDeAjuste>
        ))}
      </TarjetaDeAjustes>

      <TarjetaDeAjustes>
        <FilaDeAjuste
          icono={Siren}
          titulo="Cuando una PQRS se vence"
          descripcion={
            datos.escalarANombre
              ? `Se le escala a ${datos.escalarANombre}: le llega un aviso con cada PQRS vencida (todos los días a la 1:00 p. m.), y también a quien la tenía a cargo.`
              : 'Hoy no se le escala a nadie: elige quién recibe las PQRS vencidas para que el plazo legal no se pase sin que nadie se entere.'
          }
        >
          <select
            aria-label="A quién se escalan las PQRS vencidas"
            value={jefeElegido ?? datos.escalarAUserId ?? ''}
            disabled={!isAdmin || guardandoJefe || !datos.disponible}
            onChange={(e) => (conBarra ? setJefeElegido(e.target.value) : void guardarJefe(e.target.value))}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg sm:w-64"
            data-testid="pqrs-escalar-a"
          >
            <option value="">A nadie</option>
            {datos.escalarAUserId && !equipo.some((m) => m.userId === datos.escalarAUserId) && (
              <option value={datos.escalarAUserId}>{datos.escalarANombre ?? 'Responsable actual'}</option>
            )}
            {equipo.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.nombre}
              </option>
            ))}
          </select>
        </FilaDeAjuste>
      </TarjetaDeAjustes>
      {datos.responsablePorDefectoDisponible !== undefined && (
        <TarjetaDeAjustes>
          <FilaDeAjuste
            icono={UserCircleCheck}
            titulo="Responsable por defecto"
            descripcion={
              !datos.responsablePorDefectoDisponible
                ? 'Todavía no se puede escoger: Leasefy tiene pendiente una actualización. Mientras tanto, las PQRS sin responsable piden tu clic.'
                : datos.responsablePorDefectoNombre
                  ? `Si tu inmobiliaria escogió en el Piloto que «Asignar la PQRS sin responsable» vaya solo, la PQRS que llega sin responsable queda a cargo de ${datos.responsablePorDefectoNombre}.`
                  : 'Sin responsable por defecto, la PQRS que llega sin responsable pide tu clic aunque el Piloto esté en Automático.'
            }
          >
            <select
              aria-label="Responsable por defecto de las PQRS"
              value={porDefectoElegido ?? datos.responsablePorDefectoUserId ?? ''}
              disabled={!isAdmin || guardandoPorDefecto || !datos.disponible || !datos.responsablePorDefectoDisponible}
              onChange={(e) =>
                conBarra ? setPorDefectoElegido(e.target.value) : void guardarPorDefecto(e.target.value)
              }
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg sm:w-64"
              data-testid="pqrs-responsable-por-defecto"
            >
              <option value="">Nadie</option>
              {datos.responsablePorDefectoUserId &&
                !equipo.some((m) => m.userId === datos.responsablePorDefectoUserId) && (
                  <option value={datos.responsablePorDefectoUserId}>
                    {datos.responsablePorDefectoNombre ?? 'Responsable actual'}
                  </option>
                )}
              {equipo.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </FilaDeAjuste>
        </TarjetaDeAjustes>
      )}
      {!isAdmin && (
        <p className="text-caption text-fg-muted">
          Sólo un administrador decide a quién se escalan las PQRS vencidas y quién es el responsable por defecto.
        </p>
      )}

      <p className="text-caption text-fg-muted">
        Cambiar esto <strong>no mueve las PQRS ya radicadas</strong>: cada una se
        juzga con el plazo que se le prometió el día que se radicó. Bajar el
        compromiso no vuelve vencidas de golpe a las que están abiertas.
      </p>

      {puedeEditar && !conBarra && (
        <div className="flex justify-end">
          <Button
            hideArrow
            isLoading={guardando}
            disabled={!cambio || !datos.disponible || guardando}
            onClick={() => void guardar()}
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
}
