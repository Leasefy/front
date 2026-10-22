'use client';

import { FALTA_EL_PORCENTAJE } from '@/lib/inmuebles/participaciones-desconocidas';
import { useRef, useState } from 'react';
import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { InvitarAlPortal } from './InvitarAlPortal';
import Link from 'next/link';
import { conRegreso } from '@/lib/nav/ruta-de-regreso';
import {
  User,
  Bank,
  Phone,
  Envelope,
  ArrowRight,
  CurrencyDollar,
  FileText,
  Images,
  UserCircle,
  Briefcase,
  ArrowsClockwise,
  Users,
  UploadSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, IconButton, buttonVariants } from '@leasefy/cadence';
import { ContratoPdfModal } from './ContratoPdfModal';
import type { Consignacion, Copropietario, Propietario, Agente, AgenteRole } from '@/lib/types/inmobiliaria';
import { formatParticipacion } from '@/lib/types/inmobiliaria';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { textoDeLaComision } from '@/lib/inmuebles/comision-del-mandato';
import { useTr } from '@/lib/i18n/use-tr';
import { inventarioDeLaFicha, useActasDelMandato } from '@/lib/actas/actas-del-mandato';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';

// Bank name mapping
const BANK_NAMES: Record<string, string> = {
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  bbva: 'BBVA Colombia',
  bogota: 'Banco de Bogotá',
  occidente: 'Banco de Occidente',
  popular: 'Banco Popular',
  itau: 'Itaú',
  scotiabank: 'Scotiabank',
  cajasocial: 'Caja Social',
  av_villas: 'AV Villas',
};

