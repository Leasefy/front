'use client';

/**
 * 🔴 El retiro de la administración con contrato vigente (17-09).
 *
 * Nico: «El propietario retira la administración con inquilino vigente: no deja
 * terminar el mandato sin escoger: (a) la inmobiliaria sigue hasta el fin del
 * contrato, o (b) corte a una fecha: liquidación final al propietario, las
 * cuotas posteriores salen de la cartera de la inmobiliaria y se avisa al
 * inquilino a quién pagar.»
 *
 * El diálogo reemplaza al «¿Terminar consignación?» de siempre cuando el
 * inmueble tiene un contrato vigente. Con corte, ANTES de confirmar muestra lo
 * que el back va a hacer (qué cuotas salen, cuáles no se tocan y por qué, y la
 * liquidación final), calculado por el back con la misma regla con la que lo
 * hace. El aviso al inquilino se GENERA y se revisa acá; nunca se envía solo.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowSquareOut, DownloadSimple, FileText, SignOut, WarningCircle } from '@phosphor-icons/react';

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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  mandatoApi,
  type EstadoDelRetiro,
  type LiquidacionFinal,
  type ModoDeRetiro,
  type PrevisualizacionDelCorte,
} from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { PESOS, diaLegible, mesLegible } from '@/lib/mandato/textos';

function hoy(): string {
  const f = new Date();
  const bogota = new Date(f.getTime() - 5 * 3_600_000);
  return bogota.toISOString().slice(0, 10);
}

export function RetiroDeLaAdministracionDialog({
  consignacionId,
  titulo,
  abierto,
  onCerrar,
  onRetirado,
}: {
  consignacionId: string;
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  onRetirado: (estado: EstadoDelRetiro) => void;
}) {
  const [estado, setEstado] = useState<EstadoDelRetiro | null>(null);
  const [modo, setModo] = useState<ModoDeRetiro | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [motivo, setMotivo] = useState('');
  const [previa, setPrevia] = useState<PrevisualizacionDelCorte | null>(null);
  const [errorDePrevia, setErrorDePrevia] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    mandatoApi
      .estadoDelRetiro(consignacionId)
      .then(setEstado)
      .catch((e) => setError(mensajeDelFallo(e, 'No se pudo leer el contrato vigente.')));
  }, [abierto, consignacionId]);

  const pedirPrevia = useCallback(
    async (f: string) => {
      if (!f) return;
      try {
        setPrevia(await mandatoApi.previsualizarRetiro(consignacionId, f));
        setErrorDePrevia(null);
      } catch (e) {
        setPrevia(null);
        setErrorDePrevia(mensajeDelFallo(e, 'No se pudo calcular el corte.'));
      }
    },
    [consignacionId],
  );

  useEffect(() => {
    if (abierto && modo === 'CORTE') void pedirPrevia(fecha);
  }, [abierto, modo, fecha, pedirPrevia]);

  const puedeConfirmar =
    !guardando && !!estado?.disponible && !!modo && (modo === 'HASTA_FIN_DEL_CONTRATO' || (!!fecha && !!previa));

  async function confirmar() {
    if (!modo) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await mandatoApi.registrarRetiro(consignacionId, {
        modo,
        ...(modo === 'CORTE' ? { fechaDeCorte: fecha } : {}),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      toast.success('Consignación terminada.', {
        description:
          modo === 'CORTE'
            ? `Corte al ${diaLegible(fecha)}. El aviso al inquilino quedó generado, sin enviar: revísalo en la ficha.`
            : 'La inmobiliaria sigue administrando el contrato vigente hasta su fin.',
      });
      onRetirado(r);
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo registrar el retiro.'));
    } finally {
      setGuardando(false);
    }
  }

  const vigente = estado?.contratoVigente ?? null;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !guardando && onCerrar()}>
      <DialogContent className="sm:max-w-2xl" data-testid="retiro-de-la-administracion">
        <DialogHeader>
          <DialogTitle>El propietario retira la administración</DialogTitle>
          <DialogDescription>
            «{titulo}» tiene un contrato vigente
            {vigente?.tenantName ? ` con ${vigente.tenantName}` : ''}
            {vigente?.endDate ? ` hasta el ${diaLegible(vigente.endDate)}` : ''}. Antes de terminar la
            consignación escoge qué pasa con ese contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1" data-lenis-prevent>
          {estado && !estado.disponible && estado.motivo ? (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning flex gap-2">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{estado.motivo}</span>
            </div>
          ) : null}

          <fieldset className="space-y-2" disabled={!estado?.disponible}>
            <legend className="sr-only">Qué pasa con el contrato vigente</legend>
            <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-surface-hover">
              <input
                type="radio"
                name="modo-de-retiro"
                checked={modo === 'HASTA_FIN_DEL_CONTRATO'}
                onChange={() => setModo('HASTA_FIN_DEL_CONTRATO')}
                className="mt-1"
                data-testid="retiro-hasta-fin"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  La inmobiliaria sigue hasta el fin del contrato
                </span>
                <span className="block text-xs text-muted-foreground">
                  El contrato sigue su curso con la inmobiliaria: se cobra, se liquida y se gira como
                  hoy hasta que termine.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-surface-hover">
              <input
                type="radio"
                name="modo-de-retiro"
                checked={modo === 'CORTE'}
                onChange={() => setModo('CORTE')}
                className="mt-1"
                data-testid="retiro-corte"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Corte a una fecha</span>
                <span className="block text-xs text-muted-foreground">
                  Liquidación final al propietario; las cuotas posteriores de los dos lados salen de la
                  cartera de la inmobiliaria y se genera el aviso al inquilino de a quién pagar.
                </span>
              </span>
            </label>
          </fieldset>

          {modo === 'CORTE' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fecha-de-corte">Último día que administra la inmobiliaria</Label>
                <Input
                  id="fecha-de-corte"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  data-testid="fecha-de-corte"
                />
              </div>
              {errorDePrevia ? (
                <p className="text-sm text-danger" role="alert">
                  {errorDePrevia}
                </p>
              ) : previa ? (
                <VistaDelCorte previa={previa} />
              ) : null}
            </div>
          ) : null}

          {modo ? (
            <div className="space-y-1.5">
              <Label htmlFor="motivo-del-retiro">Motivo (opcional)</Label>
              <Textarea
                id="motivo-del-retiro"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="El propietario vendió el inmueble."
                rows={2}
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-danger" role="alert" data-testid="retiro-error">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={!puedeConfirmar}
            isLoading={guardando}
            data-testid="confirmar-retiro"
          >
            Terminar la consignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VistaDelCorte({ previa }: { previa: PrevisualizacionDelCorte }) {
  const porLado = (lado: 'INQUILINO' | 'PROPIETARIO') =>
    previa.cuotasQueSalen.filter((c) => c.lado === lado);
  const delInquilino = porLado('INQUILINO');
  const delPropietario = porLado('PROPIETARIO');
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-muted p-3" data-testid="vista-del-corte">
      <p className="text-sm text-foreground">
        Salen de la cartera <strong>{delInquilino.length}</strong> cuotas del inquilino (
        <span className="font-mono">{PESOS.format(previa.liquidacionFinal.anuladoInquilinoCop)}</span>) y{' '}
        <strong>{delPropietario.length}</strong> del propietario (
        <span className="font-mono">{PESOS.format(previa.liquidacionFinal.anuladoPropietarioCop)}</span>),
        desde {delInquilino[0] ? mesLegible(delInquilino[0].mes) : 'el mes siguiente'}.
      </p>
      {previa.cuotasQueNoSeTocan.length > 0 ? (
        <div className="text-xs text-warning">
          <p className="font-medium">No se tocan, aunque son posteriores al corte:</p>
          <ul className="list-disc pl-4">
            {previa.cuotasQueNoSeTocan.map((c) => (
              <li key={c.id}>
                {c.lado === 'INQUILINO' ? 'Inquilino' : 'Propietario'} · {mesLegible(c.mes)}: {c.porque}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <LiquidacionFinalResumen final={previa.liquidacionFinal} />
    </div>
  );
}

export function LiquidacionFinalResumen({ final }: { final: LiquidacionFinal }) {
  const deducciones = final.deducciones.pendienteCop + final.deducciones.enLiquidacionCop;
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="liquidacion-final">
      <dt className="text-muted-foreground">Por girarle al propietario hasta el corte</dt>
      <dd className="text-right font-mono">{PESOS.format(final.porGirarCop)}</dd>
      <dt className="text-muted-foreground">Sus deducciones vivas</dt>
      <dd className="text-right font-mono">({PESOS.format(deducciones)})</dd>
      <dt className="text-foreground font-medium">
        {final.netoEstimadoCop >= 0 ? 'Neto estimado a girarle' : 'Le quedaría debiendo a la inmobiliaria'}
      </dt>
      <dd className="text-right font-mono font-medium">{PESOS.format(Math.abs(final.netoEstimadoCop))}</dd>
      <dt className="text-muted-foreground">Lo que el inquilino todavía debe hasta el corte</dt>
      <dd className="text-right font-mono">{PESOS.format(final.carteraDelInquilinoCop)}</dd>
    </dl>
  );
}

/**
 * La tarjeta del retiro ya registrado, en la ficha del inmueble: qué se escogió,
 * la liquidación final guardada y el aviso al inquilino para revisarlo y
 * descargarlo (no se envía desde acá).
 */
