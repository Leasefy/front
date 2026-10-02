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
import { ApiError } from '@/lib/api/client';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  inquilinosApi,
  type Inquilino,
  type TipoDeDocumento,
} from '@/lib/api/inquilinos.service';

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** La lista se refresca con la persona ya creada. */
  onCreado: (inquilino: Inquilino) => void;
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
export function validarInquilino(f: InquilinoForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.nombre.trim().length < 2) e.nombre = 'Escribe el nombre del inquilino.';

  const correo = f.correo.trim();
  if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    e.correo = 'Revisa el correo: falta el @ o el dominio.';
  }
  if (!correo && !f.documento.trim()) {
    e.llave =
      'Pon al menos el correo o el documento: es con lo que después lo encontramos al hacerle el contrato.';
  }
  return e;
}

export function NuevoInquilinoDrawer({ abierto, onOpenChange, onCreado }: Props) {
  const [form, setForm] = useState<InquilinoForm>(INQUILINO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);
  /**
   * Lo que el back rechazó POR CAMPO (02-10-2026): un 400 `DATOS_INVALIDOS`
   * trae `campos[]` y cada uno va bajo SU campo hasta que se lo corrige.
   */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDelInquilino, string>>>({});

  useEffect(() => {
    if (abierto) {
      setForm(INQUILINO_VACIO);
      setTocado(false);
      setDelServidor({});
    }
  }, [abierto]);

  const errores = validarInquilino(form);
  const valido = Object.keys(errores).length === 0 && !guardando;
  const set = <K extends keyof InquilinoForm>(k: K, v: InquilinoForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDelServidor((antes) => {
      if (!antes[k]) return antes;
      const { [k]: _quitado, ...resto } = antes;
      return resto;
    });
  };
  /** El error que se ve en un campo: el del servidor, o el del cliente tras intentar guardar. */
  const errorDe = (k: CampoDelInquilino): string | undefined =>
    delServidor[k] ?? (tocado ? (errores[k] as string | undefined) : undefined);
  /** `id`, `aria-invalid` y `aria-describedby` de un control con su error. */
  const control = (k: CampoDelInquilino, tambien?: string) => ({
    id: ID_DEL_CAMPO[k],
    'aria-invalid': Boolean(errorDe(k)) || undefined,
    'aria-describedby': [`${ID_DEL_CAMPO[k]}-error`, tambien].filter(Boolean).join(' '),
  });

  const guardar = async () => {
    setTocado(true);
    if (!valido) return;
    setGuardando(true);
    try {
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
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo crear el inquilino', { description: reparto.sueltos.join(' · ') });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={abierto} onOpenChange={onOpenChange} ancho="sm:max-w-xl">
      <CajonCabecera
        titulo="Nuevo inquilino"
        descripcion="La persona queda cargada en tu inmobiliaria. Empieza a cobrar cuando tenga su contrato."
      />

      <CajonCuerpo>
        <div className="space-y-4" data-testid="nuevo-inquilino">
          <Campo id={ID_DEL_CAMPO.nombre} label="Nombre completo" error={errorDe('nombre')}>
            <Input
              {...control('nombre')}
              value={form.nombre}
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

            <Campo id={ID_DEL_CAMPO.documento} label="Número de documento" error={errorDe('documento')}>
              <Input
                {...control('documento', 'inquilino-llave-error')}
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
                placeholder="1020304050"
                inputMode="numeric"
                data-testid="inquilino-documento"
              />
            </Campo>
          </div>

          <Campo
            id={ID_DEL_CAMPO.correo}
            label="Correo"
            hint="Con el correo le creamos su cuenta del portal y le mandamos la invitación."
            error={errorDe('correo')}
          >
            <Input
              {...control('correo', 'inquilino-llave-error')}
              type="email"
              value={form.correo}
              onChange={(e) => set('correo', e.target.value)}
              placeholder="maria@ejemplo.co"
              data-testid="inquilino-correo"
            />
          </Campo>

          <Campo id={ID_DEL_CAMPO.telefono} label="Teléfono" hint="Opcional" error={errorDe('telefono')}>
            <Input
              {...control('telefono')}
              value={form.telefono}
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
          Crear inquilino
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
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-fg">
        {label}
      </label>
      {children}
      <ErrorDelCampo id={`${id}-error`} mensaje={error} pista={hint} className="mt-0" />
    </div>
  );
}
