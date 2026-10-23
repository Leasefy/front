'use client';

/**
 * LA LIQUIDACIÓN DEL PERÍODO: el borrador, su aprobación, el asiento y el pago.
 *
 * ── El orden de los botones ES la regla de negocio ─────────────────────────
 *
 *   BORRADOR  → «Recalcular» y «Aprobar». Se puede rehacer las veces que haga
 *               falta; nada está en firme.
 *   APROBADO  → «Asentar» y «Marcar pagado». Las líneas están congeladas: un
 *               desprendible entregado no cambia porque alguien corrigió el
 *               salario mínimo tres meses después.
 *   PAGADO    → sólo se mira. Anular no devuelve la plata: se corrige con un
 *               período de ajuste.
 *
 * ── 🔴 Lo que esta pantalla dice en voz alta ───────────────────────────────
 *
 * · **Aprobar no es pagar.** Aprobar congela y provisiona; pagar es otra cosa,
 *   y hoy el giro sale por fuera de Leasefy mientras el lote de egresos no exista.
 * · **Asentar puede fallar por el cierre de mes**, y ese 4xx no es un bug: el
 *   contador cerró el mes y un administrador tiene que reabrirlo con motivo.
 * · **Las liquidaciones marcadas** (una tarifa que depende del perfil tributario,
 *   el procedimiento 2, un aprendiz) salen contadas ANTES de aprobar, no después.
 * · Anular exige motivo, y se pide con `AlertDialog` — nunca con el diálogo del
 *   navegador, que ignora el tema y algunos navegadores suprimen del todo.
 */

import { SinDatos } from '@/components/estado/SinDatos';
import Link from 'next/link';
import { useState } from 'react';
import { CalendarBlank, Prohibit } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CampoDeMes } from '@/components/ui/campo-de-mes';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { detalleDelFallo, nominaApi } from '@/lib/api/nomina.service';
import type { PeriodoDeNomina, Periodos } from '@/lib/api/nomina.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { mesActual } from '@/lib/recaudo/meses';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  Avisos,
  EstadoDelPeriodo,
  LeyendaDeEstados,
  etiquetaDelPeriodo,
} from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

type VistaDePeriodos = 'todos' | 'BORRADOR' | 'APROBADO' | 'PAGADO' | 'ANULADO';

const PANEL = '/panel/inmobiliaria/nomina';

