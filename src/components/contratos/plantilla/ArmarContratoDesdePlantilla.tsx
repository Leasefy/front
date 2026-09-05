'use client';

/**
 * Armar el contrato desde la plantilla legal — los dos modos, una sola pantalla.
 *
 * El modo IA no es otro camino: es el modo plantilla con un paso antes. El
 * modelo elige cláusulas de un catálogo CERRADO y llena variables, y todo eso
 * cae en los MISMOS campos editables de acá. Por eso «revisar la propuesta» no
 * es una pantalla de sólo lectura con un botón de aceptar: es este formulario
 * ya lleno, con cada cláusula quitable y cada variable reescribible.
 *
 * 🔴 Tres reglas que la pantalla respeta y que vienen del backend:
 *   1. Los motivos del validador se muestran COMPLETOS, con su norma. Son lo
 *      que le dice a la inmobiliaria qué cláusula es ilegal y por qué artículo.
 *   2. Nada se genera de un solo clic desde la IA: la propuesta se revisa.
 *   3. Nada se firma ni se activa acá. Esto produce un PDF; el contrato lo crea
 *      una persona con el botón de siempre.
 */

import { useState } from 'react';
import {
  ArrowClockwise,
  CheckCircle,
  FileText,
  Scales,
  Sparkle,
  Trash,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { MotivosDelValidador } from './MotivosDelValidador';
import {
  MAXIMO_DE_ESTIPULACIONES,
  MAXIMO_DE_INSTRUCCIONES,
  MINIMO_DE_INSTRUCCIONES,
  bloqueadaPor,
} from '@/lib/contratos/plantilla-legal';
import type { EstadoDelContratoDesdePlantilla } from '@/lib/contratos/useContratoDesdePlantilla';

interface Props {
  /** `template` = elegir del catálogo. `generate` = describirlo y que proponga. */
  modo: 'template' | 'generate';
  estado: EstadoDelContratoDesdePlantilla;
}

export function ArmarContratoDesdePlantilla({ modo, estado }: Props) {
  const {
    preparacion,
    preparando,
    usoIndeterminado,
    errorDePreparacion,
    valores,
    clausulas,
    estipulaciones,
    instrucciones,
    propuesta,
    deducidasPorLaIa,
    pidiendoPropuesta,
    errorDeLaIa,
    generando,
    generado,
    generadoQuedoViejo,
    motivosDeRechazo,
    faltantes,
    errorAlGenerar,
    campos,
    incompletos,
    puedeGenerar,
    puedePedirPropuesta,
  } = estado;

  const conIa = modo === 'generate';

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-5"
      data-testid="armar-contrato-desde-plantilla"
    >
      <div>
        <h2 className="text-base font-semibold text-fg">
          {conIa ? 'Describí el acuerdo' : 'Contrato desde la plantilla'}
        </h2>
        <p className="text-caption text-fg-muted mt-0.5">
          {conIa
            ? 'El asistente elige cláusulas de un catálogo cerrado y llena datos. No redacta texto legal, y lo que proponga lo revisás vos antes de generar nada.'
            : 'El texto sale de la plantilla legal del sistema. Las cláusulas opcionales son fijas y cada una trae la norma que la sostiene.'}
        </p>
      </div>

      {/* Falta decir si es vivienda o comercial: sin eso no hay plantilla que
          elegir, porque de ahí depende la ley que rige el contrato. */}
      {usoIndeterminado && (
        <p
          data-testid="plantilla-uso-indeterminado"
          className="flex items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-body-sm text-warning"
        >
          <Scales weight="fill" aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{usoIndeterminado}</span>
        </p>
      )}

      {errorDePreparacion && (
        <p
          data-testid="plantilla-error-preparacion"
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger"
        >
          <Warning weight="fill" aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorDePreparacion}</span>
        </p>
      )}

      {preparando && !preparacion && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" variant="muted" />
        </div>
      )}

      {conIa && <BloqueDeIa estado={estado} />}

      {preparacion && (
        <>
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
            <p className="text-body-sm text-fg">{preparacion.nombre}</p>
            <p className="text-caption text-fg-muted mt-0.5">
              {preparacion.uso === 'COMERCIAL'
                ? 'Local comercial · Código de Comercio, artículos 518 a 524'
                : 'Vivienda urbana · Ley 820 de 2003'}
              {preparacion.inmueble?.direccion ? ` · ${preparacion.inmueble.direccion}` : ''}
            </p>
          </div>

          <TopesLegalesDelContrato topes={preparacion.topes} />

          {/* La propuesta de la IA, cláusula por cláusula y con su fundamento a
              la vista. Va antes de los campos: es lo primero que hay que mirar. */}
          {propuesta && (
            <RevisionDeLaPropuesta
              propuesta={propuesta}
              clausulas={clausulas}
              catalogo={preparacion.clausulas}
              deducidas={deducidasPorLaIa}
              campos={campos}
              onQuitar={estado.quitarClausula}
              onDescartar={estado.descartarPropuesta}
            />
          )}

          <CamposDelContrato
            campos={campos}
            valores={valores}
            deducidas={deducidasPorLaIa}
            onEscribir={estado.escribirCampo}
          />

          <CatalogoDeClausulas
            catalogo={preparacion.clausulas}
            elegidas={clausulas}
            onAlternar={estado.alternar}
          />

          <div className="space-y-1.5">
            <Label htmlFor="plantilla-estipulaciones">
              Estipulaciones especiales{' '}
              <span className="font-normal text-fg-muted">(opcional)</span>
            </Label>
            <Textarea
              id="plantilla-estipulaciones"
              data-testid="plantilla-estipulaciones"
              rows={3}
              maxLength={MAXIMO_DE_ESTIPULACIONES}
              value={estipulaciones}
              onChange={(e) => estado.escribirEstipulaciones(e.target.value)}
            />
            <p className="text-caption text-fg-muted">
              Lo acordado que ninguna cláusula del catálogo cubre. Pasa por el mismo
              control legal que el resto: un depósito en dinero escrito acá tampoco se
              emite.
            </p>
          </div>

          <MotivosDelValidador
            data-testid="plantilla-motivos"
            titulo="El contrato no se puede emitir así"
            tono="rechazo"
            motivos={motivosDeRechazo}
          />

          {faltantes.length > 0 && (
            <p
              data-testid="plantilla-faltantes"
              className="rounded-lg bg-warning-soft px-4 py-3 text-body-sm text-warning"
            >
              Faltan datos para generar el contrato: {faltantes.join(', ')}.
            </p>
          )}

          {errorAlGenerar && (
            <p
              data-testid="plantilla-error-generar"
              role="alert"
              className="rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger"
            >
              {errorAlGenerar}
            </p>
          )}

          <ContratoListo
            generado={generado}
            quedoViejo={generadoQuedoViejo}
            generando={generando}
            puedeGenerar={puedeGenerar}
            incompletos={incompletos.map((c) => c.etiqueta)}
            onGenerar={() => void estado.generar()}
          />
        </>
      )}
    </section>
  );
}

