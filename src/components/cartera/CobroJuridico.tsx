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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Gavel, Prohibit } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';

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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/format';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  MAX_LARGO_DEL_DOCUMENTO_DEL_ABOGADO,
  MAX_LARGO_DEL_NOMBRE_DEL_ABOGADO,
  errorDelPorcentajeDeHonorarios,
  errorDelTopeDeHonorarios,
  leerPorcentajeDeHonorarios,
  leerTopeDeHonorarios,
} from '@/lib/cartera/limites-del-juridico';
import {
  juridicoApi,
  type Abogado,
  type CasoJuridico,
  type CasoSugerido,
  type ConfiguracionJuridica,
  type HonorarioJuridico,
} from '@/lib/api/juridico.service';

/** Lo que se dice cuando el error no trae nada legible. */
const POR_DEFECTO = 'Prueba de nuevo en un momento.';

/** Los campos que pueden traer su error, con el id de su input. */
type CampoDeLoPactado = 'honorariosPct' | 'honorariosTopeCop';
type CampoDelAbogado = 'nombre' | 'documento';
const ID_DE_LO_PACTADO: Record<CampoDeLoPactado, string> = {
  honorariosPct: 'honorarios-pct',
  honorariosTopeCop: 'honorarios-tope',
};
const ID_DEL_ABOGADO: Record<CampoDelAbogado, string> = {
  nombre: 'abogado-nombre',
  documento: 'abogado-documento',
};

