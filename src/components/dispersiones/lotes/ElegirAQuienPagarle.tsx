'use client';

/**
 * A quién le pago hoy, y hasta dónde me alcanza.
 *
 * ── Lo que pidió el CEO (2026-09-15), y dónde está cada cosa ───────────────
 *
 * · «La plata que yo tengo en mi cuenta hoy es la que debería mostrarse para
 *   poder dispersar» → la barra de arriba: entradas, comprometido, disponible.
 * · «Por lotes … y poder elegir a quién le voy pagando» → una casilla por fila.
 * · «Ordenar de menor a mayor y decidir hasta qué punto» → el selector de orden
 *   y el campo de tope, que tilda solo hasta donde alcanza.
 * · «Que vaya sumando con respecto al egreso» → la columna «Acumulado», que es
 *   la suma en el orden elegido, no la de lo tildado.
 * · «Si selecciono 20 propietarios, que me diga: voy a dispersar 100 millones a
 *   esos 20» → el pie, siempre visible, con lo tildado.
 *
 * 🔴 Pasarse del disponible NO se bloquea: está decidido que se puede adelantar
 * plata propia. Lo que sí hace la pantalla es DECIRLO —con el número del
 * descubierto— antes de armar, porque un adelanto que nadie vio es el que
 * después no se puede cuadrar.
 *
 * 🔴 NUNCA una parte (Juan Camilo, 2026-09-16: «se les paga completo. Yo no les
 * puedo pagar parcial»). No hay campo de monto por propietario: cada fila es su
 * neto del mes ENTERO, y el tope sólo decide a quién tildar. Una liquidación
 * cuyas deducciones cubren el mes se cierra en $0 con el lote: se tilda igual,
 * no suma, y lo que falte pasa a su siguiente liquidación.
 *
 * 🔴 «Acumulado» y «seleccionado» son dos números distintos a propósito. El
 * acumulado responde «hasta qué fila me alcanza si voy en este orden»; el
 * seleccionado responde «cuánto voy a girar». Mezclarlos haría que destildar a
 * uno del medio moviera la línea de corte de todos los de abajo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  lotesDeDispersionApi,
  type CandidatoDeDispersion,
  type CandidatosDeDispersion,
  type OrdenDeCandidatos,
} from '@/lib/api/lotes-de-dispersion.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';

const ORDENES: Array<{ id: OrdenDeCandidatos; nombre: string }> = [
  { id: 'MENOR_A_MAYOR', nombre: 'De menor a mayor' },
  { id: 'MAYOR_A_MENOR', nombre: 'De mayor a menor' },
  { id: 'NOMBRE', nombre: 'Por nombre' },
];

export interface EleccionDelLote {
  dispersionIds: string[];
  orden: OrdenDeCandidatos;
  totalCop: number;
  /** Cuánto se giraría por encima del disponible. `0` = alcanza. */
  descubiertoCop: number;
}

