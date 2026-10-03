'use client';

/**
 * Perfil tributario del propietario — lo que decide el IVA del canon y las
 * retenciones de cada giro. Se guardaba desde el back (migración de terceros)
 * y no se veía en ninguna pantalla (Nico, 2026-09-02: «nos falta información
 * por mostrar del propietario»).
 *
 * Tres estados por dato, no dos: sí / no / sin definir. `null` no es «no»:
 * con null se cobra con el perfil por defecto del tipo de persona, y el chip
 * lo dice con borde punteado.
 *
 * 🔴 P-20 (QA-PROP, 03-10): cada chip cambiaba con UN clic y guardaba al
 * instante (sin definir → sí → no → sin definir). Un clic de más le cambiaba
 * el IVA del canon o una retención a los giros, sin confirmar ni deshacer, y
 * los avisos «Propietario actualizado» se apilaban. Ahora el chip abre un menú
 * con las tres opciones —cada una dice qué pasa en la próxima liquidación— y
 * sólo se guarda la que se elige; el aviso trae «Deshacer» y reemplaza al
 * anterior (un solo `id`) en vez de apilarse.
 *
 * Quién lo cambia (Nico, 03-10): un administrador o el contador, nunca el
 * asesor. La ficha decide con `puedeEditar`; sin permiso los chips son de sólo
 * lectura y se dice quién lo cambia.
 */

import { forwardRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { CaretDown, Check, Scales } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import type { Propietario } from '@/lib/types/inmobiliaria';

type Campo = 'responsableIva' | 'agenteRetenedorRenta' | 'agenteRetenedorIva' | 'agenteRetenedorIca';
type Estado = 'si' | 'no' | 'vacio';

const CAMPOS: Array<{
  campo: Campo;
  nombre: string;
  si: string;
  no: string;
  vacio: string;
  /** La raíz de las claves del efecto: `efecto.<raiz>Si` / `efecto.<raiz>No`. */
  efecto: 'iva' | 'retefuente' | 'reteiva' | 'reteica';
  testId: string;
}> = [
  { campo: 'responsableIva', nombre: 'nombreIva', si: 'ivaSi', no: 'ivaNo', vacio: 'ivaSinDefinir', efecto: 'iva', testId: 'chip-iva' },
  { campo: 'agenteRetenedorRenta', nombre: 'nombreRetefuente', si: 'retieneRenta', no: 'noRetieneRenta', vacio: 'retefuenteSinDefinir', efecto: 'retefuente', testId: 'chip-retefuente' },
  { campo: 'agenteRetenedorIva', nombre: 'nombreReteiva', si: 'retieneIva', no: 'noRetieneIva', vacio: 'reteivaSinDefinir', efecto: 'reteiva', testId: 'chip-reteiva' },
  { campo: 'agenteRetenedorIca', nombre: 'nombreReteica', si: 'retieneIca', no: 'noRetieneIca', vacio: 'reteicaSinDefinir', efecto: 'reteica', testId: 'chip-reteica' },
];

/**
 * El perfil por defecto del tipo de persona, el mismo del back
 * (`perfilPorDefecto`, `contracts/perfiles-tributarios.ts`): una persona
 * natural no es responsable de IVA ni agente retenedor; una empresa es
 * responsable de IVA y retiene renta, pero no IVA ni ICA.
 */
const POR_DEFECTO: Record<'natural' | 'empresa', Record<Campo, boolean>> = {
  natural: { responsableIva: false, agenteRetenedorRenta: false, agenteRetenedorIva: false, agenteRetenedorIca: false },
  empresa: { responsableIva: true, agenteRetenedorRenta: true, agenteRetenedorIva: false, agenteRetenedorIca: false },
};

const ESTADOS: readonly Estado[] = ['si', 'no', 'vacio'];

const estadoDe = (valor: boolean | null | undefined): Estado => (valor == null ? 'vacio' : valor ? 'si' : 'no');
const valorDe = (estado: Estado): boolean | null => (estado === 'vacio' ? null : estado === 'si');

/** El id del aviso: uno por propietario, así el siguiente cambio REEMPLAZA al anterior. */
export const idDelAvisoDelPerfil = (propietarioId: string) => `perfil-tributario-${propietarioId}`;

export function PerfilTributarioDelPropietario({
  propietario,
  puedeEditar = true,
  onActualizado,
}: {
  propietario: Propietario;
  /** Administrador o contador. Sin esto, los chips son de sólo lectura. */
  puedeEditar?: boolean;
  /** El propietario como quedó en el back (también al deshacer). */
  onActualizado: (p: Propietario) => void;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.propietarios.detail.${s}`;
  const [guardando, setGuardando] = useState<Campo | null>(null);
  const esEmpresa = propietario.documentType === 'NIT';
  const tipo = esEmpresa ? 'empresa' : 'natural';

  /** «En la próxima liquidación, …» para una opción de un campo. */
  function queCambia(fila: (typeof CAMPOS)[number], estado: Estado): string {
    if (estado === 'vacio') {
      const porDefecto = POR_DEFECTO[tipo][fila.campo];
      return t(k('perfil.proximaLiquidacionPorDefecto'), {
        tipo: t(k(esEmpresa ? 'perfil.comoEmpresa' : 'perfil.comoPersonaNatural')),
        efecto: t(k(`perfil.efecto.${fila.efecto}${porDefecto ? 'Si' : 'No'}`)),
      });
    }
    return t(k('perfil.proximaLiquidacion'), {
      efecto: t(k(`perfil.efecto.${fila.efecto}${estado === 'si' ? 'Si' : 'No'}`)),
    });
  }

  const textoDelChip = (fila: (typeof CAMPOS)[number], estado: Estado) =>
    t(k(estado === 'si' ? fila.si : estado === 'no' ? fila.no : fila.vacio));

  async function guardar(fila: (typeof CAMPOS)[number], nuevo: Estado, anterior: Estado, esDeshacer = false) {
    setGuardando(fila.campo);
    try {
      const actualizado = await propietariosApi.update(propietario.id, { [fila.campo]: valorDe(nuevo) });
      onActualizado(actualizado);
      const aviso = idDelAvisoDelPerfil(propietario.id);
      if (esDeshacer) {
        toast.success(t(k('perfil.deshecho')), {
          id: aviso,
          description: t(k('perfil.cambio'), { campo: t(k(fila.nombre)), valor: t(k(`perfil.opcion.${nuevo}`)) }),
        });
      } else {
        toast.success(t(k('perfil.cambio'), { campo: t(k(fila.nombre)), valor: t(k(`perfil.opcion.${nuevo}`)) }), {
          id: aviso,
          description: queCambia(fila, nuevo),
          action: {
            label: t(k('perfil.deshacer')),
            onClick: () => void guardar(fila, anterior, nuevo, true),
          },
        });
      }
    } catch (error) {
      toast.error(t('inmobiliaria.propietarios.toasts.updateError'), {
        id: idDelAvisoDelPerfil(propietario.id),
        // Con la regla de oro: el motivo del back si se lee, «de nuestro lado»
        // con la referencia en un 5xx y la conexión sólo sin respuesta.
        description: mensajeParaLaPersona(error, { porDefecto: '', accion: 'guardar el perfil tributario' }),
      });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="perfil-tributario">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scales className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">{t(k('perfilTributario'))}</h3>
        </div>
        <Chip
          texto={t(esEmpresa ? k('personaJuridica') : k('personaNatural'))}
          estado="si"
          testId="chip-tipo-persona"
        />
      </div>
      <dl className="divide-y divide-border-faint">
        {CAMPOS.map((fila) => {
          const estado = estadoDe(propietario[fila.campo]);
          const nombre = t(k(fila.nombre));
          return (
            <div key={fila.campo} className="flex items-center justify-between gap-3 py-2">
              <dt className="min-w-0 text-sm text-muted-foreground">{nombre}</dt>
              <dd className="shrink-0">
                {puedeEditar ? (
                  <DropdownList>
                    <DropdownListTrigger asChild>
                      <Chip
                        texto={textoDelChip(fila, estado)}
                        estado={estado}
                        testId={fila.testId}
                        boton
                        ocupado={guardando === fila.campo}
                        ariaLabel={t(k('perfil.cambiar'), { campo: nombre, valor: textoDelChip(fila, estado) })}
                      />
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-72" data-testid={`${fila.testId}-menu`}>
                      {ESTADOS.map((opcion) => (
                        <DropdownListItem
                          key={opcion}
                          role="menuitemradio"
                          aria-checked={opcion === estado}
                          data-testid={`${fila.testId}-${opcion}`}
                          onSelect={() => {
                            if (opcion !== estado) void guardar(fila, opcion, estado);
                          }}
                          className="items-start gap-2"
                        >
                          <Check
                            className={cn('mt-0.5 h-4 w-4 shrink-0', opcion === estado ? 'text-primary' : 'invisible')}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-fg">{t(k(`perfil.opcion.${opcion}`))}</span>
                            <span className="block text-caption text-fg-muted">{queCambia(fila, opcion)}</span>
                          </span>
                        </DropdownListItem>
                      ))}
                    </DropdownListContent>
                  </DropdownList>
                ) : (
                  <Chip texto={textoDelChip(fila, estado)} estado={estado} testId={fila.testId} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-muted-foreground">{t(k('perfilTributarioAyuda'))}</p>
      {!puedeEditar && (
        <p className="text-caption text-muted-foreground" data-testid="perfil-tributario-solo-lectura">
          {t(k('perfil.soloLectura'))}
        </p>
      )}
    </section>
  );
}

type ChipProps = {
  texto: string;
  estado: Estado;
  testId?: string;
  /** Es el disparador del menú (lo pone `DropdownListTrigger asChild`). */
  boton?: boolean;
  ocupado?: boolean;
  ariaLabel?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const CLASE_DEL_CHIP: Record<Estado, string> = {
  si: 'rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary',
  no: 'rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground',
  vacio: 'rounded-full border border-dashed border-warning/60 px-2.5 py-1 text-xs text-warning',
};

/*
 * `forwardRef` y las props sueltas: con `asChild`, Radix le pone al chip el
 * ref, el `onPointerDown`, `aria-expanded` y `data-state` del disparador.
 */
const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { texto, estado, testId, boton, ocupado, ariaLabel, className, ...props },
  ref,
) {
  if (!boton) {
    return (
      <span data-testid={testId} data-estado={estado} className={CLASE_DEL_CHIP[estado]}>
        {texto}
      </span>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      data-testid={testId}
      data-estado={estado}
      disabled={ocupado}
      aria-label={ariaLabel}
      aria-busy={ocupado || undefined}
      {...props}
      className={cn(
        CLASE_DEL_CHIP[estado],
        'inline-flex items-center gap-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60',
        className,
      )}
    >
      {texto}
      <CaretDown className="h-3 w-3" aria-hidden="true" />
    </button>
  );
});

export default PerfilTributarioDelPropietario;
