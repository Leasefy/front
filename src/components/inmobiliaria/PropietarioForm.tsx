'use client';

import { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import {
  User,
  Buildings,
  Envelope,
  Phone,
  IdentificationCard,
  MapPin,
  Bank,
  Wallet,
  Check,
  Info,
  ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { Chip } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import type { Propietario, PropietarioFormData, DocumentType } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_DEPARTMENTS } from '@/lib/types/inmobiliaria';
import {
  COLOMBIAN_BANKS,
  type BankCode,
  type AccountType,
} from '@/lib/types/payment-accounts';
import { revisarDocumentoDelTitular, titularInicial } from '@/lib/propietarios/titular-de-la-cuenta';
import { sinLaCuenta } from '@/lib/propietarios/sin-la-cuenta';
import { leerCorreoObligatorio } from '@/lib/terceros/correo-obligatorio';
import {
  TitularDeLaCuentaCampos,
  erroresDelTitular,
  type ErroresDelTitular,
  type ValorDelTitular,
} from './TitularDeLaCuentaCampos';
import { errorDelDigitoDeVerificacion } from '@/lib/inquilinos/documento-con-dv';

/** Un `SelectItem` no puede valer '' (Radix lo rechaza): esta es la opción que vacía el departamento. */
const SIN_DEPARTAMENTO = '__sin_departamento__';

interface PropietarioFormProps {
  initialData?: Propietario;
  /**
   * Prefills from already-staged wizard data (`PropietarioFormData` — flat
   * bank fields) instead of a persisted `Propietario` (nested
   * `bankAccount`). Takes precedence over `initialData` when both are set.
   * Used when re-opening the form to edit an owner the wizard already
   * created in this session (T-0011) — without it, "Editar" reopened a
   * completely blank form.
   */
  initialFormData?: PropietarioFormData;
  onSubmit: (data: PropietarioFormData) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
  /**
   * A field-scoped error from a persist attempt that happened OUTSIDE this
   * form (T-0011: the wizard's "Siguiente" persists on step transition, not
   * on this form's own submit — see contract.md §3.3, the 409 duplicate
   * document case). Injected into local `errors`/`touched` so it renders
   * through the existing error UI instead of a second error path.
   */
  serverError?: { field: keyof PropietarioFormData; message: string } | null;
  /**
   * TODOS los errores por campo del último guardado (02-10-2026, sistema de
   * errores): un 400 del back trae `campos[]` y cada uno va bajo SU campo
   * (`errorAlGuardarPropietario(e).porCampo`). El primero recibe el foco.
   */
  serverErrors?: Partial<Record<keyof PropietarioFormData, string>> | null;
  /**
   * Dentro de un CAJÓN (Nico, 03-10: «la experiencia de nuevo propietario
   * debería ser en un drawer»): el formulario no pinta su fila de botones; los
   * pone el pie fijo del cajón con `form={idDelFormulario}`, así «Cancelar /
   * Crear propietario» se ven siempre enteros mientras el cuerpo se desplaza
   * (P-12). Sin esto, el formulario de siempre con sus botones al final.
   */
  accionesAfuera?: boolean;
  /** El `id` del `<form>`, para el botón del pie que vive afuera. */
  idDelFormulario?: string;
  /**
   * P-14: «Cambiar cuenta» en «Editar». La cuenta que ya existe no se edita
   * acá: el cambio pasa por el flujo controlado de la ficha (certificación,
   * confirmación del propietario, aprobación). Quien monta el formulario DENTRO
   * de la ficha lo abre ahí mismo; sin esto, el enlace lleva a la ficha con
   * `?cambiarCuenta=1`.
   */
  onCambiarCuenta?: () => void;
}

/**
 * PR-02 (QA de Propietarios, 03-10): la política «correo obligatorio» de la
 * inmobiliaria (`exige_correo_del_tercero`), leída de donde la lee el resto
 * del front (`terceros-sin-correo`, con `cobros:view`), igual que en «Nuevo
 * inquilino». `null` = no se sabe (sin permiso para leerla, o falló): el
 * correo queda opcional y decide el back (su `FALTA_CORREO_DEL_TERCERO` va
 * bajo Correo).
 */
function useCorreoObligatorio(activo: boolean): boolean | null {
  const permisos = usePermissionsContextSafe();
  const puedeLeer = permisos ? permisos.canAccess('cobros', 'view') : false;
  const [exigido, setExigido] = useState<boolean | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    // SEGUIMIENTO-FRONT: con `cobros:view`, `terceros-sin-correo` como siempre;
    // sin él (el asesor), `exigeCorreoDelTercero` de la agencia.
    void leerCorreoObligatorio('PROPIETARIO', puedeLeer).then((r) => {
      if (vivo) setExigido(r);
    });
    return () => {
      vivo = false;
    };
  }, [activo, puedeLeer]);
  return activo ? exigido : null;
}

