'use client';

/**
 * «¿A quién pertenece la cuenta?» — la pregunta que va ANTES de los datos de la
 * cuenta del propietario (22-09).
 *
 * Nico: «si es a otra persona, debe pedir el tipo de documento y número de
 * documento y ahí ya le da la opción de agregar la cuenta». Por eso el orden:
 * primero la pregunta, después (si es otra persona) quién es, y recién después
 * el banco y el número. Lo usan la ficha del propietario (crear y editar, que
 * también es el formulario de la consignación) y el cambio controlado de
 * cuenta: la misma pregunta con las mismas reglas en los dos caminos.
 *
 * Controlado: el padre guarda el valor y decide cuándo valida. Los errores
 * llegan ya traducidos.
 */

import { Chip } from '@leasefy/cadence';
import { IdentificationCard, User, Warning } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { RevisionDelDocumento, TitularElegido } from '@/lib/propietarios/titular-de-la-cuenta';
import type { DocumentType } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

export interface ValorDelTitular {
  titular: TitularElegido;
  nombre: string;
  tipo: DocumentType | '';
  numero: string;
}

export interface ErroresDelTitular {
  nombre?: string;
  tipo?: string;
  numero?: string;
}

const TIPOS: DocumentType[] = ['CC', 'CE', 'NIT', 'PASSPORT', 'TI', 'PPT'];

const ETIQUETA_DEL_TIPO: Record<DocumentType, string> = {
  CC: 'inmobiliaria.propietario.form.docCC',
  CE: 'inmobiliaria.propietario.form.docCE',
  TI: 'inmobiliaria.propietario.form.docTI',
  NIT: 'inmobiliaria.propietario.form.docNIT',
  PASSPORT: 'inmobiliaria.propietario.form.docPassport',
  PPT: 'inmobiliaria.propietario.form.docPPT',
};

/** El motivo de `revisarDocumentoDelTitular`, dicho con su clave. */
export function mensajeDelDocumento(
  t: (clave: string, params?: Record<string, string | number>) => string,
  revision: RevisionDelDocumento,
): string | undefined {
  if (revision.ok) return undefined;
  switch (revision.motivo) {
    case 'vacio':
      return t('inmobiliaria.propietario.form.titularErrVacio');
    case 'soloNumeros':
      return t('inmobiliaria.propietario.form.titularErrSoloNumeros');
    case 'largo':
      return t('inmobiliaria.propietario.form.titularErrLargo', { min: revision.min ?? 0, max: revision.max ?? 0 });
    case 'pasaporte':
      return t('inmobiliaria.propietario.form.titularErrPasaporte');
    case 'nit':
      return t('inmobiliaria.propietario.form.titularErrNit');
    case 'digitoDeVerificacion':
      return t('inmobiliaria.propietario.form.titularErrDv', { dv: revision.dv ?? '' });
    case 'esElPropietario':
      return t('inmobiliaria.propietario.form.titularErrEsElPropietario');
  }
}

function MensajeDeError({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p className="text-caption text-danger flex items-center gap-1" role="alert">
      <Warning className="w-3 h-3" aria-hidden="true" />
      {texto}
    </p>
  );
}

