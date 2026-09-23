'use client';

/**
 * El cajón de UN egreso: lo que dice, lo que se le puede corregir y cómo llegó
 * a decirlo.
 *
 * Nico (22-09): «deberíamos dar la posibilidad de poder entrar para modificar
 * los egresos y cambiar la fecha de egreso, porque justamente puede pasar que
 * si lo envío al banco y no llega o lo rechaza, en contabilidad no entró ese
 * día».
 *
 * ── 🔴 Cambiar la fecha MUEVE el asiento ───────────────────────────────────
 *
 * No es un dato del papel: el back reversa el asiento vigente en su día y lo
 * vuelve a causar en el nuevo. Por eso el cajón lo dice ANTES de guardar, exige
 * motivo, no deja elegir un día futuro, y después de guardar anuncia los tres
 * números de asiento — son los que el contador va a buscar en el libro.
 *
 * ── Lo que NO se puede cambiar, a propósito ────────────────────────────────
 *
 * El monto y el beneficiario de un egreso: la plata ya le llegó a alguien por
 * un valor. Se ven, pero no son campos: se corrigen anulando y registrando otro.
 *
 * ── Una pantalla negada no deja hacer nada ─────────────────────────────────
 *
 * Sin permiso de escritura (`usePuedeEscribir`), los campos llegan apagados con
 * el porqué y el botón no se ofrece activo. Si igual llega un 403, se dice en
 * palabras (`mensajeDeContabilidad`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { BitacoraDelRecurso } from '@/components/movimientos/BitacoraDelRecurso';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { ApiError } from '@/lib/api/client';
import {
  NOMBRE_DEL_BENEFICIARIO,
  NOMBRE_DEL_ESTADO_DE_EGRESO,
  gastosApi,
  type CambioDeEgreso,
  type Egreso,
  type HistorialDelEgreso,
} from '@/lib/api/gastos.service';
import {
  faltaParaGuardar,
  nombreDelCampo,
  pedidoDelCambio,
  queSePuedeCambiar,
  type Permiso,
} from '@/lib/contabilidad/cambio-de-egreso';
import { diaDe, diaLegible, hoy } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';
import { Nota } from '../piezas';
import type { PuedeEscribir } from '../use-puede-escribir';

/**
 * El mensaje del back, tal cual, cuando lo hay: sus 409 de este flujo dicen
 * QUÉ punta del período está cerrada o con qué día del extracto está
 * conciliado, y la traducción genérica de `mensajeDeContabilidad` («esa fecha
 * cae en un período cerrado») se comería justo eso. El 403 sí va traducido.
 */
function mensajeDelCambio(e: unknown): string {
  // El 503 nombra la migración que falta: eso es para Víctor, no para el cliente.
  if (e instanceof ApiError && e.status === 503) {
    return 'Todavía no se pueden corregir egresos: falta un paso de la base de datos que nuestro equipo está habilitando.';
  }
  if (e instanceof ApiError && e.status !== 403 && e.message) return e.message;
  return mensajeDeContabilidad(e, 'No se pudo guardar el cambio.');
}

function valorLegible(cambio: CambioDeEgreso, cual: 'valorAnterior' | 'valorNuevo'): string {
  const valor = cambio[cual];
  if (valor === null || valor === '') return 'nada';
  return cambio.campo === 'FECHA' ? diaLegible(valor) : `«${valor}»`;
}