/**
 * P-11: el orden en que se VEN los campos, para llevar el foco al primero que
 * tiene error. El titular de la cuenta va antes que el banco (Nico, 22-09).
 */
const CAMPOS_DE_ARRIBA: (keyof PropietarioFormData)[] = [
  'documentType',
  'documentNumber',
  'name',
  'email',
  'phone',
  'address',
  'city',
  'department',
];
const CAMPOS_DE_LA_CUENTA: (keyof PropietarioFormData)[] = ['bankCode', 'accountType', 'accountNumber'];
const CAMPOS_DEL_TITULAR: { campo: 'tipo' | 'numero' | 'nombre'; id: string }[] = [
  { campo: 'tipo', id: 'titular-tipo' },
  { campo: 'numero', id: 'titular-numero' },
  { campo: 'nombre', id: 'titular-nombre' },
];

/**
 * Lleva a la persona al campo: foco y, con el cuerpo del cajón o la página
 * desplazados, lo trae a la vista (al centro, para que se lea su error). Con
 * movimiento reducido, sin animar el desplazamiento.
 */
function llevarAlCampo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus({ preventScroll: true });
  const reducido =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView?.({ block: 'center', behavior: reducido ? 'auto' : 'smooth' });
}

const DOCUMENT_TYPE_VALUES: { value: DocumentType; hint: string }[] = [
  { value: 'CC', hint: 'Ej: 80.123.456' },
  { value: 'CE', hint: 'Ej: 123456' },
  { value: 'TI', hint: 'Ej: 1.023.456.789' },
  { value: 'NIT', hint: 'Ej: 900.456.789-1' },
  { value: 'PASSPORT', hint: 'Ej: AB123456' },
  { value: 'PPT', hint: 'Ej: 4829107' },
];

const DOCUMENT_TYPE_LABEL_KEYS: Record<DocumentType, string> = {
  CC: 'inmobiliaria.propietario.form.docCC',
  CE: 'inmobiliaria.propietario.form.docCE',
  TI: 'inmobiliaria.propietario.form.docTI',
  NIT: 'inmobiliaria.propietario.form.docNIT',
  PASSPORT: 'inmobiliaria.propietario.form.docPassport',
  PPT: 'inmobiliaria.propietario.form.docPPT',
};

const ACCOUNT_TYPE_VALUES: AccountType[] = ['savings', 'checking'];

const ACCOUNT_TYPE_LABEL_KEYS: Record<AccountType, string> = {
  savings: 'inmobiliaria.propietario.form.savings',
  checking: 'inmobiliaria.propietario.form.checking',
};

/**
 * InputWrapper - Reusable wrapper for form fields
 * Defined outside of PropietarioForm to prevent re-creation on each render
 *
 * El error va con `ErrorDelCampo` (02-10-2026): entra suave y, si el campo
 * tiene ayuda, la reemplaza con un cruce sin que salte el alto. `id` es el del
 * control: la etiqueta lo nombra y el error es `${id}-error`, el mismo que el
 * control declara en `aria-describedby`.
 */
