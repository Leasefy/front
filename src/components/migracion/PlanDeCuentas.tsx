'use client';

/**
 * Paso 4 de la migración: el plan de cuentas (PUC).
 *
 * ── Por qué arranca con un botón y no con un formulario ────────────────────
 *
 * Nadie escribe 99 cuentas a mano el primer día. La semilla del back
 * (`POST /contabilidad/puc/semilla`) crea las del Decreto 2650 que una
 * inmobiliaria usa —caja, bancos, cartera de arrendamientos, lo que se le
 * debe a los propietarios, comisiones, gastos— y las deja editables. Una de
 * ellas viene marcada «pendiente de confirmar»: el sistema no puede decidir
 * por el contador, así que se le muestra bien arriba, no escondida en el
 * árbol.
 *
 * ── Lo que esta pantalla NO hace ───────────────────────────────────────────
 *
 * No cambia códigos (el DTO de actualizar no lo admite: un código es una
 * cuenta; otro código es otra cuenta) ni borra cuentas con movimientos. Las
 * reglas de árbol (la hija empieza con el código del padre; el padre deja de
 * ser imputable) las aplica el back y acá sólo se explican.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  CheckCircle,
  FileArrowUp,
  Info,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Warning,
  X,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_CODIGO,
  LARGO_MAXIMO_DE_NOMBRE,
  LARGO_MINIMO_DE_NOMBRE,
  type CuentaEnArbol,
  type CuentaPuc,
  type CuentaSemilla,
  type NaturalezaContable,
  type ResultadoSemilla,
} from '@/lib/api/contabilidad.service';

import { mensajeDeContabilidad } from './contabilidad-errores';
import { ImportarCuentas } from './ImportarCuentas';

export const RUTA_DEL_PASO_5 = '/panel/inmobiliaria/migracion/contables';

/** Sentinel: Radix `Select` no admite `value=""`. */
const SIN_PADRE = '__raiz__';

// ── Helpers puros ───────────────────────────────────────────────────────────

