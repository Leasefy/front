'use client';

/**
 * NuevoInquilinoDrawer — cargar UNA persona: nombre, documento, correo y
 * teléfono.
 *
 * ── Por qué existe (Nico, 2026-09-04) ─────────────────────────────────────
 * Mirando la lista, sobre el botón que decía «Crear un contrato»: «*¿pero por
 * qué crear contrato en inquilinos? En inquilino es crear inquilino*». Como
 * en Propietarios se crea un propietario.
 *
 * ── Las dos reglas del formulario ─────────────────────────────────────────
 *
 * 1. **Correo o documento, al menos uno.** No son datos de contacto: son las
 *    llaves con las que después se lo encuentra —el documento para la
 *    migración de contratos, el correo para su cuenta del portal—. Sin
 *    ninguna de las dos queda un nombre suelto que el día del contrato nadie
 *    puede vincular, y se termina creando a la misma persona dos veces. El
 *    back lo rechaza igual; acá se dice antes para no gastar un viaje.
 *
 * 2. **Se dice qué pasa después.** Un inquilino sin contrato no cobra. Es una
 *    línea, no un sermón: si no se dice, alguien carga treinta personas y
 *    espera que le entre la plata.
 */

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { ArrowRight } from '@phosphor-icons/react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { confirmar } from '@/components/ui/confirmar';
import { ApiError } from '@/lib/api/client';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { leerCorreoObligatorio } from '@/lib/terceros/correo-obligatorio';
import {
  documentoParaMostrar,
  errorDelDigitoDeVerificacion,
} from '@/lib/inquilinos/documento-con-dv';
import {
  inquilinosApi,
  pideConfirmarCambioDeCorreo,
  type CambiosDelInquilino,
  type Inquilino,
  type TipoDeDocumento,
} from '@/lib/api/inquilinos.service';

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** La lista se refresca con la persona ya creada (o con sus datos corregidos). */
  onCreado: (inquilino: Inquilino) => void;
  /**
   * E-16 (Nico, 03-10): con una persona, el MISMO formulario corrige sus datos
   * (`PATCH /inmobiliaria/inquilinos/:identidad`), con las mismas reglas y el
   * mismo manejo de errores bajo el campo.
   */
  editando?: Inquilino | null;
  /**
   * I-20: el 409 «ya tienes a esa persona» trae, bajo el campo que chocó, un
   * enlace que la abre. La página la busca y abre su ficha.
   */
  onVerExistente?: (existente: { llave: string; tenantId?: string }) => void;
}

/**
 * I-18 (QA-INQ, 03-10): la política «correo obligatorio» de la inmobiliaria
 * (17-09; `exige_correo_del_tercero`, NULL = exigido). Se lee de donde la lee
 * el resto del front (`terceros-sin-correo`, con `cobros:view`). `null` = no
 * se sabe (sin permiso para leerla, o falló): el formulario queda como antes y
 * el back decide; su 400 va bajo Correo.
 */
function useCorreoObligatorio(abierto: boolean): boolean | null {
  const permisos = usePermissionsContextSafe();
  const puedeLeer = permisos ? permisos.canAccess('cobros', 'view') : false;
  const [exigido, setExigido] = useState<boolean | null>(null);
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    // SEGUIMIENTO-FRONT: con `cobros:view`, `terceros-sin-correo` como siempre;
    // sin él (el asesor), `exigeCorreoDelTercero` de la agencia.
    void leerCorreoObligatorio('INQUILINO', puedeLeer).then((r) => {
      if (vivo) setExigido(r);
    });
    return () => {
      vivo = false;
    };
  }, [abierto, puedeLeer]);
  return exigido;
}