export function RetiroRegistrado({ consignacionId }: { consignacionId: string }) {
  const [estado, setEstado] = useState<EstadoDelRetiro | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    mandatoApi
      .estadoDelRetiro(consignacionId)
      .then(setEstado)
      .catch(() => setEstado(null));
  }, [consignacionId]);

  const retiro = estado?.retiro;
  if (!retiro) return null;

  async function verAviso() {
    try {
      setAviso((await mandatoApi.avisoDelRetiro(consignacionId)).html);
    } catch (e) {
      toast.error('No se pudo abrir el aviso.', { description: mensajeDelFallo(e, '') });
    }
  }

  async function descargar() {
    try {
      const blob = await mandatoApi.avisoDelRetiroEnPdf(consignacionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aviso-al-inquilino.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('No se pudo descargar el aviso.', { description: mensajeDelFallo(e, '') });
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="retiro-registrado">
      <div className="flex items-center gap-2">
        <SignOut className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Retiro de la administración</h3>
      </div>
      <p className="text-sm text-foreground">
        {retiro.modo === 'CORTE'
          ? `Con corte al ${diaLegible(retiro.fechaDeCorte)}: ${retiro.cuotasAnuladas.length} cuotas posteriores salieron de la cartera.`
          : `La inmobiliaria sigue administrando el contrato hasta su fin${retiro.fechaDeCorte ? ` (${diaLegible(retiro.fechaDeCorte)})` : ''}.`}
      </p>
      {retiro.motivo ? <p className="text-xs text-muted-foreground">Motivo: {retiro.motivo}</p> : null}
      {retiro.cuotasSinAnular.length > 0 ? (
        <p className="text-xs text-warning">
          {retiro.cuotasSinAnular.length} cuotas posteriores no se tocaron (tenían plata, cobro o eran del
          sistema anterior).
        </p>
      ) : null}
      {retiro.liquidacionFinal ? <LiquidacionFinalResumen final={retiro.liquidacionFinal} /> : null}
      {retiro.tieneAviso ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" hideArrow onClick={verAviso}>
            <FileText className="w-4 h-4 mr-1" aria-hidden="true" />
            Ver el aviso al inquilino
          </Button>
          <Button variant="ghost" size="sm" hideArrow onClick={descargar}>
            <DownloadSimple className="w-4 h-4 mr-1" aria-hidden="true" />
            Descargar PDF
          </Button>
          <span className="text-xs text-muted-foreground self-center">Generado, sin enviar.</span>
        </div>
      ) : null}

      {aviso !== null ? (
        <Dialog open onOpenChange={(v) => !v && setAviso(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aviso al inquilino</DialogTitle>
              <DialogDescription>
                Revísalo y envíalo tú: la plataforma no lo manda sola.
              </DialogDescription>
            </DialogHeader>
            <iframe
              title="Aviso al inquilino"
              srcDoc={aviso}
              sandbox=""
              className="w-full h-[60vh] rounded-md border border-border bg-white"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAviso(null)}>
                Cerrar
              </Button>
              <Button onClick={descargar} hideArrow>
                <ArrowSquareOut className="w-4 h-4 mr-1" aria-hidden="true" />
                Descargar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