function aplanar(nodos: readonly CuentaEnArbol[], acc: CuentaPuc[] = []): CuentaPuc[] {
  for (const n of nodos) {
    const { hijas, ...cuenta } = n;
    acc.push(cuenta);
    aplanar(hijas, acc);
  }
  return acc;
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function coincide(c: CuentaPuc, q: string): boolean {
  return c.codigo.startsWith(q) || normalizar(c.nombre).includes(q);
}

/** Deja los nodos que coinciden o que tienen una descendiente que coincide. */
function filtrar(nodos: readonly CuentaEnArbol[], q: string): CuentaEnArbol[] {
  const salida: CuentaEnArbol[] = [];
  for (const n of nodos) {
    const hijas = filtrar(n.hijas, q);
    if (coincide(n, q) || hijas.length > 0) salida.push({ ...n, hijas });
  }
  return salida;
}

/** Clase 1 · grupo 2 · cuenta 4 · subcuenta 6 · auxiliares 7+. */
function nivelDe(codigo: string): number {
  const l = codigo.length;
  if (l <= 1) return 0;
  if (l <= 2) return 1;
  if (l <= 4) return 2;
  if (l <= 6) return 3;
  return 4;
}

function nombreDeNivel(codigo: string): string {
  return ['Clase', 'Grupo', 'Cuenta', 'Subcuenta', 'Auxiliar'][nivelDe(codigo)];
}

/** El padre que el back va a elegir si no se manda uno: el prefijo más largo. */
function padreSugerido(codigo: string, cuentas: readonly CuentaPuc[]): CuentaPuc | null {
  let mejor: CuentaPuc | null = null;
  for (const c of cuentas) {
    if (c.codigo.length < codigo.length && codigo.startsWith(c.codigo)) {
      if (!mejor || c.codigo.length > mejor.codigo.length) mejor = c;
    }
  }
  return mejor;
}

// ── Componente ──────────────────────────────────────────────────────────────

type Formulario =
  | { modo: 'crear'; padre: CuentaPuc | null }
  | { modo: 'editar'; cuenta: CuentaPuc };

/**
 * `onContinuar`: adentro del muro de migración no se navega a otra ruta — el
 * paso 5 se abre en el mismo muro. Sin el callback (la página suelta, ya con
 * el muro abajo) sigue siendo un enlace a la ruta del paso 5.
 *
 * `sinPaso5`: fuera de la migración (`/contabilidad/puc`) no hay secuencia
 * que seguir, así que el pie no se pinta. Por defecto `false`: las pantallas
 * del muro no cambian.
 */
export function PlanDeCuentas({
  onContinuar,
  sinPaso5 = false,
  onOcupado,
}: {
  onContinuar?: () => void;
  sinPaso5?: boolean;
  /** Aviso al muro mientras se siembra el plan base: el pie espera. */
  onOcupado?: (ocupado: boolean) => void;
} = {}) {
  const [arbol, setArbol] = useState<CuentaEnArbol[] | null>(null);
  const [pendientes, setPendientes] = useState<CuentaSemilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  /*
   * 🔴 «No pude leer» NO es «no hay plan». Sin esta distinción, una caída de
   * red pintaba la pantalla de «Todavía no hay plan de cuentas» e invitaba a
   * sembrar — a alguien que quizás ya tiene 300 cuentas con movimientos. Con
   * el fallo marcado, lo que se ofrece es reintentar la lectura.
   */
  const [falloDeCarga, setFalloDeCarga] = useState(false);
  const [sembrando, setSembrando] = useState(false);
  const [semilla, setSemilla] = useState<ResultadoSemilla | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cerradas, setCerradas] = useState<Set<string>>(new Set());
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  /**
   * La importación desde archivo. Nico: «tanto el PUC como los registros
   * contables, ellos tienden a tener un CSV para cada uno». Convive con la
   * semilla y con crear a mano — son tres puertas al mismo plan.
   */
  const [importando, setImportando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, p] = await Promise.allSettled([
      contabilidadApi.puc.arbol(),
      contabilidadApi.puc.semillaPendientes(),
    ]);
    if (a.status === 'fulfilled') {
      setArbol(a.value);
      setError(null);
      setFalloDeCarga(false);
    } else {
      setArbol((previo) => previo ?? []);
      setFalloDeCarga(true);
      setError(mensajeDeContabilidad(a.reason, 'No pudimos leer el plan de cuentas.'));
    }
    // La lista de pendientes es un catálogo estático: si falla, no frena nada.
    if (p.status === 'fulfilled') setPendientes(p.value.cuentas);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const plano = useMemo(() => (arbol ? aplanar(arbol) : []), [arbol]);
  const porCodigo = useMemo(() => new Map(plano.map((c) => [c.codigo, c])), [plano]);
  const q = normalizar(busqueda);
  const visible = useMemo(() => (arbol ? (q ? filtrar(arbol, q) : arbol) : []), [arbol, q]);

  const sembrar = async () => {
    setSembrando(true);
    onOcupado?.(true);
    setError(null);
    try {
      const r = await contabilidadApi.puc.sembrar();
      setSemilla(r);
      await cargar();
    } catch (e) {
      const msg = mensajeDeContabilidad(e, 'No pudimos cargar el plan base. Intentá de nuevo.');
      /*
       * La siembra escribe por niveles: un corte a la mitad deja clases y
       * grupos ya creados. Se relee ANTES de mostrar el error para que la
       * pantalla refleje lo que sí alcanzó a entrar — reintentar es seguro,
       * la semilla sólo crea lo que falta. (`cargar` limpia `error` si la
       * lectura sale bien; por eso el mensaje se pone después.)
       */
      await cargar();
      setError(msg);
    } finally {
      setSembrando(false);
      onOcupado?.(false);
    }
  };

  const alternar = (id: string) =>
    setCerradas((previo) => {
      const s = new Set(previo);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const guardado = async () => {
    setFormulario(null);
    await cargar();
  };

  if (arbol === null) {
    return (
      <p className="text-sm text-fg-muted" role="status" data-testid="puc-cargando">
        Leyendo tu plan de cuentas…
      </p>
    );
  }

  const hayCuentas = plano.length > 0;
  const imputables = plano.filter((c) => c.imputable && c.activa).length;

  return (
    <div className="space-y-6">
      {error ? (
        <div
          className="flex flex-wrap items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="min-w-0 flex-1 text-sm text-fg">{error}</p>
          {/* Reintentar sólo cuando lo que falló fue LEER: sembrar y guardar
              tienen su propio botón al lado de donde fallaron. */}
          {falloDeCarga ? (
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => void cargar()}
              data-testid="puc-reintentar"
            >
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {semilla ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-success-soft p-3"
          data-testid="puc-semilla-resultado"
        >
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" />
          <p className="text-sm text-fg">
            {semilla.creadas > 0
              ? `Se crearon ${semilla.creadas} cuentas del plan base.`
              : 'El plan base ya estaba cargado: no se creó ninguna cuenta nueva.'}
            {semilla.existentes > 0 && semilla.creadas > 0
              ? ` ${semilla.existentes} ya existían y se dejaron como estaban.`
              : ''}
          </p>
        </div>
      ) : null}

      {/* Con la lectura caída no sabemos si hay plan: ofrecer la semilla acá
          sería invitar a sembrar sobre un plan que no vimos. */}
      {!hayCuentas && !falloDeCarga ? (
        <SinPlan
          sembrando={sembrando}
          onSembrar={sembrar}
          onAMano={() => setFormulario({ modo: 'crear', padre: null })}
          onSubirArchivo={() => setImportando(true)}
        />
      ) : null}

      {importando ? (
        <ImportarCuentas
          onImportado={() => void cargar()}
          onCerrar={() => setImportando(false)}
          onOcupado={onOcupado}
        />
      ) : null}

      {formulario ? (
        <FormularioDeCuenta
          // 🔴 La `key` remonta el formulario al cambiar de cuenta. Sin ella,
          // con el formulario abierto en A, «Editar» en B cambiaba el título
          // pero los `useState` del formulario seguían con los datos de A: el
          // PATCH iba a B con nombre/naturaleza/activa de A (auditoría
          // 2026-09-01).
          key={formulario.modo === 'editar' ? formulario.cuenta.id : `crear:${formulario.padre?.id ?? 'raiz'}`}
          formulario={formulario}
          cuentas={plano}
          onCancelar={() => setFormulario(null)}
          onGuardado={guardado}
        />
      ) : null}

      {hayCuentas && pendientes.length > 0 ? (
        <PendientesDelContador
          pendientes={pendientes}
          porCodigo={porCodigo}
          onEditar={(cuenta) => setFormulario({ modo: 'editar', cuenta })}
          onCambio={cargar}
        />
      ) : null}

      {hayCuentas ? (
        <section
          className="rounded-lg border border-border bg-surface p-6 shadow-sm"
          aria-labelledby="puc-arbol-titulo"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="puc-arbol-titulo" className="font-medium text-fg">
                Tu plan de cuentas
              </h2>
              <p className="text-sm text-fg-muted" data-testid="puc-resumen">
                {plano.length} cuentas · {imputables} reciben movimientos
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código o nombre"
                  aria-label="Buscar cuenta por código o nombre"
                  className="w-64 pl-8"
                  data-testid="puc-buscar"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                hideArrow
                onClick={() => setImportando(true)}
                data-testid="puc-subir-archivo"
              >
                <FileArrowUp className="mr-1.5 h-3.5 w-3.5" />
                Subir archivo
              </Button>
              <Button
                size="sm"
                variant="outline"
                hideArrow
                onClick={() => setFormulario({ modo: 'crear', padre: null })}
                data-testid="puc-nueva-cuenta"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nueva cuenta
              </Button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">
              Ninguna cuenta coincide con «{busqueda}».
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border-faint" data-testid="puc-arbol">
              {visible.map((n) => (
                <Nodo
                  key={n.id}
                  nodo={n}
                  abierto={(id) => Boolean(q) || !cerradas.has(id)}
                  onAlternar={alternar}
                  onEditar={(cuenta) => setFormulario({ modo: 'editar', cuenta })}
                  onSubcuenta={(padre) => setFormulario({ modo: 'crear', padre })}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {hayCuentas && !sinPaso5 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-fg-muted">
            Cuando el plan esté como tu contador lo quiere, seguí con los registros contables.
          </p>
          {onContinuar ? (
            <Button hideArrow onClick={onContinuar} data-testid="puc-continuar">
              Continuar al paso 5
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button asChild hideArrow>
              <Link href={RUTA_DEL_PASO_5} data-testid="puc-continuar">
                Continuar al paso 5
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function SinPlan({
  sembrando,
  onSembrar,
  onAMano,
  onSubirArchivo,
}: {
  sembrando: boolean;
  onSembrar: () => void;
  onAMano: () => void;
  onSubirArchivo: () => void;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
      aria-labelledby="puc-vacio-titulo"
      data-testid="puc-vacio"
    >
      <h2 id="puc-vacio-titulo" className="font-medium text-fg">
        Todavía no hay plan de cuentas
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-fg-muted">
        Si ya tenés uno en tu sistema actual, subilo: entra con tus códigos, que son los que tu
        contador conoce. Si no, arrancá con el plan base: las cuentas del Decreto 2650 que usa
        una inmobiliaria —caja y bancos, la cartera de arrendamientos, lo que se le debe a los
        propietarios, las comisiones, los gastos—. Son unas cien entre clases, grupos, cuentas y
        subcuentas.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-fg-muted">
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          Todas quedan editables: podés renombrar, desactivar y agregar las tuyas.
        </li>
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          Una queda marcada para que tu contador la confirme: te la mostramos arriba de todo.
        </li>
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          Si ya tenés cuentas cargadas, no las toca.
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={onSubirArchivo}
          disabled={sembrando}
          hideArrow
          data-testid="puc-vacio-subir-archivo"
        >
          <FileArrowUp className="mr-1.5 h-4 w-4" />
          Subir mi plan de cuentas
        </Button>
        <Button
          variant="outline"
          onClick={onSembrar}
          isLoading={sembrando}
          hideArrow
          data-testid="puc-sembrar"
        >
          Cargar el plan de cuentas base
        </Button>
        <Button variant="ghost" onClick={onAMano} disabled={sembrando} hideArrow>
          Crear las cuentas a mano
        </Button>
      </div>
    </section>
  );
}

function PendientesDelContador({
  pendientes,
  porCodigo,
  onEditar,
  onCambio,
}: {
  pendientes: CuentaSemilla[];
  porCodigo: Map<string, CuentaPuc>;
  onEditar: (cuenta: CuentaPuc) => void;
  onCambio: () => Promise<void>;
}) {
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const desactivar = async (cuenta: CuentaPuc) => {
    setOcupada(cuenta.id);
    setError(null);
    try {
      await contabilidadApi.puc.actualizar(cuenta.id, { activa: false });
      await onCambio();
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No pudimos desactivar la cuenta.'));
    } finally {
      setOcupada(null);
    }
  };

  return (
    <section
      className="rounded-lg border border-warning bg-warning-soft p-5"
      aria-labelledby="puc-pendientes-titulo"
      data-testid="puc-pendientes"
    >
      <div className="flex items-start gap-2">
        <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <h2 id="puc-pendientes-titulo" className="font-medium text-fg">
            {pendientes.length === 1
              ? 'Una cuenta para confirmar con tu contador'
              : `${pendientes.length} cuentas para confirmar con tu contador`}
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            El plan base las trae con el código más usado, pero no es una decisión del sistema.
            Si tu contador usa otro código, creá la cuenta con el suyo y desactivá ésta.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {pendientes.map((p) => {
          const cargada = porCodigo.get(p.codigo);
          return (
            <li
              key={p.codigo}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface p-3"
              data-testid={`puc-pendiente-${p.codigo}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-fg">
                  <span className="font-mono tabular-nums">{p.codigo}</span> · {p.nombre}
                </p>
                {p.nota ? <p className="mt-0.5 text-sm text-fg-muted">{p.nota}</p> : null}
                {p.uso ? <p className="mt-0.5 text-xs text-fg-subtle">{p.uso}</p> : null}
                {!cargada ? (
                  <p className="mt-1 text-xs text-fg-subtle">No está en tu plan.</p>
                ) : !cargada.activa ? (
                  <p className="mt-1 text-xs text-fg-subtle">Desactivada.</p>
                ) : null}
              </div>
              {cargada && cargada.activa ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" hideArrow onClick={() => onEditar(cargada)}>
                    <PencilSimple className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    hideArrow
                    isLoading={ocupada === cargada.id}
                    onClick={() => desactivar(cargada)}
                  >
                    Desactivar
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Nodo({
  nodo,
  abierto,
  onAlternar,
  onEditar,
  onSubcuenta,
}: {
  nodo: CuentaEnArbol;
  abierto: (id: string) => boolean;
  onAlternar: (id: string) => void;
  onEditar: (cuenta: CuentaPuc) => void;
  onSubcuenta: (padre: CuentaPuc) => void;
}) {
  const tieneHijas = nodo.hijas.length > 0;
  const estaAbierto = abierto(nodo.id);
  const nivel = nivelDe(nodo.codigo);
  const { hijas, ...cuenta } = nodo;

  return (
    <li>
      <div
        className={`group flex flex-wrap items-center gap-2 py-1.5 ${
          nodo.activa ? '' : 'opacity-60'
        }`}
        style={{ paddingLeft: `${nivel * 1.25}rem` }}
        data-testid={`puc-nodo-${nodo.codigo}`}
      >
        {tieneHijas ? (
          <button
            type="button"
            onClick={() => onAlternar(nodo.id)}
            aria-expanded={estaAbierto}
            aria-label={estaAbierto ? `Contraer ${nodo.codigo}` : `Expandir ${nodo.codigo}`}
            className="flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:bg-surface-muted hover:text-fg"
          >
            {estaAbierto ? <CaretDown className="h-3.5 w-3.5" /> : <CaretRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-5 w-5" aria-hidden />
        )}
        <span
          className={`font-mono text-sm tabular-nums ${nivel <= 1 ? 'font-semibold text-fg' : 'text-fg'}`}
        >
          {nodo.codigo}
        </span>
        <span className={`min-w-0 text-sm ${nivel <= 1 ? 'font-medium text-fg' : 'text-fg'}`}>
          {nodo.nombre}
        </span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">
          {nodo.naturaleza === 'DEBITO' ? 'Débito' : 'Crédito'}
        </span>
        {nodo.imputable ? (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
            Imputable
          </span>
        ) : null}
        {!nodo.activa ? (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-subtle">
            Inactiva
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            hideArrow
            onClick={() => onEditar(cuenta)}
            aria-label={`Editar ${nodo.codigo} ${nodo.nombre}`}
          >
            <PencilSimple className="h-3.5 w-3.5" />
          </Button>
          {nodo.activa ? (
            <Button
              size="sm"
              variant="ghost"
              hideArrow
              onClick={() => onSubcuenta(cuenta)}
              aria-label={`Agregar subcuenta a ${nodo.codigo}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </span>
      </div>
      {tieneHijas && estaAbierto ? (
        <ul className="divide-y divide-border-faint border-t border-border-faint">
          {hijas.map((h) => (
            <Nodo
              key={h.id}
              nodo={h}
              abierto={abierto}
              onAlternar={onAlternar}
              onEditar={onEditar}
              onSubcuenta={onSubcuenta}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function FormularioDeCuenta({
  formulario,
  cuentas,
  onCancelar,
  onGuardado,
}: {
  formulario: Formulario;
  cuentas: CuentaPuc[];
  onCancelar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const editando = formulario.modo === 'editar' ? formulario.cuenta : null;
  const padreInicial = formulario.modo === 'crear' ? formulario.padre : null;

  const [codigo, setCodigo] = useState(editando?.codigo ?? padreInicial?.codigo ?? '');
  const [nombre, setNombre] = useState(editando?.nombre ?? '');
  const [naturaleza, setNaturaleza] = useState<NaturalezaContable>(
    editando?.naturaleza ?? padreInicial?.naturaleza ?? 'DEBITO',
  );
  const [padreId, setPadreId] = useState<string>(padreInicial?.id ?? SIN_PADRE);
  const [imputable, setImputable] = useState(editando?.imputable ?? true);
  const [activa, setActiva] = useState(editando?.activa ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordenadas = useMemo(
    () => [...cuentas].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [cuentas],
  );
  const padreElegido = padreId === SIN_PADRE ? null : (cuentas.find((c) => c.id === padreId) ?? null);
  const sugerido = !editando && padreId === SIN_PADRE ? padreSugerido(codigo, cuentas) : null;

  const codigoValido = /^\d+$/.test(codigo) && codigo.length <= LARGO_MAXIMO_DE_CODIGO;
  const nombreValido =
    nombre.trim().length >= LARGO_MINIMO_DE_NOMBRE && nombre.trim().length <= LARGO_MAXIMO_DE_NOMBRE;
  const fueraDelArbol =
    !editando && padreElegido !== null &&
    !(codigo.startsWith(padreElegido.codigo) && codigo.length > padreElegido.codigo.length);
  const puedeGuardar = codigoValido && nombreValido && !fueraDelArbol && !guardando;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await contabilidadApi.puc.actualizar(editando.id, {
          nombre: nombre.trim(),
          naturaleza,
          imputable,
          activa,
        });
      } else {
        await contabilidadApi.puc.crear({
          codigo,
          nombre: nombre.trim(),
          naturaleza,
          imputable,
          ...(padreElegido ? { padreId: padreElegido.id } : {}),
        });
      }
      await onGuardado();
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No pudimos guardar la cuenta.'));
      setGuardando(false);
    }
  };

  return (
    <section
      className="rounded-lg border border-primary bg-surface p-6 shadow-sm"
      aria-labelledby="puc-formulario-titulo"
      data-testid="puc-formulario"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="puc-formulario-titulo" className="font-medium text-fg">
            {editando
              ? `Editar ${editando.codigo} · ${editando.nombre}`
              : padreInicial
                ? `Nueva subcuenta de ${padreInicial.codigo} · ${padreInicial.nombre}`
                : 'Nueva cuenta'}
          </h2>
          {editando ? (
            <p className="mt-0.5 text-sm text-fg-muted">
              El código no se cambia: un código es una cuenta. Si necesitás otro, creá una cuenta
              nueva y desactivá ésta.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-fg-muted">
              El código dice dónde cuelga: 1 es la clase, 11 el grupo, 1105 la cuenta, 110505 la
              subcuenta. Una hija empieza con el código de su padre.
            </p>
          )}
        </div>
        <Button size="sm" variant="ghost" hideArrow onClick={onCancelar} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="puc-codigo" className="text-sm font-medium text-fg">
            Código
          </label>
          <Input
            id="puc-codigo"
            value={codigo}
            inputMode="numeric"
            maxLength={LARGO_MAXIMO_DE_CODIGO}
            disabled={Boolean(editando)}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            aria-invalid={codigo.length > 0 && (!codigoValido || fueraDelArbol)}
            aria-describedby="puc-codigo-ayuda"
            data-testid="puc-codigo"
          />
          <p id="puc-codigo-ayuda" className="text-xs text-fg-subtle">
            {fueraDelArbol
              ? `Tiene que empezar con ${padreElegido?.codigo} y ser más largo.`
              : sugerido
                ? `${nombreDeNivel(codigo)} · va a colgar de ${sugerido.codigo} ${sugerido.nombre}.`
                : codigo
                  ? `${nombreDeNivel(codigo)}.`
                  : 'Sólo dígitos.'}
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="puc-nombre" className="text-sm font-medium text-fg">
            Nombre
          </label>
          <Input
            id="puc-nombre"
            value={nombre}
            maxLength={LARGO_MAXIMO_DE_NOMBRE}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={nombre.length > 0 && !nombreValido}
            data-testid="puc-nombre"
          />
          <p className="text-xs text-fg-subtle">Como lo llama tu contador. Mínimo 3 letras.</p>
        </div>

        <div className="space-y-1">
          <label id="puc-naturaleza-etiqueta" className="text-sm font-medium text-fg">
            Naturaleza
          </label>
          <Select value={naturaleza} onValueChange={(v) => setNaturaleza(v as NaturalezaContable)}>
            <SelectTrigger aria-labelledby="puc-naturaleza-etiqueta" data-testid="puc-naturaleza">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBITO">Débito (activos, gastos, costos)</SelectItem>
              <SelectItem value="CREDITO">Crédito (pasivos, patrimonio, ingresos)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!editando ? (
          <div className="space-y-1">
            <label id="puc-padre-etiqueta" className="text-sm font-medium text-fg">
              Cuenta padre
            </label>
            <Select value={padreId} onValueChange={setPadreId}>
              <SelectTrigger aria-labelledby="puc-padre-etiqueta" data-testid="puc-padre">
                <SelectValue placeholder="Automática por el código" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_PADRE}>Automática por el código</SelectItem>
                {ordenadas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} · {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-fg-subtle">
              Si el padre recibía movimientos, deja de hacerlo: pasan a las subcuentas.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <label className="flex items-start gap-2 text-sm text-fg">
          <Checkbox
            checked={imputable}
            onCheckedChange={(c) => setImputable(c === true)}
            data-testid="puc-imputable"
          />
          <span>
            Recibe movimientos
            <span className="block text-xs text-fg-subtle">
              Las cuentas con subcuentas no: los movimientos van en la subcuenta.
            </span>
          </span>
        </label>
        {editando ? (
          <label className="flex items-start gap-2 text-sm text-fg">
            <Checkbox checked={activa} onCheckedChange={(c) => setActiva(c === true)} />
            <span>
              Activa
              <span className="block text-xs text-fg-subtle">
                Inactiva no se puede usar en asientos nuevos; el historial se conserva.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3" role="alert">
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button onClick={guardar} disabled={!puedeGuardar} isLoading={guardando} hideArrow data-testid="puc-guardar">
          {editando ? 'Guardar cambios' : 'Crear la cuenta'}
        </Button>
        <Button variant="outline" onClick={onCancelar} disabled={guardando} hideArrow>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
