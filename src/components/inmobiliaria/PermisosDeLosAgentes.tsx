'use client';

/**
 * 🔴 PERMISOS DE LOS AGENTES (Nico, 14-10-2026, auditoría de roles: «Permisos
 * de los agentes»).
 *
 * «Permisos» editaba sólo los módulos del panel: Cobranza (Mori),
 * Asegurabilidad (el cotizador) y Cuentas por pagar viven en el micro, y
 * ninguna inmobiliaria podía darlos ni quitarlos por rol o por persona aunque
 * el back ya los guarda y el micro los lee (`/internal/miembro`). Este bloque
 * los edita.
 *
 * Al guardar se manda la matriz del panel TAL CUAL la devolvió el back más las
 * tres llaves del micro: así no se pisa nada de lo que la pantalla de arriba
 * edita (el back conserva lo que no viene).
 */

import { useEffect, useMemo, useState } from 'react';
import { Robot } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { rolePermissionsApi, type RoleMatrices } from '@/lib/api/inmobiliaria.service';

type ModuloDelAgente = 'cobranza' | 'cotizador' | 'ap';
export type ModulosDelMicro = Record<ModuloDelAgente, string[]>;

export const ACCIONES_DE_LOS_AGENTES: Record<ModuloDelAgente, { titulo: string; acciones: [string, string][] }> = {
  cobranza: {
    titulo: 'Cobranza (Mori)',
    acciones: [
      ['view', 'Ver la cobranza'],
      ['approve', 'Aprobar acciones'],
      ['intervene', 'Hacer gestiones'],
      ['reveal-pii', 'Ver los datos personales completos'],
      ['force-stage', 'Cambiar la etapa de un caso a mano'],
      ['configure', 'Cambiar la configuración'],
      ['kill-switch', 'Detener la cobranza automática'],
      ['audit-export', 'Exportar la auditoría'],
      ['resolve-escalation', 'Resolver escalaciones'],
      ['assign-escalation', 'Asignarle escalaciones a otra persona'],
      ['edit-thresholds', 'Cambiar los umbrales del reporte diario'],
      ['subscribe-daily-report', 'Suscribirse al reporte diario'],
    ],
  },
  cotizador: {
    titulo: 'Asegurabilidad (cotizador)',
    acciones: [
      ['view', 'Ver el cotizador'],
      ['create-quote', 'Crear cotizaciones'],
      ['re-quote', 'Volver a cotizar'],
      ['ask-why', 'Preguntarle por qué'],
      ['configure-carrier', 'Configurar las aseguradoras'],
      ['validate-assumption', 'Validar los supuestos'],
      ['resolve-arco', 'Resolver solicitudes de datos personales'],
      ['configure', 'Cambiar la configuración'],
    ],
  },
  ap: {
    titulo: 'Cuentas por pagar',
    acciones: [
      ['view', 'Ver las cuentas por pagar'],
      ['create-bill', 'Registrar facturas de proveedores'],
      ['approve-l2', 'Aprobar facturas (segundo nivel)'],
    ],
  },
};

const MODULOS: ModuloDelAgente[] = ['cobranza', 'cotizador', 'ap'];

const NOMBRE_DEL_ROL: Record<string, string> = {
  AGENTE: 'Asesor comercial',
  CONTADOR: 'Contador',
  VIEWER: 'Sólo lectura',
  COORDINADOR: 'Coordinador',
  AUXILIAR_CARTERA: 'Auxiliar de cartera',
  ABOGADO_EXTERNO: 'Abogado externo',
  AUXILIAR_COMERCIAL: 'Auxiliar comercial',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
  AUXILIAR_CONTABLE: 'Auxiliar contable',
  AUXILIAR_MANTENIMIENTO: 'Auxiliar de mantenimiento',
};

const AVISO_DEL_ABOGADO =
  'Con Cobranza, el abogado externo vería la cobranza de TODA la inmobiliaria: el asistente no sabe cuáles son sus casos. Su trabajo está en «Cobro jurídico».';

function vacio(): ModulosDelMicro {
  return { cobranza: [], cotizador: [], ap: [] };
}