export function PeriodosDeNominaPanel() {
  const estado = useCargaDeNomina<Periodos>(() => nominaApi.periodos(), []);
  const [mes, setMes] = useState(() => mesActual());
  const [quincena, setQuincena] = useState<'' | '1' | '2'>('');
  const [armando, setArmando] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [anulando, setAnulando] = useState<PeriodoDeNomina | null>(null);
  const [enviandoAnulacion, setEnviandoAnulacion] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [vista, setVista] = useState<VistaDePeriodos>('todos');
  const hayBorrador = (estado.datos?.periodos ?? []).some((p) => p.estado === 'BORRADOR');

  const armar = async () => {
    setArmando(true);
    setAvisos([]);
    try {
      const r = await nominaApi.armarBorrador({
        mes,
        quincena: quincena === '' ? null : Number(quincena),
      });
      setAvisos(r.avisos);
      toast.success(
        `Borrador de ${etiquetaDelPeriodo(mes, quincena === '' ? null : Number(quincena))} armado: ${r.personas} persona${r.personas === 1 ? '' : 's'}, neto ${formatCurrency(r.neto)}.`,
      );
      await estado.recargar();
    } catch (error) {
      // 🔴 El 422 de parámetros incompletos trae la lista de lo que falta: se
      // muestra tal cual, porque «no se pudo liquidar» no le dice a nadie qué hacer.
      const detalle = detalleDelFallo(error);
      if (detalle.queFalta?.length) {
        setAvisos([
          `No se puede liquidar: falta ${detalle.queFalta.join(', ')}. Cárgalo en Configuración.`,
        ]);
      }
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo armar el borrador.', accion: 'armar el borrador' }));
    } finally {
      setArmando(false);
    }
  };

  const aprobar = async (p: PeriodoDeNomina) => {
    try {
      const r = await nominaApi.aprobar(p.id);
      toast.success(
        'El período quedó aprobado: las líneas están congeladas y las provisiones del mes escritas.',
      );
      /*
       * 🔴 El resultado del ENVÍO de los desprendibles se muestra siempre, no
       * sólo cuando falla. Aprobar dispara un correo a cada persona; si la
       * pantalla no dijera cuántos salieron, quien aprueba se quedaría sin saber
       * si la gente recibió su desprendible — y eso no se puede consultar en
       * ningún otro lado sin abrir los treinta uno por uno.
       */
      const envio = r.envioDeDesprendibles;
      if (envio) {
        setAvisos([
          `Desprendibles: ${envio.enviados} enviado${envio.enviados === 1 ? '' : 's'}` +
            (envio.sinCorreo > 0 ? `, ${envio.sinCorreo} sin correo` : '') +
            (envio.fallaron > 0 ? `, ${envio.fallaron} con fallo` : '') +
            '.',
          ...envio.avisos,
        ]);
      }
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo aprobar el período.', accion: 'aprobar el período' }));
    }
  };

  const asentar = async (p: PeriodoDeNomina) => {
    try {
      const r = await nominaApi.asentar(p.id);
      toast.success(r.mensaje);
      await estado.recargar();
    } catch (error) {
      const detalle = detalleDelFallo(error);
      if (detalle.conceptos?.length) {
        setAvisos([
          `No se asentó: estos conceptos no tienen cuenta del PUC — ${detalle.conceptos.join(', ')}. Mapéalos en Conceptos. El asiento NO se escribe a medias: un asiento incompleto descuadra el balance para siempre.`,
        ]);
      } else if (detalle.cuentas?.length) {
        setAvisos([
          `No se asentó: estas cuentas no existen en tu PUC — ${detalle.cuentas.join(', ')}. Créalas en Contabilidad → PUC o cambia el mapeo. Nómina no crea cuentas.`,
        ]);
      }
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo asentar el período.', accion: 'asentar el período' }));
    }
  };

  const pagar = async (p: PeriodoDeNomina) => {
    try {
      const r = await nominaApi.marcarPagado(p.id);
      toast.success('El período quedó marcado como pagado.');
      if (r.aviso) setAvisos([r.aviso]);
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo marcar como pagado.', accion: 'marcar el período como pagado' }));
    }
  };

  const confirmarAnulacion = async () => {
    if (!anulando || enviandoAnulacion) return;
    setEnviandoAnulacion(true);
    try {
      const r = await nominaApi.anular(anulando.id, motivo);
      toast.success('El período quedó anulado y las novedades volvieron a estar libres.');
      if (r.aviso) setAvisos([r.aviso]);
      setAnulando(null);
      setMotivo('');
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo anular el período.', accion: 'anular el período' }));
    } finally {
      setEnviandoAnulacion(false);
    }
  };

  return (
    <div className="space-y-6">
      <Avisos avisos={avisos} testId="avisos-de-liquidacion" />

      {/* ── Armar el borrador: el paso que arranca un período ──────────────
          GLOW UP 3.ª vuelta: el formulario en su tarjeta, el mes con su selector
          de mes (antes un texto «2026-03») y lo que pasa al armar y al aprobar,
          plegado: se consulta, no se lee cada vez. */}
      <section className="space-y-3 rounded-lg border border-border bg-surface p-4" aria-labelledby="armar-un-periodo">
        <h2 id="armar-un-periodo" className="text-[17px] font-[460] tracking-[-0.01em] text-fg">
          Armar el borrador de un período
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mes-a-liquidar">Mes</Label>
            {/* El campo de mes de la casa (guardián fechas-con-cadence). */}
            <CampoDeMes
              id="mes-a-liquidar"
              className="w-44"
              value={mes}
              onChange={setMes}
              testid="mes-a-liquidar"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quincena-a-liquidar">Periodicidad</Label>
            {/* Revisora r25 (C4): el Select de la casa. Radix no acepta el valor '': «mensual»
                es el '' de siempre (lo que viaja no cambia). */}
            <Select
              value={quincena === '' ? 'mensual' : quincena}
              onValueChange={(v) => setQuincena(v === 'mensual' ? '' : (v as '1' | '2'))}
            >
              <SelectTrigger id="quincena-a-liquidar" className="w-52" data-testid="quincena-a-liquidar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="1">Quincenal · primera</SelectItem>
                <SelectItem value="2">Quincenal · segunda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Un solo azul: con un borrador esperando, lo que sigue es aprobarlo (en su fila).
              Revisora r25 (Liquidación, UI): del alto de los dos campos (antes «sm», más bajo que ellos). */}
          <Button
            variant={hayBorrador ? 'outline' : 'default'}
            className="h-11"
            onClick={() => void armar()}
            disabled={armando}
            data-testid="armar-borrador"
          >
            {armando ? 'Armando…' : 'Armar borrador'}
          </Button>
        </div>
        <MasDetalles etiqueta="Quién entra y qué pasa al aprobar" etiquetaAbierto="Ocultar" montadoSiempre>
          <div className="max-w-3xl space-y-2 text-body-sm leading-relaxed text-fg-muted">
            <p>
              Entran las personas activas con esa periodicidad, más las que se retiraron dentro del
              período (hay que pagarles sus días). Los contratistas de prestación de servicios no
              entran: no son nómina laboral, se les paga por cuenta de cobro. Volver a armar un
              borrador lo recalcula; sobre uno aprobado se niega.
            </p>
            <p>
              <strong className="font-medium text-fg">Aprobar le manda a cada persona su desprendible en PDF por
              correo</strong>, con constancia de a qué dirección salió. Si un correo falla, el período
              queda aprobado igual y se puede reenviar desde el desprendible: deshacer una aprobación
              borraría provisiones ya contabilizadas.
            </p>
            <p>
              La contabilidad siempre cierra el mes completo: las dos quincenas de un mes comparten su
              asiento del gasto, y la retención se calcula sobre el mes; la segunda quincena ajusta lo
              que retuvo la primera.
            </p>
          </div>
        </MasDetalles>
      </section>

      <Cargado
        estado={estado}
        queEs="los períodos de nómina"
        queSeEspera="liquidar la nómina"
      >
        {(datos) => {
          const deEstado = (e: string) => datos.periodos.filter((p) => p.estado === e);
          const aprobados = deEstado('APROBADO');
          const borradores = deEstado('BORRADOR');
          const pagados = deEstado('PAGADO');
          const neto = (ps: readonly PeriodoDeNomina[]) => ps.reduce((t, p) => t + p.totalNetoCop, 0);
          const visibles = vista === 'todos' ? datos.periodos : deEstado(vista);
          const cifras = localeDeLasCifras();
          return (
          <section className="space-y-5">
            {/* LA RESPUESTA: lo aprobado que todavía no se le ha pagado a la gente. */}
            {datos.periodos.length > 0 ? (
              <CifraHeroe
                rotulo="Neto aprobado sin pagar"
                cifra={formatCurrency(neto(aprobados))}
                contexto={
                  aprobados.length === 0
                    ? 'ningún período aprobado espera el pago'
                    : `en ${aprobados.length.toLocaleString(cifras)} ${aprobados.length === 1 ? 'período aprobado' : 'períodos aprobados'}`
                }
                tramos={[
                  { clave: 'borrador', etiqueta: `En borrador · ${borradores.length.toLocaleString(cifras)}`, monto: neto(borradores), tono: 'neutro', cifra: formatCurrency(neto(borradores)) },
                  { clave: 'aprobado', etiqueta: `Aprobado sin pagar · ${aprobados.length.toLocaleString(cifras)}`, monto: neto(aprobados), tono: 'aviso', cifra: formatCurrency(neto(aprobados)) },
                  { clave: 'pagado', etiqueta: `Pagado · ${pagados.length.toLocaleString(cifras)}`, monto: neto(pagados), tono: 'exito', cifra: formatCurrency(neto(pagados)) },
                ]}
                data-testid="cifra-de-periodos"
              />
            ) : null}
            {datos.periodos.length === 0 ? (
              // Revisora r25 (C5): el vacío con su salida (antes una línea gris).
              <div className="rounded-lg border border-border bg-surface">
                <SinDatos
                  queSon="períodos"
                  icono={CalendarBlank}
                  titulo="Todavía no hay períodos liquidados"
                  descripcion="Arma el primero arriba: elige el mes y la periodicidad."
                  accion={
                    <Button size="sm" variant="secondary" hideArrow onClick={() => document.getElementById('mes-a-liquidar')?.focus()}>
                      Elegir el mes
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <PestanasDeEstado
                    etiqueta="Estado de los períodos"
                    valor={vista}
                    onCambio={setVista}
                    pestanas={[
                      { valor: 'todos', etiqueta: 'Todos', cuantos: datos.periodos.length, fija: true },
                      { valor: 'BORRADOR', etiqueta: 'Borradores', cuantos: borradores.length, tono: borradores.length > 0 ? 'aviso' : undefined },
                      { valor: 'APROBADO', etiqueta: 'Aprobados', cuantos: aprobados.length },
                      { valor: 'PAGADO', etiqueta: 'Pagados', cuantos: pagados.length },
                      { valor: 'ANULADO', etiqueta: 'Anulados', cuantos: deEstado('ANULADO').length },
                    ]}
                  />
                </div>
                <Table data-testid="tabla-de-periodos" className="max-md:block">
                  <TableHeader className="max-md:hidden">
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Personas</TableHead>
                      <TableHead className="text-right">Devengado</TableHead>
                      <TableHead className="text-right">Deducciones</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead className="text-right">Aportes</TableHead>
                      <TableHead>Contabilidad</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBodyAnimado className="max-md:block">
                    {visibles.length === 0 ? (
                      <TableRowAnimada key="vacio" className="max-md:block">
                        <TableCell colSpan={9} className="py-8 text-center text-body-sm text-fg-muted max-md:block">
                          Ningún período en esta pestaña.{' '}
                          <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setVista('todos')}>
                            Ver todos
                          </button>
                        </TableCell>
                      </TableRowAnimada>
                    ) : null}
                    {visibles.map((p) => (
                      <TableRowAnimada
                        key={p.id}
                        data-testid={`periodo-${p.id}`}
                        className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                      >
                        <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                          <Link
                            className="font-medium text-fg underline-offset-4 hover:underline"
                            href={`${PANEL}/periodos/${p.id}`}
                          >
                            {etiquetaDelPeriodo(p.mes, p.quincena)}
                          </Link>
                          <span className="block text-caption text-fg-muted md:hidden">
                            {p.personas} {p.personas === 1 ? 'persona' : 'personas'} · {p.asientoId ? 'asentado' : 'sin asiento'}
                          </span>
                        </TableCell>
                        <TableCell className="max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                          <EstadoDelPeriodo estado={p.estado} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums max-md:hidden">
                          {p.personas}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                          {formatCurrency(p.totalDevengadoCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                          {formatCurrency(p.totalDeduccionesCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                          {formatCurrency(p.totalNetoCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                          {formatCurrency(p.totalAportesCop)}
                        </TableCell>
                        <TableCell className="text-caption text-fg-muted max-md:hidden">
                          {p.asientoId ? 'Asentado' : 'Sin asiento'}
                          {p.loteDeEgresosId ? ' · con lote de egresos' : ''}
                        </TableCell>
                        <TableCell className="max-md:col-span-2 max-md:row-start-3 max-md:block max-md:p-0">
                          <div className="flex flex-wrap justify-end gap-1.5 max-md:justify-start">
                            {p.estado === 'BORRADOR' ? (
                              <Button
                                size="sm"
                                onClick={() => void aprobar(p)}
                                data-testid={`aprobar-${p.id}`}
                              >
                                Aprobar
                              </Button>
                            ) : null}
                            {p.estado === 'APROBADO' && !p.asientoId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void asentar(p)}
                                data-testid={`asentar-${p.id}`}
                              >
                                Asentar
                              </Button>
                            ) : null}
                            {p.estado === 'APROBADO' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void pagar(p)}
                                data-testid={`pagar-${p.id}`}
                              >
                                Marcar pagado
                              </Button>
                            ) : null}
                            {p.estado === 'BORRADOR' || p.estado === 'APROBADO' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAnulando(p);
                                  setMotivo('');
                                }}
                                data-testid={`anular-${p.id}`}
                              >
                                Anular
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRowAnimada>
                    ))}
                  </TableBodyAnimado>
                </Table>
              </div>
            )}
            <MasDetalles etiqueta="Qué significa cada estado" etiquetaAbierto="Ocultar" montadoSiempre>
              <LeyendaDeEstados />
            </MasDetalles>
          </section>
          );
        }}
      </Cargado>

      <AlertDialog
        open={anulando !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !enviandoAnulacion) setAnulando(null);
        }}
      >
        <AlertDialogContent
          variant="destructive"
          icon={<Prohibit weight="bold" />}
          data-testid="dialogo-de-anulacion"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Anular la nómina de{' '}
              {anulando
                ? etiquetaDelPeriodo(anulando.mes, anulando.quincena)
                : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Las novedades vuelven a estar libres y se borran las provisiones que
              nadie cruzó todavía. Si el período ya tenía asiento contable, el
              asiento NO se borra: se reversa desde Contabilidad, que es la única
              forma de corregir el libro mayor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-de-anulacion">
              Motivo (al menos 10 caracteres — alguien lo va a leer para entender
              qué pasó)
            </Label>
            <Input
              id="motivo-de-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-testid="motivo-de-anulacion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoAnulacion}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Abierto hasta que el back conteste: si falla, el motivo no se pierde.
                e.preventDefault();
                void confirmarAnulacion();
              }}
              disabled={motivo.trim().length < 10}
              loading={enviandoAnulacion}
              data-testid="confirmar-anulacion"
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
