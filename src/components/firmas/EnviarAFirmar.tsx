'use client';

/**
 * «Enviar a firmar» (Firmas, Nico 28-10-2026). Cuatro pasos cortos, en una sola ventana:
 *   1. El documento (PDF, hasta 15 MB) y su nombre.
 *   2. Quién firma: hasta 5 personas con su correo o su WhatsApp (por ahí les llega el código). «Yo también firmo».
 *   3. Dónde va la firma: en una hoja al final (lo de siempre) o donde la pongas tú, arrastrándola.
 *   4. Cómo pagas: una de tus firmas, a tu factura (si ya pagas Leasefy) o este documento ahora ($3.900 + IVA).
 * Lo sube, lo envía y cada persona recibe su enlace; no necesitan crear cuenta.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, FilePdf, Plus, Trash, UserPlus } from '@phosphor-icons/react';
import { FileDropzone, RadioCard, RadioCardGroup, Stepper } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CampoDeCelularDelMundo } from '@/components/ui/campo-de-celular-del-mundo';
import { useAuth } from '@/lib/auth/use-auth';
import { ApiError } from '@/lib/api/client';
import { firmasApi, type ComoPaga, type DetalleDelDocumento, type DondeFirma, type Posicion, type Ubicacion, type VistaDeFirmas } from '@/lib/api/firmas.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { celularEnE164 } from '@/lib/phone/paises-del-mundo';
import {
  COLORES_DE_FIRMANTE,
  loQueLeFalta,
  MAX_FIRMANTES,
  MAX_MB_DEL_PDF,
  pesos,
  repetidos,
  tituloDelArchivo,
  type FirmanteEnElFormulario,
} from '@/lib/firmas/reglas-de-firmas';
import { cn } from '@/lib/utils';
import { UbicarFirmas } from './UbicarFirmas';

const PASOS = [
  { id: 'documento', label: 'Documento' },
  { id: 'firmantes', label: 'Quién firma' },
  { id: 'ubicacion', label: 'Dónde firma' },
  { id: 'enviar', label: 'Enviar' },
];

let contador = 0;
const nuevaClave = () => `f${Date.now().toString(36)}${(contador += 1)}`;
const vacio = (): FirmanteEnElFormulario => ({ clave: nuevaClave(), nombre: '', email: '', celular: '', pais: 'CO', numeroDocumento: '', posicion: null });

interface Props {
  abierta: boolean;
  alCerrar: () => void;
  donde: DondeFirma;
  vista: VistaDeFirmas;
  alEnviar: (doc: DetalleDelDocumento) => void;
  alComprar: () => void;
}

export function EnviarAFirmar({ abierta, alCerrar, donde, vista, alEnviar, alComprar }: Props) {
  const { user } = useAuth();
  const [paso, setPaso] = useState(0);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [firmantes, setFirmantes] = useState<FirmanteEnElFormulario[]>([vacio()]);
  const [ubicacion, setUbicacion] = useState<Ubicacion>('HOJA_FINAL');
  const puedeBolsa = vista.bolsa.total > 0;
  const [como, setComo] = useState<ComoPaga>(puedeBolsa ? 'BOLSA' : vista.puedeCargarALaFactura ? 'FACTURA' : 'PAGO_UNICO');
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  // Al abrir, la forma de pago que sirve hoy (la bolsa pudo cambiar desde la última vez).
  useEffect(() => {
    if (abierta) setComo(vista.bolsa.total > 0 ? 'BOLSA' : vista.puedeCargarALaFactura ? 'FACTURA' : 'PAGO_UNICO');
  }, [abierta, vista.bolsa.total, vista.puedeCargarALaFactura]);

  const reiniciar = useCallback(() => {
    setPaso(0);
    setArchivo(null);
    setTitulo('');
    setMensaje('');
    setFirmantes([vacio()]);
    setUbicacion('HOJA_FINAL');
    setIntento(false);
    setFallo(null);
  }, []);

  const cerrar = () => {
    if (enviando) return;
    alCerrar();
    setTimeout(reiniciar, 250);
  };

  const opciones = { codigoPorWhatsapp: vista.codigoPorWhatsapp, enElDocumento: ubicacion === 'EN_EL_DOCUMENTO' };
  const rep = useMemo(() => repetidos(firmantes), [firmantes]);
  const faltaEn = (f: FirmanteEnElFormulario) =>
    loQueLeFalta(f, { ...opciones, enElDocumento: false }) ?? (rep.includes(f.clave) ? 'Está repetido: cada persona firma una vez.' : null);

  const errorDelPaso = (): string | null => {
    if (paso === 0) {
      if (!archivo) return 'Sube el documento en PDF.';
      if (titulo.trim().length < 2) return 'Ponle un nombre al documento.';
    }
    if (paso === 1) {
      const conProblema = firmantes.find((f) => faltaEn(f));
      if (conProblema) return `${conProblema.nombre.trim() || 'Una persona'}: ${faltaEn(conProblema)}`;
    }
    if (paso === 2 && ubicacion === 'EN_EL_DOCUMENTO') {
      const sin = firmantes.find((f) => !f.posicion);
      if (sin) return `Ubica la firma de ${sin.nombre.trim() || 'cada persona'} en el documento.`;
    }
    return null;
  };

  const seguir = () => {
    setIntento(true);
    if (errorDelPaso()) return;
    setIntento(false);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  };

  const cambiar = (clave: string, cambio: Partial<FirmanteEnElFormulario>) =>
    setFirmantes((l) => l.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  const yoTambien = () => {
    const nombre = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    const yo: FirmanteEnElFormulario = { ...vacio(), nombre, email: user?.email ?? '', celular: (user?.phone ?? '').replace(/^\+57/, '') };
    setFirmantes((l) => {
      const libre = l.findIndex((f) => !f.nombre && !f.email && !f.celular);
      if (libre >= 0) return l.map((f, i) => (i === libre ? { ...yo, clave: f.clave } : f));
      return l.length < MAX_FIRMANTES ? [...l, yo] : l;
    });
  };
  const yaEstoy = Boolean(user?.email && firmantes.some((f) => f.email.trim().toLowerCase() === user.email?.toLowerCase()));

  const enviar = async () => {
    if (!archivo) return;
    setEnviando(true);
    setFallo(null);
    const api = firmasApi(donde);
    let creado: DetalleDelDocumento | null = null;
    try {
      creado = await api.crear(archivo, {
        titulo: titulo.trim(),
        mensaje: mensaje.trim() || undefined,
        ubicacion,
        firmantes: firmantes.map((f) => ({
          nombre: f.nombre.trim(),
          email: f.email.trim() || undefined,
          telefono: f.celular.trim() ? (celularEnE164(f.celular, f.pais) ?? undefined) : undefined,
          numeroDocumento: f.numeroDocumento.trim() || undefined,
          posicion: ubicacion === 'EN_EL_DOCUMENTO' ? f.posicion : null,
        })),
      });
      const r = await api.enviar(creado.id, como);
      if (r.paymentUrl) {
        toast.success('Te llevamos a pagar. Al aprobarse, el documento sale a firmar solo.');
        window.location.assign(r.paymentUrl);
        return;
      }
      toast.success(`Listo: ${firmantes.length === 1 ? 'le llegó el enlace para firmar' : `a las ${firmantes.length} personas les llegó su enlace`}.`);
      alEnviar(r.documento);
      alCerrar();
      setTimeout(reiniciar, 250);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SIN_FIRMAS_EN_LA_BOLSA') {
        setComo('PAGO_UNICO');
        setFallo('Ya usaste tus firmas. Paga este documento o compra un paquete. Tu documento quedó guardado en borrador.');
      } else {
        setFallo(mensajeParaLaPersona(e, { porDefecto: 'No pudimos enviar el documento. Intenta de nuevo.', accion: 'enviar el documento' }));
      }
      if (creado) alEnviar(creado);
    } finally {
      setEnviando(false);
    }
  };

  const error = intento ? errorDelPaso() : null;
  const precio = vista.precioPorDocumento;

  return (
    <Dialog open={abierta} onOpenChange={(v) => (!v ? cerrar() : undefined)}>
      <DialogContent size={paso === 2 && ubicacion === 'EN_EL_DOCUMENTO' ? 'xl' : 'lg'} data-testid="enviar-a-firmar">
        <DialogHeader>
          <DialogTitle>Enviar a firmar</DialogTitle>
          <DialogDescription>Cada persona firma desde su celular con un código que le llega. No necesita cuenta.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <Stepper steps={PASOS} activeIndex={paso} className="hidden sm:flex" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle sm:hidden">
            Paso {paso + 1} de {PASOS.length} · {PASOS[paso].label}
          </p>

          {paso === 0 ? (
            <div className="space-y-4" data-testid="paso-documento">
              {archivo ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted/50 px-4 py-3">
                  <FilePdf size={28} weight="duotone" className="shrink-0 text-danger" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-fg">{archivo.name}</p>
                    <p className="text-[13px] text-fg-muted">{(archivo.size / 1024 / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB</p>
                  </div>
                  <Button size="sm" variant="ghost" hideArrow onClick={() => setArchivo(null)} data-testid="quitar-archivo">
                    Cambiar
                  </Button>
                </div>
              ) : (
                <FileDropzone
                  accept="application/pdf,.pdf"
                  hint={`PDF, hasta ${MAX_MB_DEL_PDF} MB. Un contrato, una promesa, un acta… lo que sea.`}
                  onFiles={(lista) => {
                    const f = lista[0];
                    if (!f) return;
                    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return toast.error('El documento tiene que ser un PDF.');
                    if (f.size > MAX_MB_DEL_PDF * 1024 * 1024) return toast.error(`El PDF no puede pesar más de ${MAX_MB_DEL_PDF} MB.`);
                    setArchivo(f);
                    setTitulo((t) => t || tituloDelArchivo(f.name));
                    setFirmantes((l) => l.map((x) => ({ ...x, posicion: null })));
                  }}
                />
              )}
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium text-fg-muted">Nombre del documento</span>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Promesa de compraventa — Laureles" data-testid="titulo-del-documento" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium text-fg-muted">Mensaje para quienes firman (opcional)</span>
                <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={1000} rows={2} placeholder="Hola, te envío el documento para que lo firmes hoy." />
              </label>
            </div>
          ) : null}

          {paso === 1 ? (
            <div className="space-y-3" data-testid="paso-firmantes">
              {firmantes.map((f, i) => {
                const falta = intento ? faltaEn(f) : null;
                return (
                  <fieldset key={f.clave} className={cn('space-y-3 rounded-2xl border p-4', falta ? 'border-danger/40' : 'border-border')} data-testid={`firmante-${i + 1}`}>
                    <legend className="flex items-center gap-2 px-1 text-[13px] font-medium text-fg">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORES_DE_FIRMANTE[i % COLORES_DE_FIRMANTE.length] }} aria-hidden="true" />
                      Persona {i + 1}
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input aria-label={`Nombre de la persona ${i + 1}`} placeholder="Nombre completo" value={f.nombre} onChange={(e) => cambiar(f.clave, { nombre: e.target.value })} data-testid={`firmante-nombre-${i + 1}`} />
                      <Input aria-label={`Cédula de la persona ${i + 1} (opcional)`} placeholder="Cédula (opcional)" inputMode="numeric" value={f.numeroDocumento} onChange={(e) => cambiar(f.clave, { numeroDocumento: e.target.value })} />
                      <Input type="email" aria-label={`Correo de la persona ${i + 1}`} placeholder="Correo" value={f.email} onChange={(e) => cambiar(f.clave, { email: e.target.value })} data-testid={`firmante-correo-${i + 1}`} />
                      <CampoDeCelularDelMundo pais={f.pais} alCambiarPais={(p) => cambiar(f.clave, { pais: p })} value={f.celular} onChange={(v) => cambiar(f.clave, { celular: v })} aria-label={`WhatsApp de la persona ${i + 1}`} placeholder="WhatsApp" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn('text-[13px]', falta ? 'text-danger' : 'text-fg-subtle')} role={falta ? 'alert' : undefined}>
                        {falta ?? 'El código le llega al correo y, si es de Colombia, también por WhatsApp.'}
                      </p>
                      {firmantes.length > 1 ? (
                        <Button size="sm" variant="ghost" hideArrow onClick={() => setFirmantes((l) => l.filter((x) => x.clave !== f.clave))} aria-label={`Quitar a la persona ${i + 1}`}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </fieldset>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" hideArrow disabled={firmantes.length >= MAX_FIRMANTES} onClick={() => setFirmantes((l) => [...l, vacio()])} data-testid="agregar-firmante">
                  <Plus className="h-4 w-4" /> Agregar persona
                </Button>
                {!yaEstoy && user?.email ? (
                  <Button size="sm" variant="ghost" hideArrow disabled={firmantes.length >= MAX_FIRMANTES && !firmantes.some((x) => !x.nombre)} onClick={yoTambien} data-testid="yo-tambien-firmo">
                    <UserPlus className="h-4 w-4" /> Yo también firmo
                  </Button>
                ) : null}
                <span className="self-center text-[13px] text-fg-subtle">Hasta {MAX_FIRMANTES} personas por documento.</span>
              </div>
            </div>
          ) : null}

          {paso === 2 ? (
            <div className="space-y-4" data-testid="paso-ubicacion">
              <RadioCardGroup value={ubicacion} onValueChange={(v) => setUbicacion(v as Ubicacion)} className="grid gap-2 sm:grid-cols-2" aria-label="Dónde va la firma">
                <RadioCard value="HOJA_FINAL" label="En una hoja de firmas al final" description="Lo más rápido. Cada firma va con su nombre, la fecha y el código que la verificó." badge="Recomendado" data-testid="ubicacion-hoja-final" />
                <RadioCard value="EN_EL_DOCUMENTO" label="La pongo yo en el documento" description="Arrastras la firma de cada persona a su lugar. La hoja de firmas igual va al final." data-testid="ubicacion-en-el-documento" />
              </RadioCardGroup>
              {ubicacion === 'EN_EL_DOCUMENTO' && archivo ? (
                <UbicarFirmas archivo={archivo} firmantes={firmantes} alUbicar={(clave, p: Posicion | null) => cambiar(clave, { posicion: p })} />
              ) : null}
            </div>
          ) : null}

          {paso === 3 ? (
            <div className="space-y-4" data-testid="paso-enviar">
              <div className="rounded-2xl border border-border p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Vas a enviar</p>
                <p className="mt-1 text-[16px] font-medium text-fg">{titulo}</p>
                <ul className="mt-2 space-y-1">
                  {firmantes.map((f, i) => (
                    <li key={f.clave} className="flex items-center gap-2 text-[14px] text-fg-muted">
                      <span className="size-2 rounded-full" style={{ backgroundColor: COLORES_DE_FIRMANTE[i % COLORES_DE_FIRMANTE.length] }} aria-hidden="true" />
                      <span className="text-fg">{f.nombre}</span>
                      <span className="truncate">{[f.email, f.celular && `WhatsApp ${f.celular}`].filter(Boolean).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-fg-subtle">{ubicacion === 'HOJA_FINAL' ? 'Firmas en una hoja al final.' : 'Firmas donde las pusiste, y la hoja de firmas al final.'}</p>
              </div>

              <RadioCardGroup value={como} onValueChange={(v) => setComo(v as ComoPaga)} className="grid gap-2" aria-label="Cómo pagas esta firma">
                {puedeBolsa ? (
                  <RadioCard
                    value="BOLSA"
                    label={vista.bolsa.gratis > 0 ? 'Usar una de tus firmas gratis' : 'Usar una firma de tu paquete'}
                    description={`Te ${vista.bolsa.total === 1 ? 'queda 1' : `quedan ${vista.bolsa.total}`}${vista.bolsa.gratis > 0 ? ` (${vista.bolsa.gratis} gratis)` : ''}. Todas las personas de este documento cuentan como una.`}
                    data-testid="pagar-bolsa"
                  />
                ) : null}
                {vista.puedeCargarALaFactura ? (
                  <RadioCard value="FACTURA" label="Cárgalo a mi factura" description={`${pesos(precio.precio)} + IVA en tu próximo cobro de Leasefy.`} data-testid="pagar-factura" />
                ) : null}
                <RadioCard value="PAGO_UNICO" label="Pagar este documento ahora" description={`${pesos(precio.total)} con IVA, con tarjeta, PSE o Nequi. Al aprobarse, sale a firmar solo.`} data-testid="pagar-ahora" />
              </RadioCardGroup>
              <button type="button" onClick={alComprar} className="text-[13.5px] font-medium text-primary hover:underline" data-testid="ver-paquetes">
                ¿Firmas seguido? Los paquetes salen desde {pesos(Math.min(...vista.aLaVenta.map((p) => p.porFirma)))} por documento.
              </button>
              {fallo ? (
                <p className="rounded-xl bg-danger-soft px-4 py-3 text-body-sm text-fg" role="alert" data-testid="fallo-al-enviar">
                  {fallo}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-danger-soft px-4 py-2.5 text-[13.5px] text-fg" role="alert" data-testid="error-del-paso">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter className="gap-2">
          {paso > 0 ? (
            <Button variant="ghost" hideArrow disabled={enviando} onClick={() => setPaso((p) => p - 1)} className="mr-auto">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          ) : null}
          {paso < PASOS.length - 1 ? (
            <Button hideArrow onClick={seguir} data-testid="seguir">
              Seguir
            </Button>
          ) : (
            <Button hideArrow isLoading={enviando} onClick={() => void enviar()} data-testid="enviar">
              <Check className="h-4 w-4" /> {como === 'PAGO_UNICO' ? 'Pagar y enviar' : 'Enviar a firmar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