/** El formulario con los datos de una persona que ya existe (E-16). */
export function formularioDe(persona: Inquilino): InquilinoForm {
  const tipo = persona.tipoDocumento ?? null;
  const documento = persona.documento ?? '';
  const mostrado = documento ? documentoParaMostrar(documento, tipo) : '';
  return {
    nombre: persona.nombre,
    // Un NIT reconocido (con su DV) se edita como NIT; sin tipo, el de siempre.
    tipoDocumento: tipo ?? (mostrado !== documento ? 'NIT' : 'CC'),
    documento: mostrado,
    correo: persona.email ?? '',
    telefono: persona.telefono ?? '',
  };
}

export interface InquilinoForm {
  nombre: string;
  tipoDocumento: TipoDeDocumento;
  documento: string;
  correo: string;
  telefono: string;
}

/**
 * `CC` no es un dato inventado: es el valor que se ve elegido en el selector
 * desde que se abre el cajón, así que quien escribe un número ya está diciendo
 * de qué tipo es. Lo que sí sería inventar es que el back lo asuma cuando
 * nadie lo eligió — por eso allá el tipo es obligatorio si viene el número.
 */
export const INQUILINO_VACIO: InquilinoForm = {
  nombre: '',
  tipoDocumento: 'CC',
  documento: '',
  correo: '',
  telefono: '',
};

export const TIPOS_DE_DOCUMENTO: Array<{ value: TipoDeDocumento; label: string }> = [
  { value: 'CC', label: 'Cédula' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

/** Los campos del cajón: se llaman igual que en el DTO del back. */
type CampoDelInquilino = keyof InquilinoForm;
const CAMPOS_DEL_INQUILINO: readonly CampoDelInquilino[] = ['nombre', 'tipoDocumento', 'documento', 'correo', 'telefono'];
const ID_DEL_CAMPO: Record<CampoDelInquilino, string> = {
  nombre: 'inquilino-nombre',
  tipoDocumento: 'inquilino-tipo-documento',
  documento: 'inquilino-documento',
  correo: 'inquilino-correo',
  telefono: 'inquilino-telefono',
};

/** Qué falta. Vacío = se puede guardar. Mismas reglas que el back. */
export function validarInquilino(
  f: InquilinoForm,
  opciones: { correoObligatorio?: boolean } = {},
): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.nombre.trim().length < 2) e.nombre = 'Escribe el nombre del inquilino.';

  const correo = f.correo.trim();
  if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    e.correo = 'Revisa el correo: falta el @ o el dominio.';
  }
  // I-18: con la política prendida, el correo es obligatorio y se dice bajo Correo.
  if (opciones.correoObligatorio && !correo) {
    e.correo = 'Escribe su correo: tu inmobiliaria lo pide para cada inquilino.';
  } else if (!correo && !f.documento.trim()) {
    e.llave =
      'Pon al menos el correo o el documento: es con lo que después lo encontramos al hacerle el contrato.';
  }
  // I-14: un NIT con un dígito de verificación que no corresponde se dice, no se descarta.
  const dv = errorDelDigitoDeVerificacion(f.documento, f.tipoDocumento);
  if (dv) e.documento = dv;
  return e;
}

/** El primer campo con error, en el orden en que se ven (I-19: ahí va el foco). */
function primerCampoConError(
  errores: Record<string, string>,
  correoObligatorio: boolean,
): CampoDelInquilino | null {
  for (const k of CAMPOS_DEL_INQUILINO) if (errores[k]) return k;
  if (errores.llave) return correoObligatorio ? 'correo' : 'documento';
  return null;
}

/** Lo que cambió respecto de la persona: sólo eso viaja en el PATCH. */
function cambiosEntre(antes: InquilinoForm, ahora: InquilinoForm): CambiosDelInquilino {
  const c: CambiosDelInquilino = {};
  const limpio = (v: string) => v.trim();
  if (limpio(ahora.nombre) !== limpio(antes.nombre)) c.nombre = limpio(ahora.nombre);
  if (limpio(ahora.documento) !== limpio(antes.documento) || ahora.tipoDocumento !== antes.tipoDocumento) {
    c.documento = limpio(ahora.documento) || null;
    if (limpio(ahora.documento)) c.tipoDocumento = ahora.tipoDocumento;
  }
  if (limpio(ahora.correo) !== limpio(antes.correo)) c.correo = limpio(ahora.correo) || null;
  if (limpio(ahora.telefono) !== limpio(antes.telefono)) c.telefono = limpio(ahora.telefono) || null;
  return c;
}

