'use client';

/**
 * 🔴 CERRAR EL ACTA DESDE EL PRODUCTO (ARREGLOS-3, 03-10-2026; Nico, la
 * recomendada «a» de PRUEBAS-PAGOS): «acta → fotos → firmas → cerrar → cuota de
 * cierre en el estado de cuenta».
 *
 * Hasta hoy no había por dónde: ni una pantalla para las FOTOS POR ESPACIO
 * (obligatorias, I-03), ni una firma del panel, ni un camino para el inquilino.
 * El acta de devolución sólo se cerraba con testigo. Aquí viven las tres piezas,
 * en el cajón del acta:
 *
 *   · las FOTOS por espacio: los espacios del inventario del acta (y los que se
 *     escriban a mano), cada uno con sus fotos (JPG, PNG o WebP, hasta 5 MB) que
 *     van al almacenamiento privado; se ven con una URL firmada de una hora;
 *   · la firma del ASESOR, DIBUJADA (como la del acuerdo de pago);
 *   · la firma del INQUILINO por ENLACE: se le manda a su correo (y se puede
 *     copiar para mandarlo por otro medio); el código para firmar le llega SÓLO a
 *     su correo, así que el enlace reenviado a otra persona no le sirve.
 *
 * Con las dos firmas y las fotos el back CIERRA el acta y, en una devolución con
 * descuentos de más, crea el cargo aparte (la cuota de cierre): el aviso dice
 * qué pasó con él.
 *
 * 🔴 Con la firma del inquilino puesta, las fotos ya no cambian (su firma dice
 * que el inmueble estaba como lo muestran ESAS fotos): se ven, sin borrar ni
 * subir.
 *
 * Movimiento: lo que aparece y desaparece entra con `Presence` (tokens de
 * Cadence), las fotos con `Stagger`; con movimiento reducido, en su lugar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle, LinkSimple, Signature, Trash, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { CopyButton, IconButton, Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { SignaturePad } from '@/components/contract/SignaturePad';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cargoAparteDelCierre, elCargoEntro } from '@/lib/actas/acta-del-back';
import {
  espaciosParaLasFotos,
  firmaDelActaApi,
  fraseDelEnvio,
  problemaDeLaFoto,
  problemaDelEspacio,
  type ActaConSusArchivos,
  type EnlaceDelInquilinoEnviado,
  type FirmaVisibleDelActa,
} from '@/lib/api/firma-del-acta.service';
import type { ActaEntrega, RoomType } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

/** El nombre de cada espacio del inventario, como lo lee el inquilino. */
export const NOMBRE_DEL_ESPACIO: Record<RoomType, string> = {
  sala: 'Sala',
  comedor: 'Comedor',
  cocina: 'Cocina',
  habitacion_principal: 'Habitación principal',
  habitacion_2: 'Habitación 2',
  habitacion_3: 'Habitación 3',
  bano_principal: 'Baño principal',
  bano_2: 'Baño 2',
  estudio: 'Estudio',
  balcon: 'Balcón',
  terraza: 'Terraza',
  garaje: 'Garaje',
  cuarto_util: 'Cuarto útil',
  otro: 'Otro espacio',
};

