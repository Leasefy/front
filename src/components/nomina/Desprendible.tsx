'use client';

/**
 * EL DESPRENDIBLE DE PAGO — el documento que la persona guarda.
 *
 * ── 🔴 Lo que esta pantalla NO recalcula ────────────────────────────────────
 *
 * NADA. Todas las cifras vienen del back, congeladas al liquidar. Ni el neto se
 * suma acá: se pinta `netoCop`. Es a propósito y es la regla que evita el peor
 * error posible en nómina — que la pantalla muestre un número y el banco gire
 * otro porque cada lado redondeó distinto.
 *
 * Lo único que la pantalla hace con los números es agruparlos por clase, que es
 * cómo se lee un desprendible.
 *
 * ── Lo que enseña, además de la plata ──────────────────────────────────────
 *
 *   · **cada renglón trae su detalle**: con qué base, cuántos días u horas, y su
 *     norma. Un desprendible que sólo dice «Recargo nocturno $35.000» obliga a
 *     preguntar; éste ya contesta;
 *   · **los aportes del empleador aparecen pero NO se descuentan**: es plata que
 *     la inmobiliaria paga por la persona, y esconderla hace creer que la nómina
 *     cuesta el neto;
 *   · **lo que un contador tiene que validar sale marcado**, con el motivo.
 */

import { useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { nominaApi } from '@/lib/api/nomina.service';
import type {
  ClaseDeConcepto,
  Desprendible as Datos,
  LineaDeLiquidacion,
} from '@/lib/api/nomina.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  Avisos,
  Cifra,
  EstadoDelPeriodo,
  ParaValidar,
  TituloDeBloque,
  deCentesimas,
  etiquetaDelPeriodo,
} from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const BLOQUES: {
  clase: ClaseDeConcepto;
  titulo: string;
  explicacion: string;
}[] = [
  {
    clase: 'DEVENGADO',
    titulo: 'Devengado',
    explicacion: 'Todo lo que se le reconoció en el período.',
  },
  {
    clase: 'DEDUCCION',
    titulo: 'Deducciones',
    explicacion:
      'Lo que se le descuenta: sus aportes a salud y pensión, la retención en la fuente y los descuentos que autorizó.',
  },
  {
    clase: 'APORTE_EMPLEADOR',
    titulo: 'Aportes del empleador',
    explicacion:
      'Los paga la inmobiliaria por esta persona y NO se le descuentan. Aparecen porque son parte del costo real de la nómina.',
  },
  {
    clase: 'PROVISION',
    titulo: 'Prestaciones provisionadas',
    explicacion:
      'Lo que se causó este mes de prima, cesantías, intereses y vacaciones. No se le paga ahora: queda provisionado y se cruza cuando se pague.',
  },
];

export function DesprendiblePanel({ liquidacionId }: { liquidacionId: string }) {
  const estado = useCargaDeNomina<Datos>(
    () => nominaApi.desprendible(liquidacionId),
    [liquidacionId],
  );

  return (
    <Cargado
      estado={estado}
      queEs="el desprendible"
      queSeEspera="ver el desprendible"
    >
      {(datos) => <Contenido datos={datos} />}
    </Cargado>
  );
}

