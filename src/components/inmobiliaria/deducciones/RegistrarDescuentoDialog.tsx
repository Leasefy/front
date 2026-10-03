'use client';

/**
 * Registrar un descuento manual al propietario: servicios, predial, un gasto que
 * la inmobiliaria pagó por él.
 *
 * Nico y Juan Camilo (2026-09-16): **motivo Y soporte obligatorios**. El
 * propietario lo ve en su extracto con el soporte adjunto; sin soporte no tiene
 * con qué revisarlo y la inmobiliaria no tiene con qué defenderlo. El back
 * rechaza igual (400) — acá se dice antes de mandar, para no perder lo escrito.
 *
 * El descuento entra en la PRIMERA liquidación sin pagar del propietario desde
 * este mes. Eso lo decide el back con su regla; la pantalla no lo calcula.
 */

import { useEffect, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { MoneyInput } from '@/components/ui/money-input';
import { useI18n } from '@/lib/i18n';
import type { NuevoDescuento } from '@/lib/types/deducciones';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SelectorDeArchivo } from '@/components/ui/selector-de-archivo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';

/** Lo que el back acepta como soporte. */
export const TIPOS_DE_SOPORTE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES_DEL_SOPORTE = 10 * 1024 * 1024;

/** Los campos del formulario. */
export type CampoDelDescuento = 'motivo' | 'valor' | 'consignacionId' | 'soporte';

/**
 * El nombre del campo en el back → el del formulario (02-10-2026). Un 400
 * `DATOS_INVALIDOS` trae `campos[]` con los nombres del DTO; cada uno va bajo
 * SU campo y lo que no tiene campo acá va al toast de quien guardó.
 */
export const CAMPOS_DEL_DESCUENTO_EN_EL_BACK: Record<string, CampoDelDescuento> = {
  motivo: 'motivo',
  valorCop: 'valor',
  consignacionId: 'consignacionId',
  soporte: 'soporte',
  archivo: 'soporte',
};
export const CAMPOS_DEL_DESCUENTO: readonly CampoDelDescuento[] = ['motivo', 'valor', 'consignacionId', 'soporte'];

/** El `id` de cada campo en el formulario. */
const ID_DEL_CAMPO: Record<CampoDelDescuento, string> = {
  motivo: 'descuento-motivo',
  valor: 'descuento-valor',
  consignacionId: 'descuento-inmueble',
  soporte: 'descuento-soporte',
};

/** Lo que va a un toast al registrar: sólo lo que no tiene campo en el formulario. */
export function loSueltoAlRegistrar(error: unknown): string[] {
  return repartirErroresDelServidor<CampoDelDescuento>(error, {
    mapa: CAMPOS_DEL_DESCUENTO_EN_EL_BACK,
    campos: CAMPOS_DEL_DESCUENTO,
    accion: 'registrar el descuento',
  }).sueltos;
}

export interface InmuebleParaElDescuento {
  consignacionId: string;
  titulo: string;
}

export interface RegistrarDescuentoDialogProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Los inmuebles del propietario, para asociar el descuento (opcional). */
  inmuebles: InmuebleParaElDescuento[];
  /**
   * Guardar. Se espera la promesa: si el back rechaza, el diálogo NO se cierra
   * y lo escrito se conserva.
   */
  onGuardar: (descuento: NuevoDescuento) => Promise<void>;
}

