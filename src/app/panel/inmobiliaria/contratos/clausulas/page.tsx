'use client';

/**
 * 🔴 LAS CLÁUSULAS PROPIAS DE LA INMOBILIARIA (Nico, 18-09-2026).
 *
 * «La inmobiliaria puede agregar cláusulas propias (pasan por el validador que
 * ya existe); el texto legal base NO se edita».
 *
 * El back quedó construido el 18-09 —con su validador, su migración y sus
 * pruebas— y sin pantalla: se podían guardar cláusulas por API y ninguna
 * inmobiliaria tenía cómo escribir una.
 *
 * 🔴 SE REVISA MIENTRAS SE ESCRIBE, no al guardar. El back expone `revisar`,
 * que valida SIN guardar y devuelve cada motivo CON SU NORMA. Usarlo sólo al
 * final sería dejar que alguien redacte tres párrafos para recibir un 400: acá
 * el veredicto aparece antes, y con la ley citada, que es lo que deja aprender
 * la regla en vez de adivinarla.
 *
 * 🔴 EL TEXTO LEGAL BASE NO SE TOCA desde ninguna parte de esta pantalla. Lo
 * que se agrega son cláusulas ADICIONALES; el articulado de la Ley 820 vive en
 * las plantillas del back, escrito a mano y con su fundamento citado.
 */

import { useCallback, useEffect, useState } from 'react';
import { Scroll, Plus, WarningCircle, CheckCircle } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button, Badge, Input } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EmptyState } from '@/components/ui/empty-state';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { cn } from '@/lib/utils';
import {
  clausulasPropiasApi,
  type ClausulaPropia,
  type GuardarClausulaPropia,
  type MotivoDeRechazo,
  type PlantillaLegal,
} from '@/lib/api/clausulas-propias.service';

const PLANTILLAS: Array<{ valor: PlantillaLegal; label: string }> = [
  { valor: 'CONTRATO_VIVIENDA', label: 'Vivienda urbana' },
  { valor: 'CONTRATO_COMERCIAL', label: 'Local comercial' },
];

const EN_PALABRAS = new Map(PLANTILLAS.map((p) => [p.valor, p.label]));