/** El 409 «ya tienes a esa persona»: el campo que chocó y, si el back lo manda, quién es. */
function choqueConOtraPersona(
  error: unknown,
): { campo: 'documento' | 'correo'; tenantId?: string } | null {
  if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'INQUILINO_YA_EXISTE') return null;
  const detalle = (error.detalle ?? {}) as { campo?: unknown; tenantId?: unknown; persona?: { tenantId?: unknown } };
  const campo = detalle.campo === 'documento' || detalle.campo === 'correo' ? detalle.campo : null;
  if (!campo) return null;
  const id = typeof detalle.tenantId === 'string' ? detalle.tenantId : typeof detalle.persona?.tenantId === 'string' ? detalle.persona.tenantId : undefined;
  return { campo, tenantId: id };
}

/**
 * El campo del formulario de un rechazo del back SIN `campos[]` pero con su
 * `campo` (los 400/409 de crear y de editar: `NOMBRE_CORTO`,
 * `DOCUMENTO_INVALIDO`, `CORREO_DE_OTRA_CUENTA`…), o `correo` para
 * `FALTA_CORREO_DEL_TERCERO`. `null` = no es de un campo.
 */
function campoDelRechazo(error: unknown): CampoDelInquilino | null {
  if (!(error instanceof ApiError) || error.status < 400 || error.status >= 500) return null;
  if (error.code === 'FALTA_CORREO_DEL_TERCERO') return 'correo';
  const campo = ((error.detalle ?? {}) as { campo?: unknown }).campo;
  return typeof campo === 'string' && (CAMPOS_DEL_INQUILINO as readonly string[]).includes(campo)
    ? (campo as CampoDelInquilino)
    : null;
}

