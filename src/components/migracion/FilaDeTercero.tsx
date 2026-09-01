'use client';

/**
 * Una fila que necesita a un humano.
 *
 * ── El principio ────────────────────────────────────────────────────────────
 *
 * Todo se arregla ACÁ, sin volver a subir el archivo. Corregir el Excel y
 * resubirlo por cada celda vacía es exactamente cómo una migración se abandona
 * a la mitad, y en 600 propietarios siempre falta una.
 *
 * ── El duplicado se pregunta, no se resuelve solo ──────────────────────────
 *
 * Dos filas con el mismo documento pueden ser la misma persona con seis
 * inmuebles, o dos personas con un documento mal tecleado. Fusionarlas solas
 * crea una ficha que mezcla a dos dueños y le gira la plata al equivocado.
 * Las tres salidas se ofrecen explícitas —es la misma / es otra / no la traigas—
 * y ninguna es el default.
 */

import { useId, useMemo, useState } from 'react';
import { Link as LinkIcon, Trash, Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CODIGOS_DE_DUPLICADO,
  type ColumnaDePlantilla,
  type FilaDeStaging,
  type FilaTercero,
} from '@/lib/api/migracion-terceros.service';

/** Radix no admite `value=""` en un `<SelectItem>`. */
const SIN_VALOR = '__vacio__';

/**
 * Qué pasó con una acción sobre la fila. Lo devuelve el padre (que es quien
 * llama al back) para que ESTA tarjeta pueda mostrar el fallo al lado del
 * botón apretado — el cartel global de arriba no se ve desde la tarjeta 200 —
 * y decidir si el borrador tecleado se conserva.
 */
export interface ResultadoDeAccion {
  ok: boolean;
  mensaje: string | null;
}

/**
 * El valor de una celda listo para un `<input>`.
 *
 * `datos` viene NORMALIZADO por el back: los sí/no son booleanos y el banco es
 * un código de catálogo. Un `<input>` con `value={true}` pinta «true», así que
 * la traducción de vuelta al vocabulario de la plantilla («Sí» / «No») se hace
 * acá — es el mismo que muestran las `opciones`.
 */
