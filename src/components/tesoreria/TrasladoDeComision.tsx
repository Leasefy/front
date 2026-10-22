'use client';

/**
 * EL TRASLADO DE LA COMISIÓN A LA CUENTA PROPIA.
 *
 * Nico (17-09): «al cerrar la liquidación el sistema PROPONE el traslado de la
 * comisión (y de los intereses propios) de la cuenta de recaudo a la cuenta
 * propia, con su comprobante, para que el cuadre de plata de terceros dé cero».
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Trasladar con un clic.** Cada propuesta muestra su DESGLOSE —renglón por
 *    renglón, con el porqué de cada uno— antes del botón. Aprobar mueve plata de
 *    una cuenta a otra y genera un comprobante: quien aprueba tiene que poder
 *    decirle al contador de dónde sale cada peso.
 * 2. **Calcular nada.** El desglose y el total los arma el back
 *    (`tesoreria/traslado/traslado-de-la-comision.ts`). Acá se pinta.
 * 3. **Esconder lo que NO se traslada.** Las retenciones que el propietario le
 *    practicó sobre la comisión salen como un renglón NEGATIVO, con su
 *    explicación: esa plata la inmobiliaria no la recibió.
 */

import { nombreDelMes } from '@/lib/recaudo/meses';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ArrowsLeftRight, CheckCircle, Prohibit, XCircle } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, Cifra, SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type {
  ListaDeTraslados,
  PropuestaDeTraslado,
  Traslado,
} from '@/lib/api/tesoreria.types';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { plataPareja } from '@/lib/format';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';

