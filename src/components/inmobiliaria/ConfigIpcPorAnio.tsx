'use client';

/**
 * ConfigIpcPorAnio — el IPC de diciembre por año, en Configuración → Perfil.
 *
 * 🔴 N3. La renovación sube el canon hasta el IPC del año calendario anterior
 * al que rige (Ley 820, art. 20). Ese número vivía sólo en una tabla del
 * código que alguien actualiza cada enero: sin el IPC de 2026, toda renovación
 * que rige en 2027 salía con el mismo canon y nadie lo veía. Acá la
 * inmobiliaria lo carga sin esperar un despliegue (`Agency.ipcPorAnio`).
 *
 * Por qué por año y no el «IPC vigente» de al lado: ése no tiene año, así que
 * cargado en 2027 se seguiría aplicando en 2028 sin que nadie lo note. Un año
 * cargado acá manda, para ESE año, sobre el IPC vigente y sobre la tabla.
 *
 * Tiene que coincidir con el back (`esIpcPorAnio`):
 *   - mayor que 0 (un 0 se lee como «sin dato»), hasta 30, dos decimales;
 *   - el PUT reemplaza el mapa ENTERO: se manda siempre completo, y vaciar un
 *     año es mandarlo sin él.
 *
 * No sugiere ninguna cifra: el número lo escribe la inmobiliaria mirando al DANE.
 */

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

/** El ancla del bloque: a esto apunta el aviso de /contratos/renovaciones. */
export const ANCLA_IPC_POR_ANIO = 'ipc-por-anio';

/** El mismo tope del back. */
export const IPC_MAXIMO_POR_ANIO = 30;

/**
 * «5,3» o «5.3» → 5.3. Vacío → `null` (sin cargar). Lo que el back no
 * aceptaría → `undefined`.
 */
export function leerIpcDelAnio(texto: string): number | null | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return undefined;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n <= 0 || n > IPC_MAXIMO_POR_ANIO) return undefined;
  return n;
}

/** Cómo se pinta un IPC guardado: con coma, como se escribe acá. */
function escribirIpc(valor: number): string {
  return String(valor).replace('.', ',');
}

/** Lo guardado, leído con cuidado: viene de una columna JSON. */
export function ipcPorAnioGuardado(valor: unknown): Record<string, number> {
  const mapa: Record<string, number> = {};
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return mapa;
  for (const [anio, tasa] of Object.entries(valor)) {
    if (/^\d{4}$/.test(anio) && typeof tasa === 'number' && Number.isFinite(tasa) && tasa > 0) {
      mapa[anio] = tasa;
    }
  }
  return mapa;
}

/**
 * Los años que se ofrecen: el actual y el anterior —en septiembre falta el del
 * año en curso para las renovaciones del siguiente; en enero, el del año que
 * acaba de terminar— más los que ya estén cargados. Del más nuevo al más viejo.
 */
export function aniosAOfrecer(hoy: Date, guardado: Record<string, number>): number[] {
  const actual = hoy.getFullYear();
  const anios = new Set<number>([actual, actual - 1, ...Object.keys(guardado).map(Number)]);
  return [...anios].sort((a, b) => b - a);
}

function textosDe(mapa: Record<string, number>): Record<string, string> {
  return Object.fromEntries(Object.entries(mapa).map(([anio, tasa]) => [anio, escribirIpc(tasa)]));
}

interface Props {
  /** La fila real de la agencia (GET /inmobiliaria/config → `agency`). */
  agency: AgencyProfile;
  /** Guarda por PUT /inmobiliaria/agency: avisa con toast y rechaza si falla. */
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  /** Sólo el ADMIN: el back rechaza el PUT a los demás. */
  canEdit?: boolean;
  /** Qué día es hoy; sólo las pruebas lo fijan. */
  hoy?: Date;
}

export function ConfigIpcPorAnio({ agency, onSave, canEdit = true, hoy }: Props) {
  const guardado = useMemo(() => ipcPorAnioGuardado(agency.ipcPorAnio), [agency.ipcPorAnio]);
  const elHoy = useMemo(() => hoy ?? new Date(), [hoy]);
  const anios = useMemo(() => aniosAOfrecer(elHoy, guardado), [elHoy, guardado]);

  const [textos, setTextos] = useState<Record<string, string>>(() => textosDe(guardado));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // La agencia se refresca después de cada guardado: los campos siguen a la fila.
  useEffect(() => setTextos(textosDe(guardado)), [guardado]);

  const volverALoGuardado = (clave: string) => {
    const anterior = guardado[clave];
    setTextos((t) => ({ ...t, [clave]: anterior == null ? '' : escribirIpc(anterior) }));
  };

  const confirmar = async (clave: string) => {
    const valor = leerIpcDelAnio(textos[clave] ?? '');
    if (valor === undefined) {
      setErrores((e) => ({
        ...e,
        [clave]: `Un porcentaje mayor que 0 y hasta ${IPC_MAXIMO_POR_ANIO}, con hasta dos decimales.`,
      }));
      volverALoGuardado(clave);
      return;
    }
    setErrores((e) => {
      const copia = { ...e };
      delete copia[clave];
      return copia;
    });

    if (valor === (guardado[clave] ?? null)) return;

    const mapa = { ...guardado };
    if (valor === null) delete mapa[clave];
    else mapa[clave] = valor;

    setGuardando(true);
    try {
      await onSave?.({ ipcPorAnio: mapa });
    } catch {
      // El padre ya avisó con el motivo del back; el campo vuelve a lo guardado.
      volverALoGuardado(clave);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div id={ANCLA_IPC_POR_ANIO} className="scroll-mt-24 space-y-2" data-testid="config-ipc-por-anio">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">IPC de diciembre por año (%)</p>
        <p className="text-xs text-muted-foreground">
          La renovación sube el canon hasta el IPC del año anterior al que rige. El DANE publica el de diciembre a
          comienzos de enero: cárgalo aquí y no tienes que esperar a que Leasefy actualice su tabla. Si lo dejas
          vacío, se usa la tabla de Leasefy cuando ya tiene ese año. Un año cargado aquí manda sobre el IPC vigente.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        {anios.map((anio) => {
          const clave = String(anio);
          const id = `ipc-anio-${clave}`;
          const error = errores[clave];
          return (
            <div key={clave} className="space-y-1">
              <label htmlFor={id} className="block text-xs font-medium text-fg-muted">
                IPC {anio}
              </label>
              <Input
                id={id}
                data-testid={id}
                type="text"
                inputMode="decimal"
                placeholder="Sin cargar"
                value={textos[clave] ?? ''}
                disabled={!canEdit || guardando}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => {
                  const texto = e.target.value;
                  setTextos((t) => ({ ...t, [clave]: texto }));
                }}
                onBlur={() => void confirmar(clave)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className={cn('w-28 tabular-nums', error && 'border-danger/30')}
              />
              {error ? (
                <p id={`${id}-error`} data-testid={`${id}-error`} className="text-xs text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConfigIpcPorAnio;
