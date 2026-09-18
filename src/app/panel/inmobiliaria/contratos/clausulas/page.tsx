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
import { Scroll, Plus, WarningCircle, CheckCircle, X } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { BackButton } from '@/components/ui/back-button';
import { Button, Badge, Input } from '@/components/ui';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useLenis } from '@/components/providers/SmoothScroll';
import { toast } from '@/components/ui/toast';
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
      toast.error(mensajeDeError(e, 'No se pudo cambiar la cláusula'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <BackButton label="Volver a Contratos" />
        </div>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
          onReintentar={() => void cargar()}
          esqueleto={<EsqueletoTabla columnas={2} filas={3} />}
          cuandoVacio={
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-fg">Todavía no hay cláusulas propias.</p>
              <p className="mt-1 text-xs text-fg-muted">
                Tus contratos salen con el texto legal completo. Lo que agregues
                acá se suma al final, y sólo si la ley lo permite.
              </p>
            </div>
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
  const lenis = useLenis();
  useEffect(() => {
    lenis.stop();
    return () => lenis.start();
  }, [lenis]);

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
    setForm({
      ...form,
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
    try {
      if (clausula) {
        await clausulasPropiasApi.actualizar(clausula.id, form);
      } else {
        await clausulasPropiasApi.crear(form);
      }
      toast.success(clausula ? 'Cláusula actualizada' : 'Cláusula agregada');
      onGuardada();
    } catch (err) {
      setFalla(mensajeDeError(err, 'No se pudo guardar la cláusula'));
      // El back manda sus motivos en el error: se muestran igual que los del
      // validador en vivo, porque son los mismos.
      const conMotivos = (err as { motivos?: MotivoDeRechazo[] })?.motivos;
      if (Array.isArray(conMotivos)) setMotivos(conMotivos);
    } finally {
      setGuardando(false);
    }
  };

  const rechazada = (motivos?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardando ? undefined : onCerrar}
      />
      <div
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <h2 className="text-base font-semibold text-fg">
            {clausula ? `Editar «${clausula.titulo}»` : 'Escribir una cláusula'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={enviar} className="space-y-4 p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Título<span className="ml-0.5 text-danger">*</span>
            </span>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              maxLength={200}
              placeholder="Uso de zonas comunes"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              Una línea que la resuma<span className="ml-0.5 text-danger">*</span>
            </span>
            <Input
              value={form.resumen}
              onChange={(e) => setForm({ ...form, resumen: e.target.value })}
              maxLength={300}
              placeholder="Es lo que se ve en la lista al armar el contrato"
            />
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
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">
              El texto de la cláusula<span className="ml-0.5 text-danger">*</span>
            </span>
            <textarea
              value={form.cuerpo}
              onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Se imprime tal cual, al final del contrato."
            />
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

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              hideArrow
              isLoading={guardando}
              disabled={!completo || rechazada || guardando}
              className="flex-1"
            >
              {clausula ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return porDefecto;
}

export default function ClausulasPropiasPage() {
  return (
    <PageGuard module="contratos">
      <ContenidoDeClausulas />
    </PageGuard>
  );
}
