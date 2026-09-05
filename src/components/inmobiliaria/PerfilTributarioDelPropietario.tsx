'use client';

/**
 * Perfil tributario del propietario — lo que decide el IVA del canon y las
 * retenciones de cada giro. Se guardaba desde el back (migración de terceros)
 * y no se veía en ninguna pantalla (Nico, 2026-09-02: «nos falta información
 * por mostrar del propietario»).
 *
 * Tres estados por dato, no dos: sí / no / sin definir. `null` no es «no»:
 * con null se cobra con el perfil por defecto del tipo de persona, y el chip
 * lo dice con borde punteado. Cada chip es un control real: un clic pasa de
 * sin definir → sí → no → sin definir y guarda al instante (PUT), con toast.
 * Sin un formulario aparte que hoy no existe para estos cuatro campos.
 */

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Scales } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import type { Propietario } from '@/lib/types/inmobiliaria';

type Campo = 'responsableIva' | 'agenteRetenedorRenta' | 'agenteRetenedorIva' | 'agenteRetenedorIca';

const CAMPOS: Array<{ campo: Campo; si: string; no: string; vacio: string; testId: string }> = [
  { campo: 'responsableIva', si: 'ivaSi', no: 'ivaNo', vacio: 'ivaSinDefinir', testId: 'chip-iva' },
  { campo: 'agenteRetenedorRenta', si: 'retieneRenta', no: 'noRetieneRenta', vacio: 'retefuenteSinDefinir', testId: 'chip-retefuente' },
  { campo: 'agenteRetenedorIva', si: 'retieneIva', no: 'noRetieneIva', vacio: 'reteivaSinDefinir', testId: 'chip-reteiva' },
  { campo: 'agenteRetenedorIca', si: 'retieneIca', no: 'noRetieneIca', vacio: 'reteicaSinDefinir', testId: 'chip-reteica' },
];

function siguiente(valor: boolean | null | undefined): boolean | null {
  if (valor == null) return true;
  return valor ? false : null;
}

export function PerfilTributarioDelPropietario({
  propietario,
  puedeEditar = true,
  onActualizado,
}: {
  propietario: Propietario;
  puedeEditar?: boolean;
  onActualizado: (p: Propietario) => void;
}) {
  const { t } = useI18n();
  const [guardando, setGuardando] = useState<Campo | null>(null);
  const esEmpresa = propietario.documentType === 'NIT';

  async function cambiar(campo: Campo) {
    setGuardando(campo);
    try {
      const actualizado = await propietariosApi.update(propietario.id, { [campo]: siguiente(propietario[campo]) });
      onActualizado(actualizado);
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.toasts.updateError'), {
        description: error instanceof ApiError ? (error.messages?.join(' · ') ?? error.message) : error instanceof Error ? error.message : '',
      });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="perfil-tributario">
      <div className="flex items-center gap-2">
        <Scales className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{t('inmobiliaria.propietarios.detail.perfilTributario')}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip
          texto={t(esEmpresa ? 'inmobiliaria.propietarios.detail.personaJuridica' : 'inmobiliaria.propietarios.detail.personaNatural')}
          estado="si"
          testId="chip-tipo-persona"
        />
        {CAMPOS.map(({ campo, si, no, vacio, testId }) => {
          const valor = propietario[campo];
          const estado = valor == null ? 'vacio' : valor ? 'si' : 'no';
          return (
            <Chip
              key={campo}
              texto={t(`inmobiliaria.propietarios.detail.${estado === 'si' ? si : estado === 'no' ? no : vacio}`)}
              estado={estado}
              testId={testId}
              onClick={puedeEditar ? () => void cambiar(campo) : undefined}
              ocupado={guardando === campo}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('inmobiliaria.propietarios.detail.perfilTributarioAyuda')}</p>
    </section>
  );
}

function Chip({
  texto,
  estado,
  testId,
  onClick,
  ocupado,
}: {
  texto: string;
  estado: 'si' | 'no' | 'vacio';
  testId?: string;
  onClick?: () => void;
  ocupado?: boolean;
}) {
  const clase =
    estado === 'si'
      ? 'rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary'
      : estado === 'no'
        ? 'rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground'
        : 'rounded-full border border-dashed border-warning/60 px-2.5 py-1 text-xs text-warning';
  if (!onClick) {
    return (
      <span data-testid={testId} data-estado={estado} className={clase}>
        {texto}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-testid={testId}
      data-estado={estado}
      onClick={onClick}
      disabled={ocupado}
      className={`${clase} transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60`}
      title="Clic para cambiar: sin definir → sí → no"
    >
      {texto}
    </button>
  );
}

export default PerfilTributarioDelPropietario;