export function valorEditable(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

/**
 * Una celda del formulario de corrección.
 *
 * 🔴 No es un `<label>` envolviendo el control. El `SelectTrigger` de Radix es
 * un `<button>`, y un `<button>` NO es un elemento etiquetable: el `<label>`
 * que lo envuelve no le presta su texto como nombre accesible, así que un
 * lector de pantalla anuncia «botón» sin decir de qué campo. Y clickear el
 * texto activaría el botón sin quererlo. Por eso el texto es un `<span>` con
 * `id` y el control lo referencia con `aria-labelledby` — que sí funciona para
 * los dos, el input y el trigger.
 */
function CeldaEditable({
  columna,
  valor,
  onCambia,
}: {
  columna: ColumnaDePlantilla;
  valor: string;
  onCambia: (valor: string) => void;
}) {
  const base = useId();
  const idEtiqueta = `${base}-etiqueta`;
  const idAyuda = `${base}-ayuda`;

  return (
    <div className="space-y-1">
      <span id={idEtiqueta} className="block text-sm text-fg-muted">
        {columna.titulo}
        {columna.obligatoria ? <span className="text-danger"> *</span> : null}
      </span>

      {columna.opciones ? (
        <Select
          value={valor || SIN_VALOR}
          onValueChange={(v) => onCambia(v === SIN_VALOR ? '' : v)}
        >
          <SelectTrigger
            aria-labelledby={idEtiqueta}
            aria-describedby={columna.ayuda ? idAyuda : undefined}
            data-testid={`campo-${columna.campo}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* «Sin definir» existe a propósito: vacío significa «no lo
                sabemos», que NO es lo mismo que «no». */}
            <SelectItem value={SIN_VALOR}>Sin definir</SelectItem>
            {columna.opciones.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={valor}
          placeholder={columna.ejemplo}
          aria-labelledby={idEtiqueta}
          aria-describedby={columna.ayuda ? idAyuda : undefined}
          data-testid={`campo-${columna.campo}`}
          onChange={(e) => onCambia(e.target.value)}
        />
      )}

      {columna.ayuda ? (
        <span id={idAyuda} className="block text-xs text-fg-subtle">
          {columna.ayuda}
        </span>
      ) : null}
    </div>
  );
}

export function FilaDeTercero({
  fila,
  columnas,
  guardando,
  onCorregir,
  onVincular,
  onDescartar,
}: {
  fila: FilaDeStaging;
  columnas: readonly ColumnaDePlantilla[];
  guardando: boolean;
  onCorregir: (campos: FilaTercero) => Promise<ResultadoDeAccion>;
  onVincular: () => Promise<ResultadoDeAccion>;
  onDescartar: () => Promise<ResultadoDeAccion>;
}) {
  const errores = useMemo(() => fila.errores ?? [], [fila.errores]);

  const duplicado = useMemo(
    () => errores.find((e) => CODIGOS_DE_DUPLICADO.includes(e.codigo)),
    [errores],
  );

  /**
   * Qué celdas se ofrecen para editar.
   *
   * Por defecto sólo las señaladas por un error: mostrar las dieciséis
   * columnas de un propietario en cada una de 200 tarjetas convierte la lista
   * de trabajo en un formulario infinito. «Ver todos los campos» está para el
   * caso en que el error de una celda se arregla tocando otra —cambiar el tipo
   * de documento a NIT cambia la regla del número.
   */
  const [verTodo, setVerTodo] = useState(false);
  const camposConError = useMemo(
    () => new Set(errores.map((e) => e.campo).filter((c): c is string => Boolean(c))),
    [errores],
  );
  const visibles = verTodo
    ? columnas
    : columnas.filter((c) => camposConError.has(c.campo));

  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const hayCambios = Object.keys(borrador).length > 0;

  /**
   * El fallo de la ÚLTIMA acción de esta fila, al lado de sus botones.
   *
   * 🔴 El borrador se limpia SÓLO si la acción pasó. Antes, `Guardar` vaciaba
   * lo tecleado en el mismo clic: si el guardado fallaba, los quince campos
   * corregidos volvían a lo de antes y había que teclearlos de nuevo — la
   * manera más rápida de que alguien abandone una migración de 600 filas.
   */
  const [errorDeFila, setErrorDeFila] = useState<string | null>(null);

  const guardar = async () => {
    setErrorDeFila(null);
    const r = await onCorregir(borrador as FilaTercero);
    if (r.ok) setBorrador({});
    else if (r.mensaje) {
      setErrorDeFila(`${r.mensaje} Lo que escribiste sigue acá — reintentá Guardar.`);
    }
  };

  const vincular = async () => {
    setErrorDeFila(null);
    const r = await onVincular();
    if (!r.ok && r.mensaje) setErrorDeFila(`${r.mensaje} Reintentá.`);
  };

  const descartar = async () => {
    setErrorDeFila(null);
    const r = await onDescartar();
    if (!r.ok && r.mensaje) setErrorDeFila(`${r.mensaje} Reintentá.`);
  };

  const valorDe = (campo: string): string =>
    borrador[campo] ?? valorEditable(fila.datos[campo]);

  const nombre = valorEditable(fila.datos.nombre) || 'sin nombre';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-fg">
          <span className="font-mono text-xs tabular-nums text-fg-subtle">
            {/* El número que la persona ve en SU archivo: el back lo guarda
                1-based en `_fila`, no hay que sumarle nada. */}
            Fila {fila.datos._fila}
          </span>{' '}
          · {nombre}
        </p>
        <p className="font-mono text-xs tabular-nums text-fg-subtle">
          {valorEditable(fila.datos.documento)}
        </p>
      </div>

      {/* Qué le falta, en las palabras del back. El código es el contrato; el
          mensaje es copy y viene listo para mostrar. */}
      <ul className="space-y-1">
        {errores.map((e, i) => (
          <li key={`${e.codigo}-${i}`} className="flex items-start gap-2 text-sm text-fg-muted">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{e.mensaje}</span>
          </li>
        ))}
      </ul>

      {duplicado ? (
        <div className="space-y-2 rounded-md border border-border bg-warning-soft p-3">
          <p className="text-sm font-medium text-fg">
            {duplicado.referencia?.nombre
              ? `Ya existe «${duplicado.referencia.nombre}» con este documento.`
              : duplicado.referencia?.fila
                ? `La fila ${duplicado.referencia.fila} de este archivo trae el mismo documento.`
                : 'Este documento ya está en el sistema.'}
          </p>
          <p className="text-sm text-fg-muted">
            Si es la misma persona, la fila se engancha a la ficha que ya está y
            <strong className="font-medium text-fg"> no le pisa ni un dato</strong> — la ficha se
            edita desde Propietarios. Si son dos personas distintas, corregí el documento acá abajo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" hideArrow disabled={guardando} onClick={() => void vincular()}>
              <LinkIcon className="mr-1.5 h-4 w-4" />
              Es la misma persona
            </Button>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              disabled={guardando}
              onClick={() => setVerTodo(true)}
            >
              Es otra persona
            </Button>
          </div>
        </div>
      ) : null}

      {visibles.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map((columna) => (
            <CeldaEditable
              key={columna.campo}
              columna={columna}
              valor={valorDe(columna.campo)}
              onCambia={(v) => setBorrador((b) => ({ ...b, [columna.campo]: v }))}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          hideArrow
          disabled={!hayCambios || guardando}
          isLoading={guardando}
          onClick={() => void guardar()}
        >
          Guardar
        </Button>

        <Button
          size="sm"
          variant="link"
          hideArrow
          className="text-xs"
          onClick={() => setVerTodo((v) => !v)}
        >
          {verTodo ? 'Ver sólo lo que falta' : 'Ver todos los campos'}
        </Button>

        <span className="flex-1" />

        {/* «No la traigas», no «borrar»: la fila queda como DESCARTADO y el
            rastro se conserva. */}
        <Button
          size="sm"
          variant="outline"
          hideArrow
          disabled={guardando}
          className="text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => void descartar()}
        >
          <Trash className="mr-1.5 h-4 w-4" />
          No traer esta fila
        </Button>
      </div>

      {errorDeFila ? (
        <p
          className="flex items-start gap-2 text-sm text-danger"
          data-testid="error-de-fila"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorDeFila}</span>
        </p>
      ) : null}
    </div>
  );
}
