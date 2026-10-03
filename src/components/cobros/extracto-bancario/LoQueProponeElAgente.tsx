'use client';

/**
 * 🔴 EL CAJÓN DEL MOVIMIENTO: LO QUE PROPONE EL AGENTE (seguimiento 6,
 * pendiente técnico: «el cajón del front no muestra "por el alias" ni las
 * salidas del agente»).
 *
 * Un botón en cada línea pendiente abre un cajón con lo que el agente de
 * conciliación propone para ESA línea (`GET …/agente` del micro), con sus
 * frases y su porqué:
 *   · «Por el alias» cuando la propuesta vino del texto del pago que ya se
 *     confirmó (Nico, P8: el agente aprende en silencio), con cuántas veces lo
 *     confirmó una persona y cuántas el Piloto;
 *   · en una SALIDA, las salidas que propone (el 4×1000, la comisión, el giro):
 *     el gasto del banco se concilia desde aquí por la ruta del back; un giro o
 *     un egreso se concilia en la fila (allí el back verifica el pago);
 *   · «No es esta» para que no lo vuelva a proponer, y «No es esta persona»
 *     cuando vino del alias (lo bloquea).
 *
 * Se lee SÓLO al abrir (con el modelo prendido, cada lectura cuesta). Conciliar
 * va por las rutas del back de siempre, que vuelven a verificar todo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Robot, Warning, X } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import { salidasDelExtractoApi, NOMBRE_DEL_GASTO } from '@/lib/api/salidas-del-extracto';
import {
  claseDelGastoDelBanco,
  leerLoQuePropone,
  rechazarLoQuePropone,
  vinoDelAlias,
  type LecturaDelAgente,
  type PropuestaDelAgente,
} from '@/lib/api/agente-de-conciliacion';
import { useAparecer } from './cuentas-del-extracto';
import { diaLegible, plata } from './formato';

const NOMBRE_DEL_PORQUE: Record<PropuestaDelAgente['porQue'][number]['tipo'], string> = {
  alias: 'Alias',
  grafo: 'Memoria',
  back: 'Verificado',
  regla: 'Regla',
  libro: 'Libro',
  valor: 'Valor',
};

/** «Lo confirmaron 3 personas y el Piloto 1 vez». */
export function fraseDelAlias(a: NonNullable<PropuestaDelAgente['alias']>): string {
  const personas = a.personas === 1 ? '1 persona' : `${a.personas} personas`;
  const piloto = a.piloto > 0 ? ` y el Piloto ${a.piloto === 1 ? '1 vez' : `${a.piloto} veces`}` : '';
  return `«${a.muestra}» ya se confirmó: lo confirmaron ${personas}${piloto}.`;
}