function copia(m: Partial<ModulosDelMicro> | undefined): ModulosDelMicro {
  return { cobranza: [...(m?.cobranza ?? [])], cotizador: [...(m?.cotizador ?? [])], ap: [...(m?.ap ?? [])] };
}

function iguales(a: ModulosDelMicro, b: ModulosDelMicro): boolean {
  return MODULOS.every((m) => a[m].length === b[m].length && a[m].every((x) => b[m].includes(x)));
}

/** Las casillas de UN rol o UNA persona. */
function Casillas({
  valor,
  onCambiar,
  deshabilitado,
  prefijo,
}: {
  valor: ModulosDelMicro;
  onCambiar: (v: ModulosDelMicro) => void;
  deshabilitado?: boolean;
  prefijo: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {MODULOS.map((m) => (
        <fieldset key={m} className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium text-foreground">{ACCIONES_DE_LOS_AGENTES[m].titulo}</legend>
          <div className="mt-1 space-y-1.5">
            {ACCIONES_DE_LOS_AGENTES[m].acciones.map(([accion, etiqueta]) => {
              const id = `${prefijo}-${m}-${accion}`;
              const marcada = valor[m].includes(accion);
              return (
                <label key={accion} htmlFor={id} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    id={id}
                    data-testid={id}
                    checked={marcada}
                    disabled={deshabilitado}
                    onCheckedChange={(v) => {
                      const siguiente = copia(valor);
                      siguiente[m] = v
                        ? ACCIONES_DE_LOS_AGENTES[m].acciones.map(([a]) => a).filter((a) => a === accion || valor[m].includes(a))
                        : valor[m].filter((a) => a !== accion);
                      onCambiar(siguiente);
                    }}
                  />
                  <span>{etiqueta}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** «Permisos por rol»: un bloque por rol editable. */
export function PermisosDeLosAgentesPorRol({ inicial }: { inicial: RoleMatrices }) {
  const [cargado, setCargado] = useState<{ roles: Record<string, Record<string, string[]>>; micro: Record<string, ModulosDelMicro> } | null>(null);
  const [edicion, setEdicion] = useState<Record<string, ModulosDelMicro>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    const micro: Record<string, ModulosDelMicro> = {};
    for (const [rol, m] of Object.entries(inicial.modulosDelMicro ?? {})) micro[rol] = copia(m);
    setCargado({ roles: inicial.roles as unknown as Record<string, Record<string, string[]>>, micro });
    setEdicion(micro);
  }, [inicial]);

  const roles = useMemo(() => Object.keys(NOMBRE_DEL_ROL).filter((r) => cargado?.micro[r]), [cargado]);
  if (!cargado || roles.length === 0) return null;

  const guardar = async (rol: string) => {
    setGuardando(rol);
    try {
      const r = await rolePermissionsApi.updateRolePermissions({
        [rol]: { ...(cargado.roles[rol] ?? {}), ...edicion[rol] },
      } as never);
      const micro: Record<string, ModulosDelMicro> = {};
      for (const [k, m] of Object.entries(r.modulosDelMicro ?? {})) micro[k] = copia(m);
      setCargado({ roles: r.roles as unknown as Record<string, Record<string, string[]>>, micro });
      setEdicion(micro);
      toast.success(`Guardamos lo que puede «${NOMBRE_DEL_ROL[rol]}» con los agentes.`);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e));
    } finally {
      setGuardando(null);
    }
  };

  return (
    <section className="mt-8 space-y-4" data-testid="permisos-de-los-agentes">
      <div className="flex items-start gap-2">
        <Robot className="mt-0.5 h-5 w-5 text-primary" weight="duotone" aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-foreground">Agentes IA</h3>
          <p className="text-sm text-muted-foreground">
            Lo que cada rol puede hacer con la cobranza de Mori, la asegurabilidad y las cuentas por pagar. El administrador
            lo puede todo.
          </p>
        </div>
      </div>
      {roles.map((rol) => {
        const cambio = !iguales(edicion[rol] ?? vacio(), cargado.micro[rol] ?? vacio());
        return (
          <div key={rol} className="rounded-xl border border-border bg-surface p-4" data-testid={`agentes-del-rol-${rol}`}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h4 className="text-sm font-semibold text-foreground">{NOMBRE_DEL_ROL[rol]}</h4>
              <Button size="sm" disabled={!cambio || guardando !== null} onClick={() => guardar(rol)} data-testid={`guardar-agentes-${rol}`}>
                {guardando === rol ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
            {rol === 'ABOGADO_EXTERNO' && (edicion[rol]?.cobranza.length ?? 0) > 0 && (
              <p className="mb-3 rounded-md bg-warning-soft p-2 text-caption text-warning" data-testid="aviso-abogado-cobranza">
                {AVISO_DEL_ABOGADO}
              </p>
            )}
            <Casillas
              prefijo={`rol-${rol}`}
              valor={edicion[rol] ?? vacio()}
              deshabilitado={guardando !== null}
              onCambiar={(v) => setEdicion((e) => ({ ...e, [rol]: v }))}
            />
          </div>
        );
      })}
    </section>
  );
}

/** Lo que una persona tiene distinto de su rol con los agentes, con su nombre. */
export function diferenciasDeLosAgentes(
  propios: ModulosDelMicro,
  delRol: ModulosDelMicro,
): { clave: string; nombre: string; tipo: 'sumado' | 'quitado' }[] {
  const lista: { clave: string; nombre: string; tipo: 'sumado' | 'quitado' }[] = [];
  for (const m of MODULOS) {
    for (const [accion, etiqueta] of ACCIONES_DE_LOS_AGENTES[m].acciones) {
      const tiene = propios[m].includes(accion);
      if (tiene === delRol[m].includes(accion)) continue;
      lista.push({ clave: `${m}:${accion}`, nombre: `${ACCIONES_DE_LOS_AGENTES[m].titulo} · ${etiqueta}`, tipo: tiene ? 'sumado' : 'quitado' });
    }
  }
  return lista;
}

/** Lo que el back trae de los agentes de una persona; `null` si no aplica (el administrador lo puede todo). */
export function agentesDeLaRespuesta(r: {
  isAdmin?: boolean;
  modulosDelMicro?: Partial<ModulosDelMicro>;
  modulosDelMicroDelRol?: Partial<ModulosDelMicro>;
}): { propios: ModulosDelMicro; delRol: ModulosDelMicro } | null {
  if (r.isAdmin || !r.modulosDelMicro) return null;
  return { propios: copia(r.modulosDelMicro), delRol: copia(r.modulosDelMicroDelRol) };
}

/**
 * «Permisos de esta persona»: lo suyo con los agentes. Lo guarda el «Guardar»
 * del diálogo junto con lo demás (uno solo: con dos, lo marcado aquí se perdía
 * al apretar el de abajo).
 */
export function AgentesDeLaPersona({
  miembroId,
  rol,
  valor,
  delRol,
  deshabilitado,
  onCambiar,
}: {
  miembroId: string;
  rol: string | undefined;
  valor: ModulosDelMicro;
  delRol: ModulosDelMicro;
  deshabilitado?: boolean;
  onCambiar: (v: ModulosDelMicro) => void;
}) {
  return (
    <section className="mt-6 space-y-3" data-testid="permisos-de-los-agentes-de-la-persona">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Agentes IA</h4>
        <p className="text-caption text-muted-foreground">
          {iguales(valor, delRol) ? 'Lo mismo que su rol.' : 'Distinto de lo de su rol: se guarda con «Guardar».'}
        </p>
      </div>
      {rol === 'ABOGADO_EXTERNO' && valor.cobranza.length > 0 && (
        <p className="rounded-md bg-warning-soft p-2 text-caption text-warning" data-testid="aviso-abogado-cobranza-persona">
          {AVISO_DEL_ABOGADO}
        </p>
      )}
      <Casillas prefijo={`persona-${miembroId}`} valor={valor} deshabilitado={deshabilitado} onCambiar={onCambiar} />
    </section>
  );
}
