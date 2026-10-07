'use client';

/**
 * Configuración → Comercial — la regla de comisión de los asesores.
 *
 * 🔴 Nico, 04-10-2026 (TAL CUAL): «regla de comisión configurable por
 * inmobiliaria (por asesor o para todos: % de la comisión de la inmobiliaria
 * por captar y por cerrar, o fijo por cierre)». Es la comisión del ASESOR
 * dentro de la inmobiliaria; lo que Leasefy le cobra a la inmobiliaria no se
 * toca. Sólo el administrador (el gerente) la pone.
 *
 * Cada regla rige DESDE un mes: cambiarla no reescribe lo que ya se liquidó
 * por nómina. La de un asesor gana a la de todos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Handshake, Trash, UserCircle, Users } from '@phosphor-icons/react';
import { Collapse, Presence, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { MoneyInputNumerico } from '@/components/ui/money-input';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  comercialApi,
  mesDeHoy,
  nombreDelMes,
  textoDeLaRegla,
  type FormaDeLaRegla,
  type PersonaDelEquipo,
  type ReglaDeComision,
  type ReglasDeComision,
} from '@/lib/comercial/comercial';
import { EsqueletoDeSeccion } from './piezas';

/** De 6 meses atrás a 6 adelante: desde cuándo rige. */
function mesesParaElegir(hoy: string): string[] {
  const [a, m] = hoy.split('-').map(Number);
  return Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(a, m - 1 - 6 + i, 1)).toISOString().slice(0, 7));
}