// Role labels resolved via i18n
const ROLE_LABEL_KEYS: Record<AgenteRole, string> = {
  agent: 'inmobiliaria.consignaciones.roles.agent',
  coordinator: 'inmobiliaria.consignaciones.roles.coordinator',
  director: 'inmobiliaria.consignaciones.roles.director',
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, children, className }: SectionCardProps) {
  return (
    // Sin entrada propia: la ficha entera entra con su `CrossFade` al llegar
    // de la carga (y con el `template.tsx` al navegar).
    <div
      // 21-10 (impacto visual): superficie elevada sin borde duro, el título liviano
      // con su ícono suelto (sin la cajita gris), y aire de lectura adentro.
      className={cn(
        'overflow-hidden rounded-[24px] border border-border-faint bg-surface shadow-[0_1px_2px_rgba(20,19,15,0.04),0_10px_28px_-18px_rgba(20,19,15,0.16)] dark:border-border-strong dark:bg-bg',
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-6 pb-1 pt-5 text-fg-subtle">
        <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">{title}</h3>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </div>
  );
}

// ============================================================================
// Términos del mandato
// ============================================================================

interface TerminosDelMandatoSectionProps {
  consignacion: Consignacion;
  /** Abre «Editar» (para poner la fecha de vencimiento que falta). */
  onEditar?: () => void;
}

/**
 * Lo pactado con el propietario: desde cuándo, hasta cuándo, la comisión y el
 * mínimo de arriendo (revisión de diseño de la ficha, 21-10-2026).
 *
 * Antes vivía en la portada («Desde · Comisión») y en «Información del
 * inmueble», que además repetía la dirección y llamaba «Fecha inicio contrato»
 * al inicio del MANDATO —al lado del fin del ARRIENDO se leía como un solo
 * contrato de 2024 a 2027—. Ahora va en «Mandato y giro», con su nombre, y el
 * mandato sin fecha de vencimiento lo dice aquí con su salida.
 */
export function TerminosDelMandatoSection({ consignacion, onEditar }: TerminosDelMandatoSectionProps) {
  const { t, formatDate } = useI18n();
  const tr = useTr();
  const terminada = consignacion.status === 'terminated';
  const sinVencimiento = !consignacion.contractEndDate;
  const ROTULO = 'font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle';
  const VALOR = 'mt-1.5 whitespace-nowrap text-[15px] font-medium tabular-nums text-fg';

  return (
    <SectionCard title={tr('Términos del mandato')} icon={<FileText className="w-4 h-4" />}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4" data-testid="terminos-del-mandato">
        <div className="min-w-0">
          <dt className={ROTULO}>{tr('Mandato desde')}</dt>
          <dd className={VALOR}>{formatDate(consignacion.contractDate)}</dd>
        </div>
        <div className="min-w-0">
          <dt className={ROTULO}>{tr('Vence')}</dt>
          <dd className={cn(VALOR, sinVencimiento && 'font-normal text-fg-muted')}>
            {consignacion.contractEndDate ? formatDate(consignacion.contractEndDate) : tr('Sin fecha')}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={ROTULO}>
            {consignacion.listingType === 'sale'
              ? t('inmobiliaria.consignaciones.header.saleCommission')
              : t('inmobiliaria.consignaciones.header.commission')}
          </dt>
          <dd className={cn(VALOR, 'font-mono')} data-testid="comision-del-mandato">{textoDeLaComision(consignacion)}</dd>
        </div>
        {/* `> 0` y no `&&` a secas: con `0` React pinta el «0» suelto. */}
        {!!consignacion.minimumTerm && consignacion.minimumTerm > 0 ? (
          <div className="min-w-0">
            <dt className={ROTULO}>{tr('Arriendo mínimo')}</dt>
            <dd className={VALOR}>
              <span className="font-mono">{consignacion.minimumTerm}</span> {t('inmobiliaria.consignaciones.detail.months')}
            </dd>
          </div>
        ) : null}
      </dl>

      {sinVencimiento && !terminada ? (
        <div
          className="mt-5 flex flex-col gap-3 border-t border-border-faint pt-5 dark:border-border-strong sm:flex-row sm:items-center sm:justify-between"
          data-testid="mandato-sin-vencimiento"
        >
          <p className="flex min-w-0 items-start gap-2.5 text-body-sm text-fg-muted">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
            <span>
              <span className="font-medium text-fg">{tr('El mandato no tiene fecha de vencimiento.')}</span>{' '}
              {tr('Con la fecha, Leasefy le avisa al asesor y al gerente 30 días antes.')}
            </span>
          </p>
          {onEditar ? (
            <Button variant="secondary" size="sm" hideArrow className="shrink-0 self-start sm:self-auto" onClick={onEditar}>
              {tr('Poner la fecha')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

// ============================================================================
// Propietario Section
// ============================================================================

interface PropietarioSectionProps {
  propietario: Propietario | undefined;
  /**
   * Todos los dueños con su participación (2026-09-03). Con uno solo, o vacío
   * contra un back viejo, la sección se ve igual que siempre; con más de uno se
   * lista quién es quién y cuánto le toca.
   */
  copropietarios?: Copropietario[];
  /**
   * Editar los dueños y su reparto (se vendió, heredó, entró un socio, cambió
   * el porcentaje). Sin esto no se muestra el botón. Abre
   * `EditarPropietariosDialog`, el mismo que usa la tarjeta «Partes» del contrato.
   */
  onCambiar?: () => void;
  /** La ruta de esta ficha, para que «Volver» en la del propietario regrese acá. */
  rutaDeOrigen?: string;
  /**
   * QA-PROP P-03 (seguimiento): en un EMPATE de participación (50/50), elegir
   * quién queda como principal (`PUT /consignaciones/:id/principal`). Sólo el
   * administrador o el contador: sin esto no se ofrece.
   */
  onElegirPrincipal?: (propietarioId: string) => Promise<void>;
  /**
   * 🔴 Copropiedad migrada sin porcentaje (Nico, 04-10-2026): los % guardados
   * son provisionales; se dice «Falta el porcentaje de cada propietario», no
   * se muestran como dato y el giro está frenado hasta ponerlos.
   */
  participacionesDesconocidas?: boolean;
}

export function PropietarioSection({
  propietario,
  copropietarios,
  onCambiar,
  rutaDeOrigen,
  onElegirPrincipal,
  participacionesDesconocidas = false,
}: PropietarioSectionProps) {
  const { t } = useI18n();
  // Sólo cuando hay más de uno. Con un dueño al 100 % mostrar «100 %» al lado
  // del nombre es ruido: no informa nada que no se supiera.
  const variosDuenos = (copropietarios?.length ?? 0) > 1;
  /*
   * P-03 (seguimiento): el principal es el de MAYOR participación; en un empate
   * se queda el que ya estaba, y un administrador o el contador puede elegir
   * a otro de los empatados. Un 30 % nunca puede ser principal de un 70 %.
   */
  const mayorParticipacion = Math.max(0, ...(copropietarios ?? []).map((c) => c.participacionBps));
  const empatados = (copropietarios ?? []).filter((c) => c.participacionBps === mayorParticipacion);
  const principalEnLaLista = (copropietarios ?? []).some((c) => c.propietarioId === propietario?.id);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const elegirPrincipal = async (c: Copropietario) => {
    if (!onElegirPrincipal || eligiendo) return;
    setEligiendo(c.propietarioId);
    try {
      await onElegirPrincipal(c.propietarioId);
      toast.success(`Ahora el propietario principal es ${c.propietario?.name ?? 'el que elegiste'}.`, {
        description: 'Las participaciones no cambian: sólo quién figura como principal.',
      });
    } catch (e) {
      toast.error('No se cambió el propietario principal.', {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'elegir el propietario principal',
        }),
      });
    } finally {
      setEligiendo(null);
    }
  };
  /*
   * La cuenta que acaba de crear el botón «Invitar». Vive acá y no en el
   * padre para que el mensaje aparezca en el acto: recargar la ficha entera
   * para ver un botón que el servidor ya confirmó es hacer esperar de gusto.
   * Se limpia sola al cambiar de propietario porque `propietario.id` entra en
   * la comparación de abajo.
   */
  const [cuentaReciente, setCuentaReciente] = useState<string | null>(null);
  const [paraQuien, setParaQuien] = useState<string | null>(null);
  const cuenta =
    propietario?.cuentaDePortalId ??
    (paraQuien === propietario?.id ? cuentaReciente : null);

  if (!propietario) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.ownerTitle')} icon={<User className="w-4 h-4" />}>
        <div className="text-center py-4 text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.consignaciones.detail.ownerNotFound')}
        </div>
      </SectionCard>
    );
  }

  const isCompany = propietario.documentType === 'NIT';
  // bankAccount may be missing for owners without payout data loaded yet.
  const maskedAccount = propietario.bankAccount?.accountNumber
    ? `****${propietario.bankAccount.accountNumber.slice(-4)}`
    : null;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.ownerTitle')} icon={<User className="w-4 h-4" />}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* 21-10: el Avatar de Cadence (persona en superelipse con el tono de su
                nombre), no un ícono en una caja de color. */}
            <Avatar name={propietario.name} size="lg" />
            <div>
              <h4 className="font-semibold text-fg">{propietario.name}</h4>
              <p className="text-sm text-fg-muted dark:text-fg-subtle">
                {documentoConTipo(propietario.documentType, propietario.documentNumber)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onCambiar && (
              <Button
                variant="link"
                size="sm"
                hideArrow
                onClick={onCambiar}
                className="h-auto px-0 text-sm text-fg-muted hover:text-fg"
                data-testid="editar-propietarios"
              >
                Editar propietarios
              </Button>
            )}
            <Link
              href={
                rutaDeOrigen
                  ? conRegreso(`/panel/inmobiliaria/propietarios/${propietario.id}`, rutaDeOrigen)
                  : `/panel/inmobiliaria/propietarios/${propietario.id}`
              }
              className="text-sm text-primary hover:text-primary dark:hover:text-primary flex items-center gap-1"
            >
              {t('inmobiliaria.consignaciones.detail.viewProfile')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Los dueños y su tajada. Sólo con más de uno — ver `variosDuenos`.
            El principal (el de mayor participación) lleva el chip, como el
            inquilino principal en la tarjeta «Partes» del contrato: es el que
            figura como dueño en todo lo que sigue leyendo un solo id. */}
        {variosDuenos && participacionesDesconocidas && (
          <div
            className="rounded-lg border border-border bg-warning-soft p-3 text-sm text-fg"
            data-testid="falta-el-porcentaje"
            role="status"
          >
            <p className="font-medium text-warning">{FALTA_EL_PORCENTAJE}</p>
            <p className="mt-1 text-fg-muted">
              Este inmueble vino de la migración con {copropietarios!.length} dueños y el archivo no
              dice cuánto es de cada uno. No se reparte en partes iguales a ciegas: hasta que pongas
              el porcentaje de cada uno (que sumen 100 %), el giro de este inmueble no sale.
            </p>
            {onCambiar && (
              <Button
                size="sm"
                hideArrow
                className="mt-2"
                onClick={onCambiar}
                data-testid="poner-los-porcentajes"
              >
                Poner los porcentajes
              </Button>
            )}
          </div>
        )}

        {variosDuenos && (
          <div
            className="p-3 rounded-lg bg-surface-muted dark:bg-bg space-y-2"
            data-testid="copropietarios-lista"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">
                Propietarios ({copropietarios!.length})
              </span>
            </div>
            {copropietarios!.map((c, i) => (
              <div
                key={c.propietarioId}
                className="flex items-center justify-between gap-3"
                data-testid="copropietario-item"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
                  <span className="truncate">{c.propietario?.name ?? c.propietarioId}</span>
                  {/* El chip va en EL principal (`propietario`), no en el primero de
                      la lista: en un empate 50/50 el orden no dice quién es
                      (SEGUIMIENTO-FRONT, P-03). Si el principal no está en la
                      lista (dato raro), el primero, como antes. */}
                  {(principalEnLaLista ? c.propietarioId === propietario.id : i === 0) && (
                    <span
                      className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                      data-testid="copropietario-principal-chip"
                    >
                      Principal
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {onElegirPrincipal &&
                    !participacionesDesconocidas &&
                    empatados.length > 1 &&
                    c.participacionBps === mayorParticipacion &&
                    c.propietarioId !== propietario.id && (
                      <Button
                        variant="link"
                        size="sm"
                        hideArrow
                        onClick={() => void elegirPrincipal(c)}
                        disabled={eligiendo !== null}
                        isLoading={eligiendo === c.propietarioId}
                        className="h-auto px-0 text-caption"
                        data-testid="hacer-principal"
                      >
                        Hacer principal
                      </Button>
                    )}
                  {participacionesDesconocidas ? (
                    <span
                      className="text-sm text-warning"
                      data-testid="copropietario-sin-porcentaje"
                    >
                      Sin porcentaje
                    </span>
                  ) : (
                    <span className="font-mono text-sm tabular-nums text-fg">
                      {formatParticipacion(c.participacionBps)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bank Account — only when payout data exists */}
        {propietario.bankAccount ? (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <div className="flex items-center gap-2 mb-2">
              <Bank className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.detail.paymentAccount')}</span>
            </div>
            <p className="text-sm font-medium text-fg">
              {BANK_NAMES[propietario.bankAccount.bank] || propietario.bankAccount.bank} - {propietario.bankAccount.accountType === 'savings' ? t('inmobiliaria.consignaciones.detail.accountTypeSavings') : t('inmobiliaria.consignaciones.detail.accountTypeChecking')}
            </p>
            {maskedAccount && <p className="text-sm text-fg-muted dark:text-fg-subtle">{maskedAccount}</p>}
          </div>
        ) : null}

        {/* Contact Buttons */}
        <div className="flex items-center gap-2">
          {propietario.email && (
            <a
              href={`mailto:${propietario.email}`}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1 justify-center gap-2')}
            >
              <Envelope className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.detail.email')}
            </a>
          )}
          {propietario.phone && (
            <a
              href={`tel:${propietario.phone}`}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1 justify-center gap-2')}
            >
              <Phone className="w-4 h-4" />
              {t('inmobiliaria.consignaciones.detail.call')}
            </a>
          )}
          {/*
           * 🔴 Escribirle por Leasefy, no sólo por fuera (Nico, 2026-09-12).
           *
           * El correo y el teléfono se van del producto: lo que se habla ahí
           * no queda en ningún lado y el siguiente agente que abra esta ficha
           * no sabe qué se dijo. El hilo directo sí queda, y lo ve cualquier
           * miembro de la inmobiliaria.
           *
           * Necesita que el propietario tenga cuenta de portal
           * (`cuentaDePortalId`). Cuando no la tiene, lo que va acá NO es un
           * hueco —eso se lee como «falta la función»— sino el aviso con la
           * salida: ver `InvitarAlPortal`, abajo.
           */}
          {cuenta && (
            <BotonEnviarMensaje
              counterpartId={cuenta}
              etiqueta="Mensaje"
              className="flex-1 justify-center gap-2"
            />
          )}
        </div>

        {/*
         * Sin cuenta: se dice y se ofrece resolverlo, en vez de esconder el
         * botón. En la cartera real de Nico esto es el 97 % de las fichas.
         */}
        {!cuenta && (
          <InvitarAlPortal
            propietarioId={propietario.id}
            correo={propietario.email}
            onInvitado={(id) => {
              setParaQuien(propietario.id);
              setCuentaReciente(id);
            }}
          />
        )}
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Agente Section
// ============================================================================

interface AgenteSectionProps {
  agente: Agente | undefined;
  commissionPercent: number;
  /**
   * contract-addendum-2.md §8.6 — no sale-commission money movement is
   * computed anywhere in T-0038. `commissionPercent` is always `0` on a
   * sale mandate (§A.3), so an agent/agency split derived from it would
   * misleadingly render "0%" as if there were no commission at all.
   */
  isSaleListing?: boolean;
  onReassign?: () => void;
  /**
   * QA 17-10 (IMANA-1, Nico «Administradoras también»): quien está a cargo
   * cuando NO es un asesor de la lista de agentes (una administradora). Sin
   * esto la tarjeta decía «nadie a cargo» aunque sí hubiera alguien.
   */
  encargado?: { nombre: string; rol: string } | null;
}

export function AgenteSection({ agente, commissionPercent, isSaleListing, onReassign, encargado }: AgenteSectionProps) {
  const { t } = useI18n();

  if (!agente && encargado) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
        <div className="flex items-center gap-3" data-testid="encargado-del-inmueble">
          <Avatar name={encargado.nombre} size="lg" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-fg truncate">{encargado.nombre}</h4>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">{encargado.rol}</p>
          </div>
          {onReassign && (
            <Button variant="outline" size="sm" hideArrow onClick={onReassign}>
              Cambiar
            </Button>
          )}
        </div>
      </SectionCard>
    );
  }

  if (!agente) {
    return (
      <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
        {/* El vacío tiene salida. Antes era sólo la frase: quedaba claro que no
            había agente y no había forma de poner uno. */}
        <div className="py-6 text-center">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.consignaciones.detail.noAgentAssigned')}
          </p>
          {onReassign && (
            <>
              <p className="mx-auto mt-1 max-w-xs text-xs text-fg-subtle">
                Quien quede a cargo atiende las visitas y responde a los candidatos.
              </p>
              <Button hideArrow className="mt-4" onClick={onReassign}>
                Asignar asesor
              </Button>
            </>
          )}
        </div>
      </SectionCard>
    );
  }

  // Calculate agent's commission from property commission
  const agentCommissionPercent = (commissionPercent * agente.commissionSplit) / 100;
  const agencyCommissionPercent = commissionPercent - agentCommissionPercent;

  return (
    <SectionCard title={t('inmobiliaria.consignaciones.detail.agentTitle')} icon={<Briefcase className="w-4 h-4" />}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {agente.avatar ? (
            <Avatar name={agente.name} src={agente.avatar} size="lg" />
          ) : (
            <Avatar name={agente.name} size="lg" />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-fg">{agente.name}</h4>
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {t(ROLE_LABEL_KEYS[agente.role])} {agente.zone && `· ${agente.zone}`}
            </p>
          </div>
          <Badge
            variant={agente.status === 'active' ? 'success' : agente.status === 'on_leave' ? 'warning' : 'secondary'}
          >
            {agente.status === 'active' ? t('inmobiliaria.consignaciones.agentStatus.active') : agente.status === 'on_leave' ? t('inmobiliaria.consignaciones.agentStatus.onLeave') : t('inmobiliaria.consignaciones.agentStatus.inactive')}
          </Badge>
        </div>

        {/* Commission Split — not computed for a sale mandate (§8.6: no
            sale-commission money movement anywhere in T-0038). */}
        {isSaleListing ? (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <p className="text-xs text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.consignaciones.detail.commissionSplitNotAvailableForSale')}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-bg">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollar className="w-4 h-4 text-fg-subtle" />
              <span className="text-xs text-fg-muted dark:text-fg-subtle">{t('inmobiliaria.consignaciones.detail.commissionDistribution')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-fg">{agentCommissionPercent.toFixed(1)}%</span>
                <span className="text-fg-muted dark:text-fg-subtle ml-1">{t('inmobiliaria.consignaciones.detail.agentShare')}</span>
              </div>
              <div>
                <span className="font-medium text-fg">{agencyCommissionPercent.toFixed(1)}%</span>
                <span className="text-fg-muted dark:text-fg-subtle ml-1">{t('inmobiliaria.consignaciones.detail.agencyShare')}</span>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-muted dark:bg-ink overflow-hidden flex">
              <div
                className="bg-primary dark:bg-primary"
                style={{ width: `${agente.commissionSplit}%` }}
              />
              <div
                className="bg-muted dark:bg-muted"
                style={{ width: `${100 - agente.commissionSplit}%` }}
              />
            </div>
          </div>
        )}

        {/* Contact and Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${agente.email}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1 justify-center gap-2')}
          >
            <Envelope className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.email')}
          </a>
          <a
            href={`tel:${agente.phone}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'flex-1 justify-center gap-2')}
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.consignaciones.detail.call')}
          </a>
          <IconButton
            variant="outline"
            onClick={onReassign}
            aria-label={t('inmobiliaria.consignaciones.detail.reassignAgent')}
            title={t('inmobiliaria.consignaciones.detail.reassignAgent')}
            icon={<ArrowsClockwise className="w-4 h-4" />}
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ============================================================================
// Documents Section
// ============================================================================

interface DocumentsSectionProps {
  consignacion: Consignacion;
  /** Después de adjuntar o reemplazar el contrato: la ficha se recarga. */
  onActualizado?: () => void;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Documentos del inmueble — filas que hacen algo, o dicen por qué no.
 *
 * Antes (Nico, 2026-09-03: «uno le da clic a acta de entrega y no pasa nada,
 * y ese otro documento ¿qué es? ¿eso está mockeado?»): el contrato era un
 * botón deshabilitado «Próximamente» y el acta hacía scroll a una tarjeta que
 * ya estaba a la vista. Ahora:
 *   · Contrato de consignación: es el PDF que la inmobiliaria firmó con el
 *     propietario. Se ADJUNTA (PDF, hasta 10 MB) y de ahí en más la fila lo
 *     abre EN UN MODAL del panel (`ContratoPdfModal`), con descargar, abrir en
 *     pestaña nueva y reemplazar; «Reemplazar» sube otro. No se genera desde
 *     una plantilla: el producto no tiene plantilla de contrato y un contrato
 *     no se inventa.
 *   · Acta de entrega: abre la hoja imprimible (`/inmuebles/[id]/acta`), que
 *     también se baja como PDF.
 */
export function DocumentsSection({ consignacion, onActualizado }: DocumentsSectionProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.consignaciones.detail.${s}`;
  const hasPhotos = consignacion.photosUrls && consignacion.photosUrls.length > 0;
  const filaClase =
    'w-full flex items-center gap-3 p-3 rounded-lg bg-surface-muted dark:bg-bg hover:bg-surface-hover dark:hover:bg-ink transition-colors text-left';
  const itemsDeInventario = consignacion.inventoryItems?.length || 0;
  // IA95-28: con el inventario de la captación vacío, el de sus actas (Vidi o Documentos).
  const actasDelMandato = useActasDelMandato(consignacion.id, itemsDeInventario === 0);
  const inventario = inventarioDeLaFicha(itemsDeInventario, actasDelMandato);
  const subtituloDelActa =
    inventario.de === 'acta'
      ? t(k(inventario.items === 1 ? 'handoverFromActaOne' : 'handoverFromActa'), {
          count: inventario.items,
          acta: t(k(inventario.tipo === 'devolucion' ? 'actaDeDevolucion' : 'actaDeEntrega')),
          fecha: fechaLarga(inventario.fecha),
        })
      : t(k(itemsDeInventario === 1 ? 'inventoryItemsCountOne' : 'inventoryItemsCount'), { count: itemsDeInventario });
  const hrefDelActa =
    inventario.de === 'acta' ? '/panel/inmobiliaria/documentos?tab=actas' : `/panel/inmobiliaria/inmuebles/${consignacion.id}/acta`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [contratoAbierto, setContratoAbierto] = useState(false);

  const elegirPdf = () => inputRef.current?.click();

  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Que el mismo archivo se pueda volver a elegir después de un fallo.
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) {
      toast.error(t(k('consignmentContractOnlyPdf')));
      return;
    }
    setSubiendo(true);
    try {
      await consignacionesApi.subirContrato(consignacion.id, file);
      toast.success(t(k('consignmentContractUploaded')));
      onActualizado?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      // Por el traductor (sistema de errores, 02-10-2026). Antes un motivo de
      // más de 160 caracteres se tiraba entero y un 5xx o la red no decían
      // nada: ahora va el motivo del back, «de nuestro lado» con la referencia,
      // o la conexión si no hubo respuesta.
      toast.error(t(k('consignmentContractUploadError')), {
        description: mensajeParaLaPersona(err, { accion: 'subir el contrato de consignación' }),
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <SectionCard title={t(k('documents'))} icon={<FileText className="w-4 h-4" />}>
      <div className="space-y-3">
        {consignacion.consignmentContractUrl ? (
          <div className="flex items-center gap-2">
            {/* Abre el modal, no una pestaña: el contrato se lee sin salir del
                panel (Nico, 2026-09-04). */}
            <button
              type="button"
              onClick={() => setContratoAbierto(true)}
              className={filaClase}
              data-testid="documento-contrato"
            >
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-fg text-sm">{t(k('consignmentContract'))}</p>
                <p className="text-xs text-fg-muted">{t(k('consignmentContractView'))}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-fg-subtle" />
            </button>
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={elegirPdf}
              disabled={subiendo}
              className="h-auto shrink-0 px-2 text-xs text-fg-muted hover:text-fg"
              data-testid="documento-contrato-reemplazar"
            >
              {subiendo ? t(k('consignmentContractUploading')) : t(k('consignmentContractReplace'))}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={elegirPdf}
            disabled={subiendo}
            className={cn(filaClase, 'disabled:opacity-60')}
            data-testid="documento-contrato-adjuntar"
          >
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
              <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
            </div>
            {/* 🔴 SIN texto de acción (Nico, 18-09-2026: «quita ese texto azul
                de adjuntar el PDF firmado, porque la acción es la misma card»).
                El renglón ENTERO es el botón; el subtítulo dice el estado y el
                ícono de la derecha anuncia qué pasa al tocarlo. Nombrar la
                acción otra vez adentro la hacía parecer un enlace aparte.
                Mientras sube sí se dice, porque eso es estado, no acción. */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-fg text-sm">{t(k('consignmentContract'))}</p>
              <p className="text-xs text-fg-muted">
                {subiendo
                  ? t(k('consignmentContractUploading'))
                  : t(k('consignmentContractMissing'))}
              </p>
            </div>
            <UploadSimple className="w-4 h-4 shrink-0 text-fg-subtle" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void alElegir(e)}
          data-testid="documento-contrato-input"
        />

        {consignacion.consignmentContractUrl && (
          <ContratoPdfModal
            abierto={contratoAbierto}
            onAbiertoChange={setContratoAbierto}
            url={consignacion.consignmentContractUrl}
            onReemplazar={elegirPdf}
            subiendo={subiendo}
          />
        )}

        <Link
          href={hrefDelActa}
          className={filaClase}
          data-testid="documento-acta"
        >
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <FileText className="w-5 h-5 text-fg-muted" weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-fg text-sm">{t(k('handoverReport'))}</p>
            <p className="text-xs text-fg-muted">
              {subtituloDelActa}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0 text-fg-subtle" />
        </Link>

        {/* Photos Gallery */}
        {hasPhotos && (
          <div className="pt-3 border-t border-border-faint dark:border-border-strong">
            <div className="flex items-center gap-2 mb-3">
              <Images className="w-4 h-4 text-fg-subtle" />
              <span className="text-sm text-fg-muted dark:text-fg-subtle">
                {t('inmobiliaria.consignaciones.detail.gallery', { count: consignacion.photosUrls!.length })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {consignacion.photosUrls!.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-surface-muted dark:bg-ink">
                  <img src={url} alt={t('inmobiliaria.consignaciones.detail.photoAlt', { number: i + 1 })} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {consignacion.photosUrls!.length > 4 && (
              <Button variant="link" hideArrow className="w-full mt-2">
                {t('inmobiliaria.consignaciones.detail.viewMorePhotos', { count: consignacion.photosUrls!.length - 4 })}
              </Button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
