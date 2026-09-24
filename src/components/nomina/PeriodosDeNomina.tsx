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

import Link from 'next/link';
import { useState } from 'react';

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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { detalleDelFallo, nominaApi } from '@/lib/api/nomina.service';
import type { PeriodoDeNomina, Periodos } from '@/lib/api/nomina.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { mesActual } from '@/lib/recaudo/meses';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  Avisos,
  EstadoDelPeriodo,
  LeyendaDeEstados,
  TituloDeBloque,
  etiquetaDelPeriodo,
} from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const PANEL = '/panel/inmobiliaria/nomina';

export function PeriodosDeNominaPanel() {
  const estado = useCargaDeNomina<Periodos>(() => nominaApi.periodos(), []);
  const [mes, setMes] = useState(() => mesActual());
  const [quincena, setQuincena] = useState<'' | '1' | '2'>('');
  const [armando, setArmando] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [anulando, setAnulando] = useState<PeriodoDeNomina | null>(null);
  const [motivo, setMotivo] = useState('');

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
      toast.error(mensajeDelFallo(error, 'No se pudo armar el borrador.'));
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
      toast.error(mensajeDelFallo(error, 'No se pudo aprobar el período.'));
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
      toast.error(mensajeDelFallo(error, 'No se pudo asentar el período.'));
    }
  };

  const pagar = async (p: PeriodoDeNomina) => {
    try {
      const r = await nominaApi.marcarPagado(p.id);
      toast.success('El período quedó marcado como pagado.');
      if (r.aviso) setAvisos([r.aviso]);
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo marcar como pagado.'));
    }
  };

  const confirmarAnulacion = async () => {
    if (!anulando) return;
    try {
      const r = await nominaApi.anular(anulando.id, motivo);
      toast.success('El período quedó anulado y las novedades volvieron a estar libres.');
      if (r.aviso) setAvisos([r.aviso]);
      setAnulando(null);
      setMotivo('');
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo anular el período.'));
    }
  };

  return (
    <div className="space-y-6">
      <Avisos avisos={avisos} testId="avisos-de-liquidacion" />

      <section className="space-y-3">
        <TituloDeBloque
          titulo="Armar el borrador de un período"
          explicacion="Entran las personas ACTIVAS con esa periodicidad, más las que se retiraron dentro del período (hay que pagarles sus días). Los contratistas de prestación de servicios NO entran: no son nómina laboral, se les paga por cuenta de cobro. Volver a armar un BORRADOR lo recalcula; sobre uno aprobado se niega."
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mes-a-liquidar">Mes</Label>
            <Input
              id="mes-a-liquidar"
              className="w-36"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              placeholder="2026-03"
              data-testid="mes-a-liquidar"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quincena-a-liquidar">Periodicidad</Label>
            <select
              id="quincena-a-liquidar"
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg"
              value={quincena}
              onChange={(e) => setQuincena(e.target.value as '' | '1' | '2')}
              data-testid="quincena-a-liquidar"
            >
              <option value="">Mensual</option>
              <option value="1">Quincenal · primera</option>
              <option value="2">Quincenal · segunda</option>
            </select>
          </div>
          <Button
            onClick={() => void armar()}
            disabled={armando}
            data-testid="armar-borrador"
          >
            {armando ? 'Armando…' : 'Armar borrador'}
          </Button>
        </div>
        <p className="text-caption text-fg-muted">
          🔴 <strong>Aprobar le manda a cada persona su desprendible en PDF por
          correo</strong>, con constancia de a qué dirección salió. Si un correo
          falla, el período queda aprobado igual y se puede reenviar desde el
          desprendible: deshacer una aprobación borraría provisiones ya
          contabilizadas.
        </p>
        <p className="text-caption text-fg-muted">
          La contabilidad siempre cierra el mes completo: las dos quincenas de un
          mes comparten su asiento del gasto, y la retención se calcula sobre el
          mes — la segunda quincena ajusta lo que retuvo la primera.
        </p>
      </section>

      <Cargado
        estado={estado}
        queEs="los períodos de nómina"
        queSeEspera="liquidar la nómina"
      >
        {(datos) => (
          <section className="space-y-3">
            <TituloDeBloque
              titulo="Los períodos"
              explicacion="Lo que ya se liquidó, con su estado y su plata."
            />
            {datos.periodos.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted">
                Todavía no hay períodos liquidados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="tabla-de-periodos">
                  <TableHeader>
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
                  <TableBody>
                    {datos.periodos.map((p) => (
                      <TableRow key={p.id} data-testid={`periodo-${p.id}`}>
                        <TableCell>
                          <Link
                            className="font-medium text-brand underline"
                            href={`${PANEL}/periodos/${p.id}`}
                          >
                            {etiquetaDelPeriodo(p.mes, p.quincena)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <EstadoDelPeriodo estado={p.estado} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.personas}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(p.totalDevengadoCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(p.totalDeduccionesCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(p.totalNetoCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(p.totalAportesCop)}
                        </TableCell>
                        <TableCell className="text-caption text-fg-muted">
                          {p.asientoId ? 'Asentado' : 'Sin asiento'}
                          {p.loteDeEgresosId ? ' · con lote de egresos' : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <LeyendaDeEstados />
          </section>
        )}
      </Cargado>

      <AlertDialog
        open={anulando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setAnulando(null);
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-anulacion">
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmarAnulacion()}
              disabled={motivo.trim().length < 10}
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