/** `YYYY-MM` del mes pasado en Bogotá: el que normalmente se acaba de liquidar. */
function mesAnterior(): string {
  const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

/** El estado en palabras (22-10: se pintaba «PROPUESTO», el código del back). */
const NOMBRE_DEL_ESTADO: Record<string, string> = {
  PROPUESTO: 'Por aprobar',
  APROBADO: 'Trasladado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

const TONO_DEL_ESTADO: Record<Traslado['estado'], 'success' | 'warning' | 'outline' | 'destructive'> = {
  PROPUESTO: 'warning',
  APROBADO: 'success',
  RECHAZADO: 'outline',
  ANULADO: 'destructive',
};

export function TrasladoDeComisionPanel() {
  const [periodo, setPeriodo] = useState(mesAnterior);
  const yaSeMovioAlPendiente = useRef(false);
  const [lista, setLista] = useState<ListaDeTraslados | null>(null);
  const [propuesta, setPropuesta] = useState<PropuestaDeTraslado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [rechazando, setRechazando] = useState<Traslado | null>(null);
  const [motivo, setMotivo] = useState('');
  /** El error del motivo del rechazo que mandó el back (`campos[].motivo`). */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const [l, p] = await Promise.all([
        tesoreriaApi.listarTraslados(),
        tesoreriaApi.propuestaDeTraslado(periodo),
      ]);
      setLista(l);
      setPropuesta(p);
      // 22-10 (revisión): con un traslado esperando aprobación, la pantalla se abre en SU
      // mes (una vez): lo que hay que decidir va primero, no el cálculo de otro mes.
      const pendiente = l.propuestos.find((t) => /^\d{4}-\d{2}$/.test(t.periodo));
      if (pendiente && !yaSeMovioAlPendiente.current && pendiente.periodo !== periodo) {
        yaSeMovioAlPendiente.current = true;
        setPeriodo(pendiente.periodo);
      }
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const proponer = async () => {
    setTrabajando(true);
    try {
      const r = await tesoreriaApi.proponerTraslado(periodo);
      if (r.traslado) {
        toast.success(
          `Traslado de ${formatCurrency(r.traslado.totalCop)} propuesto. Espera tu aprobación.`,
        );
      } else {
        toast.info(r.propuesta.avisos[0] ?? 'No hay nada que trasladar en este período.');
      }
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo proponer el traslado.',
          accion: 'proponer el traslado',
        }),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const aprobar = async (t: Traslado) => {
    setTrabajando(true);
    try {
      const r = await tesoreriaApi.aprobarTraslado(t.id);
      toast.success(
        `Traslado aprobado con el comprobante ${r.traslado.comprobanteNumero}. El cuadre de terceros ya lo descuenta.`,
      );
      for (const aviso of r.avisos) toast.warning(aviso);
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo aprobar el traslado.',
          accion: 'aprobar el traslado',
        }),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const rechazar = async () => {
    if (!rechazando) return;
    setTrabajando(true);
    setErrorDelMotivo(null);
    try {
      await tesoreriaApi.rechazarTraslado(rechazando.id, motivo);
      toast.success('Traslado rechazado. La comisión se queda en la cuenta de recaudo.');
      setRechazando(null);
      setMotivo('');
      await cargar();
    } catch (error) {
      // Un 400 del motivo va debajo del motivo; lo demás, al aviso.
      const { porCampo, sueltos } = repartirErroresDelServidor(error, {
        campos: ['motivo'] as const,
        porDefecto: 'No se pudo rechazar el traslado.',
        accion: 'rechazar el traslado',
      });
      if (porCampo.motivo) {
        setErrorDelMotivo(porCampo.motivo);
        document.getElementById('motivo-del-rechazo')?.focus();
      }
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="space-y-8">
      <EstadoDeDatos
        cargando={cargando}
        error={fallo}
        queEs="los traslados de comisión"
        onReintentar={cargar}
        conservarContenido
      >
        {propuesta && !propuesta.disponible ? (
          <SinLaMigracion
            motivo={propuesta.avisos.find((a) => a.includes('migración')) ?? null}
            queSeEspera="proponer ni aprobar el traslado (el cálculo sí se puede ver)"
            testId="traslado-sin-migracion"
          />
        ) : null}

        {/* GLOW UP (21-10): primero lo que espera una decisión; después, proponer lo nuevo. */}
        {lista?.propuestos.length ? (
          <section className="space-y-4">
            <TituloDeBloque
              titulo="Esperando tu aprobación"
              explicacion="Los propuso el sistema al quedar pagado un lote de liquidación, o alguien desde acá. Aprobar mueve la plata y le pone comprobante: no sale solo."
            />
            <ul className="space-y-4" data-testid="traslados-propuestos">
              {lista.propuestos.map((t) => (
                <li
                  key={t.id}
                  className="space-y-3 rounded-lg border border-warning/40 bg-surface p-5"
                  data-testid={`traslado-${t.id}`}
                >
                  <FilaDelTraslado traslado={t} />
                  <div className="flex flex-wrap gap-2">
                    {/* 22-10 (revisión): aprobarlo es LA acción de la pantalla → la azul. */}
                    <Button
                      onClick={() => void aprobar(t)}
                      disabled={trabajando}
                      data-testid={`aprobar-${t.id}`}
                    >
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Aprobar y trasladar {formatCurrency(t.totalCop)}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRechazando(t);
                        setMotivo('');
                        setErrorDelMotivo(null);
                      }}
                      disabled={trabajando}
                      data-testid={`rechazar-${t.id}`}
                    >
                      <Prohibit className="h-4 w-4" aria-hidden="true" />
                      Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-4">
          {/* 🔴 Dos arreglos del 21-09, los dos por lo mismo.
              · La explicación de este bloque decía LA MISMA FRASE que el
                párrafo de la pantalla («mientras no los muevas… el cuadre de
                plata de terceros va a mostrar esa diferencia»), cinco renglones
                más abajo. El porqué se fue a un solo lugar —el botón del
                encabezado— y acá queda el título y el mes.
              · El mes era un `<input type="month">`, que pinta el nombre del mes
                EN EL IDIOMA DEL NAVEGADOR: decía «August 2026» en una pantalla
                entera en español. Ahora es `SelectorDeMes`, el de la casa, que
                dice «Agosto de 2026» y no deja pasar de hoy. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg">Qué habría que trasladar</h2>
            <SelectorDeMes
              mes={periodo}
              onCambiar={setPeriodo}
              testId="periodo-del-traslado"
            />
          </div>

          {propuesta ? <Propuesta propuesta={propuesta} /> : null}

          {/* Revisión de Dinero (22-10): con un traslado ya propuesto, la tarea es aprobarlo (arriba);
              proponer otro competía como segunda acción principal. */}
          {propuesta?.hayQueTrasladar && propuesta.disponible && !(lista?.propuestos.length) ? (
            <Button
              onClick={() => void proponer()}
              disabled={trabajando}
              data-testid="proponer-traslado"
            >
              <ArrowsLeftRight className="h-4 w-4" aria-hidden="true" />
              Proponer el traslado de {formatCurrency(propuesta.totalCop)}
            </Button>
          ) : null}
        </section>


        {lista?.recientes.length ? (
          <section className="space-y-4">
            <TituloDeBloque
              titulo="Los últimos traslados"
              explicacion="Con su comprobante. Un traslado aprobado no se borra: si estuvo mal, se corrige con otro movimiento."
            />
            <ul className="space-y-3" data-testid="traslados-recientes">
              {lista.recientes.map((t) => (
                <li key={t.id} className="rounded-lg border border-border bg-surface p-4">
                  <FilaDelTraslado traslado={t} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </EstadoDeDatos>

      <Dialog open={rechazando !== null} onOpenChange={(v) => !v && setRechazando(null)}>
        {/* Destructiva: rechazar (no anular) → `XCircle` en el medallón. */}
        <DialogContent
          variant="destructive"
          icon={<XCircle weight="bold" />}
          data-testid="dialogo-rechazar-traslado"
        >
          <DialogHeader>
            <DialogTitle>
              Rechazar el traslado
              {rechazando ? (
                <>
                  {' '}de <span className="tabular-nums">{formatCurrency(rechazando.totalCop)}</span>
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              La comisión se queda en la cuenta de recaudo y el cuadre de plata de terceros va a
              seguir mostrando esa diferencia. El traslado queda como rechazado, no se borra, y esa
              plata vuelve a quedar por trasladar: se puede proponer otro desde acá. Deja escrito
              por qué.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Textarea
              id="motivo-del-rechazo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorDelMotivo(null);
              }}
              placeholder="Se traslada junto con la comisión de octubre."
              maxLength={300}
              aria-label="Por qué se rechaza"
              aria-invalid={errorDelMotivo ? true : undefined}
              aria-describedby={errorDelMotivo ? 'motivo-del-rechazo-error' : undefined}
              data-testid="motivo-del-rechazo"
            />
            <ErrorDelCampo id="motivo-del-rechazo-error" mensaje={errorDelMotivo} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => setRechazando(null)}
              disabled={trabajando}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              hideArrow
              onClick={() => void rechazar()}
              disabled={trabajando || motivo.trim().length === 0}
              isLoading={trabajando}
              data-testid="confirmar-rechazo"
            >
              Rechazar el traslado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Propuesta({ propuesta }: { propuesta: PropuestaDeTraslado }) {
  // Los mismos decimales en la franja y en los renglones (revisión 22-10).
  const plata = plataPareja([propuesta.totalCop, propuesta.comisionCop, propuesta.yaTrasladadoCop, ...propuesta.renglones.map((r) => r.valorCop)]);
  return (
    <div className="space-y-4">
      <Avisos avisos={propuesta.avisos} testId="avisos-de-la-propuesta" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Cifra
          id="total-del-traslado"
          formato={plata}
          etiqueta="Total a trasladar"
          valor={propuesta.totalCop}
          definicion="De la cuenta de recaudo a tu cuenta propia. Cuando salga del banco, el cuadre de plata de terceros da cero."
          tono={propuesta.hayQueTrasladar ? 'success' : undefined}
        />
        <Cifra
          id="comision-causada"
          formato={plata}
          etiqueta="Comisión causada"
          valor={propuesta.comisionCop}
          definicion="La comisión de administración del mes, según las cuotas del lado propietario. Se causa al liquidar, haya pagado o no el inquilino."
        />
        <Cifra
          id="ya-trasladado"
          formato={plata}
          etiqueta="Ya propuesto o trasladado"
          valor={propuesta.yaTrasladadoCop}
          definicion="Lo que ya está en un traslado propuesto o aprobado de este mes. Se resta para no sacar dos veces la misma plata."
        />
      </div>

      {propuesta.renglones.length > 0 ? (
        // 22-10 (revisión de Dinero: «tabla rota a 390»): renglón por renglón como un
        // recibo —el concepto y su porqué a la izquierda, la cifra a la derecha—.
        <section className="space-y-2">
          <p className="text-caption text-fg-muted">Renglón por renglón, con el porqué de cada uno. Es lo que lee quien aprueba.</p>
          <ol className="rounded-2xl border border-border bg-surface px-5 py-1 sm:px-6" data-testid="renglones-del-traslado">
            {propuesta.renglones.map((r) => (
              <li
                key={r.concepto}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-t border-border-faint py-3 first:border-t-0 dark:border-border-strong"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-body-sm text-fg">{r.concepto}</p>
                  <p className="text-caption leading-relaxed text-fg-muted">{r.porQue}</p>
                </div>
                <p className={`shrink-0 font-mono text-body-sm tabular-nums ${r.valorCop < 0 ? 'text-warning-ink' : 'text-fg'}`}>
                  {r.valorCop === 0 ? '—' : r.valorCop < 0 ? `− ${plata(Math.abs(r.valorCop))}` : plata(r.valorCop)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function FilaDelTraslado({ traslado }: { traslado: Traslado }) {
  // Los mismos decimales en toda la tarjeta (revisión 22-10).
  const plata = plataPareja([traslado.totalCop, traslado.comisionCop, traslado.ivaComisionCop, traslado.interesesCop + traslado.gastosDeCobranzaCop, traslado.retencionesComisionCop]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-lg tabular-nums text-fg">
            {plata(traslado.totalCop)}
          </p>
          <p className="text-sm text-fg-muted">
            {/^\d{4}-\d{2}$/.test(traslado.periodo) ? nombreDelMes(traslado.periodo) : traslado.periodo} ·{' '}
            {traslado.origen === 'LOTE'
              ? 'lo propuso el sistema al cerrar la liquidación'
              : 'propuesto a mano'}
            {traslado.comprobanteNumero !== null
              ? ` · comprobante ${traslado.comprobanteNumero}`
              : ''}
            {traslado.fecha ? ` · ${fechaCorta(traslado.fecha)}` : ''}
          </p>
        </div>
        <Badge variant={TONO_DEL_ESTADO[traslado.estado]}>{NOMBRE_DEL_ESTADO[traslado.estado] ?? traslado.estado}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs text-fg-muted sm:grid-cols-4">
        <div>
          <dt className="text-fg">Comisión</dt>
          <dd className="font-mono tabular-nums">{plata(traslado.comisionCop)}</dd>
        </div>
        <div>
          <dt className="text-fg">IVA</dt>
          <dd className="font-mono tabular-nums">{plata(traslado.ivaComisionCop)}</dd>
        </div>
        <div>
          <dt className="text-fg">Intereses y gastos</dt>
          <dd className="font-mono tabular-nums">
            {traslado.interesesCop + traslado.gastosDeCobranzaCop === 0 ? '—' : plata(traslado.interesesCop + traslado.gastosDeCobranzaCop)}
          </dd>
        </div>
        <div>
          <dt className="text-fg">Retenciones</dt>
          <dd className="font-mono tabular-nums">
            {traslado.retencionesComisionCop === 0 ? '—' : `− ${plata(traslado.retencionesComisionCop)}`}
          </dd>
        </div>
      </dl>
      {traslado.motivo ? (
        <p className="text-xs text-fg-muted">Motivo: {traslado.motivo}</p>
      ) : null}
      {traslado.estado === 'APROBADO' && traslado.asientoId === null ? (
        <p className="text-xs text-warning">
          Quedó aprobado SIN asiento contable: falta decir cuál cuenta del PUC es la de recaudo y
          cuál la propia, en la configuración de tesorería.
        </p>
      ) : null}
    </div>
  );
}
