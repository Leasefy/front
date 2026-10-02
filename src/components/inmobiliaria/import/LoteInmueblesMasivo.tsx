'use client';

/**
 * LoteInmueblesMasivo — acciones en bloque sobre un lote de inmuebles ya
 * preparado (T-0129).
 *
 * «Seleccionar las N» NO son los ids de la página que se ve: `GET filas` topa
 * en 200 por página y el lote puede traer miles. Se elige un FILTRO (todas las
 * pendientes, las que no traen canon, las que les falta la ciudad…) y la acción
 * viaja como `PATCH filas/masivo` con ese filtro, en vueltas con cursor.
 *
 * Dos acciones:
 *  - «Poner un valor por defecto»: un campo, un valor, a todas las del filtro.
 *    Rellena sólo lo vacío salvo que se pida «también reemplazar».
 *  - «Descartar»: sólo con el permiso `portafolio:delete`.
 */
import { mensajeDeCarga } from './lib/mensajeDeCarga';
import { errorDelNumero } from './lib/limites-de-la-importacion';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { ApiError } from '@/lib/api/client';
import {
  inmueblesImportacionApi,
  type CambiosMasivosInmuebles,
  type CamposMasivosInmuebles,
  type FiltroDeFilasInmuebles,
  type MotivosDelLoteInmuebles,
  type ResultadoMasivoPorFiltroInmuebles,
} from '@/lib/api/inmuebles-importacion.service';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { AVISO_CANON_POR_DEFECTO } from '@/lib/inmuebles/canon-por-confirmar';
import { etiquetaDeFaltante } from './lib/faltantesInmuebles';

const N = (n: number) => n.toLocaleString('es-CO');

type TipoDeCampo = 'texto' | 'numero' | 'fecha' | 'opciones';

interface CampoMasivo {
  clave: keyof CamposMasivosInmuebles;
  etiqueta: string;
  tipo: TipoDeCampo;
  opciones?: { valor: string; etiqueta: string }[];
  ayuda?: string;
}

/**
 * Lo que el back deja poner en bloque. Dirección y código NO están: son lo que
 * identifica a cada inmueble, y el mismo valor en miles de filas los fundiría
 * en uno (el back responde `CAMPO_NO_MASIVO`).
 */
const CAMPOS: CampoMasivo[] = [
  { clave: 'monthlyRent', etiqueta: 'Canon mensual', tipo: 'numero', ayuda: AVISO_CANON_POR_DEFECTO },
  { clave: 'salePrice', etiqueta: 'Precio de venta', tipo: 'numero' },
  {
    clave: 'listingType',
    etiqueta: 'Tipo de operación',
    tipo: 'opciones',
    opciones: [
      { valor: 'RENT', etiqueta: 'Arriendo' },
      { valor: 'SALE', etiqueta: 'Venta' },
    ],
  },
  {
    clave: 'type',
    etiqueta: 'Tipo de inmueble',
    tipo: 'opciones',
    opciones: [
      { valor: 'APARTMENT', etiqueta: 'Apartamento' },
      { valor: 'HOUSE', etiqueta: 'Casa' },
      { valor: 'STUDIO', etiqueta: 'Apartaestudio' },
      { valor: 'ROOM', etiqueta: 'Habitación' },
      { valor: 'COMMERCIAL', etiqueta: 'Local' },
      { valor: 'OFFICE', etiqueta: 'Oficina' },
      { valor: 'WAREHOUSE', etiqueta: 'Bodega' },
      { valor: 'PARKING', etiqueta: 'Parqueadero' },
      { valor: 'LAND', etiqueta: 'Lote' },
    ],
  },
  { clave: 'city', etiqueta: 'Ciudad', tipo: 'texto' },
  { clave: 'department', etiqueta: 'Departamento', tipo: 'texto' },
  { clave: 'neighborhood', etiqueta: 'Barrio', tipo: 'texto' },
  { clave: 'area', etiqueta: 'Área (m²)', tipo: 'numero' },
  { clave: 'consignedAt', etiqueta: 'Fecha de consignación', tipo: 'fecha' },
  { clave: 'title', etiqueta: 'Título', tipo: 'texto' },
];

/** Qué filas son «la selección». */
type AlcanceId = 'pendientes' | 'canon' | `motivo:${string}`;

