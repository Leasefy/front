'use client';

/**
 * 🔴 PERMISOS DE ESTA PERSONA (Nico, 22-09-2026, noche).
 *
 * El back tenía `PUT /inmobiliaria/agency/members/:id/permissions` sin
 * pantalla. Acá se ve lo que la persona HEREDA de su rol y se le suman o quitan
 * permisos puntuales a ELLA sola, con el porqué de cada diferencia a la vista
 * («Sumado a esta persona» / «Quitado a esta persona: su rol lo trae»).
 *
 * Lo que se guarda es la matriz entera de la persona (el formato que lee el
 * agente); si queda igual a la de su rol, el back guarda «nada propio» y sigue
 * heredando. «Volver a lo de su rol» manda `null`.
 */

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { permissionsApi } from '@/lib/api/inmobiliaria.service';
import type { PermMap } from '@/lib/api/inmobiliaria.service';
import {
  conAccion,
  diferenciasConElRol,
  type Diferencia,
} from '@/lib/permisos/matriz-de-roles';
import {
  ALL_PERMISSION_ACTIONS,
  ALL_PERMISSION_MODULES,
  PERMISOS_PUNTUALES,
  getActionLabel,
  getModuleLabel,
  getRoleLabel,
  type AccionDePermiso,
  type AgencyUser,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/types/inmobiliaria';

interface Props {
  persona: AgencyUser | null;
  onCerrar: () => void;
}

export function PermisosDeLaPersona({ persona, onCerrar }: Props) {
  const { t } = useI18n();
  const [delRol, setDelRol] = useState<PermMap | null>(null);
  const [propios, setPropios] = useState<PermMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!persona) return;
    let cancelado = false;
    setDelRol(null);
    setPropios(null);
    setError(null);
    permissionsApi
      .getMemberPermissions(persona.id)
      .then((r) => {
        if (cancelado) return;
        const efectivos =
          r.effectivePermissions && r.effectivePermissions !== 'FULL_ACCESS'
            ? (r.effectivePermissions as PermMap)
            : {};
        setDelRol((r.delRol as PermMap | undefined) ?? efectivos);
        setPropios(efectivos);
      })
      .catch((e: unknown) => {
        if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudieron leer sus permisos.');
      });
    return () => {
      cancelado = true;
    };
  }, [persona]);

  const diferencias = useMemo<Diferencia[]>(
    () => (delRol && propios ? diferenciasConElRol(propios, delRol) : []),
    [delRol, propios],
  );
  const porCelda = useMemo(() => {
    const m = new Map<string, Diferencia['tipo']>();
    for (const d of diferencias) m.set(`${d.modulo}:${d.accion}`, d.tipo);
    return m;
  }, [diferencias]);

  const nombreDeAccion = (modulo: PermissionModule, accion: AccionDePermiso) =>
    (ALL_PERMISSION_ACTIONS as string[]).includes(accion)
      ? `${getModuleLabel(modulo)} · ${getActionLabel(accion as PermissionAction)}`
      : t(`inmobiliaria.config.permissions.puntuales.${accion}.nombre`);

  const tiene = (modulo: PermissionModule, accion: AccionDePermiso) =>
    (propios?.[modulo] ?? []).includes(accion as never);

  const marcar = (modulo: PermissionModule, accion: AccionDePermiso, v: boolean) =>
    setPropios((p) => (p ? conAccion(p, modulo, accion, v) : p));

  const guardar = async (matriz: PermMap | null) => {
    if (!persona) return;
    setGuardando(true);
    try {
      await permissionsApi.updateMemberPermissions(persona.id, matriz);
      toast.success(matriz ? 'Permisos de la persona guardados' : 'Vuelve a tener lo de su rol');
      onCerrar();
    } catch (e) {
      toast.error('No se pudieron guardar sus permisos', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  const sumados = diferencias.filter((d) => d.tipo === 'sumado').length;
  const quitados = diferencias.length - sumados;
  const rol = getRoleLabel(persona?.role);

  return (
    <Dialog open={persona !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-3xl" data-testid="permisos-de-la-persona">
        <DialogHeader>
          <DialogTitle>Permisos de {persona?.name || persona?.email}</DialogTitle>
          <DialogDescription data-testid="frase-de-permisos-propios">
            {diferencias.length === 0
              ? `Tiene exactamente lo de su rol, «${rol}». Marca o desmarca para sumarle o quitarle algo sólo a esta persona.`
              : `Hereda lo de su rol, «${rol}», con ${diferencias.length} ${diferencias.length === 1 ? 'cambio propio' : 'cambios propios'}: ${sumados} ${sumados === 1 ? 'sumado' : 'sumados'} y ${quitados} ${quitados === 1 ? 'quitado' : 'quitados'}.`}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : !propios || !delRol ? (
          <p className="text-sm text-fg-muted">Leyendo sus permisos…</p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {diferencias.length > 0 ? (
              <section aria-labelledby="diferencias-titulo" className="rounded-md border border-border p-3">
                <h3 id="diferencias-titulo" className="text-sm font-semibold text-fg">
                  Lo propio de esta persona
                </h3>
                <ul className="mt-1 space-y-0.5 text-sm" data-testid="diferencias-con-el-rol">
                  {diferencias.map((d) => (
                    <li key={`${d.modulo}:${d.accion}`} className={d.tipo === 'sumado' ? 'text-success' : 'text-warning'}>
                      {nombreDeAccion(d.modulo, d.accion)} —{' '}
                      {d.tipo === 'sumado'
                        ? 'sumado a esta persona (su rol no lo trae)'
                        : 'quitado a esta persona (su rol lo trae)'}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <table className="w-full text-sm" data-testid="matriz-de-la-persona">
              <caption className="sr-only">Qué puede hacer esta persona en cada módulo</caption>
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <th className="py-2 font-medium">Módulo</th>
                  {ALL_PERMISSION_ACTIONS.map((a) => (
                    <th key={a} className="py-2 text-center font-medium">
                      {getActionLabel(a)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSION_MODULES.map((m) => (
                  <tr key={m} className="border-b border-border-faint">
                    <td className="py-1.5 text-fg">{getModuleLabel(m)}</td>
                    {ALL_PERMISSION_ACTIONS.map((a) => {
                      const tipo = porCelda.get(`${m}:${a}`);
                      return (
                        <td key={a} className="py-1.5 text-center">
                          <span
                            className={
                              tipo === 'sumado'
                                ? 'inline-flex rounded bg-success-soft p-1'
                                : tipo === 'quitado'
                                  ? 'inline-flex rounded bg-warning-soft p-1'
                                  : 'inline-flex p-1'
                            }
                            title={
                              tipo === 'sumado'
                                ? 'Sumado a esta persona'
                                : tipo === 'quitado'
                                  ? 'Quitado a esta persona: su rol lo trae'
                                  : 'Como su rol'
                            }
                          >
                            <Checkbox
                              checked={tiene(m, a)}
                              onCheckedChange={(c) => marcar(m, a, c === true)}
                              aria-label={`${getModuleLabel(m)} · ${getActionLabel(a)}`}
                              data-testid={`celda-${m}-${a}`}
                            />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <section aria-labelledby="puntuales-persona" className="rounded-md border border-border p-3">
              <h3 id="puntuales-persona" className="text-sm font-semibold text-fg">
                {t('inmobiliaria.config.permissions.puntualesTitulo')}
              </h3>
              <ul className="mt-2 space-y-2">
                {PERMISOS_PUNTUALES.map((p) => (
                  <li key={p.accion} className="flex items-start gap-3">
                    <Checkbox
                      id={`persona-${p.accion}`}
                      checked={tiene(p.modulo, p.accion)}
                      onCheckedChange={(c) => marcar(p.modulo, p.accion, c === true)}
                      data-testid={`persona-puntual-${p.accion}`}
                    />
                    <label htmlFor={`persona-${p.accion}`} className="text-sm text-fg">
                      {t(`inmobiliaria.config.permissions.puntuales.${p.accion}.nombre`)}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            hideArrow
            onClick={() => void guardar(null)}
            disabled={guardando || !propios || diferencias.length === 0}
            title={diferencias.length === 0 ? 'Ya tiene exactamente lo de su rol' : undefined}
            data-testid="volver-a-su-rol"
          >
            Volver a lo de su rol
          </Button>
          <Button
            hideArrow
            onClick={() => propios && void guardar(propios)}
            disabled={guardando || !propios}
            data-testid="guardar-permisos-de-la-persona"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
