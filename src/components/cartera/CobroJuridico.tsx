'use client';

/**
 * 🔴 COBRO JURÍDICO en pantalla (Nico, 17-09-2026).
 *
 *   · los ABOGADOS de la inmobiliaria (se registran acá);
 *   · lo PACTADO por defecto: si los honorarios los paga el inquilino, el % DE
 *     LA DEUDA y el tope;
 *   · los SUGERIDOS: 90 días o más de mora y sin póliza. El sistema sugiere;
 *     pasar el caso lo hace una persona, eligiendo abogado;
 *   · los CASOS en jurídico, con lo que se le debe al abogado, la bandera por
 *     contrato («pacta honorarios») y el cierre con motivo;
 *   · los HONORARIOS: la cuenta por pagar al abogado, marcable como pagada.
 *
 * 🔴 SEGUNDA VUELTA (Nico, 17-09): el honorario entra al ESTADO DE CUENTA del
 * inquilino cuando el caso pasa a jurídico —un cargo de una vez, sin IVA y sin
 * mora—, no con cada recibo. Si el caso se cierra SIN COBRO, ese cargo se anula
 * con motivo: por eso el diálogo de cerrar tiene la casilla.
 *
 * Permisos: `cobros:view` para ver; `cobros:edit` para mover.
 */

import { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Gavel } from '@phosphor-icons/react';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/format';
import {
  juridicoApi,
  type Abogado,
  type CasoJuridico,
  type CasoSugerido,
  type ConfiguracionJuridica,
  type HonorarioJuridico,
} from '@/lib/api/juridico.service';

function mensaje(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}