function numeroDe(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** Valida el formulario como el back (`GuardarReglaDeComisionDto` + `guardarRegla`). */
export function errorDelFormulario(f: {
  forma: FormaDeLaRegla;
  pctCaptar: string;
  pctCerrar: string;
  fijo: number | undefined;
}): string | null {
  if (f.forma === 'FIJO_POR_CIERRE') {
    if (f.fijo === undefined || Number.isNaN(f.fijo) || f.fijo <= 0) {
      return 'Pon el valor fijo que gana el asesor por cada contrato que cierra (mayor que $ 0).';
    }
    return null;
  }
  const captar = numeroDe(f.pctCaptar);
  const cerrar = numeroDe(f.pctCerrar);
  const malo = (x: number | null) => x !== null && (Number.isNaN(x) || x < 0 || x > 100 || Math.round(x * 100) !== x * 100); // redondeo: no es plata (dos decimales de un porcentaje)
  if (malo(captar) || malo(cerrar)) return 'Cada porcentaje va entre 0 % y 100 %, con hasta dos decimales.';
  if ((captar ?? 0) <= 0 && (cerrar ?? 0) <= 0) return 'Pon el porcentaje por captar, por cerrar o ambos (al menos uno mayor que 0).';
  return null;
}

function FormularioDeRegla({
  asesor,
  inicial,
  alGuardar,
  alCancelar,
}: {
  asesor: PersonaDelEquipo | null;
  inicial: ReglaDeComision | null;
  alGuardar: () => void;
  alCancelar?: () => void;
}) {
  const hoy = useMemo(() => mesDeHoy(), []);
  const [forma, setForma] = useState<FormaDeLaRegla>(inicial?.forma ?? 'PORCENTAJE');
  const [pctCaptar, setPctCaptar] = useState(inicial?.pctCaptar != null ? String(inicial.pctCaptar) : '');
  const [pctCerrar, setPctCerrar] = useState(inicial?.pctCerrar != null ? String(inicial.pctCerrar) : '');
  const [fijo, setFijo] = useState<number | undefined>(inicial?.fijoPorCierreCop ?? undefined);
  const [desdeMes, setDesdeMes] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const idBase = asesor ? `regla-${asesor.userId}` : 'regla-todos';

  const guardar = async () => {
    const problema = errorDelFormulario({ forma, pctCaptar, pctCerrar, fijo });
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await comercialApi.guardarRegla({
        asesorUserId: asesor?.userId ?? null,
        desdeMes,
        forma,
        pctCaptar: forma === 'PORCENTAJE' ? numeroDe(pctCaptar) : null,
        pctCerrar: forma === 'PORCENTAJE' ? numeroDe(pctCerrar) : null,
        fijoPorCierreCop: forma === 'FIJO_POR_CIERRE' ? (fijo ?? null) : null,
      });
      toast.success(
        asesor
          ? `Regla de ${asesor.nombre} guardada. Rige desde ${nombreDelMes(desdeMes).toLowerCase()}.`
          : `Regla de todos los asesores guardada. Rige desde ${nombreDelMes(desdeMes).toLowerCase()}.`,
      );
      alGuardar();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No se pudo guardar la regla.', accion: 'guardar la regla' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4" data-testid={`formulario-${idBase}`}>
      <div className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SegmentedControl<FormaDeLaRegla>
          value={forma}
          onChange={(v) => {
            setForma(v);
            setError(null);
          }}
          aria-label="Cómo se calcula"
          options={[
            { value: 'PORCENTAJE', label: '% de la comisión', ariaLabel: 'Porcentaje de la comisión de la inmobiliaria' },
            { value: 'FIJO_POR_CIERRE', label: 'Fijo por cierre', ariaLabel: 'Valor fijo por cada contrato que cierra' },
          ]}
        />
      </div>

      {forma === 'PORCENTAJE' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1" htmlFor={`${idBase}-captar`}>
            <span className="block text-sm font-medium">Por captar</span>
            <span className="block text-caption text-fg-muted">Para quien consiguió el inmueble (el agente asignado).</span>
            <div className="flex items-center gap-2">
              <Input
                id={`${idBase}-captar`}
                inputMode="decimal"
                placeholder="0"
                className="w-28 text-right tabular-nums"
                value={pctCaptar}
                onChange={(e) => setPctCaptar(e.target.value)}
                data-testid="pct-captar"
              />
              <span className="text-sm text-fg-muted">%</span>
            </div>
          </label>
          <label className="space-y-1" htmlFor={`${idBase}-cerrar`}>
            <span className="block text-sm font-medium">Por cerrar</span>
            <span className="block text-caption text-fg-muted">Para quien cerró el contrato (el asesor del embudo).</span>
            <div className="flex items-center gap-2">
              <Input
                id={`${idBase}-cerrar`}
                inputMode="decimal"
                placeholder="0"
                className="w-28 text-right tabular-nums"
                value={pctCerrar}
                onChange={(e) => setPctCerrar(e.target.value)}
                data-testid="pct-cerrar"
              />
              <span className="text-sm text-fg-muted">%</span>
            </div>
          </label>
          <p className="sm:col-span-2 text-caption text-fg-muted">
            Cada mes, sobre la comisión que la inmobiliaria ya le facturó al propietario por ese contrato.
          </p>
        </div>
      ) : (
        <label className="block space-y-1" htmlFor={`${idBase}-fijo`}>
          <span className="block text-sm font-medium">Valor por cada contrato que cierra</span>
          <span className="block text-caption text-fg-muted">
            Una vez, el mes en que empieza el contrato. Queda ganado cuando la inmobiliaria factura la comisión de ese primer mes.
          </span>
          <MoneyInputNumerico
            id={`${idBase}-fijo`}
            value={fijo}
            onChange={(v) => setFijo(Number.isNaN(v) ? undefined : v)}
            className="w-48"
            data-testid="fijo-por-cierre"
          />
        </label>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="space-y-1 w-full sm:w-56">
          <span className="block text-sm font-medium">Rige desde</span>
          <Select value={desdeMes} onValueChange={setDesdeMes}>
            <SelectTrigger aria-label="Rige desde" data-testid="desde-mes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mesesParaElegir(hoy).map((m) => (
                <SelectItem key={m} value={m}>
                  {nombreDelMes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex gap-2">
          {alCancelar ? (
            <Button variant="ghost" hideArrow onClick={alCancelar}>
              Cancelar
            </Button>
          ) : null}
          <Button hideArrow isLoading={guardando} onClick={() => void guardar()} data-testid="guardar-regla">
            Guardar la regla
          </Button>
        </div>
      </div>
      <Presence show={Boolean(error)}>
        <p role="alert" className="text-sm text-danger" data-testid="error-regla">
          {error}
        </p>
      </Presence>
    </div>
  );
}

function ultimaPropia(reglas: ReglaDeComision[], userId: string, mes: string): ReglaDeComision | null {
  return (
    reglas
      .filter((r) => r.asesorUserId === userId && r.desdeMes <= mes)
      .sort((a, b) => (a.desdeMes < b.desdeMes ? 1 : -1))[0] ?? null
  );
}

export function SeccionComercial() {
  const [datos, setDatos] = useState<ReglasDeComision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editandoTodos, setEditandoTodos] = useState(false);
  const [editandoAsesor, setEditandoAsesor] = useState<string | null>(null);
  const hoy = useMemo(() => mesDeHoy(), []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await comercialApi.reglas());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const borrar = async (r: ReglaDeComision) => {
    await confirmar({
      titulo: `¿Borrar la regla que rige desde ${nombreDelMes(r.desdeMes).toLowerCase()}?`,
      descripcion: r.asesorUserId
        ? `${r.asesorNombre ?? 'El asesor'} vuelve a la regla de todos desde ese mes.`
        : 'Desde ese mes rige la regla de todos anterior; si no hay, los asesores quedan sin regla.',
      destructivo: true,
      accion: 'Borrar la regla',
      alConfirmar: async () => {
        try {
          await comercialApi.borrarRegla(r.id);
          toast.success('Regla borrada.');
          await cargar();
        } catch (e) {
          toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo borrar la regla.', accion: 'borrar la regla' }));
          throw e;
        }
      },
    });
  };

  if (cargando || error || !datos) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs="la comisión de los asesores"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={4} />}
      >
        <div />
      </EstadoDeDatos>
    );
  }

  const deTodos = datos.vigenteDeTodos;
  const sinNinguna = datos.reglas.length === 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Cuánto gana cada asesor. Es la comisión de tu equipo dentro de la inmobiliaria: Leasefy la calcula sobre lo que la
        inmobiliaria de verdad ganó cada mes y la muestra en{' '}
        <Link href="/panel/inmobiliaria/pipeline/comisiones" className="text-primary underline-offset-2 hover:underline">
          Comisiones y metas
        </Link>
        , lista para nómina.
      </p>

      <Presence show={sinNinguna && !editandoTodos}>
        <div className="rounded-md bg-warning-soft border border-border p-4" data-testid="configura-la-comision">
          <p className="text-sm font-medium">Configura la comisión de tus asesores</p>
          <p className="text-sm text-fg-muted mt-1">
            Mientras no haya regla, Leasefy no calcula ninguna comisión: no inventa un porcentaje.
          </p>
        </div>
      </Presence>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-6 space-y-4 shadow-sm" data-testid="regla-de-todos">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold">Para todos los asesores</h3>
              <p className="text-sm text-fg-muted" data-testid="texto-regla-de-todos">
                {deTodos
                  ? `${textoDeLaRegla(deTodos)} · desde ${nombreDelMes(deTodos.desdeMes).toLowerCase()}`
                  : 'Sin regla'}
              </p>
            </div>
          </div>
          {!editandoTodos ? (
            <Button size="sm" variant={deTodos ? 'secondary' : 'default'} hideArrow onClick={() => setEditandoTodos(true)} data-testid="editar-regla-de-todos">
              {deTodos ? 'Cambiar' : 'Poner la regla'}
            </Button>
          ) : null}
        </div>
        <Collapse open={editandoTodos}>
          {editandoTodos ? (
            <FormularioDeRegla
              asesor={null}
              inicial={deTodos}
              alCancelar={() => setEditandoTodos(false)}
              alGuardar={() => {
                setEditandoTodos(false);
                void cargar();
              }}
            />
          ) : null}
        </Collapse>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-6 space-y-4 shadow-sm" data-testid="reglas-por-asesor">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
            <UserCircle className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Regla propia de un asesor</h3>
            <p className="text-sm text-fg-muted">Si un asesor tiene la suya, gana a la de todos.</p>
          </div>
        </div>
        {datos.asesores.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no hay asesores en el equipo. Invítalos en Equipo.</p>
        ) : (
          <Stagger as="ul" className="divide-y divide-border">
            {datos.asesores.map((a) => {
              const propia = ultimaPropia(datos.reglas, a.userId, hoy);
              const abierto = editandoAsesor === a.userId;
              return (
                <StaggerItem as="li" key={a.userId} className="py-3 space-y-3" data-testid={`asesor-${a.userId}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.nombre}</p>
                      <p className="text-caption text-fg-muted">
                        {propia
                          ? `${textoDeLaRegla(propia)} · desde ${nombreDelMes(propia.desdeMes).toLowerCase()}`
                          : deTodos
                            ? 'Usa la regla de todos'
                            : 'Sin regla'}
                      </p>
                    </div>
                    {!abierto ? (
                      <Button size="sm" variant="secondary" hideArrow onClick={() => setEditandoAsesor(a.userId)} data-testid="regla-propia">
                        {propia ? 'Cambiar su regla' : 'Ponerle una regla propia'}
                      </Button>
                    ) : null}
                  </div>
                  <Collapse open={abierto}>
                    {abierto ? (
                      <FormularioDeRegla
                        asesor={a}
                        inicial={propia ?? deTodos}
                        alCancelar={() => setEditandoAsesor(null)}
                        alGuardar={() => {
                          setEditandoAsesor(null);
                          void cargar();
                        }}
                      />
                    ) : null}
                  </Collapse>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>

      {datos.reglas.length > 0 ? (
        <section className="space-y-2" data-testid="historial-de-reglas">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Handshake className="w-4 h-4" aria-hidden="true" />
            Todas las reglas
          </h3>
          <p className="text-caption text-fg-muted">
            Cada una rige desde su mes hasta que empieza otra. Las de meses ya pagados se quedan para que la nómina de ese mes no cambie.
          </p>
          <Stagger as="ul" className="rounded-lg border border-border divide-y divide-border bg-surface">
            {datos.reglas.map((r) => (
              <StaggerItem as="li" key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.asesorUserId ? (r.asesorNombre ?? 'Asesor') : 'Todos los asesores'} · desde {nombreDelMes(r.desdeMes).toLowerCase()}
                  </p>
                  <p className="text-caption text-fg-muted">{textoDeLaRegla(r)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  hideArrow
                  onClick={() => void borrar(r)}
                  aria-label={`Borrar la regla de ${r.asesorNombre ?? 'todos los asesores'} desde ${nombreDelMes(r.desdeMes)}`}
                  data-testid="borrar-regla"
                >
                  <Trash className="w-4 h-4" aria-hidden="true" />
                </Button>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}
    </div>
  );
}
