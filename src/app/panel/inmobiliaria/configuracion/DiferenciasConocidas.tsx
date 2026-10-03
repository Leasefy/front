'use client';

/**
 * Diferencias conocidas de la conciliación (02-10-2026, S2-D).
 *
 * Nico: «la retención (p. ej. 3,5 % de arrendamientos) es una DIFERENCIA
 * CONOCIDA CONFIGURABLE por cada inmobiliaria; una combinación que sólo cuadra
 * gracias a una diferencia se PROPONE, nunca se aplica sola».
 *
 * Cuando una aseguradora o una empresa le paga a la inmobiliaria y le retiene
 * un porcentaje, o el banco cobra una comisión fija, la línea del extracto trae
 * MENOS que la suma de los recibos. Lo que se configura acá le dice a la
 * conciliación que esa diferencia es conocida: la reconoce y la PROPONE a una
 * persona con su regla escrita. Nunca concilia sola por ella.
 *
 * El 4×1000 no se configura: es ley y se reconoce siempre (con la misma regla:
 * se propone, no se aplica sola).
 *
 * Vive dentro de «Costos de la plata» (la misma familia: lo que cuesta mover la
 * plata) y con su misma puerta (sólo el administrador).
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionDistance, motionDuration, motionEase } from '@leasefy/cadence';
import { Plus, Scales, Trash } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type {
  AQuienAplicaLaDiferencia,
  DiferenciasConocidasDeLaInmobiliaria,
} from '@/lib/api/conciliacion-bancaria.types';
import { EsqueletoDeSeccion } from './piezas';
import {
  AYUDA_DE_A_QUIEN,
  MAXIMO_DE_DIFERENCIAS,
  NOMBRE_DE_A_QUIEN,
  erroresDelServidor,
  filaNueva,
  filasDesde,
  validar,
  type CampoDeLaFila,
  type FilaDeDiferencia,
  type TipoDeDiferencia,
} from './diferencias-conocidas';

type ErroresPorFila = Record<string, Partial<Record<CampoDeLaFila, string>>>;

/** La fila entra subiendo y sale con un fundido; con movimiento reducido, nada se mueve. */
function useMovimientoDeLaFila() {
  const reducido = useReducedMotion() ?? false;
  if (reducido) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }
  return {
    initial: { opacity: 0, y: motionDistance.sm },
    animate: { opacity: 1, y: 0, transition: { duration: motionDuration.base, ease: motionEase.enter } },
    exit: { opacity: 0, y: -motionDistance.xs, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
  };
}

