'use client';

/**
 * El giro que el banco devolvió, dentro del lote donde salió.
 *
 * ── Por qué vive acá y no en una pantalla propia ────────────────────────────
 *
 * Una devolución se entera mirando el extracto contra el lote que se mandó al
 * banco: «de los 214 pagos, éste rebotó». La persona ya está en el detalle del
 * lote, con el titular, la cuenta y el valor delante. Una pantalla aparte
 * obligaría a buscar dos veces el mismo giro.
 *
 * ── La regla, con las palabras de Nico (17-09) ──────────────────────────────
 *
 * «Giro devuelto por el banco: se marca devuelto con motivo, la plata vuelve a
 * estar por girar, se avisa al propietario para que corrija la cuenta (con el
 * control de cambio de cuenta) y queda en la bitácora; si no se gira otra vez
 * ese mismo día, se le cambia la fecha del egreso a la del nuevo giro.»
 *
 * Las dos consecuencias se muestran TAL CUAL las devuelve el back y no se
 * reescriben acá: `queHacer.bitacora` (lo que queda escrito en el contrato) y
 * `egreso.motivo` (por qué la fecha del egreso quedó donde quedó). Son las dos
 * frases que un contador va a leer para entender qué pasó con la plata.
 *
 * ── 🔴 Lo que esta pieza NO sabe, y hay que resolver con Nico ───────────────
 *
 * `POST /giros-devueltos/:id/regirar` pide `dispersionNuevaId`: la dispersión
 * con la que la plata SÍ salió. El contrato no dice de dónde la saca el front,
 * y no hay endpoint que liste las dispersiones vivas de un propietario. Acá se
 * manda la MISMA dispersión del giro devuelto —que es lo que pasa en el caso
 * normal: la plata volvió a estar por girar sobre esa misma dispersión y entra
 * a un lote nuevo—, y la pantalla lo dice en voz alta en vez de esconderlo
 * detrás de un id. Si el back necesita otra, hace falta un selector y un
 * endpoint que lo alimente.
 *
 * ── Falla ABIERTO ──────────────────────────────────────────────────────────
 *
 * Si la lectura de giros devueltos falla o llega `disponible: false` (falta la
 * migración), el detalle del lote sigue funcionando entero: simplemente no se
 * ofrece marcar devuelto. Un lote de cientos de millones no se puede quedar sin
 * pantalla porque una pieza nueva todavía no está en la base.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUUpLeft, WarningCircle } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/components/ui/toast';
import { codigoSinMigrar, finanzasApi } from '@/lib/api/finanzas.service';
import {
  MOTIVOS_DE_DEVOLUCION,
  type DevolucionRegistrada,
  type GiroDevuelto,
  type MotivoDeDevolucion,
  type Regiro,
} from '@/lib/api/finanzas.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';

/** El fallo en palabras y, si es el 503 de la migración, quién la aplica. */
export function explicarGiro(error: unknown, porDefecto: string): string {
  const mensaje = mensajeDelFallo(error, porDefecto);
  return codigoSinMigrar(error) ? `${mensaje} (nuestro equipo la está habilitando)` : mensaje;
}

/** `YYYY-MM-DD` de hoy EN BOGOTÁ, no en el huso del navegador. */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** ¿Este giro sigue vivo (devuelto y sin regirar)? */
export function estaSinResolver(giro: GiroDevuelto): boolean {
  return !giro.dispersionNuevaId && !giro.fechaDelNuevoGiro && !giro.resueltoAt;
}

export interface GirosDelLote {
  /** Por `dispersionId`. Vacío mientras carga, o si no se pudo leer. */
  porDispersion: Map<string, GiroDevuelto>;
  /** `false` = falta la migración: no se ofrece marcar devuelto. */
  disponible: boolean;
  motivo: string | null;
  recargar: () => Promise<void>;
}

/**
 * Los giros devueltos de la agencia, indexados por dispersión.
 *
 * Se piden TODOS (no sólo los vivos) para poder decir «se volvió a girar el
 * 18» en una fila ya resuelta: un lote es la foto de lo que pasó, no sólo de
 * lo que falta.
 */
export function useGirosDevueltos(activo: boolean): GirosDelLote {
  const [giros, setGiros] = useState<GiroDevuelto[]>([]);
  const [disponible, setDisponible] = useState(true);
  const [motivo, setMotivo] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!activo) return;
    try {
      const r = await finanzasApi.girosDevueltos('TODOS');
      setGiros(r.giros ?? []);
      setDisponible(r.disponible !== false);
      setMotivo(r.motivo ?? null);
    } catch {
      // Falla abierto: el lote se sigue viendo entero, sin la columna.
      setGiros([]);
      setDisponible(false);
      setMotivo(null);
    }
  }, [activo]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const porDispersion = useMemo(() => {
    const mapa = new Map<string, GiroDevuelto>();
    for (const giro of giros) mapa.set(giro.dispersionId, giro);
    return mapa;
  }, [giros]);

  return { porDispersion, disponible, motivo, recargar };
}