export function CajonDelEgreso({
  egreso,
  escritura,
  onCerrar,
  onCambiado,
}: {
  egreso: Egreso | null;
  escritura: PuedeEscribir;
  onCerrar: () => void;
  /** Después de guardar: la lista se vuelve a pedir (la fecha y el asiento cambiaron). */
  onCambiado: (egreso: Egreso) => void;
}) {
  const [historial, setHistorial] = useState<HistorialDelEgreso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState('');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async (id: string) => {
    setCargando(true);
    setErrorDeCarga(null);
    try {
      const h = await gastosApi.egresos.historial(id);
      setHistorial(h);
      setReferencia(h.referencia ?? '');
      setNota(h.nota ?? '');
    } catch (e) {
      setHistorial(null);
      setErrorDeCarga(mensajeDeContabilidad(e, 'No se pudo leer el historial del egreso.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!egreso) return;
    setFecha(diaDe(egreso.fechaDelEgreso));
    setReferencia('');
    setNota('');
    setMotivo('');
    setHistorial(null);
    void cargar(egreso.id);
  }, [egreso, cargar]);

  const hoyEs = hoy();
  const permisos = useMemo(
    () => (egreso ? queSePuedeCambiar(egreso, escritura) : null),
    [egreso, escritura],
  );

  /*
   * Sin la migración de los cambios (`disponible: false`) no se puede guardar
   * nada: sin historial no hay rastro de quién cambió qué, y un cambio de fecha
   * sin rastro es justo lo que no puede pasar en un libro.
   */
  const sinHistorial = historial !== null && !historial.disponible;
  const bloqueo: Permiso | null = sinHistorial
    ? {
        puede: false,
        motivo:
          'Todavía no se pueden corregir egresos: falta un paso de la base de datos que nuestro equipo está habilitando.',
      }
    : null;
  const permisoDe = (p: Permiso): Permiso => bloqueo ?? p;

  const pedido = useMemo(
    () =>
      egreso && historial
        ? pedidoDelCambio(
            {
              fecha: diaDe(egreso.fechaDelEgreso),
              referencia: historial.referencia,
              nota: historial.nota,
            },
            { fecha, referencia, nota, motivo },
          )
        : null,
    [egreso, historial, fecha, referencia, nota, motivo],
  );
  const falta = faltaParaGuardar(pedido, hoyEs);
  const cambiaLaFecha = pedido?.fecha !== undefined;
  const algoEditable =
    permisos !== null &&
    bloqueo === null &&
    (permisos.fecha.puede || permisos.referencia.puede || permisos.nota.puede);

  const guardar = async () => {
    if (!egreso || !pedido || falta) return;
    setGuardando(true);
    try {
      const r = await gastosApi.egresos.cambiar(egreso.id, pedido);
      toast.success(
        r.asientos
          ? `Fecha cambiada. El asiento N.º ${r.asientos.reversado.numero} quedó reversado por el N.º ${r.asientos.reversa.numero} y el egreso ahora vive en el N.º ${r.asientos.nuevo.numero}.`
          : 'Cambio guardado en el historial del egreso.',
      );
      setHistorial({
        disponible: r.disponible,
        motivo: r.motivo,
        referencia: r.referencia,
        nota: r.nota,
        cambios: r.cambios,
      });
      setFecha(diaDe(r.egreso.fechaDelEgreso));
      setReferencia(r.referencia ?? '');
      setNota(r.nota ?? '');
      setMotivo('');
      onCambiado(r.egreso);
    } catch (e) {
      toast.error(mensajeDelCambio(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon
      abierto={egreso !== null}
      onOpenChange={(a) => {
        if (!a && !guardando) onCerrar();
      }}
      data-testid="cajon-del-egreso"
    >
      {egreso && permisos ? (
        <>
          <CajonCabecera
            titulo={
              egreso.numero !== null
                ? `Comprobante de egreso CE-${egreso.numero}`
                : `Egreso a ${egreso.beneficiarioNombre}`
            }
            descripcion={egreso.concepto}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={egreso.estado === 'ANULADO' ? 'destructive' : 'secondary'}>
                {NOMBRE_DEL_ESTADO_DE_EGRESO[egreso.estado]}
              </Badge>
              {egreso.estado === 'PAGADO' ? (
                <span className="text-caption text-fg-muted">
                  {egreso.movimientoBancarioId
                    ? 'Conciliado con el extracto'
                    : 'Sin conciliar con el extracto'}
                </span>
              ) : null}
            </div>
          </CajonCabecera>

          <CajonCuerpo className="space-y-6">
            {/* ── Lo que dice ─────────────────────────────────────────── */}
            <section className="space-y-2" aria-labelledby="egreso-lo-que-dice">
              <h3 id="egreso-lo-que-dice" className="text-sm font-medium text-fg">
                El egreso
              </h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-fg-muted">A quién</dt>
                  <dd className="text-fg">
                    {egreso.beneficiarioNombre}
                    <span className="block text-caption text-fg-muted">
                      {NOMBRE_DEL_BENEFICIARIO[egreso.beneficiarioTipo]}
                      {egreso.beneficiarioDocumento ? ` · ${egreso.beneficiarioDocumento}` : ''}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Fecha del egreso</dt>
                  <dd className="font-mono text-fg" data-testid="fecha-vigente">
                    {egreso.fechaDelEgreso ? diaLegible(egreso.fechaDelEgreso) : 'Sin pagar todavía'}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Valor</dt>
                  <dd>
                    <Monto valor={egreso.valorCop} className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Se le pagó</dt>
                  <dd>
                    <Monto valor={egreso.netoCop} className="text-sm" />
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-fg-muted">
                El valor y a quién se le pagó no se corrigen acá: la plata ya salió por ese valor.
                Si estuvo mal, se anula el egreso y se registra otro.
              </p>
            </section>

            {/* ── Corregir ────────────────────────────────────────────── */}
            <section className="space-y-4" aria-labelledby="egreso-corregir">
              <h3 id="egreso-corregir" className="text-sm font-medium text-fg">
                Corregir
              </h3>

              {cargando ? (
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                  <Spinner size="sm" /> Leyendo el historial…
                </div>
              ) : errorDeCarga ? (
                <div className="space-y-2" data-testid="historial-sin-cargar">
                  <p className="text-sm text-danger">{errorDeCarga}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    hideArrow
                    onClick={() => void cargar(egreso.id)}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (
                <>
                  {bloqueo ? (
                    <Nota testId="cambios-sin-migracion">
                      <p title={historial?.motivo ?? undefined}>{bloqueo.motivo}</p>
                    </Nota>
                  ) : null}

                  <Campo
                    id="egreso-fecha"
                    etiqueta="Fecha del egreso"
                    permiso={permisoDe(permisos.fecha)}
                    ayuda="Si el banco rechazó o devolvió el giro y salió otro día, ese es el día que va. Cambiarla reversa el asiento del egreso y lo vuelve a causar en la fecha nueva."
                  >
                    <Input
                      id="egreso-fecha"
                      type="date"
                      value={fecha}
                      max={hoyEs}
                      onChange={(e) => setFecha(e.target.value)}
                      disabled={!permisoDe(permisos.fecha).puede || guardando}
                      className="w-full font-mono sm:w-56"
                      data-testid="egreso-fecha"
                    />
                  </Campo>

                  <Campo
                    id="egreso-referencia"
                    etiqueta="Referencia de la transferencia"
                    permiso={permisoDe(permisos.referencia)}
                  >
                    <Input
                      id="egreso-referencia"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      maxLength={120}
                      placeholder="PAB-88231"
                      disabled={!permisoDe(permisos.referencia).puede || guardando}
                      className="w-full font-mono sm:w-72"
                      data-testid="egreso-referencia"
                    />
                  </Campo>

                  <Campo id="egreso-nota" etiqueta="Nota" permiso={permisoDe(permisos.nota)}>
                    <Textarea
                      id="egreso-nota"
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      maxLength={500}
                      rows={2}
                      disabled={!permisoDe(permisos.nota).puede || guardando}
                      data-testid="egreso-nota"
                    />
                  </Campo>

                  {algoEditable ? (
                    <Campo
                      id="egreso-motivo"
                      etiqueta={
                        pedido?.fecha !== undefined || pedido?.referencia !== undefined
                          ? 'Motivo (obligatorio)'
                          : 'Motivo'
                      }
                      permiso={{ puede: true, motivo: null }}
                    >
                      <Textarea
                        id="egreso-motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder="El banco rechazó el giro y se volvió a enviar el 18"
                        disabled={guardando}
                        data-testid="egreso-motivo"
                      />
                    </Campo>
                  ) : null}

                  {cambiaLaFecha && !falta ? (
                    <Nota testId="aviso-mueve-el-asiento">
                      <p>
                        Al guardar, el asiento del {diaLegible(diaDe(egreso.fechaDelEgreso))} se
                        reversa ese mismo día y el egreso se vuelve a asentar el{' '}
                        {diaLegible(pedido?.fecha)}. Los tres asientos quedan en el libro y en el
                        historial de abajo.
                      </p>
                    </Nota>
                  ) : null}
                </>
              )}
            </section>

            {/* ── Historial ───────────────────────────────────────────── */}
            <section className="space-y-2" aria-labelledby="egreso-historial">
              <h3 id="egreso-historial" className="text-sm font-medium text-fg">
                Historial de cambios
              </h3>
              {historial && historial.cambios.length > 0 ? (
                <ol className="space-y-3" data-testid="historial-del-egreso">
                  {historial.cambios.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-border bg-surface-muted p-3 text-sm"
                      data-testid={`cambio-${c.id}`}
                    >
                      <p className="text-fg">
                        <span className="font-medium">{nombreDelCampo(c.campo)}:</span>{' '}
                        {valorLegible(c, 'valorAnterior')} → {valorLegible(c, 'valorNuevo')}
                      </p>
                      {c.motivo ? (
                        <p className="mt-0.5 text-fg-muted">Motivo: {c.motivo}</p>
                      ) : null}
                      <p className="mt-1 text-caption text-fg-muted">
                        {c.cambiadoPorNombre ?? 'Alguien del equipo'} ·{' '}
                        <span className="font-mono">{diaLegible(c.createdAt)}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : historial ? (
                <p className="text-sm text-fg-muted" data-testid="historial-vacio">
                  Nadie le ha cambiado nada a este egreso desde que se registró.
                </p>
              ) : null}
            </section>

            {/* ── Movimientos ─────────────────────────────────────────────
                No duplica el historial de arriba: aquél dice QUÉ cambió (de
                qué fecha a cuál, con qué motivo); éste dice QUIÉN tocó el
                egreso, con qué rol —anular, conciliar, pagar en lote— y
                también lo que se intentó sin permiso. */}
            <BitacoraDelRecurso tipo="egreso" id={egreso.id} />
          </CajonCuerpo>

          <CajonPie ayuda={algoEditable && pedido && falta ? falta : undefined}>
            <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
              Cerrar
            </Button>
            {algoEditable ? (
              <Button
                hideArrow
                onClick={() => void guardar()}
                disabled={guardando || falta !== null}
                title={falta ?? undefined}
                data-testid="guardar-cambio-del-egreso"
              >
                {guardando ? 'Guardando…' : cambiaLaFecha ? 'Cambiar la fecha' : 'Guardar'}
              </Button>
            ) : null}
          </CajonPie>
        </>
      ) : null}
    </Cajon>
  );
}

/** Un campo con su etiqueta y, si no se puede tocar, el porqué pegado debajo. */
function Campo({
  id,
  etiqueta,
  permiso,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  permiso: Permiso;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {!permiso.puede && permiso.motivo ? (
        <p className="text-caption text-fg-muted" data-testid={`${id}-motivo`}>
          {permiso.motivo}
        </p>
      ) : ayuda ? (
        <p className="text-caption text-fg-muted">{ayuda}</p>
      ) : null}
    </div>
  );
}
