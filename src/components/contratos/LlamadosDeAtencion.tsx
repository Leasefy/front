'use client';

/**
 * Los llamados de atención por convivencia del contrato (Nico, 29-10-2026:
 * «sí, hazlo»). Portofino decide si un inquilino renueva mirando cómo paga,
 * las reparaciones del inmueble y estos llamados; Vinci los cuenta en la
 * renovación. Se anotan en un cajón sin salir del contrato; uno anotado por
 * error se ANULA con su motivo (deja de contar, no se borra).
 */
import { useCallback, useEffect, useState } from 'react';
import { Chip, Presence } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { VacioChico } from '@/components/estado/VacioChico';
import { fechaLegible } from '@/components/estado-de-cuenta/filas';
import {
  convivenciaApi,
  type LlamadosDelContrato,
  type MotivoDeConvivencia,
  type QuienLoReporto,
} from '@/lib/api/convivencia.service';
import {
  LARGO_MINIMO_DEL_MOTIVO_DE_ANULACION,
  MOTIVOS,
  QUIENES,
  avisoDeRepetidos,
  erroresDelLlamado,
  hoyEnColombia,
  nombreDeQuien,
  nombreDelMotivo,
  type LlamadoPorRegistrar,
} from '@/lib/contratos/convivencia';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

const vacio = (): LlamadoPorRegistrar => ({ motivo: null, fecha: hoyEnColombia(), quePaso: '', loReporto: null });