// ══ La celda de la fila ═════════════════════════════════════════════════════

export function AccionesDelGiro({
  dispersionId,
  nombreTitular,
  valorCop,
  giro,
  puedeEditar,
  disponible,
  onDevolver,
  onRegirar,
}: {
  dispersionId: string;
  nombreTitular: string;
  valorCop: number;
  giro: GiroDevuelto | undefined;
  puedeEditar: boolean;
  disponible: boolean;
  onDevolver: () => void;
  onRegirar: () => void;
}) {
  if (giro && !estaSinResolver(giro)) {
    return (
      <span className="text-xs text-fg-muted" data-testid={`regirado-${dispersionId}`}>
        Se volvió a girar{giro.fechaDelNuevoGiro ? ` el ${giro.fechaDelNuevoGiro}` : ''}.
      </span>
    );
  }

  if (giro) {
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid={`devuelto-${dispersionId}`}>
        <Badge variant="warning">Devuelto</Badge>
        {giro.tieneSoporte ? <VerSoporte giroId={giro.id} /> : null}
        {puedeEditar ? (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            data-testid={`regirar-${dispersionId}`}
            onClick={onRegirar}
          >
            <ArrowUUpLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Volver a girar
          </Button>
        ) : null}
      </div>
    );
  }

  if (!puedeEditar || !disponible) return <span className="text-xs text-fg-subtle">—</span>;

  return (
    <Button
      variant="ghost"
      size="sm"
      hideArrow
      data-testid={`marcar-devuelto-${dispersionId}`}
      aria-label={`Marcar devuelto el giro de ${nombreTitular} por ${formatCurrency(valorCop)}`}
      onClick={onDevolver}
    >
      Marcar devuelto
    </Button>
  );
}

// ══ Marcar devuelto ═════════════════════════════════════════════════════════

/** «Ver soporte»: abre la URL firmada del extracto o comprobante del banco. */
function VerSoporte({ giroId }: { giroId: string }) {
  const { t } = useI18n();
  const [abriendo, setAbriendo] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      hideArrow
      isLoading={abriendo}
      data-testid={`ver-soporte-${giroId}`}
      onClick={async () => {
        setAbriendo(true);
        try {
          const { url } = await finanzasApi.soporteDelGiroDevuelto(giroId);
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
          toast.error(explicarGiro(e, t('inmobiliaria.dispersiones.giroDevuelto.soporteNoAbre')));
        } finally {
          setAbriendo(false);
        }
      }}
    >
      {t('inmobiliaria.dispersiones.giroDevuelto.verSoporte')}
    </Button>
  );
}

