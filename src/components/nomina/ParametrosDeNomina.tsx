'use client';

/**
 * LA CONFIGURACIÓN DEL AÑO — y la pantalla donde Leasefy admite lo que no sabe.
 *
 * ── 🔴 Las tres cifras que el producto NO trae ──────────────────────────────
 *
 * El salario mínimo y el auxilio de transporte los decreta el Gobierno cada
 * diciembre; la UVT la fija la DIAN por resolución. **No vienen sembradas para el
 * año en curso**, y la liquidación se niega a correr sin ellas.
 *
 * Esta pantalla no las adivina y no las pone en cero: las muestra vacías, dice
 * qué documento hay que buscar y pone al lado las del año pasado como
 * REFERENCIA, marcadas como tales. Un cero acá sería una nómina mal pagada y una
 * retención mal practicada, y el error aparece cuando alguien reclama.
 *
 * ── Lo que sí viene, y con su norma ────────────────────────────────────────
 *
 * Los recargos del CST, las cotizaciones de la Ley 100 y los porcentajes de
 * prestaciones vienen sembrados y son editables. Tres de ellos salen con un
 * aviso porque su valor vigente está en discusión (el recargo dominical y el
 * divisor de la hora, por la reforma laboral de 2025 y la Ley 2101) o depende
 * del contribuyente (la exoneración del art. 114-1, que viene APAGADA).
 */

import { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { nominaApi } from '@/lib/api/nomina.service';
import type {
  FactoresDeNomina,
  ParametrosDelAnio,
} from '@/lib/api/nomina.types';
import { SIN_MEDIR } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, ParaValidar, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

/** Los grupos del formulario, en el orden en que un contador los revisa. */
const GRUPOS: {
  titulo: string;
  explicacion: string;
  campos: { campo: keyof FactoresDeNomina; etiqueta: string; unidad: string }[];
}[] = [
  {
    titulo: 'Horas extras y recargos',
    explicacion:
      'En puntos básicos sobre la hora ordinaria: 25 % = 2500. Una HORA EXTRA paga la hora más el recargo; un RECARGO paga sólo el recargo, porque el salario del mes ya pagó esa hora.',
    campos: [
      { campo: 'extraDiurnaBps', etiqueta: 'Hora extra diurna', unidad: 'bps' },
      { campo: 'extraNocturnaBps', etiqueta: 'Hora extra nocturna', unidad: 'bps' },
      {
        campo: 'extraDominicalDiurnaBps',
        etiqueta: 'Hora extra dominical diurna',
        unidad: 'bps',
      },
      {
        campo: 'extraDominicalNocturnaBps',
        etiqueta: 'Hora extra dominical nocturna',
        unidad: 'bps',
      },
      { campo: 'recargoNocturnoBps', etiqueta: 'Recargo nocturno', unidad: 'bps' },
      {
        campo: 'recargoDominicalBps',
        etiqueta: 'Recargo dominical o festivo',
        unidad: 'bps',
      },
      { campo: 'horasMes', etiqueta: 'Horas del mes (divisor de la hora)', unidad: 'h' },
    ],
  },
  {
    titulo: 'Seguridad social y parafiscales',
    explicacion:
      'En puntos básicos del IBC: 4 % = 400. El fondo de solidaridad pensional no se configura acá — son tramos de ley que dependen de cuántos salarios mínimos gana la persona.',
    campos: [
      { campo: 'saludEmpleadoBps', etiqueta: 'Salud (empleado)', unidad: 'bps' },
      { campo: 'saludEmpleadorBps', etiqueta: 'Salud (empleador)', unidad: 'bps' },
      { campo: 'pensionEmpleadoBps', etiqueta: 'Pensión (empleado)', unidad: 'bps' },
      { campo: 'pensionEmpleadorBps', etiqueta: 'Pensión (empleador)', unidad: 'bps' },
      {
        campo: 'cajaCompensacionBps',
        etiqueta: 'Caja de compensación',
        unidad: 'bps',
      },
      { campo: 'senaBps', etiqueta: 'SENA', unidad: 'bps' },
      { campo: 'icbfBps', etiqueta: 'ICBF', unidad: 'bps' },
      { campo: 'ibcTopeSmlmv', etiqueta: 'Tope del IBC', unidad: 'SMLMV' },
    ],
  },
  {
    titulo: 'Prestaciones sociales',
    explicacion:
      'El porcentaje MENSUAL que se provisiona. La base de vacaciones NO lleva auxilio de transporte ni horas extras (CST art. 192); las otras tres sí. Eso no se configura: es ley.',
    campos: [
      { campo: 'primaBps', etiqueta: 'Prima de servicios', unidad: 'bps' },
      { campo: 'cesantiasBps', etiqueta: 'Cesantías', unidad: 'bps' },
      {
        campo: 'interesesCesantiasBps',
        etiqueta: 'Intereses sobre cesantías',
        unidad: 'bps',
      },
      { campo: 'vacacionesBps', etiqueta: 'Vacaciones', unidad: 'bps' },
    ],
  },
];

export function ParametrosDeNominaPanel({ anio }: { anio?: number }) {
  const [anioElegido, setAnio] = useState(
    anio ?? new Date().getUTCFullYear(),
  );
  const estado = useCargaDeNomina<ParametrosDelAnio>(
    () => nominaApi.parametros(anioElegido),
    [anioElegido],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="anio-de-nomina" className="text-xs text-fg-muted">
          Año
        </Label>
        <Input
          id="anio-de-nomina"
          type="number"
          className="w-28"
          value={anioElegido}
          onChange={(e) => setAnio(Number(e.target.value))}
          data-testid="anio-de-nomina"
        />
      </div>
      <Cargado
        estado={estado}
        queEs="los parámetros de nómina"
        queSeEspera="cargar los parámetros de nómina"
      >
        {(datos) => (
          <Formulario
            datos={datos}
            anio={anioElegido}
            onGuardado={estado.recargar}
          />
        )}
      </Cargado>
    </div>
  );
}

function Formulario({
  datos,
  anio,
  onGuardado,
}: {
  datos: ParametrosDelAnio;
  anio: number;
  onGuardado: () => Promise<void>;
}) {
  const partida = datos.guardado ?? datos.propuesta;
  const [valores, setValores] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState(datos.guardado?.notas ?? '');
  const [guardando, setGuardando] = useState(false);

  const reset = useCallback(() => {
    if (!partida) return;
    const siguiente: Record<string, string> = {};
    for (const g of GRUPOS) {
      for (const c of g.campos) {
        const v = partida[c.campo];
        siguiente[c.campo] = typeof v === 'number' ? String(v) : '';
      }
    }
    // 🔴 Las tres cifras del Estado se copian tal cual: si vienen nulas quedan
    // VACÍAS, no en cero. Un cero acá se guardaría como «este año no hay auxilio
    // de transporte».
    siguiente.salarioMinimoCop =
      partida.salarioMinimoCop != null ? String(partida.salarioMinimoCop) : '';
    siguiente.auxilioTransporteCop =
      partida.auxilioTransporteCop != null
        ? String(partida.auxilioTransporteCop)
        : '';
    siguiente.uvtCop = partida.uvtCop != null ? String(partida.uvtCop) : '';
    siguiente.exoneracion1141 = partida.exoneracion1141 ? 'si' : 'no';
    setValores(siguiente);
    setNotas(datos.guardado?.notas ?? '');
  }, [partida, datos.guardado]);

  useEffect(() => {
    reset();
  }, [reset]);

  const entero = (clave: string): number | null => {
    const texto = (valores[clave] ?? '').trim();
    if (texto === '') return null;
    const n = Number(texto);
    return Number.isInteger(n) ? n : null;
  };

  const guardar = async (confirmado: boolean) => {
    setGuardando(true);
    try {
      const factores: Record<string, number | boolean> = {};
      for (const g of GRUPOS) {
        for (const c of g.campos) {
          const v = entero(c.campo);
          if (v != null) factores[c.campo] = v;
        }
      }
      factores.exoneracion1141 = valores.exoneracion1141 === 'si';

      await nominaApi.guardarParametros(anio, {
        ...(factores as Partial<FactoresDeNomina>),
        // `null` cuando está vacío: es lo que hace que el back lo guarde como
        // «todavía no se sabe» en vez de como un cero.
        salarioMinimoCop: entero('salarioMinimoCop'),
        auxilioTransporteCop: entero('auxilioTransporteCop'),
        uvtCop: entero('uvtCop'),
        notas: notas.trim() || null,
        confirmado,
      });
      toast.success(
        confirmado
          ? `Los parámetros de ${anio} quedaron guardados y confirmados.`
          : `Los parámetros de ${anio} quedaron guardados.`,
      );
      await onGuardado();
    } catch (error) {
      toast.error(
        mensajeDelFallo(error, 'No se pudieron guardar los parámetros.'),
      );
    } finally {
      setGuardando(false);
    }
  };

  const avisos = Object.values(datos.avisos ?? {});
  const referencia = datos.propuesta?.referencia ?? null;
  const cargado = datos.guardado;

  return (
    <div className="space-y-6">
      {!datos.completos ? (
        <Avisos
          avisos={[
            `Falta ${datos.queFalta.join(', ')}. Sin eso la nómina de ${anio} no se puede liquidar.`,
            datos.propuesta?.motivoSiFalta ??
              'El salario mínimo y el auxilio de transporte los decreta el Gobierno cada diciembre; la UVT la fija la DIAN por resolución. Leasefy no los inventa.',
          ]}
          titulo={`Las cifras de ${anio} todavía no están`}
          testId="faltan-cifras"
        />
      ) : null}

      {datos.guardado && datos.guardado.confirmadoAt == null ? (
        <Avisos
          avisos={[
            'Nadie ha confirmado estos parámetros. Mientras no lo hagan, cada desprendible sale con ese aviso: lo que un contador revisa una vez, el producto lo repite todos los meses.',
          ]}
          testId="sin-confirmar"
        />
      ) : null}

      {/* ── Las tres cifras del Estado ───────────────────────────────────── */}
      <section className="space-y-3">
        <TituloDeBloque
          titulo={`Las cifras que fija el Estado en ${anio}`}
          explicacion="Leasefy NO las mantiene: el salario mínimo y el auxilio de transporte salen del decreto de diciembre y la UVT de la resolución de la DIAN. Las carga esta inmobiliaria, con el documento a la vista."
        />

        {/*
          🔴 Quién cargó estas cifras y cuándo (Nico, 17-09).

          No es adorno: es el número con el que se paga la nómina de todo el
          mundo. Cuando alguien pregunte «¿de dónde salió este salario mínimo?»,
          la respuesta tiene que estar en la misma pantalla y no en un log.

          Cargar y confirmar son dos actos distintos y se muestran por separado:
          cargar es teclear el decreto, confirmar es que un contador diga que
          está bien. Guardar de nuevo NO reconfirma.
        */}
        <div
          className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-fg-muted"
          data-testid="quien-y-cuando"
        >
          {cargado ? (
            <>
              <p>
                <strong className="text-fg">Cargadas</strong> el{' '}
                {cargado.cargadoAt.slice(0, 10)}
                {datos.cargadoPor?.nombre
                  ? ` por ${datos.cargadoPor.nombre}`
                  : ' (no se pudo resolver quién)'}
                .
              </p>
              <p>
                {cargado.confirmadoAt ? (
                  <>
                    <strong className="text-fg">Confirmadas</strong> el{' '}
                    {cargado.confirmadoAt.slice(0, 10)}
                    {datos.confirmadoPor?.nombre
                      ? ` por ${datos.confirmadoPor.nombre}`
                      : ''}
                    .
                  </>
                ) : (
                  <>
                    <strong className="text-warning">Sin confirmar</strong> —
                    nadie las ha revisado todavía.
                  </>
                )}
              </p>
            </>
          ) : (
            <p>
              Todavía nadie ha cargado las cifras de {anio} en esta inmobiliaria.
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              {
                clave: 'salarioMinimoCop',
                etiqueta: 'Salario mínimo mensual',
                ref: referencia?.salarioMinimoCop,
              },
              {
                clave: 'auxilioTransporteCop',
                etiqueta: 'Auxilio de transporte mensual',
                ref: referencia?.auxilioTransporteCop,
              },
              { clave: 'uvtCop', etiqueta: 'UVT', ref: referencia?.uvtCop },
            ] as const
          ).map(({ clave, etiqueta, ref }) => (
            <div key={clave} className="space-y-1.5">
              <Label htmlFor={clave}>{etiqueta}</Label>
              <Input
                id={clave}
                type="number"
                inputMode="numeric"
                placeholder="Sin cargar"
                value={valores[clave] ?? ''}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [clave]: e.target.value }))
                }
                data-testid={`campo-${clave}`}
              />
              <p className="text-xs text-fg-muted" data-testid={`ref-${clave}`}>
                {referencia != null
                  ? `En ${referencia.anio} fue ${
                      ref != null ? formatCurrency(ref) : SIN_MEDIR
                    } — referencia, no se usa sola.`
                  : 'Sin referencia de años anteriores.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {avisos.length > 0 ? (
        <Avisos
          avisos={avisos}
          titulo="Lo que hay que confirmar con tu contador o tu abogado laboral"
          testId="avisos-de-factores"
        />
      ) : null}

      {/* ── Los factores ─────────────────────────────────────────────────── */}
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="space-y-3">
          <TituloDeBloque titulo={g.titulo} explicacion={g.explicacion} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.campos.map((c) => (
              <div key={c.campo} className="space-y-1.5">
                <Label htmlFor={c.campo}>{c.etiqueta}</Label>
                <Input
                  id={c.campo}
                  type="number"
                  inputMode="numeric"
                  value={valores[c.campo] ?? ''}
                  onChange={(e) =>
                    setValores((v) => ({ ...v, [c.campo]: e.target.value }))
                  }
                  data-testid={`campo-${c.campo}`}
                />
                <p className="text-xs text-fg-muted">
                  {c.unidad === 'bps'
                    ? `${((entero(c.campo) ?? 0) / 100).toFixed(2)} %`
                    : c.unidad}
                </p>
                {datos.avisos?.[c.campo] ? (
                  <ParaValidar
                    motivo={datos.avisos[c.campo]!}
                    testId={`validar-${c.campo}`}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── La exoneración ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <TituloDeBloque
          titulo="Exoneración del art. 114-1 del Estatuto Tributario"
          explicacion="Exonera de salud del empleador, SENA e ICBF por los empleados que devengan menos de 10 salarios mínimos, pero sólo para ciertos contribuyentes. Viene APAGADA: prenderla sin confirmarlo calcularía aportes de menos, y pagar de menos a la seguridad social se corrige con intereses."
        />
        <div className="flex items-center gap-3">
          <Checkbox id="exoneracion1141" checked={valores.exoneracion1141 === 'si'} onCheckedChange={(marcada: boolean) =>
              setValores((v) => ({
                ...v,
                exoneracion1141: marcada ? 'si' : 'no',
              }))
            } data-testid="campo-exoneracion1141" />
          <Label htmlFor="exoneracion1141">
            Mi contador confirmó que esta inmobiliaria está exonerada
          </Label>
        </div>
      </section>

      {/* ── Notas y guardado ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Label htmlFor="notas-de-parametros">
          Notas (de dónde salió cada cifra, qué revisó tu contador)
        </Label>
        <textarea
          id="notas-de-parametros"
          className="min-h-20 w-full rounded-md border border-border bg-surface p-3 text-sm text-fg"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          data-testid="campo-notas"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void guardar(false)}
            disabled={guardando}
            data-testid="guardar-parametros"
          >
            Guardar
          </Button>
          <Button
            variant="outline"
            onClick={() => void guardar(true)}
            disabled={guardando}
            data-testid="guardar-y-confirmar"
          >
            Guardar y marcar como confirmados por el contador
          </Button>
          <Button variant="ghost" onClick={reset} disabled={guardando}>
            Deshacer los cambios
          </Button>
        </div>
        <p className="text-xs text-fg-muted">
          Guardar deja tu nombre y la fecha en «Cargadas»; confirmar es un acto
          aparte, y corregir una cifra lo borra — si cambia el número, el contador
          tiene que volver a mirarlo.
        </p>
      </section>
    </div>
  );
}
