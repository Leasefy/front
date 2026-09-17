'use client';

// TODO(landlord-tradicional): este flujo de rechazo/edición/cancelación sólo vive bajo
// /panel/inmobiliaria/contratos/[id]/*. El panel landlord tradicional (route group `(landlord)`)
// usa rutas viejas tipo /panel/[propertyId]/contract/[candidateId] y no tiene estas features.
// Cuando se retome el panel landlord tradicional hay que portar: detail, editar, banner de
// modificaciones, historial de rechazos, botón cancelar, link al chat.
//
// TODO(mensajes-modulo): el botón "Abrir chat" sigue gateado por rol (useAgencyAccess.isManager)
// porque 'mensajes' aún no es módulo del backend. Cuando el backend lo agregue, migrar a
// canAccess('mensajes', 'view').

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { leerRespaldo, etiquetaDeTipo } from '@/lib/inmobiliaria/respaldo';
import { conRegreso, lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';
import Link from 'next/link';
import {
  CaretLeft,
  PaperPlaneTilt,
  PencilSimpleLine,
  CheckCircle,
  WarningCircle,
  FileText,
  User,
  Buildings,
  Clock,
  Info,
  Bell,
  ChatCircle,
  XCircle,
  ShieldCheck,
  CalendarX,
  ArrowsClockwise,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { TerminarContrato } from '@/components/contratos/TerminarContrato';
import { RenovarContratoVencido } from '@/components/contratos/RenovarContratoVencido';
import { IncrementosDelContrato } from '@/components/contratos/IncrementosDelContrato';
import { CesionDelInmueble } from '@/components/contratos/CesionDelInmueble';
import { etiquetaDeVigencia, vigenciaDelContrato, type Vigencia } from '@/lib/contratos/vigencia';
import { sanitizeContractHtml } from '@/lib/utils/sanitize-html';
import { Button } from '@/components/ui/button';
import { Spinner, Badge } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { ArriendoDelContrato, AvisoDelContrato } from '@/components/contratos/ArriendoDelContrato';
import { fechaLegible, hoyLocal } from '@/components/estado-de-cuenta/filas';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAgencyAccess } from '@/lib/auth/useAgencyAccess';
import { AuditTrail } from '@/components/contract/AuditTrail';
import { RejectionsHistory } from '@/components/contract/RejectionsHistory';
import { CancelContractModal } from '@/components/contract/CancelContractModal';
import { DownloadContractPdfButton } from '@/components/contract/DownloadContractPdfButton';
import { useContract, useContractPreview, useContractActions, useContractRejections, useSignedPdfUrl } from '@/lib/hooks/useContracts';
import { isPermissionError, mensajeDelFallo, estadoDelFallo } from '@/lib/contratos/fallo-de-accion';
import { CONTRACT_STATUS_LABELS } from '@/lib/types/contract';
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { AdministracionDelContrato } from '@/components/contratos/AdministracionDelContrato';
import { EscenarioTributario } from '@/components/contratos/EscenarioTributario';
import { ConceptosDelContrato } from '@/components/contratos/ConceptosDelContrato';
import { CobrosDelContrato } from '@/components/contratos/CobrosDelContrato';
import { ReglasDeMoraDelContrato } from '@/components/contratos/ReglasDeMoraDelContrato';
import { RenovacionDelContrato } from '@/components/contratos/RenovacionDelContrato';
import { ComprobantesDelSistemaAnterior } from '@/components/contabilidad/ComprobantesDelSistemaAnterior';
import { PqrsDelContrato } from '@/components/contratos/PqrsDelContrato';
import { VincularInmueble } from '@/components/contratos/VincularInmueble';
import { PartesDelContrato } from '@/components/contratos/PartesDelContrato';
import { InmuebleDelContrato } from '@/components/contratos/InmuebleDelContrato';
import { ContratoSinSenal } from '@/components/contratos/ContratoSinSenal';
import { numeroDelContrato, tituloDelContrato } from '@/lib/contratos/numero-del-contrato';

const PRE_SIGNED_STATES: ContractStatus[] = ['draft', 'pending_landlord', 'pending_tenant', 'rejected_pending_modifications'];

// ContractStatus → Cadence Badge tone (replaces the hand-rolled CONTRACT_STATUS_COLORS pill).
type ContractBadgeVariant = 'secondary' | 'warning' | 'default' | 'success' | 'destructive';
const CONTRACT_STATUS_BADGE: Record<ContractStatus, ContractBadgeVariant> = {
  draft: 'secondary',
  pending_landlord: 'warning',
  pending_tenant: 'default',
  rejected_pending_modifications: 'warning',
  signed: 'default',
  active: 'success',
  expired: 'secondary',
  cancelled: 'destructive',
};

/**
 * A dónde vuelve quien abrió este contrato, y cómo se le dice.
 *
 * 🔴 El enlace de arriba decía «Contratos» siempre y llevaba al listado,
 * viniera de donde viniera. Desde el 2026-09-12 la ficha del inmueble ofrece
 * «Ver contrato» —el inquilino trae su `contractId`—, así que ese «Volver»
 * dejaba a alguien parado en una lista de 1.836 filas buscando el inmueble
 * del que acababa de salir. El origen viaja en `?volver=`, igual que en la
 * ficha del propietario; `rutaDeRegreso` sólo lo acepta si apunta adentro del
 * panel.
 *
 * En español a secas porque esta pantalla no pasa por i18n: no tiene una sola
 * llamada a `t()`. Meter la primera acá, para un enlace, dejaría el archivo a
 * medio camino entre dos convenciones.
 */
const LISTA_DE_CONTRATOS = '/panel/inmobiliaria/contratos';
const VUELVE_A: Record<ReturnType<typeof lugarDeRegreso>, string> = {
  lista: 'Contratos',
  contrato: 'Volver al contrato',
  inmueble: 'Volver al inmueble',
  cobro: 'Volver a cobros',
  propietario: 'Volver al propietario',
  dispersiones: 'Volver a dispersiones',
  otro: 'Volver',
};

// ─── Content ─────────────────────────────────────────────────────────────────

function ContratoDetalleContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;

  const rutaDeVuelta = rutaDeRegreso(searchParams.get('volver'), LISTA_DE_CONTRATOS);
  const etiquetaDeVuelta = VUELVE_A[lugarDeRegreso(rutaDeVuelta)];

  const { contract, isLoading, error, errorCrudo, refetch, setContract } = useContract(id);
  // El respaldo vive en las cláusulas del contrato: es el campo real que
  // el backend persiste hoy. Ver src/lib/inmobiliaria/respaldo.ts.
  const respaldo = leerRespaldo(contract?.customClauses);
  // `sinDocumento` es el contrato migrado —sin HTML ni PDF en Leasefy—, que
  // NO es un fallo; `errorCrudo` es todo lo demás, y eso sí se pinta como
  // error. Ver `esContratoSinDocumento` en contracts.service.ts.
  const {
    preview,
    isLoading: isLoadingPreview,
    errorCrudo: falloDelDocumento,
    sinDocumento,
    refetch: recargarDocumento,
  } = useContractPreview(id);
  const { rejections } = useContractRejections(id);
  const actions = useContractActions();

  // Cuando el contrato tiene al menos una firma, usamos /pdf para que el iframe muestre
  // el estampado actualizado (parcial o final). En DRAFT / PENDING_TENANT caemos al /preview
  // (original, más barato).
  const hasAnySignature = !!(contract?.tenantSignature || contract?.landlordSignature);
  const { url: signedPdfUrl, isLoading: isLoadingSignedPdf } = useSignedPdfUrl(id, {
    enabled: hasAnySignature,
  });
  const { canAccess } = usePermissions();
  // Chat todavía se gate por rol porque 'mensajes' aún no es módulo del backend.
  const { isManager } = useAgencyAccess();
  const canEditContracts = canAccess('contratos', 'edit');
  // T-0036 §3.2.B6/Y2 — el botón de invitar al inquilino gatea con el MISMO
  // permiso que exige el back (`contratos:create`, no `contratos:edit`):
  // usar `canEditContracts` acá mostraría el botón a un rol que el back le
  // responde 403.
  const canInviteTenant = canAccess('contratos', 'create');

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [terminarAbierto, setTerminarAbierto] = useState(false);
  const [cesionAbierta, setCesionAbierta] = useState(false);

  /*
   * 🔴 Cómo está el contrato HOY, calculado y no guardado: un `active` cuya
   * fecha de fin pasó es un contrato VENCIDO, aunque su estado siga diciendo
   * «activo». La misma regla que el back (`vigencia-del-contrato.ts`).
   *
   * «Hoy» es el día CIVIL de quien mira, el mismo que usa el bloque del
   * arriendo para su línea: `vigenciaDelContrato` lee la fecha en UTC, y desde
   * las 7 p. m. en Bogotá UTC ya es mañana — la etapa diría «Vencido» mientras
   * la línea todavía dice «Vence hoy».
   */
  const hoy = hoyLocal();
  const vigencia = useMemo<Vigencia>(
    () =>
      vigenciaDelContrato(
        {
          status: (contract?.status ?? 'draft') as ContractStatus,
          endDate: contract?.endDate ?? null,
          terminadoEn: contract?.terminadoEn ?? null,
        },
        new Date(`${hoy}T12:00:00.000Z`),
      ),
    [contract?.status, contract?.endDate, contract?.terminadoEn, hoy],
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const runAction = useCallback(
    async (key: string, op: () => Promise<unknown>, successMessage?: string) => {
      setActionError(null);
      setPendingAction(key);
      try {
        await op();
        await refetch();
      } catch (err) {
        // El motivo del back (400/409) en palabras; un 403 dice que es de permisos.
        setActionError(
          isPermissionError(err)
            ? 'No tienes permiso para esta acción.'
            : mensajeDelFallo(err, 'La operación falló. Intenta de nuevo.')
        );
      } finally {
        setPendingAction(null);
      }
      void successMessage;
    },
    [refetch]
  );

  const handleSend = () => contract && runAction('send', () => actions.send(contract.id));
  const handleActivate = () => contract && runAction('activate', () => actions.activate(contract.id));
  const handleCancel = async (reason: string | undefined) => {
    if (!contract) return;
    setIsCancelling(true);
    try {
      await actions.cancel(contract.id, reason ? { reason } : {});
    } catch (err) {
      setIsCancelling(false);
      // Se lee EL error que vino, no `actions.lastError` (que era el render viejo).
      toast.error(
        isPermissionError(err) ? 'No tienes permisos para esta acción.' : 'No se pudo cancelar el contrato.',
        { description: isPermissionError(err) ? undefined : mensajeDelFallo(err, 'Intenta de nuevo.') }
      );
      return;
    }
    setIsCancelling(false);
    toast.success('Contrato cancelado.');
    setIsCancelModalOpen(false);
    router.push('/panel/inmobiliaria/contratos');
  };
  const handleRemind = async () => {
    if (!contract) return;
    setActionError(null);
    setPendingAction('remind');
    try {
      await actions.remind(contract.id);
      setActionError(null);
      toast.success('Recordatorio enviado.');
    } catch (err) {
      // 429 = ya hubo uno en las últimas 24 h; cualquier otro fallo dice su motivo.
      const msg = mensajeDelFallo(err, 'No se pudo enviar el recordatorio.');
      if (estadoDelFallo(err) === 429 || /too\s*many|24h/i.test(msg)) {
        setActionError('Ya enviaste un recordatorio en las últimas 24 horas.');
      } else if (isPermissionError(err)) {
        setActionError('No tienes permiso para esta acción.');
      } else {
        setActionError(msg);
      }
    } finally {
      setPendingAction(null);
    }
  };
  void setContract;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que este contrato había sido eliminado, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error || !contract) {
    /*
     * 🔴 Sin señal, el contrato no se puede traer —vive en el back— pero el
     * inventario del inmueble sí puede estar guardado en este teléfono, y es
     * lo que la persona fue a hacer al apartamento. `ContratoSinSenal` deja el
     * fallo con su reintentar y agrega abajo lo que SÍ se puede hacer; sin
     * copia guardada muestra sólo el fallo, como antes.
     *
     * Va el error CRUDO del hook (`errorCrudo`), no su mensaje: con el string
     * un 404 se clasificaba como «problema nuestro» y ofrecía reintentar sobre
     * un contrato que no existe. Y `!contract` sin error —el back contestó
     * bien y sin contrato— cae acá también: antes era una tarjeta roja a mano,
     * sin reintentar ni a dónde volver.
     */
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <ContratoSinSenal contratoId={id}>
          <FalloDeCarga
            error={errorCrudo ?? error}
            queEs="este contrato"
            onReintentar={refetch}
            volverA={{ label: 'Contratos', href: LISTA_DE_CONTRATOS }}
          />
        </ContratoSinSenal>
      </div>
    );
  }

  // `secondary`, no `neutral`: `neutral` no es una variante del Badge de la
  // casa (es el nombre interno del DS) y un estado desconocido caía en el
  // fallback `default` —cobalto, el mismo del «Firmado»—.
  //
  // 🔴 El chip lee la VIGENCIA, como el listado: un `active` cuya fecha de fin
  // pasó dice «Vencido» en ámbar, no «Activo», y uno terminado dice
  // «Terminado». Antes el chip decía «Activo» justo encima de «Vencido desde…».
  const statusVariant: ContractBadgeVariant = vigencia.vencidoSinRenovar
    ? 'warning'
    : vigencia.estado === 'TERMINADO_ANTICIPADAMENTE' || vigencia.estado === 'TERMINADO_POR_VENCIMIENTO'
      ? 'secondary'
      : CONTRACT_STATUS_BADGE[contract.status as ContractStatus] ?? 'secondary';
  const statusLabel = etiquetaDeVigencia(
    vigencia,
    CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status,
  );
  const numero = numeroDelContrato(contract);
  // Gate por permisos: contratos usa canAccess ('contratos' ya es módulo del backend).
  // Chat todavía usa el fallback por rol porque 'mensajes' no existe como módulo aún.
  const canCancel = canEditContracts && PRE_SIGNED_STATES.includes(contract.status as ContractStatus);
  const esPreFirma = PRE_SIGNED_STATES.includes(contract.status as ContractStatus);
  // Un contrato cancelado o vencido ya no cobra: sus conceptos se LEEN —qué se
  // cobraba— pero no se agregan ni se quitan, que sería editar un cobro que
  // no va a salir.
  const esTerminado = contract.status === 'cancelled' || contract.status === 'expired';
  const chatHref = isManager && contract.applicationId
    ? `/panel/inmobiliaria/mensajes?applicationId=${contract.applicationId}`
    : null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            asChild
            variant="link"
            hideArrow
            className="mb-3 h-auto gap-1 px-0 text-muted-foreground hover:text-foreground hover:no-underline"
          >
            <Link href={rutaDeVuelta}>
              <CaretLeft className="w-4 h-4" /> {etiquetaDeVuelta}
            </Link>
          </Button>
          {/*
            T-0040 — el número es el nombre del contrato: va en el título, no
            en una línea debajo de un título genérico. El UUID vuelve tal cual
            cuando no hay número —sólo un `back` anterior a T-0040 lo
            produce—. Sin `#0` ni `#undefined`: o el número, o el id.

            🔴 Nico, 2026-09-12: para un contrato MIGRADO el número que se lee
            es el de SU sistema anterior (1686), no nuestro consecutivo
            (#1839) — lo buscó en su archivo y era otra persona. El nuestro va
            debajo, nombrado, para que se sepa cuál es cuál
            (`numero-del-contrato.ts`).
          */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-h2 text-fg">{tituloDelContrato(contract)}</h1>
            <Badge variant={statusVariant}>
              {statusLabel}
            </Badge>
          </div>
          {numero.principal == null ? (
            <p className="text-sm text-muted-foreground mt-1">ID: {contract.id}</p>
          ) : null}
          {numero.esDeLaInmobiliaria ? (
            <p className="text-sm text-muted-foreground mt-1" data-testid="numero-de-leasefy">
              {numero.principal} es el número de tu sistema anterior.
            </p>
          ) : null}
          {/* De qué contrato se trata, sin bajar a las tarjetas: inmueble e inquilino. */}
          <p className="text-sm text-muted-foreground mt-1">
            {[
              [contract.propertyAddress, contract.propertyCity].filter(Boolean).join(', ') || null,
              contract.tenantName || null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Arrendamiento'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <DownloadContractPdfButton
            contractId={contract.id}
            contractStatus={contract.status}
            variant="secondary"
          />
          {chatHref && (
            <Button asChild variant="secondary" hideArrow className="gap-2">
              <Link href={chatHref}>
                <ChatCircle className="w-4 h-4" />
                Abrir chat
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/*
        🔴 EL ARRIENDO, en un solo bloque (Nico, 2026-09-16: «esto debe verse
        más unificado»). Reemplaza a tres cajas que se contradecían: la franja
        de cuatro números (con un «Saldo del inquilino» que sumaba COBROS), el
        resumen del estado de cuenta y la caja verde de «Arriendo en curso».
        Se lee de arriba abajo: en qué va, cuánto va del contrato, cuánto paga
        y cuándo, cómo va con la plata —desde el ESTADO DE CUENTA, que es la
        puerta principal— y, al pie, las decisiones del ciclo de vida.
      */}
      <ArriendoDelContrato
        contract={contract}
        vigencia={vigencia}
        hoy={hoy}
        {...(canEditContracts
          ? decisionesDelContrato({
              contract,
              isSubmitting: actions.isSubmitting,
              pendingAction,
              latestRejectionReason: rejections[0]?.reason,
              canCancel,
              vigencia,
              onSend: handleSend,
              onActivate: handleActivate,
              onRemind: handleRemind,
              onSign: () => router.push(`/panel/inmobiliaria/contratos/${contract.id}/firmar`),
              onEdit: () => router.push(`/panel/inmobiliaria/contratos/${contract.id}/editar`),
              onCancelRequest: () => setIsCancelModalOpen(true),
              onTerminar: () => setTerminarAbierto(true),
              onCeder: () => setCesionAbierta(true),
            })
          : {})}
      />

      {/* 17-09: contrato vencido con el inquilino adentro → renovar, nunca prórroga automática. */}
      {canEditContracts && contract.status === 'active' && (
        <RenovarContratoVencido contractId={contract.id} onRenovado={() => void refetch()} />
      )}

      {/* 17-09: incrementos del canon (vivienda al IPC, local comercial digitado) y su carta. */}
      {(contract.status === 'active' || contract.status === 'signed') && (
        <IncrementosDelContrato contractId={contract.id} puedeEditar={canEditContracts} />
      )}

      {canEditContracts && (
        <>
          <TerminarContrato
            contractId={contract.id}
            abierto={terminarAbierto}
            onCerrar={() => setTerminarAbierto(false)}
            onTerminado={() => void refetch()}
          />

          <CesionDelInmueble
            contractId={contract.id}
            propietarioActual={
              contract.propietarioDeLaConsignacion?.name ?? contract.landlordName ?? null
            }
            abierto={cesionAbierta}
            onCerrar={() => setCesionAbierta(false)}
            onRegistrada={() => void refetch()}
          />

          <CancelContractModal
            open={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancel}
            isSubmitting={isCancelling}
            actor="landlord"
          />
        </>
      )}

      {/* Rejection history — visible whenever there have been rejections */}
      {rejections.length > 0 && (
        <RejectionsHistory rejections={rejections} />
      )}

      {actionError && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2">
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{actionError}</p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — info cards */}
        <div className="lg:col-span-1 space-y-4">
          <InfoCard title="Partes" icon={User}>
            {/* Todos los dueños con su porcentaje y su parte del canon, y
                todos los inquilinos con su DOCUMENTO (Nico, 2026-09-12). */}
            <PartesDelContrato
              contract={contract}
              puedeInvitar={canInviteTenant}
              puedeEditar={canEditContracts}
              onActualizado={(c) => setContract(c)}
              onConflicto={() => void refetch()}
            />
          </InfoCard>

          <InfoCard title="Inmueble" icon={Buildings}>
            {contract.propertyId === null && (
              /* Sin inmueble no hay consignación, y sin consignación no hay
                 cobros: todo lo demás de esta pantalla se queda escrito. El
                 mismo permiso que exige el back (`contratos:create`). */
              <div className="space-y-2 pb-1">
                <p className="text-sm text-muted-foreground">
                  Sin inmueble vinculado: este contrato no genera cobros.
                </p>
                <VincularInmueble
                  contract={contract}
                  puedeVincular={canInviteTenant}
                  onActualizado={(c) => {
                    setContract(c);
                    toast.success('Inmueble vinculado. Los próximos cobros salen sobre su consignación.');
                  }}
                />
              </div>
            )}
            <InfoRow label="Dirección" value={contract.propertyAddress} />
            <InfoRow label="Ciudad" value={contract.propertyCity} />
            {contract.propertyId ? (
              /* La dirección de arriba es la que dice el contrato (no se pisa
                 al vincular); la ficha del inmueble es donde se ve cuál quedó. */
              <Link
                href={`/panel/inmobiliaria/inmuebles/${contract.propertyId}`}
                className="inline-block text-sm font-medium text-primary hover:underline"
                data-testid="ver-inmueble"
              >
                Ver la ficha del inmueble →
              </Link>
            ) : null}
          </InfoCard>

          {/* La vigencia —inicio, fin y cuánto va— vive en el bloque del
              arriendo, arriba. Esta tarjeta la repetía con otro formato de
              fecha y otra barra. */}

          {/* Uso, periodicidad y comisión. Se guardaban desde la migración y no
              se veían en ninguna pantalla — y el uso decide si hay IVA. */}
          <AdministracionDelContrato
            contract={contract}
            puedeEditar={canEditContracts}
            onActualizado={(c) => setContract(c)}
          />

          {/* Cómo se llama la situación tributaria que forman las dos partes y
              qué genera (Nico, 2026-09-12: «los contratos no están mostrando la
              información sobre el escenario que se da en ese contrato»). Va
              pegado a Administración porque los datos que lo definen —el uso
              del inmueble y el perfil del inquilino— se corrigen justo arriba. */}
          <EscenarioTributario contract={contract} />

          {/* Paso 11: quién respalda este arriendo. Si no está, se dice — un
              contrato sin respaldo registrado no es un contrato sin respaldo,
              pero tampoco se puede afirmar que lo tiene. */}
          {respaldo ? (
            <InfoCard title="Respaldo del arriendo" icon={ShieldCheck}>
              <InfoRow label="Aseguradora" value={respaldo.aseguradora} />
              <InfoRow label="Tipo" value={etiquetaDeTipo(respaldo.tipo)} />
              <InfoRow label="Número" value={respaldo.identificador} />
              {(respaldo.vigenciaDesde || respaldo.vigenciaHasta) && (
                <InfoRow
                  label="Vigencia"
                  value={[respaldo.vigenciaDesde, respaldo.vigenciaHasta]
                    .filter(Boolean)
                    .join(' → ')}
                />
              )}
            </InfoCard>
          ) : (
            <InfoCard title="Respaldo del arriendo" icon={ShieldCheck}>
              <p className="text-sm text-muted-foreground">
                Este contrato no tiene registrada la aseguradora que aprobó ni el
                número de la póliza. Sin eso no hay a quién reclamarle si algo pasa.
              </p>
            </InfoCard>
          )}

          {contract.auditTrail && contract.auditTrail.length > 0 && (
            <InfoCard title="Historial" icon={Clock}>
              <AuditTrail contract={contract} rejections={rejections} />
            </InfoCard>
          )}
        </div>

        {/*
          Derecha — la cuenta del contrato. Antes esta columna era sólo el
          documento, y para un contrato activo eso es un iframe vacío ocupando
          dos tercios de la pantalla mientras lo que se cobra y lo que se
          cobró vivían abajo del pliegue en la columna angosta. El documento
          manda mientras se firma; una vez activo, manda la plata.
        */}
        <div className="lg:col-span-2 space-y-6">
          {!esPreFirma && (
            <>
              <ConceptosDelContrato contract={contract} puedeEditar={canEditContracts && !esTerminado} />
              {/* Las reglas de mora de la inmobiliaria, y cuáles pisa este contrato. */}
              <ReglasDeMoraDelContrato contract={contract} puedeEditar={canEditContracts} />
              {/*
                🔴 Qué va a pasar cuando venza: se renueva sola por el mismo
                término con el canon incrementado si nadie avisa tres meses
                antes (Ley 820, arts. 20 y 22). Nico, 2026-09-12.
              */}
              <RenovacionDelContrato contract={contract} puedeEditar={canEditContracts} />
              <CobrosDelContrato
                key={contract.propertyId ?? 'sin-inmueble'}
                contract={contract}
              />
              {/*
                La historia contable ANTERIOR a Leasefy: los comprobantes que
                la inmobiliaria subió de su sistema viejo y que el back colgó
                de este contrato. Va después de los cobros porque ése es el
                orden real — arriba lo que se cobra hoy, abajo lo que quedó
                registrado antes.

                Sólo con el contrato ya firmado: la asociación del back exige
                que el contrato estuviera VIGENTE en la fecha del comprobante,
                así que uno que todavía se está firmando no puede tener
                ninguno, y pedirlos sería una petición que siempre vuelve
                vacía.

                En tres pestañas —ingresos · egresos · facturas— porque una
                sola lista mezclada no deja ver nada (Nico, 2026-09-12).
              */}
              <ComprobantesDelSistemaAnterior contractId={contract.id} />
              {/* El seguimiento de PQRS del contrato (Nico, 2026-09-12). */}
              <PqrsDelContrato contractId={contract.id} />
            </>
          )}

          <section className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Documento</h3>
            </div>
            <div className="p-5">
              {/* Cuando hay firma(s), el iframe usa la URL de /pdf (con estampado actualizado).
                  Si está cargando o no hay firmas, cae al /preview (HTML o PDF original). */}
              {hasAnySignature && (isLoadingSignedPdf || signedPdfUrl) ? (
                <div className="space-y-3">
                  {contract.tenantSignature && !contract.landlordSignature && (
                    <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-warning">
                        Este PDF ya incluye la <strong>firma del inquilino</strong> y un certificado parcial.
                        Firma abajo para completar el contrato.
                      </p>
                    </div>
                  )}
                  {contract.tenantSignature && contract.landlordSignature && (
                    <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-success">
                        PDF final con <strong>ambas firmas</strong>, certificado completo y hash SHA-256.
                      </p>
                    </div>
                  )}
                  {isLoadingSignedPdf ? (
                    <div className="py-20 flex items-center justify-center">
                      <Spinner size="default" variant="muted" />
                    </div>
                  ) : (
                    <iframe
                      src={signedPdfUrl!}
                      className="w-full h-[720px] rounded-md border border-border bg-surface"
                      title="Contrato"
                    />
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Enlace válido por tiempo limitado. Si caduca, recarga la página.
                  </p>
                </div>
              ) : isLoadingPreview ? (
                <div className="py-20 flex items-center justify-center">
                  <Spinner size="sm" variant="muted" />
                </div>
              ) : preview?.origin === 'UPLOADED_PDF' ? (
                <div className="space-y-3">
                  <iframe
                    src={preview.pdfUrl}
                    className="w-full h-[720px] rounded-md border border-border bg-surface"
                    title="Contrato"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Enlace válido por tiempo limitado. Si caduca, recarga la página.
                  </p>
                </div>
              ) : preview?.origin === 'GENERATED' ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  {...sanitizeContractHtml(preview.html)}
                />
              ) : sinDocumento ? (
                /*
                  🔴 Nico, 2026-09-12: un contrato migrado NO tiene documento
                  en Leasefy —se cargó desde el archivo de la inmobiliaria, ya
                  firmado en papel— y el 400 del preview pintaba un cartel rojo
                  en los 1.836 contratos de la migración. No es un fallo: se
                  dice de frente y sin alarma.

                  No hay acción que ofrecer hoy, y no se inventa ninguna:
                  · adjuntar el PDF firmado lo rechaza el back («Solo se puede
                    reemplazar el PDF en contratos con
                    contractOrigin=UPLOADED_PDF»), y el PATCH además devuelve
                    el contrato a PENDING_TENANT_SIGNATURE — sobre un contrato
                    VIGENTE eso es romperlo;
                  · armar desde plantilla sólo existe al CREAR
                    (/contratos/nuevo), no sobre un contrato que ya existe.
                  Cuando exista alguno de los dos caminos, el botón va acá.
                */
                <p className="text-sm text-muted-foreground py-2" data-testid="contrato-sin-documento">
                  Este contrato se cargó desde tu sistema anterior y no tiene documento generado en Leasefy.
                </p>
              ) : falloDelDocumento ? (
                /* Un 400 con OTRO motivo, o un 500: eso sí es un fallo. */
                <FalloDeCarga
                  error={falloDelDocumento}
                  queEs="el documento del contrato"
                  onReintentar={recargarDocumento}
                  enmarcado={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Todavía no hay documento para este contrato.
                </p>
              )}
            </div>
          </section>

          {esPreFirma && (
            <>
              <ConceptosDelContrato contract={contract} puedeEditar={canEditContracts} />
              {/* Las reglas de mora de la inmobiliaria, y cuáles pisa este contrato. */}
              <ReglasDeMoraDelContrato contract={contract} puedeEditar={canEditContracts} />
              <CobrosDelContrato
                key={contract.propertyId ?? 'sin-inmueble'}
                contract={contract}
              />
            </>
          )}

          {/*
            🔴 Nico, 2026-09-12: el inventario y el historial del inmueble se
            ven también desde el contrato, no sólo desde la ficha del inmueble.
            🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar
            todo lo que se pueda agregar del inventario» — el mismo componente
            de la ficha del inmueble, sobre la misma consignación.
            Sin inmueble se dice ahí mismo en vez de dejar un hueco: el
            inventario es del inmueble y este contrato todavía no tiene uno.
          */}
          <InmuebleDelContrato
            key={contract.propertyId ?? 'sin-inmueble'}
            propertyId={contract.propertyId}
            contratoId={contract.id}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

/**
 * Lo que se puede decidir sobre el contrato desde su ficha, repartido en los
 * dos lugares del bloque del arriendo:
 *
 *   · `aviso` — lo que pide atención, debajo de la etapa: el paso de la firma
 *     que sigue (enviar, recordar, firmar, corregir, activar) o la decisión
 *     sobre un contrato VENCIDO (renovar o terminar).
 *   · `acciones` — lo que pasa una vez en la vida del contrato y no compite
 *     con nada: terminar un arriendo en curso, la venta del inmueble, cancelar
 *     uno que no se ha firmado. Al pie y en voz baja.
 *
 * Antes era una `ActionBar` que pintaba la caja ENTERA del color del estado:
 * «Arriendo en curso» salía en una caja verde gigante que gritaba algo que no
 * es urgente (Nico, 2026-09-16: «no uses ese tono verde»).
 */
function decisionesDelContrato({
  contract,
  isSubmitting,
  pendingAction,
  latestRejectionReason,
  canCancel,
  vigencia,
  onSend,
  onSign,
  onActivate,
  onRemind,
  onEdit,
  onCancelRequest,
  onTerminar,
  onCeder,
}: {
  contract: { id: string; status: string };
  isSubmitting: boolean;
  pendingAction: string | null;
  latestRejectionReason?: string;
  canCancel: boolean;
  /** Cómo está este contrato hoy — de acá sale si está vencido. */
  vigencia: Vigencia;
  onSend: () => void;
  onSign: () => void;
  onActivate: () => void;
  onRemind: () => void;
  onEdit: () => void;
  onCancelRequest: () => void;
  onTerminar: () => void;
  onCeder: () => void;
}): { aviso?: React.ReactNode; acciones?: React.ReactNode } {
  const status = contract.status as ContractStatus;
  const enVozBaja = 'h-auto gap-1.5 px-0 text-caption font-medium text-fg-muted hover:text-fg hover:no-underline';

  /*
   * La cesión no es destructiva pero tampoco es la acción principal: pasa una
   * vez en la vida de un contrato y no queremos que compita con «Terminar».
   */
  const cesion = (
    <Button type="button" variant="link" hideArrow onClick={onCeder} className={enVozBaja} data-testid="abrir-cesion">
      <ArrowsLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
      Cambiar de propietario
    </Button>
  );
  const terminar = (
    <Button type="button" variant="link" hideArrow onClick={onTerminar} className={enVozBaja} data-testid="abrir-terminar">
      <CalendarX className="w-3.5 h-3.5" aria-hidden="true" />
      Terminar el arriendo
    </Button>
  );
  const cancelar = canCancel ? (
    <Button
      type="button"
      variant="link"
      hideArrow
      onClick={onCancelRequest}
      className="h-auto gap-1.5 px-0 text-caption font-medium text-danger hover:text-danger hover:no-underline"
    >
      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
      Cancelar contrato
    </Button>
  ) : null;
  const editar = { label: 'Editar', icon: PencilSimpleLine, onClick: onEdit };

  if (status === 'draft') {
    return {
      aviso: (
        <AvisoDelContrato
          tono="paso"
          icono={FileText}
          titulo="Contrato en borrador"
          detalle="Cuando lo envíes para firma, el inquilino firmará primero. Después te toca firmar a ti para cerrar."
          principal={{
            label: 'Enviar al inquilino',
            icon: PaperPlaneTilt,
            onClick: onSend,
            loading: isSubmitting && pendingAction === 'send',
          }}
          secundaria={editar}
        />
      ),
      acciones: cancelar,
    };
  }

  if (status === 'pending_tenant') {
    return {
      aviso: (
        <AvisoDelContrato
          tono="paso"
          icono={PaperPlaneTilt}
          titulo="Esperando firma del inquilino"
          detalle="El inquilino recibió el contrato y tiene que firmar primero. Puedes reenviarle un recordatorio si no lo hizo."
          principal={{
            label: 'Recordar firma',
            icon: Bell,
            onClick: onRemind,
            loading: isSubmitting && pendingAction === 'remind',
          }}
          secundaria={editar}
        />
      ),
      acciones: cancelar,
    };
  }

  if (status === 'pending_landlord') {
    return {
      aviso: (
        <AvisoDelContrato
          tono="atencion"
          icono={PencilSimpleLine}
          titulo="El inquilino ya firmó — firma para cerrar"
          detalle="Es tu turno. Firma y el contrato queda listo para activar en la fecha pactada."
          principal={{ label: 'Firmar como propietario', icon: PencilSimpleLine, onClick: onSign }}
          secundaria={editar}
        />
      ),
      acciones: cancelar,
    };
  }

  if (status === 'rejected_pending_modifications') {
    const truncated = latestRejectionReason && latestRejectionReason.length > 180
      ? latestRejectionReason.slice(0, 180).trimEnd() + '…'
      : latestRejectionReason;
    return {
      aviso: (
        <AvisoDelContrato
          tono="atencion"
          icono={WarningCircle}
          titulo="El inquilino solicitó cambios"
          detalle={truncated ?? 'Edita los términos y vuelve a firmar para enviarlo de nuevo.'}
          principal={{ label: 'Corregir contrato', icon: PencilSimpleLine, onClick: onEdit }}
        />
      ),
      acciones: cancelar,
    };
  }

  if (status === 'signed') {
    return {
      aviso: (
        <AvisoDelContrato
          tono="paso"
          icono={CheckCircle}
          titulo="Contrato firmado"
          detalle="Ambas partes firmaron. Actívalo para iniciar el arrendamiento."
          principal={{
            label: 'Activar contrato',
            icon: CheckCircle,
            onClick: onActivate,
            loading: isSubmitting && pendingAction === 'activate',
          }}
        />
      ),
    };
  }

  /*
   * 🔴 Un contrato que YA PASÓ su fecha de fin (auditoría 2026-09-13, N2).
   * Sigue `active` porque nada lo vence solo —la prórroga tácita es la regla—,
   * pero no puede seguir leyéndose «en curso»: acá se dice desde cuándo y se
   * ofrecen los dos caminos. Es lo único de este bloque que conserva un acento
   * de advertencia, y vive en el círculo del ícono, no en la caja.
   */
  if (vigencia.vencidoSinRenovar) {
    return {
      aviso: (
        <AvisoDelContrato
          tono="atencion"
          icono={CalendarX}
          titulo={`Vencido desde el ${fechaLegible(vigencia.vencidoDesde)}`}
          detalle={`Pasaron ${vigencia.diasVencido} ${vigencia.diasVencido === 1 ? 'día' : 'días'} de la fecha de fin y nadie lo renovó ni lo terminó. Mientras no decidas, sigue activo.`}
          principal={{
            label: 'Renovar contrato',
            icon: ArrowsClockwise,
            onClick: () => {
              document
                .querySelector('[data-testid="renovacion-del-contrato"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
          }}
          secundaria={{ label: 'Terminar el arriendo', icon: CalendarX, onClick: onTerminar }}
        />
      ),
      acciones: cesion,
    };
  }

  /*
   * 🔴 Activo y dentro de plazo. Antes de la auditoría del 2026-09-13 (N1 · P0
   * y C8) esto no ofrecía nada, y un arriendo que se rompía antes de tiempo no
   * tenía salida en la pantalla. Hoy la salida está, pero al pie: terminar un
   * arriendo en curso no es lo que se viene a hacer todos los días.
   */
  if (status === 'active') {
    return {
      acciones: (
        <>
          {terminar}
          {cesion}
        </>
      ),
    };
  }

  return {};
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{display}</span>
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function ContratoDetallePage() {
  return (
    <PageGuard module="contratos" action="view">
      <ContratoDetalleContent />
    </PageGuard>
  );
}
