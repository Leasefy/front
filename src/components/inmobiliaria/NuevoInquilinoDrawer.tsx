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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ApiError } from '@/lib/api/client';
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
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

/** Qué falta. Vacío = se puede guardar. Mismas reglas que el back. */
export function validarInquilino(f: InquilinoForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.nombre.trim().length < 2) e.nombre = 'Escribí el nombre del inquilino.';

  const correo = f.correo.trim();
  if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    e.correo = 'Revisá el correo: falta el @ o el dominio.';
  }
  if (!correo && !f.documento.trim()) {
    e.llave =
      'Poné al menos el correo o el documento: es con lo que después lo encontramos al hacerle el contrato.';
  }
  return e;
}

export function NuevoInquilinoDrawer({ abierto, onOpenChange, onCreado }: Props) {
  const [form, setForm] = useState<InquilinoForm>(INQUILINO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (abierto) {
      setForm(INQUILINO_VACIO);
      setTocado(false);
    }
  }, [abierto]);

  const errores = validarInquilino(form);
  const valido = Object.keys(errores).length === 0 && !guardando;
  const set = <K extends keyof InquilinoForm>(k: K, v: InquilinoForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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
       * El 409 del back trae el nombre de quien ya está y con qué llave chocó.
       * Se muestra tal cual: «no se pudo» sin decir con quién chocó deja a la
       * persona cambiando el campo equivocado.
       */
      toast.error('No se pudo crear el inquilino', {
        description:
          err instanceof ApiError && err.message.length < 200 ? err.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-lenis-prevent>
        <SheetHeader className="space-y-1 border-b border-border pb-4">
          <SheetTitle className="text-lg font-semibold text-fg">Nuevo inquilino</SheetTitle>
          <SheetDescription className="text-sm text-fg-muted">
            La persona queda cargada en tu inmobiliaria. Empieza a cobrar cuando tenga su
            contrato.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4" data-testid="nuevo-inquilino">
          <Campo label="Nombre completo" error={tocado && errores.nombre}>
            <Input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="María Fernanda Ruiz"
              maxLength={120}
              data-testid="inquilino-nombre"
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <Campo label="Tipo de documento">
              <Select
                value={form.tipoDocumento}
                onValueChange={(v) => set('tipoDocumento', v as TipoDeDocumento)}
              >
                <SelectTrigger data-testid="inquilino-tipo-documento">
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

            <Campo label="Número de documento">
              <Input
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
                placeholder="1020304050"
                maxLength={30}
                inputMode="numeric"
                data-testid="inquilino-documento"
              />
            </Campo>
          </div>

          <Campo
            label="Correo"
            hint="Con el correo le creamos su cuenta del portal y le mandamos la invitación."
            error={tocado && errores.correo}
          >
            <Input
              type="email"
              value={form.correo}
              onChange={(e) => set('correo', e.target.value)}
              placeholder="maria@ejemplo.co"
              maxLength={160}
              data-testid="inquilino-correo"
            />
          </Campo>

          <Campo label="Teléfono" hint="Opcional">
            <Input
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              placeholder="3001234567"
              maxLength={30}
              inputMode="tel"
              data-testid="inquilino-telefono"
            />
          </Campo>

          {tocado && errores.llave ? (
            <p className="text-xs text-danger" data-testid="inquilino-error-llave">
              {errores.llave}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Campo({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-fg">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
