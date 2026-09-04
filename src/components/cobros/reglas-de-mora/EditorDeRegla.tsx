'use client';

/**
 * El formulario de una regla de mora — crear o editar, en un modal.
 *
 * Usa la primitiva `Dialog` del producto: es ella la que frena Lenis
 * mientras está abierta y pone `data-lenis-prevent` en el cuerpo con scroll
 * (`src/components/ui/dialog.tsx`). No se re-implementa acá.
 *
 * 🔴 Los números se leen como números: `valueAsNumber` en los `<input
 * type="number">` y `CurrencyInput` de cadence para la plata. Nunca un
 * `parseFloat` de un texto formateado — así fue como el recibo de caja
 * registraba la milésima parte del pago.
 *
 * El mensaje de error del back (400 con texto en español) se muestra tal
 * cual, adentro del modal, al lado del formulario que lo causó.
 */

import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Banner, CurrencyInput } from '@leasefy/cadence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReglaDeMora } from '@/lib/api/reglas-de-mora.types';
import {
  BASES_DE_CALCULO,
  CONCEPTOS_DE_REGLA,
  DISPARADORES_DE_REGLA,
  FORMULAS_DE_REGLA,
} from '@/lib/api/reglas-de-mora.types';
import {
  esquemaDeRegla,
  resolverDeZod,
  VALORES_INICIALES,
  type ValoresDeRegla,
} from './esquema';
import {
  describirRegla,
  EXPLICACION_DE_LA_BASE,
  EXPLICACION_DE_LA_FORMULA,
  NOMBRE_DE_LA_BASE,
  NOMBRE_DE_LA_FORMULA,
  NOMBRE_DEL_CONCEPTO,
  NOMBRE_DEL_DISPARADOR,
} from './legible';

const ID_DEL_FORMULARIO = 'form-regla-de-mora';

export interface EditorDeReglaProps {
  abierto: boolean;
  /** `null` = crear una nueva. */
  regla: ReglaDeMora | null;
  onCerrar: () => void;
  /** Lanza si el back rechaza; el mensaje se muestra adentro del modal. */
  onGuardar: (valores: ValoresDeRegla) => Promise<void>;
}

function valoresDe(regla: ReglaDeMora): ValoresDeRegla {
  return {
    nombre: regla.nombre,
    concepto: regla.concepto,
    disparador: regla.disparador,
    disparadorDia: regla.disparadorDia,
    formula: regla.formula,
    valor: regla.valor,
    base: regla.base,
    topeCop: regla.topeCop,
    orden: regla.orden,
    activa: regla.activa,
  };
}

function mensajeDe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo guardar la regla. Probá de nuevo.';
}

