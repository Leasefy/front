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
 *
 * ── Faltar un dato del documento no es motivo para perder a la persona ──────
 *
 * T-0128 (dueño del producto): «el que no traiga un campo lo dejamos en blanco y
 * la inmobiliaria lo carga después; no quiero descartar registros». Si lo único
 * que le pasa a la fila es que falta el tipo o el número de documento (o no es
 * válido), la salida que se ofrece primero es «Crear con datos por completar»:
 * la ficha se crea y queda marcada. Descartar sigue existiendo, pero es la
 * salida discreta, nunca el camino por defecto.
 */

import { useId, useMemo, useState } from 'react';
import { Link as LinkIcon, Trash, UserPlus, Users, Warning } from '@phosphor-icons/react';

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
  CODIGOS_COMPLETABLES,
  CODIGOS_DE_DUPLICADO,
  type ColumnaDePlantilla,
  type FilaDeStaging,
  type FilaTercero,
  type TipoDeTercero,
} from '@/lib/api/migracion-terceros.service';
import {
  ayudaDelNumeroDeDocumento,
  tipoDeDocumentoDe,
} from '@/lib/migracion/ayuda-del-documento';
import { placeholderDeEjemplo } from '@/lib/migracion/columnas-de-tercero';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { cn } from '@/lib/utils';

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
  /**
   * Sistema de errores (02-10-2026): lo que el back señaló por campo
   * (`campos[]` de un 400), con el nombre de la columna de la plantilla. Va
   * debajo de SU celda; `mensaje` queda para lo que no tiene celda.
   */
  porCampo?: Record<string, string>;
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
  id,
  columna,
  valor,
  onCambia,
  conError = false,
  mensaje = null,
}: {
  /** El id del control: el padre lo enfoca si el back rechazó esta celda. */
  id: string;
  columna: ColumnaDePlantilla;
  valor: string;
  onCambia: (valor: string) => void;
  /** El back señaló esta celda: se resalta para que se vea dónde corregir. */
  conError?: boolean;
  /**
   * El error que mandó el back para esta celda al GUARDAR (un 400 con
   * `campos`). Va debajo de la celda, con su entrada suave.
   */
  mensaje?: string | null;
}) {
  const base = useId();
  const idEtiqueta = `${base}-etiqueta`;
  const idAyuda = `${base}-ayuda`;
  const idError = `${id}-error`;
  const invalida = conError || Boolean(mensaje);
  const descritaPor =
    [columna.ayuda ? idAyuda : null, mensaje ? idError : null].filter(Boolean).join(' ') ||
    undefined;

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
            id={id}
            aria-invalid={invalida || undefined}
            /* «Sin definir» es la AUSENCIA de dato, no un dato: con el color de
               un valor elegido se leía como lleno (Nico, 01-10). */
            className={cn(invalida && 'border-danger', !valor && 'text-fg-placeholder')}
            aria-labelledby={idEtiqueta}
            aria-describedby={descritaPor}
            data-testid={`campo-${columna.campo}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* «Sin definir» existe a propósito: vacío significa «no lo
                sabemos», que NO es lo mismo que «no». */}
            <SelectItem value={SIN_VALOR}>Sin definir</SelectItem>
            {/* Un valor que no está en el catálogo —un banco como «CONFIAR»
                que se guardó tal como venía— se muestra y se puede dejar:
                sin esta opción el select lo pintaba como «Sin definir» y
                guardar la fila lo borraba en silencio. */}
            {valor && !columna.opciones.includes(valor) ? (
              <SelectItem value={valor}>{valor} (como viene en el archivo)</SelectItem>
            ) : null}
            {columna.opciones.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          value={valor}
          placeholder={placeholderDeEjemplo(columna.ejemplo)}
          aria-labelledby={idEtiqueta}
          aria-describedby={descritaPor}
          // Antes sólo el select se marcaba: un input señalado por el back
          // no se distinguía de los demás.
          aria-invalid={invalida || undefined}
          invalid={invalida}
          data-testid={`campo-${columna.campo}`}
          onChange={(e) => onCambia(e.target.value)}
        />
      )}

      {columna.ayuda ? (
        <span id={idAyuda} className="block text-caption text-fg-subtle">
          {columna.ayuda}
        </span>
      ) : null}
      <ErrorDelCampo id={idError} mensaje={mensaje} />
    </div>
  );
}

export function FilaDeTercero({
  fila,
  columnas,
  guardando,
  tipo = 'PROPIETARIO',
  onCorregir,
  onVincular,
  onDescartar,
  onCrearIncompleta,
}: {
  fila: FilaDeStaging;
  columnas: readonly ColumnaDePlantilla[];
  guardando: boolean;
  /**
   * Propietarios o inquilinos. Cambia DÓNDE se edita la ficha con la que se
   * choca: decirle «se edita desde Propietarios» a alguien parado en el paso
   * de Inquilinos lo manda a buscar a otra sección (Nico, 2026-09-08).
   */
  tipo?: TipoDeTercero;
  onCorregir: (campos: FilaTercero) => Promise<ResultadoDeAccion>;
  onVincular: () => Promise<ResultadoDeAccion>;
  onDescartar: () => Promise<ResultadoDeAccion>;
  /**
   * T-0128 · crear la ficha con los datos del documento en blanco. Ausente =
   * la pantalla no lo ofrece (un padre anterior a T-0128).
   */
  onCrearIncompleta?: () => Promise<ResultadoDeAccion>;
}) {
  const errores = useMemo(() => fila.errores ?? [], [fila.errores]);

  const duplicado = useMemo(
    () => errores.find((e) => CODIGOS_DE_DUPLICADO.includes(e.codigo)),
    [errores],
  );

  /**
   * ── Por qué choca: por el correo o por el documento ───────────────────────
   *
   * 🔴 Nico (2026-09-08), en el paso de Inquilinos: «dice que ya hay una
   * cuenta con esos correos, y eso que dices que es un correo ni es un correo
   * — mira los inputs, los correos están bien». Tenía razón dos veces:
   *
   *  1. El aviso ponía el NOMBRE de la cuenta justo después de «con este
   *     correo:», así que se leía como si «juan lopez» fuera el correo.
   *  2. El recuadro decía SIEMPRE «con este documento» y «la ficha se edita
   *     desde Propietarios», aunque el choque fuera por correo y aunque se
   *     estuviera cargando inquilinos. En propietarios el duplicado se busca
   *     por documento; en inquilinos, por correo (la cuenta del portal es el
   *     correo) — el texto se quedó con el primer caso.
   *
   * Ahora el recuadro se arma con el campo que el back señala (`campo`), y el
   * aviso repetido de la lista de arriba se saca: el mismo choque no se cuenta
   * dos veces, una mal y otra bien.
   */
  const chocaPorCorreo = duplicado?.campo === 'correo';
  const seccionDeLaFicha = tipo === 'INQUILINO' ? 'Inquilinos' : 'Propietarios';
  const queCorregir = chocaPorCorreo ? 'el correo' : 'el documento';

  /**
   * T-0128 · ¿lo único que le pasa a la fila es que falta (o no vale) el dato
   * del documento? Entonces se puede crear ya, incompleta. Una fila que además
   * es duplicada, no trae nombre o trae varias personas necesita una decisión
   * distinta, y ofrecerle esto prometería algo que el back no hace.
   */
  const soloFaltaElDocumento =
    errores.length > 0 && errores.every((e) => CODIGOS_COMPLETABLES.includes(e.codigo));

  /** T-0128 · varias personas en una celda: se muestra el texto crudo y se decide. */
  const variasPersonas = errores.find((e) => e.codigo === 'VARIAS_PERSONAS_EN_LA_FILA');

  /** Los avisos que NO son el duplicado: ese tiene su propio recuadro abajo. */
  const avisos = useMemo(
    () => errores.filter((e) => !CODIGOS_DE_DUPLICADO.includes(e.codigo)),
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
  /**
   * Lo que el back rechazó por celda en el último «Guardar» (un 400 con
   * `campos`). Se borra la de una celda apenas se la vuelve a tocar.
   */
  const [erroresDeCelda, setErroresDeCelda] = useState<Record<string, string>>({});
  const idDeCelda = (campo: string) => `tercero-${fila.id}-${campo}`;
  /*
   * Qué acción de la fila está esperando al back. «No traer esta fila» y
   * «Usar la ficha existente» no tenían estado de carga: se apretaba, no
   * pasaba nada visible, y se volvía a apretar (Nico, 2026-09-07). Mientras
   * una acción corre, las tres quedan apagadas y la que corre gira.
   */
  const [ocupadaEn, setOcupadaEn] = useState<'vincular' | 'descartar' | 'incompleta' | null>(null);
  const ocupada = guardando || ocupadaEn !== null;

  const guardar = async () => {
    setErrorDeFila(null);
    setErroresDeCelda({});
    const r = await onCorregir(borrador as FilaTercero);
    if (r.ok) {
      setBorrador({});
      return;
    }
    const porCampo = r.porCampo ?? {};
    const conCelda = Object.keys(porCampo);
    if (conCelda.length > 0) {
      // Las celdas rechazadas tienen que verse aunque la vista esté en «sólo
      // lo que falta»: se abren todas y se enfoca la primera.
      setErroresDeCelda(porCampo);
      if (conCelda.some((c) => !camposConError.has(c))) setVerTodo(true);
      requestAnimationFrame(() => document.getElementById(idDeCelda(conCelda[0]))?.focus());
    }
    if (r.mensaje) {
      setErrorDeFila(`${r.mensaje} Lo que escribiste sigue acá — reintenta Guardar.`);
    }
  };

  const vincular = async () => {
    setErrorDeFila(null);
    setOcupadaEn('vincular');
    try {
      const r = await onVincular();
      if (!r.ok && r.mensaje) setErrorDeFila(`${r.mensaje} Reintenta.`);
    } finally {
      setOcupadaEn(null);
    }
  };

  const crearIncompleta = async () => {
    if (!onCrearIncompleta) return;
    setErrorDeFila(null);
    setOcupadaEn('incompleta');
    try {
      const r = await onCrearIncompleta();
      if (!r.ok && r.mensaje) setErrorDeFila(`${r.mensaje} Reintenta.`);
    } finally {
      setOcupadaEn(null);
    }
  };

  const descartar = async () => {
    setErrorDeFila(null);
    setOcupadaEn('descartar');
    try {
      const r = await onDescartar();
      if (!r.ok && r.mensaje) setErrorDeFila(`${r.mensaje} Reintenta.`);
    } finally {
      setOcupadaEn(null);
    }
  };

  const valorDe = (campo: string): string =>
    borrador[campo] ?? valorEditable(fila.datos[campo]);

  /**
   * La ayuda bajo «Número de documento» es la del TIPO de la fila —o del que
   * el operador acaba de elegir en el select, si lo cambió—: a una cédula no
   * se le habla del dígito de verificación del NIT (2026-09-07). La regla que
   * valida el back es por tipo; este texto es su espejo.
   */
  const conAyudaPorTipo = (columna: ColumnaDePlantilla): ColumnaDePlantilla =>
    columna.campo === 'documento'
      ? {
          ...columna,
          ayuda: ayudaDelNumeroDeDocumento(tipoDeDocumentoDe(valorDe('tipoDocumento'))),
        }
      : columna;

  const nombre = valorEditable(fila.datos.nombre) || 'sin nombre';

  return (
    /*
     * Sin tarjeta propia (glow-up 30-09): la fila vive como renglón de la
     * lista de trabajo, que es UNA tarjeta con filetes. Doscientas
     * tarjetitas con la casilla colgando afuera eran el mar de islas.
     */
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-fg">
          <span className="font-mono text-caption tabular-nums text-fg-subtle">
            {/* El número que la persona ve en SU archivo: el back lo guarda
                1-based en `_fila`, no hay que sumarle nada. */}
            Fila {fila.datos._fila}
          </span>{' '}
          · {nombre}
        </p>
        <p className="font-mono text-caption tabular-nums text-fg-subtle">
          {valorEditable(fila.datos.documento) || 'Sin documento'}
        </p>
      </div>

      {/* Qué le falta, en las palabras del back. El código es el contrato; el
          mensaje es copy y viene listo para mostrar. */}
      <ul className="space-y-1">
        {avisos.map((e, i) => (
          <li key={`${e.codigo}-${i}`} className="flex items-start gap-2 text-sm text-fg-muted">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              {e.codigo === 'CORREO_INVALIDO'
                ? 'El correo no es válido (revisa que no tenga espacios ni signos como < >).'
                : e.mensaje}
            </span>
          </li>
        ))}
      </ul>

      {variasPersonas ? (
        /*
         * T-0128 · «Ana Pérez | Luis Gómez» en una sola celda. El back no
         * adivina cuál es quién ni parte la fila: conserva el texto tal cual y
         * lo bloquea. Se muestra EL TEXTO CRUDO —es lo que la persona
         * reconoce de su archivo— y las dos salidas honestas: dejar una sola
         * persona acá, o no traer la fila y cargar a cada una por su cuenta.
         */
        <div
          className="space-y-2 rounded-md bg-warning-soft p-3"
          data-testid="varias-personas"
        >
          <p className="flex items-start gap-2 text-sm font-medium text-fg">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            Esta fila trae a varias personas en la misma celda
          </p>
          <p
            className="rounded bg-surface px-2.5 py-1.5 font-mono text-caption text-fg [overflow-wrap:anywhere]"
            data-testid="varias-personas-texto"
          >
            {valorEditable(fila.datos.nombre) || 'sin texto'}
          </p>
          <p className="text-sm text-fg-muted">
            Una ficha es una sola persona, así que no la creamos así. Edita el nombre acá abajo
            para dejar a una sola persona, o no traigas esta fila y carga a las demás por su
            cuenta (desde {seccionDeLaFicha} o en otro archivo).
          </p>
        </div>
      ) : null}

      {duplicado ? (
        <div className="space-y-2 rounded-md bg-warning-soft p-3">
          <p className="text-sm font-medium text-fg">
            {duplicado.referencia?.nombre
              ? chocaPorCorreo
                ? `Ese correo ya tiene cuenta en Leasefy: es la de «${duplicado.referencia.nombre}».`
                : `Ya existe «${duplicado.referencia.nombre}» con este documento.`
              : duplicado.referencia?.fila
                ? `La fila ${duplicado.referencia.fila} de este archivo trae ${
                    chocaPorCorreo ? 'el mismo correo' : 'el mismo documento'
                  }.`
                : chocaPorCorreo
                  ? // Sin nombre y por correo: el back no lo manda a propósito
                    // cuando la cuenta NO es de esta inmobiliaria — decir de
                    // quién es sería filtrar datos de un tercero.
                    'Ese correo ya está tomado por una cuenta que no es de tu inmobiliaria.'
                  : 'Ese documento ya está en el sistema.'}
          </p>
          <p className="text-sm text-fg-muted">
            {duplicado.referencia?.fila ? (
              <>
                Si es la misma persona repetida en el archivo, deja una sola y no traigas ésta. Si
                son dos personas distintas, corrige {queCorregir} acá abajo.
              </>
            ) : chocaPorCorreo ? (
              <>
                Si es la misma persona, la fila se engancha a esa cuenta y
                <strong className="font-medium text-fg"> no le pisa ni un dato</strong>. Si son dos
                personas distintas, corrige el correo acá abajo: la cuenta del portal se crea por
                correo, así que con el mismo correo las dos entrarían a la misma cuenta.
              </>
            ) : (
              <>
                Si es la misma persona, la fila se engancha a la ficha que ya está y
                <strong className="font-medium text-fg"> no le pisa ni un dato</strong> — la ficha
                se edita desde {seccionDeLaFicha}. Si son dos personas distintas, corrige el
                documento acá abajo.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              hideArrow
              disabled={ocupada}
              isLoading={ocupadaEn === 'vincular'}
              onClick={() => void vincular()}
            >
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
              id={idDeCelda(columna.campo)}
              columna={conAyudaPorTipo(columna)}
              valor={valorDe(columna.campo)}
              conError={camposConError.has(columna.campo)}
              mensaje={erroresDeCelda[columna.campo] ?? null}
              onCambia={(v) => {
                setBorrador((b) => ({ ...b, [columna.campo]: v }));
                setErroresDeCelda((errores) => {
                  if (!errores[columna.campo]) return errores;
                  const { [columna.campo]: _quitado, ...resto } = errores;
                  void _quitado;
                  return resto;
                });
              }}
            />
          ))}
        </div>
      ) : null}

      {/*
        * T-0128 · la salida que se ofrece PRIMERO cuando sólo falta el documento.
        * Dice qué pasa de verdad: la ficha se crea ahora y la inmobiliaria la
        * completa después. No es «ignorar el problema», es dónde se resuelve.
        */}
      {soloFaltaElDocumento && onCrearIncompleta ? (
        <div
          className="space-y-2 rounded-md bg-primary-soft p-3"
          data-testid="crear-incompleta"
        >
          <p className="text-sm text-fg">
            Puedes crear a esta persona <strong className="font-medium">ya, con el dato del documento
            en blanco</strong>. Queda marcada como «datos por completar» y la completas después desde{' '}
            {seccionDeLaFicha}.
          </p>
          <Button
            size="sm"
            hideArrow
            disabled={ocupada}
            isLoading={ocupadaEn === 'incompleta'}
            onClick={() => void crearIncompleta()}
            data-testid="boton-crear-incompleta"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Crear con datos por completar
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={soloFaltaElDocumento && onCrearIncompleta ? 'outline' : undefined}
          hideArrow
          disabled={!hayCambios || ocupada}
          isLoading={guardando}
          onClick={() => void guardar()}
        >
          Guardar
        </Button>

        <Button
          size="sm"
          variant="link"
          hideArrow
          className="text-caption"
          onClick={() => setVerTodo((v) => !v)}
        >
          {verTodo ? 'Ver sólo lo que falta' : 'Ver todos los campos'}
        </Button>

        <span className="flex-1" />

        {/* «No la traigas», no «borrar»: la fila queda como DESCARTADO y el
            rastro se conserva. T-0128: la salida discreta, no el camino por
            defecto — no se pierde a nadie por un dato que falta. */}
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          disabled={ocupada}
          isLoading={ocupadaEn === 'descartar'}
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
