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

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
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
  EstadoDelPeriodo,
  ParaValidar,
  TituloDeBloque,
  deCentesimas,
  etiquetaDelPeriodo,
} from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';
import { Cifra as CifraDeLaFranja, FranjaDeCifras } from '@leasefy/cadence';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';

/**
 * 🔴 LA CONSTANCIA DEL ENVÍO.
 *
 * Nico (17-09): el desprendible sale por correo al aprobar, «con constancia».
 * Acá se ve A QUÉ correo salió y cuándo — no un «enviado ✓», porque la pregunta
 * que la gente hace es «¿a qué dirección lo mandaron?», y la ficha pudo cambiar
 * desde entonces.
 *
 * Y las tres situaciones se dicen distinto: salió, falta el correo en la ficha
 * (que no es un error del sistema: es un dato que falta) o falló el envío.
 */
function Constancia({
  datos,
  onReenviado,
}: {
  datos: Datos;
  onReenviado: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  const reenviar = async () => {
    setEnviando(true);
    try {
      const r = await nominaApi.reenviarDesprendible(datos.id);
      if (r.estado === 'ENVIADO') {
        toast.success(`Desprendible enviado a ${r.enviadoA}.`);
      } else {
        // 🔴 No es un toast de éxito: no salió. Y el motivo dice qué hacer.
        toast.error(r.motivo ?? 'El desprendible no se pudo enviar.');
      }
      await onReenviado();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, { porDefecto: 'No se pudo reenviar el desprendible.', accion: 'reenviar el desprendible' }),
      );
    } finally {
      setEnviando(false);
    }
  };

  const enviado = datos.desprendibleEnviadoAt != null;

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4 text-caption leading-relaxed text-fg-muted"
      data-testid="constancia-del-envio"
    >
      <div className="space-y-1">
        {enviado ? (
          <p>
            <strong className="text-fg">Enviado</strong> a{' '}
            <strong className="text-fg">{datos.desprendibleEnviadoA}</strong> el{' '}
            {datos.desprendibleEnviadoAt!.slice(0, 10)}
            {datos.desprendibleIntentos > 1
              ? ` (${datos.desprendibleIntentos} intentos)`
              : ''}
            .
          </p>
        ) : datos.desprendibleError ? (
          <>
            <p>
              <strong className="text-warning">No se envió.</strong>{' '}
              {datos.desprendibleError}
            </p>
            <p>
              El período quedó aprobado igual: la liquidación es válida, lo que
              falta es el correo.
            </p>
          </>
        ) : (
          <p>
            Todavía no se ha enviado. Sale solo cuando se aprueba el período.
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void reenviar()}
        disabled={enviando}
        data-testid="reenviar-desprendible"
      >
        {enviando ? 'Enviando…' : enviado ? 'Reenviar' : 'Enviar ahora'}
      </Button>
    </div>
  );
}

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
      {(datos) => <Contenido datos={datos} onReenviado={estado.recargar} />}
    </Cargado>
  );
}

function Contenido({
  datos,
  onReenviado,
}: {
  datos: Datos;
  onReenviado: () => Promise<void>;
}) {
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
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">{datos.nombre}</h2>
            <p className="text-caption text-fg-muted">
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
          <EstadoDelPeriodo estado={datos.periodo.estado} />
        </div>
        {datos.esDefinitiva ? (
          <p className="text-caption font-medium text-warning" data-testid="es-definitiva">
            Liquidación DEFINITIVA por terminación del contrato
            {datos.fechaRetiro ? ` el ${fechaCorta(datos.fechaRetiro.slice(0, 10))}` : ''}
            {datos.causalRetiro
              ? ` (${datos.causalRetiro.replace(/_/g, ' ').toLowerCase()})`
              : ''}
            .
          </p>
        ) : null}
      </header>

      {/* GLOW UP 3.ª vuelta · LA RESPUESTA: lo que se le gira. Antes eran cuatro cifras del mismo
          peso; el devengado, las deducciones y el IBC la acompañan en la franja de abajo. */}
      <CifraHeroe
        rotulo={`Neto a pagar · ${etiquetaDelPeriodo(datos.periodo.mes, datos.periodo.quincena)}`}
        cifra={<span data-testid="valor-neto">{formatCurrency(datos.netoCop)}</span>}
        contexto={`${datos.diasLiquidados} días, del ${fechaCorta(datos.periodo.desde.slice(0, 10))} al ${fechaCorta(datos.periodo.hasta.slice(0, 10))}`}
        pie="Devengado menos deducciones: la cifra que se gira, tal como la calculó el sistema."
        data-testid="cifra-del-desprendible"
      />
      <FranjaDeCifras aria-label="De dónde sale el neto">
        <CifraDeLaFranja etiqueta="Devengado" valor={formatCurrency(datos.devengadoCop)} detalle="Lo reconocido en el período" data-testid="valor-devengado" />
        <CifraDeLaFranja etiqueta="Deducciones" valor={formatCurrency(datos.deduccionesCop)} detalle="Aportes, retención y descuentos" data-testid="valor-deducciones" />
        <CifraDeLaFranja etiqueta="IBC de seguridad social" valor={formatCurrency(datos.ibcCop)} detalle="Sin el auxilio de transporte" data-testid="valor-ibc" />
      </FranjaDeCifras>

      <Constancia datos={datos} onReenviado={onReenviado} />

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

      {BLOQUES.map((b) => {
        const lineas = porClase.get(b.clase) ?? [];
        if (lineas.length === 0) return null;
        const total = lineas.reduce((s, l) => s + l.valorCop, 0);
        return (
          <section key={b.clase} className="space-y-3">
            <TituloDeBloque titulo={b.titulo} explicacion={b.explicacion} />
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Table data-testid={`bloque-${b.clase}`} className="max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>De dónde sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {lineas.map((l) => (
                    <TableRow
                      key={l.id}
                      data-testid={`linea-${l.codigo}`}
                      className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3"
                    >
                      <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                        <span className="font-medium text-fg">{l.nombre}</span>
                        <span className="ml-1.5 text-caption text-fg-muted">
                          {l.codigo}
                        </span>
                        {l.constitutivoSalario ? (
                          <span
                            className="ml-1.5 text-caption text-fg-muted"
                            title="Entra al IBC de seguridad social y a la base de prestaciones."
                          >
                            · salarial
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                        {deCentesimas(l.cantidadCentesimas)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                        {formatCurrency(l.valorCop)}
                      </TableCell>
                      <TableCell className="max-w-md text-caption leading-relaxed text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
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
                  <TableRow className="max-md:flex max-md:items-baseline max-md:justify-between max-md:px-4 max-md:py-3">
                    <TableCell className="font-medium max-md:block max-md:p-0">Total</TableCell>
                    <TableCell className="max-md:hidden" />
                    <TableCell
                      className="text-right font-mono tabular-nums text-fg max-md:block max-md:p-0"
                      data-testid={`total-${b.clase}`}
                    >
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell className="max-md:hidden" />
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
          <ul className="space-y-1 text-caption text-fg-muted">
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