function filtrosDe(alcance: AlcanceId): FiltroDeFilasInmuebles[] {
  if (alcance === 'pendientes') return [{ estado: 'PENDIENTE' }];
  // Las que no traen canon pueden estar pendientes (les falta otra cosa) o ya
  // listas (sólo les falta el canon): el back filtra por UN estado a la vez.
  if (alcance === 'canon') {
    return [
      { estado: 'PENDIENTE', motivo: 'canon' },
      { estado: 'LISTO', motivo: 'canon' },
    ];
  }
  return [{ estado: 'PENDIENTE', motivo: alcance.slice('motivo:'.length) }];
}

function cuantasDe(alcance: AlcanceId, m: MotivosDelLoteInmuebles | null): number {
  if (!m) return 0;
  if (alcance === 'pendientes') return m.requierenAtencion;
  if (alcance === 'canon') return m.sinCanon;
  const codigo = alcance.slice('motivo:'.length);
  return m.porMotivo.find((x) => x.codigo === codigo)?.filas ?? 0;
}

function nombreDelAlcance(alcance: AlcanceId, n: number): string {
  if (alcance === 'pendientes') return n === 1 ? 'la pendiente' : `las ${N(n)} pendientes`;
  if (alcance === 'canon') return n === 1 ? 'la que no trae canon' : `las ${N(n)} que no traen canon`;
  const codigo = alcance.slice('motivo:'.length);
  return `${n === 1 ? 'la' : `las ${N(n)}`} con «${etiquetaDeFaltante(codigo)}» pendiente`;
}

