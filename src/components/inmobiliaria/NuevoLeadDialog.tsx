'use client';

/**
 * Cargar un lead a mano.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * Un pipeline sin leads eran seis columnas «Arrastra aquí» sin salida. Los
 * leads entran solos cuando alguien pide una visita o se postula, pero el que
 * llega por teléfono o por WhatsApp no tenía dónde anotarse:
 * `pipelineApi.create` existía sin pantalla.
 *
 * Pide lo que el back exige (el inmueble y el nombre) y el contacto, que es
 * opcional. Un 400 que explica se muestra al lado de su campo, con el
 * mensaje; nunca un «Intenta de nuevo» sobre algo que no se va a arreglar
 * reintentando.
 *
 * ── 🔴 B-07 (18-09-2026): el ORIGEN es obligatorio ─────────────────────────
 *
 * «Origen obligatorio de una lista.» Sin él la inmobiliaria paga tres portales
 * y no puede decir cuál le trajo un contrato, que es la pregunta por la que el
 * campo existe (ver `/panel/inmobiliaria/pipeline/origenes`).
 *
 * El diálogo manda el lead por `leadsApi.entra`, que además une el CONTACTO
 * (B-04, por documento o teléfono) y ASIGNA el asesor (B-01, el del inmueble o
 * el del turno). Si esa parte del CRM todavía no está habilitada —la migración
 * `20260918160000` sin aplicar, 503— cae al camino de siempre
 * (`pipelineApi.create`) y el diálogo se comporta EXACTAMENTE como hoy: el
 * origen queda en gris con su porqué, y nada se rompe.
 *
 * Por eso el teléfono ya no dice «opcional» cuando el CRM está habilitado:
 * hace falta el documento o el teléfono para poder unir el duplicado.
 *
 * ── Sistema de errores (02-10-2026) ──────────────────────────────────────
 *
 * El error de cada campo sale debajo con `ErrorDelCampo` (entra suave, con
 * `aria-describedby`), y el primer campo que el servidor rechazó recibe el
 * foco. Si el back manda `campos`, se muestra SU frase (la del DTO, que dice
 * el tope exacto), no un texto fijo. Lo que no tiene campo en el diálogo
 * —el presupuesto, que hoy no se pide acá— va al pie con su frase.
 */

import { useEffect, useRef, useState } from 'react';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  MAX_LARGO_CORREO_DEL_CANDIDATO,
  MAX_LARGO_TELEFONO_DEL_CANDIDATO,
} from '@/lib/pipeline/limites-del-pipeline';
import { pipelineApi } from '@/lib/api/inmobiliaria.service';
import { leadsApi } from '@/lib/api/crm.service';
import { useCrm } from '@/lib/hooks/use-crm';
import type { Consignacion } from '@/lib/types/inmobiliaria';

type Campo =
  | 'consignacionId'
  | 'origen'
  | 'candidateName'
  | 'candidateEmail'
  | 'candidatePhone'
  | 'documento'
  | 'presupuestoCop';

export interface ErroresDelLead {
  porCampo: Partial<Record<Campo, string>>;
  general?: string;
}

const CAMPOS: readonly Campo[] = [
  'consignacionId',
  'origen',
  'candidateName',
  'candidateEmail',
  'candidatePhone',
  'documento',
  'presupuestoCop',
];

/**
 * Los nombres de `POST /inmobiliaria/leads` (`EntraUnLeadDto`) → los del
 * diálogo. El camino viejo (`pipelineApi.create`) ya usa los del diálogo.
 */
const CAMPO_DEL_SERVIDOR: Readonly<Record<string, Campo>> = {
  nombre: 'candidateName',
  correo: 'candidateEmail',
  telefono: 'candidatePhone',
};

/** Los campos que el diálogo pinta hoy (el presupuesto no se pide acá). */
const CAMPOS_VISIBLES: readonly Campo[] = [
  'consignacionId',
  'origen',
  'candidateName',
  'candidateEmail',
  'candidatePhone',
  'documento',
];

/** El control de cada campo: a ése va el foco cuando el servidor lo rechaza. */
const ID_DEL_CONTROL: Readonly<Record<Campo, string>> = {
  consignacionId: 'nuevo-lead-inmueble',
  origen: 'nuevo-lead-origen',
  candidateName: 'nuevo-lead-nombre',
  candidateEmail: 'nuevo-lead-correo',
  candidatePhone: 'nuevo-lead-telefono',
  documento: 'nuevo-lead-documento',
  presupuestoCop: 'nuevo-lead-presupuesto',
};