/** «3 oct. 2026, 10:42 a. m.» en la hora de Colombia. */
function cuando(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

function firmaDe(firmas: readonly FirmaVisibleDelActa[], papel: string): FirmaVisibleDelActa | null {
  return firmas.find((f) => f.papel.toUpperCase() === papel) ?? null;
}

interface Props {
  acta: Pick<ActaEntrega, 'id' | 'rooms' | 'type'>;
  /** El acta cambió (una firma, o se cerró): quien la muestra vuelve a leerla. */
  onCambio?: () => void;
}

export function FotosYFirmasDelActa({ acta, onCambio }: Props) {
  const permisos = usePermissionsContextSafe();
  const puedeEditar = permisos ? permisos.canAccess('contratos', 'edit') : false;

  const [detalle, setDetalle] = useState<ActaConSusArchivos | null>(null);
  const [error, setError] = useState<unknown>(null);
  const vigente = useRef(0);

  const leer = useCallback(async () => {
    const esta = ++vigente.current;
    try {
      const d = await firmaDelActaApi.detalle(acta.id);
      if (esta === vigente.current) {
        setDetalle(d);
        setError(null);
      }
    } catch (e) {
      if (esta === vigente.current) setError(e);
    }
  }, [acta.id]);

  useEffect(() => {
    setDetalle(null);
    void leer();
    return () => {
      vigente.current += 1;
    };
  }, [leer]);

  if (error && !detalle) {
    return (
      <FalloDeCarga
        error={error}
        queEs="las fotos y las firmas del acta"
        onReintentar={() => void leer()}
        enmarcado={false}
      />
    );
  }
  if (!detalle) {
    return (
      <p className="text-body-sm text-fg-muted" data-testid="acta-firmas-cargando">
        Cargando las fotos y las firmas del acta…
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="fotos-y-firmas-del-acta">
      <FotosPorEspacio
        acta={acta}
        detalle={detalle}
        puedeEditar={puedeEditar}
        onFotos={(fotosDelActa) => setDetalle((d) => (d ? { ...d, fotosDelActa } : d))}
        onRecargar={() => void leer()}
      />
      <FirmasDelActa
        actaId={acta.id}
        detalle={detalle}
        puedeEditar={puedeEditar}
        onFirmada={(d) => {
          setDetalle(d);
          onCambio?.();
        }}
      />
    </div>
  );
}

// ── Fotos por espacio ──────────────────────────────────────────────────────

function FotosPorEspacio({
  acta,
  detalle,
  puedeEditar,
  onFotos,
  onRecargar,
}: {
  acta: Props['acta'];
  detalle: ActaConSusArchivos;
  puedeEditar: boolean;
  onFotos: (fotos: ActaConSusArchivos['fotosDelActa']) => void;
  onRecargar: () => void;
}) {
  const cerrada = detalle.status === 'ACTA_COMPLETED';
  const firmoElInquilino = detalle.paraFirmar.inquilino.firmo;
  const bloqueadas = cerrada || firmoElInquilino;
  const [agregados, setAgregados] = useState<string[]>([]);
  const [otro, setOtro] = useState('');
  const [errorDelOtro, setErrorDelOtro] = useState<string | undefined>();
  const [subiendo, setSubiendo] = useState<{ espacio: string; hecho: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const delInventario = useMemo(
    () =>
      (acta.rooms ?? [])
        .filter((r): r is RoomType => typeof r === 'string' && r in NOMBRE_DEL_ESPACIO)
        .map((r) => ({ clave: r, nombre: NOMBRE_DEL_ESPACIO[r] })),
    [acta.rooms],
  );
  const espacios = espaciosParaLasFotos(delInventario, detalle.fotosDelActa, agregados);
  const sinFotos = espacios.filter((e) => e.fotos.length === 0).map((e) => e.espacio);

  async function subir(espacio: string, clave: string | null, archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    const lista = Array.from(archivos);
    const malos: string[] = [];
    let subidas = 0;
    setAviso(null);
    setSubiendo({ espacio, hecho: 0, total: lista.length });
    for (const [i, foto] of lista.entries()) {
      const problema = problemaDeLaFoto(foto);
      if (problema) {
        malos.push(`${foto.name}: ${problema}`);
        continue;
      }
      try {
        const r = await firmaDelActaApi.subirFoto(acta.id, foto, espacio, clave);
        onFotos(r.fotosDelActa);
        subidas += 1;
      } catch (e) {
        malos.push(
          `${foto.name}: ${mensajeParaLaPersona(e, { accion: 'subir la foto', porDefecto: 'No pudimos subir la foto.' })}`,
        );
      }
      setSubiendo({ espacio, hecho: i + 1, total: lista.length });
    }
    setSubiendo(null);
    if (malos.length > 0) setAviso(malos.join(' · '));
    // Con fotos nuevas cambia lo que falta para firmar (`paraFirmar`): se vuelve a leer.
    if (subidas > 0) onRecargar();
  }

  async function borrar(ruta: string) {
    setBorrando(ruta);
    setAviso(null);
    try {
      const r = await firmaDelActaApi.borrarFoto(acta.id, ruta);
      onFotos(r.fotosDelActa);
      onRecargar();
    } catch (e) {
      setAviso(mensajeParaLaPersona(e, { accion: 'borrar la foto', porDefecto: 'No pudimos borrar la foto.' }));
      onRecargar();
    } finally {
      setBorrando(null);
    }
  }

  function agregarEspacio() {
    const problema = problemaDelEspacio(otro);
    if (problema) {
      setErrorDelOtro(problema);
      return;
    }
    setAgregados((a) => [...a, otro.replace(/\s+/g, ' ').trim()]);
    setOtro('');
    setErrorDelOtro(undefined);
  }

  return (
    <section className="space-y-3" aria-labelledby="acta-fotos-titulo" data-testid="acta-fotos-por-espacio">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Camera className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 id="acta-fotos-titulo" className="text-sm font-semibold text-fg">
            Fotos por espacio
          </h3>
          <p className="text-caption text-fg-muted">
            {bloqueadas
              ? firmoElInquilino
                ? 'El inquilino ya firmó con estas fotos: no se pueden cambiar. Si algo está mal, déjalo escrito en las observaciones.'
                : 'El acta está cerrada: sus fotos no se pueden cambiar.'
              : 'Sin fotos por espacio el acta no se firma ni se cierra. El inquilino ve estas mismas fotos antes de firmar.'}
          </p>
        </div>
      </div>

      <Presence show={!bloqueadas && sinFotos.length > 0} as="p" className="text-caption text-warning" data-testid="espacios-sin-fotos">
        Sin fotos todavía: {sinFotos.join(', ')}.
      </Presence>

      <Stagger className="grid gap-3 sm:grid-cols-2">
        {espacios.map((e) => (
          <StaggerItem key={`${e.clave ?? ''}|${e.espacio}`}>
            <div className="space-y-2 rounded-lg border border-border bg-surface p-3" data-testid="espacio-del-acta">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-fg">{e.espacio}</p>
                <span className="shrink-0 text-caption tabular-nums text-fg-muted">
                  {e.fotos.length === 1 ? '1 foto' : `${e.fotos.length} fotos`}
                </span>
              </div>
              {e.fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {e.fotos.map((f) => (
                    <div key={f.ruta} className="group relative aspect-square overflow-hidden rounded-md bg-surface-muted">
                      {f.url ? (
                        <img src={f.url} alt={`Foto de ${e.espacio}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-1 text-center text-caption text-fg-subtle">
                          Sin vista previa
                        </span>
                      )}
                      {!bloqueadas && puedeEditar && (
                        <IconButton
                          variant="ghost"
                          aria-label={`Borrar esta foto de ${e.espacio}`}
                          icon={<Trash className="h-4 w-4" />}
                          disabled={borrando === f.ruta}
                          onClick={() => void borrar(f.ruta)}
                          className="absolute right-1 top-1 rounded-full bg-black/55 text-white hover:bg-black/75"
                          data-testid="borrar-foto"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!bloqueadas && puedeEditar && (
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-fg hover:bg-surface-muted',
                    subiendo && 'pointer-events-none opacity-60',
                  )}
                >
                  <UploadSimple className="h-4 w-4" aria-hidden="true" />
                  {subiendo?.espacio === e.espacio
                    ? `Subiendo ${subiendo.hecho} de ${subiendo.total}…`
                    : 'Subir fotos'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    data-testid="subir-foto-del-espacio"
                    aria-label={`Subir fotos de ${e.espacio}`}
                    onChange={(ev) => {
                      const archivos = ev.target.files;
                      void subir(e.espacio, e.clave, archivos).finally(() => {
                        ev.target.value = '';
                      });
                    }}
                  />
                </label>
              )}
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {!bloqueadas && puedeEditar && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="acta-otro-espacio"
              value={otro}
              maxLength={60}
              placeholder="Otro espacio (p. ej. Patio de ropas)"
              aria-invalid={errorDelOtro ? true : undefined}
              aria-describedby={errorDelOtro ? 'acta-otro-espacio-error' : undefined}
              onChange={(ev) => {
                setOtro(ev.target.value);
                setErrorDelOtro(undefined);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault();
                  agregarEspacio();
                }
              }}
            />
            <ErrorDelCampo id="acta-otro-espacio-error" mensaje={errorDelOtro} />
          </div>
          <Button type="button" variant="outline" hideArrow onClick={agregarEspacio} data-testid="agregar-espacio">
            Agregar espacio
          </Button>
        </div>
      )}

      <Presence show={aviso !== null} as="p" role="alert" className="text-sm text-danger" data-testid="fotos-aviso">
        {aviso}
      </Presence>
    </section>
  );
}

// ── Firmas ────────────────────────────────────────────────────────────────

function FirmasDelActa({
  actaId,
  detalle,
  puedeEditar,
  onFirmada,
}: {
  actaId: string;
  detalle: ActaConSusArchivos;
  puedeEditar: boolean;
  onFirmada: (d: ActaConSusArchivos) => void;
}) {
  const cerrada = detalle.status === 'ACTA_COMPLETED';
  const { paraFirmar } = detalle;
  const asesor = firmaDe(detalle.firmas, 'ASESOR');
  const inquilino = firmaDe(detalle.firmas, 'INQUILINO');

  const [firmando, setFirmando] = useState(false);
  const [trazo, setTrazo] = useState<string | null>(null);
  const [enviandoFirma, setEnviandoFirma] = useState(false);
  const [errorDeLaFirma, setErrorDeLaFirma] = useState<string | null>(null);
  const [cierre, setCierre] = useState<string | null>(null);

  const [enlace, setEnlace] = useState<EnlaceDelInquilinoEnviado | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [errorDelEnlace, setErrorDelEnlace] = useState<string | null>(null);

  async function firmarComoAsesor() {
    if (!trazo) return;
    setEnviandoFirma(true);
    setErrorDeLaFirma(null);
    try {
      const r = await firmaDelActaApi.firmarComoAsesor(actaId, trazo);
      setFirmando(false);
      setTrazo(null);
      if (r.status === 'ACTA_COMPLETED') {
        const cargo = cargoAparteDelCierre(r);
        const frase = cargo
          ? `El acta quedó cerrada. ${cargo.mensaje}`
          : 'El acta quedó cerrada con las dos firmas.';
        setCierre(frase);
        if (cargo && !elCargoEntro(cargo)) toast.warning('El acta quedó cerrada', { description: cargo.mensaje });
        else toast.success('El acta quedó cerrada', { description: cargo?.mensaje });
      } else {
        toast.success('Firmaste el acta como asesor');
      }
      onFirmada(r);
    } catch (e) {
      setErrorDeLaFirma(mensajeParaLaPersona(e, { accion: 'firmar el acta', porDefecto: 'No pudimos guardar tu firma.' }));
    } finally {
      setEnviandoFirma(false);
    }
  }

  async function pedirLaFirma() {
    setPidiendo(true);
    setErrorDelEnlace(null);
    try {
      setEnlace(await firmaDelActaApi.enlaceDelInquilino(actaId));
    } catch (e) {
      setErrorDelEnlace(
        mensajeParaLaPersona(e, { accion: 'mandar el enlace', porDefecto: 'No pudimos armar el enlace para el inquilino.' }),
      );
    } finally {
      setPidiendo(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="acta-firmas-titulo" data-testid="acta-firmas">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Signature className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 id="acta-firmas-titulo" className="text-sm font-semibold text-fg">
            Firmas
          </h3>
          <p className="text-caption text-fg-muted">
            El acta se cierra con la firma del asesor y la del inquilino, y las fotos por espacio.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* El asesor */}
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3" data-testid="firma-del-asesor">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">Asesor</p>
          {asesor ? (
            <FirmaPuesta firma={asesor} />
          ) : cerrada ? (
            <p className="text-sm text-fg-muted">El acta se cerró sin esta firma.</p>
          ) : !paraFirmar.fotos.completas ? (
            <p className="text-sm text-fg-muted">{paraFirmar.fotos.motivo ?? 'Sube las fotos por espacio antes de firmar.'}</p>
          ) : puedeEditar ? (
            <Button type="button" hideArrow onClick={() => setFirmando(true)} data-testid="firmar-como-asesor">
              Firmar como asesor
            </Button>
          ) : (
            <p className="text-sm text-fg-muted">Firma alguien del equipo con permiso para editar contratos.</p>
          )}
        </div>

        {/* El inquilino */}
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3" data-testid="firma-del-inquilino">
          <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">Inquilino</p>
          {inquilino ? (
            <FirmaPuesta firma={inquilino} />
          ) : cerrada ? (
            <p className="text-sm text-fg-muted">El acta se cerró sin esta firma.</p>
          ) : paraFirmar.enlace.sePuede ? (
            <>
              <p className="text-sm text-fg-muted">
                {paraFirmar.inquilino.nombre ?? 'El inquilino'} firma desde un enlace, con un código que le llega a{' '}
                {paraFirmar.inquilino.correo ?? 'su correo'}.
              </p>
              {puedeEditar && (
                <Button
                  type="button"
                  variant="secondary"
                  hideArrow
                  isLoading={pidiendo}
                  disabled={pidiendo}
                  onClick={() => void pedirLaFirma()}
                  className="gap-1.5"
                  data-testid="pedir-firma-del-inquilino"
                >
                  <LinkSimple className="h-4 w-4" aria-hidden="true" />
                  {enlace ? 'Mandar otro enlace' : 'Pedirle la firma'}
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-fg-muted" data-testid="enlace-por-que-no">
              {paraFirmar.enlace.porQueNo}
            </p>
          )}
          <Presence show={enlace !== null && !inquilino} className="space-y-2" data-testid="enlace-del-inquilino">
            {enlace && (
              <>
                <p className={cn('text-sm', enlace.envio === 'ENVIADO' ? 'text-success' : 'text-fg-muted')}>
                  {fraseDelEnvio(enlace)}
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={enlace.enlace} aria-label="Enlace para que el inquilino firme" className="font-mono" />
                  <CopyButton text={enlace.enlace} label="Copiar" copiedLabel="Copiado" aria-label="Copiar el enlace" />
                </div>
                <p className="text-caption text-fg-muted">
                  {`Vence el ${cuando(enlace.venceEl)}`.replace(/\.?$/, '.')}
                </p>
              </>
            )}
          </Presence>
          <Presence show={errorDelEnlace !== null} as="p" role="alert" className="text-sm text-danger">
            {errorDelEnlace}
          </Presence>
        </div>
      </div>

      <Presence show={cerrada} className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-soft p-3" data-testid="acta-cerrada">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
        <p className="text-sm text-fg">{cierre ?? 'El acta está cerrada.'}</p>
      </Presence>

      <Dialog open={firmando} onOpenChange={(abierto) => !enviandoFirma && setFirmando(abierto)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firmar el acta como asesor</DialogTitle>
            <DialogDescription>
              Tu firma dice que el inmueble está como lo muestran el inventario y las fotos por espacio. Queda guardada con
              la hora, desde dónde firmaste y las fotos que había.
            </DialogDescription>
          </DialogHeader>
          <SignaturePad onChange={setTrazo} disabled={enviandoFirma} />
          <Presence show={errorDeLaFirma !== null} as="p" role="alert" className="flex items-start gap-1.5 text-sm text-danger">
            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {errorDeLaFirma}
          </Presence>
          <DialogFooter>
            <Button type="button" variant="outline" hideArrow disabled={enviandoFirma} onClick={() => setFirmando(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              hideArrow
              isLoading={enviandoFirma}
              disabled={!trazo || enviandoFirma}
              onClick={() => void firmarComoAsesor()}
              data-testid="confirmar-firma-del-asesor"
            >
              Firmar el acta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FirmaPuesta({ firma }: { firma: FirmaVisibleDelActa }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
        Firmó {firma.nombre}
      </p>
      {firma.firmadaEl && <p className="text-caption text-fg-muted">{cuando(firma.firmadaEl)}</p>}
      {firma.firmaUrl && (
        <img
          src={firma.firmaUrl}
          alt={`Firma de ${firma.nombre}`}
          className="h-16 rounded border border-border bg-white object-contain"
        />
      )}
    </div>
  );
}