const dia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function CobroJuridico() {
  const { canAccess, isLoading: permisosCargando } = usePermissions();
  const puedeMover = !permisosCargando && canAccess('cobros', 'edit');

  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [config, setConfig] = useState<ConfiguracionJuridica | null>(null);
  const [sugeridos, setSugeridos] = useState<CasoSugerido[]>([]);
  const [casos, setCasos] = useState<CasoJuridico[]>([]);
  const [honorarios, setHonorarios] = useState<HonorarioJuridico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);

  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [abogadoElegido, setAbogadoElegido] = useState<Record<string, string>>({});
  /* 🔴 Cerrar un caso pide el motivo con el diálogo del sistema de diseño (el
     del navegador ignora el tema y algunos navegadores lo suprimen). */
  const [cerrando, setCerrando] = useState<CasoJuridico | null>(null);
  const [motivoDeCierre, setMotivoDeCierre] = useState('');
  /** 🔴 «Se cerró sin cobro»: el cargo sale del estado de cuenta del inquilino. */
  const [sinCobro, setSinCobro] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [a, c, s, k, h] = await Promise.all([
        juridicoApi.abogados(),
        juridicoApi.configuracion(),
        juridicoApi.sugeridos(),
        juridicoApi.casos(),
        juridicoApi.honorarios(),
      ]);
      setAbogados(a);
      setConfig(c);
      setSugeridos(s);
      setCasos(k);
      setHonorarios(h);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const registrarAbogado = async () => {
    if (!nombre.trim() || ocupado) return;
    setOcupado(true);
    try {
      await juridicoApi.crearAbogado({
        nombre: nombre.trim(),
        documento: documento.trim() || undefined,
      });
      setNombre('');
      setDocumento('');
      toast.success('Abogado registrado');
      await cargar();
    } catch (e) {
      toast.error('No se pudo registrar el abogado', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const guardarConfig = async (datos: Parameters<typeof juridicoApi.guardarConfiguracion>[0]) => {
    setOcupado(true);
    try {
      setConfig(await juridicoApi.guardarConfiguracion(datos));
      toast.success('Lo pactado quedó guardado');
    } catch (e) {
      toast.error('No se pudo guardar', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const pasar = async (sugerido: CasoSugerido) => {
    const abogadoId = abogadoElegido[sugerido.contractId] ?? abogados.find((a) => a.activo)?.id;
    if (!abogadoId) {
      toast.error('Registra primero un abogado');
      return;
    }
    setOcupado(true);
    try {
      await juridicoApi.pasar({
        contractId: sugerido.contractId,
        abogadoId,
        motivo: `${sugerido.diasDeMora} días de mora, sin póliza.`,
      });
      toast.success(`El contrato ${sugerido.numero} quedó en jurídico`);
      await cargar();
    } catch (e) {
      toast.error('No se pudo pasar a jurídico', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const cerrar = async () => {
    const caso = cerrando;
    if (!caso || motivoDeCierre.trim().length < 5) return;
    setOcupado(true);
    try {
      await juridicoApi.cerrar(caso.id, motivoDeCierre.trim(), sinCobro);
      toast.success(
        sinCobro
          ? 'Caso cerrado sin cobro: los honorarios salieron del estado de cuenta del inquilino.'
          : 'Caso cerrado',
      );
      setCerrando(null);
      setMotivoDeCierre('');
      setSinCobro(false);
      await cargar();
    } catch (e) {
      toast.error('No se pudo cerrar el caso', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const pactarEnElContrato = async (contractId: string, pacta: boolean | null) => {
    setOcupado(true);
    try {
      const r = await juridicoApi.pactarEnElContrato(contractId, pacta);
      toast.success(
        r.efectivo
          ? 'Este contrato cobra los honorarios del abogado al inquilino.'
          : 'Este contrato NO le cobra honorarios al inquilino.',
      );
      await cargar();
    } catch (e) {
      toast.error('No se pudo guardar lo pactado', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const pagar = async (honorario: HonorarioJuridico) => {
    setOcupado(true);
    try {
      await juridicoApi.pagarHonorarios([honorario.id]);
      toast.success('Honorario marcado como pagado al abogado');
      await cargar();
    } catch (e) {
      toast.error('No se pudo marcar como pagado', { description: mensaje(e, '') });
    } finally {
      setOcupado(false);
    }
  };

  const porPagar = honorarios.filter((h) => h.estado === 'POR_PAGAR_AL_ABOGADO');
  const enJuridico = casos.filter((c) => c.estado === 'EN_JURIDICO');

  return (
    <EstadoDeDatos cargando={cargando} error={error} queEs="el cobro jurídico" onReintentar={cargar}>
      <div className="space-y-6" data-testid="cobro-juridico">
        {/* Lo pactado por defecto */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="pactado">
          <p className="flex items-center gap-2 text-body font-semibold text-fg">
            <Gavel className="h-4 w-4" aria-hidden="true" />
            Honorarios del abogado
          </p>
          <p className="mt-1 text-body-sm text-fg-muted">
            Los honorarios van a cargo del inquilino SÓLO si el contrato lo pacta. Al pasar el caso entran a su estado
            de cuenta como un cobro más —de una sola vez, sin IVA y sin intereses de mora—, calculado como un
            porcentaje de la deuda, con tope. Son del abogado: quedan como cuenta por pagar, no como ingreso de la
            inmobiliaria ni del propietario.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="block text-xs text-fg-muted">Por defecto, los paga el inquilino</span>
              <select
                className="mt-1 rounded-md border border-border bg-surface p-2 text-sm"
                value={config?.pactaHonorarios === null || config?.pactaHonorarios === undefined ? '' : String(config.pactaHonorarios)}
                disabled={!puedeMover || ocupado}
                onChange={(e) => void guardarConfig({ pactaHonorarios: e.target.value === 'true' })}
                data-testid="pacta-por-defecto"
              >
                <option value="">Sin definir (no se cobran)</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs text-fg-muted">% de la deuda al pasar</span>
              <input
                className="mt-1 w-28 rounded-md border border-border bg-surface p-2 text-sm"
                inputMode="decimal"
                defaultValue={config?.honorariosPct ?? ''}
                disabled={!puedeMover || ocupado}
                onBlur={(e) => {
                  const pct = Number(e.target.value.replace(',', '.'));
                  if (pct > 0 && pct !== config?.honorariosPct) void guardarConfig({ honorariosPct: pct });
                }}
                data-testid="honorarios-pct"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-fg-muted">Tope por caso (pesos)</span>
              <input
                className="mt-1 w-40 rounded-md border border-border bg-surface p-2 text-sm"
                inputMode="numeric"
                defaultValue={config?.honorariosTopeCop ?? ''}
                disabled={!puedeMover || ocupado}
                onBlur={(e) => {
                  const tope = Number(e.target.value.replace(/\D/g, ''));
                  if (tope > 0 && tope !== config?.honorariosTopeCop) void guardarConfig({ honorariosTopeCop: tope });
                }}
                data-testid="honorarios-tope"
              />
            </label>
          </div>
        </section>

        {/* Abogados */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="abogados">
          <p className="text-body font-semibold text-fg">Abogados</p>
          <ul className="mt-2 space-y-1 text-body-sm">
            {abogados.length === 0 && <li className="text-fg-muted">Todavía no hay abogados registrados.</li>}
            {abogados.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>
                  {a.nombre}
                  {a.documento ? <span className="text-fg-muted"> · {a.documento}</span> : null}
                  {!a.activo && <span className="text-fg-muted"> · inactivo</span>}
                </span>
                {puedeMover && (
                  <Button
                    size="sm"
                    variant="outline"
                    hideArrow
                    disabled={ocupado}
                    onClick={() => void juridicoApi.actualizarAbogado(a.id, { activo: !a.activo }).then(cargar)}
                  >
                    {a.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {puedeMover && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input
                className="rounded-md border border-border bg-surface p-2 text-sm"
                placeholder="Nombre del abogado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                data-testid="abogado-nombre"
              />
              <input
                className="rounded-md border border-border bg-surface p-2 text-sm"
                placeholder="Cédula o NIT (opcional)"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                data-testid="abogado-documento"
              />
              <Button hideArrow disabled={ocupado} onClick={() => void registrarAbogado()} data-testid="registrar-abogado">
                Registrar
              </Button>
            </div>
          )}
        </section>

        {/* Sugeridos */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="sugeridos">
          <p className="text-body font-semibold text-fg">Sugeridos para jurídico</p>
          <p className="mt-1 text-body-sm text-fg-muted">
            90 días o más de mora y sin póliza. Es una sugerencia: pasar el caso lo decide una persona.
          </p>
          {sugeridos.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-muted">Ningún contrato cumple hoy.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sugeridos.map((s) => (
                <li
                  key={s.contractId}
                  className="flex flex-col gap-2 border-t border-border pt-2 text-body-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`sugerido-${s.contractId}`}
                >
                  <span>
                    Contrato {s.numero} · {s.tenantName ?? 'Sin nombre'} · {s.direccion} ·{' '}
                    <strong>{s.diasDeMora} días</strong> · {formatCurrency(s.deudaCop)}
                    {s.pactaHonorarios ? ' · pacta honorarios' : ' · sin honorarios pactados'}
                  </span>
                  {puedeMover && (
                    <span className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-border bg-surface p-1.5 text-sm"
                        value={abogadoElegido[s.contractId] ?? ''}
                        onChange={(e) =>
                          setAbogadoElegido((prev) => ({ ...prev, [s.contractId]: e.target.value }))
                        }
                        aria-label="Abogado que lleva el caso"
                      >
                        <option value="">Elige el abogado</option>
                        {abogados
                          .filter((a) => a.activo)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nombre}
                            </option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        hideArrow
                        disabled={ocupado}
                        onClick={() => void pasar(s)}
                        data-testid={`pasar-${s.contractId}`}
                      >
                        Pasar a jurídico
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Casos en jurídico */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="casos">
          <p className="text-body font-semibold text-fg">En jurídico</p>
          {enJuridico.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-muted">Ningún caso en jurídico.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {enJuridico.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 border-t border-border pt-2 text-body-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`caso-${c.id}`}
                >
                  <span>
                    {c.abogado.nombre} · desde el {dia(c.pasadoAt)} ·{' '}
                    {c.pactaHonorarios
                      ? `honorarios ${c.honorariosPct} % de la deuda${c.honorariosTopeCop ? ` (tope ${formatCurrency(c.honorariosTopeCop)})` : ''}`
                      : 'sin honorarios a cargo del inquilino'}
                    {c.honorariosCausadosCop > 0
                      ? ` · causados ${formatCurrency(c.honorariosCausadosCop)}`
                      : ''}
                  </span>
                  {puedeMover && (
                    <span className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        hideArrow
                        disabled={ocupado}
                        onClick={() => void pactarEnElContrato(c.contractId, !c.pactaHonorarios)}
                        data-testid={`pactar-${c.contractId}`}
                      >
                        {c.pactaHonorarios ? 'No cobrarle honorarios' : 'Cobrarle honorarios'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        hideArrow
                        disabled={ocupado}
                        onClick={() => {
                          setCerrando(c);
                          setMotivoDeCierre('');
                          setSinCobro(false);
                        }}
                        data-testid={`cerrar-${c.id}`}
                      >
                        Cerrar el caso
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cuenta por pagar al abogado */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="honorarios">
          <p className="text-body font-semibold text-fg">Por pagar a los abogados</p>
          <p className="mt-1 text-body-sm text-fg-muted">
            Lo que se le cargó al inquilino al pasar cada caso a jurídico. Es plata del abogado: no es ingreso de la
            inmobiliaria ni del propietario.
          </p>
          {porPagar.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-muted">No hay honorarios pendientes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {porPagar.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-col gap-2 border-t border-border pt-2 text-body-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`honorario-${h.id}`}
                >
                  <span>
                    {h.abogado.nombre} · {formatCurrency(h.honorarioCop)} (sobre{' '}
                    {formatCurrency(h.baseCop)}{' '}
                    {h.origen === 'AL_PASAR' ? 'de deuda al pasar' : 'recaudados'}) · {dia(h.createdAt)}
                    {h.origen === 'AL_PASAR' && h.conceptoDeUnaVezId ? (
                      <span className="text-fg-muted"> · cargado al estado de cuenta del inquilino</span>
                    ) : null}
                  </span>
                  {puedeMover && (
                    <Button
                      size="sm"
                      variant="outline"
                      hideArrow
                      disabled={ocupado}
                      onClick={() => void pagar(h)}
                      data-testid={`pagar-${h.id}`}
                    >
                      Marcar pagado
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <AlertDialog
          open={cerrando !== null}
          onOpenChange={(abierto) => {
            if (!abierto) {
              setCerrando(null);
              setSinCobro(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cerrar el caso</AlertDialogTitle>
              <AlertDialogDescription>
                El contrato deja de estar «en jurídico». Lo que ya se causó al abogado no se borra, salvo que marques
                que se cerró sin cobro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="motivo-cierre">Motivo</Label>
              <Textarea
                id="motivo-cierre"
                value={motivoDeCierre}
                onChange={(e) => setMotivoDeCierre(e.target.value)}
                placeholder="El inquilino se puso al día y entregó el inmueble."
                rows={3}
                maxLength={500}
              />
              <p className="text-caption text-fg-muted">Entre 5 y 500 caracteres.</p>
              <label className="flex items-start gap-2 text-body-sm">
                <Checkbox className="mt-1" checked={sinCobro} onCheckedChange={(marcada: boolean) => setSinCobro(marcada)} data-testid="cerrar-sin-cobro" />
                <span>
                  <strong>Se cerró SIN COBRO.</strong> Los honorarios salen del estado de cuenta del inquilino (se
                  anulan con este motivo) y dejan de ser cuenta por pagar al abogado. Si esa cuota ya tiene un pago o
                  un cobro encima no se puede: se corrige con una nota crédito.
                </span>
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void cerrar();
                }}
                disabled={ocupado || motivoDeCierre.trim().length < 5}
                data-testid="confirmar-cerrar-caso"
              >
                Cerrar el caso
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </EstadoDeDatos>
  );
}