/** Lo que se ve al lado de cada campo cuando el back lo rechaza. */
const MENSAJE_DEL_CAMPO: Record<Campo, string> = {
  consignacionId: 'Elige uno de tus inmuebles consignados.',
  origen: 'Escoge de dónde vino el lead.',
  candidateName: 'Escribe el nombre de la persona.',
  candidateEmail: 'Ese correo no es válido.',
  candidatePhone: 'Ese teléfono no es válido.',
  documento: 'Ese documento no es válido.',
  presupuestoCop: 'Ese presupuesto no es válido.',
};

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** B-04: sin documento ni teléfono no hay contra qué unir el duplicado. */
const FALTA_LA_LLAVE =
  'Escribe el documento o el teléfono: sin uno de los dos no se puede saber si esta persona ya es contacto de la inmobiliaria.';

/** Cómo se lee cada origen. Los propios de la inmobiliaria salen legibles. */
const NOMBRE_DEL_ORIGEN: Record<string, string> = {
  FINCARAIZ: 'Fincaraíz',
  METROCUADRADO: 'Metrocuadrado',
  MERCADO_LIBRE: 'Mercado Libre',
  SITIO_PROPIO: 'Sitio propio',
  WHATSAPP: 'WhatsApp',
  LLAMADA: 'Llamada',
  REFERIDO: 'Referido',
  PORTERIA: 'Portería',
  OTRO: 'Otro',
};

export function nombreDelOrigen(codigo: string): string {
  return (
    NOMBRE_DEL_ORIGEN[codigo] ??
    codigo
      .split('_')
      .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
      .join(' ')
  );
}

/** El campo del diálogo para un `campo` del servidor (ruta o nombre del DTO). */
function campoDelDialogo(delServidor: string): Campo | undefined {
  const hoja = delServidor.split('.').pop() ?? delServidor;
  return CAMPO_DEL_SERVIDOR[hoja] ?? CAMPOS.find((x) => x === hoja);
}

export interface OpcionesDelReparto {
  /**
   * Los campos que el formulario pinta. El error de uno que no se pinta (hoy,
   * el presupuesto) va a `general`, con la frase del servidor: nunca se pierde.
   */
  visibles?: readonly Campo[];
}

/**
 * Traduce el rechazo del back a algo que se pueda leer al lado del campo.
 *
 * 02-10-2026: el back manda `campos` (`DATOS_INVALIDOS`) con el nombre del DTO
 * y una frase en español que dice el tope exacto («El nombre puede tener hasta
 * 200 caracteres.»): esa frase va debajo de su campo, tal cual. Los mensajes
 * en inglés con el nombre adentro («candidateEmail must be an email») son de
 * un back anterior y se reparten con copy propio. Un 404 es un inmueble que
 * ya no está en la inmobiliaria. Lo demás pasa por el traductor: «conexión»
 * sólo sin respuesta, y un 5xx dice que es nuestro, con la referencia.
 */
export function erroresDelLead(
  error: unknown,
  { visibles = CAMPOS }: OpcionesDelReparto = {},
): ErroresDelLead {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      const delServidor = camposDelError(error);
      if (delServidor.length > 0) {
        const porCampo: ErroresDelLead['porCampo'] = {};
        const sueltos: string[] = [];
        for (const c of delServidor) {
          const campo = campoDelDialogo(c.campo);
          if (campo && visibles.includes(campo)) porCampo[campo] = porCampo[campo] ?? c.mensaje;
          else sueltos.push(c.mensaje);
        }
        return { porCampo, general: sueltos.length ? Array.from(new Set(sueltos)).join(' · ') : undefined };
      }
      const mensajes = error.messages ?? [error.message];
      const porCampo: ErroresDelLead['porCampo'] = {};
      const sueltos: string[] = [];
      for (const m of mensajes) {
        const campo = CAMPOS.find((c) => m.includes(c));
        if (campo) porCampo[campo] = MENSAJE_DEL_CAMPO[campo];
        else sueltos.push(m);
      }
      return { porCampo, general: sueltos.length ? sueltos.join(' · ') : undefined };
    }
    if (error.status === 404) {
      return {
        porCampo: {
          consignacionId: 'Ese inmueble ya no está consignado en tu inmobiliaria. Elige otro.',
        },
      };
    }
  }
  // Regla de oro (02-10-2026): «conexión» sólo si no hubo respuesta; un 5xx es
  // nuestro (con la referencia); un 409 o un 403 dicen lo que mandó el back.
  return {
    porCampo: {},
    general: mensajeParaLaPersona(error, {
      porDefecto: 'No se pudo guardar el lead. Prueba de nuevo en un momento.',
      accion: 'guardar el lead',
    }),
  };
}