function ContenidoDeClausulas() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('contratos', 'edit');

  const [clausulas, setClausulas] = useState<ClausulaPropia[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editando, setEditando] = useState<ClausulaPropia | 'nueva' | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setClausulas(await clausulasPropiasApi.listar());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const alternarActiva = async (c: ClausulaPropia) => {
    try {
      await clausulasPropiasApi.actualizar(c.id, { activa: !c.activa });
      toast.success(
        c.activa
          ? 'Ya no se ofrece en contratos nuevos. Los firmados no cambian.'
          : 'Vuelve a ofrecerse en los contratos nuevos.',
      );
      await cargar();
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo cambiar la cláusula.',
          accion: 'cambiar la cláusula',
        }),
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 🔴 Sin «Volver a Contratos» (Nico, 18-09-2026: «tiene un devolver que
          ni se pa que está ahí»). Esta pantalla ES una pestaña de Contratos: el
          camino de vuelta son las pestañas de arriba, y un botón que repite lo
          que la navegación ya hace sólo agrega una decisión más. */}
      <div className="space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-h2 text-fg">
              <Scroll className="h-6 w-6 text-primary" weight="duotone" />
              Cláusulas propias
            </h1>
            <p className="max-w-2xl text-sm text-fg-muted">
              Lo que tu inmobiliaria agrega a sus contratos, además del texto
              legal. El articulado de la ley no se edita: estas cláusulas se
              suman al final y pasan por el mismo validador que revisa todo
              contrato.
            </p>
          </div>
          {puedeEditar && (
            <Button hideArrow onClick={() => setEditando('nueva')}>
              <Plus className="mr-1.5 h-4 w-4" />
              Escribir una cláusula
            </Button>
          )}
        </header>

        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!cargando && !error && (clausulas?.length ?? 0) === 0}
          queEs="las cláusulas propias"
          onReintentar={cargar}
          esqueleto={<EsqueletoTabla columnas={2} filas={3} />}
          cuandoVacio={
            /*
             * 🔴 El vacío, con la cara de TODOS los vacíos del panel (Nico,
             * 19-09: «esto se ve horrible»).
             *
             * Era un recuadro punteado con tres párrafos centrados, un cuadro
             * de ejemplos alineado a la izquierda ADENTRO de esa columna
             * centrada —o sea dos ejes distintos peleando— y ningún botón: la
             * única forma de escribir la primera cláusula era subir la vista
             * hasta el encabezado. Y el primer párrafo repetía casi palabra por
             * palabra el subtítulo de la pantalla, dos veces lo mismo a 40 px
             * de distancia.
             *
             * Ahora es el `EmptyState` de la casa —círculo gris, título,
             * descripción, acción— y lo único propio son los EJEMPLOS, que son
             * la parte que enseña: en dos segundos se entiende qué se escribe
             * acá y qué no.
             */
            <EmptyState
              icon={Scroll}
              title="Todavía no hay ninguna cláusula propia"
              description="Las que agregues se suman al final de cada contrato nuevo."
              action={
                puedeEditar
                  ? { label: 'Escribir la primera', onClick: () => setEditando('nueva') }
                  : undefined
              }
            >
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Por ejemplo
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
                <li>Prohibido tener mascotas sin autorización escrita.</li>
                <li>El inquilino mantiene el jardín y la piscina.</li>
                <li>No se permite subarrendar ni en plataformas.</li>
              </ul>
              <p className="mt-4 border-t border-border pt-3 text-xs text-fg-subtle">
                Si una cláusula choca con la Ley 820 te lo decimos antes de
                guardarla, con la norma citada.
              </p>
            </EmptyState>
          }
        >
          <ul className="space-y-3">
            {(clausulas ?? []).map((c) => (
              <li
                key={c.id}
                data-testid="clausula"
                className={cn(
                  'rounded-lg border bg-card p-4',
                  c.activa ? 'border-border' : 'border-dashed border-border opacity-70',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{c.titulo}</p>
                      {!c.activa && <Badge variant="secondary">No se ofrece</Badge>}
                      {c.aplicaA.map((a) => (
                        <Badge key={a} variant="secondary">
                          {EN_PALABRAS.get(a as PlantillaLegal) ?? a}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">{c.resumen}</p>
                  </div>
                  {puedeEditar && (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" hideArrow onClick={() => setEditando(c)}>
                        Editar
                      </Button>
                      <Button variant="ghost" hideArrow onClick={() => void alternarActiva(c)}>
                        {c.activa ? 'Dejar de ofrecer' : 'Volver a ofrecer'}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </EstadoDeDatos>
      </div>

      {editando && (
        <EditorDeClausula
          clausula={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={() => {
            setEditando(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}

// ── El editor, con el validador en vivo ─────────────────────────────────────

function EditorDeClausula({
  clausula,
  onCerrar,
  onGuardada,
}: {
  clausula: ClausulaPropia | null;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [form, setForm] = useState<GuardarClausulaPropia>({
    titulo: clausula?.titulo ?? '',
    resumen: clausula?.resumen ?? '',
    aplicaA: (clausula?.aplicaA as PlantillaLegal[]) ?? ['CONTRATO_VIVIENDA'],
    cuerpo: clausula?.cuerpo ?? '',
  });
  const [motivos, setMotivos] = useState<MotivoDeRechazo[] | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  /** 02-10-2026 · Lo que el back rechazó por campo (`campos` del 400). */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaClausula, string>>>({});

  /** Cambia un campo y borra su error del servidor. */
  const cambiar = (patch: Partial<GuardarClausulaPropia>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrores((e) => {
      const resto = { ...e };
      for (const k of Object.keys(patch)) delete resto[k as CampoDeLaClausula];
      return resto;
    });
  };

  const completo =
    form.titulo.trim().length >= 3 &&
    form.resumen.trim().length > 0 &&
    form.cuerpo.trim().length > 0 &&
    form.aplicaA.length > 0;

  /*
   * 🔴 El veredicto llega ANTES de guardar, no como un 400 después. Se revisa
   * medio segundo después de dejar de escribir: pedirlo en cada tecla sería
   * ruido, y sólo al guardar sería tarde.
   */
  useEffect(() => {
    if (!completo) {
      setMotivos(null);
      return;
    }
    let vigente = true;
    setRevisando(true);
    const reloj = setTimeout(() => {
      clausulasPropiasApi
        .revisar(form)
        .then((r) => {
          if (vigente) setMotivos(r.motivos);
        })
        .catch(() => {
          // Si el validador no responde NO se afirma que está bien: se deja en
          // «no sé» y el guardado lo decide el back, que es quien manda.
          if (vigente) setMotivos(null);
        })
        .finally(() => {
          if (vigente) setRevisando(false);
        });
    }, 500);
    return () => {
      vigente = false;
      clearTimeout(reloj);
    };
  }, [form, completo]);

  const alternarPlantilla = (valor: PlantillaLegal) => {
    cambiar({
      aplicaA: form.aplicaA.includes(valor)
        ? form.aplicaA.filter((v) => v !== valor)
        : [...form.aplicaA, valor],
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completo || guardando) return;
    setGuardando(true);
    setFalla(null);
    setErrores({});
    try {
      if (clausula) {
        await clausulasPropiasApi.actualizar(clausula.id, form);
      } else {
        await clausulasPropiasApi.crear(form);
      }
      toast.success(clausula ? 'Cláusula actualizada' : 'Cláusula agregada');
      onGuardada();
    } catch (err) {
      /*
       * 02-10-2026 · Un 400 con `campos` va bajo SU campo (y le da el foco);
       * arriba sólo lo que no tiene dónde ir, con la regla de oro.
       */
      const reparto = repartirErroresDelServidor<CampoDeLaClausula>(err, {
        campos: CAMPOS_DE_LA_CLAUSULA,
        porDefecto: 'No se pudo guardar la cláusula.',
        accion: 'guardar la cláusula',
      });
      setErrores(reparto.porCampo);
      setFalla(reparto.sueltos.length ? reparto.sueltos.join(' · ') : null);
      const primero = reparto.orden[0];
      if (primero) document.getElementById(`clausula-${primero}`)?.focus();
      // El back manda sus motivos en el error: se muestran igual que los del
      // validador en vivo, porque son los mismos. Un `ApiError` los guarda en
      // `detalle` (antes se buscaban arriba y nunca aparecían).
      const conMotivos = motivosDelError(err);
      if (conMotivos) setMotivos(conMotivos);
    } finally {
      setGuardando(false);
    }
  };

  const rechazada = (motivos?.length ?? 0) > 0;

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        // Mientras se guarda no se sale (ni con Esc, ni con el velo, ni con la ✕).
        if (!abierto && !guardando) onCerrar();
      }}
    >
      <DialogContent size="lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {clausula ? `Editar «${clausula.titulo}»` : 'Escribir una cláusula'}
          </DialogTitle>
        </DialogHeader>

        {/* El pie vive FUERA del <form> (el DialogContent lo saca al pie fijo):
            el botón de guardar lo apunta con `form=`. */}
        <form id={ID_DEL_EDITOR} onSubmit={enviar} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Título<span className="ml-0.5 text-danger">*</span>
            </span>
            <Input
              id="clausula-titulo"
              value={form.titulo}
              onChange={(e) => cambiar({ titulo: e.target.value })}
              maxLength={200}
              placeholder="Uso de zonas comunes"
              aria-invalid={errores.titulo ? true : undefined}
              aria-describedby={errores.titulo ? 'clausula-titulo-error' : undefined}
            />
            <ErrorDelCampo id="clausula-titulo-error" mensaje={errores.titulo} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Una línea que la resuma<span className="ml-0.5 text-danger">*</span>
            </span>
            <Input
              id="clausula-resumen"
              value={form.resumen}
              onChange={(e) => cambiar({ resumen: e.target.value })}
              maxLength={300}
              placeholder="Es lo que se ve en la lista al armar el contrato"
              aria-invalid={errores.resumen ? true : undefined}
              aria-describedby={errores.resumen ? 'clausula-resumen-error' : undefined}
            />
            <ErrorDelCampo id="clausula-resumen-error" mensaje={errores.resumen} />
          </label>

          <fieldset>
            <legend className="mb-1 block text-xs font-medium text-foreground">
              ¿A qué contratos se ofrece?
            </legend>
            <div className="flex flex-wrap gap-2">
              {PLANTILLAS.map((p) => {
                const puesta = form.aplicaA.includes(p.valor);
                return (
                  <button
                    key={p.valor}
                    type="button"
                    onClick={() => alternarPlantilla(p.valor)}
                    aria-pressed={puesta}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      puesta
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border text-fg-muted hover:border-primary/40',
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <ErrorDelCampo id="clausula-aplicaA-error" mensaje={errores.aplicaA} />
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              El texto de la cláusula<span className="ml-0.5 text-danger">*</span>
            </span>
            <textarea
              id="clausula-cuerpo"
              value={form.cuerpo}
              onChange={(e) => cambiar({ cuerpo: e.target.value })}
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Se imprime tal cual, al final del contrato."
              aria-invalid={errores.cuerpo ? true : undefined}
              aria-describedby={errores.cuerpo ? 'clausula-cuerpo-error' : undefined}
            />
            <ErrorDelCampo id="clausula-cuerpo-error" mensaje={errores.cuerpo} />
          </label>

          {/* El veredicto del validador, con su norma. */}
          <div aria-live="polite" data-testid="veredicto">
            {revisando && (
              <p className="text-xs text-fg-muted">Revisando contra la ley…</p>
            )}
            {!revisando && motivos !== null && !rechazada && (
              <p className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle className="h-4 w-4" weight="fill" />
                El validador no encontró nada que la ley prohíba.
              </p>
            )}
            {!revisando && rechazada && (
              <ul className="space-y-2" data-testid="motivos">
                {motivos!.map((m) => (
                  <li
                    key={m.codigo + m.donde}
                    className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2"
                  >
                    <p className="flex items-start gap-1.5 text-xs text-danger">
                      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
                      <span>{m.mensaje}</span>
                    </p>
                    {/* La norma es lo que va a mirar un abogado. Se cita siempre. */}
                    <p className="mt-1 pl-5 text-[11px] text-fg-muted">{m.norma}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {falla && !rechazada && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
            >
              {falla}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_DEL_EDITOR}
            hideArrow
            isLoading={guardando}
            disabled={!completo || rechazada || guardando}
          >
            {clausula ? 'Guardar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ID_DEL_EDITOR = 'form-editor-de-clausula';

type CampoDeLaClausula = 'titulo' | 'resumen' | 'cuerpo' | 'aplicaA';
const CAMPOS_DE_LA_CLAUSULA: readonly CampoDeLaClausula[] = ['titulo', 'resumen', 'cuerpo', 'aplicaA'];

/** Los motivos del validador que trae un 400 del back (en `detalle` si es `ApiError`). */
function motivosDelError(err: unknown): MotivoDeRechazo[] | null {
  if (!err || typeof err !== 'object') return null;
  const o = err as { motivos?: unknown; detalle?: { motivos?: unknown } };
  const lista = Array.isArray(o.detalle?.motivos) ? o.detalle?.motivos : o.motivos;
  return Array.isArray(lista) ? (lista as MotivoDeRechazo[]) : null;
}

export default function ClausulasPropiasPage() {
  return (
    <PageGuard module="contratos">
      <ContenidoDeClausulas />
    </PageGuard>
  );
}
