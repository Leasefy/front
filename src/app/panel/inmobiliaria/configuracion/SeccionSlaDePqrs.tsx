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

import { useCallback, useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react';

import { Button, Input } from '@/components/ui';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { slaDePqrsApi, type SlaDePqrs } from '@/lib/api/sla-de-pqrs.service';
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
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('configuracion', 'edit');

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

  const guardar = async () => {
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
      toast.success('Listo. Las PQRS ya radicadas conservan el plazo que se les prometió.');
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo guardar el tiempo máximo'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="el tiempo máximo de las PQRS"
        onReintentar={() => void cargar()}
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
      <p className="text-sm text-fg-muted">
        Cuánto se demora tu inmobiliaria en responder, por tipo. Déjalo vacío para
        regirte por el plazo legal de <strong>{datos.legalDiasHabiles} días hábiles</strong>{' '}
        (Ley 1755 art. 14 y Ley 1480 art. 58).
      </p>

      {!datos.disponible && (
        <div
          role="alert"
          className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning"
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
              <span className="w-12 shrink-0 text-xs text-fg-muted">
                {borrador[t.valor]?.trim() ? 'horas' : 'legal'}
              </span>
            </div>
          </FilaDeAjuste>
        ))}
      </TarjetaDeAjustes>

      <p className="text-xs text-fg-muted">
        Cambiar esto <strong>no mueve las PQRS ya radicadas</strong>: cada una se
        juzga con el plazo que se le prometió el día que se radicó. Bajar el
        compromiso no vuelve vencidas de golpe a las que están abiertas.
      </p>

      {puedeEditar && (
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

function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return porDefecto;
}