export function LoQueProponeElAgente({
  movimiento: m,
  puedeConciliar,
  puedeEditar,
  ocupado,
  onCambio,
}: {
  movimiento: MovimientoBancario;
  puedeConciliar: boolean;
  /** «No es esta» pide lo mismo que dejar una línea fuera (`cobros:edit`). */
  puedeEditar: boolean;
  ocupado: boolean;
  onCambio: () => void;
}) {
  const aparecer = useAparecer();
  const [abierto, setAbierto] = useState(false);
  const [lectura, setLectura] = useState<LecturaDelAgente | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const control = useRef<AbortController | null>(null);

  const leer = useCallback(async () => {
    control.current?.abort();
    const c = new AbortController();
    control.current = c;
    setLectura(null);
    try {
      const r = await leerLoQuePropone(m.agencyId, m.id, c.signal);
      if (!c.signal.aborted) setLectura(r);
    } catch {
      // Se cerró el cajón a mitad de la lectura.
    }
  }, [m.agencyId, m.id]);

  useEffect(() => {
    if (abierto) void leer();
    return () => control.current?.abort();
  }, [abierto, leer]);

  const conciliar = async (p: PropuestaDelAgente) => {
    setTrabajando(p.ref);
    try {
      const clase = claseDelGastoDelBanco(p);
      if (clase) {
        await salidasDelExtractoApi.conciliar(m.id, { tipo: 'GASTO_BANCARIO', clase });
        toast.success(`Conciliada como ${NOMBRE_DEL_GASTO[clase].toLowerCase()}.`);
      } else if (p.accion?.tipo === 'conciliar_con_recibos') {
        await conciliacionBancariaApi.conciliarConRecibos(m.id, p.accion.body.reciboIds);
        toast.success('Conciliada contra esos recibos.');
      } else if (p.accion?.tipo === 'conciliar_uno') {
        await conciliacionBancariaApi.conciliar(m.id, p.accion.body);
        toast.success('Conciliada: se emitió el recibo de caja.');
      } else {
        return;
      }
      setAbierto(false);
      onCambio();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo conciliar.', accion: 'conciliar la línea' }));
    } finally {
      setTrabajando(null);
    }
  };

  const rechazar = async (p: PropuestaDelAgente, noEsLaPersona: boolean) => {
    setTrabajando(`${p.ref}:rechazo`);
    const r = await rechazarLoQuePropone(m.agencyId, m.id, p.rechazar, noEsLaPersona);
    setTrabajando(null);
    if (!r.ok) {
      toast.error(
        mensajeParaLaPersona(r.fallo, { porDefecto: 'No se pudo guardar.', accion: 'decirle al agente que no es' }),
      );
      return;
    }
    toast.success(
      noEsLaPersona
        ? 'Listo: ese texto ya no se asocia a esa persona hasta que alguien lo vuelva a confirmar.'
        : 'Listo: el agente no la vuelve a proponer para esta línea.',
    );
    void leer();
  };

  const analisis = lectura?.estado === 'listo' ? lectura.analisis : null;
  const esSalida = analisis ? analisis.sentido === 'salida' : m.valorCop < 0;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        hideArrow
        disabled={ocupado}
        onClick={() => setAbierto(true)}
        data-testid={`lo-que-propone-el-agente-${m.id}`}
      >
        <Robot className="h-4 w-4" aria-hidden="true" />
        Lo que propone el agente
      </Button>

      <Cajon abierto={abierto} onOpenChange={setAbierto} tamano="md" data-testid={`cajon-del-agente-${m.id}`}>
        <CajonCabecera
          titulo="Lo que propone el agente"
          descripcion={`Línea del ${diaLegible(m.fecha)} por ${plata(m.valorCop)}: «${m.descripcion}»`}
        />
        <CajonCuerpo className="space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            {!lectura ? (
              <motion.p
                key="leyendo"
                {...aparecer}
                className="flex items-center gap-2 text-body-sm text-fg-muted"
                data-testid="agente-leyendo"
              >
                <Spinner size="sm" /> El agente está mirando la línea…
              </motion.p>
            ) : lectura.estado === 'apagado' ? (
              <motion.p key="apagado" {...aparecer} className="text-body-sm text-fg-muted" data-testid="agente-apagado">
                El agente de conciliación no está prendido para tu inmobiliaria: pídele a quien administra el Piloto que
                lo prenda. Mientras tanto, las propuestas del extracto siguen en la fila.
              </motion.p>
            ) : lectura.estado === 'no-disponible' ? (
              <motion.p
                key="no-disponible"
                {...aparecer}
                className="text-body-sm text-fg-muted"
                data-testid="agente-no-disponible"
              >
                El agente todavía no propone desde aquí. Las propuestas del extracto siguen en la fila.
              </motion.p>
            ) : lectura.estado === 'error' ? (
              <motion.div key="error" {...aparecer} className="space-y-2" data-testid="agente-error">
                <p className="text-body-sm text-danger">
                  {mensajeParaLaPersona(lectura.fallo, {
                    porDefecto: 'No se pudo ver lo que propone el agente.',
                    accion: 'ver lo que propone el agente',
                  })}
                </p>
                <Button size="sm" variant="secondary" hideArrow onClick={() => void leer()}>
                  Volver a intentar
                </Button>
              </motion.div>
            ) : (
              <motion.div key="listo" {...aparecer} className="space-y-4" data-testid="agente-listo">
                {analisis!.resumen && <p className="text-body-sm text-fg">{analisis!.resumen}</p>}
                <section className="space-y-2" aria-label={esSalida ? 'Salidas que propone el agente' : 'Lo que propone el agente'}>
                  <h3 className="text-body font-semibold text-fg">
                    {esSalida ? 'Salidas que propone el agente' : 'Lo que propone'}
                  </h3>
                  {analisis!.propuestas.length === 0 ? (
                    <p className="text-body-sm text-fg-muted" data-testid="agente-sin-propuestas">
                      El agente no encontró nada que pueda ser esta línea.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {analisis!.propuestas.map((p) => (
                        <PropuestaDelAgenteFila
                          key={p.ref}
                          p={p}
                          esSalida={esSalida}
                          puedeConciliar={puedeConciliar}
                          puedeEditar={puedeEditar}
                          trabajando={trabajando}
                          onConciliar={() => void conciliar(p)}
                          onRechazar={(noEsLaPersona) => void rechazar(p, noEsLaPersona)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
                {analisis!.descartadas.length > 0 && (
                  <details className="text-body-sm text-fg-muted">
                    <summary className="cursor-pointer">Lo que el agente descartó ({analisis!.descartadas.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {analisis!.descartadas.map((d, i) => (
                        <li key={`${d.titulo}-${i}`}>
                          <span className="text-fg">{d.titulo}</span> — {d.motivo}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CajonCuerpo>
        <CajonPie ayuda="Conciliar desde aquí pasa por las mismas verificaciones del extracto.">
          <Button variant="secondary" hideArrow onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        </CajonPie>
      </Cajon>
    </>
  );
}

function PropuestaDelAgenteFila({
  p,
  esSalida,
  puedeConciliar,
  puedeEditar,
  trabajando,
  onConciliar,
  onRechazar,
}: {
  p: PropuestaDelAgente;
  esSalida: boolean;
  puedeConciliar: boolean;
  puedeEditar: boolean;
  trabajando: string | null;
  onConciliar: () => void;
  onRechazar: (noEsLaPersona: boolean) => void;
}) {
  const delAlias = vinoDelAlias(p);
  const clase = claseDelGastoDelBanco(p);
  const sePuedeConciliarAqui = clase !== null || (!esSalida && p.accion !== null);
  return (
    <li className="space-y-2 rounded-md border border-border p-3" data-testid={`propuesta-del-agente-${p.ref}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-fg">{p.titulo}</p>
          {p.persona && <p className="text-caption text-fg-muted">{p.persona}</p>}
        </div>
        <span className="shrink-0 tabular-nums text-fg">{plata(p.sumaCop)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {delAlias && (
          <Badge variant="secondary" data-testid={`por-el-alias-${p.ref}`}>
            Por el alias
          </Badge>
        )}
        {p.calza ? (
          <Badge variant="success">Calza exacto</Badge>
        ) : (
          <Badge variant="outline">Diferencia de {plata(Math.abs(p.diferenciaCop))}</Badge>
        )}
        {p.seAplicaSola && <Badge variant="outline">El Piloto la puede conciliar solo</Badge>}
      </div>
      {delAlias && p.alias && (
        <p className="text-caption text-fg-muted" data-testid={`frase-del-alias-${p.ref}`}>
          {fraseDelAlias(p.alias)}
        </p>
      )}
      {p.frases.length > 0 && (
        <ul className="space-y-0.5 text-body-sm text-fg">
          {p.frases.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {p.porQue.length > 0 && (
        <ul className="space-y-0.5 text-caption text-fg-muted" aria-label="Por qué">
          {p.porQue.map((x, i) => (
            <li key={i}>
              <span className="font-medium text-fg">{NOMBRE_DEL_PORQUE[x.tipo]}:</span> {x.texto}
            </li>
          ))}
        </ul>
      )}
      {!p.seAplicaSola && p.porQueNoSeAplicaSola && (
        <p className="text-caption text-fg-muted">{p.porQueNoSeAplicaSola}</p>
      )}
      {p.avisos.map((a, i) => (
        <p key={i} className="flex items-start gap-1.5 text-caption text-fg">
          <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          {a}
        </p>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {sePuedeConciliarAqui ? (
          <Button
            size="sm"
            hideArrow
            disabled={!puedeConciliar || trabajando !== null}
            isLoading={trabajando === p.ref}
            onClick={onConciliar}
            data-testid={`conciliar-lo-del-agente-${p.ref}`}
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            {clase ? 'Conciliar como gasto del banco' : 'Conciliar'}
          </Button>
        ) : (
          esSalida && (
            <p className="text-caption text-fg-muted">
              Concílialo en la fila con la propuesta del extracto: allí se verifica el pago.
            </p>
          )
        )}
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          disabled={!puedeEditar || trabajando !== null}
          isLoading={trabajando === `${p.ref}:rechazo`}
          onClick={() => onRechazar(false)}
          data-testid={`no-es-esta-${p.ref}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          No es esta
        </Button>
        {delAlias && (
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            disabled={!puedeEditar || trabajando !== null}
            onClick={() => onRechazar(true)}
            data-testid={`no-es-esta-persona-${p.ref}`}
          >
            No es esta persona
          </Button>
        )}
      </div>
    </li>
  );
}