function Contenido({ datos }: { datos: Datos }) {
  const porClase = useMemo(() => {
    const mapa = new Map<ClaseDeConcepto, LineaDeLiquidacion[]>();
    for (const l of datos.lineas) {
      const ya = mapa.get(l.clase) ?? [];
      ya.push(l);
      mapa.set(l.clase, ya);
    }
    return mapa;
  }, [datos.lineas]);

  const marcadas = datos.lineas.filter((l) => l.requiereValidacionContador);

  return (
    <div className="space-y-6">
      <header className="space-y-2 rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-fg">{datos.nombre}</h2>
            <p className="text-xs text-fg-muted">
              {[
                datos.documento ? `Documento ${datos.documento}` : null,
                datos.cargo,
                datos.tipo.replace(/_/g, ' ').toLowerCase(),
                datos.salarioCop != null
                  ? `salario ${formatCurrency(datos.salarioCop)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-fg">
              {etiquetaDelPeriodo(datos.periodo.mes, datos.periodo.quincena)}
            </p>
            <p className="text-xs text-fg-muted">
              {datos.periodo.desde.slice(0, 10)} al{' '}
              {datos.periodo.hasta.slice(0, 10)} · {datos.diasLiquidados} días
            </p>
            <div className="mt-1">
              <EstadoDelPeriodo estado={datos.periodo.estado} />
            </div>
          </div>
        </div>
        {datos.esDefinitiva ? (
          <p className="text-xs font-medium text-warning" data-testid="es-definitiva">
            Liquidación DEFINITIVA por terminación del contrato
            {datos.fechaRetiro ? ` el ${datos.fechaRetiro.slice(0, 10)}` : ''}
            {datos.causalRetiro
              ? ` (${datos.causalRetiro.replace(/_/g, ' ').toLowerCase()})`
              : ''}
            .
          </p>
        ) : null}
      </header>

      {marcadas.length > 0 ? (
        <Avisos
          avisos={marcadas.map(
            (l) => `${l.nombre}: ${l.motivoValidacion ?? 'revísalo con tu contador.'}`,
          )}
          titulo={`${marcadas.length} renglón${marcadas.length === 1 ? '' : 'es'} que un contador tiene que validar`}
          testId="renglones-marcados"
        />
      ) : null}

      {datos.avisos && datos.avisos.length > 0 ? (
        <Avisos avisos={datos.avisos} tono="info" testId="avisos-del-desprendible" />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          id="devengado"
          etiqueta="Devengado"
          valor={datos.devengadoCop}
          definicion="Lo que se le reconoció en el período."
        />
        <Cifra
          id="deducciones"
          etiqueta="Deducciones"
          valor={datos.deduccionesCop}
          definicion="Sus aportes, la retención y los descuentos autorizados."
        />
        <Cifra
          id="neto"
          etiqueta="Neto a pagar"
          valor={datos.netoCop}
          definicion="Devengado menos deducciones. Es la cifra que se gira, tal como la calculó el back — esta pantalla no la vuelve a sumar."
          tono="success"
        />
        <Cifra
          id="ibc"
          etiqueta="IBC de seguridad social"
          valor={datos.ibcCop}
          definicion="Lo constitutivo de salario, con el piso de 1 salario mínimo y el techo de 25. El auxilio de transporte NO entra."
        />
      </div>

      {BLOQUES.map((b) => {
        const lineas = porClase.get(b.clase) ?? [];
        if (lineas.length === 0) return null;
        const total = lineas.reduce((s, l) => s + l.valorCop, 0);
        return (
          <section key={b.clase} className="space-y-3">
            <TituloDeBloque titulo={b.titulo} explicacion={b.explicacion} />
            <div className="overflow-x-auto">
              <Table data-testid={`bloque-${b.clase}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>De dónde sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((l) => (
                    <TableRow key={l.id} data-testid={`linea-${l.codigo}`}>
                      <TableCell>
                        <span className="font-medium text-fg">{l.nombre}</span>
                        <span className="ml-1.5 text-xs text-fg-muted">
                          {l.codigo}
                        </span>
                        {l.constitutivoSalario ? (
                          <span
                            className="ml-1.5 text-xs text-fg-muted"
                            title="Entra al IBC de seguridad social y a la base de prestaciones."
                          >
                            · salarial
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {deCentesimas(l.cantidadCentesimas)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(l.valorCop)}
                      </TableCell>
                      <TableCell className="max-w-md text-xs leading-relaxed text-fg-muted">
                        {l.detalle}
                        {l.requiereValidacionContador && l.motivoValidacion ? (
                          <div className="mt-1">
                            <ParaValidar
                              motivo={l.motivoValidacion}
                              testId={`validar-${l.codigo}`}
                            />
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell />
                    <TableCell
                      className="text-right font-mono font-medium tabular-nums"
                      data-testid={`total-${b.clase}`}
                    >
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
        );
      })}

      {datos.documentosDeNomina.length > 0 ? (
        <section className="space-y-3">
          <TituloDeBloque
            titulo="Nómina electrónica"
            explicacion="El documento que se le informa a la DIAN. Un CUNE que empieza por «PRUEBA-» NO se informó: es del proveedor de prueba."
          />
          <ul className="space-y-1 text-xs text-fg-muted">
            {datos.documentosDeNomina.map((d) => (
              <li key={d.id} data-testid={`documento-${d.id}`}>
                {d.prefijo}-{d.numero} · {d.estado.toLowerCase()}
                {d.cune ? ` · CUNE ${d.cune}` : ' · sin CUNE'}
                {d.proveedor ? ` · ${d.proveedor}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
