'use client';

/**
 * La Calificación Leasefy en el panel (Nico, 18-10-2026):
 *   · «Buscar»: la calificación de una persona por su documento. Aparece quien
 *     autorizó compartirla (con todo su historial en Leasefy) o quien tuvo
 *     contrato con esta inmobiliaria (sólo lo de aquí). Cada consulta queda
 *     registrada y la persona la ve.
 *   · «Contratos terminados»: la evaluación de fin de contrato, con preguntas
 *     fijas; el inquilino puede responder.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Handshake } from '@phosphor-icons/react';
import { CrossFade, Presence, SearchInput, Stagger, StaggerItem } from '@leasefy/cadence';
import { toast } from 'sonner';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInputNumerico } from '@/components/ui/money-input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePagination } from '@/components/ui/pagination';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { normalizarParaBuscar } from '@/lib/inmuebles/buscar-en-el-portafolio';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { TarjetaDeCalificacion } from '@/components/calificacion/TarjetaDeCalificacion';
import {
  calificacionLeasefyApi,
  type ContratoPorEvaluar,
  type PreguntaDeFin,
  type ResultadoDeLaBusqueda,
} from '@/lib/api/calificacion-leasefy.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useLocaleDeFechas, useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

function Buscar() {
  const tr = useTr();
  const [documento, setDocumento] = useState('');
  const [canon, setCanon] = useState<number>(Number.NaN);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeLaBusqueda | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBuscando(true);
    setError(null);
    try {
      setResultado(
        await calificacionLeasefyApi.buscar(documento.trim(), Number.isFinite(canon) && canon > 0 ? canon : undefined),
      );
    } catch (err) {
      setResultado(null);
      setError(mensajeParaLaPersona(err, { porDefecto: tr('No se pudo buscar la calificación.'), accion: 'buscar la calificación' }));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={buscar} className="rounded-lg border border-border bg-surface p-6 dark:border-border-strong">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="cal-documento">{tr('Documento de la persona')}</Label>
            <Input id="cal-documento" value={documento} onChange={(x) => setDocumento(x.target.value)} inputMode="numeric" placeholder="1026150802" maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-canon">{tr('Canon que estudias (opcional)')}</Label>
            <MoneyInputNumerico id="cal-canon" value={canon} onChange={setCanon} />
          </div>
          <Button type="submit" hideArrow disabled={documento.trim().length < 5 || buscando}>
            <MagnifyingGlass className="mr-2 h-4 w-4" aria-hidden />
            {buscando ? tr('Buscando…') : tr('Buscar')}
          </Button>
        </div>
        <p className="mt-3 text-xs text-fg-subtle">
          {tr('La persona verá que tu inmobiliaria consultó su calificación. Sólo aparece quien autorizó compartirla o quien tuvo contrato con ustedes.')}
        </p>
      </form>

      <Presence show={!!error}>
        <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      </Presence>

      <CrossFade swapKey={resultado ? `r-${resultado.resultados.length}-${resultado.resultados[0]?.persona.userId ?? ''}` : 'vacio'}>
        {resultado && (
          resultado.resultados.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-fg-muted dark:border-border-strong">
              {tr(resultado.mensaje ?? 'No encontramos a nadie con ese documento.')}
            </p>
          ) : (
            <Stagger className="space-y-4">
              {/* Varias cuentas con el mismo documento (una persona con dos cuentas, o alguien que escribió
                  la cédula de otro en su perfil): cada una se califica con lo SUYO; el nombre dice cuál es. */}
              {resultado.resultados.length > 1 && (
                <StaggerItem>
                  <p className="rounded-md bg-warning-soft px-4 py-3 text-sm text-fg" data-testid="varias-cuentas">
                    {tr('Hay {n} cuentas en Leasefy con este documento. Cada una tiene su propio historial: revisa el nombre para saber cuál es la persona que estudias.', { n: resultado.resultados.length })}
                  </p>
                </StaggerItem>
              )}
              {resultado.resultados.map((r) => (
                <StaggerItem key={r.persona.userId}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-fg">
                        <span className="text-fg-muted">{tr('Cuenta de:')}</span> <span className="font-medium">{r.persona.nombre}</span>
                      </p>
                      <p className="text-xs text-fg-muted">
                        {r.alcance === 'TODO_LEASEFY'
                          ? r.historial.inmobiliarias === 1
                            ? tr('Con todo su historial en Leasefy (1 inmobiliaria)')
                            : tr('Con todo su historial en Leasefy ({n} inmobiliarias)', { n: r.historial.inmobiliarias })
                          : tr('Sólo lo que pasó con tu inmobiliaria: no autorizó compartirla')}
                      </p>
                    </div>
                    <TarjetaDeCalificacion calificacion={r.calificacion} />
                    <p className="text-xs text-fg-subtle">
                      {r.historial.porcentajeATiempo !== null
                        ? `${
                            r.historial.cuotasContadas === 1
                              ? tr('{p} % de 1 cuota a tiempo', { p: r.historial.porcentajeATiempo })
                              : tr('{p} % de {c} cuotas a tiempo', {
                                  p: r.historial.porcentajeATiempo,
                                  c: r.historial.cuotasContadas,
                                })
                          } · ${
                            r.historial.contratosTerminados === 1
                              ? tr('1 contrato terminado, {b} sin deuda', { b: r.historial.terminaronSinDeuda })
                              : tr('{t} contratos terminados, {b} sin deuda', {
                                  t: r.historial.contratosTerminados,
                                  b: r.historial.terminaronSinDeuda,
                                })
                          }`
                        : tr('Sin cuotas para medir la puntualidad.')}
                      {' · '}
                      {r.documentos.tieneEstudioVigente ? tr('Con estudio de documentos de los últimos 6 meses') : tr('Sin estudio de documentos reciente')}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )
        )}
      </CrossFade>
    </div>
  );
}