export function ElegirAQuienPagarle({
  mes,
  onCambio,
}: {
  /** `YYYY-MM`. Filtra a ese mes; la lista sale igual si no hay nada. */
  mes: string;
  /** Lo elegido, cada vez que cambia. El botón de armar vive afuera. */
  onCambio: (eleccion: EleccionDelLote) => void;
}) {
  const [datos, setDatos] = useState<CandidatosDeDispersion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [orden, setOrden] = useState<OrdenDeCandidatos>('MENOR_A_MAYOR');
  const [tope, setTope] = useState('');
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    lotesDeDispersionApi
      .candidatos({ month: mes, orden })
      .then((r) => {
        setDatos(r);
        // Al recargar se limpia la selección: mantenerla tildaría ids que ya no
        // están en la lista (otro lote se los llevó) y el total mentiría.
        setElegidos(new Set());
      })
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error('Error')))
      .finally(() => setCargando(false));
  }, [mes, orden]);

  useEffect(() => cargar(), [cargar]);

  const girables = useMemo(
    () => (datos?.candidatos ?? []).filter((c) => c.motivoDeExclusion === null),
    [datos],
  );
  const excluidos = useMemo(
    () => (datos?.candidatos ?? []).filter((c) => c.motivoDeExclusion !== null && !c.seCompensa),
    [datos],
  );
  /** Se cierran en $0: se tildan como cualquiera, pero no giran nada. */
  const compensables = useMemo(
    () => (datos?.candidatos ?? []).filter((c) => c.seCompensa),
    [datos],
  );

  /*
   * 🔴 QA 22-09: sin nada tildado el resumen decía «Vas a dispersar $0 a 0
   * propietarios» justo antes de confirmar, y el botón dice «Armar lote con el
   * mes entero» —que es lo que el back hace con la lista vacía—: el toast
   * después decía «1 pagos por $4.710.000». Sin selección, el resumen cuenta
   * el MES ENTERO, que es lo que se va a armar.
   */
  const todoElMes = elegidos.size === 0;
  const entra = useCallback(
    (id: string) => todoElMes || elegidos.has(id),
    [todoElMes, elegidos],
  );

  const totalElegido = useMemo(
    () => girables.reduce((s, c) => (entra(c.dispersionId) ? s + c.netoCop : s), 0),
    [girables, entra],
  );

  /** A cuántos se les gira de verdad; los que se cierran en $0 se cuentan aparte. */
  const cerradosEnCero = useMemo(
    () => compensables.filter((c) => entra(c.dispersionId)).length,
    [compensables, entra],
  );
  const girados = todoElMes ? girables.length : elegidos.size - cerradosEnCero;

  const disponible = datos?.plata.disponibleCop ?? 0;
  // El descubierto se mide contra el disponible, nunca contra 0: si ya venía
  // negativo, todo lo que se gire hoy es plata adelantada.
  const descubierto = Math.max(0, totalElegido - Math.max(0, disponible));

  useEffect(() => {
    onCambio({
      dispersionIds: [...elegidos],
      orden,
      totalCop: totalElegido,
      descubiertoCop: descubierto,
    });
  }, [elegidos, orden, totalElegido, descubierto, onCambio]);

  const alternar = (id: string) =>
    setElegidos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  /** Tilda hasta donde alcance el monto escrito, en el orden de la tabla. */
  const tildarHastaElTope = () => {
    const topeCop = Number(tope.replace(/\D/g, ''));
    if (!Number.isFinite(topeCop) || topeCop <= 0) return;
    // Las que se cierran en $0 no consumen tope: entran siempre.
    const siguiente = new Set<string>(compensables.map((c) => c.dispersionId));
    let suma = 0;
    for (const c of girables) {
      // Se SIGUE mirando después de una que no cabe: con orden menor→mayor una
      // fila grande no tiene por qué tapar a las chicas que todavía entran.
      if (suma + c.netoCop > topeCop) continue;
      suma += c.netoCop;
      siguiente.add(c.dispersionId);
    }
    setElegidos(siguiente);
  };

  const tildarHastaElCupo = () => {
    const siguiente = new Set<string>(compensables.map((c) => c.dispersionId));
    for (const c of girables) {
      if (!c.entraEnElCupo) break;
      siguiente.add(c.dispersionId);
    }
    setElegidos(siguiente);
  };

  if (cargando && !datos) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error && !datos) {
    return <FalloDeCarga error={error} queEs="a quién pagarle" onReintentar={cargar} />;
  }

  return (
    <div className="space-y-4" data-testid="elegir-a-quien-pagarle">
      <PlataDeHoy datos={datos} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="orden-de-pago" className="text-xs">
            Ordenar
          </Label>
          <select
            id="orden-de-pago"
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenDeCandidatos)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg"
          >
            {ORDENES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="tope-del-lote" className="text-xs">
            Pagar hasta
          </Label>
          <Input
            id="tope-del-lote"
            inputMode="numeric"
            placeholder="100000000"
            value={tope}
            onChange={(e) => setTope(e.target.value)}
            className="h-10 w-44 font-mono"
          />
        </div>

        <Button variant="outline" hideArrow onClick={tildarHastaElTope} disabled={!tope}>
          Tildar hasta ese monto
        </Button>
        <Button
          variant="outline"
          hideArrow
          onClick={tildarHastaElCupo}
          disabled={girables.length === 0}
        >
          Tildar lo que alcanza
        </Button>
        {/* 🔴 «Quitar la selección», con las mismas palabras que el resto del
            panel (`BarraDeAccionesMasivas`). Esta pantalla NO usa esa barra a
            propósito: vive dentro del diálogo «Armar el lote», que ya tiene su
            propio pie con el botón que arma. Meterle una barra pegada al borde
            de abajo dejaría dos pies compitiendo por el mismo borde. Lo que sí
            se comparte es el idioma. */}
        <Button
          variant="ghost"
          hideArrow
          onClick={() => setElegidos(new Set())}
          disabled={elegidos.size === 0}
        >
          Quitar la selección
        </Button>
      </div>
      <p className="text-xs text-fg-muted" data-testid="sin-giro-parcial">
        Cada propietario se gira completo o no se gira: el monto de «Pagar hasta» sólo decide a quién
        tildar, nunca parte el neto de nadie.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Propietario</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">Acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {girables.map((c) => (
              <FilaDelCandidato
                key={c.dispersionId}
                candidato={c}
                elegido={elegidos.has(c.dispersionId)}
                onAlternar={() => alternar(c.dispersionId)}
              />
            ))}
            {compensables.map((c) => (
              <TableRow
                key={c.dispersionId}
                className="cursor-pointer"
                onClick={() => alternar(c.dispersionId)}
                data-testid={`compensable-${c.dispersionId}`}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={elegidos.has(c.dispersionId)}
                    onCheckedChange={() => alternar(c.dispersionId)}
                    aria-label={`Cerrar en $0 la liquidación de ${c.propietarioName}`}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-fg">{c.propietarioName}</span>
                  <p className="text-xs text-fg-muted">
                    Sus deducciones cubren el mes: se cierra en $0
                    {c.saldoEnContraCop ? ` y ${formatCurrency(c.saldoEnContraCop)} pasan al mes siguiente` : ''}.
                  </p>
                </TableCell>
                <TableCell className="text-fg-muted">{nombreDelMes(c.month)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-fg">{formatCurrency(0)}</TableCell>
                <TableCell className="text-right text-xs text-fg-muted">No suma</TableCell>
              </TableRow>
            ))}
            {excluidos.map((c) => (
              <TableRow key={c.dispersionId} className="opacity-60">
                <TableCell />
                <TableCell>
                  <span className="text-fg">{c.propietarioName}</span>
                  <p className="text-xs text-danger">{c.motivoDeExclusion}</p>
                </TableCell>
                <TableCell className="text-fg-muted">{nombreDelMes(c.month)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-fg-muted">
                  {formatCurrency(c.netoCop)}
                </TableCell>
                <TableCell className="text-right text-xs text-fg-muted">No se puede girar</TableCell>
              </TableRow>
            ))}
            {girables.length === 0 && excluidos.length === 0 && compensables.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-fg-muted">
                  No hay dispersiones pendientes de {nombreDelMes(mes)} sin lote.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
        data-testid="resumen-de-lo-elegido"
      >
        <p className="text-sm text-fg">
          {todoElMes && girables.length + compensables.length > 0 ? 'Con el mes entero, vas a dispersar' : 'Vas a dispersar'}{' '}
          <strong className="font-mono tabular-nums">{formatCurrency(totalElegido)}</strong> a{' '}
          <strong>{girados}</strong> {girados === 1 ? 'propietario' : 'propietarios'}
          {cerradosEnCero > 0 && (
            <>
              {' '}
              y cierras en $0 la liquidación de <strong>{cerradosEnCero}</strong>
            </>
          )}
          .
        </p>
        {descubierto > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-warning">
            <Warning className="h-4 w-4" weight="fill" />
            {formatCurrency(descubierto)} sale de plata de la inmobiliaria
          </span>
        )}
      </div>

      {descubierto > 0 && (
        <Banner variant="warning">
          Estás girando {formatCurrency(descubierto)} por encima de lo que hay disponible. Se puede
          hacer —es un adelanto con plata de la inmobiliaria— y queda registrado en el lote como
          descubierto para poder cuadrarlo después.
        </Banner>
      )}
    </div>
  );
}