export function NuevoInquilinoDrawer({ abierto, onOpenChange, onCreado, editando = null, onVerExistente }: Props) {
  const [form, setForm] = useState<InquilinoForm>(INQUILINO_VACIO);
  /** Con qué datos se abrió (E-16): lo que no cambió no viaja. */
  const [original, setOriginal] = useState<InquilinoForm>(INQUILINO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);
  /** Los campos que la persona ya dejó: su error se dice al salir (regla ARREGLOS-4 Q2). */
  const [dejados, setDejados] = useState<ReadonlySet<CampoDelInquilino>>(new Set());
  /** I-20: con quién chocó el 409, para el enlace bajo el campo. */
  const [choque, setChoque] = useState<{ campo: 'documento' | 'correo'; llave: string; tenantId?: string } | null>(null);
  const correoObligatorio = useCorreoObligatorio(abierto && !editando) === true;
  /**
   * Lo que el back rechazó POR CAMPO (02-10-2026): un 400 `DATOS_INVALIDOS`
   * trae `campos[]` y cada uno va bajo SU campo hasta que se lo corrige.
   */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDelInquilino, string>>>({});

  useEffect(() => {
    if (abierto) {
      const inicial = editando ? formularioDe(editando) : INQUILINO_VACIO;
      setForm(inicial);
      setOriginal(inicial);
      setTocado(false);
      setDejados(new Set());
      setDelServidor({});
      setChoque(null);
    }
    // `editando` cambia de identidad con cada refresco de la lista; se toma al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const errores = validarInquilino(form, { correoObligatorio });
  const valido = Object.keys(errores).length === 0 && !guardando;
  const set = <K extends keyof InquilinoForm>(k: K, v: InquilinoForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDelServidor((antes) => {
      if (!antes[k]) return antes;
      const { [k]: _quitado, ...resto } = antes;
      return resto;
    });
    if (choque && choque.campo === k) setChoque(null);
  };
  const dejar = (k: CampoDelInquilino) =>
    setDejados((antes) => (antes.has(k) ? antes : new Set(antes).add(k)));
  /**
   * El error que se ve en un campo: el del servidor, o el del cliente tras
   * intentar guardar o tras dejar ESE campo con algo escrito (un requerido
   * vacío no se pinta rojo hasta que se intenta guardar).
   */
  const errorDe = (k: CampoDelInquilino): string | undefined =>
    delServidor[k] ??
    (tocado || (dejados.has(k) && String(form[k]).trim() !== '')
      ? (errores[k] as string | undefined)
      : undefined);
  /** `id`, `aria-invalid` y `aria-describedby` de un control con su error. */
  const control = (k: CampoDelInquilino, tambien?: string) => ({
    id: ID_DEL_CAMPO[k],
    'aria-invalid': Boolean(errorDe(k)) || undefined,
    'aria-describedby': [`${ID_DEL_CAMPO[k]}-error`, tambien].filter(Boolean).join(' '),
  });

  /** I-19: al guardar con errores, el foco va al primer campo que los tiene. */
  const enfocar = (k: CampoDelInquilino) => {
    const el = document.getElementById(ID_DEL_CAMPO[k]);
    el?.focus();
  };

  /** E-16: manda SÓLO lo que cambió. El correo de una cuenta pide confirmación. */
  const guardarCambios = async (persona: Inquilino, confirmado = false): Promise<void> => {
    const cambios = cambiosEntre(original, form);
    if (Object.keys(cambios).length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      const { inquilino: actualizada, avisos } = await inquilinosApi.actualizar(persona.tenantId, {
        ...cambios,
        ...(confirmado ? { confirmarCambioDeCorreo: true } : {}),
      });
      toast.success(`Quedaron guardados los datos de ${actualizada.nombre ?? persona.nombre}`, {
        description: avisos?.length ? avisos.join(' ') : undefined,
      });
      onCreado(actualizada);
      onOpenChange(false);
    } catch (err) {
      if (!confirmado && pideConfirmarCambioDeCorreo(err)) {
        const detalle = ((err as ApiError).detalle ?? {}) as { correoActual?: unknown; correoNuevo?: unknown };
        const actual = typeof detalle.correoActual === 'string' ? detalle.correoActual : original.correo || 'su correo actual';
        const nuevo = typeof detalle.correoNuevo === 'string' ? detalle.correoNuevo : form.correo.trim();
        const si = await confirmar({
          tipo: 'advertencia',
          titulo: '¿Cambiar el correo con el que entra al portal?',
          descripcion: `${persona.nombre} entra a su portal con ${actual}. Desde ahora va a entrar con ${nuevo}, y le mandamos ahí una invitación nueva.`,
          accion: 'Sí, cambiar el correo',
        });
        if (si) await guardarCambios(persona, true);
        return;
      }
      throw err;
    }
  };

  const guardar = async () => {
    setTocado(true);
    if (!valido) {
      const primero = primerCampoConError(errores, correoObligatorio);
      if (primero) enfocar(primero);
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await guardarCambios(editando);
        return;
      }
      const { inquilino, invitado } = await inquilinosApi.crear({
        nombre: form.nombre.trim(),
        // Se omiten en vez de mandarse vacíos: el back corre con
        // `whitelist + forbidNonWhitelisted`, y un `''` no es «no lo sé».
        ...(form.documento.trim()
          ? { documento: form.documento.trim(), tipoDocumento: form.tipoDocumento }
          : {}),
        ...(form.correo.trim() ? { correo: form.correo.trim() } : {}),
        ...(form.telefono.trim() ? { telefono: form.telefono.trim() } : {}),
      });
      toast.success(`${inquilino.nombre} quedó cargado`, {
        description: invitado
          ? 'Le mandamos la invitación a su portal. Todavía no cobra: falta su contrato.'
          : 'Todavía no cobra: falta su contrato.',
      });
      onCreado(inquilino);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      /*
       * Lo que el back rechazó por campo va bajo su campo, con el foco en el
       * primero. Lo demás va al toast con la regla de oro del traductor: el
       * 409 trae el nombre de quien ya está y con qué llave chocó, y se
       * muestra ENTERO (antes se tiraba si pasaba de 200 caracteres); un 5xx
       * dice «de nuestro lado» con la referencia; la red, la conexión.
       */
      const reparto = repartirErroresDelServidor<CampoDelInquilino>(err, {
        campos: CAMPOS_DEL_INQUILINO,
        accion: 'crear el inquilino',
      });
      if (reparto.orden.length > 0) {
        setDelServidor(reparto.porCampo);
        document.getElementById(ID_DEL_CAMPO[reparto.orden[0]])?.focus();
      }
      /*
       * I-20 (QA-INQ, 03-10): dos rechazos del back SIN `campos[]` que sí son
       * de un campo, y van bajo él (no al toast):
       *  · `FALTA_CORREO_DEL_TERCERO` → bajo Correo (la política de la
       *    inmobiliaria);
       *  · el 409 de la persona repetida → bajo el campo que chocó (lo dice
       *    `campo`), con el enlace que la abre.
       */
      let sueltos = reparto.sueltos;
      if (reparto.orden.length === 0 && err instanceof ApiError) {
        const choqueDelServidor = choqueConOtraPersona(err);
        const frase = mensajeParaLaPersona(err, { accion: editando ? 'guardar sus datos' : 'crear el inquilino' });
        const campoDelServidor = campoDelRechazo(err);
        if (choqueDelServidor && onVerExistente) {
          setDelServidor({ [choqueDelServidor.campo]: frase });
          setChoque({
            campo: choqueDelServidor.campo,
            llave: form[choqueDelServidor.campo].trim(),
            tenantId: choqueDelServidor.tenantId,
          });
          enfocar(choqueDelServidor.campo);
          sueltos = [];
        } else if (campoDelServidor) {
          setDelServidor({ [campoDelServidor]: frase });
          enfocar(campoDelServidor);
          sueltos = [];
        }
      }
      if (sueltos.length > 0) {
        toast.error(editando ? 'No se pudieron guardar sus datos' : 'No se pudo crear el inquilino', {
          description: sueltos.join(' · '),
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={abierto} onOpenChange={onOpenChange} ancho="sm:max-w-xl">
      <CajonCabecera
        titulo={editando ? 'Editar datos' : 'Nuevo inquilino'}
        descripcion={
          editando
            ? `Corrige los datos de ${editando.nombre}. Sus contratos y su estado de cuenta no cambian.`
            : 'La persona queda cargada en tu inmobiliaria. Empieza a cobrar cuando tenga su contrato.'
        }
      />

      <CajonCuerpo>
        <div className="space-y-4" data-testid="nuevo-inquilino">
          <Campo id={ID_DEL_CAMPO.nombre} label="Nombre completo" error={errorDe('nombre')}>
            <Input
              {...control('nombre')}
              value={form.nombre}
              onBlur={() => dejar('nombre')}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="María Fernanda Ruiz"
              data-testid="inquilino-nombre"
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <Campo id={ID_DEL_CAMPO.tipoDocumento} label="Tipo de documento" error={errorDe('tipoDocumento')}>
              <Select
                value={form.tipoDocumento}
                onValueChange={(v) => set('tipoDocumento', v as TipoDeDocumento)}
              >
                <SelectTrigger {...control('tipoDocumento')} data-testid="inquilino-tipo-documento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id={ID_DEL_CAMPO.documento}
              label="Número de documento"
              error={errorDe('documento')}
              hint={form.tipoDocumento === 'NIT' ? 'Con el dígito de verificación: 900123456-8.' : undefined}
              extra={
                choque?.campo === 'documento' && onVerExistente ? (
                  <EnlaceAlExistente onClick={() => onVerExistente({ llave: choque.llave, tenantId: choque.tenantId })} />
                ) : null
              }
            >
              <Input
                {...control('documento', 'inquilino-llave-error')}
                value={form.documento}
                onBlur={() => dejar('documento')}
                onChange={(e) => set('documento', e.target.value)}
                placeholder={form.tipoDocumento === 'NIT' ? '900123456-8' : '1020304050'}
                inputMode={form.tipoDocumento === 'NIT' ? 'text' : 'numeric'}
                data-testid="inquilino-documento"
              />
            </Campo>
          </div>

          <Campo
            id={ID_DEL_CAMPO.correo}
            label="Correo"
            // I-18: la política se dice desde el principio, no al fallar.
            marca={correoObligatorio ? 'Obligatorio' : undefined}
            hint={
              correoObligatorio
                ? 'Tu inmobiliaria pide el correo de cada inquilino. Con él le creamos su cuenta del portal y le mandamos la invitación.'
                : 'Con el correo le creamos su cuenta del portal y le mandamos la invitación.'
            }
            error={errorDe('correo')}
            extra={
              choque?.campo === 'correo' && onVerExistente ? (
                <EnlaceAlExistente onClick={() => onVerExistente({ llave: choque.llave, tenantId: choque.tenantId })} />
              ) : null
            }
          >
            <Input
              {...control('correo', 'inquilino-llave-error')}
              type="email"
              value={form.correo}
              aria-required={correoObligatorio || undefined}
              onBlur={() => dejar('correo')}
              onChange={(e) => set('correo', e.target.value)}
              placeholder="maria@ejemplo.co"
              data-testid="inquilino-correo"
            />
          </Campo>

          <Campo id={ID_DEL_CAMPO.telefono} label="Teléfono" hint="Opcional" error={errorDe('telefono')}>
            <Input
              {...control('telefono')}
              value={form.telefono}
              onBlur={() => dejar('telefono')}
              onChange={(e) => set('telefono', e.target.value)}
              placeholder="3001234567"
              inputMode="tel"
              data-testid="inquilino-telefono"
            />
          </Campo>

          {/* Correo O documento: el error es de los dos campos, que lo nombran
              en su `aria-describedby`. */}
          <div data-testid="inquilino-error-llave">
            <ErrorDelCampo id="inquilino-llave-error" mensaje={tocado ? errores.llave : undefined} className="mt-0" />
          </div>
        </div>
      </CajonCuerpo>

      <CajonPie>
        <Button
          type="button"
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => onOpenChange(false)}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          hideArrow
          onClick={() => void guardar()}
          disabled={guardando}
          data-testid="inquilino-guardar"
        >
          {editando ? 'Guardar cambios' : 'Crear inquilino'}
        </Button>
      </CajonPie>
    </Cajon>
  );
}

/**
 * Etiqueta, control y su error. El error entra suave con `ErrorDelCampo` y,
 * si hay ayuda, la reemplaza con un cruce (02-10-2026). `id` es el del
 * control: el error es `${id}-error`, el que nombra su `aria-describedby`.
 */
function Campo({
  id,
  label,
  hint,
  error,
  marca,
  extra,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Una marca junto a la etiqueta («Obligatorio»). */
  marca?: string;
  /** Algo bajo el error (el enlace a la persona con la que chocó). */
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-fg">
        {label}
        {/* El espacio va en el texto (no sólo en el margen): «Correo (obligatorio)». */}
        {marca ? <span className="font-normal text-fg-muted">{' '}({marca.toLowerCase()})</span> : null}
      </label>
      {children}
      <ErrorDelCampo id={`${id}-error`} mensaje={error} pista={hint} className="mt-0" />
      {extra}
    </div>
  );
}

/** I-20: bajo el campo que chocó, el camino a la persona que ya está. */
function EnlaceAlExistente({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      hideArrow
      className="h-auto gap-1 px-0 text-caption"
      onClick={onClick}
      data-testid="inquilino-ver-existente"
    >
      Ver a esa persona
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  );
}