/** El número escrito con puntos o comas de miles → número, o `null`. */
function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d,.]/g, '');
  if (!limpio) return null;
  const n = Number(limpio.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface Props {
  lote: string;
  /** El lote se está activando o revisando: nada se toca. */
  deshabilitado?: boolean;
  /** Algo cambió en las filas: que la pantalla recargue su lista y sus totales. */
  onCambio: () => void;
}

export function LoteInmueblesMasivo({ lote, deshabilitado = false, onCambio }: Props) {
  const permisos = usePermissionsContextSafe();
  const puedeDescartar = permisos === null || permisos.canAccess('portafolio', 'delete');

  const [motivos, setMotivos] = useState<MotivosDelLoteInmuebles | null>(null);
  const [alcanceElegido, setAlcanceElegido] = useState<AlcanceId>('pendientes');
  const [seleccionado, setSeleccionado] = useState(false);
  const [clave, setClave] = useState<keyof CamposMasivosInmuebles>('monthlyRent');
  const [valor, setValor] = useState('');
  const [reemplazar, setReemplazar] = useState(false);
  const [corriendo, setCorriendo] = useState<'valor' | 'descartar' | null>(null);
  const [avance, setAvance] = useState<{ procesadas: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** El error del campo «Valor»: va debajo de él, no en el resultado de abajo. */
  const [errorDelValor, setErrorDelValor] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoMasivoPorFiltroInmuebles | null>(null);
  const [confirmaDescarte, setConfirmaDescarte] = useState(false);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cargarMotivos = useCallback(async () => {
    try {
      const m = await inmueblesImportacionApi.motivos(lote);
      if (vivo.current) setMotivos(m);
    } catch {
      // Sin conteos no se ofrece nada que no se sepa: el panel se queda quieto.
      if (vivo.current) setMotivos(null);
    }
  }, [lote]);

  useEffect(() => {
    void cargarMotivos();
  }, [cargarMotivos]);

  const campo = CAMPOS.find((c) => c.clave === clave) ?? CAMPOS[0];
  const cantidad = cuantasDe(alcanceElegido, motivos);
  const ocupado = corriendo !== null;

  // Los motivos que bloquean, de más a menos filas. `canon` va aparte (no bloquea).
  const motivosQueBloquean = (motivos?.porMotivo ?? [])
    .filter((m) => m.codigo !== 'canon' && m.filas > 0)
    .sort((a, b) => b.filas - a.filas);

  const alcances: { id: AlcanceId; etiqueta: string; filas: number }[] = [
    { id: 'pendientes' as AlcanceId, etiqueta: 'Todas las pendientes', filas: motivos?.requierenAtencion ?? 0 },
    ...(motivos && motivos.sinCanon > 0
      ? [{ id: 'canon' as AlcanceId, etiqueta: 'Sin canon', filas: motivos.sinCanon }]
      : []),
    ...motivosQueBloquean.map((m) => ({
      id: `motivo:${m.codigo}` as AlcanceId,
      etiqueta: `Sin ${etiquetaDeFaltante(m.codigo)}`,
      filas: m.filas,
    })),
  ].filter((a) => a.id === 'pendientes' || a.filas > 0);

  const correr = async (cambios: CambiosMasivosInmuebles, que: 'valor' | 'descartar') => {
    setCorriendo(que);
    setError(null);
    setResultado(null);
    setAvance({ procesadas: 0, total: cantidad });
    /** Un error del campo «Valor»: el formulario queda abierto para corregirlo. */
    let quedaAbierto = false;
    const suma: ResultadoMasivoPorFiltroInmuebles = {
      totalAlEmpezar: 0,
      procesadas: 0,
      aplicadas: 0,
      sinCambios: 0,
      listasAhora: 0,
      fallidas: [],
    };
    try {
      for (const filtro of filtrosDe(alcanceElegido)) {
        const base = suma.procesadas;
        const r = await inmueblesImportacionApi.resolverPorFiltro(lote, filtro, cambios, (p) => {
          if (vivo.current) {
            setAvance({ procesadas: base + p.procesadas, total: Math.max(cantidad, base + p.total) });
          }
        });
        suma.totalAlEmpezar += r.totalAlEmpezar;
        suma.procesadas += r.procesadas;
        suma.aplicadas += r.aplicadas;
        suma.sinCambios += r.sinCambios;
        suma.listasAhora += r.listasAhora;
        suma.fallidas.push(...r.fallidas);
        if (r.interrumpida) {
          suma.interrumpida = r.interrumpida;
          break;
        }
      }
      if (vivo.current) setResultado(suma);
    } catch (e) {
      if (!vivo.current) return;
      if (suma.procesadas > 0) {
        suma.interrumpida = { motivo: mensajeDeCarga(e, 'Se cortó a mitad.', 'aplicar el cambio') };
        setResultado(suma);
      } else if (e instanceof ApiError && e.status === 403 && cambios.descartar) {
        setError('Descartar filas en bloque requiere el permiso de eliminar inmuebles y tu rol no lo tiene.');
      } else if (e instanceof ApiError && e.code === 'CAMPO_NO_MASIVO') {
        setError('Ese campo identifica a cada inmueble: no se puede poner el mismo valor a todos.');
      } else if (e instanceof ApiError && e.code === 'LOTE_EN_PROCESO') {
        setError('Esa carga todavía se está preparando. Espera a que termine.');
      } else if (e instanceof ApiError && e.code === 'SIN_CAMBIOS') {
        setError('No hay nada que aplicar.');
      } else if (e instanceof ApiError && e.code === 'CAMPO_INVALIDO' && cambios.campos) {
        // El back dice el campo en inglés («Valores que no sirven: monthlyRent»):
        // acá se sabe cuál se mandó, y el error va debajo de SU input.
        quedaAbierto = true;
        setErrorDelValor(`Ese valor no sirve para «${campo.etiqueta.toLowerCase()}». Revísalo y vuelve a aplicarlo.`);
      } else {
        setError(mensajeDeCarga(e, 'No pudimos aplicar el cambio.', 'aplicar el cambio'));
      }
    } finally {
      if (vivo.current) {
        setCorriendo(null);
        setAvance(null);
        if (!quedaAbierto) setSeleccionado(false);
      }
      await cargarMotivos();
      onCambio();
    }
  };

  const ponerValor = () => {
    let dato: string | number;
    setErrorDelValor(null);
    if (campo.tipo === 'numero') {
      const n = aNumero(valor);
      if (n === null) {
        setErrorDelValor(`Escribe un número mayor que cero para «${campo.etiqueta.toLowerCase()}».`);
        return;
      }
      // Los mismos topes que la corrección de una fila (espejo del back).
      const tope =
        campo.clave === 'monthlyRent' || campo.clave === 'salePrice' || campo.clave === 'area'
          ? errorDelNumero(campo.clave, n)
          : null;
      if (tope) {
        setErrorDelValor(tope);
        return;
      }
      dato = n;
    } else {
      if (!valor.trim()) {
        setErrorDelValor(`Escribe el valor para «${campo.etiqueta.toLowerCase()}».`);
        return;
      }
      dato = valor.trim();
    }
    void correr(
      { campos: { [campo.clave]: dato } as CamposMasivosInmuebles, sobrescribir: reemplazar },
      'valor',
    );
  };

  if (!motivos || (motivos.requierenAtencion === 0 && motivos.sinCanon === 0)) {
    return resultado || error ? <Resultado resultado={resultado} error={error} /> : null;
  }

  const bloqueado = deshabilitado || ocupado;
  const campoDeValorId = 'masivo-inmuebles-valor';

  return (
    <section
      className="rounded-md border border-border dark:border-border-strong p-4 space-y-4"
      aria-label="Acciones en bloque sobre las filas"
      data-testid="lote-inmuebles-masivo"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg dark:text-white">Completar de golpe</h3>
        <p className="text-xs text-fg-muted dark:text-fg-subtle">
          Elige a cuáles filas aplica. Llega a todas las del grupo, no sólo a las que ves en esta página.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo de filas">
        {alcances.map((a) => (
          <Button
            key={a.id}
            type="button"
            size="sm"
            variant={alcanceElegido === a.id ? 'default' : 'outline'}
            hideArrow
            aria-pressed={alcanceElegido === a.id}
            disabled={bloqueado}
            onClick={() => {
              setAlcanceElegido(a.id);
              setSeleccionado(false);
            }}
            data-testid={`alcance-${a.id}`}
          >
            {a.etiqueta} ({N(a.filas)})
          </Button>
        ))}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={seleccionado && cantidad > 0}
          disabled={bloqueado || cantidad === 0}
          onCheckedChange={(c) => setSeleccionado(c === true)}
          data-testid="masivo-inmuebles-seleccionar"
        />
        <span className="text-sm text-fg-muted dark:text-fg-subtle">
          Seleccionar {cantidad === 1 ? 'la 1' : `las ${N(cantidad)}`}
          {alcanceElegido === 'pendientes' ? '' : ' de este grupo'}
        </span>
      </label>

      {seleccionado && cantidad > 0 ? (
        <div className="space-y-4 border-t border-border-faint dark:border-border-strong pt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg dark:text-white">Poner un valor por defecto</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-xs text-fg-muted">
                <span className="block">Campo</span>
                <select
                  className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-fg"
                  value={clave}
                  disabled={bloqueado}
                  onChange={(e) => {
                    setClave(e.target.value as keyof CamposMasivosInmuebles);
                    setValor('');
                    setError(null);
                    setErrorDelValor(null);
                  }}
                  data-testid="masivo-inmuebles-campo"
                >
                  {CAMPOS.map((c) => (
                    <option key={c.clave} value={c.clave}>
                      {c.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-fg-muted" htmlFor={campoDeValorId}>
                <span className="block">Valor</span>
                {campo.tipo === 'opciones' ? (
                  <select
                    id={campoDeValorId}
                    className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-fg"
                    value={valor}
                    disabled={bloqueado}
                    aria-invalid={errorDelValor ? true : undefined}
                    aria-describedby={errorDelValor ? `${campoDeValorId}-error` : undefined}
                    onChange={(e) => {
                      setValor(e.target.value);
                      setErrorDelValor(null);
                    }}
                  >
                    <option value="">Elige…</option>
                    {campo.opciones?.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.etiqueta}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={campoDeValorId}
                    type={campo.tipo === 'fecha' ? 'date' : 'text'}
                    inputMode={campo.tipo === 'numero' ? 'numeric' : undefined}
                    value={valor}
                    disabled={bloqueado}
                    invalid={!!errorDelValor}
                    aria-invalid={errorDelValor ? true : undefined}
                    aria-describedby={errorDelValor ? `${campoDeValorId}-error` : undefined}
                    onChange={(e) => {
                      setValor(e.target.value);
                      setErrorDelValor(null);
                    }}
                    placeholder={campo.clave === 'monthlyRent' ? 'Ej. 1' : undefined}
                    data-testid="masivo-inmuebles-valor"
                  />
                )}
              </label>
              <Button
                type="button"
                size="sm"
                hideArrow
                disabled={bloqueado}
                isLoading={corriendo === 'valor'}
                onClick={ponerValor}
                data-testid="masivo-inmuebles-aplicar"
              >
                Aplicar a {nombreDelAlcance(alcanceElegido, cantidad)}
              </Button>
            </div>
            {/* Fuera del `<label>`: dentro sería parte del nombre del campo. */}
            <ErrorDelCampo id={`${campoDeValorId}-error`} mensaje={errorDelValor} />
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={reemplazar}
                disabled={bloqueado}
                onCheckedChange={(c) => setReemplazar(c === true)}
              />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">
                También reemplazar lo que ya tienen (si no, sólo se llenan las que están vacías)
              </span>
            </label>
            {campo.ayuda ? (
              <p className="text-xs text-warning" data-testid="masivo-inmuebles-ayuda-canon">
                {campo.ayuda}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border-faint dark:border-border-strong pt-3">
            {puedeDescartar ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                hideArrow
                disabled={bloqueado}
                isLoading={corriendo === 'descartar'}
                className="text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setConfirmaDescarte(true)}
                data-testid="masivo-inmuebles-descartar"
              >
                No traer {cantidad === 1 ? 'esta fila' : 'ninguna de estas'}
              </Button>
            ) : (
              <span className="text-xs text-fg-subtle" data-testid="masivo-inmuebles-sin-permiso">
                Descartar filas en bloque requiere el permiso de eliminar inmuebles: pídeselo a un administrador.
              </span>
            )}
          </div>
        </div>
      ) : null}

      {avance ? (
        <div role="status" className="space-y-1" data-testid="masivo-inmuebles-avance">
          <p className="text-xs text-fg-muted">
            {N(avance.procesadas)} de {N(avance.total)} filas…
          </p>
          <progress className="w-full h-1.5" value={avance.procesadas} max={Math.max(avance.total, 1)} />
        </div>
      ) : null}

      <Resultado resultado={resultado} error={error} />

      {/* Se cierra al confirmar: el avance se ve debajo, en la barra de la carga. */}
      <AlertDialog open={confirmaDescarte} onOpenChange={setConfirmaDescarte}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{`¿No traer ${N(cantidad)} ${cantidad === 1 ? 'fila' : 'filas'}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Salen de la carga y no se crea ningún inmueble con ellas. Si sólo les falta el canon, no hace falta
              descartarlas: se crean con el canon por confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="masivo-inmuebles-confirmar-descartar"
              onClick={() => {
                setConfirmaDescarte(false);
                void correr({ descartar: true }, 'descartar');
              }}
            >
              Sí, no traerlas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Resultado({
  resultado,
  error,
}: {
  resultado: ResultadoMasivoPorFiltroInmuebles | null;
  error: string | null;
}) {
  if (!resultado && !error) return null;
  const porMotivo = new Map<string, number>();
  for (const f of resultado?.fallidas ?? []) porMotivo.set(f.motivo, (porMotivo.get(f.motivo) ?? 0) + 1);
  return (
    <div role="status" className="space-y-1" data-testid="masivo-inmuebles-resultado">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {resultado ? (
        <>
          <p className="text-sm text-fg">
            {resultado.aplicadas === 1 ? 'Se aplicó a 1 fila' : `Se aplicó a ${N(resultado.aplicadas)} filas`}
            {resultado.sinCambios > 0 ? ` · ${N(resultado.sinCambios)} ya lo tenían y no se tocaron` : ''}
            {resultado.fallidas.length > 0 ? ` · ${N(resultado.fallidas.length)} no se pudieron` : ''}.
          </p>
          {resultado.interrumpida ? (
            <p className="text-xs text-warning">
              Se cortó antes de terminar ({resultado.interrumpida.motivo}). Lo aplicado quedó aplicado: repite la
              acción y retoma lo que falta.
            </p>
          ) : null}
          {[...porMotivo.entries()].map(([motivo, n]) => (
            <p key={motivo} className="text-xs text-fg-muted">
              {N(n)} · {motivo}
            </p>
          ))}
        </>
      ) : null}
    </div>
  );
}