/** La barra de arriba: qué entró, qué está prometido y qué queda. */
function PlataDeHoy({ datos }: { datos: CandidatosDeDispersion | null }) {
  if (!datos) return null;
  const { plata } = datos;

  if (!plata.hayExtracto) {
    return (
      <Banner variant="info">
        Todavía no hay extracto bancario cargado, así que no sabemos cuánta plata hay en la cuenta.
        Puedes armar el lote igual: el cupo aparece cuando cargues el extracto en Conciliación.
      </Banner>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="plata-disponible">
      <Dato titulo="Entró a la cuenta" valorCop={plata.entradasCop} />
      <Dato titulo="Ya comprometido" valorCop={plata.comprometidoCop} />
      <Dato
        titulo="Disponible para dispersar"
        valorCop={plata.disponibleCop}
        destacado
        nota={plata.ultimoMovimiento ? `Último movimiento: ${plata.ultimoMovimiento}` : undefined}
      />
    </div>
  );
}

function Dato({
  titulo,
  valorCop,
  destacado,
  nota,
}: {
  titulo: string;
  valorCop: number;
  destacado?: boolean;
  nota?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-fg-muted">{titulo}</p>
      <p
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          // Un disponible negativo significa que ya se adelantó plata: se
          // muestra en rojo, no escondido tras un cero.
          valorCop < 0 ? 'text-danger' : destacado ? 'text-success' : 'text-fg',
        )}
      >
        {formatCurrency(valorCop)}
      </p>
      {nota && <p className="text-[11px] text-fg-muted">{nota}</p>}
    </div>
  );
}

function FilaDelCandidato({
  candidato,
  elegido,
  onAlternar,
}: {
  candidato: CandidatoDeDispersion;
  elegido: boolean;
  onAlternar: () => void;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={onAlternar}
      data-testid={`candidato-${candidato.dispersionId}`}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={elegido}
          onCheckedChange={onAlternar}
          aria-label={`Pagarle a ${candidato.propietarioName}`}
        />
      </TableCell>
      <TableCell className="font-medium text-fg">{candidato.propietarioName}</TableCell>
      <TableCell className="text-fg-muted">{nombreDelMes(candidato.month)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums text-fg">
        {formatCurrency(candidato.netoCop)}
      </TableCell>
      <TableCell
        className={cn(
          'text-right font-mono text-xs tabular-nums',
          // La línea de corte: hasta acá alcanza la plata que hay.
          candidato.entraEnElCupo ? 'text-fg-muted' : 'text-warning',
        )}
      >
        {formatCurrency(candidato.acumuladoCop)}
      </TableCell>
    </TableRow>
  );
}