export function LlamadosDeAtencion({ contractId, puedeEditar }: { contractId: string; puedeEditar: boolean }) {
  const [datos, setDatos] = useState<LlamadosDelContrato | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [abierto, setAbierto] = useState(false);
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivoDeAnulacion, setMotivoDeAnulacion] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    return convivenciaApi
      .listar(contractId)
      .then(setDatos)
      .catch((e: unknown) => setError(e));
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const anular = async (llamadoId: string) => {
    setOcupado(true);
    try {
      await convivenciaApi.anular(contractId, llamadoId, motivoDeAnulacion.trim());
      toast.success('Llamado anulado. Ya no cuenta para la renovación.');
      setAnulando(null);
      setMotivoDeAnulacion('');
      await cargar();
    } catch (e) {
      toast.error('No se pudo anular el llamado.', { description: mensajeParaLaPersona(e, { accion: 'anular el llamado' }) });
    } finally {
      setOcupado(false);
    }
  };

  if (error) {
    return <FalloDeCarga error={error} queEs="los llamados de atención" onReintentar={cargar} />;
  }

  const aviso = datos ? avisoDeRepetidos(datos.porMotivo) : null;

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4" data-testid="llamados-de-atencion">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="text-base text-fg">Llamados de atención por convivencia</h3>
          <p className="text-sm text-fg-muted">
            Lo que anotes aquí lo tiene en cuenta Vinci cuando propone la renovación.
          </p>
        </div>
        {puedeEditar && datos?.disponible && (
          <Button type="button" variant="outline" size="sm" hideArrow onClick={() => setAbierto(true)} data-testid="registrar-llamado">
            Registrar un llamado
          </Button>
        )}
      </div>

      {!datos ? (
        // Revisión 29-10: un esqueleto con la forma de la lista, no un texto suelto.
        <div className="space-y-3" role="status" aria-label="Cargando los llamados" aria-busy="true">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : !datos.disponible ? (
        <p className="text-sm text-fg-muted" data-testid="llamados-sin-actualizacion">
          Falta una actualización de Leasefy para guardar los llamados de atención. Ya la estamos aplicando.
        </p>
      ) : datos.llamados.length === 0 ? (
        <VacioChico
          titulo="Sin llamados de atención"
          detalle="Cuando un vecino, la administración o el propietario reporte algo de convivencia, anótalo aquí."
          data-testid="llamados-vacio"
        />
      ) : (
        <>
          <p className="font-mono text-caption uppercase tracking-wide text-fg-muted" data-testid="llamados-por-motivo">
            {datos.porMotivo.map((m) => `${nombreDelMotivo(m.motivo)} · ${m.cuantos}`).join('   ')}
          </p>
          <Presence show={!!aviso} initial={false} distance="xs">
            <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-fg" role="status" data-testid="llamados-aviso">
              {aviso}
            </p>
          </Presence>
          <ul className="divide-y divide-border">
            {datos.llamados.map((l) => {
              const quien = nombreDeQuien(l.loReporto);
              return (
                <li key={l.id} className="py-3 space-y-1" data-testid="llamado">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-fg">
                      {nombreDelMotivo(l.motivo)}
                      <span className="text-fg-muted"> · {fechaLegible(l.fecha)}</span>
                      {quien && <span className="text-fg-muted"> · lo reportó {quien.toLowerCase()}</span>}
                    </p>
                    {puedeEditar && anulando !== l.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        hideArrow
                        onClick={() => {
                          setAnulando(l.id);
                          setMotivoDeAnulacion('');
                        }}
                      >
                        Anular
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-fg-muted whitespace-pre-line break-words">{l.quePaso}</p>
                  {l.registradoPor && <p className="text-caption text-fg-muted">Lo anotó {l.registradoPor}.</p>}
                  <Presence show={anulando === l.id} initial={false} distance="xs">
                    {/* Sin caja dentro de la tarjeta: una línea a la izquierda agrupa el motivo con su llamado. */}
                    <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                      <Label htmlFor={`anular-${l.id}`}>¿Por qué lo anulas?</Label>
                      <Textarea
                        id={`anular-${l.id}`}
                        rows={2}
                        value={motivoDeAnulacion}
                        onChange={(e) => setMotivoDeAnulacion(e.target.value)}
                        placeholder="Ej.: lo anotamos en el contrato equivocado."
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          hideArrow
                          disabled={ocupado || motivoDeAnulacion.trim().length < LARGO_MINIMO_DEL_MOTIVO_DE_ANULACION}
                          onClick={() => void anular(l.id)}
                        >
                          Anular el llamado
                        </Button>
                        <Button type="button" variant="ghost" size="sm" hideArrow disabled={ocupado} onClick={() => setAnulando(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Presence>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <CajonDelLlamado
        abierto={abierto}
        contractId={contractId}
        onCerrar={() => setAbierto(false)}
        onRegistrado={() => {
          setAbierto(false);
          void cargar();
        }}
      />
    </section>
  );
}

function CajonDelLlamado({
  abierto,
  contractId,
  onCerrar,
  onRegistrado,
}: {
  abierto: boolean;
  contractId: string;
  onCerrar: () => void;
  onRegistrado: () => void;
}) {
  const [llamado, setLlamado] = useState<LlamadoPorRegistrar>(vacio);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setLlamado(vacio());
      setIntento(false);
    }
  }, [abierto]);

  const errores = erroresDelLlamado(llamado);
  const visibles = intento ? errores : {};

  const registrar = async () => {
    setIntento(true);
    if (Object.keys(errores).length > 0 || !llamado.motivo) return;
    setGuardando(true);
    try {
      await convivenciaApi.registrar(contractId, {
        motivo: llamado.motivo,
        fecha: llamado.fecha,
        quePaso: llamado.quePaso.trim(),
        loReporto: llamado.loReporto,
      });
      toast.success('Llamado de atención registrado.', { description: 'Vinci lo tendrá en cuenta en la renovación.' });
      onRegistrado();
    } catch (e) {
      toast.error('No se pudo registrar el llamado.', { description: mensajeParaLaPersona(e, { accion: 'registrar el llamado' }) });
    } finally {
      setGuardando(false);
    }
  };

  const elegir = <K extends keyof LlamadoPorRegistrar>(campo: K, valor: LlamadoPorRegistrar[K]) =>
    setLlamado((l) => ({ ...l, [campo]: valor }));

  return (
    <Cajon abierto={abierto} onOpenChange={(o) => !o && onCerrar()} data-testid="cajon-del-llamado">
      <CajonCabecera
        titulo="Registrar un llamado de atención"
        descripcion="Por convivencia: lo que pasó, cuándo y quién lo reportó."
      />
      <CajonCuerpo className="space-y-5">
        <div className="space-y-2">
          <Label id="llamado-motivo" required>
            ¿Por qué fue?
          </Label>
          {/* Revisión 29-10 con datos: con `secondary`/`outline` el elegido no se distinguía de los demás. */}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="llamado-motivo" aria-describedby="llamado-motivo-error">
            {MOTIVOS.map((m) => (
              <Chip
                key={m.valor}
                role="radio"
                aria-checked={llamado.motivo === m.valor}
                selected={llamado.motivo === m.valor}
                className="h-9 px-3.5"
                onClick={() => elegir('motivo', m.valor as MotivoDeConvivencia)}
                data-testid={`llamado-motivo-${m.valor}`}
              >
                {m.nombre}
              </Chip>
            ))}
          </div>
          <ErrorDelCampo id="llamado-motivo-error" mensaje={visibles.motivo} />
        </div>

        <div className="space-y-2 sm:max-w-xs">
          <Label htmlFor="llamado-fecha" required>
            ¿Cuándo pasó?
          </Label>
          <CampoDeDia id="llamado-fecha" value={llamado.fecha} onChange={(v) => elegir('fecha', v)} max={hoyEnColombia()} />
          <ErrorDelCampo id="llamado-fecha-error" mensaje={visibles.fecha} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="llamado-que-paso" required>
            ¿Qué pasó?
          </Label>
          <Textarea
            id="llamado-que-paso"
            rows={4}
            value={llamado.quePaso}
            aria-required="true"
            aria-invalid={!!visibles.quePaso || undefined}
            aria-describedby="llamado-que-paso-error"
            onChange={(e) => elegir('quePaso', e.target.value)}
            placeholder="Ej.: la administración reporta música alta hasta las 3 a. m. el sábado."
            data-testid="llamado-que-paso"
          />
          <ErrorDelCampo id="llamado-que-paso-error" mensaje={visibles.quePaso} />
        </div>

        <div className="space-y-2">
          <Label id="llamado-quien">¿Quién lo reportó? (opcional)</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="llamado-quien">
            {QUIENES.map((q) => (
              <Chip
                key={q.valor}
                role="radio"
                aria-checked={llamado.loReporto === q.valor}
                selected={llamado.loReporto === q.valor}
                className="h-9 px-3.5"
                onClick={() => elegir('loReporto', llamado.loReporto === q.valor ? null : (q.valor as QuienLoReporto))}
                data-testid={`llamado-quien-${q.valor}`}
              >
                {q.nombre}
              </Chip>
            ))}
          </div>
        </div>
      </CajonCuerpo>
      <CajonPie ayuda="Un llamado anotado por error se puede anular después; deja de contar.">
        <Button type="button" variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="button" hideArrow onClick={() => void registrar()} isLoading={guardando} disabled={guardando} data-testid="guardar-llamado">
          Registrar el llamado
        </Button>
      </CajonPie>
    </Cajon>
  );
}

export default LlamadosDeAtencion;