export function RegistrarDescuentoDialog({
  abierto,
  onOpenChange,
  inmuebles,
  onGuardar,
}: RegistrarDescuentoDialogProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.nuevo.${s}`;
  const [motivo, setMotivo] = useState('');
  const [valor, setValor] = useState('');
  const [consignacionId, setConsignacionId] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  const [errores, setErrores] = useState<Partial<Record<CampoDelDescuento, string>>>({});
  const [guardando, setGuardando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  /** Al corregir un campo, su error se va. */
  const limpiar = (campo: CampoDelDescuento) =>
    setErrores((antes) => {
      if (!antes[campo]) return antes;
      const { [campo]: _quitado, ...resto } = antes;
      return resto;
    });

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setValor('');
      setConsignacionId('');
      setSoporte(null);
      setErrores({});
      setGuardando(false);
    }
  }, [abierto]);

  /*
   * 🔴 P-27 (QA-PROP, 03-10): al enviar con errores el foco se quedaba en el
   * botón y el primer error podía quedar fuera de la vista. Va al primer campo
   * con error, en el orden del formulario (el del soporte es su botón «Elegir
   * archivo»: el input de verdad está escondido).
   */
  const enfocarElPrimero = (orden: readonly CampoDelDescuento[]) => {
    const primero = CAMPOS_DEL_DESCUENTO.find((c) => orden.includes(c));
    if (!primero) return;
    const el =
      primero === 'soporte'
        ? raiz.current?.querySelector<HTMLElement>('[data-testid="descuento-soporte-selector"] button')
        : raiz.current?.querySelector<HTMLElement>(`#${ID_DEL_CAMPO[primero]}`);
    el?.focus();
    el?.scrollIntoView?.({ block: 'center' });
  };

  const validar = () => {
    const nuevos: Partial<Record<CampoDelDescuento, string>> = {};
    if (motivo.trim().length < 3) nuevos.motivo = t(k('faltaMotivo'));
    if (!valor || Number(valor) <= 0) nuevos.valor = t(k('faltaValor'));
    if (!soporte) nuevos.soporte = t(k('faltaSoporte'));
    else if (!TIPOS_DE_SOPORTE.includes(soporte.type)) nuevos.soporte = t(k('soporteTipo'));
    else if (soporte.size > MAX_BYTES_DEL_SOPORTE) nuevos.soporte = t(k('soporteMuyPesado'));
    setErrores(nuevos);
    enfocarElPrimero(Object.keys(nuevos) as CampoDelDescuento[]);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    if (guardando || !validar() || !soporte) return;
    setGuardando(true);
    try {
      await onGuardar({
        motivo: motivo.trim(),
        valorCop: Number(valor),
        consignacionId: consignacionId || null,
        soporte,
      });
      onOpenChange(false);
    } catch (e) {
      // Lo que el back rechazó POR CAMPO va bajo su campo, con el foco en el
      // primero; lo demás (un 5xx, la red) lo dice quien guardó, en un toast.
      const reparto = repartirErroresDelServidor<CampoDelDescuento>(e, {
        mapa: CAMPOS_DEL_DESCUENTO_EN_EL_BACK,
        campos: CAMPOS_DEL_DESCUENTO,
      });
      if (reparto.orden.length > 0) {
        setErrores(reparto.porCampo);
        const id = ID_DEL_CAMPO[reparto.orden[0]];
        raiz.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
      }
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="registrar-descuento">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4" ref={raiz}>
          <div className="space-y-2">
            <label htmlFor="descuento-motivo" className="block text-sm font-medium text-fg">
              {t(k('motivo'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="descuento-motivo"
              aria-required="true"
              value={motivo}
              maxLength={500}
              onChange={(e) => {
                setMotivo(e.target.value);
                limpiar('motivo');
              }}
              placeholder={t(k('motivoPlaceholder'))}
              aria-invalid={Boolean(errores.motivo) || undefined}
              aria-describedby="descuento-motivo-error"
            />
            <ErrorDelCampo id="descuento-motivo-error" mensaje={errores.motivo} pista={t(k('motivoAyuda'))} className="mt-0" />
          </div>

          <div className="space-y-2">
            <label htmlFor="descuento-valor" className="block text-sm font-medium text-fg">
              {t(k('valor'))} <span className="text-danger">*</span>
            </label>
            <MoneyInput
              id="descuento-valor"
              aria-required="true"
              value={valor}
              onChange={(crudo) => {
                setValor(crudo);
                limpiar('valor');
              }}
              aria-invalid={Boolean(errores.valor) || undefined}
              aria-describedby="descuento-valor-error"
            />
            <ErrorDelCampo id="descuento-valor-error" mensaje={errores.valor} className="mt-0" />
          </div>

          {inmuebles.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="descuento-inmueble" className="block text-sm font-medium text-fg">
                {t(k('inmueble'))}
              </label>
              <select
                id="descuento-inmueble"
                value={consignacionId}
                onChange={(e) => {
                  setConsignacionId(e.target.value);
                  limpiar('consignacionId');
                }}
                aria-invalid={Boolean(errores.consignacionId) || undefined}
                aria-describedby="descuento-inmueble-error"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              >
                <option value="">{t(k('inmuebleNinguno'))}</option>
                {inmuebles.map((i) => (
                  <option key={i.consignacionId} value={i.consignacionId}>
                    {i.titulo}
                  </option>
                ))}
              </select>
              <ErrorDelCampo
                id="descuento-inmueble-error"
                mensaje={errores.consignacionId}
                pista={t(k('inmuebleAyuda'))}
                className="mt-0"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="descuento-soporte" className="block text-sm font-medium text-fg">
              {t(k('soporte'))} <span className="text-danger">*</span>
            </label>
            {/* P-27: la tarjeta de archivo de la casa (`SelectorDeArchivo`), no
                el «Choose File» del navegador. */}
            <SelectorDeArchivo
              id="descuento-soporte"
              accept={TIPOS_DE_SOPORTE.join(',')}
              archivo={soporte}
              onElegir={(elegido) => {
                setSoporte(elegido);
                limpiar('soporte');
              }}
              testid="descuento-soporte"
              invalido={Boolean(errores.soporte)}
              deshabilitado={guardando}
              describedBy="descuento-soporte-error"
              requerido
            />
            <ErrorDelCampo id="descuento-soporte-error" mensaje={errores.soporte} pista={t(k('soporteAyuda'))} className="mt-0" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            {t(k('cancelar'))}
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            isLoading={guardando}
            disabled={guardando}
            data-testid="descuento-guardar"
          >
            {guardando ? t(k('guardando')) : t(k('guardar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