export function TitularDeLaCuentaCampos({
  valor,
  onCambiar,
  errores = {},
  nombreDelPropietario,
  prefijo = '',
}: {
  valor: ValorDelTitular;
  onCambiar: (v: ValorDelTitular) => void;
  errores?: ErroresDelTitular;
  /** Para decir a nombre de quién queda cuando la cuenta es suya. */
  nombreDelPropietario: string;
  /**
   * Antepuesto a los `id` (22-09): el reparto pinta un bloque por cuenta, y
   * dos `id="titular-numero"` en la misma página rompen las etiquetas.
   */
  prefijo?: string;
}) {
  const { t } = useI18n();
  const cambiar = (parcial: Partial<ValorDelTitular>) => onCambiar({ ...valor, ...parcial });
  const esTercero = valor.titular === 'TERCERO';

  return (
    <div className="space-y-4" data-testid="titular-de-la-cuenta">
      <div className="space-y-1.5">
        <p id={`${prefijo}titular-pregunta`} className="block text-sm font-medium text-fg dark:text-fg-subtle">
          {t('inmobiliaria.propietario.form.titularPregunta')}
          <span className="text-danger ml-0.5">*</span>
        </p>
        <div role="radiogroup" aria-labelledby={`${prefijo}titular-pregunta`} className="flex gap-3">
          {(['PROPIETARIO', 'TERCERO'] as const).map((opcion) => (
            <Chip
              key={opcion}
              type="button"
              role="radio"
              aria-checked={valor.titular === opcion}
              selected={valor.titular === opcion}
              onClick={() => cambiar({ titular: opcion })}
              className="flex-1 justify-center"
              data-testid={`titular-${opcion === 'PROPIETARIO' ? 'propietario' : 'tercero'}`}
            >
              {opcion === 'PROPIETARIO'
                ? t('inmobiliaria.propietario.form.titularDelPropietario')
                : t('inmobiliaria.propietario.form.titularDeOtraPersona')}
            </Chip>
          ))}
        </div>
        {!esTercero && nombreDelPropietario.trim() ? (
          <p className="text-caption text-fg-subtle">
            {t('inmobiliaria.propietario.form.titularEsElPropietario', { name: nombreDelPropietario.trim() })}
          </p>
        ) : null}
      </div>

      {esTercero ? (
        <div className="space-y-4 rounded-lg border border-border-faint p-4 dark:border-border-strong">
          <p className="text-sm text-fg-muted">{t('inmobiliaria.propietario.form.titularAvisoOtraPersona')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr] gap-4">
            <div className="space-y-1.5">
              <label htmlFor={`${prefijo}titular-tipo`} className="block text-sm font-medium text-fg dark:text-fg-subtle">
                {t('inmobiliaria.propietario.form.holderDocumentType')}
                <span className="text-danger ml-0.5">*</span>
              </label>
              <Select value={valor.tipo || undefined} onValueChange={(v) => cambiar({ tipo: v as DocumentType })}>
                <SelectTrigger
                  id={`${prefijo}titular-tipo`}
                  data-testid="titular-tipo-documento"
                  className={cn(errores.tipo && 'border-danger/30')}
                >
                  <SelectValue placeholder={t('inmobiliaria.propietario.form.holderDocumentTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {t(ETIQUETA_DEL_TIPO[tipo])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MensajeDeError texto={errores.tipo} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${prefijo}titular-numero`} className="block text-sm font-medium text-fg dark:text-fg-subtle">
                {t('inmobiliaria.propietario.form.titularNumero')}
                <span className="text-danger ml-0.5">*</span>
              </label>
              <div className="relative">
                <IdentificationCard
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10"
                  aria-hidden="true"
                />
                <Input
                  id={`${prefijo}titular-numero`}
                  type="text"
                  value={valor.numero}
                  onChange={(e) => cambiar({ numero: e.target.value })}
                  className={cn('pl-10 font-mono', errores.numero && 'border-danger/30')}
                  data-testid="titular-documento"
                />
              </div>
              <MensajeDeError texto={errores.numero} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${prefijo}titular-nombre`} className="block text-sm font-medium text-fg dark:text-fg-subtle">
              {t('inmobiliaria.propietario.form.titularNombre')}
              <span className="text-danger ml-0.5">*</span>
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10"
                aria-hidden="true"
              />
              <Input
                id={`${prefijo}titular-nombre`}
                type="text"
                value={valor.nombre}
                onChange={(e) => cambiar({ nombre: e.target.value })}
                className={cn('pl-10', errores.nombre && 'border-danger/30')}
                data-testid={`${prefijo}titular-nombre`}
              />
            </div>
            {errores.nombre ? (
              <MensajeDeError texto={errores.nombre} />
            ) : (
              <p className="text-caption text-fg-subtle">{t('inmobiliaria.propietario.form.titularNombreHint')}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Los errores del titular con las reglas de `revisarDocumentoDelTitular`. `{}` = está bien. */
export function erroresDelTitular(
  t: (clave: string, params?: Record<string, string | number>) => string,
  valor: ValorDelTitular,
  revisar: (tipo: DocumentType, numero: string) => RevisionDelDocumento,
): ErroresDelTitular {
  if (valor.titular !== 'TERCERO') return {};
  /*
   * 🔴 23-09 (Nico): de la cuenta de otra persona son obligatorios el nombre,
   * el tipo y el número de documento y, en el cambio de cuenta, su
   * certificación. El nombre lo exigen algunos bancos en el archivo de pagos.
   */
  const errores: ErroresDelTitular = {};
  if (valor.nombre.replace(/\s+/g, ' ').trim().length < 3) {
    errores.nombre = t('inmobiliaria.propietario.form.titularErrNombre');
  }
  if (!valor.tipo) {
    errores.tipo = t('inmobiliaria.propietario.form.errHolderDocTypeRequired');
  } else {
    const numero = mensajeDelDocumento(t, revisar(valor.tipo, valor.numero));
    if (numero) errores.numero = numero;
  }
  return errores;
}
