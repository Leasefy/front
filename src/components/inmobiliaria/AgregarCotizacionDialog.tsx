'use client';

import { useEffect, useRef, useState } from 'react';
import { CurrencyCircleDollar } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import {
  repartirErroresDelServidor,
  traeErroresPorCampo,
} from '@/lib/errores/errores-en-el-formulario';
import {
  MAX_DIAS_ESTIMADOS,
  MAX_LARGO_NOMBRE_DEL_PROVEEDOR,
  MAX_LARGO_TELEFONO_DEL_PROVEEDOR,
  errorDeLosDiasEstimados,
  errorDelValorDeLaCotizacion,
} from '@/lib/mantenimiento/limites-del-mantenimiento';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, Input, Textarea } from '@/components/ui';
import { MoneyInput } from '@/components/ui/money-input';
import { Combobox } from '@/components/ui/combobox';
import {
  proveedoresDeMantenimientoApi,
  type ProveedorDeMantenimiento,
} from '@/lib/api/proveedores-de-mantenimiento.service';
import { EN_PALABRAS } from '@/components/mantenimientos/especialidades';
import { useI18n } from '@/lib/i18n';
import type { NuevaCotizacion, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

export interface AgregarCotizacionDialogProps {
  /** La solicitud que se está cotizando. `null` = el diálogo no tiene sujeto. */
  solicitud: SolicitudMantenimiento | null;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /**
   * Guardar. Se espera la promesa: mientras viaja, el botón queda ocupado y el
   * diálogo abierto. Si el back rechaza, el diálogo NO se cierra — cerrarlo
   * borraría lo que la persona acaba de escribir. Un rechazo con `campos` lo
   * pinta el diálogo bajo cada campo; el resto lo avisa quien guarda.
   */
  onGuardar: (solicitudId: string, cotizacion: NuevaCotizacion) => Promise<void>;
}

type CampoDeLaCotizacion =
  | 'providerName'
  | 'documento'
  | 'providerPhone'
  | 'amount'
  | 'description'
  | 'estimatedDays';

/** En el orden en que se ven: el foco va al primero con error. */
const CAMPOS: readonly CampoDeLaCotizacion[] = [
  'providerName',
  'documento',
  'providerPhone',
  'amount',
  'estimatedDays',
  'description',
];

/** El id de cada control, para el foco y el `aria-describedby`. */
const ID_DEL_CAMPO: Record<CampoDeLaCotizacion, string> = {
  providerName: 'cotizacion-proveedor',
  documento: 'cotizacion-documento',
  providerPhone: 'cotizacion-telefono',
  amount: 'cotizacion-monto',
  estimatedDays: 'cotizacion-dias',
  description: 'cotizacion-alcance',
};

/** Los cinco campos, tal como los guarda `MantenimientoQuote`. */
/** La opción de la lista que abre el registro de un proveedor nuevo. */
const NUEVO = '__nuevo__';

/** El oficio del back para la solicitud (`plumbing` → `PLUMBING`). */
const oficioDelBack = (tipo: string) =>
  tipo === 'other' ? 'OTHER_MAINT' : tipo.toUpperCase();

const VACIO = {
  providerName: '',
  documento: '',
  providerPhone: '',
  amount: '',
  description: '',
  estimatedDays: '1',
};

/**
 * Agregarle una cotización a una solicitud de mantenimiento YA creada.
 *
 * 🔴 POR QUÉ EXISTE: el back tenía `POST /inmobiliaria/mantenimiento/:id/quote`
 * desde el principio, y ninguna pantalla lo llamaba. «Nueva cotización» en el
 * detalle disparaba `toast.info('función en desarrollo')` (Nico, 2026-09-12:
 * «no deja agregar la cotización a un mantenimiento ya creado. Crea toda esa
 * funcionalidad»).
 *
 * Los campos son EXACTAMENTE las cinco columnas del modelo: proveedor,
 * teléfono, monto, qué incluye y días estimados. No hay adjunto ni vigencia
 * porque `MantenimientoQuote` no los guarda, y un campo que la pantalla pide y
 * la base tira es una promesa rota escrita a mano.
 */
export function AgregarCotizacionDialog({
  solicitud,
  abierto,
  onOpenChange,
  onGuardar,
}: AgregarCotizacionDialogProps) {
  const { t } = useI18n();
  const [campos, setCampos] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaCotizacion, string>>>({});
  const [guardando, setGuardando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  /*
   * 🔴 SO-08 (QA 04-10): el proveedor se ESCOGE de los registrados (o se
   * registra aquí mismo). Antes era texto libre: «Plomería QA Día S.A.S.»
   * estaba en Proveedores y no aparecía, no se revisaban sus papeles y no
   * quedaba unido para calificarlo al cerrar.
   */
  const [proveedores, setProveedores] = useState<ProveedorDeMantenimiento[]>([]);
  const [proveedorId, setProveedorId] = useState<string | undefined>(undefined);
  const [registrando, setRegistrando] = useState(false);

  /** Escribir en un campo borra su error: el dato ya no es el que se rechazó. */
  const poner = (campo: CampoDeLaCotizacion, valor: string) => {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErrores((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  };
  const enfocar = (campo: CampoDeLaCotizacion | undefined) => {
    if (campo) contenedor.current?.querySelector<HTMLElement>(`#${ID_DEL_CAMPO[campo]}`)?.focus();
  };
  const aria = (campo: CampoDeLaCotizacion) =>
    errores[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${ID_DEL_CAMPO[campo]}-error` }
      : { 'aria-invalid': false as const };

  // Cada apertura arranca en blanco: si no, la segunda cotización sale con los
  // datos del proveedor de la primera ya escritos y es facilísimo mandarla así.
  useEffect(() => {
    if (abierto) {
      setCampos(VACIO);
      setErrores({});
      setGuardando(false);
      setProveedorId(undefined);
      setRegistrando(false);
      let vivo = true;
      proveedoresDeMantenimientoApi
        .listar({ activos: true })
        .then((lista) => {
          if (!vivo) return;
          const activos = Array.isArray(lista) ? lista : [];
          setProveedores(activos);
          // Sin ninguno registrado, el registro rápido de una vez.
          if (activos.length === 0) setRegistrando(true);
        })
        .catch(() => {
          if (!vivo) return;
          setProveedores([]);
          setRegistrando(true);
        });
      return () => {
        vivo = false;
      };
    }
    return undefined;
  }, [abierto]);

  /** Los del oficio de la solicitud primero; luego los demás. */
  const oficio = solicitud ? oficioDelBack(solicitud.type) : '';
  const ordenados = [...proveedores].sort(
    (a, b) =>
      Number(b.especialidades.includes(oficio)) - Number(a.especialidades.includes(oficio)) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
  const opcionesDeProveedor = [
    ...ordenados.map((p) => ({
      value: p.id,
      label: [
        p.nombre,
        p.especialidades.map((e) => EN_PALABRAS.get(e) ?? e).join(', '),
        p.calificacion !== null ? `${p.calificacion.toFixed(1)} ★` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    { value: NUEVO, label: '+ Registrar un proveedor nuevo' },
  ];
  const elegido = proveedores.find((p) => p.id === proveedorId) ?? null;

  const escoger = (valor: string | undefined) => {
    setErrores((e) => (e.providerName ? { ...e, providerName: undefined } : e));
    if (valor === NUEVO) {
      setRegistrando(true);
      setProveedorId(undefined);
      return;
    }
    setProveedorId(valor);
    const p = proveedores.find((x) => x.id === valor);
    if (p) setCampos((c) => ({ ...c, providerName: p.nombre, providerPhone: p.telefono ?? '' }));
  };

  if (!solicitud) return null;

  /*
   * Lo vacío lo dice el diálogo con sus frases; los topes, con las MISMAS del
   * back (`lib/mantenimiento/limites-del-mantenimiento.ts`): una cotización de
   * once cifras se ataja acá antes de viajar.
   */
  const validar = () => {
    const nuevos: Partial<Record<CampoDeLaCotizacion, string>> = {};
    if (registrando) {
      if (!campos.providerName.trim()) {
        nuevos.providerName = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorProveedor');
      }
      if (!campos.documento.trim()) {
        nuevos.documento = 'Escribe el NIT o la cédula del proveedor.';
      }
    } else if (!proveedorId) {
      nuevos.providerName = 'Escoge el proveedor de la lista o regístralo.';
    }
    if (!campos.amount || Number(campos.amount) <= 0) {
      nuevos.amount = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorMonto');
    } else {
      const delValor = errorDelValorDeLaCotizacion(Number(campos.amount));
      if (delValor) nuevos.amount = delValor;
    }
    if (!campos.description.trim()) {
      nuevos.description = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorAlcance');
    }
    if (!campos.estimatedDays || Number(campos.estimatedDays) < 1) {
      nuevos.estimatedDays = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorDias');
    } else {
      const deLosDias = errorDeLosDiasEstimados(Number(campos.estimatedDays));
      if (deLosDias) nuevos.estimatedDays = deLosDias;
    }
    setErrores(nuevos);
    enfocar(CAMPOS.find((c) => nuevos[c]));
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    if (guardando || !validar()) return;

    setGuardando(true);
    try {
      let id = proveedorId;
      if (registrando) {
        // El registro rápido: queda en Proveedores con el oficio de la solicitud.
        const nuevo = await proveedoresDeMantenimientoApi.crear({
          nombre: campos.providerName.trim(),
          documento: campos.documento.trim(),
          ...(campos.providerPhone.trim() ? { telefono: campos.providerPhone.trim() } : {}),
          especialidades: [oficio],
        });
        id = nuevo.id;
        setProveedores((l) => [...l, nuevo]);
        setProveedorId(nuevo.id);
        setRegistrando(false);
      }
      await onGuardar(solicitud.id, {
        proveedorId: id,
        providerName: campos.providerName.trim(),
        // El teléfono es opcional en la columna: vacío se omite, no viaja `''`.
        providerPhone: campos.providerPhone.trim() || undefined,
        amount: Number(campos.amount),
        description: campos.description.trim(),
        estimatedDays: Number(campos.estimatedDays),
      });
      onOpenChange(false);
    } catch (err) {
      // Un 400 con `campos` va bajo cada campo, con el foco en el primero
      // (02-10-2026). Lo demás —un 409, un 5xx, la red— lo avisa quien guardó;
      // acá sólo se devuelve el control para corregir sin volver a teclear.
      if (traeErroresPorCampo(err)) {
        const reparto = repartirErroresDelServidor<CampoDeLaCotizacion>(err, {
          campos: CAMPOS,
          accion: 'guardar la cotización',
        });
        setErrores(reparto.porCampo);
        enfocar(reparto.orden[0]);
        if (reparto.sueltos.length > 0) {
          toast.error('No se pudo guardar la cotización', { description: reparto.sueltos.join(' · ') });
        }
      }
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cotizacion-dialogo">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.mantenimiento.nuevaCotizacion.titulo')}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.mantenimiento.nuevaCotizacion.descripcion')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" ref={contenedor}>
          {/* De qué solicitud estamos hablando: el diálogo se abre desde el
              tablero, desde la lista y desde el detalle, y sin esto no hay
              forma de saber sobre cuál se está cotizando. */}
          <div className="flex items-center gap-2 rounded-[14px] border border-border px-3 py-2 text-sm text-fg-muted">
            <CurrencyCircleDollar className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {solicitud.title} · {solicitud.propertyTitle}
            </span>
          </div>

          {registrando ? (
            <div className="space-y-3 rounded-[14px] border border-border p-3" data-testid="cotizacion-proveedor-nuevo">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-fg">Registrar un proveedor nuevo</p>
                {proveedores.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setRegistrando(false)}
                  >
                    Escoger de los registrados
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="cotizacion-proveedor"
                  className="block text-sm font-medium text-fg dark:text-fg-subtle"
                >
                  {t('inmobiliaria.mantenimiento.nuevaCotizacion.proveedor')}{' '}
                  <span className="text-danger">*</span>
                </label>
                <Input
                  id="cotizacion-proveedor"
                  aria-required="true"
                  value={campos.providerName}
                  maxLength={MAX_LARGO_NOMBRE_DEL_PROVEEDOR}
                  onChange={(e) => poner('providerName', e.target.value)}
                  placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.proveedorPlaceholder')}
                  {...aria('providerName')}
                />
                <ErrorDelCampo id="cotizacion-proveedor-error" mensaje={errores.providerName} />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="cotizacion-documento"
                  className="block text-sm font-medium text-fg dark:text-fg-subtle"
                >
                  NIT o cédula <span className="text-danger">*</span>
                </label>
                <Input
                  id="cotizacion-documento"
                  aria-required="true"
                  value={campos.documento}
                  maxLength={20}
                  onChange={(e) => poner('documento', e.target.value)}
                  placeholder="900123456"
                  {...aria('documento')}
                />
                <ErrorDelCampo id="cotizacion-documento-error" mensaje={errores.documento} />
                <p className="text-xs text-fg-muted">
                  Queda en Proveedores; ahí le subes el RUT y la seguridad social.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-fg dark:text-fg-subtle">
                {t('inmobiliaria.mantenimiento.nuevaCotizacion.proveedor')}{' '}
                <span className="text-danger">*</span>
              </label>
              <Combobox
                data-testid="cotizacion-proveedor-lista"
                value={proveedorId}
                onChange={escoger}
                options={opcionesDeProveedor}
                placeholder="Escoge un proveedor registrado"
                searchPlaceholder="Buscar por nombre u oficio"
                invalid={Boolean(errores.providerName)}
              />
              <ErrorDelCampo id="cotizacion-proveedor-error" mensaje={errores.providerName} />
              {elegido && elegido.avisos.length > 0 && (
                <p className="text-xs text-warning" data-testid="cotizacion-proveedor-avisos">
                  {elegido.avisos.join(' · ')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="cotizacion-telefono"
              className="block text-sm font-medium text-fg dark:text-fg-subtle"
            >
              {t('inmobiliaria.mantenimiento.nuevaCotizacion.telefono')}{' '}
              <span className="text-fg-subtle font-normal">
                ({t('inmobiliaria.mantenimiento.nuevaCotizacion.opcional')})
              </span>
            </label>
            {/* 20 caracteres es el tope de la columna `provider_phone`: sin
                esto, un número más largo vuelve como 400 después de haber
                escrito todo lo demás. */}
            <Input
              id="cotizacion-telefono"
              inputMode="tel"
              maxLength={MAX_LARGO_TELEFONO_DEL_PROVEEDOR}
              value={campos.providerPhone}
              onChange={(e) => poner('providerPhone', e.target.value)}
              placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.telefonoPlaceholder')}
              {...aria('providerPhone')}
            />
            <ErrorDelCampo id="cotizacion-telefono-error" mensaje={errores.providerPhone} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="cotizacion-monto"
                className="block text-sm font-medium text-fg dark:text-fg-subtle"
              >
                {t('inmobiliaria.mantenimiento.nuevaCotizacion.monto')}{' '}
                <span className="text-danger">*</span>
              </label>
              <MoneyInput
                id="cotizacion-monto"
                aria-required="true"
                value={campos.amount}
                onChange={(crudo) => poner('amount', crudo)}
                {...aria('amount')}
              />
              <ErrorDelCampo id="cotizacion-monto-error" mensaje={errores.amount} />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="cotizacion-dias"
                className="block text-sm font-medium text-fg dark:text-fg-subtle"
              >
                {t('inmobiliaria.mantenimiento.nuevaCotizacion.dias')}{' '}
                <span className="text-danger">*</span>
              </label>
              <Input
                id="cotizacion-dias"
                aria-required="true"
                type="number"
                min={1}
                max={MAX_DIAS_ESTIMADOS}
                value={campos.estimatedDays}
                onChange={(e) => poner('estimatedDays', e.target.value)}
                {...aria('estimatedDays')}
              />
              <ErrorDelCampo id="cotizacion-dias-error" mensaje={errores.estimatedDays} />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cotizacion-alcance"
              className="block text-sm font-medium text-fg dark:text-fg-subtle"
            >
              {t('inmobiliaria.mantenimiento.nuevaCotizacion.alcance')}{' '}
              <span className="text-danger">*</span>
            </label>
            <Textarea
              id="cotizacion-alcance"
              aria-required="true"
              value={campos.description}
              onChange={(e) => poner('description', e.target.value)}
              placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.alcancePlaceholder')}
              className="w-full min-h-[90px] resize-none"
              {...aria('description')}
            />
            <ErrorDelCampo id="cotizacion-alcance-error" mensaje={errores.description} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            {t('inmobiliaria.mantenimiento.cancel')}
          </Button>
          <Button
            hideArrow
            onClick={guardar}
            isLoading={guardando}
            data-testid="cotizacion-guardar"
          >
            {guardando
              ? t('inmobiliaria.mantenimiento.nuevaCotizacion.guardando')
              : t('inmobiliaria.mantenimiento.nuevaCotizacion.guardar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgregarCotizacionDialog;
