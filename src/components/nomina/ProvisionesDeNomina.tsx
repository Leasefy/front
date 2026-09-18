'use client';

/**
 * LAS PRESTACIONES SOCIALES: la provisión mensual y el cruce al pagarlas.
 *
 * ── 🔴 Lo que esta pantalla pone a la vista, y por qué ──────────────────────
 *
 * En una contabilidad hecha a mano, «provisión de prestaciones» es el saldo que
 * nadie puede explicar dos años después: se provisiona todos los meses, se paga
 * la prima en junio, y la diferencia se queda adentro.
 *
 * Acá cada prestación muestra TRES números —lo provisionado, lo cruzado y lo que
 * queda vivo— y al registrar un pago la diferencia sale escrita: si sobró, el
 * exceso se reversa; si faltó, entra como gasto del mes del pago. Eso es lo que
 * hace que el pasivo se pueda auditar fila por fila.
 *
 * ── Y las cuatro bases, que NO son la misma ────────────────────────────────
 *
 * Prima, cesantías e intereses llevan auxilio de transporte y horas extras;
 * **vacaciones no lleva ninguno de los dos** (CST art. 192). Está escrito en la
 * pantalla porque es el error que se comete al liquidar a mano.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { nominaApi } from '@/lib/api/nomina.service';
import type { Provisiones } from '@/lib/api/nomina.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, Cifra, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const TIPOS = [
  { tipo: 'PRIMA', nombre: 'Prima de servicios' },
  { tipo: 'CESANTIAS', nombre: 'Cesantías' },
  { tipo: 'INTERESES_CESANTIAS', nombre: 'Intereses sobre cesantías' },
  { tipo: 'VACACIONES', nombre: 'Vacaciones' },
] as const;

export function ProvisionesDeNominaPanel() {
  const estado = useCargaDeNomina<{
    provisiones: Provisiones;
    catalogo: Awaited<ReturnType<typeof nominaApi.catalogoDeProvisiones>>;
  }>(async () => {
    const [p, c] = await Promise.all([
      nominaApi.provisiones(),
      nominaApi.catalogoDeProvisiones(),
    ]);
    return { provisiones: p, catalogo: c };
  }, []);

  const [pagando, setPagando] = useState(false);
  const [cruce, setCruce] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {cruce ? <Avisos avisos={[cruce]} tono="info" testId="cruce-del-pago" /> : null}

      <Cargado
        estado={estado}
        queEs="las provisiones de prestaciones"
        queSeEspera="ver las provisiones de prestaciones"
      >
        {({ provisiones, catalogo }) => (
          <>
            <section className="space-y-3">
              <TituloDeBloque
                titulo="El pasivo por prestaciones"
                explicacion="Lo que se ha provisionado, lo que ya se cruzó contra un pago y lo que queda vivo. La provisión viva de la inmobiliaria es la suma de lo que todavía le debe a su gente."
                accion={
                  <Button
                    onClick={() => setPagando(true)}
                    data-testid="registrar-pago"
                  >
                    Registrar el pago de una prestación
                  </Button>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {TIPOS.map((t) => {
                  const fila = provisiones.porTipo.find((x) => x.tipo === t.tipo);
                  return (
                    <Cifra
                      key={t.tipo}
                      id={t.tipo.toLowerCase()}
                      etiqueta={t.nombre}
                      valor={fila?.vivoCop ?? null}
                      definicion={
                        fila
                          ? `Provisionado ${formatCurrency(fila.provisionadoCop)}, cruzado ${formatCurrency(fila.cruzadoCop)}. Lo que queda es lo que todavía se le debe a la gente.`
                          : 'Sin provisiones de esta prestación.'
                      }
                      sinMedir="Todavía no se ha provisionado nada de esta prestación."
                    />
                  );
                })}
              </div>
              <p
                className="rounded-lg border border-border bg-surface p-3 text-xs text-fg-muted"
                data-testid="total-vivo"
              >
                Total del pasivo vivo:{' '}
                <strong>{formatCurrency(provisiones.totalVivoCop)}</strong>
              </p>
            </section>

            <section className="space-y-3">
              <TituloDeBloque
                titulo="Con qué base se provisiona cada una"
                explicacion="Las cuatro bases NO son la misma, y es acá donde una liquidación hecha a mano se equivoca."
              />
              <div className="overflow-x-auto">
                <Table data-testid="bases-de-prestaciones">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prestación</TableHead>
                      <TableHead>Auxilio de transporte</TableHead>
                      <TableHead>Horas extras</TableHead>
                      <TableHead>Con salario integral</TableHead>
                      <TableHead>Norma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogo.tipos.map((t) => (
                      <TableRow key={t.tipo} data-testid={`base-${t.tipo}`}>
                        <TableCell className="font-medium text-fg">
                          {t.nombre}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.incluyeAuxilio ? 'Entra' : 'NO entra'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.incluyeHorasExtras ? 'Entran' : 'NO entran'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.seCausaConSalarioIntegral
                            ? 'Se causa'
                            : 'No se causa (el factor del 30 % ya la paga)'}
                        </TableCell>
                        <TableCell className="max-w-md text-xs leading-relaxed text-fg-muted">
                          {t.fuente}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="space-y-3">
              <TituloDeBloque
                titulo="Por persona"
                explicacion="Lo que se le debe a cada uno, por prestación."
              />
              {provisiones.porPersona.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted">
                  Todavía no hay provisiones: se escriben al APROBAR un período.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="provisiones-por-persona">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        {TIPOS.map((t) => (
                          <TableHead key={t.tipo} className="text-right">
                            {t.nombre}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total vivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provisiones.porPersona.map((p) => (
                        <TableRow key={p.personaId} data-testid={`prov-${p.personaId}`}>
                          <TableCell>
                            <span className="font-medium text-fg">{p.nombre}</span>
                            {p.documento ? (
                              <span className="ml-1.5 text-xs text-fg-muted">
                                {p.documento}
                              </span>
                            ) : null}
                          </TableCell>
                          {TIPOS.map((t) => (
                            <TableCell
                              key={t.tipo}
                              className="text-right font-mono tabular-nums"
                            >
                              {formatCurrency(p.porTipo[t.tipo] ?? 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {formatCurrency(p.vivoCop)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <PagoDePrestacion
              abierto={pagando}
              personas={provisiones.porPersona}
              onCerrar={() => setPagando(false)}
              onRegistrado={async (explicacion, aviso) => {
                setPagando(false);
                setCruce([explicacion, aviso].filter(Boolean).join(' '));
                await estado.recargar();
              }}
            />
          </>
        )}
      </Cargado>
    </div>
  );
}

function PagoDePrestacion({
  abierto,
  personas,
  onCerrar,
  onRegistrado,
}: {
  abierto: boolean;
  personas: Provisiones['porPersona'];
  onCerrar: () => void;
  onRegistrado: (explicacion: string, aviso: string | null) => Promise<void>;
}) {
  const [personaId, setPersonaId] = useState('');
  const [tipo, setTipo] = useState<string>('PRIMA');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [valor, setValor] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [guardando, setGuardando] = useState(false);

  const registrar = async () => {
    setGuardando(true);
    try {
      const r = await nominaApi.registrarPagoDePrestacion({
        personaId,
        tipo,
        desde,
        hasta,
        valorCop: Number(valor),
        fechaPago,
      });
      toast.success('Pago registrado y cruzado contra la provisión.');
      await onRegistrado(r.cruce.explicacion, r.aviso);
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo registrar el pago.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent data-testid="dialogo-de-pago">
        <DialogHeader>
          <DialogTitle>Registrar el pago de una prestación</DialogTitle>
          <DialogDescription>
            Se consume la provisión del período, de la más vieja a la más nueva, y
            la diferencia queda escrita: si sobró provisión se reversa el exceso; si
            faltó, entra como gasto del mes del pago. La diferencia no se esconde en
            el pasivo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="persona-del-pago">Persona</Label>
            <select
              id="persona-del-pago"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              data-testid="campo-persona"
            >
              <option value="">Elige a quién le pagas</option>
              {personas.map((p) => (
                <option key={p.personaId} value={p.personaId}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo-del-pago">Prestación</Label>
            <select
              id="tipo-del-pago"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              data-testid="campo-tipo-prestacion"
            >
              {TIPOS.map((t) => (
                <option key={t.tipo} value={t.tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valor-del-pago">Valor pagado</Label>
            <Input
              id="valor-del-pago"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              data-testid="campo-valor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desde-del-pago">Período causado, desde</Label>
            <Input
              id="desde-del-pago"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              data-testid="campo-desde"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hasta-del-pago">hasta</Label>
            <Input
              id="hasta-del-pago"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              data-testid="campo-hasta"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha-del-pago">Fecha de pago</Label>
            <Input
              id="fecha-del-pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              data-testid="campo-fecha-pago"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={() => void registrar()}
            disabled={
              guardando || !personaId || !desde || !hasta || !valor || !fechaPago
            }
            data-testid="guardar-pago"
          >
            Registrar el pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