/**
 * «Contratos terminados»: los del último año sin evaluación, con buscador y
 * paginados (en Portofino son 350). Evaluar pide `contratos:edit`: quien sólo
 * ve contratos (consulta, coordinación) ve la lista sin el botón.
 */
function Evaluar({ puedeEvaluar }: { puedeEvaluar: boolean }) {
  const tr = useTr();
  const localeFechas = useLocaleDeFechas();
  const [contratos, setContratos] = useState<ContratoPorEvaluar[] | null>(null);
  const [disponible, setDisponible] = useState(true);
  const [preguntas, setPreguntas] = useState<PreguntaDeFin[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [abierto, setAbierto] = useState<ContratoPorEvaluar | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Cada palabra por separado, sin tildes: «ramirez lucia» encuentra a «Ramírez Ocampo Lucía».
  const filtrados = useMemo(() => {
    const palabras = normalizarParaBuscar(busqueda).split(/\s+/).filter(Boolean);
    if (!contratos || palabras.length === 0) return contratos ?? [];
    return contratos.filter((k) => {
      const t = normalizarParaBuscar(`${k.inquilino ?? ''} ${k.direccion ?? ''}`);
      return palabras.every((p) => t.includes(p));
    });
  }, [contratos, busqueda]);
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } = useTablePagination(filtrados, {
    resetKey: busqueda.trim(),
  });

  const cargar = useCallback(() => {
    Promise.all([calificacionLeasefyApi.porEvaluar(), calificacionLeasefyApi.preguntas()])
      .then(([p, q]) => {
        setContratos(p.contratos);
        setDisponible(p.disponible);
        setPreguntas(q.preguntas);
        setError(null);
      })
      .catch(setError);
  }, []);
  useEffect(cargar, [cargar]);

  const completas = preguntas.every((p) => respuestas[p.clave]);
  const guardar = async () => {
    if (!abierto) return;
    setGuardando(true);
    try {
      await calificacionLeasefyApi.evaluar(abierto.contractId, respuestas, nota);
      toast.success(tr('Evaluación guardada. El inquilino la verá y podrá responder.'));
      setAbierto(null);
      cargar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo guardar la evaluación.'), accion: 'guardar la evaluación' }));
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <FalloDeCarga error={error} queEs={tr('los contratos por evaluar')} onReintentar={cargar} />;
  if (!disponible) return <p className="text-sm text-fg-muted">{tr('Esta parte todavía no está disponible.')}</p>;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-fg-muted">
        {tr('Contratos que terminaron en el último año y todavía no tienen evaluación. Cuenta para el historial de la persona en todo Leasefy.')}
        {!puedeEvaluar && ` ${tr('Para evaluarlos hace falta poder editar contratos.')}`}
      </p>
      {contratos === null ? null : contratos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-fg-muted dark:border-border-strong">
          <Handshake className="h-4 w-4" aria-hidden />
          {tr('No hay contratos terminados por evaluar.')}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="w-full sm:max-w-md sm:flex-1">
              <label htmlFor="cal-buscar-contrato" className="sr-only">
                {tr('Buscar por inquilino o dirección')}
              </label>
              <SearchInput
                id="cal-buscar-contrato"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onClear={() => setBusqueda('')}
                placeholder={tr('Buscar por inquilino o dirección')}
                inputSize="sm"
                className="w-full"
              />
            </div>
            <span className="whitespace-nowrap text-xs font-medium tabular-nums text-fg-muted">
              {filtrados.length === 1 ? tr('1 contrato') : tr('{n} contratos', { n: filtrados.length })}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-surface dark:border-border-strong">
            {filtrados.length === 0 ? (
              <p className="px-5 py-6 text-sm text-fg-muted">{tr('Ningún contrato coincide con la búsqueda.')}</p>
            ) : (
              <div className="divide-y divide-border dark:divide-border-strong">
                {pageItems.map((k) => (
                  <div key={k.contractId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{k.inquilino ?? tr('Sin nombre')}</p>
                      <p className="truncate text-xs text-fg-muted">{k.direccion ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs tabular-nums text-fg-muted">
                        {k.terminoEl ? new Date(`${k.terminoEl}T12:00:00`).toLocaleDateString(localeFechas) : '—'}
                      </span>
                      {puedeEvaluar && (
                        <Button size="sm" variant="outline" hideArrow onClick={() => { setAbierto(k); setRespuestas({}); setNota(''); }}>
                          {tr('Evaluar')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {shouldPaginate && (
              <div className="border-t border-border px-4 py-3 dark:border-border-strong">
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Cajon abierto={!!abierto} onOpenChange={(v) => !v && setAbierto(null)}>
        <CajonCabecera titulo={tr('Evaluar el fin del contrato')} descripcion={abierto ? `${abierto.inquilino ?? ''} · ${abierto.direccion ?? ''}` : undefined} />
        <CajonCuerpo>
          <div className="space-y-5">
            {preguntas.map((p) => (
              <fieldset key={p.clave} className="space-y-2">
                <legend className="text-sm font-medium text-fg">{tr(p.texto)}</legend>
                <div className="flex flex-wrap gap-2">
                  {p.opciones.map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => setRespuestas((r) => ({ ...r, [p.clave]: o.valor }))}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        respuestas[p.clave] === o.valor
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border text-fg hover:bg-surface-hover dark:border-border-strong',
                      )}
                      aria-pressed={respuestas[p.clave] === o.valor}
                    >
                      {tr(o.texto)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="cal-nota">{tr('Nota (opcional)')}</Label>
              <Textarea id="cal-nota" value={nota} onChange={(x) => setNota(x.target.value)} maxLength={1000} rows={3} />
            </div>
          </div>
        </CajonCuerpo>
        <CajonPie ayuda={completas ? tr('El inquilino podrá responder una vez; su respuesta se muestra al lado.') : tr('Responde las cuatro preguntas.')}>
          <Button variant="ghost" hideArrow onClick={() => setAbierto(null)}>{tr('Cancelar')}</Button>
          <Button hideArrow disabled={!completas || guardando} onClick={guardar}>{tr('Guardar evaluación')}</Button>
        </CajonPie>
      </Cajon>
    </div>
  );
}

export default function CalificacionLeasefyPanelPage() {
  const tr = useTr();
  const { canAccess } = usePermissionsContext();
  const [pestana, setPestana] = useState<'buscar' | 'evaluar'>('buscar');
  // Los contratos terminados piden `contratos:view` (el asesor comercial no lo tiene): sin él, sólo buscar.
  const veContratos = canAccess('contratos', 'view');
  const puedeEvaluar = canAccess('contratos', 'edit');
  return (
    <PageGuard module="portafolio">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1">
          <h1 className="text-h2 text-fg">{tr('Calificación Leasefy')}</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            {tr('Cómo le ha ido a una persona arrendando en Leasefy, más sus documentos: si se le arrienda fácil, con condiciones o no, y hasta qué canon.')}
          </p>
        </header>
        {veContratos && (
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as 'buscar' | 'evaluar')}>
            <TabsList>
              <TabsTrigger value="buscar">{tr('Buscar a una persona')}</TabsTrigger>
              <TabsTrigger value="evaluar">{tr('Contratos terminados')}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <CrossFade swapKey={veContratos ? pestana : 'buscar'}>
          {veContratos && pestana === 'evaluar' ? <Evaluar puedeEvaluar={puedeEvaluar} /> : <Buscar />}
        </CrossFade>
      </motion.div>
    </PageGuard>
  );
}