interface NuevoLeadDialogProps {
  abierto: boolean;
  consignaciones: Consignacion[];
  onCerrar: () => void;
  onCreado: () => void;
}

export function NuevoLeadDialog({ abierto, consignaciones, onCerrar, onCreado }: NuevoLeadDialogProps) {
  const [consignacionId, setConsignacionId] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [documento, setDocumento] = useState('');
  const [origen, setOrigen] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<ErroresDelLead>({ porCampo: {} });
  // `enviando` llega en el render siguiente: un doble clic mandaba dos leads.
  const enviandoAhora = useRef(false);
  // Sólo el rechazo del servidor mueve el foco (no cada tecla).
  const enfocarElPrimero = useRef(false);

  // La lista de orígenes de ESTA inmobiliaria. Con el CRM sin habilitar queda
  // en `noHabilitado` y el campo se muestra en gris con su porqué.
  const configuracion = useCrm(() => leadsApi.configuracion(), [], []);
  const origenes = configuracion.datos?.origenesDeLead ?? [];
  const conCrm = configuracion.noHabilitado === null && origenes.length > 0;

  useEffect(() => {
    if (!abierto) return;
    setConsignacionId('');
    setNombre('');
    setCorreo('');
    setTelefono('');
    setDocumento('');
    setOrigen('');
    setErrores({ porCampo: {} });
  }, [abierto]);

  const correoMalo = correo.trim() !== '' && !CORREO_VALIDO.test(correo.trim());
  // 🔴 Con el CRM habilitado hacen falta el ORIGEN (B-07) y una llave de
  // contacto (B-04): sin documento ni teléfono no hay contra qué unir el
  // duplicado, y el back lo rechaza con `CONTACTO_SIN_LLAVE`.
  const faltaLlave =
    conCrm && documento.trim() === '' && telefono.trim() === '';
  const listo =
    consignacionId !== '' &&
    nombre.trim() !== '' &&
    !correoMalo &&
    (!conCrm || (origen !== '' && !faltaLlave));
  const elegida = consignaciones.find((c) => c.id === consignacionId);
  const visibles: readonly Campo[] = conCrm
    ? CAMPOS_VISIBLES
    : CAMPOS_VISIBLES.filter((c) => c !== 'origen' && c !== 'documento');

  // El primer campo que el servidor rechazó recibe el foco (en el orden en
  // que se ven), para que se corrija sin buscarlo.
  useEffect(() => {
    if (!enfocarElPrimero.current) return;
    enfocarElPrimero.current = false;
    const primero = CAMPOS.find((c) => errores.porCampo[c]);
    if (primero) document.getElementById(ID_DEL_CONTROL[primero])?.focus();
  }, [errores]);

  const guardar = async () => {
    if (!listo || enviandoAhora.current) return;
    enviandoAhora.current = true;
    setEnviando(true);
    setErrores({ porCampo: {} });
    try {
      if (conCrm) {
        const r = await leadsApi.entra({
          consignacionId,
          origen,
          nombre: nombre.trim(),
          ...(correo.trim() ? { correo: correo.trim() } : {}),
          ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
          ...(documento.trim() ? { documento: documento.trim() } : {}),
        });
        toast.success('Lead cargado', {
          description: r.contactoUnido
            ? // B-07: «el duplicado se une al contacto existente y se avisa al
              // asesor dueño». El aviso es éste.
              `${nombre.trim()} ya era contacto de la inmobiliaria (se reconoció por ${
                r.seReconocioPor === 'DOCUMENTO' ? 'el documento' : 'el teléfono'
              }): la oportunidad nueva quedó en su historial.`
            : `${nombre.trim()} entró al pipeline como «Interesado».`,
        });
      } else {
        await pipelineApi.create({
          consignacionId,
          candidateName: nombre.trim(),
          ...(correo.trim() ? { candidateEmail: correo.trim() } : {}),
          ...(telefono.trim() ? { candidatePhone: telefono.trim() } : {}),
        });
        toast.success('Lead cargado', {
          description: `${nombre.trim()} entró al pipeline como «Interesado».`,
        });
      }
      onCreado();
    } catch (error) {
      enfocarElPrimero.current = true;
      setErrores(erroresDelLead(error, { visibles }));
    } finally {
      enviandoAhora.current = false;
      setEnviando(false);
    }
  };

  // El error de cada campo, con su id para `aria-describedby`.
  const idDelError = (campo: Campo) => `${ID_DEL_CONTROL[campo]}-error`;
  const mensajeDe = (campo: Campo): string | undefined => {
    if (campo === 'candidateEmail' && correoMalo) return MENSAJE_DEL_CAMPO.candidateEmail;
    if (campo === 'documento' && faltaLlave) return FALTA_LA_LLAVE;
    return errores.porCampo[campo];
  };
  const errorDe = (campo: Campo) => <ErrorDelCampo id={idDelError(campo)} mensaje={mensajeDe(campo)} />;
  const aria = (campo: Campo) =>
    mensajeDe(campo)
      ? { 'aria-invalid': true as const, 'aria-describedby': idDelError(campo) }
      : {};

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && !enviando && onCerrar()}>
      <DialogContent data-testid="nuevo-lead-dialog">
        <DialogHeader>
          <DialogTitle>Nuevo lead</DialogTitle>
          <DialogDescription>
            Anota a quien preguntó por un inmueble. Entra al pipeline como «Interesado».
          </DialogDescription>
        </DialogHeader>

        {/* El cuerpo ya trae su margen: un `px-6` acá corría el formulario
            hacia adentro respecto del título. */}
        <div className="space-y-4">
          {consignaciones.length === 0 ? (
            <p className="text-sm text-fg-muted" data-testid="nuevo-lead-sin-inmuebles">
              Todavía no tienes inmuebles consignados. Un lead se anota sobre uno: consigna el
              primero y vuelve acá.
            </p>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-inmueble">
                Inmueble
              </label>
              <Select value={consignacionId} onValueChange={setConsignacionId}>
                <SelectTrigger id="nuevo-lead-inmueble" className="w-full" {...aria('consignacionId')}>
                  <span className="truncate">{elegida?.propertyTitle ?? 'Elige un inmueble'}</span>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {consignaciones.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.propertyTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorDe('consignacionId')}
            </div>
          )}

          {/* 🔴 B-07: el origen, de la lista de la inmobiliaria. */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-origen">
              ¿De dónde vino?
            </label>
            {conCrm ? (
              <>
                <Select value={origen} onValueChange={setOrigen}>
                  <SelectTrigger id="nuevo-lead-origen" className="w-full" {...aria('origen')}>
                    <span className="truncate">
                      {origen ? nombreDelOrigen(origen) : 'Escoge el origen'}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {origenes.map((o) => (
                      <SelectItem key={o} value={o}>
                        {nombreDelOrigen(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorDelCampo
                  id={idDelError('origen')}
                  mensaje={mensajeDe('origen')}
                  pista="Con esto se sabe qué portal vale la pena pagar."
                />
              </>
            ) : (
              <p className="text-xs text-fg-subtle" data-testid="origen-no-habilitado">
                {configuracion.noHabilitado
                  ? `Próximamente: ${configuracion.noHabilitado}`
                  : 'Cargando los orígenes…'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-nombre">
              Nombre
            </label>
            <Input
              id="nuevo-lead-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ana Restrepo"
              maxLength={120}
              {...aria('candidateName')}
            />
            {errorDe('candidateName')}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-correo">
              Correo <span className="font-normal text-fg-subtle">(opcional)</span>
            </label>
            <Input
              id="nuevo-lead-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ana@correo.com"
              maxLength={MAX_LARGO_CORREO_DEL_CANDIDATO}
              {...aria('candidateEmail')}
            />
            {errorDe('candidateEmail')}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-telefono">
              Teléfono <span className="font-normal text-fg-subtle">(opcional)</span>
            </label>
            <Input
              id="nuevo-lead-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 123 4567"
              maxLength={MAX_LARGO_TELEFONO_DEL_CANDIDATO}
              {...aria('candidatePhone')}
            />
            {errorDe('candidatePhone')}
          </div>

          {conCrm ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg" htmlFor="nuevo-lead-documento">
                Documento{' '}
                <span className="font-normal text-fg-subtle">
                  (o el teléfono, hace falta uno)
                </span>
              </label>
              <Input
                id="nuevo-lead-documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="1.017.234.567"
                maxLength={40}
                data-testid="nuevo-lead-documento"
                {...aria('documento')}
              />
              {errorDe('documento')}
            </div>
          ) : null}

          {errores.general && (
            <p className="text-sm text-danger" role="alert" data-testid="nuevo-lead-error">
              {errores.general}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="button"
            hideArrow
            onClick={() => void guardar()}
            disabled={!listo || enviando}
            isLoading={enviando}
            data-testid="nuevo-lead-guardar"
          >
            Cargar lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NuevoLeadDialog;