function InputWrapper({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg dark:text-fg-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {id ? (
        <ErrorDelCampo id={`${id}-error`} mensaje={error} pista={hint} className="mt-0" />
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * PropietarioForm - Complete form for creating/editing property owners
 * Includes personal info, document validation, and Colombian bank account fields
 */
export function PropietarioForm({
  initialData,
  initialFormData,
  onSubmit,
  onCancel,
  mode,
  serverError,
  serverErrors,
  accionesAfuera = false,
  idDelFormulario,
  onCambiarCuenta,
}: PropietarioFormProps) {
  const { t } = useI18n();
  /** Prefijo de los ids de los controles: único aunque haya dos formularios. */
  const uid = useId();
  const idDe = (campo: keyof PropietarioFormData) => `propietario${uid}${campo}`;
  /*
   * 🔴 23-09 (auditoría de seguridad): el correo de un propietario es por
   * donde confirma los cambios de su cuenta bancaria y con el que entra a su
   * portal, así que cambiar uno que YA estaba es cosa de un administrador (el
   * back lo exige: `CORREO_SOLO_ADMINISTRADOR`). Registrar el primero de una
   * ficha que no tenía sigue abierto. Fuera del proveedor de permisos no se
   * sabe el rol y se deja editable: decide el back.
   */
  const permisos = usePermissionsContextSafe();
  const correoBloqueado =
    mode === 'edit' && !!initialData?.email?.trim() && permisos !== null && !permisos.isAdmin;
  /*
   * 🔴 23-09 (datos personales): quien no ve la plata del propietario (sin
   * `dispersiones:view`, el asesor comercial) no ve ni llena su cuenta. La
   * ficha le llega con la cuenta en `null` y `datosBancariosOcultos`; antes el
   * formulario la pintaba vacía y la EXIGÍA, así que el asesor no podía ni
   * corregir un teléfono, y si escribía un número chocaba con el cambio
   * controlado de cuenta. Ahora el bloque no se muestra, no se valida y
   * guardar no manda ningún campo de la cuenta: el back la deja como estaba.
   * Fuera del proveedor de permisos no se sabe el rol: se muestra, decide el back.
   */
  const sinDatosBancarios =
    initialData?.datosBancariosOcultos === true ||
    (permisos !== null &&
      !permisos.isLoading &&
      !permisos.isAdmin &&
      !permisos.canAccess('dispersiones', 'view'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<PropietarioFormData>(
    initialFormData ?? {
      name: initialData?.name ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      // T-0128: una ficha creada por la migración puede no tener tipo. No se
      // le inventa uno («CC» por defecto) — se elige al completarla.
      documentType: initialData?.documentType ?? (mode === 'create' ? 'CC' : ''),
      documentNumber: initialData?.documentNumber ?? '',
      address: initialData?.address ?? '',
      city: initialData?.city ?? '',
      department: initialData?.department ?? '',
      bankCode: initialData?.bankAccount.bank ?? '',
      accountType: initialData?.bankAccount.accountType ?? '',
      accountNumber: initialData?.bankAccount.accountNumber ?? '',
      accountHolder: initialData?.bankAccount.accountHolder ?? '',
      accountHolderDocumentType: initialData?.bankAccount.accountHolderDocumentType ?? '',
      accountHolderDocument: initialData?.bankAccount.accountHolderDocument ?? '',
      notes: initialData?.notes ?? '',
    },
  );

  /*
   * Un departamento migrado puede venir escrito de otra forma («ANTIOQUIA»,
   * «Bogotá D.C.»): si no está en la lista se agrega arriba, o el select se
   * vería vacío y al guardar se perdería lo que había.
   */
  const departamentos =
    formData.department && !(COLOMBIAN_DEPARTMENTS as readonly string[]).includes(formData.department)
      ? [formData.department, ...COLOMBIAN_DEPARTMENTS]
      : [...COLOMBIAN_DEPARTMENTS];

  // Surface a persist error that happened outside this form (the wizard's
  // "Siguiente" 409, el 400 con `campos` del back) through the same error UI
  // as a local validation error. El primero recibe el foco.
  useEffect(() => {
    const todos: Partial<Record<keyof PropietarioFormData, string>> = {
      ...(serverError ? { [serverError.field]: serverError.message } : {}),
      ...(serverErrors ?? {}),
    };
    const campos = Object.keys(todos) as (keyof PropietarioFormData)[];
    if (campos.length === 0) return;
    setErrors((prev) => ({ ...prev, ...(todos as Record<string, string>) }));
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(campos.map((c) => [c, true])) }));
    const primero = serverError?.field ?? campos[0];
    llevarAlCampo(idDe(primero));
    // `idDe` depende sólo de `uid`, que no cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverError, serverErrors]);

  /** `id`, `aria-invalid` y `aria-describedby` de un control con su error. */
  const controlDe = (campo: keyof PropietarioFormData) => {
    const conError = Boolean(touched[campo] && errors[campo]);
    return {
      id: idDe(campo),
      'aria-invalid': conError || undefined,
      'aria-describedby': `${idDe(campo)}-error`,
    } as const;
  };

  /*
   * 🔴 «¿A quién pertenece la cuenta?» (22-09). La respuesta arranca en lo que
   * la ficha ya tiene: una cuenta con el documento de otra persona abre en «De
   * otra persona» con sus datos, para no borrárselos a nadie al editar.
   */
  const [titular, setTitular] = useState<ValorDelTitular>(() => {
    const nombre = initialFormData?.accountHolder ?? initialData?.bankAccount.accountHolder ?? '';
    const numero = initialFormData?.accountHolderDocument ?? initialData?.bankAccount.accountHolderDocument ?? '';
    const tipo =
      initialFormData?.accountHolderDocumentType ?? initialData?.bankAccount.accountHolderDocumentType ?? '';
    const elegido =
      initialFormData?.titularDeLaCuenta ??
      titularInicial({
        nombreDelPropietario: formData.name,
        documentoDelPropietario: formData.documentNumber,
        nombreDelTitular: nombre,
        documentoDelTitular: numero,
      });
    return elegido === 'TERCERO'
      ? { titular: 'TERCERO', nombre, tipo, numero }
      : { titular: 'PROPIETARIO', nombre: '', tipo: '', numero: '' };
  });
  const [titularTocado, setTitularTocado] = useState(false);
  const [erroresTitular, setErroresTitular] = useState<ErroresDelTitular>({});
  /*
   * Al EDITAR una cuenta que ya existe sin tocar la pregunta, el titular viaja
   * tal cual estaba (el camino de siempre): así una ficha vieja con el titular
   * a medias —la migración dejó nombres sin documento— no bloquea cambiar un
   * teléfono. Al crear, o apenas alguien toca la pregunta, se exige completo.
   */
  const exigeTitular = mode === 'create' || titularTocado || !initialData?.bankAccount.accountNumber;

  /*
   * 🔴 P-14 / PR-03 (QA de Propietarios, 03-10): en «Editar», la cuenta que YA
   * existe es de sólo lectura y enmascarada. Antes se podía cambiar banco, tipo
   * y número, y sólo al guardar el back respondía 409
   * `CAMBIO_DE_CUENTA_CONTROLADO`: la pantalla prometía algo que no deja hacer.
   * Peor: guardar SIN tocarla también mandaba la cuenta, con el banco y el tipo
   * que `normalizePropietario` completa (un banco fuera del catálogo queda en
   * blanco, un tipo ausente en «Ahorros»), y un migrado recibía el 409 por
   * cambiar un teléfono. Ahora no viaja: el cambio va por «Cambiar cuenta»
   * (certificación + confirmación del propietario). Sin cuenta todavía, la
   * PRIMERA sí se registra aquí (así lo dice la ficha).
   */
  const cuentaRegistrada =
    mode === 'edit' &&
    !sinDatosBancarios &&
    !initialFormData &&
    Boolean(initialData?.bankAccount.accountNumber?.trim() || initialData?.bankAccount.ultimos4);
  /*
   * P-13 (Nico, 03-10: la cuenta es OPCIONAL al crear): el back no la exige y
   * la migración crea propietarios sin ella. Sin cuenta, el propietario queda
   * con «Datos pendientes: cuenta bancaria». Pero apenas se llena UNO de sus
   * datos se piden los tres. El tipo cuenta sólo si la persona lo eligió: al
   * editar una ficha sin cuenta llega «Ahorros» por defecto, y eso no es
   * empezar una cuenta.
   */
  const cuentaEmpezada =
    !sinDatosBancarios &&
    !cuentaRegistrada &&
    (Boolean(formData.bankCode) ||
      Boolean(formData.accountNumber.trim()) ||
      Boolean(touched.accountType && formData.accountType) ||
      titular.titular === 'TERCERO');
  /** PR-02: con la política de la inmobiliaria prendida, el correo es obligatorio al crear. */
  const correoObligatorio = useCorreoObligatorio(mode === 'create') === true;

  const isCompany = formData.documentType === 'NIT';
  const selectedBank = COLOMBIAN_BANKS.find((b) => b.code === formData.bankCode);

  const updateField = (field: keyof PropietarioFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * P-11: el primer campo con error, en el orden en que se ven, recibe el foco
   * y se trae a la vista. Antes el foco se quedaba en «Crear propietario» y la
   * vista abajo: sólo se veían los errores del banco y el primero («El
   * documento es requerido») quedaba fuera.
   */
  const llevarAlPrimerError = (
    errores: Record<string, string>,
    deTitular: ErroresDelTitular,
  ) => {
    for (const campo of CAMPOS_DE_ARRIBA) {
      if (errores[campo]) return llevarAlCampo(idDe(campo));
    }
    for (const { campo, id } of CAMPOS_DEL_TITULAR) {
      if (deTitular[campo]) return llevarAlCampo(id);
    }
    for (const campo of CAMPOS_DE_LA_CUENTA) {
      if (errores[campo]) return llevarAlCampo(idDe(campo));
    }
    if (errores.notes) llevarAlCampo(idDe('notes'));
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = t('inmobiliaria.propietario.form.errNameRequired');
    } else if (formData.name.length < 3) {
      newErrors.name = t('inmobiliaria.propietario.form.errNameMin');
    }

    /*
     * PR-02 (QA de Propietarios, 03-10): las mismas reglas que el DTO del back
     * (`create-propietario.dto.ts`: correo y teléfono opcionales; el correo,
     * si viene, con forma de correo). El correo es obligatorio sólo con la
     * política «correo obligatorio» de la inmobiliaria prendida. El teléfono
     * es texto libre, como lo guarda el back (la cartera real trae «3103640479
     * / NELSON HERRERA - ESPOSO 3217834480»).
     */
    if (!formData.email.trim()) {
      if (correoObligatorio) newErrors.email = t('inmobiliaria.propietario.form.errEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = t('inmobiliaria.propietario.form.errEmailInvalid');
    }

    if (!formData.documentType) {
      newErrors.documentType = 'Elige el tipo de documento';
    }
    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = t('inmobiliaria.propietario.form.errDocRequired');
    } else {
      // Document-specific validation
      if (formData.documentType === 'CC' && !/^[0-9.]{6,12}$/.test(formData.documentNumber.replace(/\./g, ''))) {
        newErrors.documentNumber = t('inmobiliaria.propietario.form.errCCInvalid');
      }
      if (formData.documentType === 'NIT' && !/^[0-9.-]{9,15}$/.test(formData.documentNumber)) {
        newErrors.documentNumber = t('inmobiliaria.propietario.form.errNITInvalid');
      }
      // P-06 (QA-PROP): un NIT con un dígito de verificación que no cuadra se
      // dice aquí, bajo el campo (el back también lo rechaza: 400
      // `DIGITO_DE_VERIFICACION_NO_CUADRA`). Antes se guardaba en silencio.
      if (formData.documentType === 'NIT' && !newErrors.documentNumber) {
        const dvQueNoCuadra = errorDelDigitoDeVerificacion(formData.documentNumber, 'NIT');
        if (dvQueNoCuadra) newErrors.documentNumber = dvQueNoCuadra;
      }
    }

    // Bank account validation: sólo si quien llena el formulario ve la cuenta,
    // la cuenta no está ya registrada (P-14: sólo lectura) y se empezó a llenar
    // (P-13: es opcional, pero a medias no se guarda).
    if (sinDatosBancarios || cuentaRegistrada || !cuentaEmpezada) {
      setErroresTitular({});
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) llevarAlPrimerError(newErrors, {});
      return Object.keys(newErrors).length === 0;
    }
    if (!formData.bankCode) {
      newErrors.bankCode = t('inmobiliaria.propietario.form.errBankRequired');
    }
    if (!formData.accountType) {
      newErrors.accountType = t('inmobiliaria.propietario.form.errAccountTypeRequired');
    }
    // PR-02: el back no le pone largo a la cuenta (hay bancos con 9 dígitos y
    // billeteras con 10); el campo ya sólo deja escribir dígitos.
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = t('inmobiliaria.propietario.form.errAccountNumRequired');
    }
    const deTitular = exigeTitular
      ? erroresDelTitular(t, titular, (tipo, numero) =>
          revisarDocumentoDelTitular(tipo, numero, formData.documentNumber),
        )
      : {};
    setErroresTitular(deTitular);

    setErrors(newErrors);
    const valido = Object.keys(newErrors).length === 0 && Object.keys(deTitular).length === 0;
    if (!valido) llevarAlPrimerError(newErrors, deTitular);
    return valido;
  };

  /**
   * Lo que se manda: con la pregunta contestada, `titularDeLaCuenta` y los datos
   * de la otra persona (vacíos si es del propietario: el back los limpia). Sin
   * exigirla (editar sin tocarla), el titular tal como se cargó.
   */
  const conElTitular = (): PropietarioFormData => {
    // P-14 / PR-03: la cuenta que ya existe no viaja (no se cambia acá), y una
    // que nadie empezó tampoco: guardar sin cuenta no manda «Ahorros» ni un
    // número vacío (P-13).
    if (sinDatosBancarios || cuentaRegistrada || !cuentaEmpezada) return sinLaCuenta(formData);
    if (!exigeTitular) return formData;
    const tercero = titular.titular === 'TERCERO';
    return {
      ...formData,
      titularDeLaCuenta: titular.titular,
      accountHolder: tercero ? titular.nombre.replace(/\s+/g, ' ').trim() : '',
      accountHolderDocumentType: tercero ? titular.tipo : '',
      accountHolderDocument: tercero ? titular.numero.trim() : '',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach((key) => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(conElTitular());
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id={idDelFormulario} onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-fg">
          {isCompany ? (
            <Buildings className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
          <h3 className="font-semibold">
            {isCompany ? t('inmobiliaria.propietario.form.companyInfo') : t('inmobiliaria.propietario.form.personalInfo')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Document Type */}
          <InputWrapper
            id={idDe('documentType')}
            label={t('inmobiliaria.propietario.form.documentType')}
            required
            error={touched.documentType ? errors.documentType : undefined}
          >
            <Select
              value={formData.documentType}
              onValueChange={(value) => updateField('documentType', value as DocumentType)}
            >
              <SelectTrigger {...controlDe('documentType')} aria-required="true">
                <SelectValue placeholder="Elige el tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_VALUES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(DOCUMENT_TYPE_LABEL_KEYS[type.value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>

          {/* Document Number */}
          <InputWrapper
            id={idDe('documentNumber')}
            label={formData.documentType === 'NIT' ? 'NIT' : t('inmobiliaria.propietario.form.documentNumber')}
            required
            error={touched.documentNumber ? errors.documentNumber : undefined}
            hint={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
          >
            <div className="relative">
              <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                {...controlDe('documentNumber')}
                aria-required="true"
                type="text"
                value={formData.documentNumber}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, documentNumber: true }))}
                placeholder={DOCUMENT_TYPE_VALUES.find((dt) => dt.value === formData.documentType)?.hint}
                className={cn(
                  'pl-10',
                  touched.documentNumber && errors.documentNumber && 'border-danger/30'
                )}
              />
            </div>
          </InputWrapper>
        </div>

        {/* Name */}
        <InputWrapper
          id={idDe('name')}
          label={isCompany ? t('inmobiliaria.propietario.form.businessName') : t('inmobiliaria.propietario.form.fullName')}
          required
          error={touched.name ? errors.name : undefined}
        >
          <div className="relative">
            {isCompany ? (
              <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            ) : (
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle" />
            )}
            <Input
              {...controlDe('name')}
              aria-required="true"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              placeholder={isCompany ? 'Inversiones ABC S.A.S.' : 'Juan Pérez García'}
              className={cn('pl-10', touched.name && errors.name && 'border-danger/30')}
            />
          </div>
        </InputWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email */}
          <InputWrapper
            id={idDe('email')}
            label="Email"
            // PR-02: obligatorio sólo con la política de la inmobiliaria, y entonces se dice.
            required={correoObligatorio}
            error={touched.email ? errors.email : undefined}
            hint={
              correoBloqueado
                ? t('inmobiliaria.propietario.form.emailSoloAdministrador')
                : correoObligatorio
                  ? 'Tu inmobiliaria pide el correo de cada propietario.'
                  : t('inmobiliaria.propietario.form.optional')
            }
          >
            <div className="relative">
              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                {...controlDe('email')}
                aria-required={correoObligatorio || undefined}
                type="email"
                disabled={correoBloqueado}
                data-testid="correo-del-propietario"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="email@ejemplo.com"
                className={cn('pl-10', touched.email && errors.email && 'border-danger/30')}
              />
            </div>
          </InputWrapper>

          {/* Phone */}
          {/* PR-02 / P-13: opcional, como en el back. */}
          <InputWrapper
            id={idDe('phone')}
            label={t('inmobiliaria.propietario.form.phone')}
            hint={t('inmobiliaria.propietario.form.optional')}
            error={touched.phone ? errors.phone : undefined}
          >
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
              <Input
                {...controlDe('phone')}
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="+57 310 234 5678"
                className={cn('pl-10', touched.phone && errors.phone && 'border-danger/30')}
              />
            </div>
          </InputWrapper>
        </div>

        {/* Address */}
        <InputWrapper
          id={idDe('address')}
          label={t('inmobiliaria.propietario.form.address')}
          hint={t('inmobiliaria.propietario.form.optional')}
          error={touched.address ? errors.address : undefined}
        >
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-subtle z-10" />
            <Input
              {...controlDe('address')}
              type="text"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Cra 15 #93-45, Apto 802"
              className="pl-10"
            />
          </div>
        </InputWrapper>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* City */}
          <InputWrapper
            id={idDe('city')}
            label={t('inmobiliaria.propietario.form.city')}
            hint={t('inmobiliaria.propietario.form.optional')}
            error={touched.city ? errors.city : undefined}
          >
            <Input
              {...controlDe('city')}
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Bogotá"
            />
          </InputWrapper>

          {/* Department — la misma lista que el wizard de consignación (COLOMBIAN_DEPARTMENTS). */}
          <InputWrapper
            id={idDe('department')}
            label={t('inmobiliaria.propietario.form.department')}
            hint={t('inmobiliaria.propietario.form.optional')}
            error={touched.department ? errors.department : undefined}
          >
            <Select
              value={formData.department || undefined}
              onValueChange={(value) => updateField('department', value === SIN_DEPARTAMENTO ? '' : value)}
            >
              <SelectTrigger {...controlDe('department')} data-testid="propietario-departamento">
                <SelectValue placeholder={t('inmobiliaria.propietario.form.selectDepartment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_DEPARTAMENTO}>{t('inmobiliaria.propietario.form.noDepartment')}</SelectItem>
                {departamentos.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>
        </div>
      </div>

      {/* Bank Account */}
      {sinDatosBancarios ? (
        <div
          className="space-y-2 pt-4 border-t border-border-faint dark:border-border-strong"
          data-testid="cuenta-oculta-por-rol"
        >
          <div className="flex items-center gap-2 text-fg">
            <Bank className="w-5 h-5 text-fg-subtle" />
            <h3 className="font-semibold">{t('inmobiliaria.propietario.form.bankDataTitle')}</h3>
          </div>
          <p className="text-sm text-fg-muted">{t('inmobiliaria.propietario.form.bankDataHidden')}</p>
        </div>
      ) : cuentaRegistrada && initialData ? (
        <CuentaRegistrada propietario={initialData} onCambiarCuenta={onCambiarCuenta} />
      ) : (
      <div className="space-y-4 pt-4 border-t border-border-faint dark:border-border-strong">
        <div className="flex items-center gap-2 text-fg">
          <Bank className="w-5 h-5 text-success" />
          <h3 className="font-semibold">{t('inmobiliaria.propietario.form.bankDataTitle')}</h3>
        </div>

        <div className="p-4 rounded-lg bg-primary-soft border border-primary/30">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-primary">
              {t('inmobiliaria.propietario.form.bankDataInfo')}
            </p>
          </div>
        </div>

        {/* P-13: la cuenta es opcional para crearlo; la primera también se registra al editar. */}
        <p className="text-sm text-fg-muted" data-testid="cuenta-opcional">
          {mode === 'create'
            ? t('inmobiliaria.propietario.form.bankOptional')
            : t('inmobiliaria.propietario.form.bankFirstTime')}
        </p>

        {/* Primero de quién es la cuenta; después, la cuenta (Nico, 22-09). */}
        <TitularDeLaCuentaCampos
          valor={titular}
          onCambiar={(v) => {
            setTitular(v);
            setTitularTocado(true);
            setErroresTitular({});
          }}
          errores={erroresTitular}
          nombreDelPropietario={formData.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bank */}
          <InputWrapper
            id={idDe('bankCode')}
            label={t('inmobiliaria.propietario.form.bank')}
            required={cuentaEmpezada}
            error={touched.bankCode ? errors.bankCode : undefined}
          >
            <Select
              value={formData.bankCode || undefined}
              onValueChange={(value) => updateField('bankCode', value as BankCode)}
            >
              <SelectTrigger
                {...controlDe('bankCode')}
                aria-required={cuentaEmpezada || undefined}
                className={cn(
                  'gap-2',
                  touched.bankCode && errors.bankCode && 'border-danger/30'
                )}
              >
                <Bank className="w-5 h-5 text-fg-subtle shrink-0" />
                <SelectValue placeholder={t('inmobiliaria.propietario.form.selectBank')} />
              </SelectTrigger>
              <SelectContent>
                {COLOMBIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>

          {/* Account Type */}
          <InputWrapper
            id={idDe('accountType')}
            label={t('inmobiliaria.propietario.form.accountType')}
            required={cuentaEmpezada}
            error={touched.accountType ? errors.accountType : undefined}
          >
            <div
              id={idDe('accountType')}
              tabIndex={-1}
              role="group"
              aria-label={t('inmobiliaria.propietario.form.accountType')}
              aria-describedby={`${idDe('accountType')}-error`}
              className="flex gap-3 outline-none"
            >
              {ACCOUNT_TYPE_VALUES.map((accType) => (
                <Chip
                  key={accType}
                  selected={formData.accountType === accType}
                  onClick={() => updateField('accountType', accType)}
                  className="flex-1 justify-center"
                >
                  {t(ACCOUNT_TYPE_LABEL_KEYS[accType])}
                </Chip>
              ))}
            </div>
          </InputWrapper>
        </div>

        {/* Account Number */}
        <InputWrapper
          id={idDe('accountNumber')}
          label={t('inmobiliaria.propietario.form.accountNumber')}
          required={cuentaEmpezada}
          error={touched.accountNumber ? errors.accountNumber : undefined}
          hint={t('inmobiliaria.propietario.form.hintDigitsOnly')}
        >
          <Input
            {...controlDe('accountNumber')}
            aria-required={cuentaEmpezada || undefined}
            type="text"
            value={formData.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setTouched((prev) => ({ ...prev, accountNumber: true }))}
            placeholder="1234567890"
            className={cn(
              'font-mono',
              touched.accountNumber && errors.accountNumber && 'border-danger/30'
            )}
          />
        </InputWrapper>
      </div>
      )}

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t border-border-faint dark:border-border-strong">
        <InputWrapper
          id={idDe('notes')}
          label={t('inmobiliaria.propietario.form.internalNotes')}
          hint={t('inmobiliaria.propietario.form.hintTeamOnly')}
          error={touched.notes ? errors.notes : undefined}
        >
          <Textarea
            {...controlDe('notes')}
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Agregar notas sobre este propietario..."
            rows={3}
            className="resize-none"
          />
        </InputWrapper>
      </div>

      {/* Actions — en un cajón las pone su pie fijo (`accionesAfuera`). */}
      {!accionesAfuera && (
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-faint dark:border-border-strong">
        <Button
          type="button"
          variant="secondary"
          hideArrow
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('inmobiliaria.propietario.form.cancel')}
        </Button>
        <Button
          type="submit"
          hideArrow
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" variant="current" />
              {t('inmobiliaria.propietario.form.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {mode === 'create' ? t('inmobiliaria.propietario.form.createOwner') : t('inmobiliaria.propietario.form.saveChanges')}
            </>
          )}
        </Button>
      </div>
      )}
    </form>
  );
}

/**
 * P-14: la cuenta que ya está registrada, de SÓLO LECTURA y enmascarada
 * (••••8912, como en la ficha), con el camino al cambio controlado.
 */
function CuentaRegistrada({
  propietario,
  onCambiarCuenta,
}: {
  propietario: Propietario;
  onCambiarCuenta?: () => void;
}) {
  const { t } = useI18n();
  const cuenta = propietario.bankAccount;
  const ultimos4 = cuenta.ultimos4 || cuenta.accountNumber.replace(/\D/g, '').slice(-4);
  const banco = COLOMBIAN_BANKS.find((b) => b.code === cuenta.bank)?.name ?? cuenta.bankName ?? null;
  const titular = cuenta.accountHolder?.trim();
  // Un tipo que no está en el catálogo (un dato viejo, «SAVINGS») no se nombra: no se inventa.
  const claveDelTipo = ACCOUNT_TYPE_LABEL_KEYS[cuenta.accountType as AccountType] as string | undefined;
  const tipo = claveDelTipo ? t(claveDelTipo) : null;
  const href = `/panel/inmobiliaria/propietarios/${propietario.id}?cambiarCuenta=1`;
  return (
    <div
      className="space-y-3 pt-4 border-t border-border-faint dark:border-border-strong"
      data-testid="cuenta-de-solo-lectura"
    >
      <div className="flex items-center gap-2 text-fg">
        <Bank className="w-5 h-5 text-success" />
        <h3 className="font-semibold">{t('inmobiliaria.propietario.form.bankDataTitle')}</h3>
      </div>
      <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {t('inmobiliaria.propietario.form.cuentaRegistrada')}
        </p>
        <p className="text-sm font-medium text-fg">{[banco, tipo].filter(Boolean).join(' · ') || '—'}</p>
        <p className="font-mono text-sm tabular-nums text-fg" data-testid="cuenta-enmascarada">
          {ultimos4 ? `•••• ${ultimos4}` : '••••'}
        </p>
        <p className="text-sm text-fg-muted">
          {titular
            ? t('inmobiliaria.propietario.form.aNombreDe', { nombre: titular })
            : t('inmobiliaria.propietario.form.aNombreDelPropietario')}
        </p>
      </div>
      <p className="text-sm text-fg-muted">{t('inmobiliaria.propietario.form.cuentaSoloLectura')}</p>
      {onCambiarCuenta ? (
        <Button type="button" variant="secondary" size="sm" hideArrow onClick={onCambiarCuenta} data-testid="cambiar-cuenta">
          {t('inmobiliaria.propietario.form.cambiarCuenta')}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button asChild variant="secondary" size="sm" hideArrow>
          <Link href={href} data-testid="cambiar-cuenta">
            {t('inmobiliaria.propietario.form.cambiarCuenta')}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export default PropietarioForm;
