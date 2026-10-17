'use client';

/**
 * La cuenta bancaria de un dueño del contrato, con «Cambiar cuenta» sin salir
 * del contrato (Nico, QA de agentes 17-10, «Desde el contrato, uno por uno»).
 *
 * No es un flujo nuevo: «Cambiar cuenta» monta el MISMO `CambioDeCuentaBancaria`
 * de la ficha del propietario, con su certificación, la confirmación de ese
 * dueño y la aprobación de un administrador. Cada dueño se cambia por su lado:
 * es el control contra el fraude.
 */

import { useCallback, useEffect, useState } from 'react';
import { Bank, PencilSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { CambioDeCuentaBancaria } from '@/components/inmobiliaria/mandato/CambioDeCuentaBancaria';
import { mandatoApi, type CambiosDeCuentaDelPropietario } from '@/lib/api/mandato.service';
import { ESTADO_DEL_CAMBIO_DE_CUENTA } from '@/lib/mandato/textos';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { resumenDeLaCuenta } from '@/lib/contratos/cuenta-del-dueno';

export function CuentaDelDueno({
  propietarioId,
  nombre,
  documento,
}: {
  propietarioId: string;
  nombre: string;
  documento: string | null;
}) {
  // Fuera del panel (sin permisos cargados) no se muestra: no se sabe si puede verla.
  const permisos = usePermissionsContextSafe();
  // Ver la cuenta es ver la plata del propietario (como en su ficha).
  const veLaPlata = permisos?.canAccess('dispersiones', 'view') ?? false;
  const puedeEditar = permisos?.canAccess('propietarios', 'edit') ?? false;
  const [datos, setDatos] = useState<CambiosDeCuentaDelPropietario | null>(null);
  const [falla, setFalla] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [pedido, setPedido] = useState(0);
  const propietario = { nombre, documento: documento ?? '' };

  const cargar = useCallback(async () => {
    try {
      setDatos(await mandatoApi.cambiosDeCuenta(propietarioId));
      setFalla(false);
    } catch {
      setFalla(true);
    }
  }, [propietarioId]);

  useEffect(() => {
    if (veLaPlata) void cargar();
  }, [veLaPlata, cargar]);

  if (!veLaPlata) return null;
  if (falla) {
    return (
      <p className="mt-1 text-caption text-muted-foreground" data-testid="cuenta-del-dueno-fallo">
        No pudimos leer su cuenta bancaria.{' '}
        <button type="button" className="underline underline-offset-2" onClick={() => void cargar()}>
          Reintentar
        </button>
      </p>
    );
  }
  if (!datos) return null;

  const resumen = resumenDeLaCuenta(datos.cuentasVigentes ?? [], propietario);
  const ultimo = datos.cambios[0] ?? null;
  const enCurso = ultimo && (ultimo.estado === 'PENDIENTE_CONFIRMACION' || ultimo.estado === 'CONFIRMADO') ? ultimo : null;
  const tieneCuenta = resumen !== null;
  const sePuedeCambiar = puedeEditar && datos.disponible && tieneCuenta && !enCurso;

  return (
    <div className="mt-1.5 space-y-2" data-testid="cuenta-del-dueno">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Bank className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="text-foreground">{resumen?.cuenta ?? 'Sin cuenta bancaria'}</span>
          </span>
          {resumen?.aNombreDe ? <span className="block">A nombre de {resumen.aNombreDe}</span> : null}
          {enCurso && !abierto ? (
            <span className="block text-warning" data-testid="cambio-en-curso-del-dueno">
              Cambio de cuenta: {ESTADO_DEL_CAMBIO_DE_CUENTA[enCurso.estado].toLowerCase()}
            </span>
          ) : null}
        </div>
        {/* Abierto, la sección del cambio trae sus propias acciones (y su estado al día). */}
        {!abierto && (sePuedeCambiar || enCurso) ? (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            className="-ml-2"
            data-testid="cambiar-cuenta-del-dueno"
            onClick={() => {
              setAbierto(true);
              if (sePuedeCambiar) setPedido((n) => n + 1);
            }}
          >
            <PencilSimple className="mr-1 h-4 w-4" aria-hidden="true" />
            {enCurso ? 'Ver el cambio' : 'Cambiar cuenta'}
          </Button>
        ) : null}
      </div>
      {abierto ? (
        <CambioDeCuentaBancaria
          propietarioId={propietarioId}
          tieneCuenta={tieneCuenta}
          propietario={propietario}
          puedeEditar={puedeEditar}
          pedirCambio={pedido}
          onCuentaCambiada={() => void cargar()}
        />
      ) : null}
    </div>
  );
}
