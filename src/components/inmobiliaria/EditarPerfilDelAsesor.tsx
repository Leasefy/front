'use client';

/**
 * Editar el perfil de un asesor del equipo.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * El botón «Editar» de la ficha del asesor estaba DESHABILITADO con el título
 * «Disponible próximamente», y el de la página levantaba un aviso de lo mismo.
 * Las dos piezas ya estaban puestas desde hacía semanas:
 *
 *   · el back: `PATCH /inmobiliaria/agency/members/:memberId/profile`; y
 *   · el front: `agencyApi.updateMemberProfile`, que NADIE llamaba.
 *
 * Es la misma trampa de `agent-contact.service.ts` y de `AsignarAgente.tsx`: un
 * «próximamente» sobre algo construido. Lo que faltaba era este diálogo.
 *
 * ── Qué se puede editar acá, y qué NO ──────────────────────────────────────
 *
 * Sólo lo que esta pantalla MUESTRA y la ruta acepta con un solo significado:
 * rol, estado, comisión y zona. Deliberadamente quedan afuera:
 *
 *   · **nombre, correo y teléfono** — son del USUARIO, no de la membresía, y
 *     esta ruta no los toca. Ofrecerlos acá sería un campo que se guarda en la
 *     nada.
 *   · **`position`** — la ruta lo acepta, pero el front no lo lee en ninguna
 *     parte: se escribiría y no se volvería a ver nunca.
 *   · **`specialization`** — 🔴 los dos lados NO hablan el mismo idioma. El
 *     front usa `apartment | house | studio | room | all` y la ruta espera
 *     `RESIDENTIAL | COMMERCIAL | BOTH`. Traducir «apartamento» a
 *     «residencial» es una suposición, y una suposición escrita en la base es
 *     peor que un campo que no se puede editar. Se arregla cuando alguien
 *     decida cuál de los dos vocabularios es el verdadero.
 *
 * `agente.id` es el id de MIEMBRO de la agencia (`AgencyMember.id`), que es
 * justo lo que pide la ruta — no el `userId`. Mandar el otro no falla: edita a
 * nadie.
 */

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Button, Input } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';

/** El rol, en los dos idiomas. El front va en minúscula; la ruta en mayúscula. */
const ROL_AL_BACK: Record<AgenteRole, 'AGENT' | 'COORDINATOR' | 'DIRECTOR'> = {
  agent: 'AGENT',
  coordinator: 'COORDINATOR',
  director: 'DIRECTOR',
};

const ROL_ETIQUETA: Record<AgenteRole, string> = {
  agent: 'Agente',
  coordinator: 'Coordinador',
  director: 'Director',
};

/**
 * El estado, en los dos idiomas. `invited` NO está: un invitado que todavía no
 * aceptó no sale de `GET /inmobiliaria/agentes` y la ruta no tiene ese valor,
 * así que ofrecerlo sería un 400 con cara de opción.
 */
const ESTADO_AL_BACK: Record<
  Exclude<AgenteStatus, 'invited'>,
  'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  on_leave: 'ON_LEAVE',
};

const ESTADO_ETIQUETA: Record<Exclude<AgenteStatus, 'invited'>, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'En licencia',
};

function esEditable(estado: AgenteStatus): estado is Exclude<AgenteStatus, 'invited'> {
  return estado !== 'invited';
}

export interface EditarPerfilDelAsesorProps {
  abierto: boolean;
  onCerrar: () => void;
  agente: Agente;
  /** Para recargar la ficha con lo que quedó guardado, no con lo que se tecleó. */
  onGuardado: () => void;
}

export function EditarPerfilDelAsesor({
  abierto,
  onCerrar,
  agente,
  onGuardado,
}: EditarPerfilDelAsesorProps) {
  const [rol, setRol] = useState<AgenteRole>(agente.role);
  const [estado, setEstado] = useState<AgenteStatus>(agente.status);
  /* La comisión viaja como texto mientras se teclea: un `number` obliga a
     decidir qué es el campo vacío, y «0 %» no es lo mismo que «no escribí
     nada». Se convierte al guardar, una sola vez. */
  const [comision, setComision] = useState(String(agente.commissionSplit ?? 0));
  const [zona, setZona] = useState(agente.zone ?? '');
  const [guardando, setGuardando] = useState(false);

  /* Al reabrir el diálogo, los campos vuelven a lo que dice el servidor: si
     alguien editó a medias, cerró y volvió, lo que ve es lo guardado. */
  useEffect(() => {
    if (!abierto) return;
    setRol(agente.role);
    setEstado(agente.status);
    setComision(String(agente.commissionSplit ?? 0));
    setZona(agente.zone ?? '');
  }, [abierto, agente]);

  const comisionNumero = Number(comision);
  const comisionValida =
    comision.trim() !== '' &&
    Number.isFinite(comisionNumero) &&
    comisionNumero >= 0 &&
    comisionNumero <= 100;

  async function guardar() {
    if (!comisionValida) {
      toast.error('La comisión tiene que estar entre 0 y 100');
      return;
    }
    setGuardando(true);
    try {
      await agencyApi.updateMemberProfile(agente.id, {
        agentRole: ROL_AL_BACK[rol],
        ...(esEditable(estado) ? { agentStatus: ESTADO_AL_BACK[estado] } : {}),
        commissionSplit: comisionNumero,
        // Vacío se manda como `null`, no como `''`: la columna es nullable y
        // una cadena vacía se pinta después como una zona que se llama «».
        zone: zona.trim() === '' ? null : zona.trim(),
      });
      toast.success('Perfil actualizado');
      onGuardado();
      onCerrar();
    } catch (err) {
      toast.error('No pudimos guardar el perfil', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md" data-testid="editar-perfil-asesor">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            El nombre, el correo y el teléfono son de la cuenta de {agente.name} y se
            cambian desde su perfil, no desde acá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted" htmlFor="asesor-rol">
              Rol
            </label>
            <Select value={rol} onValueChange={(v) => setRol(v as AgenteRole)}>
              <SelectTrigger id="asesor-rol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROL_ETIQUETA) as AgenteRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_ETIQUETA[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted" htmlFor="asesor-estado">
              Estado
            </label>
            <Select value={estado} onValueChange={(v) => setEstado(v as AgenteStatus)}>
              <SelectTrigger id="asesor-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(ESTADO_ETIQUETA) as Exclude<AgenteStatus, 'invited'>[]
                ).map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_ETIQUETA[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-fg-muted">
              Inactivo o en licencia deja de recibir inmuebles nuevos.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted" htmlFor="asesor-comision">
              Comisión del asesor (%)
            </label>
            <Input
              id="asesor-comision"
              type="number"
              min={0}
              max={100}
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />
            <p className="text-xs text-fg-muted">
              De cada comisión de la inmobiliaria,{' '}
              {comisionValida ? `${comisionNumero} % es del asesor y ${100 - comisionNumero} % queda en la agencia` : 'la parte del asesor'}.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-muted" htmlFor="asesor-zona">
              Zona
            </label>
            <Input
              id="asesor-zona"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Antioquia"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button hideArrow onClick={guardar} disabled={guardando || !comisionValida}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditarPerfilDelAsesor;