export function EditorDeRegla({ abierto, regla, onCerrar, onGuardar }: EditorDeReglaProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ValoresDeRegla>({
    resolver: resolverDeZod(esquemaDeRegla),
    defaultValues: VALORES_INICIALES,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const [errorDelBack, setErrorDelBack] = useState<string | null>(null);

  // Cada apertura arranca limpia: con la regla a editar, o en blanco.
  useEffect(() => {
    if (!abierto) return;
    reset(regla ? valoresDe(regla) : VALORES_INICIALES);
    setErrorDelBack(null);
  }, [abierto, regla, reset]);

  const vivos = useWatch({ control });
  const formula = vivos.formula ?? VALORES_INICIALES.formula;
  const disparador = vivos.disparador ?? VALORES_INICIALES.disparador;
  const parseo = esquemaDeRegla.safeParse(vivos);
  const vistaPrevia = parseo.success ? describirRegla(parseo.data) : null;

  const enviar = handleSubmit(async (valores) => {
    setErrorDelBack(null);
    try {
      await onGuardar(valores);
      onCerrar();
    } catch (error) {
      setErrorDelBack(mensajeDe(error));
    }
  });

  const editando = regla !== null;
  const unidadDelValor =
    formula === 'INTERES_DIARIO' ? '% por día' : formula === 'PORCENTAJE_DE_LA_BASE' ? '% de la base' : null;

  return (
    <Dialog open={abierto} onOpenChange={(estaAbierto) => !estaAbierto && onCerrar()}>
      <DialogContent className="sm:max-w-xl" data-testid="editor-de-regla">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar regla de mora' : 'Nueva regla de mora'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Los cobros ya emitidos no cambian; la regla nueva corre en el próximo recálculo.'
              : 'Lo que esta regla agregue queda como línea propia en el estado de cuenta del inquilino.'}
          </DialogDescription>
        </DialogHeader>

        <form id={ID_DEL_FORMULARIO} onSubmit={enviar} className="space-y-5" noValidate>
          {/* ── Nombre y concepto ─────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,220px)]">
            <Campo
              id="regla-nombre"
              etiqueta="Nombre"
              ayuda="Como lo va a leer el inquilino en su estado de cuenta."
              error={errors.nombre?.message}
            >
              <Input
                id="regla-nombre"
                placeholder="Interés de mora"
                autoComplete="off"
                aria-invalid={Boolean(errors.nombre)}
                {...register('nombre')}
              />
            </Campo>
            <Campo id="regla-concepto" etiqueta="Concepto" error={errors.concepto?.message}>
              <Controller
                name="concepto"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="regla-concepto" aria-invalid={Boolean(errors.concepto)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONCEPTOS_DE_REGLA.map((c) => (
                        <SelectItem key={c} value={c}>
                          {NOMBRE_DEL_CONCEPTO[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </div>

          {/* ── Cuándo se dispara ────────────────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-fg">Cuándo se dispara</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="regla-disparador" etiqueta="Se cuenta por" error={errors.disparador?.message}>
                <Controller
                  name="disparador"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="regla-disparador" aria-invalid={Boolean(errors.disparador)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPARADORES_DE_REGLA.map((d) => (
                          <SelectItem key={d} value={d}>
                            {NOMBRE_DEL_DISPARADOR[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>
              <Campo
                id="regla-disparador-dia"
                etiqueta={disparador === 'DIA_DEL_MES' ? 'Día del mes' : 'Día de mora'}
                ayuda={
                  disparador === 'DIA_DEL_MES'
                    ? 'Del 1 al 31. «15» = pasado el 15 de cada mes.'
                    : '«1» = desde el primer día después del plazo. «0» = apenas vence.'
                }
                error={errors.disparadorDia?.message}
              >
                <Input
                  id="regla-disparador-dia"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={disparador === 'DIA_DEL_MES' ? 31 : 365}
                  step={1}
                  className="font-mono tabular-nums"
                  aria-invalid={Boolean(errors.disparadorDia)}
                  {...register('disparadorDia', { valueAsNumber: true })}
                />
              </Campo>
            </div>
          </fieldset>

          {/* ── Cuánto cobra ─────────────────────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-fg">Cuánto cobra</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="regla-formula"
                etiqueta="Fórmula"
                ayuda={EXPLICACION_DE_LA_FORMULA[formula]}
                error={errors.formula?.message}
              >
                <Controller
                  name="formula"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="regla-formula" aria-invalid={Boolean(errors.formula)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMULAS_DE_REGLA.map((f) => (
                          <SelectItem key={f} value={f}>
                            {NOMBRE_DE_LA_FORMULA[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>
              <Campo
                id="regla-valor"
                etiqueta={formula === 'MONTO_FIJO' ? 'Monto' : formula === 'PORCENTAJE_DE_LA_BASE' ? 'Porcentaje' : 'Tasa'}
                ayuda={
                  formula === 'INTERES_DIARIO'
                    ? 'Por día. Un 2 % mensual son 0,0667 diarios.'
                    : formula === 'PORCENTAJE_DE_LA_BASE'
                      ? 'Una sola vez, sobre la base.'
                      : 'En pesos, una sola vez.'
                }
                error={errors.valor?.message}
              >
                {formula === 'MONTO_FIJO' ? (
                  <Controller
                    name="valor"
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        id="regla-valor"
                        value={Number.isFinite(field.value) ? field.value : undefined}
                        onChange={(v) => field.onChange(v)}
                        invalid={Boolean(errors.valor)}
                      />
                    )}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      id="regla-valor"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder={formula === 'INTERES_DIARIO' ? '0,0667' : '10'}
                      className={cn('font-mono tabular-nums', unidadDelValor && 'pr-24')}
                      aria-invalid={Boolean(errors.valor)}
                      {...register('valor', { valueAsNumber: true })}
                    />
                    {unidadDelValor && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-fg-muted"
                      >
                        {unidadDelValor}
                      </span>
                    )}
                  </div>
                )}
              </Campo>
            </div>
            <Campo
              id="regla-base"
              etiqueta="Sobre qué se calcula"
              ayuda={formula === 'MONTO_FIJO' ? 'Un monto fijo no usa la base; queda registrada igual.' : EXPLICACION_DE_LA_BASE[vivos.base ?? VALORES_INICIALES.base]}
              error={errors.base?.message}
            >
              <Controller
                name="base"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="regla-base" aria-invalid={Boolean(errors.base)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BASES_DE_CALCULO.map((b) => (
                        <SelectItem key={b} value={b}>
                          {NOMBRE_DE_LA_BASE[b].charAt(0).toUpperCase() + NOMBRE_DE_LA_BASE[b].slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </fieldset>

          {/* ── Tope, orden, activa ──────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="regla-tope"
              etiqueta="Tope"
              ayuda="Lo máximo que esta regla puede agregar. Vacío = sin techo. La ley limita el interés de mora."
              error={errors.topeCop?.message}
            >
              <Controller
                name="topeCop"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="regla-tope"
                    value={field.value ?? undefined}
                    onChange={(v) => field.onChange(Number.isFinite(v) ? v : null)}
                    invalid={Boolean(errors.topeCop)}
                    placeholder="Sin tope"
                  />
                )}
              />
            </Campo>
            <Campo
              id="regla-orden"
              etiqueta="Orden"
              ayuda="Se aplican de menor a mayor. Importa cuando una regla usa el total adeudado."
              error={errors.orden?.message}
            >
              <Input
                id="regla-orden"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                className="font-mono tabular-nums"
                aria-invalid={Boolean(errors.orden)}
                {...register('orden', { valueAsNumber: true })}
              />
            </Campo>
          </div>

          <Controller
            name="activa"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm text-fg">
                <Switch
                  id="regla-activa"
                  checked={field.value}
                  onCheckedChange={(v) => setValue('activa', v, { shouldDirty: true })}
                  aria-label="Regla activa"
                />
                <span>{field.value ? 'Activa: se aplica en el próximo recálculo.' : 'Apagada: queda guardada pero no cobra.'}</span>
              </label>
            )}
          />

          {/* ── Vista previa y error del back ───────────────────────────── */}
          {vistaPrevia ? (
            <Banner variant="info" title="Así queda" data-testid="vista-previa">
              {vistaPrevia}
            </Banner>
          ) : (
            <p className="text-xs text-fg-muted">Completá los campos para ver cómo queda la regla.</p>
          )}

          {errorDelBack && (
            <Banner variant="danger" title="No se pudo guardar" data-testid="error-del-back">
              {errorDelBack}
            </Banner>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* `form=` porque el pie vive FUERA del <form>: el DialogContent lo saca al pie fijo. */}
          <Button type="submit" form={ID_DEL_FORMULARIO} hideArrow isLoading={isSubmitting}>
            {editando ? 'Guardar cambios' : 'Crear regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-fg">
        {etiqueta}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert" data-testid={`error-${id}`}>
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-fg-muted">{ayuda}</p>
      ) : null}
    </div>
  );
}