function enfocar(id: string | undefined) {
  if (id) document.getElementById(id)?.focus();
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
  /** Los errores de cada campo: el espejo del tope o `campos[]` del back. */
  const [erroresDeLoPactado, setErroresDeLoPactado] = useState<
    Partial<Record<CampoDeLoPactado, string>>
  >({});
  const [erroresDelAbogado, setErroresDelAbogado] = useState<
    Partial<Record<CampoDelAbogado, string>>
  >({});
  const [errorDelMotivoDeCierre, setErrorDelMotivoDeCierre] = useState<string | null>(null);
  /**
   * El campo de lo pactado que debe recibir el foco cuando termine de guardar:
   * mientras guarda está deshabilitado y un campo deshabilitado no se enfoca.
   */
  const focoPendiente = useRef<string | null>(null);
  useEffect(() => {
    if (!ocupado && focoPendiente.current) {
      enfocar(focoPendiente.current);
      focoPendiente.current = null;
    }
  }, [ocupado]);

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
    setErroresDelAbogado({});
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
      // Un 400 por campo va debajo de su campo; lo demás, al aviso.
      const reparto = repartirErroresDelServidor<CampoDelAbogado>(e, {
        campos: ['nombre', 'documento'],
        porDefecto: POR_DEFECTO,
        accion: 'registrar el abogado',
      });
      setErroresDelAbogado(reparto.porCampo);
      enfocar(reparto.orden[0] && ID_DEL_ABOGADO[reparto.orden[0]]);
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo registrar el abogado', { description: reparto.sueltos.join(' · ') });
      }
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
      // El tope y el porcentaje, debajo de su campo; lo demás, al aviso.
      const reparto = repartirErroresDelServidor<CampoDeLoPactado>(e, {
        campos: ['honorariosPct', 'honorariosTopeCop'],
        porDefecto: POR_DEFECTO,
        accion: 'guardar lo pactado',
      });
      setErroresDeLoPactado((previos) => ({ ...previos, ...reparto.porCampo }));
      focoPendiente.current = reparto.orden[0] ? ID_DE_LO_PACTADO[reparto.orden[0]] : null;
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo guardar', { description: reparto.sueltos.join(' · ') });
      }
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
      toast.error('No se pudo pasar a jurídico', {
        description: mensajeParaLaPersona(e, {
          porDefecto: POR_DEFECTO,
          accion: 'pasar el caso a jurídico',
        }),
      });
    } finally {
      setOcupado(false);
    }
  };

  const cerrar = async () => {
    const caso = cerrando;
    if (!caso || motivoDeCierre.trim().length < 5) return;
    setOcupado(true);
    setErrorDelMotivoDeCierre(null);
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
      // Un 400 del motivo va debajo del motivo; lo demás (el 409 de la cuota
      // que ya tiene un pago encima, un 5xx), al aviso.
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo'] as const,
        porDefecto: POR_DEFECTO,
        accion: 'cerrar el caso',
      });
      if (porCampo.motivo) {
        setErrorDelMotivoDeCierre(porCampo.motivo);
        enfocar('motivo-cierre');
      }
      if (sueltos.length > 0) {
        toast.error('No se pudo cerrar el caso', { description: sueltos.join(' · ') });
      }
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
      toast.error('No se pudo guardar lo pactado', {
        description: mensajeParaLaPersona(e, {
          porDefecto: POR_DEFECTO,
          accion: 'guardar lo pactado en el contrato',
        }),
      });
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
      toast.error('No se pudo marcar como pagado', {
        description: mensajeParaLaPersona(e, {
          porDefecto: POR_DEFECTO,
          accion: 'marcar el honorario como pagado',
        }),
      });
    } finally {
      setOcupado(false);
    }
  };

  /**
   * 🔴 (02-10-2026) Activar o desactivar un abogado era un `void …then(cargar)`
   * sin `catch`: si fallaba, la pantalla no decía nada y el rechazo quedaba
   * suelto. Ahora el fallo se dice.
   */
  const alternarAbogado = async (a: Abogado) => {
    setOcupado(true);
    try {
      await juridicoApi.actualizarAbogado(a.id, { activo: !a.activo });
      await cargar();
    } catch (e) {
      toast.error(a.activo ? 'No se pudo desactivar el abogado' : 'No se pudo activar el abogado', {
        description: mensajeParaLaPersona(e, {
          porDefecto: POR_DEFECTO,
          accion: a.activo ? 'desactivar el abogado' : 'activar el abogado',
        }),
      });
    } finally {
      setOcupado(false);
    }
  };

  /** Escribir en un campo de lo pactado borra su error. */
  const limpiarLoPactado = (campo: CampoDeLoPactado) =>
    setErroresDeLoPactado((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos));

  const ariaDe = (id: string, error: string | undefined | null) =>
    error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

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
            <div>
              <label className="text-sm" htmlFor="honorarios-pct">
                <span className="block text-xs text-fg-muted">% de la deuda al pasar</span>
                <input
                  id="honorarios-pct"
                  className="mt-1 w-28 rounded-md border border-border bg-surface p-2 text-sm"
                  inputMode="decimal"
                  defaultValue={config?.honorariosPct ?? ''}
                  disabled={!puedeMover || ocupado}
                  onChange={() => limpiarLoPactado('honorariosPct')}
                  onBlur={(e) => {
                    // 🔁 Espejo del tope del back: lo que no cabe no viaja.
                    const error = errorDelPorcentajeDeHonorarios(e.target.value);
                    if (error) {
                      setErroresDeLoPactado((previos) => ({ ...previos, honorariosPct: error }));
                      return;
                    }
                    const pct = leerPorcentajeDeHonorarios(e.target.value);
                    if (pct !== null && pct > 0 && pct !== config?.honorariosPct) {
                      void guardarConfig({ honorariosPct: pct });
                    }
                  }}
                  {...ariaDe('honorarios-pct', erroresDeLoPactado.honorariosPct)}
                  data-testid="honorarios-pct"
                />
              </label>
              <ErrorDelCampo id="honorarios-pct-error" mensaje={erroresDeLoPactado.honorariosPct} />
            </div>
            <div>
              <label className="text-sm" htmlFor="honorarios-tope">
                <span className="block text-xs text-fg-muted">Tope por caso (pesos)</span>
                <input
                  id="honorarios-tope"
                  className="mt-1 w-40 rounded-md border border-border bg-surface p-2 text-sm"
                  inputMode="numeric"
                  defaultValue={config?.honorariosTopeCop ?? ''}
                  disabled={!puedeMover || ocupado}
                  onChange={() => limpiarLoPactado('honorariosTopeCop')}
                  onBlur={(e) => {
                    // 🔁 Espejo del tope del back ($2.000.000.000): lo que no
                    // cabe se dice debajo del campo y no viaja.
                    const error = errorDelTopeDeHonorarios(e.target.value);
                    if (error) {
                      setErroresDeLoPactado((previos) => ({ ...previos, honorariosTopeCop: error }));
                      return;
                    }
                    const tope = leerTopeDeHonorarios(e.target.value);
                    if (tope !== null && tope !== config?.honorariosTopeCop) {
                      void guardarConfig({ honorariosTopeCop: tope });
                    }
                  }}
                  {...ariaDe('honorarios-tope', erroresDeLoPactado.honorariosTopeCop)}
                  data-testid="honorarios-tope"
                />
              </label>
              <ErrorDelCampo id="honorarios-tope-error" mensaje={erroresDeLoPactado.honorariosTopeCop} />
            </div>
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
                    onClick={() => void alternarAbogado(a)}
                  >
                    {a.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {puedeMover && (
            <div className="mt-3 flex flex-wrap items-start gap-2">
              <div>
                <input
                  id="abogado-nombre"
                  className="rounded-md border border-border bg-surface p-2 text-sm"
                  placeholder="Nombre del abogado"
                  aria-label="Nombre del abogado"
                  value={nombre}
                  maxLength={MAX_LARGO_DEL_NOMBRE_DEL_ABOGADO}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setErroresDelAbogado((previos) => ({ ...previos, nombre: undefined }));
                  }}
                  {...ariaDe('abogado-nombre', erroresDelAbogado.nombre)}
                  data-testid="abogado-nombre"
                />
                <ErrorDelCampo id="abogado-nombre-error" mensaje={erroresDelAbogado.nombre} />
              </div>
              <div>
                <input
                  id="abogado-documento"
                  className="rounded-md border border-border bg-surface p-2 text-sm"
                  placeholder="Cédula o NIT (opcional)"
                  aria-label="Cédula o NIT del abogado"
                  value={documento}
                  maxLength={MAX_LARGO_DEL_DOCUMENTO_DEL_ABOGADO}
                  onChange={(e) => {
                    setDocumento(e.target.value);
                    setErroresDelAbogado((previos) => ({ ...previos, documento: undefined }));
                  }}
                  {...ariaDe('abogado-documento', erroresDelAbogado.documento)}
                  data-testid="abogado-documento"
                />
                <ErrorDelCampo id="abogado-documento-error" mensaje={erroresDelAbogado.documento} />
              </div>
              <Button hideArrow disabled={ocupado} onClick={() => void registrarAbogado()} data-testid="registrar-abogado">
                Registrar
              </Button>
            </div>
          )}
        </section>

        {/* Movimiento (ola 2, 03-10-2026): al pasar un caso a jurídico, el
            sugerido SALE de su lista y el caso ENTRA en la de abajo; lo mismo
            al cerrar un caso o marcar un honorario pagado. */}
        {/* Sugeridos */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="sugeridos">
          <p className="text-body font-semibold text-fg">Sugeridos para jurídico</p>
          <p className="mt-1 text-body-sm text-fg-muted">
            90 días o más de mora y sin póliza. Es una sugerencia: pasar el caso lo decide una persona.
          </p>
          {sugeridos.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-muted">Ningún contrato cumple hoy.</p>
          ) : (
            <Stagger as="ul" className="mt-2 space-y-2" distance="xs">
              {sugeridos.map((s) => (
                <StaggerItem
                  as="li"
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
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        {/* Casos en jurídico */}
        <section className="rounded-lg border border-border bg-surface p-4" data-testid="casos">
          <p className="text-body font-semibold text-fg">En jurídico</p>
          {enJuridico.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-muted">Ningún caso en jurídico.</p>
          ) : (
            <Stagger as="ul" className="mt-2 space-y-2" distance="xs">
              {enJuridico.map((c) => (
                <StaggerItem
                  as="li"
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
                          setErrorDelMotivoDeCierre(null);
                        }}
                        data-testid={`cerrar-${c.id}`}
                      >
                        Cerrar el caso
                      </Button>
                    </span>
                  )}
                </StaggerItem>
              ))}
            </Stagger>
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
            <Stagger as="ul" className="mt-2 space-y-2" distance="xs">
              {porPagar.map((h) => (
                <StaggerItem
                  as="li"
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
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
        <AlertDialog
          open={cerrando !== null}
          onOpenChange={(abierto) => {
            if (!abierto && !ocupado) {
              setCerrando(null);
              setSinCobro(false);
            }
          }}
        >
          {/* Cerrar el caso es una confirmación; «sin cobro» anula los honorarios
              del estado de cuenta, y ahí pasa a destructiva (medallón y botón rojos). */}
          <AlertDialogContent
            variant={sinCobro ? 'destructive' : 'confirm'}
            icon={sinCobro ? <Prohibit weight="bold" /> : <Gavel weight="bold" />}
          >
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
                onChange={(e) => {
                  setMotivoDeCierre(e.target.value);
                  setErrorDelMotivoDeCierre(null);
                }}
                placeholder="El inquilino se puso al día y entregó el inmueble."
                rows={3}
                maxLength={500}
                {...ariaDe('motivo-cierre', errorDelMotivoDeCierre)}
              />
              <ErrorDelCampo
                id="motivo-cierre-error"
                mensaje={errorDelMotivoDeCierre}
                pista="Entre 5 y 500 caracteres."
              />
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
                disabled={motivoDeCierre.trim().length < 5}
                loading={ocupado}
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