export function MarcarDevueltoDialog({
  abierto,
  dispersionId,
  nombreTitular,
  valorCop,
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  dispersionId: string | null;
  nombreTitular: string;
  valorCop: number;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const { t } = useI18n();
  const [motivo, setMotivo] = useState<MotivoDeDevolucion>('CUENTA_ERRADA');
  const [detalle, setDetalle] = useState('');
  const [codigo, setCodigo] = useState('');
  const [fecha, setFecha] = useState(() => hoyEnBogota());
  /*
   * 🔴 El soporte del banco es OBLIGATORIO (Nico, 23-09-2026): una devolución
   * vuelve a pagarle al propietario, y sin el papel del banco no se registra.
   */
  const [soporte, setSoporte] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<DevolucionRegistrada | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setMotivo('CUENTA_ERRADA');
    setDetalle('');
    setCodigo('');
    setFecha(hoyEnBogota());
    setSoporte(null);
    setResultado(null);
  }, [abierto]);

  async function marcar() {
    if (!dispersionId || !soporte) return;
    setEnviando(true);
    try {
      setResultado(
        await finanzasApi.marcarDevuelto({
          dispersionId,
          motivo,
          motivoDetalle: detalle.trim() || undefined,
          codigoDelBanco: codigo.trim() || undefined,
          fechaDeLaDevolucion: fecha,
          soporte,
        }),
      );
      onListo();
    } catch (e) {
      toast.error('No se pudo marcar el giro como devuelto.', {
        description: explicarGiro(e, 'No se pudo marcar el giro como devuelto.'),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg" data-testid="dialogo-marcar-devuelto">
        <DialogHeader>
          <DialogTitle>Marcar el giro como devuelto</DialogTitle>
          <DialogDescription>
            {nombreTitular} · {formatCurrency(valorCop)}. La plata vuelve a estar por girar: el
            propietario no la recibió.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-3 text-sm" data-testid="resultado-de-la-devolucion">
            <p className="rounded-md bg-surface-muted px-4 py-3 text-fg" data-testid="texto-de-la-bitacora">
              {resultado.queHacer.bitacora}
            </p>
            <ul className="space-y-1 text-fg-muted">
              {resultado.queHacer.vuelveAEstarPorGirar ? (
                <li>· La plata volvió a estar por girar.</li>
              ) : null}
              {resultado.queHacer.avisarAlPropietario ? (
                <li>· Hay que avisarle al propietario: es su plata y no le llegó.</li>
              ) : null}
              {resultado.queHacer.exigirCambioDeCuenta ? (
                <li data-testid="exige-cambio-de-cuenta">
                  · El siguiente giro queda RETENIDO hasta que un administrador apruebe el cambio de
                  cuenta bancaria (certificación + confirmación del dueño).
                </li>
              ) : null}
              {resultado.queHacer.dejarEnBitacora ? (
                <li>· Quedó escrito en la bitácora del contrato.</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-devolucion">Motivo del banco</Label>
              <select
                id="motivo-devolucion"
                data-testid="motivo-de-la-devolucion"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoDeDevolucion)}
              >
                {MOTIVOS_DE_DEVOLUCION.map((m) => (
                  <option key={m.motivo} value={m.motivo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              {MOTIVOS_DE_DEVOLUCION.find((m) => m.motivo === motivo)?.exigeCorregirCuenta ? (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Con este motivo se le va a exigir al propietario corregir su cuenta antes del
                  siguiente giro.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-devolucion">Fecha de la devolución</Label>
              <Input
                id="fecha-devolucion"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <p className="text-xs text-fg-muted">
                La del extracto, no la de hoy: de ella depende la fecha del egreso.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soporte-devolucion">{t('inmobiliaria.dispersiones.giroDevuelto.soporte')}</Label>
              <Input
                id="soporte-devolucion"
                data-testid="soporte-de-la-devolucion"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
              />
              <p className="text-sm text-fg-muted">
                {t('inmobiliaria.dispersiones.giroDevuelto.soporteAyuda')}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="codigo-del-banco">Código del banco</Label>
              <Input
                id="codigo-del-banco"
                className="font-mono"
                placeholder="R04"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalle-devolucion">Detalle</Label>
              <Input
                id="detalle-devolucion"
                placeholder="Lo que dice el extracto, tal cual"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {resultado ? (
            <Button hideArrow onClick={onCerrar}>
              Listo
            </Button>
          ) : (
            <>
              <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                hideArrow
                onClick={() => void marcar()}
                isLoading={enviando}
                disabled={!soporte}
                title={soporte ? undefined : t('inmobiliaria.dispersiones.giroDevuelto.faltaSoporte')}
                data-testid="confirmar-devuelto"
              >
                Marcar devuelto
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ Volver a girar ══════════════════════════════════════════════════════════

export function RegirarDialog({
  abierto,
  giro,
  nombreTitular,
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  giro: GiroDevuelto | null;
  nombreTitular: string;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [fecha, setFecha] = useState(() => hoyEnBogota());
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Regiro | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setFecha(hoyEnBogota());
    setResultado(null);
  }, [abierto]);

  async function regirar() {
    if (!giro) return;
    setEnviando(true);
    try {
      /*
       * 🔴 La dispersión con la que la plata SÍ salió. Ver el encabezado: sin
       * un endpoint que liste las dispersiones vivas del propietario, se manda
       * la misma sobre la que la plata volvió a estar por girar.
       */
      setResultado(
        await finanzasApi.regirar(giro.id, giro.dispersionNuevaId ?? giro.dispersionId, fecha),
      );
      onListo();
    } catch (e) {
      toast.error('No se pudo registrar el nuevo giro.', {
        description: explicarGiro(e, 'No se pudo registrar el nuevo giro.'),
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg" data-testid="dialogo-regirar">
        <DialogHeader>
          <DialogTitle>Volver a girar</DialogTitle>
          <DialogDescription>
            {nombreTitular}. La fecha decide dónde queda el egreso: si el giro sale el MISMO día de
            la devolución, el egreso conserva su fecha; si sale otro día, se re-fecha.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-2 text-sm" data-testid="resultado-del-regiro">
            <p className="rounded-md bg-surface-muted px-4 py-3 text-fg" data-testid="motivo-del-egreso">
              {resultado.egreso.motivo}
            </p>
            <p className="text-fg-muted">
              {resultado.egreso.seReFecho
                ? `El egreso quedó con fecha ${resultado.egreso.fecha}.`
                : 'El egreso conservó su fecha original.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha-del-nuevo-giro">Fecha del nuevo giro</Label>
              <Input
                id="fecha-del-nuevo-giro"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <p className="text-xs text-fg-muted">
                El giro se devolvió el {giro?.fechaDeLaDevolucion ?? '—'}.
              </p>
            </div>
            <p className="rounded-md border border-border px-4 py-3 text-xs text-fg-muted">
              Se registra sobre la misma dispersión del propietario, que es la que volvió a estar
              por girar. Si la plata salió en otra, avísale a quien lleva finanzas: todavía no hay
              forma de elegirla acá.
            </p>
          </div>
        )}

        <DialogFooter>
          {resultado ? (
            <Button hideArrow onClick={onCerrar}>
              Listo
            </Button>
          ) : (
            <>
              <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button hideArrow onClick={() => void regirar()} isLoading={enviando}>
                Registrar el giro
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