// ─── IA ──────────────────────────────────────────────────────────────────────

function BloqueDeIa({ estado }: { estado: EstadoDelContratoDesdePlantilla }) {
  const { instrucciones, pidiendoPropuesta, errorDeLaIa, puedePedirPropuesta } = estado;
  const escritos = instrucciones.trim().length;

  return (
    <div className="space-y-2">
      <Label htmlFor="plantilla-instrucciones">Contá qué querés pactar</Label>
      <Textarea
        id="plantilla-instrucciones"
        data-testid="plantilla-instrucciones"
        rows={4}
        maxLength={MAXIMO_DE_INSTRUCCIONES}
        value={instrucciones}
        disabled={pidiendoPropuesta}
        placeholder="El inquilino tiene un perro pequeño. Incluye el parqueadero 42. Codeudor: la hermana. Se prohíbe subarrendar."
        onChange={(e) => estado.escribirInstrucciones(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-fg-muted">
          {escritos < MINIMO_DE_INSTRUCCIONES
            ? `Escribí al menos ${MINIMO_DE_INSTRUCCIONES} caracteres.`
            : 'El asistente sólo elige de las cláusulas ya escritas y revisadas; nunca redacta una nueva.'}
        </p>
        <Button
          type="button"
          hideArrow
          variant="secondary"
          data-testid="plantilla-pedir-propuesta"
          disabled={!puedePedirPropuesta}
          onClick={() => void estado.pedirPropuesta()}
          className="gap-2"
        >
          {pidiendoPropuesta ? (
            <Spinner size="sm" variant="current" />
          ) : (
            <Sparkle className="h-4 w-4" aria-hidden="true" />
          )}
          {pidiendoPropuesta ? 'Consultando…' : 'Proponer cláusulas'}
        </Button>
      </div>

      {errorDeLaIa && (
        <p
          data-testid="plantilla-error-ia"
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-soft px-4 py-3 text-body-sm text-danger"
        >
          <Warning weight="fill" aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorDeLaIa}</span>
        </p>
      )}
    </div>
  );
}

/**
 * La propuesta, para revisar.
 *
 * 🔴 Cada cláusula se ve con su fundamento legal y se puede quitar de a una. La
 * lista sale de `clausulas` —el estado real de lo que va a entrar— y no de
 * `propuesta.clausulas`, para que quitar una la saque también de acá: una
 * revisión que sigue mostrando lo que ya se descartó no es una revisión.
 */
function RevisionDeLaPropuesta({
  propuesta,
  clausulas,
  catalogo,
  deducidas,
  campos,
  onQuitar,
  onDescartar,
}: {
  propuesta: NonNullable<EstadoDelContratoDesdePlantilla['propuesta']>;
  clausulas: readonly string[];
  catalogo: readonly import('@/lib/api/contratos-plantilla.service').ClausulaDelCatalogo[];
  deducidas: readonly string[];
  campos: EstadoDelContratoDesdePlantilla['campos'];
  onQuitar: (codigo: string) => void;
  onDescartar: () => void;
}) {
  const propuestas = propuesta.clausulas
    .filter((codigo) => clausulas.includes(codigo))
    .map((codigo) => catalogo.find((c) => c.codigo === codigo))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const quitadas = propuesta.clausulas.filter((c) => !clausulas.includes(c));
  const etiquetaDe = (nombre: string) =>
    campos.find((c) => c.nombre === nombre)?.etiqueta ?? nombre;

  return (
    <div
      data-testid="plantilla-revision-propuesta"
      className="rounded-lg border border-border bg-surface-muted p-4 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body-sm font-medium text-fg">Lo que propuso el asistente</p>
          <p className="text-caption text-fg-muted mt-0.5">
            Revisalo antes de generar. Podés quitar cualquier cláusula y corregir
            cualquier dato: nada de esto se emite hasta que lo apruebes.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          hideArrow
          className="shrink-0"
          data-testid="plantilla-descartar-propuesta"
          onClick={onDescartar}
        >
          Descartar
        </Button>
      </div>

      <MotivosDelValidador
        data-testid="plantilla-motivos-propuesta"
        titulo="Esto no se puede pactar"
        tono="rechazo"
        motivos={propuesta.motivos}
      />

      <MotivosDelValidador
        data-testid="plantilla-pendientes-propuesta"
        titulo="Falta completar antes de generar"
        tono="pendiente"
        motivos={propuesta.pendientes}
      />

      {propuestas.length === 0 ? (
        <p className="text-body-sm text-fg-muted" data-testid="plantilla-propuesta-sin-clausulas">
          {quitadas.length > 0
            ? 'Quitaste todas las cláusulas que había propuesto. El contrato sale con la plantilla sola.'
            : 'No hizo falta ninguna cláusula opcional: lo que pediste ya está cubierto por la plantilla.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {propuestas.map((c) => (
            <li
              key={c.codigo}
              data-testid={`plantilla-propuesta-clausula-${c.codigo}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-fg">{c.titulo}</p>
                <p className="text-caption text-fg-muted mt-0.5">{c.resumen}</p>
                <p className="text-caption text-fg-muted mt-1">{c.norma}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                hideArrow
                className="shrink-0 gap-1.5"
                data-testid={`plantilla-quitar-${c.codigo}`}
                aria-label={`Quitar la cláusula ${c.titulo}`}
                onClick={() => onQuitar(c.codigo)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {deducidas.length > 0 && (
        <div>
          <p className="text-caption text-fg-muted">
            Datos que dedujo de tu texto, editables abajo:{' '}
            <span className="text-fg">{deducidas.map(etiquetaDe).join(', ')}</span>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Campos ──────────────────────────────────────────────────────────────────

function CamposDelContrato({
  campos,
  valores,
  deducidas,
  onEscribir,
}: {
  campos: EstadoDelContratoDesdePlantilla['campos'];
  valores: Record<string, string>;
  deducidas: readonly string[];
  onEscribir: (nombre: string, valor: string) => void;
}) {
  if (campos.length === 0) {
    return (
      <p className="text-body-sm text-fg-muted">
        Este contrato sale entero de los datos que ya cargaste: no hay nada que
        completar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {campos.map((campo) => {
        const id = `plantilla-campo-${campo.nombre}`;
        const valor = valores[campo.nombre] ?? '';
        const vacio = campo.requerida && valor.trim() === '';
        return (
          <div key={campo.nombre} className="space-y-1.5">
            <Label htmlFor={id}>
              {campo.etiqueta}
              {!campo.requerida && (
                <span className="font-normal text-fg-muted"> (opcional)</span>
              )}
              {deducidas.includes(campo.nombre) && (
                <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-mono text-primary">
                  del asistente
                </span>
              )}
            </Label>
            {campo.tipo === 'parrafo' ? (
              <Textarea
                id={id}
                data-testid={id}
                rows={3}
                value={valor}
                aria-invalid={vacio}
                onChange={(e) => onEscribir(campo.nombre, e.target.value)}
              />
            ) : (
              <Input
                id={id}
                data-testid={id}
                value={valor}
                aria-invalid={vacio}
                inputMode={
                  campo.tipo === 'numero' ||
                  campo.tipo === 'porcentaje' ||
                  campo.tipo === 'moneda'
                    ? 'decimal'
                    : undefined
                }
                onChange={(e) => onEscribir(campo.nombre, e.target.value)}
              />
            )}
            {campo.ayuda && <p className="text-caption text-fg-muted">{campo.ayuda}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Catálogo ────────────────────────────────────────────────────────────────

function CatalogoDeClausulas({
  catalogo,
  elegidas,
  onAlternar,
}: {
  catalogo: readonly import('@/lib/api/contratos-plantilla.service').ClausulaDelCatalogo[];
  elegidas: readonly string[];
  onAlternar: (codigo: string) => void;
}) {
  if (catalogo.length === 0) {
    return (
      <div
        data-testid="plantilla-catalogo-vacio"
        className="rounded-lg bg-surface-muted px-6 py-10 text-center"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-body-sm text-fg mt-3">Esta plantilla no tiene cláusulas opcionales</p>
        <p className="text-caption text-fg-muted mt-1">
          El contrato sale con el texto de la plantilla, que ya trae lo que la ley exige.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-body-sm font-medium text-fg mb-2">
        Cláusulas opcionales{' '}
        <span className="font-normal text-fg-muted">
          ({elegidas.length} de {catalogo.length})
        </span>
      </legend>
      {catalogo.map((c) => {
        const marcada = elegidas.includes(c.codigo);
        const choca = marcada ? null : bloqueadaPor(c, elegidas, catalogo);
        const id = `plantilla-clausula-${c.codigo}`;
        return (
          <div
            key={c.codigo}
            data-testid={id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              marcada ? 'border-primary/40 bg-primary-soft/40' : 'border-border',
              choca && 'opacity-60',
            )}
          >
            <Checkbox
              id={`${id}-check`}
              data-testid={`${id}-check`}
              checked={marcada}
              disabled={Boolean(choca)}
              onCheckedChange={() => onAlternar(c.codigo)}
              className="mt-0.5"
            />
            <label htmlFor={`${id}-check`} className="min-w-0 cursor-pointer">
              <span className="block text-body-sm text-fg">{c.titulo}</span>
              <span className="block text-caption text-fg-muted mt-0.5">{c.resumen}</span>
              <span className="block text-caption text-fg-muted mt-1">{c.norma}</span>
              {choca && (
                <span className="block text-caption text-warning mt-1">
                  Se contradice con «{choca.titulo}», que ya está marcada.
                </span>
              )}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

// ─── Topes ───────────────────────────────────────────────────────────────────

/**
 * Los números de los artículos 18 y 20, a la vista.
 *
 * Cuando la agencia no tiene cargado el valor comercial ni el avalúo, el
 * backend manda `null` y acá se dice justamente eso: que nadie pudo revisar el
 * tope. Pintar un «sin tope» sería peor que no pintar nada.
 */
function TopesLegalesDelContrato({
  topes,
}: {
  topes: import('@/lib/api/contratos-plantilla.service').TopesLegales;
}) {
  const filas: Array<{ que: string; valor: string; norma: string }> = [];

  filas.push({
    que: 'Canon máximo',
    valor:
      topes.canonMaximo !== null
        ? formatCurrency(topes.canonMaximo)
        : 'sin valor comercial cargado',
    norma: 'Ley 820 de 2003, art. 18 — 1 % del valor comercial',
  });

  if (topes.valorComercialMaximo !== null) {
    filas.push({
      que: 'Valor comercial máximo',
      valor: formatCurrency(topes.valorComercialMaximo),
      norma: 'Ley 820 de 2003, art. 18 — dos veces el avalúo catastral',
    });
  }

  filas.push({
    que: 'Reajuste máximo',
    valor:
      topes.ipcValor !== null
        ? `${topes.ipcValor} % (IPC ${topes.ipcAno})`
        : 'IPC del año anterior sin publicar',
    norma: 'Ley 820 de 2003, art. 20',
  });

  return (
    <div
      data-testid="plantilla-topes"
      className="rounded-lg border border-border bg-surface-muted p-4"
    >
      <p className="text-body-sm font-medium text-fg">Topes legales de este contrato</p>
      <dl className="mt-2 space-y-2">
        {filas.map((f) => (
          <div key={f.que} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">{f.que}</dt>
            <dd className="font-mono tabular-nums text-body-sm text-fg">{f.valor}</dd>
            <p className="w-full text-caption text-fg-muted">{f.norma}</p>
          </div>
        ))}
      </dl>
      <p className="text-caption text-fg-muted mt-2">Fuente del IPC: {topes.fuente}</p>
    </div>
  );
}

// ─── Generar ─────────────────────────────────────────────────────────────────

/**
 * El PDF, y qué se puede hacer con él.
 *
 * 🔴 No hay vista previa acá porque el backend no la da: `generar` devuelve una
 * ruta del bucket privado `contracts`, y la única ruta que firma una URL
 * (`GET /contracts/:id/pdf`) necesita un contrato que todavía no existe. La
 * revisión real es la de arriba —qué cláusulas entran, con qué fundamento y con
 * qué datos—, y el PDF se abre en el detalle apenas se crea el contrato.
 * Inventar acá un visor que no puede leer el archivo sería peor que decirlo.
 */
function ContratoListo({
  generado,
  quedoViejo,
  generando,
  puedeGenerar,
  incompletos,
  onGenerar,
}: {
  generado: EstadoDelContratoDesdePlantilla['generado'];
  quedoViejo: boolean;
  generando: boolean;
  puedeGenerar: boolean;
  incompletos: string[];
  onGenerar: () => void;
}) {
  const [verDetalle, setVerDetalle] = useState(false);

  return (
    <div className="space-y-3">
      {generado && !quedoViejo && (
        <div
          data-testid="plantilla-contrato-listo"
          className="rounded-lg border border-success/30 bg-success-soft p-4"
        >
          <div className="flex items-start gap-2">
            <CheckCircle
              weight="fill"
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
            />
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-success">
                El contrato quedó armado
              </p>
              <p className="text-caption text-fg-muted mt-0.5">
                {generado.nombreSugerido} · {generado.clausulas.length}{' '}
                {generado.clausulas.length === 1
                  ? 'cláusula opcional'
                  : 'cláusulas opcionales'}
                . Se adjunta al contrato cuando lo crees, y ahí se puede abrir y
                descargar.
              </p>
              {generado.clausulas.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  hideArrow
                  className="mt-1 h-auto px-0 text-caption"
                  data-testid="plantilla-ver-clausulas"
                  aria-expanded={verDetalle}
                  onClick={() => setVerDetalle((v) => !v)}
                >
                  {verDetalle ? 'Ocultar las cláusulas' : 'Ver qué cláusulas quedaron'}
                </Button>
              )}
              {verDetalle && (
                <ul className="mt-1 list-disc pl-4 text-caption text-fg-muted">
                  {generado.clausulas.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 Cambió algo que va IMPRESO después de generar. Sin este aviso se
          crea el contrato con el canon nuevo en la base y el viejo en el PDF
          que firman las partes. */}
      {quedoViejo && (
        <p
          data-testid="plantilla-quedo-viejo"
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-warning-soft px-4 py-3 text-body-sm text-warning"
        >
          <ArrowClockwise aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Cambiaste algo después de armar el contrato. Volvé a generarlo para que el
            PDF diga lo mismo que el formulario.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {incompletos.length > 0 && (
          <p className="mr-auto text-caption text-fg-muted">
            Falta completar: {incompletos.join(', ')}.
          </p>
        )}
        <Button
          type="button"
          hideArrow
          variant={generado && !quedoViejo ? 'secondary' : 'default'}
          data-testid="plantilla-generar"
          disabled={!puedeGenerar}
          onClick={onGenerar}
          className="gap-2"
        >
          {generando ? (
            <Spinner size="sm" variant="current" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
          {generando
            ? 'Armando…'
            : generado && !quedoViejo
              ? 'Volver a armar'
              : 'Armar el contrato'}
        </Button>
      </div>
    </div>
  );
}