export function DiferenciasConocidas() {
  const [datos, setDatos] = useState<DiferenciasConocidasDeLaInmobiliaria | null>(null);
  const [filas, setFilas] = useState<FilaDeDiferencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<ErroresPorFila>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinLaMigracion, setSinLaMigracion] = useState(false);
  const movimiento = useMovimientoDeLaFila();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await conciliacionBancariaApi.diferenciasConocidas();
      setDatos(r);
      setFilas(filasDesde(r.diferencias));
      setSinLaMigracion(!r.sePuedeGuardar);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const maximo = datos?.maximo ?? MAXIMO_DE_DIFERENCIAS;
  const deshabilitado = sinLaMigracion || guardando;

  const cambiar = (clave: string, cambio: Partial<FilaDeDiferencia>, campo?: CampoDeLaFila) => {
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));
    if (campo) {
      setErrores((e) => {
        if (!e[clave]?.[campo]) return e;
        const { [campo]: _quitado, ...resto } = e[clave];
        return { ...e, [clave]: resto };
      });
    }
  };

  async function guardar() {
    setAviso(null);
    const v = validar(filas);
    setErrores(v.errores);
    if (!v.diferencias) return;
    setGuardando(true);
    try {
      const r = await conciliacionBancariaApi.guardarDiferenciasConocidas(v.diferencias);
      setDatos(r);
      setFilas(filasDesde(r.diferencias));
      setErrores({});
      toast.success(
        r.diferencias.length === 0
          ? 'Guardado: la conciliación no reconoce ninguna retención ni comisión.'
          : `Guardado: la conciliación reconoce ${r.diferencias.length} ${r.diferencias.length === 1 ? 'diferencia' : 'diferencias'} y te las propone con su regla.`,
      );
    } catch (e) {
      const repartidos = erroresDelServidor(e, filas);
      setErrores(repartidos.porFila);
      setAviso(repartidos.general);
      if (repartidos.sinLaMigracion) setSinLaMigracion(true);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      aria-labelledby="diferencias-conocidas-titulo"
      data-testid="diferencias-conocidas"
    >
      <header className="space-y-1">
        <h3 id="diferencias-conocidas-titulo" className="flex items-center gap-2 text-base font-semibold text-fg">
          <Scales className="h-4 w-4" aria-hidden="true" />
          Diferencias conocidas al conciliar
        </h3>
        <p className="text-body-sm text-fg-muted">
          Cuando una aseguradora o una empresa te paga y retiene un porcentaje, o el banco cobra una comisión fija, la
          línea del extracto trae menos que la suma de los recibos. Si la configuras acá, la conciliación la reconoce y
          te propone la combinación con su regla escrita. <strong>Nunca la concilia sola.</strong>
        </p>
      </header>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        vacio={false}
        queEs="las diferencias conocidas"
        onReintentar={cargar}
        esqueleto={<EsqueletoDeSeccion filas={2} />}
      >
        {datos ? (
          <div className="space-y-4">
            {sinLaMigracion && (
              <SinLaMigracion
                motivo={null}
                queSeEspera="guardar las diferencias conocidas"
                testId="diferencias-sin-la-migracion"
              />
            )}

            <p className="rounded-md bg-surface-muted px-4 py-3 text-caption text-fg-muted" data-testid="diferencias-gmf">
              El 4×1000 ({datos.gmf.porMil} por mil) no se configura: es ley y se reconoce siempre. Una combinación que
              sólo calza con él también se te propone; no se concilia sola.
            </p>

            {filas.length === 0 ? (
              <p className="text-body-sm text-fg-muted" data-testid="diferencias-vacio">
                No tienes ninguna configurada: la conciliación sólo reconoce el 4×1000.
              </p>
            ) : null}

            <ul className="space-y-3" aria-label="Diferencias configuradas">
              <AnimatePresence initial={false}>
                {filas.map((f, i) => (
                  <motion.li
                    key={f.clave}
                    className="space-y-3 rounded-md border border-border p-4"
                    data-testid={`diferencia-${i}`}
                    {...movimiento}
                  >
                    <FilaEditable
                      fila={f}
                      indice={i}
                      errores={errores[f.clave] ?? {}}
                      deshabilitado={deshabilitado}
                      onCambio={(cambio, campo) => cambiar(f.clave, cambio, campo)}
                      onQuitar={() => {
                        setFilas((fs) => fs.filter((x) => x.clave !== f.clave));
                        setErrores(({ [f.clave]: _fuera, ...resto }) => resto);
                      }}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <AnimatePresence initial={false}>
              {aviso && (
                <motion.p
                  key="aviso"
                  role="alert"
                  className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-body-sm text-fg"
                  data-testid="diferencias-aviso"
                  {...movimiento}
                >
                  {aviso}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="secondary"
                hideArrow
                disabled={deshabilitado || filas.length >= maximo}
                onClick={() => setFilas((fs) => [...fs, filaNueva()])}
                data-testid="diferencias-agregar"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {filas.length >= maximo ? `Máximo ${maximo}` : 'Agregar una diferencia'}
              </Button>
              <Button
                size="sm"
                hideArrow
                disabled={sinLaMigracion}
                isLoading={guardando}
                onClick={() => void guardar()}
                data-testid="diferencias-guardar"
              >
                Guardar las diferencias
              </Button>
            </div>
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}

function FilaEditable({
  fila: f,
  indice,
  errores,
  deshabilitado,
  onCambio,
  onQuitar,
}: {
  fila: FilaDeDiferencia;
  indice: number;
  errores: Partial<Record<CampoDeLaFila, string>>;
  deshabilitado: boolean;
  onCambio: (cambio: Partial<FilaDeDiferencia>, campo?: CampoDeLaFila) => void;
  onQuitar: () => void;
}) {
  const id = `diferencia-${f.clave}`;
  const esRetencion = f.tipo === 'RETENCION';
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-start">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-nombre`}>Nombre</Label>
        <Input
          id={`${id}-nombre`}
          value={f.nombre}
          maxLength={80}
          placeholder="Retención arrendamientos"
          disabled={deshabilitado}
          aria-invalid={!!errores.nombre}
          aria-describedby={`${id}-nombre-error`}
          onChange={(e) => onCambio({ nombre: e.target.value }, 'nombre')}
          data-testid={`diferencia-${indice}-nombre`}
        />
        <ErrorDelCampo id={`${id}-nombre-error`} mensaje={errores.nombre} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-tipo`}>Tipo</Label>
        <Select
          value={f.tipo}
          disabled={deshabilitado}
          onValueChange={(v) => onCambio({ tipo: v as TipoDeDiferencia, valor: '' }, 'valor')}
        >
          <SelectTrigger id={`${id}-tipo`} className="h-10" data-testid={`diferencia-${indice}-tipo`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RETENCION">Retención (%)</SelectItem>
            <SelectItem value="COMISION">Comisión ($)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-valor`}>{esRetencion ? 'Porcentaje' : 'Valor en pesos'}</Label>
        <Input
          id={`${id}-valor`}
          value={f.valor}
          inputMode={esRetencion ? 'decimal' : 'numeric'}
          className="font-mono"
          placeholder={esRetencion ? '3,5' : '8.900'}
          disabled={deshabilitado}
          aria-invalid={!!errores.valor}
          aria-describedby={`${id}-valor-error`}
          onChange={(e) => onCambio({ valor: e.target.value }, 'valor')}
          data-testid={`diferencia-${indice}-valor`}
        />
        <ErrorDelCampo id={`${id}-valor-error`} mensaje={errores.valor} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-a-quien`}>A quién</Label>
        <Select
          value={f.aQuien}
          disabled={deshabilitado}
          onValueChange={(v) => onCambio({ aQuien: v as AQuienAplicaLaDiferencia })}
        >
          <SelectTrigger id={`${id}-a-quien`} className="h-10" data-testid={`diferencia-${indice}-a-quien`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NOMBRE_DE_A_QUIEN) as AQuienAplicaLaDiferencia[]).map((q) => (
              <SelectItem key={q} value={q}>
                {NOMBRE_DE_A_QUIEN[q]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-caption text-fg-muted">{AYUDA_DE_A_QUIEN[f.aQuien]}</p>
      </div>

      <div className="sm:pt-7">
        <Button
          size="sm"
          variant="ghost"
          hideArrow
          disabled={deshabilitado}
          onClick={onQuitar}
          aria-label={`Quitar ${f.nombre.trim() || 'esta diferencia'}`}
          data-testid={`diferencia-${indice}-quitar`}
        >
          <Trash className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
